import { useCallback, useEffect, useRef, useState } from 'react';
import { emitAck, socket } from '../services/socketClient.js';
import { useSocketEvent } from './useSocket.js';

// Forme de `room` (réponse des ack room:create / room:join) PROPOSÉE ici, à valider avec A et B :
// { code, name, controlMode, hostId, you: { id, pseudo },
//   video: { videoId, status, position, referenceTime, serverTime, version },
//   participants: [{ id, pseudo, isHost }], playlist: { items, currentIndex },
//   messages: [{ id, pseudo, text, time }] }

let sysCounter = 0;
const sys = (text) => ({ id: `sys-${Date.now()}-${sysCounter++}`, system: true, text, time: Date.now() });

export function useRoom() {
  const [room, setRoom] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [rejoinCount, setRejoinCount] = useState(0);
  const session = useRef(null); // { code, pseudo } pour se reconnecter automatiquement
  const wasConnected = useRef(false);

  const pushToast = useCallback((message, kind = 'error') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const reportError = useCallback((err) => pushToast(err?.message ?? 'Une erreur est survenue.'), [pushToast]);

  const enter = useCallback((state, pseudo) => {
    session.current = { code: state.code, pseudo };
    setRoom(state);
    window.history.replaceState(null, '', `/salon/${state.code}`);
  }, []);

  // ---- actions (chacune renvoie une promesse ; l'appelant affiche l'erreur près du champ) ----
  const createRoom = useCallback(async (pseudo, roomName) => {
    const res = await emitAck('room:create', { pseudo: pseudo.trim(), roomName: roomName.trim() });
    enter(res.state, pseudo.trim());
  }, [enter]);

  const joinRoom = useCallback(async (code, pseudo) => {
    const res = await emitAck('room:join', { code: code.trim().toUpperCase(), pseudo: pseudo.trim() });
    enter(res.state, pseudo.trim());
  }, [enter]);

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave', {}, () => {});
    session.current = null;
    setRoom(null);
    window.history.replaceState(null, '', '/');
  }, []);

  const act = useCallback((event, payload) => emitAck(event, payload).catch(reportError), [reportError]);
  const sendChat = useCallback((text) => act('chat:send', { text }), [act]);
  const loadVideo = useCallback((url) => act('video:load', { url }), [act]);
  const addToPlaylist = useCallback((url) => act('playlist:add', { url }), [act]);
  const removeFromPlaylist = useCallback((itemId) => act('playlist:remove', { itemId }), [act]);
  const reorderPlaylist = useCallback((itemId, newIndex) => act('playlist:reorder', { itemId, newIndex }), [act]);
  const playNext = useCallback(() => act('playlist:next', {}), [act]);
  const setControlMode = useCallback((mode) => act('host:setControlMode', { mode }), [act]);
  const kick = useCallback((participantId) => act('host:kick', { participantId }), [act]);

  // ---- événements diffusés par le serveur (§6.2) ----
  useSocketEvent('participant:joined', ({ id, pseudo }) =>
    setRoom((r) => r && (r.participants.some((p) => p.id === id) ? r : { ...r, participants: [...r.participants, { id, pseudo, isHost: false }], messages: [...r.messages, sys(`${pseudo} a rejoint le salon`)] })));
  useSocketEvent('participant:left', ({ id, pseudo }) =>
    setRoom((r) => r && { ...r, participants: r.participants.filter((p) => p.id !== id), messages: [...r.messages, sys(`${pseudo} a quitté le salon`)] }));
  useSocketEvent('host:changed', ({ pseudo }) =>
    setRoom((r) => {
      if (!r) return r;
      const participants = r.participants.map((p) => ({ ...p, isHost: p.pseudo === pseudo }));
      return { ...r, participants, hostId: participants.find((p) => p.isHost)?.id ?? r.hostId };
    }));
  useSocketEvent('chat:message', (m) => setRoom((r) => r && { ...r, messages: [...r.messages.slice(-199), m] }));
  useSocketEvent('playlist:updated', (playlist) => setRoom((r) => r && { ...r, playlist }));
  useSocketEvent('room:modeChanged', ({ mode }) => setRoom((r) => r && { ...r, controlMode: mode }));
  useSocketEvent('video:state', (video) => setRoom((r) => r && { ...r, video }));
  useSocketEvent('room:error', reportError);
  useSocketEvent('room:kicked', () => {
    session.current = null;
    setRoom(null);
    window.history.replaceState(null, '', '/');
    pushToast("Vous avez été exclu du salon par l'hôte.");
  });

  // ---- reconnexion automatique (§7.6) : même pseudo, même code ----
  useEffect(() => {
    const onConnect = async () => {
      if (wasConnected.current && session.current) {
        try {
          const res = await emitAck('room:join', session.current);
          setRoom(res.state);
          setRejoinCount((n) => n + 1);
        } catch (err) {
          session.current = null;
          setRoom(null);
          reportError(err);
        }
      }
      wasConnected.current = true;
    };
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [reportError]);

  const me = room?.participants.find((p) => p.id === room.you.id);
  return {
    room, isHost: !!me?.isHost, rejoinCount, toasts, dismissToast, reportError,
    createRoom, joinRoom, leaveRoom, sendChat, loadVideo, addToPlaylist, removeFromPlaylist,
    reorderPlaylist, playNext, setControlMode, kick,
  };
}
