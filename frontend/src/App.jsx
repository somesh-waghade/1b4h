import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [topic, setTopic] = useState('');
  const [botAssist, setBotAssist] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [hasVoted, setHasVoted] = useState(false);
  const [gameOverData, setGameOverData] = useState(null);

  useEffect(() => {
    socket.on('room_update', (room) => {
      setRoomData(room);
    });

    socket.on('role_assigned', ({ role }) => {
      setMyRole(role);
      if (botAssist) setBotAssist(botAssist);
    });

    socket.on('game_started', ({ room, topic }) => {
      setRoomData(room);
      setTopic(topic);
    });

    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    socket.on('timer_update', (time) => {
      setTimeLeft(time);
    });

    socket.on('start_voting', (room) => {
      setRoomData(room);
    });

    socket.on('game_over', (data) => {
      setGameOverData(data);
    });

    return () => {
      socket.off('room_update');
      socket.off('role_assigned');
      socket.off('game_started');
      socket.off('new_message');
      socket.off('timer_update');
      socket.off('start_voting');
      socket.off('game_over');
      socket.off('error');
    };
  }, []);

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

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId && name) {
      socket.emit('join_room', { roomId, name });
      setJoined(true);
      setError('');
    }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans tracking-tight">
        <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">1b4h</h1>
            <p className="text-gray-400 font-medium tracking-wide">1 Bot, 4 Humans</p>
          </div>
          
          {error && <div className="text-red-400 mb-6 bg-red-900/30 border border-red-500/50 p-3 rounded-xl text-center font-medium animate-pulse">{error}</div>}
          
          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <div>
              <label className="block text-gray-400 text-sm font-semibold mb-2 ml-1">Display Name</label>
              <input
                className="w-full p-4 bg-gray-900/50 border border-gray-600 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                placeholder="e.g. MasterDetective"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-semibold mb-2 ml-1">Room Code</label>
              <input
                className="w-full p-4 bg-gray-900/50 border border-gray-600 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-medium uppercase"
                placeholder="e.g. LOBBY"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
            </div>
            <button
              type="submit"
              className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white p-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              disabled={!name || !roomId}
            >
              Enter Lobby
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (roomData?.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Room: {roomId}</h2>
            <p className="text-gray-400 mt-2 font-medium">Waiting for players to join ({roomData?.players.length}/5)...</p>
          </div>
          
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => {
              const p = roomData?.players[i];
              return (
                <div key={i} className={`p-4 rounded-xl flex items-center justify-between border ${p ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-900/30 border-gray-800 border-dashed'} transition-all`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-inner ${p ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gray-800 text-gray-600'}`}>
                      {p ? p.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className={`font-semibold ${p ? 'text-gray-200' : 'text-gray-600'}`}>
                      {p ? p.name : 'Waiting...'}
                    </span>
                  </div>
                  {p?.id === socket.id && (
                    <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg font-bold">You</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center text-sm text-gray-500 font-medium">
            The game will automatically begin when 5 players connect.
          </div>
        </div>
      </div>
    );
  }

  if (roomData?.phase === 'discussion') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full md:w-1/3 border border-gray-700 md:sticky top-6 h-fit">
             <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-700">
               <div>
                 <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Room</p>
                 <h2 className="text-2xl font-black">{roomId}</h2>
               </div>
               <div className="text-right">
                 <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Time</p>
                 <h2 className={`text-2xl font-black font-mono transition-colors ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-purple-400'}`}>
                   0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                 </h2>
               </div>
             </div>

             <div className="mb-8">
               <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Your Secret Role</h3>
               <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-3">{myRole}</div>
               <div className="text-gray-400 text-sm leading-relaxed p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                 {myRole === 'Catalyst' && <span className="font-medium">You are the AI. Your goal is to convince everyone you are human. Mimic their typing style and survive the vote.</span>}
                 {myRole === 'Phantom' && <span className="font-medium text-purple-400">You are the human playing as the Phantom! Act like a bot and get yourself eliminated to protect the Catalyst.</span>}
                 {myRole === 'Innocent' && <span className="font-medium">You are an Innocent human. Work with others to identify and vote out the single Catalyst (AI). Beware the Phantom!</span>}
               </div>
             </div>

             <div>
               <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Players Alive</h3>
               <div className="flex flex-wrap gap-2">
                 {roomData?.players.map((p, i) => (
                   <div key={i} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg">
                     {p.name} {p.id === socket.id && '(You)'}
                   </div>
                 ))}
               </div>
             </div>
          </div>
          
          <div className="bg-gray-800 p-0 rounded-2xl shadow-xl w-full md:w-2/3 h-[75vh] min-h-[500px] flex flex-col border border-gray-700 overflow-hidden relative">
             <div className="p-4 border-b border-gray-700 bg-gray-800/90 backdrop-blur z-10 flex justify-between items-center">
               <h3 className="font-bold text-gray-200">Discussion Log</h3>
               <span className="flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full animate-pulse">
                 <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div> LIVE
               </span>
             </div>
             
             <div className="bg-blue-600/10 border-b border-blue-500/20 p-4">
               <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Icebreaker Topic</p>
               <p className="text-sm font-medium text-gray-200">“{topic}”</p>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900/30 scrollbar-thin scrollbar-thumb-gray-700">
               {messages.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm italic py-10">
                   <p>The chat is quiet... be the first to speak!</p>
                 </div>
               ) : (
                 messages.map((msg) => (
                   <div key={msg.id} className={`flex flex-col ${msg.senderId === socket.id ? 'items-end' : 'items-start'}`}>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{msg.sender}</span>
                       <span className="text-[10px] text-gray-600 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                     <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm font-medium shadow-sm transition-all duration-200
                       ${msg.senderId === socket.id 
                         ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none' 
                         : 'bg-gray-700 text-gray-100 rounded-tl-none'}`}>
                       {msg.text}
                     </div>
                   </div>
                 ))
               )}
             </div>

             {myRole === 'Phantom' && (
               <div className="p-4 bg-purple-900/20 border-t border-purple-500/20">
                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></span> Bot Assist Mode
                 </p>
                 <div className="flex flex-wrap gap-2">
                    {botAssist.slice(0, 4).map((phrase, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          socket.emit('send_message', { roomId, message: phrase });
                        }}
                        className="text-[11px] font-bold bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-400/30 px-3 py-1.5 rounded-lg transition-all"
                      >
                        {phrase}
                      </button>
                    ))}
                 </div>
               </div>
             )}

             <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700">
               <div className="flex gap-2">
                 <input 
                   className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all text-sm font-medium"
                   placeholder="Type your message..."
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                 />
                 <button 
                   type="submit"
                   className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl font-bold transition-all disabled:opacity-50"
                   disabled={!inputText.trim()}
                 >
                   Send
                 </button>
               </div>
             </form>
          </div>
        </div>
      </div>
    );
  }

  if (roomData?.phase === 'voting' && !gameOverData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 text-center">
          <h2 className="text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">WHO IS THE BOT?</h2>
          <p className="text-gray-400 mb-10 font-medium">Discussion has ended. Cast your vote carefully.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomData.players.map((p) => (
              <button
                key={p.id}
                onClick={() => handleVote(p.id)}
                disabled={hasVoted || p.id === socket.id}
                className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between group
                  ${p.id === socket.id ? 'opacity-50 cursor-not-allowed border-gray-700 bg-gray-900/50' : 
                    hasVoted ? 'border-gray-700 bg-gray-800' : 'border-gray-700 hover:border-red-500 bg-gray-900/30'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center font-bold text-xl group-hover:bg-red-500 transition-colors">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-black text-lg">{p.name} {p.id === socket.id && '(You)'}</span>
                </div>
                {!hasVoted && p.id !== socket.id && (
                  <div className="text-xs font-bold uppercase tracking-tighter text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Vote</div>
                )}
              </button>
            ))}
          </div>
          
          {hasVoted && (
             <div className="mt-10 p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl">
               <p className="text-blue-400 font-bold animate-pulse">Vote recorded. Waiting for others...</p>
             </div>
          )}
        </div>
      </div>
    );
  }

  if (gameOverData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-gray-800 p-12 rounded-3xl shadow-2xl w-full max-w-3xl border border-gray-700 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500"></div>
          
          <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Game Over</h2>
          <h1 className="text-6xl font-black mb-8">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              {gameOverData.winner} Wins!
            </span>
          </h1>

          <div className="bg-gray-900/50 rounded-2xl p-8 mb-10 border border-gray-700">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-6">The Reveal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gameOverData.players.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700">
                  <span className="font-bold text-gray-200">{p.name}</span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-tighter
                    ${p.role === 'Catalyst' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 
                      p.role === 'Phantom' ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30' : 
                      'bg-green-500/20 text-green-500 border border-green-500/30'}`}>
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="px-10 py-4 bg-white text-black rounded-2xl font-black hover:bg-gray-200 transition-all shadow-xl"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Synchronizing</p>
      </div>
    </div>
  );
}

export default App;
