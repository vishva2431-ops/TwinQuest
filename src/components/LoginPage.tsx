import React, { useState } from 'react';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, Heart, Check, AlertCircle, Loader2 } from 'lucide-react';
import { PlayerProfile, CharacterGender } from '../types/game';
import { sound } from '../services/sound';
import { auth, authAvailable } from '../services/auth';

interface LoginPageProps {
  onLoginSuccess: (profile: PlayerProfile) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<CharacterGender | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (next: 'login' | 'register') => {
    sound.playButtonClick();
    setMode(next);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    sound.playButtonClick();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!authAvailable) {
      setErrorMessage('Accounts are unavailable right now. You can still play as a guest.');
      return;
    }

    if (mode === 'register' && username.trim().length < 2) {
      setErrorMessage('Please enter a user name (at least 2 characters).');
      return;
    }
    if (mode === 'register' && !gender) {
      setErrorMessage('Please choose your character: Boy or Girl.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    } else if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await auth.signIn(email, password)
          : await auth.signUp(email, password, username, gender as CharacterGender);

      if (!res.ok) {
        setErrorMessage(res.message);
        return;
      }
      if ('needsEmailConfirmation' in res) {
        setSuccessMessage('Account created! Check your email to confirm it, then sign in.');
        setMode('login');
        setPassword('');
        setConfirm('');
        return;
      }
      sound.playVictory();
      onLoginSuccess(res.profile);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = () => {
    sound.playButtonClick();
    onLoginSuccess(auth.continueAsGuest());
  };

  const inputCls =
    'w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-rose-500 selection:text-white">
      <div className="absolute top-1/4 -left-28 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-28 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif text-white">
            Twin<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500">Quest</span>
          </h1>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  mode === m
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">User name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputCls}
                  />
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
                      className={`py-3 rounded-2xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        gender === g.id ? g.on : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xl">{g.emoji}</span>
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
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
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

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Confirm password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="text-xs text-slate-400 hover:text-white underline underline-offset-4 transition-colors"
            >
              Play as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
