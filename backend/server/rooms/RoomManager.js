const { randomUUID } = require('crypto');

class RoomManager {
  constructor() {
    // Map qui stocke tous les salons en mémoire
    // clé = roomId, valeur = objet salon
    this.rooms = new Map();
  }

  // Créer un nouveau salon
  createRoom(hostPseudo) {
    const roomId = randomUUID().slice(0, 8); // ID court
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // Code court

    const room = {
      id: roomId,
      code: code,
      hostPseudo: hostPseudo,
      createdAt: new Date(),
      currentVideoId: null,
      currentTime: 0,
      isPlaying: false,
      lastUpdate: Date.now(),
      participants: [],
      chatHistory: []
    };

    this.rooms.set(roomId, room);
    return room;
  }

  // Trouver un salon par code
  getRoomByCode(code) {
    for (const room of this.rooms.values()) {
      if (room.code === code) {
        return room;
      }
    }
    return null;
  }

  // Trouver un salon par ID
  getRoomById(roomId) {
    return this.rooms.get(roomId) || null;
  }

  // Ajouter un participant
  addParticipant(roomId, participant) {
    const room = this.getRoomById(roomId);
    if (!room) return null;
    if (room.participants.some(p => p.idSocket === participant.idSocket)) return room;

    room.participants.push(participant);
    return room;
  }

  // Retirer un participant
  removeParticipant(roomId, socketId) {
    const room = this.getRoomById(roomId);
    if (!room) return null;

    room.participants = room.participants.filter(p => p.idSocket !== socketId);

    // Si le salon est vide → on le supprime
    if (room.participants.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    return room;
  }

  // Mettre à jour l’état de la vidéo
  updateVideoState(roomId, { videoId, currentTime, isPlaying }) {
    const room = this.getRoomById(roomId);
    if (!room) return null;

    if (videoId !== undefined) room.currentVideoId = videoId;
    if (currentTime !== undefined) room.currentTime = currentTime;
    if (isPlaying !== undefined) room.isPlaying = isPlaying;
    room.lastUpdate = Date.now();

    return room;
  }
}

module.exports = new RoomManager();