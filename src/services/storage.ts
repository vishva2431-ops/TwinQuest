import { CharacterCustomization, GameSettings, LevelProgress, PlayerProfile, FriendItem, ChatMessage, WorldData } from '../types/game';

export const WORLDS_DATA: WorldData[] = [
  {
    id: 1,
    name: 'Romantic Sunset Valley',
    subtitle: 'Where their journey begins',
    description: 'Golden sunsets over warm stone terraces, gentle waterfalls, blooming cherry blossoms, and the first unexpected trap puzzles.',
    themeColor: '#f97316',
    skyColorTop: '#ea580c',
    skyColorBottom: '#fed7aa',
    groundColor: '#78350f',
    accentColor: '#f43f5e',
    fogColor: '#fdba74',
    difficulty: 'Easy',
    totalLevels: 500,
    requiredHeartsToUnlock: 0,
    musicMood: 'sunset',
    icon: 'Sunset'
  },
  {
    id: 2,
    name: 'Enchanted Forest',
    subtitle: 'Whispering branches and hidden paths',
    description: 'Ancient twisting willow trees, emerald mossy stones, glowing fireflies, and collapsing wooden bridges testing your trust.',
    themeColor: '#10b981',
    skyColorTop: '#064e3b',
    skyColorBottom: '#6ee7b7',
    groundColor: '#065f46',
    accentColor: '#34d399',
    fogColor: '#a7f3d0',
    difficulty: 'Easy',
    totalLevels: 500,
    requiredHeartsToUnlock: 15,
    musicMood: 'forest',
    icon: 'Trees'
  },
  {
    id: 3,
    name: 'Floating Sky Islands',
    subtitle: 'Walking among the pink clouds',
    description: 'Pristine marble ruins drifting above a sea of clouds. Wind gusts and vanishing stepping stones require precise teamwork.',
    themeColor: '#38bdf8',
    skyColorTop: '#0284c7',
    skyColorBottom: '#e0f2fe',
    groundColor: '#f8fafc',
    accentColor: '#0ea5e9',
    fogColor: '#bae6fd',
    difficulty: 'Medium',
    totalLevels: 500,
    requiredHeartsToUnlock: 35,
    musicMood: 'sky',
    icon: 'CloudSun'
  },
  {
    id: 4,
    name: 'Frozen Kingdom',
    subtitle: 'Aurora dreams on slippery ice',
    description: 'Glacial towers gleaming under northern lights. Slippery ice physics, falling icicle traps, and dual pressure heat plates.',
    themeColor: '#06b6d4',
    skyColorTop: '#164e63',
    skyColorBottom: '#cffafe',
    groundColor: '#93c5fd',
    accentColor: '#38bdf8',
    fogColor: '#a5f3fc',
    difficulty: 'Medium',
    totalLevels: 500,
    requiredHeartsToUnlock: 60,
    musicMood: 'ice',
    icon: 'Snowflake'
  },
  {
    id: 5,
    name: 'Volcanic Caverns',
    subtitle: 'Fiery depths and rising heat',
    description: 'Obsidian basalt pillars over glowing lava. Rising magma hazards, timed fire nozzles, and daring leap-of-faith platforming.',
    themeColor: '#ef4444',
    skyColorTop: '#7f1d1d',
    skyColorBottom: '#fca5a5',
    groundColor: '#262626',
    accentColor: '#f97316',
    fogColor: '#f87171',
    difficulty: 'Challenging',
    totalLevels: 500,
    requiredHeartsToUnlock: 90,
    musicMood: 'lava',
    icon: 'Flame'
  },
  {
    id: 6,
    name: 'Ancient Ruins',
    subtitle: 'Echoes of forgotten lovers',
    description: 'Overgrown stone obelisks and shifting subterranean labyrinths with deceptive false doors and trapdoors.',
    themeColor: '#d97706',
    skyColorTop: '#451a03',
    skyColorBottom: '#fde68a',
    groundColor: '#713f12',
    accentColor: '#eab308',
    fogColor: '#fef08a',
    difficulty: 'Challenging',
    totalLevels: 500,
    requiredHeartsToUnlock: 125,
    musicMood: 'ruins',
    icon: 'Castle'
  },
  {
    id: 7,
    name: 'Moonlit Castle',
    subtitle: 'Gothic ramparts beneath the giant moon',
    description: 'A romantic fortress high on a misty cliff. Swinging bladed pendulums, hidden spike pits, and shadow-casting moonlight.',
    themeColor: '#8b5cf6',
    skyColorTop: '#2e1065',
    skyColorBottom: '#ddd6fe',
    groundColor: '#3b0764',
    accentColor: '#c084fc',
    fogColor: '#c4b5fd',
    difficulty: 'Hard',
    totalLevels: 500,
    requiredHeartsToUnlock: 165,
    musicMood: 'moon',
    icon: 'Moon'
  },
  {
    id: 8,
    name: 'Crystal Caves',
    subtitle: 'Prismatic subterranean wonder',
    description: 'Towering amethyst and quartz crystals casting rainbow reflections. Rotating light beam puzzles and optical illusion floors.',
    themeColor: '#ec4899',
    skyColorTop: '#500724',
    skyColorBottom: '#fbcfe8',
    groundColor: '#4a044e',
    accentColor: '#f472b6',
    fogColor: '#f9a8d4',
    difficulty: 'Hard',
    totalLevels: 500,
    requiredHeartsToUnlock: 210,
    musicMood: 'crystal',
    icon: 'Sparkles'
  },
  {
    id: 9,
    name: 'Oceanic Kingdom',
    subtitle: 'Sunken coral and tranquil tides',
    description: 'Aquamarine tidal platforms, gentle water surfaces, rising bubble geysers, and synchronized dual-player lever gates.',
    themeColor: '#14b8a6',
    skyColorTop: '#042f2e',
    skyColorBottom: '#ccfbf1',
    groundColor: '#0f766e',
    accentColor: '#2dd4bf',
    fogColor: '#99f6e4',
    difficulty: 'Extreme',
    totalLevels: 500,
    requiredHeartsToUnlock: 260,
    musicMood: 'ocean',
    icon: 'Waves'
  },
  {
    id: 10,
    name: 'Final Heart Kingdom',
    subtitle: 'The eternal sanctuary of love',
    description: 'The ultimate cooperative proving ground. Shifting celestial architecture, relentless surprise traps, and the eternal heart shrine.',
    themeColor: '#e11d48',
    skyColorTop: '#4c0519',
    skyColorBottom: '#ffe4e6',
    groundColor: '#881337',
    accentColor: '#fb7185',
    fogColor: '#fecdd3',
    difficulty: 'Master',
    totalLevels: 500,
    requiredHeartsToUnlock: 320,
    musicMood: 'heart',
    icon: 'HeartHandshake'
  }
];

