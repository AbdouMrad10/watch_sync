const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Port de Vite (React)
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Test simple
app.get('/', (req, res) => {
  res.send('SyncWatch Server is running');
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Serveur SyncWatch démarré sur le port ${PORT}`);
});

const registerSocketHandlers = require('./socket/socketHandlers');

io.on('connection', (socket) => {
  console.log('Connecté :', socket.id);
  registerSocketHandlers(io, socket);
});