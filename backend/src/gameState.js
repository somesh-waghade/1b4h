class GameState {
  constructor() {
    this.rooms = new Map(); // roomId -> { phase, players, timer, votes, topic, messages }
    this.publicQueue = [];  // array of socket objects waiting for a public game
    this.weights = { w1: 0.6, w2: 0.4 };
    this.icebreakers = [
      "What's the worst food to eat on a first date?",
      "If you were a kitchen appliance, which one would you be and why?",
      "Would you rather always have to sing instead of speaking or dance instead of walking?",
      "Is a hotdog a sandwich? Debate.",
      "What's the most useless talent you have?",
      "If you could only eat one color of food for the rest of your life, which would it be?",
      "What's the weirdest thing you've ever seen in someone else's house?",
      "Which animal would be the rudest if it could talk?",
      "If you were arrested with no explanation, what would your friends/family assume you did?",
      "What is the most useless invention you can think of?",
      "If animals could talk, which would be the most annoying?",
      "What would be the worst thing to put in a piñata?"
    ];
  }

  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        phase: 'lobby',
        players: [],
        timer: 0,
        votes: {},
        messages: []
      });
    }
    return this.rooms.get(roomId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  // Only 4 human slots
  addPlayer(roomId, socketId, name) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    // 4 humans max (AI is added separately)
    const humanCount = room.players.filter(p => !p.isAI).length;
    if (humanCount >= 4) return { error: 'Room is full' };
    if (room.phase !== 'lobby') return { error: 'Game already started' };
    if (room.players.some(p => p.name === name)) return { error: 'Name already taken' };

    const player = {
      id: socketId,
      name,
      role: null,
      alive: true,
      isAI: false,
      metrics: { timestamps: [], lengths: [] },
      suspicionScore: 0
    };
    room.players.push(player);
    return { room, player };
  }

  // Add the AI (Catalyst) bot to the room
  addAIPlayer(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return;
    // Remove any existing AI first (clean state on restart)
    room.players = room.players.filter(p => !p.isAI);
    const aiIdentities = [
      { name: 'Rahul', gender: 'male' },
      { name: 'Aditi', gender: 'female' },
      { name: 'Karan', gender: 'male' },
      { name: 'Sneha', gender: 'female' },
      { name: 'Vikram', gender: 'male' },
      { name: 'Priya', gender: 'female' },
      { name: 'Rohan', gender: 'male' },
      { name: 'Neha', gender: 'female' }
    ];
    const identity = aiIdentities[Math.floor(Math.random() * aiIdentities.length)];
    
    const aiPlayer = {
      id: 'AI_CATALYST',
      name: identity.name,
      gender: identity.gender,
      role: 'Catalyst',
      alive: true,
      isAI: true,
      metrics: { timestamps: [], lengths: [] },
      suspicionScore: 0
    };
    room.players.push(aiPlayer);
    return aiPlayer;
  }

  removePlayer(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      const index = room.players.findIndex(p => p.id === socketId);
      if (index !== -1) {
        room.players.splice(index, 1);
        return { roomId, room, removed: true };
      }
    }
    return { removed: false };
  }

  // Only assigns Phantom & Innocent (Catalyst is already assigned to AI)
  assignHumanRoles(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return false;
    const humans = room.players.filter(p => !p.isAI);
    if (humans.length !== 4) return false;

    const roles = ['Phantom', 'Innocent', 'Innocent', 'Innocent'];
    // Fisher-Yates shuffle
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    humans.forEach((player, index) => {
      player.role = roles[index];
    });
    return true;
  }

  startDiscussion(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    room.phase = 'discussion';
    room.topic = this.icebreakers[Math.floor(Math.random() * this.icebreakers.length)];
    return room.topic;
  }

  castVote(roomId, voterId, targetId) {
    const room = this.getRoom(roomId);
    if (!room || room.phase !== 'voting') return null;
    room.votes[voterId] = targetId;
    // Only count human votes
    const humanVotes = Object.keys(room.votes).filter(id => id !== 'AI_CATALYST').length;
    return humanVotes;
  }

  resolveGame(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const voteCounts = {};
    Object.values(room.votes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let eliminatedId = null;
    let maxVotes = -1;
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = id;
      }
    }

    const eliminatedPlayer = room.players.find(p => p.id === eliminatedId);
    const winner = eliminatedPlayer?.id === 'AI_CATALYST' ? 'Humans Win' : 'Catalyst (AI) Wins';

    room.phase = 'result';
    room.players.forEach(p => {
      p.suspicionScore = this.calculateSuspicion(p.metrics);
    });

    return { eliminatedPlayer, winner, players: room.players };
  }

  calculateSuspicion(metrics) {
    const { timestamps, lengths } = metrics;
    if (timestamps.length < 2) return 0;

    const latencies = [];
    for (let i = 1; i < timestamps.length; i++) {
      latencies.push(timestamps[i] - timestamps[i - 1]);
    }
    const meanLat = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const stdDevLat = Math.sqrt(latencies.map(x => Math.pow(x - meanLat, 2)).reduce((a, b) => a + b, 0) / latencies.length);

    const meanLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const varLen = lengths.map(x => Math.pow(x - meanLen, 2)).reduce((a, b) => a + b, 0) / lengths.length;

    const latScore = Math.max(0, 100 - (stdDevLat / 50));
    const lenScore = Math.max(0, 100 - (Math.sqrt(varLen) * 2));

    const finalScore = (this.weights.w1 * latScore) + (this.weights.w2 * lenScore);
    return Math.round(Math.min(100, finalScore));
  }

  // Public queue management
  addToQueue(socketId, name) {
    if (!this.publicQueue.find(p => p.socketId === socketId)) {
      this.publicQueue.push({ socketId, name });
    }
    return this.publicQueue.length;
  }

  removeFromQueue(socketId) {
    this.publicQueue = this.publicQueue.filter(p => p.socketId !== socketId);
  }

  tryFormPublicGame() {
    if (this.publicQueue.length >= 4) {
      const group = this.publicQueue.splice(0, 4);
      const roomId = 'PUBLIC-' + Date.now().toString(36).toUpperCase();
      return { roomId, group };
    }
    return null;
  }
}

module.exports = new GameState();
