export type CharacterGender = 'boy' | 'girl';

export interface CharacterCustomization {
  outfit: string; // 'adventurer' | 'casual' | 'cyber' | 'royal' | 'explorer'
  hairStyle: string; // 'short_quiff' | 'long_waves' | 'ponytail' | 'curly' | 'braids'
  hairColor: string; // hex
  skinTone: string; // hex
  eyeColor: string; // hex
  clothingPrimaryColor: string; // hex
  clothingSecondaryColor: string; // hex
  accessories: {
    glasses: boolean;
    glassesStyle?: 'round' | 'modern' | 'aviator';
    pendant: boolean;
    backpack: boolean;
    gloves: boolean;
  };
}

export interface PlayerProfile {
  id: string;
  username: string;
  email?: string;
  isGuest: boolean;
  boyName: string;
  girlName: string;
  activeCharacter: CharacterGender;
  boyCustomization: CharacterCustomization;
  girlCustomization: CharacterCustomization;
  level: number;
  xp: number;
  heartsCollected: number;
  gemsCollected: number;
  unlockedWorlds: number; // 1 to 10
  currentWorldId: number;
  currentLevelIndex: number;
  isEmailVerified: boolean;
  verifiedEmail?: string;
  sessionToken?: string;
  soundEnabled: boolean;
  musicEnabled: boolean;
  voiceChatEnabled: boolean;
  micMuted: boolean;
}

export interface WorldData {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  themeColor: string;
  skyColorTop: string;
  skyColorBottom: string;
  groundColor: string;
  accentColor: string;
  fogColor: string;
  difficulty: 'Easy' | 'Medium' | 'Challenging' | 'Hard' | 'Extreme' | 'Master';
  totalLevels: number; // 500
  requiredHeartsToUnlock: number;
  musicMood: 'sunset' | 'forest' | 'sky' | 'ice' | 'lava' | 'ruins' | 'moon' | 'crystal' | 'ocean' | 'heart';
  icon: string;
}

export interface LevelProgress {
  worldId: number;
  levelNumber: number; // 1 to 500
  unlocked: boolean;
  completed: boolean;
  stars: number; // 0 to 3
  bestTimeSeconds: number | null;
  heartsCollected: boolean[]; // length 3
}

export interface TrapConfig {
  id: string;
  type: 'collapsing_floor' | 'hidden_spikes' | 'fake_platform' | 'falling_boulder' | 'swinging_blade' | 'pressure_plate' | 'timed_door' | 'false_goal' | 'moving_platform' | 'disappearing_block';
  position: [number, number, number];
  size?: [number, number, number];
  delay?: number;
  speed?: number;
  range?: number;
  axis?: 'x' | 'y' | 'z';
  linkedId?: string; // e.g. pressure plate linked to door
  activated?: boolean;
}

export interface PlatformConfig {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  isMoving?: boolean;
  moveRange?: [number, number, number];
  moveSpeed?: number;
  isBounce?: boolean;
  isIce?: boolean;
}

export interface CollectibleConfig {
  id: string;
  type: 'heart' | 'gem';
  position: [number, number, number];
  collected: boolean;
}

export interface CheckpointConfig {
  id: string;
  position: [number, number, number];
  activated: boolean;
}

export interface LevelDefinition {
  worldId: number;
  levelNumber: number;
  name: string;
  spawnPoint1: [number, number, number]; // Boy spawn
  spawnPoint2: [number, number, number]; // Girl spawn
  goalPosition: [number, number, number];
  platforms: PlatformConfig[];
  traps: TrapConfig[];
  collectibles: CollectibleConfig[];
  checkpoints: CheckpointConfig[];
  parTimeSeconds: number;
  coopRequired: boolean;
}

export interface FriendItem {
  id: string;
  username: string;
  avatar: string;
  status: 'online' | 'offline' | 'in_game';
  character: CharacterGender;
  currentRoomId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  roomId?: string;
  text: string;
  timestamp: string;
  isEncrypted: boolean;
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  name: string;
  hostId: string;
  worldId: number;
  levelNumber: number;
  player1: {
    id: string;
    username: string;
    character: CharacterGender;
    ready: boolean;
  } | null;
  player2: {
    id: string;
    username: string;
    character: CharacterGender;
    ready: boolean;
  } | null;
  status: 'waiting' | 'in_game' | 'finished';
}

export interface GameSettings {
  graphicsQuality: 'low' | 'medium' | 'high';
  shadows: boolean;
  particleQuality: 'low' | 'high';
  cameraSensitivity: number; // 0.5 to 2.0
  invertY: boolean;
  masterVolume: number; // 0 to 1
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  ambientVolume: number; // 0 to 1
  voiceChatEnabled: boolean;
  micMuted: boolean;
  micSensitivity: number; // 0 to 1
  voiceVolume: number; // 0 to 1
  keyBindings: {
    p1Up: string;
    p1Down: string;
    p1Left: string;
    p1Right: string;
    p1Jump: string;
    p2Up: string;
    p2Down: string;
    p2Left: string;
    p2Right: string;
    p2Jump: string;
    toggleMic: string;
    action: string;
    reset: string;
    pause: string;
  };
  mobileControls: {
    enabled: boolean;
    joystickX: number; // % from left
    joystickY: number; // % from top
    jumpBtnX: number; // % from left
    jumpBtnY: number; // % from top
    switchBtnX: number;
    switchBtnY: number;
    scale: number;
    opacity: number;
  };
  language: string;
}
