import React, { useEffect, useState } from 'react';
import { Users, Copy, Check, Play, UserCheck, LogOut, MessageCircle, Send, Sparkles, Shield, Heart } from 'lucide-react';
import { multiplayer } from '../services/multiplayer';
import { sound } from '../services/sound';
import { RoomState, PlayerProfile } from '../types/game';
import { WORLDS_DATA } from '../services/storage';

interface RoomPageProps {
  profile: PlayerProfile;
  onStartGame: (worldId: number, levelNumber: number) => void;
  onBackToMenu: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({ profile, onStartGame, onBackToMenu }) => {
  const [room, setRoom] = useState<RoomState | null>(multiplayer.getActiveRoom());
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    const unsub = multiplayer.subscribe((r) => {
      setRoom(r);
    });
    return unsub;
  }, []);

  const handleCreateRoom = () => {
    sound.playButtonClick();
    multiplayer.createRoom(profile.currentWorldId, profile.currentLevelIndex);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    sound.playButtonClick();
    const res = multiplayer.joinRoom(joinCodeInput);
    if (!res.success) {
      setJoinError(res.message);
    } else {
      setJoinError(null);
      setJoinCodeInput('');
    }
  };

  const handleToggleReady = () => {
    sound.playButtonClick();
    multiplayer.toggleReady();
  };

  const handleLeaveRoom = () => {
    sound.playButtonClick();
    multiplayer.leaveRoom();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !room) return;
    sound.playButtonClick();
    setChatMessages([...chatMessages, `${profile.username}: ${chatInput.trim()}`]);
    multiplayer.sendRoomMessage(chatInput.trim());
    setChatInput('');
  };

  const isHost = room && room.hostId === profile.id;
  const bothReady = !!(room?.player1?.ready && room?.player2?.ready);
  const world = WORLDS_DATA.find((w) => w.id === room?.worldId) || WORLDS_DATA[0];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white font-serif">CO-OP MULTIPLAYER LOBBY</h1>
        <p className="text-xs text-slate-400 mt-1">
          Create or join an authoritative 2-player room to conquer surprise trap levels together.
        </p>
      </div>

      {!room ? (
        /* No Room Active: Create or Join */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Create Private Room Card */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col justify-between text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />

            <div>
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white font-serif mb-2">Create Private Room</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Host an adventure session, select the world and level, and invite your partner with a custom room code.
              </p>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              Generate New Room
            </button>
          </div>

          {/* Join with Code Card */}
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col justify-between text-center relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />

            <div>
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Users className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white font-serif mb-2">Join with Room Code</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Have a 4-digit code from your friend? Enter it below to jump directly into their lobby.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. TQ-8492"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white font-mono text-center tracking-widest text-sm focus:outline-none focus:border-rose-500"
              />

              {joinError && (
                <div className="text-xs text-rose-400">{joinError}</div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all border border-slate-700 active:scale-95"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Active Room Lobby */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Room Slots and Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Info Bar */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                  Cooperative Session
                </span>
                <h2 className="text-lg font-bold text-white">{room.name}</h2>
                <div className="text-xs text-slate-400">
                  Target: {world.name} — Stage {room.levelNumber}
                </div>
              </div>

              {/* Room Code Badge */}
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-2">
                <span className="text-xs text-slate-400 font-mono">Code:</span>
                <span className="text-sm font-black text-rose-400 font-mono tracking-wider">
                  {room.roomCode}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(room.roomCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 2 Player Character Slots (Boyfriend & Girlfriend) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slot 1: Boyfriend */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between min-h-[220px]">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      Slot 1 • Boyfriend ({profile.boyName || 'Boyfriend'})
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {room.player1?.username || 'Waiting for host...'}
                    </h3>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      room.player1?.ready
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {room.player1?.ready ? 'READY' : 'NOT READY'}
                  </span>
                </div>

                <div className="my-4 p-4 rounded-2xl bg-blue-950/20 border border-blue-800/30 text-xs text-blue-200 flex items-center gap-2">
                  <span className="text-xl">👦</span>
                  <div>
                    <div className="font-bold">Boyfriend ({profile.boyName || 'Boyfriend'})</div>
                    <div className="text-[11px] text-blue-300/70">Movement: WASD / Space Jump</div>
                  </div>
                </div>

                {room.player1?.id === profile.id && (
                  <button
                    onClick={handleToggleReady}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
                  >
                    {room.player1.ready ? 'Cancel Ready' : 'Set Ready'}
                  </button>
                )}
              </div>

              {/* Slot 2: Girlfriend */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between min-h-[220px]">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                      Slot 2 • Girlfriend ({profile.girlName || 'Girlfriend'})
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {room.player2?.username || 'Waiting for Partner...'}
                    </h3>
                  </div>

                  {room.player2 ? (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        room.player2.ready
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {room.player2.ready ? 'READY' : 'NOT READY'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] bg-slate-800 text-slate-400">
                      OPEN SLOT
                    </span>
                  )}
                </div>

                <div className="my-4 p-4 rounded-2xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-200 flex items-center gap-2">
                  <span className="text-xl">👧</span>
                  <div>
                    <div className="font-bold">Girlfriend ({profile.girlName || 'Girlfriend'})</div>
                    <div className="text-[11px] text-rose-300/70">Movement: Arrows / RShift Jump</div>
                  </div>
                </div>

                {room.player2?.id === profile.id ? (
                  <button
                    onClick={handleToggleReady}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
                  >
                    {room.player2.ready ? 'Cancel Ready' : 'Set Ready'}
                  </button>
                ) : !room.player2 ? (
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      multiplayer.joinRoom(room.roomCode, 'girl');
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md"
                  >
                    Take Partner Slot
                  </button>
                ) : null}
              </div>
            </div>

            {/* Launch / Leave Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLeaveRoom}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Room</span>
              </button>

              <button
                disabled={!bothReady && !isHost}
                onClick={() => {
                  sound.playButtonClick();
                  onStartGame(room.worldId, room.levelNumber);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>{bothReady ? 'START CO-OP TRIAL' : 'START ADVENTURE (HOST)'}</span>
              </button>
            </div>
          </div>

          {/* Right Col: Live Room Chat */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-rose-400" />
                  <span>Room Chat</span>
                </span>
                <span className="text-[10px] text-slate-500">Live Channel</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <div className="text-[11px] text-slate-500 italic">
                  Room created. Both players must reach the finish portal together!
                </div>
                {chatMessages.map((msg, i) => (
                  <div key={i} className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40">
                    {msg}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t border-slate-800">
              <input
                type="text"
                placeholder="Say something to partner..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
