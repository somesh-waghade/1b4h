class GameState {
  constructor() {
    this.rooms = new Map(); // roomId -> { phase, players, timer, votes, topic, messages }
    this.weights = { w1: 0.6, w2: 0.4 }; // Tunable weights for metadata analysis
    this.icebreakers = [
      "What's the worst food to eat on a first date?",
      "If you were a kitchen appliance, which one would you be and why?",
      "Would you rather always have to sing instead of speaking or dance instead of walking?",
      "Is a hotdog a sandwich? Debate.",
      "What's the most useless talent you have?",
      "If you could only eat one color of food for the rest of your life, which would it be?",
      "What's the weirdest thing you've ever seen in someone else's house?",
      "Which animal would be the rudest if it could talk?",
      "If you were arrested with no explanation, what would your friends/family assume you did?"
    ];
  }

  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        phase: 'lobby', // lobby | discussion | voting | result
        players: [], // { id, name, role, alive }
        timer: 0,
        votes: {} // playerId -> targetId
      });
    }
    return this.rooms.get(roomId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  addPlayer(roomId, socketId, name) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    if (room.players.length >= 5) return { error: 'Room is full' };
    if (room.phase !== 'lobby') return { error: 'Game already started' };
    if (room.players.some(p => p.name === name)) return { error: 'Name already taken' };

    const player = { 
      id: socketId, 
      name, 
      role: null, 
      alive: true,
      metrics: {
        timestamps: [],
        lengths: []
      },
      suspicionScore: 0
    };
    room.players.push(player);
    return { room, player };
  }

  removePlayer(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      const index = room.players.findIndex(p => p.id === socketId);
      if (index !== -1) {
        room.players.splice(index, 1);
        // If room is empty, optionally garbage collect the room here
        return { roomId, room, removed: true };
      }
    }
    return { removed: false };
  }

  assignRoles(roomId) {
    const room = this.getRoom(roomId);
    if (!room || room.players.length !== 5) return false;

    const roles = ['Catalyst', 'Phantom', 'Innocent', 'Innocent', 'Innocent'];
    // Fisher-Yates shuffle
    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    room.players.forEach((player, index) => {
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
    return Object.keys(room.votes).length;
  }

  resolveGame(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    // Aggregate votes
    const voteCounts = {}; // targetId -> count
    Object.values(room.votes).forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    // Find player with most votes
    let eliminatedId = null;
    let maxVotes = -1;
    for (const [id, count] of Object.entries(voteCounts)) {
       if (count > maxVotes) {
         maxVotes = count;
         eliminatedId = id;
       }
    }

    const eliminatedPlayer = room.players.find(p => p.id === eliminatedId);
    let winner = '';

    if (eliminatedPlayer?.role === 'Catalyst') {
      winner = 'Humans & Phantom';
    } else {
      winner = 'Catalyst (AI)';
    }

    room.phase = 'result';
    
    // Calculate final suspicion scores for everyone before sending
    room.players.forEach(p => {
      p.suspicionScore = this.calculateSuspicion(p.metrics);
    });

    return { eliminatedPlayer, winner, players: room.players };
  }

  calculateSuspicion(metrics) {
    const { timestamps, lengths } = metrics;
    if (timestamps.length < 2) return 0;

    // Latency (diffs between timestamps)
    const latencies = [];
    for (let i = 1; i < timestamps.length; i++) {
      latencies.push(timestamps[i] - timestamps[i-1]);
    }

    const meanLat = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const stdDevLat = Math.sqrt(latencies.map(x => Math.pow(x - meanLat, 2)).reduce((a, b) => a + b, 0) / latencies.length);

    // Message Length Variance
    const meanLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const varLen = lengths.map(x => Math.pow(x - meanLen, 2)).reduce((a, b) => a + b, 0) / lengths.length;

    // S = (w1 * stdDevLat) + (w2 * varLen)
    // Normalized roughly for display (0-100)
    // Lower variability = higher suspicion (bots are consistent)
    const latScore = Math.max(0, 100 - (stdDevLat / 50)); 
    const lenScore = Math.max(0, 100 - (Math.sqrt(varLen) * 2));

    const finalScore = (this.weights.w1 * latScore) + (this.weights.w2 * lenScore);
    return Math.round(Math.min(100, finalScore));
  }
}

module.exports = new GameState();
