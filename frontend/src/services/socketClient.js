import { io } from 'socket.io-client';

// Une seule connexion Socket.IO pour toute l'application.
// En développement, Vite redirige /socket.io vers le serveur (voir vite.config.js).
// VITE_SERVER_URL permet de viser un autre serveur (ex. VITE_SERVER_URL=http://192.168.1.20:3000).
export const socket = io(import.meta.env.VITE_SERVER_URL || undefined, {
  autoConnect: false,
  reconnection: true,
});

const ACK_TIMEOUT_MS = 5000;

// Envoie un événement et attend l'accusé de réception (ack) défini au §6 du rapport de conception.
// Résout avec la réponse si { ok: true, ... } ; rejette avec { code, message } sinon.
export function emitAck(event, payload = {}) {
  return new Promise((resolve, reject) => {
    socket.timeout(ACK_TIMEOUT_MS).emit(event, payload, (err, res) => {
      if (err) return reject({ code: 'TIMEOUT', message: 'Le serveur ne répond pas. Vérifiez votre connexion.' });
      if (res && res.ok === false) return reject(res.error ?? { code: 'UNKNOWN', message: 'Une erreur est survenue.' });
      resolve(res);
    });
  });
}
