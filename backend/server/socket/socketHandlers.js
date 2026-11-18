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

    // Envoie l'état vidéo actuel au nouvel arrivant
    socket.emit('video-state', {
      videoId: room.currentVideoId,
      time: room.currentTime,
      isPlaying: room.isPlaying,
    });

    callback?.({ ok: true });
  });

  // Quelqu'un quitte volontairement le salon
  socket.on('leave-room', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.leave(roomId);
    socket.data.roomId = null;
    const room = roomManager.removeParticipant(roomId, socket.id);
    if (room) io.to(roomId).emit('participants-update', room.participants);
  });

  // Relais des actions vidéo aux autres participants du salon
  ['video-load', 'video-play', 'video-pause', 'video-seek'].forEach((eventName) => {
    socket.on(eventName, (data) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      if (eventName === 'video-load') {
        roomManager.updateVideoState(roomId, { videoId: data.videoId, currentTime: 0, isPlaying: false });
      } else if (eventName === 'video-play') {
        roomManager.updateVideoState(roomId, { currentTime: data.time, isPlaying: true });
      } else if (eventName === 'video-pause') {
        roomManager.updateVideoState(roomId, { currentTime: data.time, isPlaying: false });
      } else if (eventName === 'video-seek') {
        roomManager.updateVideoState(roomId, { currentTime: data.time });
      }

      // Diffusion aux AUTRES participants (pas à l'émetteur)
      socket.to(roomId).emit(eventName, data);
    });
  });

  // Quelqu'un se déconnecte
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomManager.removeParticipant(roomId, socket.id);
    if (room) io.to(roomId).emit('participants-update', room.participants);
  });

  registerChatHandlers(io, socket);
};