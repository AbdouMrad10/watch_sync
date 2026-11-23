// Serveur SIMULÉ pour développer le front sans attendre le vrai serveur (équipe back).
// Il respecte le contrat d'événements du §6 du rapport de conception, avec une logique minimale :
// tout est en mémoire, rien n'est enregistré. Lancement : `npm run mock` (port 3000).
import http from 'node:http';
import { Server } from 'socket.io';
import { extractVideoId } from '../src/utils/youtubeUrl.js';

const PORT = process.env.PORT || 3000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PSEUDO_RE = /^[\p{L}\p{N} _-]{2,20}$/u;

const httpServer = http.createServer((req, res) => {
  if (req.url === '/api/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true,"mock":true}'); return; }
  res.writeHead(404); res.end();
});
const io = new Server(httpServer, { cors: { origin: '*' } });

const rooms = new Map();
const fail = (code, message) => ({ ok: false, error: { code, message } });
const MSG = {
  PSEUDO_INVALID: 'Le pseudo doit contenir 2 à 20 caractères (lettres, chiffres, espace, tiret, souligné).',
  PSEUDO_TAKEN: 'Ce pseudo est déjà utilisé dans ce salon.',
  ROOM_NAME_INVALID: 'Le nom du salon doit contenir 1 à 40 caractères.',
  ROOM_NOT_FOUND: 'Salon introuvable ou expiré.',
  INVALID_URL: "Ce lien n'est pas une vidéo YouTube valide.",
  NOT_ALLOWED: "Seul l'hôte peut faire cette action.",
  NOT_HOST: "Seul l'hôte peut faire cette action.",
  EMPTY_MESSAGE: 'Le message doit contenir 1 à 500 caractères.',
  MESSAGE_TOO_LONG: 'Le message doit contenir 1 à 500 caractères.',
  RATE_LIMIT: 'Vous envoyez trop de messages, patientez quelques secondes.',
  DUPLICATE: 'Cette vidéo est déjà dans la playlist.',
  PLAYLIST_EMPTY: 'La playlist est vide.',
  NOT_FOUND: 'Élément introuvable.',
};
const err = (code) => fail(code, MSG[code] ?? 'Erreur.');

const newCode = () => { let c; do { c = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); } while (rooms.has(c)); return c; };
const position = (v, now = Date.now()) => (v.status === 'playing' ? v.position + (now - v.referenceTime) / 1000 : v.position);
const snapshot = (room) => ({ ...room.video, serverTime: Date.now() });
const publicPlaylist = (room) => room.playlist;

