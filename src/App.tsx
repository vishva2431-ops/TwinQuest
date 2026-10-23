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
import { LoginPage } from './components/LoginPage';
import { storage } from './services/storage';
import { sound } from './services/sound';
import { auth } from './services/auth';
import { PlayerProfile } from './types/game';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(storage.getProfile());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<'home' | 'maps' | 'levels' | 'friends' | 'rooms' | 'settings' | 'deliverables'>('home');

  // Game Play State
  const [isPlayingGame, setIsPlayingGame] = useState(false);
  const [activeWorldId, setActiveWorldId] = useState(1);
  const [activeLevelNumber, setActiveLevelNumber] = useState(1);
  const [activeGameMode, setActiveGameMode] = useState<'single_player' | 'online_room' | 'local_coop'>('single_player');
  const [activeFriendId, setActiveFriendId] = useState<string | undefined>(undefined);
  const [activeFriendName, setActiveFriendName] = useState<string | undefined>(undefined);

  // Modals
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Already signed in? Restore the saved session (checked with the server) instead of asking again.
  useEffect(() => {
    let cancelled = false;
    auth
      .restoreSession()
      .then((restored) => {
        if (cancelled) return;
        if (restored) {
          setProfile(restored);
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    // Session ended elsewhere (expired / signed out in another tab) -> back to the login page
    const off = auth.onSignedOut(() => {
      setProfile(storage.signOutProfile());
      setIsAuthenticated(false);
      setIsPlayingGame(false);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const handleLogout = async () => {
    const guestProfile = await auth.signOut();
    setProfile(guestProfile);
    setIsAuthenticated(false);
    setIsPlayingGame(false);
    setCurrentTab('home');
  };

  useEffect(() => {
    // Start background ambient chords on start
    sound.startMusic('sunset');
  }, []);

  const handleStartGame = (
    worldId: number,
    levelNumber: number,
    mode: 'single_player' | 'online_room' | 'local_coop' = 'single_player',
    friendId?: string,
    friendName?: string
  ) => {
    setActiveWorldId(worldId);
    setActiveLevelNumber(levelNumber);
    setActiveGameMode(mode);
    setActiveFriendId(friendId);
    setActiveFriendName(friendName);
    setIsPlayingGame(true);

    // Save as current progress in single player
    if (mode === 'single_player') {
      const updated = { ...profile, currentWorldId: worldId, currentLevelIndex: levelNumber };
      setProfile(updated);
      storage.saveProfile(updated);
    }
  };

  const handleNextLevel = (worldId: number, nextLevelNumber: number) => {
    setActiveWorldId(worldId);
    setActiveLevelNumber(nextLevelNumber);

    if (activeGameMode === 'single_player') {
      const updated = { ...profile, currentWorldId: worldId, currentLevelIndex: nextLevelNumber };
      setProfile(updated);
      storage.saveProfile(updated);
    }
  };

  const handleExitGame = () => {
    setIsPlayingGame(false);
    setCurrentTab('maps');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  // Login page is shown until a real, verified session (or a guest session) exists
  if (!isAuthenticated) {
    return (
      <LoginPage
        initialProfile={profile}
        onLoginSuccess={(updatedProfile) => {
          setProfile(updatedProfile);
          setIsAuthenticated(true);
          setCurrentTab('home');
        }}
      />
    );
  }

  if (isPlayingGame) {
    return (
      <GameCanvas
        key={`${activeWorldId}-${activeLevelNumber}`}
        worldId={activeWorldId}
        levelNumber={activeLevelNumber}
        gameMode={activeGameMode}
        friendId={activeFriendId}
        friendName={activeFriendName}
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
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenCustomization={() => setIsCustomizing(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onQuickPlay={() => handleStartGame(profile.currentWorldId, profile.currentLevelIndex)}
        onLogout={handleLogout}
        profile={profile}
      />

      {/* Main Content Pages */}
      <main className="flex-1 pb-16">
        {currentTab === 'home' && (
          <HomePage
            profile={profile}
            onPlay={handleStartGame}
            onSelectTab={(tab) => setCurrentTab(tab)}
            onOpenCustomization={() => setIsCustomizing(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
            onUpdateProfile={(updated) => setProfile(updated)}
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
            onStartGame={(wId, lvl, mode, fId, fName) => handleStartGame(wId, lvl, mode || 'online_room', fId, fName)}
            onBackToMenu={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage onLogout={handleLogout} />
        )}
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
        onSignOut={handleLogout}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-4 text-center text-xs text-slate-500">
        <span className="font-serif font-bold text-slate-400">TwinQuest</span>
      </footer>
    </div>
  );
}
