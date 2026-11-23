import { useCallback, useEffect, useRef, useState } from 'react';
import { emitAck, socket } from '../services/socketClient.js';
import { useSocketEvent } from './useSocket.js';
import { YT_STATE } from './useYouTubePlayer.js';

// Implémente l'algorithme du §7 du rapport de conception.
const SEEK_THRESHOLD = 2;        // s : écart au-delà duquel on recale le lecteur (§7.3)
const LOCAL_SEEK_THRESHOLD = 1.5; // s : écart au-delà duquel on considère un seek de l'utilisateur (§7.5)
const POLL_MS = 500;              // période de détection des seeks (§7.5)
const GUARD_MS = 1000;            // durée d'ignorance des événements du lecteur après application d'un état (§7.4)
const PING_MS = 30000;            // période d'estimation de la latence (§7.3)

export function useVideoSync({ player, initialVideo, isHost, onError, resyncSignal }) {
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const s = useRef({ lastVersion: -1, currentVideoId: null, applyingUntil: 0, expected: null, latest: null, pending: null, rtts: [], latency: 0 });
  const playerRef = useRef(player); playerRef.current = player;
  const isHostRef = useRef(isHost); isHostRef.current = isHost;
  const onErrorRef = useRef(onError); onErrorRef.current = onError;

  // Applique un état de référence reçu du serveur au lecteur local.
  const applyState = useCallback((state, { force = false } = {}) => {
    const st = s.current; const p = playerRef.current;
    if (!state) return;
    // NB : on ignore seulement les versions strictement plus anciennes ; un sync:tick porte la même version que le dernier video:state.
    if (!force && state.version < st.lastVersion) return;
    st.lastVersion = Math.max(st.lastVersion, state.version);
    st.latest = state;
    if (!p.ready) { st.pending = state; return; }
    if (!state.videoId) return;

    const playing = state.status === 'playing';
    const elapsed = state.serverTime ? (state.serverTime - state.referenceTime) / 1000 : 0;
    const target = playing ? state.position + elapsed + st.latency / 1000 : state.position;

    st.applyingUntil = Date.now() + GUARD_MS; // §7.4 : ignorer les événements provoqués par notre propre code
    if (state.videoId !== st.currentVideoId) {
      st.currentVideoId = state.videoId;
      p.load(state.videoId, target);
    } else if (Math.abs(p.getCurrentTime() - target) > SEEK_THRESHOLD) {
      p.seekTo(target);
    }
    if (playing) p.play(); else p.pause();
    st.expected = { position: target, at: Date.now(), playing };

    // §7.6 : si le navigateur bloque la lecture automatique, on demande un clic.
    if (playing) {
      setTimeout(() => {
        const cur = playerRef.current; const now = cur.getState();
        const blocked = cur.ready && s.current.expected?.playing && now !== YT_STATE.PLAYING && now !== YT_STATE.BUFFERING;
        setAutoplayBlocked(!!blocked);
      }, 1500);
    } else {
      setAutoplayBlocked(false);
    }
  }, []);

  // Envoi d'une action locale ; en cas de refus (NOT_ALLOWED) on se recale sur le serveur.
  const resync = useCallback(() => {
    emitAck('sync:request')
      .then((res) => applyState({ ...res.state, serverTime: res.serverTime ?? res.state.serverTime }, { force: true }))
      .catch((err) => onErrorRef.current?.(err));
  }, [applyState]);
  const send = useCallback((event, payload) => {
    emitAck(event, payload).catch((err) => {
      onErrorRef.current?.(err);
      if (err.code === 'NOT_ALLOWED') resync();
    });
  }, [resync]);

  // État initial (réponse de room:join) puis dès que le lecteur est prêt.
  useEffect(() => { applyState(initialVideo); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (player.ready) {
      const st = s.current; const pending = st.pending ?? st.latest;
      st.pending = null;
      if (pending) applyState(pending, { force: true });
    }
  }, [player.ready, applyState]);

  // Événements du serveur.
  useSocketEvent('video:state', (state) => applyState(state));
  useSocketEvent('sync:tick', (state) => applyState(state));

  // Événements du lecteur (clic de l'utilisateur sur les contrôles YouTube).
  useEffect(() => {
    playerRef.current.setHandlers({
      onStateChange: (code) => {
        const st = s.current; const p = playerRef.current;
        if (Date.now() < st.applyingUntil || !st.expected) return;
        const position = p.getCurrentTime();
        if (code === YT_STATE.PLAYING && !st.expected.playing) {
          st.expected = { position, at: Date.now(), playing: true };
          send('video:play', { position });
        } else if (code === YT_STATE.PAUSED && st.expected.playing) {
          st.expected = { position, at: Date.now(), playing: false };
          send('video:pause', { position });
        } else if (code === YT_STATE.ENDED && isHostRef.current) {
          // À CLARIFIER avec B : qui signale la fin d'une vidéo ? Ici, seul l'hôte envoie playlist:next.
          emitAck('playlist:next').catch(() => {});
        }
      },
      onError: () => {
        // Vidéo non lisible (non intégrable, supprimée…) : on prévient le serveur (§7.6).
        const id = s.current.currentVideoId;
        if (id) emitAck('video:unavailable', { videoId: id }).catch(() => {});
      },
    });
  }, [send]);

  // Détection d'un déplacement dans la vidéo (§7.5).
  useEffect(() => {
    const id = setInterval(() => {
      const st = s.current; const p = playerRef.current;
      if (!p.ready || !st.expected || Date.now() < st.applyingUntil) return;
      if (p.getState() === YT_STATE.BUFFERING) return;
      const e = st.expected;
      const expectedPos = e.playing ? e.position + (Date.now() - e.at) / 1000 : e.position;
      const actual = p.getCurrentTime();
      if (Math.abs(actual - expectedPos) > LOCAL_SEEK_THRESHOLD) {
        st.expected = { position: actual, at: Date.now(), playing: e.playing };
        send('video:seek', { position: actual });
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [send]);

  // Estimation de la latence : moitié du plus petit aller-retour parmi les 5 derniers (§7.3).
  useEffect(() => {
    const ping = () => {
      const t = Date.now();
      emitAck('sync:ping', { clientTime: t }).then(() => {
        const st = s.current;
        st.rtts = [...st.rtts.slice(-4), Date.now() - t];
        st.latency = Math.min(...st.rtts) / 2;
      }).catch(() => {});
    };
    if (socket.connected) ping();
    const id = setInterval(ping, PING_MS);
    return () => clearInterval(id);
  }, []);

  // Après une reconnexion (la salle a été rejointe de nouveau), on redemande l'état.
  useEffect(() => { if (resyncSignal > 0) resync(); }, [resyncSignal, resync]);

  const activate = useCallback(() => {
    setAutoplayBlocked(false);
    if (s.current.latest) applyState(s.current.latest, { force: true });
  }, [applyState]);

  return { autoplayBlocked, activate, resync };
}
