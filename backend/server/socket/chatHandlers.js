const roomManager = require('../rooms/RoomManager');

function registerChatHandlers(io, socket) {

    // Quand quelqu'un envoie un message
    socket.on('chat-message', ({ roomId, pseudo, content }) => {

        // 1. Vérifications basiques
        if (!content || content.trim() === '') {
            return socket.emit('chat-error', { message: 'Le message ne peut pas être vide' });
        }

        if (content.length > 300) {
            return socket.emit('chat-error', { message: 'Le message est trop long (max 300 caractères)' });
        }

        const room = roomManager.getRoomById(roomId);
        if (!room) {
            return socket.emit('chat-error', { message: 'Salon introuvable' });
        }

        // 2. Échapper le contenu (anti-XSS simple)
        const safeContent = content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 3. Créer le message
        const message = {
            id: Date.now().toString(),
            pseudo: pseudo,
            content: safeContent,
            timestamp: new Date()
        };

        // 4. Ajouter à l'historique (max 50 messages)
        room.chatHistory.push(message);
        if (room.chatHistory.length > 50) {
            room.chatHistory.shift(); // supprime le plus ancien
        }

        // 5. Diffuser le message à tout le salon
        io.to(roomId).emit('chat-message', message);
    });

}

module.exports = { registerChatHandlers };