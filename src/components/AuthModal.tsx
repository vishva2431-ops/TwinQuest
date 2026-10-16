import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, Check, LogIn, UserPlus, Sparkles, KeyRound, MailCheck, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
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
  const [step, setStep] = useState<'credentials' | 'otp_verification'>('credentials');

  const [username, setUsername] = useState(profile.username || '');
  const [email, setEmail] = useState(profile.email || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpCountdown, setOtpCountdown] = useState<number>(60);
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: number;
    if (step === 'otp_verification' && otpCountdown > 0) {
      timer = window.setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpCountdown]);

  if (!isOpen) return null;

  const generateAndSendOtp = (targetEmail: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setIsOtpSent(true);
    setOtpCountdown(60);
    setStep('otp_verification');
    sound.playCheckpoint();
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButtonClick();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Please enter your adventurer name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long');
      return;
    }

    // Advance to OTP verification
    generateAndSendOtp(email.trim());
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButtonClick();
    setErrorMsg(null);

    if (otpCode.trim() !== generatedOtp) {
      setErrorMsg('Invalid verification code. Please check the 6-digit code or auto-fill below.');
      sound.playTrapSpike();
      return;
    }

    // OTP Verified! Save profile with verified email and session token
    const token = 'tq_tok_' + Math.random().toString(36).substring(2) + Date.now();
    const updated: PlayerProfile = {
      ...profile,
      username: username.trim(),
      email: email.trim(),
      isGuest: false,
      isEmailVerified: true,
      verifiedEmail: email.trim(),
      sessionToken: token
    };

    storage.saveProfile(updated);
    onUpdateProfile(updated);
    sound.playVictory();
    setSuccessMsg('Email successfully verified! Welcome to TwinQuest.');

    setTimeout(() => {
      onClose();
      setStep('credentials');
      setSuccessMsg(null);
      setOtpCode('');
    }, 1200);
  };

  const handleResendOtp = () => {
    if (otpCountdown > 0) return;
    sound.playButtonClick();
    generateAndSendOtp(email.trim());
    setErrorMsg(null);
  };

  const handleQuickAutoFillOtp = () => {
    sound.playButtonClick();
    setOtpCode(generatedOtp);
  };

  const handleGuestLogin = () => {
    sound.playButtonClick();
    const guestUser: PlayerProfile = {
      ...profile,
      username: 'Adventurer_' + Math.floor(1000 + Math.random() * 9000),
      isGuest: true
    };
    storage.saveProfile(guestUser);
    onUpdateProfile(guestUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn font-sans">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playButtonClick();
            onClose();
            setStep('credentials');
            setErrorMsg(null);
          }}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'credentials' ? (
          /* STEP 1: Name, Email & Password Form */
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white font-serif">
                {mode === 'login' ? 'Player Sign In' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your details to receive an email OTP verification code.
              </p>
            </div>

            {/* Mode Toggle */}
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

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {/* Player Name */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Adventurer Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. LeoAdventurer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* Email ID */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Email ID (For OTP Verification)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="player@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded"
                  />
                  <span>Remember me</span>
                </label>
                <span className="text-rose-400 hover:underline cursor-pointer">Forgot?</span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 text-center">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Get Email OTP Code</span>
                <KeyRound className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Guest Access */}
            <div className="mt-5 pt-4 border-t border-slate-800 text-center">
              <button
                onClick={handleGuestLogin}
                className="text-xs text-slate-400 hover:text-white underline font-medium"
              >
                Continue as Guest (Offline Play)
              </button>
            </div>
          </>
        ) : (
          /* STEP 2: Email OTP Verification Screen */
          <>
            <div className="text-center mb-5">
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setStep('credentials');
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-3 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email / Details</span>
              </button>

              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <MailCheck className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-white font-serif">Verify Your Email</h2>
              <p className="text-xs text-slate-400 mt-1">
                We sent a 6-digit OTP code to <strong className="text-rose-400">{email}</strong>
              </p>
            </div>

            {/* Simulated Live Inbox Notification Banner */}
            <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-850 border border-emerald-500/40 shadow-lg">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Email OTP Received</span>
                </span>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Your one-time verification code is: <strong className="text-white font-mono tracking-widest text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{generatedOtp}</strong>
              </p>
              <button
                type="button"
                onClick={handleQuickAutoFillOtp}
                className="mt-2 text-[11px] font-bold text-rose-400 hover:text-rose-300 underline block"
              >
                Click here to auto-fill code ({generatedOtp})
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 849201"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-800 border border-slate-700 text-white font-mono text-center tracking-[0.5em] text-lg font-bold focus:outline-none focus:border-rose-500"
                />
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
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Verify & Launch Game</span>
              </button>
            </form>

            {/* Resend Code Section */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Didn't receive the code?</span>
              <button
                type="button"
                disabled={otpCountdown > 0}
                onClick={handleResendOtp}
                className={`font-semibold flex items-center gap-1 ${
                  otpCountdown > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-rose-400 hover:underline'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${otpCountdown > 0 ? 'animate-spin' : ''}`} />
                <span>{otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend OTP'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
