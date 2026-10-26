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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Play,
  Wifi,
  WifiOff,
  Globe
} from 'lucide-react';
import { PlayerProfile, CharacterGender } from '../types/game';
import { sound } from '../services/sound';
import { storage } from '../services/storage';
import { useNetworkStatus } from '../services/networkStatus';

interface LoginPageProps {
  initialProfile?: PlayerProfile;
  onLoginSuccess: (profile: PlayerProfile) => void;
  onPlayOffline?: (profile: PlayerProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialProfile, onLoginSuccess, onPlayOffline }) => {
  const isOnline = useNetworkStatus();
  const baseProfile = initialProfile || storage.getProfile();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form Fields: Username, Email, and Password
  const [name, setName] = useState(baseProfile?.username || 'Adventurer');
  const [email, setEmail] = useState(baseProfile?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Character / Gender Selection (Persisted to profile)
  const [selectedGender, setSelectedGender] = useState<CharacterGender>(
    baseProfile?.activeCharacter || 'boy'
  );

  // Character Custom Names (Editable right at login, no hardcoded details)
  const [boyName, setBoyName] = useState(baseProfile?.boyName || 'Boyfriend');
  const [girlName, setGirlName] = useState(baseProfile?.girlName || 'Girlfriend');
  const [showPartnerName, setShowPartnerName] = useState(false);

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
      ...baseProfile,
      username: name.trim(),
      email: email.trim(),
      isGuest: false,
      isEmailVerified: true,
      verifiedEmail: email.trim(),
      sessionToken: token,
      activeCharacter: selectedGender,
      boyName: boyName.trim() || 'Boyfriend',
      girlName: girlName.trim() || 'Girlfriend'
    };

    storage.saveProfile(updated);
    sound.playVictory();
    setSuccessMessage(
      mode === 'login'
        ? `Signed in as ${selectedGender === 'boy' ? 'Male' : 'Female'} Character! Entering TwinQuest...`
        : `Account created with ${selectedGender === 'boy' ? 'Male' : 'Female'} Character! Entering TwinQuest...`
    );

    setTimeout(() => {
      onLoginSuccess(updated);
    }, 450);
  };

  const handleGuestLogin = () => {
    sound.playButtonClick();
    const updated: PlayerProfile = {
      ...baseProfile,
      username: name.trim() || 'Adventurer',
      activeCharacter: selectedGender,
      boyName: boyName.trim() || 'Boyfriend',
      girlName: girlName.trim() || 'Girlfriend',
      isGuest: true
    };
    storage.saveProfile(updated);
    onLoginSuccess(updated);
  };

  const handlePlayOffline = () => {
    sound.playButtonClick();
    const updated: PlayerProfile = {
      ...baseProfile,
      username: name.trim() || 'Adventurer',
      activeCharacter: selectedGender,
      boyName: boyName.trim() || 'Boyfriend',
      girlName: girlName.trim() || 'Girlfriend',
      isGuest: true
    };
    storage.saveProfile(updated);
    if (onPlayOffline) {
      onPlayOffline(updated);
    } else {
      onLoginSuccess(updated);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-3 sm:px-6 py-6 sm:py-10 relative overflow-hidden font-sans selection:bg-rose-500 selection:text-white">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 -left-28 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-28 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-gradient-to-b from-rose-500/10 to-transparent blur-2xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-5 sm:space-y-6">
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
        <div className="bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl rounded-3xl p-4 sm:p-8 shadow-2xl space-y-5 sm:space-y-6">
          {/* Live Network Status Indicator */}
          <div className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
            isOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-[11px]">Online: Ready for Multiplayer with Friends</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold text-[11px]">Offline Mode: Single Player Ready (No Internet)</span>
                </>
              )}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

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

            {/* Character / Gender Selection Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Select Your Character</span>
                <span className="text-[10px] text-rose-400 font-normal">Active In-Game Adventurer</span>
              </label>

              {/* Two Option Cards: Male Character and Female Character */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Male Character Option */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setSelectedGender('boy');
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all relative overflow-hidden group flex flex-col justify-between ${
                    selectedGender === 'boy'
                      ? 'bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-950/40'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-2xl">👦</span>
                    {selectedGender === 'boy' ? (
                      <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                      Male Character
                    </div>
                    <div className="text-[10px] text-blue-400 font-medium">
                      {boyName || 'Boyfriend'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      Agile • Swift • Brave
                    </div>
                  </div>
                </button>

                {/* Female Character Option */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setSelectedGender('girl');
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all relative overflow-hidden group flex flex-col justify-between ${
                    selectedGender === 'girl'
                      ? 'bg-pink-950/50 border-pink-500 ring-2 ring-pink-500/30 shadow-lg shadow-pink-950/40'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-2xl">👧</span>
                    {selectedGender === 'girl' ? (
                      <span className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                      Female Character
                    </div>
                    <div className="text-[10px] text-pink-400 font-medium">
                      {girlName || 'Girlfriend'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      Graceful • Precise • Clever
                    </div>
                  </div>
                </button>
              </div>

              {/* Character Preview Banner */}
              <div className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                selectedGender === 'boy'
                  ? 'bg-gradient-to-r from-blue-950/40 to-slate-900 border-blue-800/40'
                  : 'bg-gradient-to-r from-pink-950/40 to-slate-900 border-pink-800/40'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-md ${
                  selectedGender === 'boy'
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'bg-pink-600/20 text-pink-300 border border-pink-500/30'
                }`}>
                  {selectedGender === 'boy' ? '👦' : '👧'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {selectedGender === 'boy' ? `Leo (${boyName || 'Boyfriend'})` : `Maya (${girlName || 'Girlfriend'})`}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      selectedGender === 'boy'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                    }`}>
                      {selectedGender === 'boy' ? 'Male Selected' : 'Female Selected'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    Loaded into Single-Player, Play With Friends, and Voice Sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* Character Renaming Section (Dynamically reflects selected character) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Custom Character Name</span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    selectedGender === 'boy'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                  }`}
                >
                  {selectedGender === 'boy' ? '👦 Male Selected' : '👧 Female Selected'}
                </span>
              </div>

              {/* Active Character Name Input: Visibly changes depending on selected gender */}
              {selectedGender === 'boy' ? (
                <div className="space-y-1">
                  <label className="text-[11px] text-blue-300 font-semibold flex items-center justify-between">
                    <span>👦 Your Character Name (Male / Boyfriend)</span>
                    <span className="text-[9px] text-slate-400 font-normal">Active in single-player & co-op</span>
                  </label>
                  <input
                    type="text"
                    value={boyName}
                    onChange={(e) => setBoyName(e.target.value)}
                    placeholder="Enter male character name (e.g. Leo)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-blue-500/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] text-pink-300 font-semibold flex items-center justify-between">
                    <span>👧 Your Character Name (Female / Girlfriend)</span>
                    <span className="text-[9px] text-slate-400 font-normal">Active in single-player & co-op</span>
                  </label>
                  <input
                    type="text"
                    value={girlName}
                    onChange={(e) => setGirlName(e.target.value)}
                    placeholder="Enter female character name (e.g. Mia)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-pink-500/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-400 transition-all shadow-inner"
                  />
                </div>
              )}

              {/* Optional Partner Name Configuration for Co-op */}
              <div className="pt-1.5 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowPartnerName(!showPartnerName)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-between w-full py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <span>{selectedGender === 'boy' ? '👧 Customize Partner Name (Girlfriend)' : '👦 Customize Partner Name (Boyfriend)'}</span>
                    <span className="text-[9px] text-slate-500">(Co-op Partner)</span>
                  </span>
                  <span className="flex items-center gap-0.5 text-[9px] text-slate-400 font-medium">
                    {showPartnerName ? (
                      <>
                        <span>Hide</span>
                        <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <span>Customize</span>
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </span>
                </button>

                {showPartnerName && (
                  <div className="mt-2 pt-2 border-t border-slate-900 animate-fadeIn">
                    {selectedGender === 'boy' ? (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold block">
                          👧 Partner Name (Female / Girlfriend)
                        </label>
                        <input
                          type="text"
                          value={girlName}
                          onChange={(e) => setGirlName(e.target.value)}
                          placeholder="Girlfriend"
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-semibold block">
                          👦 Partner Name (Male / Boyfriend)
                        </label>
                        <input
                          type="text"
                          value={boyName}
                          onChange={(e) => setBoyName(e.target.value)}
                          placeholder="Boyfriend"
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Primary Action: Play Single Player (Offline Mode) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/40 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                  <Play className="w-4 h-4 fill-emerald-400" />
                  <span>Single Player (Offline Mode)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  100% Offline
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Play solo immediately with your {selectedGender === 'boy' ? 'Male' : 'Female'} character. No login or internet connection needed!
              </p>
              <button
                type="button"
                onClick={handlePlayOffline}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START SINGLE PLAYER (OFFLINE)</span>
              </button>
            </div>

            {/* Online Mode Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold text-rose-400/90 tracking-wider uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Or Play Online With Friends</span>
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Direct Submit Button for Online Multiplayer */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{mode === 'login' ? 'Sign In & Play Online' : 'Create Account & Play Online'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Play as Guest Divider */}
          <div className="pt-2 border-t border-slate-800/80 text-center space-y-3">
            <span className="text-[11px] text-slate-500">Or continue online without account</span>
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700/80 hover:border-slate-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Gamepad2 className="w-4 h-4 text-rose-400" />
              <span>Enter Online Rooms as Guest</span>
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
