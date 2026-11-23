const { io } = require('socket.io-client');
const URL = 'http://localhost:3001';
const alice = io(URL);
const bob = io(URL);

bob.on('video-load', (d) => console.log('[Bob] video-load', d));
bob.on('video-play', (d) => console.log('[Bob] video-play', d));
bob.on('video-pause', (d) => console.log('[Bob] video-pause', d));
bob.on('video-seek', (d) => console.log('[Bob] video-seek', d));

alice.on('connect', () => {
  alice.emit('create-room', { username: 'Alice' }, ({ roomId }) => {
    alice.emit('join-room', { roomId, username: 'Alice' }, () => {
      bob.emit('join-room', { roomId, username: 'Bob' }, () => {
        alice.emit('video-load', { videoId: 'dQw4w9WgXcQ' });
        setTimeout(() => alice.emit('video-play', { time: 0 }), 300);
        setTimeout(() => alice.emit('video-seek', { time: 42 }), 600);
        setTimeout(() => alice.emit('video-pause', { time: 42 }), 900);
      });
    });
  });
});

setTimeout(() => process.exit(0), 2500);