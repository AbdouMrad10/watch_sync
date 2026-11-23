
const { io } = require('socket.io-client');

const URL = 'http://localhost:3001';
const alice = io(URL);
const bob = io(URL);

alice.on('participants-update', (p) =>
  console.log('[Alice] participants :', p.map((x) => x.pseudo))
);

bob.on('participants-update', (p) =>
  console.log('[Bob] participants :', p.map((x) => x.pseudo))
);

alice.on('connect', () => {
  // Alice crée un salon
  alice.emit('create-room', { username: 'Alice' }, ({ roomId }) => {
    console.log('Salon créé :', roomId);

    // Alice rejoint
    alice.emit('join-room', { roomId, username: 'Alice' }, (res) => {
      console.log('Alice join :', res);

      // Bob rejoint
      bob.emit('join-room', { roomId, username: 'Bob' }, (res2) => {
        console.log('Bob join :', res2);

        // Bob quitte après 1 seconde
        setTimeout(() => {
          console.log('--- Bob quitte ---');
          bob.emit('leave-room');
        }, 1000);

        // Test d'un salon inexistant
        setTimeout(() => {
          bob.emit('join-room', { roomId: 'FAUX', username: 'Bob' }, (r) =>
            console.log('Salon inexistant :', r)
          );
        }, 2000);
      });
    });
  });
});

setTimeout(() => {
  alice.disconnect();
  bob.disconnect();
  process.exit(0);
}, 3500);
