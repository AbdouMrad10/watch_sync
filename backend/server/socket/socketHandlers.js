const roomManager = require('../rooms/RoomManager');

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
    callback?.({ ok: true });
  });

  // Quelqu'un quitte
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomManager.removeParticipant(roomId, socket.id);
    if (room) io.to(roomId).emit('participants-update', room.participants);
  });
};