function setVideo(room, patch) {
  const now = Date.now();
  room.video = { ...room.video, ...patch, referenceTime: now, version: room.video.version + 1 };
  io.to(room.code).emit('video:state', snapshot(room));
}
function roomState(room, socketId) {
  const me = room.participants.get(socketId);
  return {
    code: room.code, name: room.name, controlMode: room.controlMode, hostId: room.hostId,
    you: { id: socketId, pseudo: me.pseudo },
    video: snapshot(room),
    participants: [...room.participants.values()].map((p) => ({ id: p.id, pseudo: p.pseudo, isHost: p.id === room.hostId })),
    playlist: publicPlaylist(room),
    messages: room.messages.slice(-100),
  };
}
function addParticipant(room, socket, pseudo) {
  room.participants.set(socket.id, { id: socket.id, pseudo, joinedAt: Date.now() });
  socket.join(room.code);
  socket.data = { code: room.code, pseudo, stamps: [] };
}
function removeParticipant(socket) {
  const room = rooms.get(socket.data?.code);
  if (!room) return;
  const p = room.participants.get(socket.id);
  room.participants.delete(socket.id);
  socket.leave(room.code);
  socket.data = {};
  if (!p) return;
  io.to(room.code).emit('participant:left', { id: p.id, pseudo: p.pseudo });
  if (room.hostId === p.id && room.participants.size) {
    const next = [...room.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    room.hostId = next.id;
    io.to(room.code).emit('host:changed', { pseudo: next.pseudo });
  }
  if (!room.participants.size) setVideo(room, { status: 'paused', position: position(room.video) });
}

io.on('connection', (socket) => {
  // Enveloppe chaque handler : ack obligatoire, aucune exception ne doit arrêter le serveur (§8).
  const on = (event, handler) => socket.on(event, (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try { reply(handler(payload ?? {}, getRoom()) ?? { ok: true }); } catch (e) { console.error(event, e); reply(fail('SERVER_ERROR', 'Erreur du serveur.')); }
  });
  const getRoom = () => rooms.get(socket.data?.code);
  const canControl = (room) => room.controlMode === 'all' || room.hostId === socket.id;

  on('room:create', ({ pseudo, roomName }) => {
    pseudo = String(pseudo ?? '').trim(); roomName = String(roomName ?? '').trim();
    if (!PSEUDO_RE.test(pseudo)) return err('PSEUDO_INVALID');
    if (roomName.length < 1 || roomName.length > 40) return err('ROOM_NAME_INVALID');
    removeParticipant(socket);
    const code = newCode();
    const room = { code, name: roomName, controlMode: 'all', hostId: socket.id, participants: new Map(), messages: [], nextId: 1,
      video: { videoId: null, status: 'paused', position: 0, referenceTime: Date.now(), version: 0 }, playlist: { items: [], currentIndex: null } };
    rooms.set(code, room);
    addParticipant(room, socket, pseudo);
    return { ok: true, code, link: `/salon/${code}`, state: roomState(room, socket.id) };
  });

  on('room:join', ({ code, pseudo }) => {
    pseudo = String(pseudo ?? '').trim();
    if (!PSEUDO_RE.test(pseudo)) return err('PSEUDO_INVALID');
    const room = rooms.get(String(code ?? '').toUpperCase());
    if (!room) return err('ROOM_NOT_FOUND');
    // Reconnexion : un ancien participant du même pseudo (socket disparu) est remplacé.
    for (const p of room.participants.values()) {
      if (p.pseudo.toLowerCase() === pseudo.toLowerCase() && !io.sockets.sockets.has(p.id)) {
        room.participants.delete(p.id);
        if (room.hostId === p.id) room.hostId = socket.id;
        io.to(room.code).emit('participant:left', { id: p.id, pseudo: p.pseudo });
      }
    }
    if ([...room.participants.values()].some((p) => p.pseudo.toLowerCase() === pseudo.toLowerCase())) return err('PSEUDO_TAKEN');
    if (socket.data?.code && socket.data.code !== room.code) removeParticipant(socket);
    addParticipant(room, socket, pseudo);
    if (room.participants.size === 1) room.hostId = socket.id;
    socket.to(room.code).emit('participant:joined', { id: socket.id, pseudo });
    return { ok: true, state: roomState(room, socket.id) };
  });

  on('room:leave', () => { removeParticipant(socket); });

  on('video:load', ({ url }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    if (!canControl(room)) return err('NOT_ALLOWED');
    const id = extractVideoId(url);
    if (!id) return err('INVALID_URL');
    setVideo(room, { videoId: id, status: 'playing', position: 0 });
  });
  const control = (status) => ({ position }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    if (!canControl(room)) return err('NOT_ALLOWED');
    const p = Number(position);
    if (!Number.isFinite(p) || p < 0) return err('INVALID_POSITION');
    setVideo(room, { status, position: p });
  };
  on('video:play', control('playing'));
  on('video:pause', control('paused'));
  on('video:seek', ({ position }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    if (!canControl(room)) return err('NOT_ALLOWED');
    const p = Number(position);
    if (!Number.isFinite(p) || p < 0) return err('INVALID_POSITION');
    setVideo(room, { position: p });
  });
  on('video:unavailable', ({ videoId }, room) => {
    if (!room || room.video.videoId !== videoId) return;
    io.to(room.code).emit('room:error', { code: 'VIDEO_UNAVAILABLE', message: 'Cette vidéo ne peut pas être lue dans le salon.' });
  });

  on('sync:request', (_p, room) => (room ? { ok: true, state: snapshot(room), serverTime: Date.now() } : err('ROOM_NOT_FOUND')));
  on('sync:ping', ({ clientTime }) => ({ serverTime: Date.now(), clientTime }));

  on('chat:send', ({ text }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    text = String(text ?? '').trim();
    if (!text) return err('EMPTY_MESSAGE');
    if (text.length > 500) return err('MESSAGE_TOO_LONG');
    const now = Date.now();
    socket.data.stamps = socket.data.stamps.filter((t) => now - t < 5000);
    if (socket.data.stamps.length >= 5) return err('RATE_LIMIT');
    socket.data.stamps.push(now);
    const m = { id: room.nextId++, pseudo: socket.data.pseudo, text, time: now };
    room.messages.push(m);
    io.to(room.code).emit('chat:message', m);
  });

  const emitPlaylist = (room) => io.to(room.code).emit('playlist:updated', publicPlaylist(room));
  on('playlist:add', ({ url }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    const id = extractVideoId(url);
    if (!id) return err('INVALID_URL');
    if (room.playlist.items.some((i) => i.videoId === id)) return err('DUPLICATE');
    room.playlist.items.push({ id: room.nextId++, videoId: id, title: `Vidéo ${id}`, addedBy: socket.data.pseudo });
    emitPlaylist(room);
  });
  on('playlist:remove', ({ itemId }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    const i = room.playlist.items.findIndex((x) => x.id === itemId);
    if (i < 0) return err('NOT_FOUND');
    room.playlist.items.splice(i, 1);
    emitPlaylist(room);
  });
  on('playlist:reorder', ({ itemId, newIndex }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    const items = room.playlist.items;
    const i = items.findIndex((x) => x.id === itemId);
    if (i < 0) return err('NOT_FOUND');
    const [it] = items.splice(i, 1);
    items.splice(Math.max(0, Math.min(items.length, Number(newIndex) || 0)), 0, it);
    emitPlaylist(room);
  });
  on('playlist:next', (_p, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    const next = (room.playlist.currentIndex ?? -1) + 1;
    if (next >= room.playlist.items.length) return err('PLAYLIST_EMPTY');
    room.playlist.currentIndex = next;
    emitPlaylist(room);
    setVideo(room, { videoId: room.playlist.items[next].videoId, status: 'playing', position: 0 });
  });

  on('host:setControlMode', ({ mode }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.hostId !== socket.id) return err('NOT_HOST');
    if (mode !== 'all' && mode !== 'host') return err('NOT_ALLOWED');
    room.controlMode = mode;
    io.to(room.code).emit('room:modeChanged', { mode });
  });
  on('host:kick', ({ participantId }, room) => {
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.hostId !== socket.id) return err('NOT_HOST');
    const target = io.sockets.sockets.get(participantId);
    if (!target || !room.participants.has(participantId)) return err('NOT_FOUND');
    target.emit('room:kicked', {});
    removeParticipant(target);
  });

  socket.on('disconnect', () => removeParticipant(socket));
});

// sync:tick toutes les 5 s pour les salons en lecture (§7.6).
setInterval(() => {
  for (const room of rooms.values()) if (room.video.status === 'playing') io.to(room.code).emit('sync:tick', snapshot(room));
}, 5000);

httpServer.listen(PORT, () => console.log(`Serveur simulé synch-watch sur http://localhost:${PORT}`));
