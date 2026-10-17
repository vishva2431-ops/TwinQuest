import React, { useState } from 'react';
import { X, User, Lock, Mail, Check, Sparkles, ShieldCheck, Eye, EyeOff, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { PlayerProfile, CharacterGender } from '../types/game';
import { sound } from '../services/sound';
import { auth, authAvailable } from '../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onSignOut: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, profile, onUpdateProfile, onSignOut }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<CharacterGender | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const inputCls =
    'w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    sound.playButtonClick();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!authAvailable) {
      setErrorMsg('Accounts are unavailable right now.');
      return;
    }
    if (mode === 'register' && username.trim().length < 2) {
      setErrorMsg('Please enter a user name (at least 2 characters).');
      return;
    }
    if (mode === 'register' && !gender) {
      setErrorMsg('Please choose your character: Boy or Girl.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setBusy(true);
    try {
      const res = mode === 'login' ? await auth.signIn(email, password) : await auth.signUp(email, password, username, gender as CharacterGender);
      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }
      if ('needsEmailConfirmation' in res) {
        setSuccessMsg('Account created! Check your email to confirm it, then sign in.');
        setMode('login');
        setPassword('');
        return;
      }
      sound.playVictory();
      onUpdateProfile(res.profile);
      setPassword('');
      setSuccessMsg(mode === 'login' ? 'Signed in successfully!' : 'Account created!');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 700);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const header = (title: string, subtitle: string) => (
    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-md">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white font-serif">{title}</h2>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={() => {
          sound.playButtonClick();
          onClose();
        }}
        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );

  // Already signed in: show the account instead of a login form
  if (profile.isEmailVerified) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          {header('Your Account', 'You are signed in')}
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{profile.username}</span>
              </div>
              <div className="text-slate-400">{profile.verifiedEmail}</div>
            </div>
            <button
              onClick={() => {
                sound.playButtonClick();
                onClose();
                onSignOut();
              }}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-rose-600/20 text-rose-300 border border-slate-700 hover:border-rose-500/40 font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {header(mode === 'login' ? 'Sign In' : 'Create Account', 'Save your progress and play online')}
        <div className="p-6 space-y-5">
          <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  sound.playButtonClick();
                  setMode(m);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  mode === m ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">User name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">I am playing as</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: 'boy', label: 'Boy', emoji: '👦', on: 'border-blue-500 bg-blue-500/15 text-blue-200' },
                    { id: 'girl', label: 'Girl', emoji: '👧', on: 'border-rose-500 bg-rose-500/15 text-rose-200' }
                  ] as const).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        sound.playButtonClick();
                        setGender(g.id);
                      }}
                      aria-pressed={gender === g.id}
                      className={`py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        gender === g.id ? g.on : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-lg">{g.emoji}</span>
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls + ' pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
