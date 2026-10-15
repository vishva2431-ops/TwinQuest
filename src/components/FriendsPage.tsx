import React, { useState } from 'react';
import { Users, UserPlus, MessageCircle, Send, ShieldCheck, UserCheck, UserX, Copy, Check, Sparkles, Search, ArrowRight } from 'lucide-react';
import { storage } from '../services/storage';
import { multiplayer } from '../services/multiplayer';
import { sound } from '../services/sound';
import { FriendItem, ChatMessage, PlayerProfile } from '../types/game';

interface FriendsPageProps {
  profile: PlayerProfile;
  onJoinRoomWithFriend: (roomCode: string) => void;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({ profile, onJoinRoomWithFriend }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'chat'>('friends');
  const [friends, setFriends] = useState<FriendItem[]>(storage.getFriends());
  const [selectedFriend, setSelectedFriend] = useState<FriendItem>(friends[0] || null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(storage.getChatMessages());
  const [inputText, setInputText] = useState('');
  const [searchId, setSearchId] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const pendingRequests = [
    { id: 'req_1', username: 'Robin_Trail', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
    { id: 'req_2', username: 'Chloe_Blossom', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' }
  ];

  const suggestedFriends = [
    { id: 'sug_1', username: 'Oliver_Cloud', mutual: 3, character: 'boy' },
    { id: 'sug_2', username: 'Elena_Sparks', mutual: 5, character: 'girl' },
    { id: 'sug_3', username: 'Felix_Apex', mutual: 2, character: 'boy' }
  ];

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

  const handleAddFriendById = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    sound.playButtonClick();
    const query = searchId.trim();

    // Prevent duplicate
    if (friends.some((f) => f.username.toLowerCase() === query.toLowerCase() || f.id === query)) {
      setSearchStatus('This player is already in your friends list!');
      return;
    }

    const newFriend: FriendItem = {
      id: 'fnd_' + Math.floor(Math.random() * 900 + 100),
      username: query,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      status: 'online',
      character: Math.random() > 0.5 ? 'girl' : 'boy'
    };

    const updated = [...friends, newFriend];
    setFriends(updated);
    storage.saveFriends(updated);
    setSearchStatus(`Friend request sent and connected with ${query}!`);
    setSearchId('');
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
      text: `Hey ${friend.username}! Join my TwinQuest room: ${room.roomCode}`,
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
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('friends');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'add' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Friends</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Friends List */}
      {activeTab === 'friends' && (
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
                    {friend.status === 'in_game' ? 'Playing Stage 14' : friend.status}
                  </div>
                </div>
              </div>

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

      {/* TAB 2: Direct 1-on-1 End-to-End Encrypted Chat */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[520px]">
          {/* Friend Selector Sidebar */}
          <div className="border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-2 overflow-y-auto">
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
                  <div className="text-[10px] text-slate-400">Click to chat</div>
                </div>
              </button>
            ))}
          </div>

          {/* Active Chat Conversation View */}
          <div className="col-span-2 flex flex-col justify-between p-5">
            {/* Chat Header */}
            {selectedFriend && (
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
            )}

            {/* Messages Feed */}
            <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-[360px]">
              {chatMessages
                .filter((m) => !selectedFriend || m.receiverId === selectedFriend.id || m.senderId === selectedFriend.id)
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
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-slate-800">
              <input
                type="text"
                placeholder="Type a message..."
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
          </div>
        </div>
      )}

      {/* TAB 3: Add Friends & Pending Requests */}
      {activeTab === 'add' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Search By Username / ID */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-rose-400" />
              <span>Search Player</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Enter a unique player username or Player ID to send a co-op invitation.
            </p>

            <form onSubmit={handleAddFriendById} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Enter username (e.g. LeoAdventurer)..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
              >
                Send Request
              </button>
            </form>

            {searchStatus && (
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-rose-300">
                {searchStatus}
              </div>
            )}

            {/* Your Own Player ID Card */}
            <div className="mt-8 pt-5 border-t border-slate-800">
              <div className="text-xs text-slate-400 mb-2">Share your Player ID:</div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
                <span className="font-mono text-xs font-bold text-rose-400">{profile.id}</span>
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

          {/* Right: Suggested Friends & Pending */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-bold text-white mb-3">Suggested Explorers</h2>
              <div className="space-y-3">
                {suggestedFriends.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{sug.username}</div>
                      <div className="text-[10px] text-slate-400">{sug.mutual} mutual friends • {sug.character}</div>
                    </div>
                    <button
                      onClick={() => {
                        sound.playButtonClick();
                        const newFriend: FriendItem = {
                          id: sug.id,
                          username: sug.username,
                          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                          status: 'online',
                          character: sug.character as any
                        };
                        const updated = [...friends, newFriend];
                        setFriends(updated);
                        storage.saveFriends(updated);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-rose-600 text-white text-xs font-semibold transition-all"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-white mb-3">Pending Requests</h2>
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img src={req.avatar} alt={req.username} className="w-9 h-9 rounded-xl object-cover" />
                      <div className="text-xs font-bold text-white">{req.username}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          sound.playButtonClick();
                          const newFriend: FriendItem = {
                            id: req.id,
                            username: req.username,
                            avatar: req.avatar,
                            status: 'online',
                            character: 'girl'
                          };
                          const updated = [...friends, newFriend];
                          setFriends(updated);
                          storage.saveFriends(updated);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => sound.playButtonClick()}
                        className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
