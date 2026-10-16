import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Gamepad2,
  Check,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { sound } from '../services/sound';
import { storage } from '../services/storage';

interface LoginPageProps {
  initialProfile: PlayerProfile;
  onLoginSuccess: (profile: PlayerProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialProfile, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form Fields: Username, Email, and Password
  const [name, setName] = useState(initialProfile.username || 'Adventurer');
  const [email, setEmail] = useState(initialProfile.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Character Custom Names (Editable right at login, no hardcoded details)
  const [boyName, setBoyName] = useState(initialProfile.boyName || 'Boyfriend');
  const [girlName, setGirlName] = useState(initialProfile.girlName || 'Girlfriend');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButtonClick();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your user name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters long');
      return;
    }

    // Direct Login / Registration with Username, Email, and Password (No OTP!)
    const token = 'tq_tok_' + Math.random().toString(36).substring(2) + Date.now();
    const updated: PlayerProfile = {
      ...initialProfile,
      username: name.trim(),
      email: email.trim(),
      isGuest: false,
      isEmailVerified: true,
      verifiedEmail: email.trim(),
      sessionToken: token,
      boyName: boyName.trim() || 'Boyfriend',
      girlName: girlName.trim() || 'Girlfriend'
    };

    storage.saveProfile(updated);
    sound.playVictory();
    setSuccessMessage(
      mode === 'login'
        ? 'Signed in successfully! Entering TwinQuest...'
        : 'Account created successfully! Entering TwinQuest...'
    );

    setTimeout(() => {
      onLoginSuccess(updated);
    }, 450);
  };

  const handleGuestLogin = () => {
    sound.playButtonClick();
    const updated: PlayerProfile = {
      ...initialProfile,
      username: name.trim() || 'Adventurer',
      boyName: boyName.trim() || 'Boyfriend',
      girlName: girlName.trim() || 'Girlfriend'
    };
    storage.saveProfile(updated);
    onLoginSuccess(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-rose-500 selection:text-white">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 -left-28 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-28 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-gradient-to-b from-rose-500/10 to-transparent blur-2xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Game Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-rose-400 font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Game Portal & APK Entry</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif text-white">
              Twin<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500">Quest</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Cooperative 3D Adventure & Live Teammate Voice Platformer
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                sound.playButtonClick();
                setMode('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playButtonClick();
                setMode('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* User Name, Email and Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>User Name</span>
                <span className="text-[10px] text-slate-500 font-normal">Display Name</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Enter your user name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Character Renaming Section (Never hardcoded) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
              <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Custom Character Names</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold mb-1 block">👦 Boyfriend Name</label>
                  <input
                    type="text"
                    value={boyName}
                    onChange={(e) => setBoyName(e.target.value)}
                    placeholder="Boyfriend"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold mb-1 block">👧 Girlfriend Name</label>
                  <input
                    type="text"
                    value={girlName}
                    onChange={(e) => setGirlName(e.target.value)}
                    placeholder="Girlfriend"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Direct Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{mode === 'login' ? 'Sign In & Enter TwinQuest' : 'Create Account & Enter TwinQuest'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Play as Guest Divider */}
          <div className="pt-2 border-t border-slate-800/80 text-center space-y-3">
            <span className="text-[11px] text-slate-500">Or continue without account</span>
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700/80 hover:border-slate-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Gamepad2 className="w-4 h-4 text-rose-400" />
              <span>Enter TwinQuest as Guest</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="flex items-center justify-around text-center text-[11px] text-slate-500 pt-2">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Direct Sign In</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Live Mic Chat</span>
          </div>
          <div className="flex items-center gap-1">
            <Gamepad2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Co-Op Crossplay</span>
          </div>
        </div>
      </div>
    </div>
  );
};
