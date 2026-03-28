import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './index.css';

const socket = io('http://localhost:3001');

// ── Typing Indicator component ────────────────────────────
function TypingIndicator({ name }) {
  return (
    <div className="flex flex-col items-start msg-pop">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{name}</span>
      <div className="px-4 py-3 bg-gray-800 rounded-2xl rounded-tl-none flex items-center gap-1.5">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
    </div>
  );
}

// ── Role badge colours ────────────────────────────────────
const roleStyle = {
  Catalyst: 'text-red-400 bg-red-500/10 border-red-500/30',
  Phantom:  'text-purple-400 bg-purple-500/10 border-purple-500/30',
  Innocent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};
const roleDesc = {
  Phantom:  'Act like a bot. Draw suspicion onto yourself to protect the real Catalyst.',
  Innocent: 'Find the AI hidden among you. Discuss, deduce, and vote it out.',
};

function App() {
  const [screen, setScreen] = useState('home');
  const [name, setName]     = useState('');
  const [roomId, setRoomId] = useState('');
  const [privateCode, setPrivateCode] = useState('');
  const [roomData, setRoomData]   = useState(null);
  const [myRole, setMyRole]       = useState(null);
  const [aiName, setAiName]       = useState('');
  const [botAssist, setBotAssist] = useState([]);
  const [messages, setMessages]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [topic, setTopic]         = useState('');
  const [timeLeft, setTimeLeft]   = useState(240);
  const [hasVoted, setHasVoted]   = useState(false);
  const [gameOverData, setGameOverData] = useState(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [error, setError]         = useState('');
  const [typingPlayers, setTypingPlayers] = useState({});
  const typingTimeoutRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    socket.on('room_update', (room) => { setRoomData(room); setScreen('lobby'); });
    socket.on('match_found', ({ roomId: rid }) => setRoomId(rid));
    socket.on('queue_update', ({ position }) => setQueuePosition(position));
    socket.on('role_assigned', ({ role, botAssist: ba, aiName: an }) => {
      setMyRole(role);
      if (an) setAiName(an);
      if (ba) setBotAssist(ba);
    });
    socket.on('game_started', ({ room, topic: t }) => {
      setRoomData(room); setTopic(t); setScreen('discussion');
    });
    socket.on('player_typing', ({ id, name: n, isTyping }) => {
      setTypingPlayers(prev => {
        const next = { ...prev };
        if (isTyping) next[id] = n; else delete next[id];
        return next;
      });
    });
    socket.on('ai_typing', ({ name: n, typing }) => {
      setTypingPlayers(prev => {
        const next = { ...prev };
        if (typing) next['AI_CATALYST'] = n; else delete next['AI_CATALYST'];
        return next;
      });
    });
    socket.on('new_message', (msg) => {
      setTypingPlayers(prev => {
        const next = { ...prev };
        delete next['AI_CATALYST'];
        delete next[msg.senderId];
        return next;
      });
      setMessages(prev => [...prev, msg]);
    });
    socket.on('timer_update', (time) => setTimeLeft(time));
    socket.on('start_voting', (room) => { setRoomData(room); setScreen('voting'); });
    socket.on('game_over', (data) => { setGameOverData(data); setScreen('result'); });
    socket.on('error', (msg) => setError(msg));

    return () => {
      ['room_update','match_found','queue_update','role_assigned','game_started',
       'ai_typing','new_message','timer_update','start_voting','game_over','error']
        .forEach(e => socket.off(e));
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingPlayers]);

  const handleQuickPlay = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    socket.emit('join_queue', { name });
    setScreen('queue');
    setError('');
  };

  const handlePrivateJoin = (e) => {
    e.preventDefault();
    if (!name.trim() || !privateCode.trim()) return;
    const code = privateCode.toUpperCase();
    setRoomId(code);
    socket.emit('join_room', { roomId: code, name });
    setError('');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      socket.emit('send_message', { roomId, message: inputText });
      setInputText('');
    }
  };

  const handleVote = (targetId) => {
    if (!hasVoted) { socket.emit('cast_vote', { roomId, targetId }); setHasVoted(true); }
  };

  const handleLeaveQueue = () => { socket.emit('leave_queue'); setScreen('home'); };

  // ── HOME ──────────────────────────────────────────────────
  if (screen === 'home') return (
    <div className="relative min-h-[100dvh] bg-[#050810] text-white flex items-center justify-center p-6">
      <div className="mesh-bg" />
      <div className="relative z-10 w-full max-w-md slide-up">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-7xl font-black tracking-tight mb-4 logo-glow"
            style={{background:'linear-gradient(135deg,#818cf8 0%,#a78bfa 40%,#f472b6 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            1b4h
          </h1>
          <p className="text-gray-500 font-medium tracking-widest text-sm uppercase">1 Bot · 4 Humans · 0 Mercy</p>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-medium text-center fade-in">
            {error}
          </div>
        )}

        {/* Name input */}
        <div className="glass rounded-2xl p-5 mb-4">
          <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Your Name</label>
          <input
            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all font-semibold text-white placeholder-gray-700 text-sm"
            placeholder="e.g. MasterDetective"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickPlay(e)}
            maxLength={16}
            autoFocus
          />
        </div>

        {/* Quick Play */}
        <button onClick={handleQuickPlay} disabled={!name.trim()}
          className="btn-glow w-full p-5 mb-3 rounded-2xl font-black text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',boxShadow:'0 0 40px rgba(99,102,241,0.3)'}}>
          <span className="block">⚡ Quick Play</span>
          <span className="block text-xs font-normal opacity-60 mt-0.5">Join a public match instantly — 4 humans + AI</span>
        </button>

        {/* Private Room */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Private Room</label>
          <div className="flex gap-2">
            <input
              className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-purple-500/60 transition-all font-bold text-white placeholder-gray-700 uppercase text-sm tracking-wider"
              placeholder="Room Code"
              value={privateCode}
              onChange={e => setPrivateCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handlePrivateJoin(e)}
              maxLength={8}
            />
            <button onClick={handlePrivateJoin} disabled={!name.trim() || !privateCode.trim()}
              className="btn-glow px-5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl font-bold transition-all disabled:opacity-30 text-sm">
              Join
            </button>
          </div>
          <p className="text-gray-700 text-xs mt-3 font-medium">Use code <span className="text-indigo-400 font-bold">DEV</span> to test solo — dummy players fill in automatically.</p>
        </div>
      </div>
    </div>
  );

  // ── QUEUE ─────────────────────────────────────────────────
  if (screen === 'queue') return (
    <div className="relative min-h-[100dvh] bg-[#050810] text-white flex items-center justify-center p-6">
      <div className="mesh-bg" />
      <div className="relative z-10 glass rounded-3xl p-12 text-center max-w-sm w-full slide-up">
        <div className="w-24 h-24 mx-auto mb-8 relative">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
          <div className="absolute inset-3 rounded-full border-2 border-purple-500/20 border-b-purple-400 animate-spin" style={{animationDirection:'reverse',animationDuration:'1.8s'}}></div>
          <div className="absolute inset-6 rounded-full border-2 border-pink-500/20 border-t-pink-400 animate-spin" style={{animationDuration:'2.5s'}}></div>
        </div>
        <h2 className="text-2xl font-black mb-2">Finding Players</h2>
        <p className="text-gray-500 mb-8 font-medium text-sm">
          {queuePosition >= 4 ? 'Match found! Starting...' : `${queuePosition} of 4 ready`}
        </p>
        <div className="flex justify-center gap-3 mb-10">
          {[1,2,3,4].map(i => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-500 ${i <= queuePosition ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-white/10'}`}/>
          ))}
        </div>
        <button onClick={handleLeaveQueue} className="text-gray-600 hover:text-gray-400 text-sm font-medium transition-colors">← Cancel</button>
      </div>
    </div>
  );

  // ── LOBBY ─────────────────────────────────────────────────
  if (screen === 'lobby' && roomData) {
    const humans = roomData.players.filter(p => !p.isAI);
    return (
      <div className="relative min-h-[100dvh] bg-[#050810] text-white flex items-center justify-center p-6">
        <div className="mesh-bg" />
        <div className="relative z-10 glass rounded-3xl p-10 w-full max-w-lg slide-up">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Room Code</p>
            <h2 className="text-4xl font-black tracking-wider mb-1" style={{background:'linear-gradient(135deg,#818cf8,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{roomId}</h2>
            <p className="text-gray-600 text-sm font-medium mt-3">{humans.length}/4 players joined</p>
          </div>
          <div className="space-y-3 mb-8">
            {[...Array(4)].map((_, i) => {
              const p = humans[i];
              return (
                <div key={i} className={`p-4 rounded-2xl flex items-center gap-3 border transition-all ${p ? 'bg-white/5 border-white/10 player-join' : 'border-white/5 border-dashed'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${p ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-gray-700'}`}>
                    {p ? p.name.charAt(0).toUpperCase() : i + 1}
                  </div>
                  <span className={`font-semibold text-sm ${p ? 'text-gray-200' : 'text-gray-700'}`}>{p ? p.name : 'Waiting...'}</span>
                  {p?.id === socket.id && <span className="ml-auto text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg font-bold">You</span>}
                </div>
              );
            })}
          </div>
          <div className="text-center">
            <p className="text-gray-700 text-xs font-medium">Game starts automatically when 4 players join.</p>
            <p className="text-indigo-500/50 text-xs font-medium mt-1">An AI will be secretly added to the mix.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── DISCUSSION ────────────────────────────────────────────
  if (screen === 'discussion') {
    const mins = Math.floor(timeLeft / 60);
    const secs = String(timeLeft % 60).padStart(2, '0');
    const isLow = timeLeft < 30;
    return (
      <div className="relative min-h-[100dvh] bg-[#050810] text-white fade-in flex flex-col">
        <div className="mesh-bg"/>
        <div className="relative z-10 flex flex-col md:flex-row gap-4 p-4 h-[100dvh] max-h-[100dvh] overflow-hidden">

          {/* Sidebar */}
          <div className="glass rounded-2xl p-5 md:w-64 shrink-0 flex flex-col gap-4 overflow-y-auto">
            {/* Timer */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Time Left</p>
                <p className={`text-3xl font-black font-mono tracking-tight ${isLow ? 'text-red-400' : 'text-indigo-400'}`} style={isLow ? {textShadow:'0 0 20px rgba(248,113,113,0.5)'} : {}}>
                  {mins}:{secs}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${isLow ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}/>
            </div>

            {/* Role */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Your Role</p>
              <div className={`inline-block px-3 py-1.5 rounded-lg border text-sm font-black mb-2 ${roleStyle[myRole] || ''}`}>{myRole}</div>
              <p className="text-gray-600 text-xs leading-relaxed">{roleDesc[myRole]}</p>
            </div>

            {/* Players */}
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Players</p>
              <div className="space-y-2">
                {roomData?.players.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-black text-gray-400">
                      {p.isAI ? '?' : p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-400">{p.name}</span>
                    {p.id === socket.id && <span className="ml-auto text-[9px] text-indigo-400 font-black uppercase tracking-wider">You</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Room */}
            <p className="text-[10px] font-bold text-gray-700 text-center">{roomId}</p>
          </div>

          {/* Chat Panel */}
          <div className="glass rounded-2xl flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-200 text-sm">Live Chat</h3>
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>LIVE
              </span>
            </div>

            {/* Icebreaker */}
            <div className="px-5 py-3 bg-indigo-500/5 border-b border-indigo-500/15 shrink-0">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.15em] mr-2">Icebreaker</span>
              <span className="text-xs font-medium text-gray-300">"{topic}"</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0
                ? <div className="h-full flex items-center justify-center text-gray-700 text-sm italic">Be the first to say something...</div>
                : messages.map(msg => {
                    const isMine = msg.senderId === socket.id;
                    return (
                      <div key={msg.id} className={`flex flex-col msg-pop ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{msg.sender}</span>
                          <span className="text-[10px] text-gray-700 font-mono">{new Date(msg.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[78%] text-sm font-medium leading-relaxed
                          ${isMine
                            ? 'rounded-tr-sm text-white'
                            : 'bg-white/7 text-gray-100 rounded-tl-sm border border-white/5'}`}
                          style={isMine ? {background:'linear-gradient(135deg,#4f46e5,#7c3aed)'} : {}}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
              }
              {Object.entries(typingPlayers).map(([id, name]) => (
                id !== socket.id && <TypingIndicator key={id} name={name} />
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Bot Assist */}
            {myRole === 'Phantom' && botAssist.length > 0 && (
              <div className="px-5 py-3 bg-purple-500/5 border-t border-purple-500/20 shrink-0">
                <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping"/>Bot Assist
                </p>
                <div className="flex flex-wrap gap-2">
                  {botAssist.slice(0, 4).map((phrase, i) => (
                    <button key={i} onClick={() => socket.emit('send_message', { roomId, message: phrase })}
                      className="btn-glow text-[10px] font-bold bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/25 px-3 py-1.5 rounded-lg transition-all">
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 shrink-0">
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-all text-sm font-medium text-white placeholder-gray-700"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={e => {
                    setInputText(e.target.value);
                    if (e.target.value.trim() !== '') {
                      socket.emit('typing', { roomId, isTyping: true });
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      typingTimeoutRef.current = setTimeout(() => {
                        socket.emit('typing', { roomId, isTyping: false });
                      }, 2000);
                    } else {
                      socket.emit('typing', { roomId, isTyping: false });
                    }
                  }}
                />
                <button type="submit" disabled={!inputText.trim()}
                  className="btn-glow px-5 rounded-xl font-bold transition-all disabled:opacity-30 text-sm text-white"
                  style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)'}}>
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── VOTING ────────────────────────────────────────────────
  if (screen === 'voting') return (
    <div className="relative min-h-[100dvh] bg-[#050810] text-white flex items-center justify-center p-4">
      <div className="mesh-bg"/>
      <div className="relative z-10 glass rounded-3xl p-6 sm:p-10 w-full max-w-2xl text-center slide-up">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">🔍</div>
        <p className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-3">Time's Up</p>
        <h2 className="text-5xl font-black mb-3" style={{background:'linear-gradient(135deg,#f87171,#fb923c)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          Who Is the Bot?
        </h2>
        <p className="text-gray-600 mb-10 text-sm font-medium">One of these players is secretly an AI. Choose wisely.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {roomData?.players.map(p => (
            <button key={p.id} onClick={() => handleVote(p.id)}
              disabled={hasVoted || p.id === socket.id}
              className={`vote-card p-5 rounded-2xl border-2 flex items-center gap-4 text-left
                ${p.id === socket.id ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/[0.03]'
                  : hasVoted ? 'border-white/5 bg-white/[0.03] cursor-default'
                  : 'border-white/10 bg-white/5 hover:border-red-500/50 hover:bg-red-500/5 cursor-pointer'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg transition-all
                ${p.id === socket.id ? 'bg-white/10 text-gray-600'
                  : 'bg-white/10 text-gray-300 group-hover:bg-red-500'}`}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-white truncate">{p.name}</div>
                {p.id === socket.id && <div className="text-gray-600 text-xs mt-0.5">That's you</div>}
              </div>
              {!hasVoted && p.id !== socket.id && (
                <span className="shrink-0 text-xs font-black text-red-400 uppercase tracking-wider opacity-0 group-hover:opacity-100">Vote →</span>
              )}
            </button>
          ))}
        </div>
        {hasVoted && (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl fade-in">
            <p className="text-indigo-400 font-bold text-sm animate-pulse">✓ Vote registered — waiting for others...</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────
  if (screen === 'result' && gameOverData) {
    const humanWon = gameOverData.winner.includes('Human');
    return (
      <div className="relative min-h-[100dvh] bg-[#050810] text-white flex items-center justify-center p-4">
        <div className="mesh-bg"/>
        <div className="relative z-10 glass rounded-3xl p-6 sm:p-10 w-full max-w-3xl slide-up">
          <div className="h-1 w-full rounded-full mb-10" style={{background:'linear-gradient(90deg,#4f46e5,#7c3aed,#ec4899)'}}/>
          <div className="text-center mb-10">
            <p className="text-xs font-black text-gray-600 uppercase tracking-[0.3em] mb-4">Game Over</p>
            <div className="text-6xl mb-4">{humanWon ? '🎉' : '🤖'}</div>
            <h1 className="text-5xl font-black" style={{background: humanWon ? 'linear-gradient(135deg,#34d399,#6ee7b7)' : 'linear-gradient(135deg,#f87171,#fb923c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>
              {gameOverData.winner}!
            </h1>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest text-center mb-5">The Reveal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {gameOverData.players.map(p => (
                <div key={p.id} className={`p-5 rounded-2xl border ${p.isAI ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-white/[0.03]'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm
                        ${p.isAI ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-gray-300'}`}>
                        {p.isAI ? '🤖' : p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-sm text-gray-100">{p.name}</p>
                        <span className={`text-[9px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-full ${roleStyle[p.role] || ''}`}>{p.role}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Suspicion Score</span>
                      <span className={`text-sm font-black font-mono ${p.suspicionScore > 70 ? 'text-red-400' : p.suspicionScore > 40 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {p.suspicionScore}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bar-fill ${p.suspicionScore > 70 ? 'bg-red-500' : p.suspicionScore > 40 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                        style={{width:`${p.suspicionScore}%`}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button onClick={() => window.location.reload()}
              className="btn-glow px-12 py-4 rounded-2xl font-black text-sm transition-all"
              style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',boxShadow:'0 0 30px rgba(99,102,241,0.3)'}}>
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-[100dvh] bg-[#050810] text-white flex items-center justify-center">
      <div className="mesh-bg"/>
      <div className="relative z-10 flex flex-col items-center gap-4 fade-in">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"/>
        <p className="text-gray-700 font-bold uppercase tracking-widest text-xs">Connecting...</p>
      </div>
    </div>
  );
}

export default App;
