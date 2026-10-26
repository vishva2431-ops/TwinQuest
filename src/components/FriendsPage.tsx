import React, { useState } from 'react';
import { Users, UserPlus, MessageCircle, Send, ShieldCheck, UserX, Copy, Check, Sparkles, User, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { storage } from '../services/storage';
import { multiplayer } from '../services/multiplayer';
import { sound } from '../services/sound';
import { FriendItem, ChatMessage, PlayerProfile, CharacterGender } from '../types/game';
import { useNetworkStatus } from '../services/networkStatus';

interface FriendsPageProps {
  profile: PlayerProfile;
  onJoinRoomWithFriend: (roomCode: string) => void;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({ profile, onJoinRoomWithFriend }) => {
  const isOnline = useNetworkStatus();
  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'chat'>('friends');
  const [friends, setFriends] = useState<FriendItem[]>(storage.getFriends());
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | null>(friends[0] || null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(storage.getChatMessages());
  const [inputText, setInputText] = useState('');

  // Add friend form
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendRole, setNewFriendRole] = useState<CharacterGender>('girl');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedFriend) return;

    sound.playButtonClick();
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: profile.id,
      senderName: profile.username,
      receiverId: selectedFriend.id,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isEncrypted: true
    };

    storage.addChatMessage(newMsg);
    setChatMessages([...chatMessages, newMsg]);
    setInputText('');
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const query = newFriendName.trim();
    if (!query) return;

    sound.playButtonClick();

    // Prevent duplicate
    if (friends.some((f) => f.username.toLowerCase() === query.toLowerCase() || f.id === query)) {
      setSearchStatus(`"${query}" is already in your friends list!`);
      return;
    }

    if (query.toLowerCase() === profile.username.toLowerCase() || query === profile.id) {
      setSearchStatus('You cannot add yourself as a friend.');
      return;
    }

    const newFriend: FriendItem = {
      id: 'fnd_' + Math.floor(1000 + Math.random() * 9000),
      username: query,
      avatar: newFriendRole === 'boy'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      status: 'online',
      character: newFriendRole
    };

    const updated = [...friends, newFriend];
    setFriends(updated);
    storage.saveFriends(updated);
    setSelectedFriend(newFriend);
    setSearchStatus(`Added "${query}" to your friends list!`);
    setNewFriendName('');
  };

  const handleRemoveFriend = (id: string) => {
    sound.playButtonClick();
    const updated = friends.filter((f) => f.id !== id);
    setFriends(updated);
    storage.saveFriends(updated);
    if (selectedFriend?.id === id) {
      setSelectedFriend(updated[0] || null);
    }
  };

  const handleInviteToRoom = (friend: FriendItem) => {
    sound.playButtonClick();
    const room = multiplayer.getActiveRoom() || multiplayer.createRoom(1, 1);
    const inviteMsg: ChatMessage = {
      id: 'msg_inv_' + Date.now(),
      senderId: profile.id,
      senderName: profile.username,
      receiverId: friend.id,
      text: `Join my TwinQuest room: ${room.roomCode}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isEncrypted: true
    };
    storage.addChatMessage(inviteMsg);
    setChatMessages([...chatMessages, inviteMsg]);
    onJoinRoomWithFriend(room.roomCode);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Subnav Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-white font-serif">FRIENDS & CO-OP</h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect with partners, send encrypted messages, and hop into live adventure rooms.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap sm:flex-nowrap p-1 bg-slate-900 border border-slate-800 rounded-2xl w-full sm:w-fit gap-1 sm:gap-0">
          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('friends');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'friends' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends ({friends.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('chat');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'chat' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Direct Chat</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('add');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'add' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friend</span>
          </button>
        </div>
      </div>

      {!isOnline && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-4 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-amber-300">Offline Mode Active</div>
              <p className="text-slate-300 mt-0.5">
                Connecting to friends and online room invites requires internet. You can still view saved friend progress, or play Single Player offline!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Friends List */}
      {activeTab === 'friends' && (
        <>
          {friends.length === 0 ? (
            /* Empty State */
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center max-w-md mx-auto shadow-2xl space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <Users className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white">No Friends Added Yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add your co-op partner by entering their username or Player ID to chat and invite them into private rooms!
              </p>
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setActiveTab('add');
                }}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add First Friend</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-lg backdrop-blur-md flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <img
                        src={friend.avatar}
                        alt={friend.username}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                          friend.status === 'online'
                            ? 'bg-emerald-400'
                            : friend.status === 'in_game'
                            ? 'bg-amber-400'
                            : 'bg-slate-600'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{friend.username}</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 capitalize">
                          {friend.character}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        {friend.status === 'in_game' ? 'In Co-Op Session' : friend.status}
                      </div>
                    </div>
                  </div>

                  {/* Per-Friend Progression Badge */}
                  {(() => {
                    const prog = storage.getFriendProgress(friend.id, 1);
                    return (
                      <div className="my-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Progress: <strong className="text-white">Stage {prog.levelNumber}</strong> (W{prog.worldId})</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Max: {prog.unlockedLevel}</span>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
                    <button
                      onClick={() => {
                        sound.playButtonClick();
                        setSelectedFriend(friend);
                        setActiveTab('chat');
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Message</span>
                    </button>

                    <button
                      onClick={() => handleInviteToRoom(friend)}
                      className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                      Invite
                    </button>

                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="p-2 rounded-xl bg-slate-800/50 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove Friend"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: Direct 1-on-1 End-to-End Encrypted Chat */}
      {activeTab === 'chat' && (
        <>
          {friends.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center max-w-md mx-auto shadow-2xl space-y-4">
              <MessageCircle className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Friends to Chat With</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add a co-op partner in the 'Add Friend' tab first to start real-time encrypted messaging.
              </p>
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setActiveTab('add');
                }}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Add Friend
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[460px] md:min-h-[520px]">
              {/* Friend Selector Sidebar */}
              <div className="border-b md:border-b-0 md:border-r border-slate-800 p-3 sm:p-4 space-y-2 overflow-y-auto max-h-48 md:max-h-none">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">
                  Conversations
                </div>
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => {
                      sound.playButtonClick();
                      setSelectedFriend(friend);
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all ${
                      selectedFriend?.id === friend.id
                        ? 'bg-rose-500/10 border border-rose-500/40 text-white'
                        : 'hover:bg-slate-800/60 text-slate-400 border border-transparent'
                    }`}
                  >
                    <div className="relative">
                      <img src={friend.avatar} alt={friend.username} className="w-10 h-10 rounded-xl object-cover" />
                      <span
                        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                          friend.status === 'online' ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{friend.username}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{friend.character} character</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Active Chat Conversation View */}
              <div className="col-span-2 flex flex-col justify-between p-5">
                {/* Chat Header */}
                {selectedFriend ? (
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <img src={selectedFriend.avatar} alt={selectedFriend.username} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <h3 className="text-sm font-bold text-white">{selectedFriend.username}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>End-to-End Encrypted</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInviteToRoom(selectedFriend)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md"
                    >
                      Invite to Room
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">Select a friend to begin chatting.</div>
                )}

                {/* Messages Feed */}
                <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-[360px]">
                  {selectedFriend &&
                    chatMessages
                      .filter((m) => m.receiverId === selectedFriend.id || m.senderId === selectedFriend.id)
                      .map((msg) => {
                        const isMine = msg.senderId === profile.id || msg.senderId === 'user';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-xs sm:max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                                isMine
                                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-br-none'
                                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60'
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                              {msg.timestamp}
                            </span>
                          </div>
                        );
                      })}

                  {selectedFriend &&
                    chatMessages.filter((m) => m.receiverId === selectedFriend.id || m.senderId === selectedFriend.id).length === 0 && (
                      <div className="text-xs text-slate-500 italic text-center py-8">
                        No messages yet with {selectedFriend.username}. Say hi!
                      </div>
                    )}
                </div>

                {/* Input Bar */}
                {selectedFriend && (
                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder={`Message ${selectedFriend.username}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 3: Add Friends */}
      {activeTab === 'add' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Left: Add by Username */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-rose-400" />
              <span>Add Player</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your friend's player name or unique ID to add them to your co-op roster.
            </p>

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Friend's Username or Player ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. PartnerPlayer"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Preferred Character Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFriendRole('girl')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      newFriendRole === 'girl'
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Girlfriend ({profile.girlName || 'Girl'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFriendRole('boy')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      newFriendRole === 'boy'
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Boyfriend ({profile.boyName || 'Boy'})
                  </button>
                </div>
              </div>

              {searchStatus && (
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-rose-300">
                  {searchStatus}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                Add to Friends
              </button>
            </form>
          </div>

          {/* Right: Your Shareable Player ID */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Your Player ID</span>
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Share your unique code with your partner so they can connect with you directly.
              </p>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Your Unique ID</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-rose-400">{profile.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(profile.id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 mt-6">
              When friends join your multiplayer room via code, they can also automatically connect to your direct messaging channel.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
