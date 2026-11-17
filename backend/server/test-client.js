const { io } = require('socket.io-client');

const URL = 'http://localhost:3001';
const alice = io(URL);
const bob = io(URL);

alice.on('participants-update', (p) =>
  console.log('[Alice] participants :', p.map((x) => x.pseudo))
);
bob.on('participants-update', (p) =>
  console.log('[Bob]   participants :', p.map((x) => x.pseudo))
);

alice.on('connect', () => {
  alice.emit('create-room', { username: 'Alice' }, ({ roomId }) => {
    console.log('Salon créé :', roomId);

    alice.emit('join-room', { roomId, username: 'Alice' }, (res) => {
      console.log('Alice join :', res);

      bob.emit('join-room', { roomId, username: 'Bob' }, (res2) => {
        console.log('Bob join :', res2);

        setTimeout(() => {
          console.log('--- Bob quitte ---');
          bob.emit('leave-room');
        }, 1000);
      });
    });
  });
});

setTimeout(() => process.exit(0), 3000);
