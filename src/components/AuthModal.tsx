import React, { useState } from 'react';
import { X, User, Lock, Mail, Check, LogIn, UserPlus, Sparkles } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { sound } from '../services/sound';
import { storage } from '../services/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (profile: PlayerProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState(profile.username || '');
  const [email, setEmail] = useState(profile.email || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButtonClick();

    if (!username.trim()) {
      setErrorMsg('Please enter a username');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long');
      return;
    }

    const updated: PlayerProfile = {
      ...profile,
      username: username.trim(),
      email: email.trim() || undefined,
      isGuest: false
    };

    storage.saveProfile(updated);
    onUpdateProfile(updated);
    setSuccessMsg(mode === 'login' ? 'Successfully logged in!' : 'Account registered successfully!');
    setTimeout(() => {
      onClose();
      setSuccessMsg(null);
    }, 1200);
  };

  const handleGuestLogin = () => {
    sound.playButtonClick();
    const guestUser: PlayerProfile = {
      ...profile,
      username: 'Guest_' + Math.floor(1000 + Math.random() * 9000),
      isGuest: true
    };
    storage.saveProfile(guestUser);
    onUpdateProfile(guestUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <button
          onClick={() => {
            sound.playButtonClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white font-serif">
            {mode === 'login' ? 'Player Sign In' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access online room sessions, friend messaging, and synced progression.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60 mb-5">
          <button
            onClick={() => {
              sound.playButtonClick();
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'login' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              sound.playButtonClick();
              setMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'register' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Username / Player Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. LeoAdventurer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Email (Optional)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-rose-500 rounded"
              />
              <span>Remember me on this PC</span>
            </label>
            <span className="text-rose-400 hover:underline cursor-pointer">Forgot?</span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 text-center">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 text-center">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          >
            {mode === 'login' ? 'Sign In to Account' : 'Create & Play'}
          </button>
        </form>

        {/* Quick Guest Access */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={handleGuestLogin}
            className="text-xs text-slate-400 hover:text-white underline font-medium"
          >
            Continue as Guest (Offline Mode)
          </button>
        </div>
      </div>
    </div>
  );
};
