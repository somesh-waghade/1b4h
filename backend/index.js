const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const gameState = require('./src/gameState');
const aiAgent = require('./src/aiAgent');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3001;

// Reusable function to start a game when a room has 4 humans
function startGame(roomId) {
  const room = gameState.getRoom(roomId);
  if (!room) return;

  // Add the AI Catalyst
  const aiPlayer = gameState.addAIPlayer(roomId);

  // Assign Phantom & Innocent to humans
  const assigned = gameState.assignHumanRoles(roomId);
  if (!assigned) return;

  const topic = gameState.startDiscussion(roomId);

  // Emit roles privately to each human
  room.players.filter(p => !p.isAI).forEach(p => {
    const payload = { 
      role: p.role, 
      aiName: aiPlayer.name  // Tell humans the AI's display name
    };
    if (p.role === 'Phantom') {
      payload.botAssist = aiAgent.getBotAssistPhrases();
    }
    io.to(p.id).emit('role_assigned', payload);
  });

  io.to(roomId).emit('game_started', { room, topic });

  // Start 60s Discussion Timer
  let timeLeft = 240; // 4 minutes
  const timer = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timer_update', timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timer);
      room.phase = 'voting';
      io.to(roomId).emit('start_voting', room);
    }
  }, 1000);
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // ─── PRIVATE ROOM (join with room code) ─────────────────────
  socket.on('join_room', ({ roomId, name }) => {
    let room = gameState.getRoom(roomId);
    if (!room) room = gameState.createRoom(roomId);

    const result = gameState.addPlayer(roomId, socket.id, name);
    if (result?.error) {
      socket.emit('error', result.error);
      return;
    }

    socket.join(roomId);
    io.to(roomId).emit('room_update', result.room);
    console.log(`${name} joined private room ${roomId}`);

    // DEV MODE: If room code starts with "DEV", auto-fill remaining slots with dummy players
    if (roomId.startsWith('DEV')) {
      const dummyNames = ['Alice_Bot', 'Bob_Bot', 'Carol_Bot'];
      const existingHumans = result.room.players.filter(p => !p.isAI).length;
      const needed = 4 - existingHumans;
      for (let i = 0; i < needed; i++) {
        const dummyId = `DUMMY_${i}_${Date.now()}`;
        gameState.addPlayer(roomId, dummyId, dummyNames[i] || `Player_${i + 2}`);
      }
      console.log(`[DEV] Auto-filled ${needed} dummy players`);
    }

    // Auto-start when 4 humans are in
    if (result.room.players.filter(p => !p.isAI).length === 4) {
      startGame(roomId);
    }
  });

  // ─── PUBLIC MATCHMAKING ──────────────────────────────────────
  socket.on('join_queue', ({ name }) => {
    const queueSize = gameState.addToQueue(socket.id, name);
    socket.emit('queue_update', { position: queueSize });
    console.log(`${name} joined public queue (size: ${queueSize})`);

    const match = gameState.tryFormPublicGame();
    if (match) {
      const { roomId, group } = match;
      gameState.createRoom(roomId);

      // Add all 4 queued players to the room
      group.forEach(({ socketId, name: playerName }) => {
        gameState.addPlayer(roomId, socketId, playerName);
        const clientSocket = io.sockets.sockets.get(socketId);
        if (clientSocket) {
          clientSocket.join(roomId);
          clientSocket.emit('match_found', { roomId });
        }
      });

      io.to(roomId).emit('room_update', gameState.getRoom(roomId));
      startGame(roomId);
    }
  });

  socket.on('leave_queue', () => {
    gameState.removeFromQueue(socket.id);
  });

  // ─── CHAT ────────────────────────────────────────────────────
  socket.on('send_message', ({ roomId, message }) => {
    const room = gameState.getRoom(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.metrics.timestamps.push(Date.now());
    player.metrics.lengths.push(message.length);

    const messageData = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      sender: player.name,
      senderId: socket.id,
      text: message,
      timestamp: Date.now()
    };

    io.to(roomId).emit('new_message', messageData);

    // Trigger AI response — not every message, like a real human
    const catalyst = room.players.find(p => p.isAI);
    if (catalyst && !catalyst.isBotRunning) {
      if (!room.messages) room.messages = [];
      room.messages.push(messageData);
      if (room.messages.length > 10) room.messages.shift();

      // Count how many messages since AI last spoke
      const lastAiIdx = room.messages.map(m => m.senderId).lastIndexOf('AI_CATALYST');
      const msgSinceLastReply = lastAiIdx === -1 ? 999 : room.messages.length - 1 - lastAiIdx;

      // Base 35% chance, boosted to 75% if AI's name is mentioned
      const nameMentioned = message.toLowerCase().includes(catalyst.name.toLowerCase());
      const replyChance = nameMentioned ? 0.75 : 0.35;

      // Don't reply if the AI just spoke (< 2 messages ago)
      const shouldReply = msgSinceLastReply >= 2 && Math.random() < replyChance;

      if (shouldReply) {
        catalyst.isBotRunning = true;
        (async () => {
          // Signal typing indicator to all clients
          io.to(roomId).emit('ai_typing', { name: catalyst.name, typing: true });

          const responseText = await aiAgent.generateResponse(room.messages, room.topic, 'Catalyst');
          await aiAgent.simulateLatency(responseText);

          io.to(roomId).emit('ai_typing', { name: catalyst.name, typing: false });

          const aiMessage = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            sender: catalyst.name,
            senderId: catalyst.id,
            text: responseText,
            timestamp: Date.now()
          };

          catalyst.metrics.timestamps.push(Date.now());
          catalyst.metrics.lengths.push(responseText.length);

          room.messages.push(aiMessage);
          io.to(roomId).emit('new_message', aiMessage);
          catalyst.isBotRunning = false;
        })();
      }
    }
  });

  // ─── VOTING ──────────────────────────────────────────────────
  socket.on('cast_vote', ({ roomId, targetId }) => {
    const room = gameState.getRoom(roomId);
    if (!room) return;

    const voteCount = gameState.castVote(roomId, socket.id, targetId);
    const humanCount = room.players.filter(p => !p.isAI).length;

    if (voteCount >= humanCount) {
      const results = gameState.resolveGame(roomId);
      io.to(roomId).emit('game_over', results);
    } else {
      io.to(roomId).emit('vote_received', { voterId: socket.id, voteCount, total: humanCount });
    }
  });

  // ─── DISCONNECT ──────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    gameState.removeFromQueue(socket.id);
    const result = gameState.removePlayer(socket.id);
    if (result.removed) {
      io.to(result.roomId).emit('room_update', result.room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