const DEFAULT_BOY_CUSTOM: CharacterCustomization = {
  outfit: 'adventurer',
  hairStyle: 'short_quiff',
  hairColor: '#3b2518',
  skinTone: '#e0a980',
  eyeColor: '#2563eb',
  clothingPrimaryColor: '#1e3a8a',
  clothingSecondaryColor: '#e2e8f0',
  accessories: {
    glasses: true,
    glassesStyle: 'modern',
    pendant: false,
    backpack: true,
    gloves: true
  }
};

const DEFAULT_GIRL_CUSTOM: CharacterCustomization = {
  outfit: 'explorer',
  hairStyle: 'ponytail',
  hairColor: '#78350f',
  skinTone: '#fcd3b8',
  eyeColor: '#059669',
  clothingPrimaryColor: '#e11d48',
  clothingSecondaryColor: '#fbbf24',
  accessories: {
    glasses: false,
    glassesStyle: 'round',
    pendant: true,
    backpack: false,
    gloves: true
  }
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'high',
  shadows: true,
  particleQuality: 'high',
  cameraSensitivity: 1.0,
  invertY: false,
  masterVolume: 1.0,
  musicVolume: 0.5,
  sfxVolume: 0.85,
  ambientVolume: 0.6,
  keyBindings: {
    p1Up: 'KeyW',
    p1Down: 'KeyS',
    p1Left: 'KeyA',
    p1Right: 'KeyD',
    p1Jump: 'Space',
    p2Up: 'ArrowUp',
    p2Down: 'ArrowDown',
    p2Left: 'ArrowLeft',
    p2Right: 'ArrowRight',
    p2Jump: 'ShiftRight',
    action: 'KeyE',
    reset: 'KeyR',
    pause: 'Escape'
  },
  mobileControls: {
    enabled: true,
    joystickX: 12,
    joystickY: 78,
    jumpBtnX: 88,
    jumpBtnY: 78,
    switchBtnX: 88,
    switchBtnY: 58,
    scale: 1.0,
    opacity: 0.85
  },
  language: 'en'
};

const INITIAL_PROFILE: PlayerProfile = {
  id: 'usr_tq_' + Math.random().toString(36).substring(2, 8),
  username: 'Adventurer',
  email: '',
  isGuest: true,
  boyName: 'Leo',
  girlName: 'Maya',
  activeCharacter: 'boy',
  boyCustomization: DEFAULT_BOY_CUSTOM,
  girlCustomization: DEFAULT_GIRL_CUSTOM,
  level: 1,
  xp: 0,
  heartsCollected: 0,
  gemsCollected: 0,
  unlockedWorlds: 1,
  currentWorldId: 1,
  currentLevelIndex: 1,
  soundEnabled: true,
  musicEnabled: true
};

