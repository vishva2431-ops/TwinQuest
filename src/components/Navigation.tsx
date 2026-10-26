import React from 'react';
import { Heart, Compass, Map, Layers, Users, Sliders, User, Box, Play, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { sound } from '../services/sound';
import { useNetworkStatus } from '../services/networkStatus';

interface NavigationProps {
  currentTab: 'home' | 'maps' | 'levels' | 'friends' | 'rooms' | 'settings' | 'deliverables';
  onSelectTab: (tab: 'home' | 'maps' | 'levels' | 'friends' | 'rooms' | 'settings' | 'deliverables') => void;
  onOpenCustomization: () => void;
  onOpenAuth: () => void;
  onQuickPlay: () => void;
  onLogout?: () => void;
  profile: PlayerProfile;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenCustomization,
  onOpenAuth,
  onQuickPlay,
  onLogout,
  profile
}) => {
  const isOnline = useNetworkStatus();
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => {
            sound.playButtonClick();
            onSelectTab('home');
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white font-serif flex items-center gap-1">
              TWIN<span className="text-rose-500">QUEST</span>
            </span>
            <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase -mt-1">
              Cooperative 3D Adventure
            </div>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('home');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'home'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('levels');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'levels' || currentTab === 'maps'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Single Player</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-md font-mono">
              Offline
            </span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('rooms');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'rooms'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Online Co-Op</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono border ${
              isOnline
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isOnline ? 'Online' : 'Needs Net'}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('friends');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'friends'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Friends</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('settings');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'settings'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Settings</span>
          </button>

          {/* Quick Login / Switch Account Link */}
          {onLogout && (
            <button
              onClick={() => {
                sound.playButtonClick();
                onLogout();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/10 transition-colors"
            >
              <span>{profile.isEmailVerified ? 'Sign out' : 'Sign in'}</span>
            </button>
          )}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Network Status Indicator Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
            title={isOnline ? 'Connected to internet. Online multiplayer available.' : 'Offline mode active. Single Player is fully playable offline.'}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Character Customize Trigger */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onOpenCustomization();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-md active:scale-95 transition-all"
            title="Rename & Customize Characters"
          >
            <User className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Characters</span>
          </button>

          {/* User Profile / Account Indicator */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onOpenAuth();
            }}
            className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              profile.isEmailVerified
                ? 'bg-slate-900 border-emerald-500/40 text-slate-200 hover:border-emerald-500'
                : 'bg-gradient-to-r from-rose-950/60 to-slate-900 border-rose-500/40 text-rose-200 hover:border-rose-400'
            }`}
            title={profile.isEmailVerified ? `Verified Account: ${profile.verifiedEmail}` : 'Click to Sign In'}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold ${
              profile.isEmailVerified
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                : 'bg-gradient-to-tr from-rose-500 to-pink-600'
            }`}>
              {profile.username[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-white truncate max-w-[100px]">{profile.username}</span>
              <span className={`text-[9px] ${profile.isEmailVerified ? 'text-emerald-400 font-medium' : 'text-rose-300'}`}>
                {profile.isEmailVerified ? 'Verified Account' : 'Sign In'}
              </span>
            </div>
          </button>

          {/* Big Quick Play Button for Single Player */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onQuickPlay();
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition-all active:scale-95 shrink-0"
            title="Start Solo Offline Adventure"
          >
            <Play className="w-4 h-4 fill-white" />
            <span className="hidden sm:inline">PLAY (OFFLINE)</span>
            <span className="sm:hidden">PLAY</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Sticky for all phone and tablet devices) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
        <button
          onClick={() => {
            sound.playButtonClick();
            onSelectTab('home');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'home' ? 'text-rose-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => {
            sound.playButtonClick();
            onSelectTab('levels');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'levels' || currentTab === 'maps' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Single</span>
        </button>

        <button
          onClick={() => {
            sound.playButtonClick();
            onSelectTab('rooms');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'rooms' ? 'text-rose-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">Co-Op</span>
        </button>

        <button
          onClick={() => {
            sound.playButtonClick();
            onSelectTab('friends');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'friends' ? 'text-rose-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Friends</span>
        </button>

        <button
          onClick={() => {
            sound.playButtonClick();
            onSelectTab('settings');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'settings' ? 'text-rose-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </nav>
    </header>
  );
};
