const roomManager = require('../rooms/RoomManager');
const { registerChatHandlers } = require('./chatHandlers');

module.exports = function registerSocketHandlers(io, socket) {
  // Quelqu'un clique sur "Créer un salon"
  socket.on('create-room', ({ username }, callback) => {
    const room = roomManager.createRoom(username);
    callback?.({ roomId: room.id });
  });

  // Quelqu'un rejoint un salon
  socket.on('join-room', ({ roomId, username }, callback) => {
    const room = roomManager.getRoomById(roomId);
    if (!room) return callback?.({ ok: false, error: 'Salon introuvable' });

    socket.join(roomId);
    socket.data.roomId = roomId;
    roomManager.addParticipant(roomId, { idSocket: socket.id, pseudo: username });

        io.to(roomId).emit('participants-update', room.participants);

    // On calcule la position actuelle si la vidéo est en lecture,
    // pour que le nouvel arrivant se resynchronise correctement (F7)
    const elapsedSeconds = room.isPlaying
      ? (Date.now() - room.lastUpdate) / 1000
      : 0;

    callback?.({
      ok: true,
      videoState: {
        videoId: room.currentVideoId,
        currentTime: room.currentTime + elapsedSeconds,
        isPlaying: room.isPlaying,
      },
    });
  });
    // --- Événements vidéo (module synchronisation) ---

  socket.on('video-load', ({ roomId, videoId }) => {
    const room = roomManager.updateVideoState(roomId, {
      videoId,
      currentTime: 0,
      isPlaying: false,
    });
    if (!room) return;
    io.to(roomId).emit('video-state-update', {
      videoId: room.currentVideoId,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
    });
  });

  socket.on('video-play', ({ roomId, currentTime }) => {
    const room = roomManager.updateVideoState(roomId, { currentTime, isPlaying: true });
    if (!room) return;
    io.to(roomId).emit('video-state-update', {
      videoId: room.currentVideoId,
      currentTime: room.currentTime,
      isPlaying: true,
    });
  });

  socket.on('video-pause', ({ roomId, currentTime }) => {
    const room = roomManager.updateVideoState(roomId, { currentTime, isPlaying: false });
    if (!room) return;
    io.to(roomId).emit('video-state-update', {
      videoId: room.currentVideoId,
      currentTime: room.currentTime,
      isPlaying: false,
    });
  });

  socket.on('video-seek', ({ roomId, currentTime }) => {
    const room = roomManager.updateVideoState(roomId, { currentTime });
    if (!room) return;
    io.to(roomId).emit('video-state-update', {
      videoId: room.currentVideoId,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
    });
  });
  // Quelqu'un quitte
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomManager.removeParticipant(roomId, socket.id);
    if (room) io.to(roomId).emit('participants-update', room.participants);
  });

  registerChatHandlers(io, socket);
};