const INITIAL_FRIENDS: FriendItem[] = [];

class StorageService {
  private profileKey = 'twinquest_profile_v1';
  private progressKey = 'twinquest_progress_v1';
  private settingsKey = 'twinquest_settings_v1';
  private friendsKey = 'twinquest_friends_v1';
  private chatKey = 'twinquest_chat_v1';

  public getProfile(): PlayerProfile {
    try {
      const data = localStorage.getItem(this.profileKey);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...INITIAL_PROFILE,
          ...parsed,
          boyName: parsed.boyName || 'Boyfriend',
          girlName: parsed.girlName || 'Girlfriend'
        };
      }
    } catch {
      // fallback
    }
    return INITIAL_PROFILE;
  }

  public saveProfile(profile: PlayerProfile): void {
    try {
      localStorage.setItem(this.profileKey, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  public getSettings(): GameSettings {
    try {
      const data = localStorage.getItem(this.settingsKey);
      if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  public saveSettings(settings: GameSettings): void {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  public getAllProgress(): Record<string, LevelProgress> {
    try {
      const data = localStorage.getItem(this.progressKey);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    // Default: Level 1 of World 1 unlocked
    return {
      '1_1': {
        worldId: 1,
        levelNumber: 1,
        unlocked: true,
        completed: false,
        stars: 0,
        bestTimeSeconds: null,
        heartsCollected: [false, false, false]
      }
    };
  }

  public getLevelProgress(worldId: number, levelNumber: number): LevelProgress {
    const all = this.getAllProgress();
    const key = `${worldId}_${levelNumber}`;
    if (all[key]) return all[key];

    // Level 1 of any unlocked world is unlocked
    const profile = this.getProfile();
    const isWorldUnlocked = worldId <= profile.unlockedWorlds;
    return {
      worldId,
      levelNumber,
      unlocked: isWorldUnlocked && levelNumber === 1,
      completed: false,
      stars: 0,
      bestTimeSeconds: null,
      heartsCollected: [false, false, false]
    };
  }

  public saveLevelProgress(progress: LevelProgress): void {
    const all = this.getAllProgress();
    const key = `${progress.worldId}_${progress.levelNumber}`;
    all[key] = progress;

    // Automatically unlock next level in this world if completed
    if (progress.completed && progress.levelNumber < 500) {
      const nextKey = `${progress.worldId}_${progress.levelNumber + 1}`;
      if (!all[nextKey]) {
        all[nextKey] = {
          worldId: progress.worldId,
          levelNumber: progress.levelNumber + 1,
          unlocked: true,
          completed: false,
          stars: 0,
          bestTimeSeconds: null,
          heartsCollected: [false, false, false]
        };
      } else {
        all[nextKey].unlocked = true;
      }
    }

    try {
      localStorage.setItem(this.progressKey, JSON.stringify(all));
    } catch {
      // ignore
    }

    // Check world unlocks
    this.checkWorldUnlocks();
  }

  public checkWorldUnlocks(): void {
    const all = this.getAllProgress();
    const profile = this.getProfile();

    let totalHearts = 0;
    Object.values(all).forEach((p) => {
      if (p.heartsCollected) {
        totalHearts += p.heartsCollected.filter(Boolean).length;
      }
    });

    profile.heartsCollected = totalHearts;

    // Check if new worlds unlock
    WORLDS_DATA.forEach((world) => {
      if (totalHearts >= world.requiredHeartsToUnlock && world.id > profile.unlockedWorlds) {
        profile.unlockedWorlds = Math.max(profile.unlockedWorlds, world.id);
      }
    });

    this.saveProfile(profile);
  }

  public getFriends(): FriendItem[] {
    try {
      const data = localStorage.getItem(this.friendsKey);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return INITIAL_FRIENDS;
  }

  public saveFriends(friends: FriendItem[]): void {
    try {
      localStorage.setItem(this.friendsKey, JSON.stringify(friends));
    } catch {
      // ignore
    }
  }

  public getChatMessages(friendId?: string): ChatMessage[] {
    try {
      const data = localStorage.getItem(this.chatKey);
      if (data) {
        const all: ChatMessage[] = JSON.parse(data);
        if (!friendId) return all;
        return all.filter((m) => m.receiverId === friendId || m.senderId === friendId);
      }
    } catch {
      // fallback
    }
    return [];
  }

  public addChatMessage(msg: ChatMessage): void {
    const all = this.getChatMessages();
    all.push(msg);
    try {
      localStorage.setItem(this.chatKey, JSON.stringify(all));
    } catch {
      // ignore
    }
  }
}

export const storage = new StorageService();
