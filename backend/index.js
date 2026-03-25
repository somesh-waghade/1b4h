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
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', ({ roomId, name }) => {
    let room = gameState.getRoom(roomId);
    if (!room) {
      room = gameState.createRoom(roomId);
    }
    
    const result = gameState.addPlayer(roomId, socket.id, name);
    if (result && result.error) {
      socket.emit('error', result.error);
      return;
    }

    socket.join(roomId);
    io.to(roomId).emit('room_update', result.room);
    console.log(`${name} joined room ${roomId}`);
    
    // Check if 5 players joined
    if (result.room.players.length === 5) {
      const assigned = gameState.assignRoles(roomId);
      if (assigned) {
        const topic = gameState.startDiscussion(roomId);
        // Emit roles privately to each player
        result.room.players.forEach(p => {
           const payload = { role: p.role };
           if (p.role === 'Phantom') {
             payload.botAssist = aiAgent.getBotAssistPhrases();
           }
           io.to(p.id).emit('role_assigned', payload);
        });
        io.to(roomId).emit('game_started', { room: result.room, topic });

        // Start 60s Discussion Timer
        let timeLeft = 60;
        const timer = setInterval(() => {
          timeLeft--;
          io.to(roomId).emit('timer_update', timeLeft);
          
          if (timeLeft <= 0) {
            clearInterval(timer);
            result.room.phase = 'voting';
            io.to(roomId).emit('start_voting', result.room);
          }
        }, 1000);
      }
    }
  });

  socket.on('cast_vote', ({ roomId, targetId }) => {
    const voteCount = gameState.castVote(roomId, socket.id, targetId);
    const room = gameState.getRoom(roomId);
    
    if (voteCount === room.players.length) {
      const results = gameState.resolveGame(roomId);
      io.to(roomId).emit('game_over', results);
    } else {
      io.to(roomId).emit('vote_received', { voterId: socket.id });
    }
  });

  socket.on('send_message', ({ roomId, message }) => {
    const room = gameState.getRoom(roomId);
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Track metadata for analytics
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

    // AI Logic: If a real player sent a message, check if the Catalyst should respond
    const catalyst = room.players.find(p => p.role === 'Catalyst');
    if (catalyst && !catalyst.isBotRunning) {
      // Basic check to prevent AI from infinitely responding to itself
      // In this version, we trigger Catalyst response with a probability or on every message for testing
      catalyst.isBotRunning = true; // Simple lock
      
      const chatHistory = room.messages || []; // We should probably store messages in room state
      if (!room.messages) room.messages = [];
      room.messages.push(messageData);
      // Keep only last 10 for context
      if (room.messages.length > 10) room.messages.shift();

      (async () => {
        const responseText = await aiAgent.generateResponse(room.messages, room.topic, 'Catalyst');
        await aiAgent.simulateLatency(responseText);
        
        const aiMessage = {
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          sender: catalyst.name,
          senderId: catalyst.id,
          text: responseText,
          timestamp: Date.now()
        };
        
        room.messages.push(aiMessage);
        io.to(roomId).emit('new_message', aiMessage);
        catalyst.isBotRunning = false;
      })();
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const result = gameState.removePlayer(socket.id);
    if (result.removed) {
      io.to(result.roomId).emit('room_update', result.room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
