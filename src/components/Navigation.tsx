import React from 'react';
import { Heart, Compass, Map, Layers, Users, Sliders, User, Box, Play, Sparkles } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { sound } from '../services/sound';

interface NavigationProps {
  currentTab: 'home' | 'maps' | 'levels' | 'friends' | 'rooms' | 'settings' | 'deliverables';
  onSelectTab: (tab: 'home' | 'maps' | 'levels' | 'friends' | 'rooms' | 'settings' | 'deliverables') => void;
  onOpenCustomization: () => void;
  onOpenAuth: () => void;
  onQuickPlay: () => void;
  profile: PlayerProfile;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenCustomization,
  onOpenAuth,
  onQuickPlay,
  profile
}) => {
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
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
              onSelectTab('maps');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'maps'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Worlds (10)</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('levels');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'levels'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Levels (500)</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('friends');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
              onSelectTab('rooms');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'rooms'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Co-Op Room</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('settings');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'settings'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('deliverables');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'deliverables'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/60'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Godot Source</span>
          </button>
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Character Customize Trigger */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onOpenCustomization();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-md active:scale-95 transition-all"
            title="Customize Characters (Boyfriend & Girlfriend)"
          >
            <User className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Customize</span>
          </button>

          {/* User Profile / Login */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onOpenAuth();
            }}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
              {profile.username[0]?.toUpperCase() || 'A'}
            </div>
            <span className="hidden md:inline">{profile.username}</span>
          </button>

          {/* Big Quick Play Button */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onQuickPlay();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>PLAY</span>
          </button>
        </div>
      </div>
    </header>
  );
};
