import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [screen, setScreen] = useState('home'); // home | queue | lobby | discussion | voting | result
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [privateCode, setPrivateCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [aiName, setAiName] = useState('');
  const [botAssist, setBotAssist] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [topic, setTopic] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [hasVoted, setHasVoted] = useState(false);
  const [gameOverData, setGameOverData] = useState(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [error, setError] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    socket.on('room_update', (room) => {
      setRoomData(room);
      setScreen('lobby');
    });

    socket.on('match_found', ({ roomId: rid }) => {
      setRoomId(rid);
    });

    socket.on('queue_update', ({ position }) => {
      setQueuePosition(position);
    });

    socket.on('role_assigned', ({ role, botAssist: ba, aiName: an }) => {
      setMyRole(role);
      if (an) setAiName(an);
      if (ba) setBotAssist(ba);
    });

    socket.on('game_started', ({ room, topic: t }) => {
      setRoomData(room);
      setTopic(t);
      setScreen('discussion');
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('timer_update', (time) => setTimeLeft(time));

    socket.on('start_voting', (room) => {
      setRoomData(room);
      setScreen('voting');
    });

    socket.on('game_over', (data) => {
      setGameOverData(data);
      setScreen('result');
    });

    socket.on('error', (msg) => setError(msg));

    return () => {
      ['room_update','match_found','queue_update','role_assigned','game_started',
       'new_message','timer_update','start_voting','game_over','error'].forEach(e => socket.off(e));
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setRoomId(privateCode.toUpperCase());
    socket.emit('join_room', { roomId: privateCode.toUpperCase(), name });
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
    if (!hasVoted) {
      socket.emit('cast_vote', { roomId, targetId });
      setHasVoted(true);
    }
  };

  const handleLeaveQueue = () => {
    socket.emit('leave_queue');
    setScreen('home');
  };

  // ── HOME SCREEN ──────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 mb-3 tracking-tight">1b4h</h1>
            <p className="text-gray-400 font-medium text-lg">1 Bot · 4 Humans · 0 Mercy</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/40 rounded-2xl text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Your Name</label>
            <input
              className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl outline-none focus:border-blue-500 transition-all font-semibold text-white placeholder-gray-600"
              placeholder="e.g. MasterDetective"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={16}
            />
          </div>

          {/* Quick Play */}
          <button
            onClick={handleQuickPlay}
            disabled={!name.trim()}
            className="w-full p-5 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-2xl font-black text-lg transition-all disabled:opacity-40 shadow-lg shadow-blue-900/30 active:scale-[0.98]"
          >
            ⚡ Quick Play
            <p className="text-xs font-normal opacity-70 mt-1">Join a public lobby instantly</p>
          </button>

          {/* Private Room */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Private Room</label>
            <div className="flex gap-3">
              <input
                className="flex-1 p-4 bg-gray-800 border border-gray-700 rounded-xl outline-none focus:border-purple-500 transition-all font-bold text-white placeholder-gray-600 uppercase"
                placeholder="Room Code"
                value={privateCode}
                onChange={e => setPrivateCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
              <button
                onClick={handlePrivateJoin}
                disabled={!name.trim() || !privateCode.trim()}
                className="px-5 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all disabled:opacity-40"
              >
                Join
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-3 font-medium">Share a code with 3 friends. Game starts when 4 humans are in.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── MATCHMAKING QUEUE SCREEN ─────────────────────────────────
  if (screen === 'queue') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-gray-900 border border-gray-800 p-12 rounded-3xl text-center max-w-sm w-full">
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-4 border-purple-500/20 border-b-purple-500 animate-spin" style={{animationDirection:'reverse', animationDuration:'1.5s'}}></div>
          </div>
          <h2 className="text-2xl font-black mb-2">Finding Players...</h2>
          <p className="text-gray-500 mb-8 font-medium">
            {queuePosition < 4
              ? `${queuePosition}/4 players ready`
              : 'Match found! Starting...'}
          </p>
          <div className="flex justify-center gap-2 mb-8">
            {[1,2,3,4].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all duration-500 ${i <= queuePosition ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-gray-700'}`}></div>
            ))}
          </div>
          <button
            onClick={handleLeaveQueue}
            className="text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors"
          >
            ← Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── LOBBY (waiting for 4 humans) ────────────────────────────
  if (screen === 'lobby' && roomData) {
    const humans = roomData.players.filter(p => !p.isAI);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-gray-900 border border-gray-800 p-10 rounded-2xl w-full max-w-lg">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Room</p>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{roomId}</h2>
            <p className="text-gray-500 mt-2 font-medium">Waiting for players ({humans.length}/4)...</p>
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => {
              const p = humans[i];
              return (
                <div key={i} className={`p-4 rounded-xl flex items-center justify-between border transition-all ${p ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-900/30 border-gray-800 border-dashed'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${p ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gray-800 text-gray-700'}`}>
                      {p ? p.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className={`font-semibold ${p ? 'text-gray-200' : 'text-gray-600'}`}>
                      {p ? p.name : 'Waiting...'}
                    </span>
                  </div>
                  {p?.id === socket.id && <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-lg font-bold">You</span>}
                </div>
              );
            })}
          </div>
          <p className="text-center text-gray-600 text-sm mt-8 font-medium">Game auto-starts when 4 humans join. An AI will be added automatically.</p>
        </div>
      </div>
    );
  }

  // ── DISCUSSION ───────────────────────────────────────────────
  if (screen === 'discussion') {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 font-sans">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-5">
          {/* Sidebar */}
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full md:w-72 shrink-0 md:sticky top-6 h-fit">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-800">
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Room</p>
                <h2 className="text-lg font-black truncate max-w-[120px]">{roomId}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Time</p>
                <h2 className={`text-2xl font-black font-mono ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-purple-400'}`}>
                  0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                </h2>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Your Role</p>
              <div className={`text-2xl font-black mb-2 ${myRole === 'Phantom' ? 'text-purple-400' : myRole === 'Innocent' ? 'text-green-400' : 'text-blue-400'}`}>{myRole}</div>
              <p className="text-gray-500 text-xs leading-relaxed">
                {myRole === 'Phantom' && 'Act like a bot. Draw votes to yourself to protect the real AI.'}
                {myRole === 'Innocent' && `Find and vote out the AI hidden among you. (Hint: one player is secretly a bot)`}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">Players</p>
              <div className="space-y-2">
                {roomData?.players.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-300">{p.name}</span>
                    {p.id === socket.id && <span className="text-[10px] text-blue-400 font-bold ml-auto">You</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col flex-1 overflow-hidden" style={{height: 'calc(100vh - 3rem)'}}>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-gray-200">Discussion</span>
              <span className="flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div> LIVE
              </span>
            </div>

            <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Icebreaker</p>
              <p className="text-sm font-medium text-gray-200">"{topic}"</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0
                ? <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">The chat is quiet... be the first to speak!</div>
                : messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.senderId === socket.id ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{msg.sender}</span>
                      <span className="text-[10px] text-gray-700 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm font-medium
                      ${msg.senderId === socket.id
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none'
                        : 'bg-gray-800 text-gray-100 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              }
              <div ref={chatBottomRef} />
            </div>

            {myRole === 'Phantom' && botAssist.length > 0 && (
              <div className="px-4 py-3 bg-purple-900/20 border-t border-purple-500/20">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></span> Bot Assist
                </p>
                <div className="flex flex-wrap gap-2">
                  {botAssist.slice(0, 4).map((phrase, i) => (
                    <button key={i}
                      onClick={() => socket.emit('send_message', { roomId, message: phrase })}
                      className="text-[11px] font-bold bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-400/30 px-3 py-1.5 rounded-lg transition-all">
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="p-4 bg-gray-900 border-t border-gray-800">
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all text-sm font-medium text-white placeholder-gray-600"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />
                <button type="submit" disabled={!inputText.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-40">
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── VOTING ───────────────────────────────────────────────────
  if (screen === 'voting') {
    const votablePlayers = roomData?.players || [];
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-gray-900 border border-gray-800 p-10 rounded-3xl w-full max-w-2xl text-center">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-[0.3em] mb-3">Time's Up</p>
          <h2 className="text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">WHO IS THE BOT?</h2>
          <p className="text-gray-500 mb-10 font-medium">One of these players is an AI. Vote wisely.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {votablePlayers.map(p => (
              <button key={p.id}
                onClick={() => handleVote(p.id)}
                disabled={hasVoted || p.id === socket.id}
                className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group text-left
                  ${p.id === socket.id ? 'opacity-40 cursor-not-allowed border-gray-800 bg-gray-900/50'
                    : hasVoted ? 'border-gray-800 bg-gray-900/30 cursor-default'
                    : 'border-gray-700 hover:border-red-500 hover:bg-red-500/5 cursor-pointer'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl transition-colors
                  ${p.id === socket.id ? 'bg-gray-800' : 'bg-gray-700 group-hover:bg-red-500'}`}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-black text-lg">{p.name}</div>
                  {p.id === socket.id && <div className="text-gray-600 text-xs font-bold">That's you</div>}
                </div>
                {!hasVoted && p.id !== socket.id && (
                  <div className="ml-auto text-xs font-bold text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">VOTE</div>
                )}
              </button>
            ))}
          </div>
          {hasVoted && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-blue-400 font-bold animate-pulse">Vote cast. Waiting for others...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────
  if (screen === 'result' && gameOverData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-gray-900 border border-gray-800 p-10 rounded-3xl w-full max-w-3xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          <p className="text-xs font-bold text-gray-600 uppercase tracking-[0.3em] mb-3">Game Over</p>
          <h1 className="text-5xl font-black mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            {gameOverData.winner}!
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {gameOverData.players.map(p => (
              <div key={p.id} className={`p-5 rounded-2xl border text-left ${p.isAI ? 'border-red-500/30 bg-red-500/5' : 'border-gray-800 bg-gray-800/50'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${p.isAI ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-200'}`}>
                      {p.isAI ? '🤖' : p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-black text-gray-100">{p.name}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${p.role === 'Catalyst' ? 'text-red-400' : p.role === 'Phantom' ? 'text-purple-400' : 'text-green-400'}`}>
                        {p.role}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Suspicion</span>
                    <span className={`text-sm font-black font-mono ${p.suspicionScore > 70 ? 'text-red-400' : p.suspicionScore > 40 ? 'text-orange-400' : 'text-green-400'}`}>
                      {p.suspicionScore}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${p.suspicionScore > 70 ? 'bg-red-500' : p.suspicionScore > 40 ? 'bg-orange-400' : 'bg-green-400'}`}
                      style={{width: `${p.suspicionScore}%`}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => window.location.reload()}
            className="px-12 py-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-gray-100 transition-all shadow-xl">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Connecting...</p>
      </div>
    </div>
  );
}

export default App;
