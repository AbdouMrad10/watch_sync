
const roomManager = require('../rooms/RoomManager');
const { registerChatHandlers } = require('./chatHandlers');

module.exports = function registerSocketHandlers(io, socket) {
  // Création d'un salon
  socket.on('create-room', ({ username }, callback) => {
    const room = roomManager.createRoom(username);
    callback?.({ roomId: room.id });
  });

  // Rejoindre un salon
  socket.on('join-room', ({ roomId, username }, callback) => {
    const room = roomManager.getRoomById(roomId);
    if (!room) return callback?.({ ok: false, error: 'Salon introuvable' });

    socket.join(roomId);
    socket.data.roomId = roomId;
    roomManager.addParticipant(roomId, {
      idSocket: socket.id,
      pseudo: username,
    });

    io.to(roomId).emit('participants-update', room.participants);

    socket.emit('video-state', {
      videoId: room.currentVideoId,
      time: room.currentTime,
      isPlaying: room.isPlaying,
    });

    callback?.({ ok: true });
  });

  // Quitter un salon
  socket.on('leave-room', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    socket.leave(roomId);
    socket.data.roomId = null;

    const room = roomManager.removeParticipant(roomId, socket.id);
    if (room) io.to(roomId).emit('participants-update', room.participants);
  });

  // Événements vidéo
  ['video-load', 'video-play', 'video-pause', 'video-seek'].forEach((eventName) => {
    socket.on(eventName, (data) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      if (eventName === 'video-load') {
        roomManager.updateVideoState(roomId, {
          videoId: data.videoId,
          currentTime: 0,
          isPlaying: false,
        });
      } else if (eventName === 'video-play') {
        roomManager.updateVideoState(roomId, {
          currentTime: data.time,
          isPlaying: true,
        });
      } else if (eventName === 'video-pause') {
        roomManager.updateVideoState(roomId, {
          currentTime: data.time,
          isPlaying: false,
        });
      } else if (eventName === 'video-seek') {
        roomManager.updateVideoState(roomId, {
          currentTime: data.time,
        });
      }

      socket.to(roomId).emit(eventName, data);
    });
  });

  // Déconnexion
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = roomManager.removeParticipant(roomId, socket.id);
    if (room) io.to(roomId).emit('participants-update', room.participants);
  });

  // Gestion du chat
  registerChatHandlers(io, socket);
};
