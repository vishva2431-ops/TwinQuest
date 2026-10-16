import React, { useEffect, useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Play,
  UserCheck,
  LogOut,
  MessageCircle,
  Send,
  Sparkles,
  Shield,
  Heart,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { multiplayer } from '../services/multiplayer';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { sound } from '../services/sound';
import { RoomState, PlayerProfile, CharacterGender } from '../types/game';
import { WORLDS_DATA } from '../services/storage';
import { voiceChat, VoiceChatState } from '../services/voiceChat';

interface RoomPageProps {
  profile: PlayerProfile;
  onStartGame: (worldId: number, levelNumber: number) => void;
  onBackToMenu: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({ profile, onStartGame, onBackToMenu }) => {
  const [room, setRoom] = useState<RoomState | null>(multiplayer.getActiveRoom());
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceChatState>(voiceChat.getState());

  useEffect(() => {
    const unsubVoice = voiceChat.subscribe((v) => setVoiceState(v));
    return unsubVoice;
  }, []);

  useEffect(() => {
    const unsub = multiplayer.subscribe((r) => {
      setRoom(r);
    });
    return unsub;
  }, []);

  // Subscribe to remote chat messages
  useEffect(() => {
    const unsubChat = multiplayer.subscribeChat((msg) => {
      // Avoid duplicate display if we already added our own sent message
      setChatMessages((prev) => {
        const textFormatted = `${msg.senderName}: ${msg.text}`;
        if (prev.length > 0 && prev[prev.length - 1] === textFormatted) {
          return prev;
        }
        return [...prev, textFormatted];
      });
    });
    return unsubChat;
  }, []);

  // Listen for host 'start' game event to start simultaneously
  useEffect(() => {
    const unsubGame = multiplayer.subscribeGameEvent((event) => {
      if (event.type === 'start') {
        sound.playVictory();
        onStartGame(event.worldId, event.levelNumber);
      }
    });
    return unsubGame;
  }, [onStartGame]);

  const handleCreateRoom = () => {
    sound.playButtonClick();
    multiplayer.createRoom(profile.currentWorldId, profile.currentLevelIndex);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || isJoining) return;

    sound.playButtonClick();
    setIsJoining(true);
    setJoinError(null);

    const res = await multiplayer.joinRoom(joinCodeInput);
    setIsJoining(false);

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
    const textFormatted = `${profile.username}: ${chatInput.trim()}`;
    setChatMessages((prev) => [...prev, textFormatted]);
    multiplayer.sendRoomMessage(chatInput.trim());
    setChatInput('');
  };

  const isHost = room && room.hostId === profile.id;
  const isGuest = room && !isHost && room.player2?.id === profile.id;
  const bothReady = !!(room?.player1?.ready && room?.player2?.ready);
  const world = WORLDS_DATA.find((w) => w.id === room?.worldId) || WORLDS_DATA[0];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header with Supabase Realtime Status Badge */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white font-serif">CO-OP MULTIPLAYER LOBBY</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real 2-player online co-op via Supabase Realtime (Broadcast & Presence).
          </p>
        </div>

        {/* Realtime Status Pill */}
        <div className="flex items-center gap-2">
          {isSupabaseConfigured ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5" />
              <span>Supabase Realtime Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-inner">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Setup: Add Supabase URL/Key to .env</span>
            </div>
          )}
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-950/30 border border-amber-600/40 text-xs text-amber-200 flex items-start gap-3">
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold">Supabase Realtime Configuration Notice</div>
            <p className="text-amber-300/80 mt-1 leading-relaxed">
              To test real online 2-player multiplayer between two browsers/devices, add your Supabase project credentials
              (<code className="font-mono bg-black/40 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono bg-black/40 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>) to your <code className="font-mono bg-black/40 px-1 py-0.5 rounded">.env</code> file.
              Local co-op and single-player modes continue working without configuration.
            </p>
          </div>
        </div>
      )}

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
              <h2 className="text-xl font-bold text-white font-serif mb-2">Create Online Room</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Host an authoritative room. You will receive a 4-digit code to invite your partner in real time.
              </p>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Create Authoritative Room</span>
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
                Have a 4-digit code from the host? Enter it below to connect through the Supabase Realtime channel.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. TQ-8492"
                disabled={isJoining}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white font-mono text-center tracking-widest text-sm focus:outline-none focus:border-rose-500"
              />

              {joinError && (
                <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/50">
                  {joinError}
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all border border-slate-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    <span>Connecting to Host...</span>
                  </>
                ) : (
                  <span>Join Room</span>
                )}
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
                  Authoritative Session ({isHost ? 'You are Host' : 'You are Guest'})
                </span>
                <h2 className="text-lg font-bold text-white">{room.name}</h2>
                <div className="text-xs text-slate-400">
                  Target: {world.name} — Stage {room.levelNumber}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Lobby Teammate Voice Mic Toggle */}
                <button
                  onClick={async () => {
                    sound.playButtonClick();
                    await voiceChat.toggleMic();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all shadow-md active:scale-95 ${
                    voiceState.isMicOn
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-slate-800/90 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={voiceState.isMicOn ? 'Microphone LIVE (Tap to Mute)' : 'Microphone MUTED (Tap to Unmute)'}
                >
                  {voiceState.isMicOn ? <Mic className="w-4 h-4 text-emerald-400 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                  <span>{voiceState.isMicOn ? 'Voice LIVE' : 'Mic Muted'}</span>
                </button>

                {/* Room Code Badge */}
                <div
                  onClick={() => {
                    navigator.clipboard.writeText(room.roomCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700 cursor-pointer hover:border-rose-500 transition-colors"
                  title="Click to copy room code"
                >
                  <span className="text-[11px] text-slate-400">Code:</span>
                  <span className="font-mono font-bold text-white tracking-wider text-sm">{room.roomCode}</span>
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>
            </div>

            {/* Slots Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Player 1 Slot (Host) */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                      P1
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{room.player1?.username || 'Host'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">
                          Host
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {room.player1?.character === 'boy' ? 'Boyfriend (Leo)' : 'Girlfriend (Maya)'}
                      </div>
                    </div>
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
                  <span className="text-xl">{room.player1?.character === 'boy' ? '👦' : '👧'}</span>
                  <div>
                    <div className="font-bold">
                      {room.player1?.character === 'boy' ? `Boyfriend (${profile.boyName || 'Boyfriend'})` : `Girlfriend (${profile.girlName || 'Girlfriend'})`}
                    </div>
                    <div className="text-[11px] text-blue-300/70">Assigned Character</div>
                  </div>
                </div>

                {isHost && (
                  <div className="space-y-2">
                    <button
                      onClick={handleToggleReady}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
                    >
                      {room.player1?.ready ? 'Cancel Ready' : 'Set Ready'}
                    </button>
                    <button
                      onClick={() => {
                        const next = room.player1?.character === 'boy' ? 'girl' : 'boy';
                        multiplayer.setCharacter(next);
                      }}
                      className="w-full py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold transition-all"
                    >
                      Swap Character Role
                    </button>
                  </div>
                )}
              </div>

              {/* Player 2 Slot (Guest) */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      P2
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {room.player2?.username || 'Waiting for Partner...'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {room.player2
                          ? room.player2.character === 'boy' ? 'Boyfriend (Leo)' : 'Girlfriend (Maya)'
                          : 'Share room code to join'}
                      </div>
                    </div>
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
                    <span className="px-2.5 py-1 rounded-full text-[10px] bg-slate-800 text-slate-400 animate-pulse">
                      WAITING...
                    </span>
                  )}
                </div>

                <div className="my-4 p-4 rounded-2xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-200 flex items-center gap-2">
                  <span className="text-xl">{room.player2?.character === 'boy' ? '👦' : '👧'}</span>
                  <div>
                    <div className="font-bold">
                      {room.player2
                        ? room.player2.character === 'boy' ? `Boyfriend (${profile.boyName || 'Boyfriend'})` : `Girlfriend (${profile.girlName || 'Girlfriend'})`
                        : 'Partner Slot'}
                    </div>
                    <div className="text-[11px] text-rose-300/70">
                      {room.player2 ? 'Assigned Character' : 'Awaiting online partner via Supabase'}
                    </div>
                  </div>
                </div>

                {isGuest && (
                  <div className="space-y-2">
                    <button
                      onClick={handleToggleReady}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
                    >
                      {room.player2?.ready ? 'Cancel Ready' : 'Set Ready'}
                    </button>
                    <button
                      onClick={() => {
                        const next = room.player2?.character === 'boy' ? 'girl' : 'boy';
                        multiplayer.setCharacter(next);
                      }}
                      className="w-full py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold transition-all"
                    >
                      Swap Character Role
                    </button>
                  </div>
                )}
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
                disabled={!isHost || !bothReady}
                onClick={() => {
                  sound.playButtonClick();
                  multiplayer.startOnlineGame();
                  onStartGame(room.worldId, room.levelNumber);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>
                  {!isHost
                    ? 'AWAITING HOST TO LAUNCH...'
                    : bothReady
                    ? 'START ONLINE CO-OP TRIAL'
                    : 'WAITING FOR BOTH PLAYERS TO READY'}
                </span>
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
                <span className="text-[10px] text-emerald-400 font-mono">Realtime</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <div className="text-[11px] text-slate-500 italic">
                  Room created. Chat messages broadcast in real-time between both players.
                </div>
                {chatMessages.map((msg, i) => (
                  <div key={i} className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40 break-words">
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
