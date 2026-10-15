import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './components/HomePage';
import { MapSelectionPage } from './components/MapSelectionPage';
import { LevelsPage } from './components/LevelsPage';
import { FriendsPage } from './components/FriendsPage';
import { RoomPage } from './components/RoomPage';
import { SettingsPage } from './components/SettingsPage';
import { GameCanvas } from './components/GameCanvas';
import { CustomizationModal } from './components/CustomizationModal';
import { AuthModal } from './components/AuthModal';
import { DeliverablesModal } from './components/DeliverablesModal';
import { storage } from './services/storage';
import { sound } from './services/sound';
import { PlayerProfile } from './types/game';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(storage.getProfile());
  const [currentTab, setCurrentTab] = useState<'home' | 'maps' | 'levels' | 'friends' | 'rooms' | 'settings' | 'deliverables'>('home');

  // Game Play State
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  const [activeWorldId, setActiveWorldId] = useState(1);
  const [activeLevelNumber, setActiveLevelNumber] = useState(1);

  // Modals
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDeliverablesOpen, setIsDeliverablesOpen] = useState(false);

  useEffect(() => {
    // Start background ambient chords on start
    sound.startMusic('sunset');
  }, []);

  const handleStartGame = (worldId: number, levelNumber: number) => {
    setActiveWorldId(worldId);
    setActiveLevelNumber(levelNumber);
    setIsPlayingGame(true);

    // Save as current progress
    const updated = { ...profile, currentWorldId: worldId, currentLevelIndex: levelNumber };
    setProfile(updated);
    storage.saveProfile(updated);
  };

  const handleNextLevel = (worldId: number, nextLevelNumber: number) => {
    setActiveWorldId(worldId);
    setActiveLevelNumber(nextLevelNumber);

    const updated = { ...profile, currentWorldId: worldId, currentLevelIndex: nextLevelNumber };
    setProfile(updated);
    storage.saveProfile(updated);
  };

  const handleExitGame = () => {
    setIsPlayingGame(false);
    setCurrentTab('maps');
  };

  if (isPlayingGame) {
    return (
      <GameCanvas
        worldId={activeWorldId}
        levelNumber={activeLevelNumber}
        onExitToMenu={handleExitGame}
        onNextLevel={handleNextLevel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Navigation Header */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'deliverables') {
            setIsDeliverablesOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenCustomization={() => setIsCustomizing(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onQuickPlay={() => handleStartGame(profile.currentWorldId, profile.currentLevelIndex)}
        profile={profile}
      />

      {/* Main Content Pages */}
      <main className="flex-1 pb-16">
        {currentTab === 'home' && (
          <HomePage
            profile={profile}
            onPlay={handleStartGame}
            onSelectTab={(tab) => {
              if (tab === 'deliverables') {
                setIsDeliverablesOpen(true);
              } else {
                setCurrentTab(tab);
              }
            }}
            onOpenCustomization={() => setIsCustomizing(true)}
          />
        )}

        {currentTab === 'maps' && (
          <MapSelectionPage
            profile={profile}
            onSelectWorld={(wId) => handleStartGame(wId, 1)}
            onViewLevels={(wId) => {
              setActiveWorldId(wId);
              setCurrentTab('levels');
            }}
          />
        )}

        {currentTab === 'levels' && (
          <LevelsPage
            selectedWorldId={activeWorldId}
            profile={profile}
            onSelectLevel={(wId, lvl) => handleStartGame(wId, lvl)}
            onBackToMaps={() => setCurrentTab('maps')}
          />
        )}

        {currentTab === 'friends' && (
          <FriendsPage
            profile={profile}
            onJoinRoomWithFriend={(code) => {
              setCurrentTab('rooms');
            }}
          />
        )}

        {currentTab === 'rooms' && (
          <RoomPage
            profile={profile}
            onStartGame={(wId, lvl) => handleStartGame(wId, lvl)}
            onBackToMenu={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'settings' && <SettingsPage />}
      </main>

      {/* Modals */}
      <CustomizationModal
        isOpen={isCustomizing}
        onClose={() => setIsCustomizing(false)}
        profile={profile}
        onSaveProfile={(updated) => setProfile(updated)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        profile={profile}
        onUpdateProfile={(updated) => setProfile(updated)}
      />

      <DeliverablesModal
        isOpen={isDeliverablesOpen}
        onClose={() => setIsDeliverablesOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-slate-400">TwinQuest 3D</span>
            <span>• Built with Three.js, React, Web Audio & Godot 4.7.2 Specs</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <button
              onClick={() => setIsDeliverablesOpen(true)}
              className="hover:text-rose-400 transition-colors"
            >
              Godot Deliverables
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className="hover:text-rose-400 transition-colors"
            >
              Settings & Mobile Layout
            </button>
            <button
              onClick={() => setIsCustomizing(true)}
              className="hover:text-rose-400 transition-colors"
            >
              Costumes
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
