const { io } = require('socket.io-client');

// Connexion au serveur
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log(' Connecté au serveur avec id :', socket.id);

    // 1. On crée un salon
    socket.emit('create-room', { username: 'Abderrahim' }, (response) => {
        console.log('Salon créé :', response);

        const roomId = response.roomId;

        // 2. On rejoint le salon
        socket.emit('join-room', { roomId, username: 'Abderrahim' }, (res) => {
            console.log('Rejoint le salon :', res);

            // 3. On envoie un message de test
            setTimeout(() => {
                socket.emit('chat-message', {
                    roomId: roomId,
                    pseudo: 'Abderrahim',
                    content: 'Salut, ceci est un test du chat !'
                });
            }, 1000);
        });
    });
});

// Écouter les messages reçus
socket.on('chat-message', (message) => {
    console.log(' Message reçu :', message);
});

// Écouter les erreurs
socket.on('chat-error', (error) => {
    console.log(' Erreur chat :', error);
});

// Historique
socket.on('chat-history', (history) => {
    console.log(' Historique reçu :', history);
});