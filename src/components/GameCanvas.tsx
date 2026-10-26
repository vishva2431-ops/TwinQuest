import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  RotateCcw,
  Heart,
  Users,
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  ChevronRight,
  Mic,
  MicOff,
  Radio,
  Wifi,
  WifiOff,
  User,
  ShieldCheck
} from 'lucide-react';
import { createTwinQuestScene, buildStaticPlatforms } from '../game/threeScene';
import { createCharacterRig, CharacterRig } from '../game/characterModel';
import { TrapManager } from '../game/trapSystem';
import { GameController, InputState } from '../game/gameController';
import { generateLevel } from '../services/levelGenerator';
import { storage, WORLDS_DATA } from '../services/storage';
import { sound } from '../services/sound';
import { voiceChat, VoiceChatState } from '../services/voiceChat';
import { multiplayer } from '../services/multiplayer';
import { CharacterGender, GameSettings, LevelProgress, WorldData, PlayerNetState, RoomState } from '../types/game';

interface GameCanvasProps {
  worldId: number;
  levelNumber: number;
  gameMode?: 'single_player' | 'online_room' | 'local_coop';
  friendId?: string;
  friendName?: string;
  onExitToMenu: () => void;
  onNextLevel: (worldId: number, nextLevelNumber: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldId,
  levelNumber,
  gameMode = 'single_player',
  friendId,
  friendName,
  onExitToMenu,
  onNextLevel
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const boyRigRef = useRef<CharacterRig | null>(null);
  const girlRigRef = useRef<CharacterRig | null>(null);

  const isSinglePlayer = gameMode === 'single_player';
  const isOnlineRoom = gameMode === 'online_room';

  const [isPaused, setIsPaused] = useState(false);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [levelTimer, setLevelTimer] = useState(0);
  const [controlMode, setControlMode] = useState<'single_switch' | 'local_coop'>(
    isSinglePlayer ? 'single_switch' : 'local_coop'
  );

  const profile = storage.getProfile();
  const activeGender: CharacterGender = profile.activeCharacter || 'boy';
  const [activePlayer, setActivePlayer] = useState<CharacterGender>(activeGender);

  const [collectedHearts, setCollectedHearts] = useState<boolean[]>([false, false, false]);
  const [partnerDistance, setPartnerDistance] = useState<number>(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceChatState>(voiceChat.getState());
  const [micToast, setMicToast] = useState<string | null>(null);

  // Multi-Touch Mobile Controls Refs (Resolves simultaneous movement + jump bug)
  const joystickOffsetRef = useRef({ x: 0, y: 0 });
  const joystickActiveRef = useRef(false);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const jumpPressedRef = useRef(false);
  const [joystickUIOffset, setJoystickUIOffset] = useState({ x: 0, y: 0 });
  const [joystickUIActive, setJoystickUIActive] = useState(false);

  // Online Multiplayer Remote Smoothing State
  const remoteTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const remoteTargetRotRef = useRef<number>(0);
  const lastNetSendTimeRef = useRef<number>(0);

  // Performance & Victory Flags (Prevents confetti & save flood on victory)
  const isVictoryRef = useRef(false);
  const lastHudUpdateRef = useRef<number>(0);

  const handleToggleMic = async () => {
    sound.playButtonClick();
    const isNowOn = await voiceChat.toggleMic();
    setMicToast(isNowOn ? 'Microphone is ON (Teammates can hear you)' : 'Microphone is OFF (Muted)');
    setTimeout(() => setMicToast(null), 2500);
  };

  useEffect(() => {
    const unsubVoice = voiceChat.subscribe((v) => setVoiceState(v));
    return unsubVoice;
  }, []);

  // Subscribe to partner disconnects in online room
  useEffect(() => {
    if (!isOnlineRoom) return;
    const unsubRoom = multiplayer.subscribe((room: RoomState | null) => {
      if (!room || (room.player2 === null && !multiplayer.isCurrentHost())) {
        setPartnerDisconnected(true);
      } else if (room.player2 === null && multiplayer.isCurrentHost()) {
        setPartnerDisconnected(true);
      } else {
        setPartnerDisconnected(false);
      }
    });
    return unsubRoom;
  }, [isOnlineRoom]);

  // Subscribe to remote player state
  useEffect(() => {
    if (!isOnlineRoom) return;
    const unsubRemote = multiplayer.subscribePlayerState((netState: PlayerNetState) => {
      if (netState.playerId !== profile.id) {
        remoteTargetPosRef.current = new THREE.Vector3(...netState.position);
        remoteTargetRotRef.current = netState.rotationY;
      }
    });
    return unsubRemote;
  }, [isOnlineRoom, profile.id]);

  const world: WorldData = WORLDS_DATA.find((w) => w.id === worldId) || WORLDS_DATA[0];
  const settings = storage.getSettings();

  useEffect(() => {
    if (!mountRef.current) return;
    isVictoryRef.current = false;
    setIsVictory(false);

    // 1. Initialize Scene & Three.js Environment
    const sceneContext = createTwinQuestScene(mountRef.current, world);
    const { scene, camera, renderer, goalPortal, loveTetherMesh, loveTetherMaterial, particles } = sceneContext;

    // 2. Generate Target Level
    const levelDef = generateLevel(worldId, levelNumber);

    // 3. Build Static Platforms
    buildStaticPlatforms(scene, levelDef.platforms, world.groundColor, []);

    // 4. Initialize Trap Manager & Build Traps / Collectibles
    const trapManager = new TrapManager(scene);
    trapManager.buildLevelObjects(
      levelDef.platforms,
      levelDef.traps,
      levelDef.collectibles,
      levelDef.checkpoints,
      world.groundColor,
      world.accentColor
    );

    // 5. Position Goal Portal
    goalPortal.position.set(levelDef.goalPosition[0], levelDef.goalPosition[1], levelDef.goalPosition[2]);

    // 6. Build Character Rigs
    // Requirement 2: Single-player mode spawns ONLY the character selected on the login page!
    // Requirement 3: Multiplayer mode honors each player's individual character selection!
    const room = multiplayer.getActiveRoom();
    const isHost = multiplayer.isCurrentHost();

    let boyRig: CharacterRig;
    let girlRig: CharacterRig;

    if (isSinglePlayer) {
      // Single-Player: instantiate rigs, but ONLY add the selected character to the scene
      boyRig = createCharacterRig('boy', profile.boyCustomization);
      girlRig = createCharacterRig('girl', profile.girlCustomization);

      if (activeGender === 'boy') {
        scene.add(boyRig.group);
        // Girl rig is NOT added to the scene in single player mode
      } else {
        scene.add(girlRig.group);
        // Boy rig is NOT added to the scene in single player mode
      }

      // Hide love tether in single-player
      loveTetherMesh.visible = false;
    } else {
      // 2-Player Co-op / Online Room: both rigs present
      boyRig = createCharacterRig('boy', profile.boyCustomization);
      girlRig = createCharacterRig('girl', profile.girlCustomization);
      scene.add(boyRig.group);
      scene.add(girlRig.group);
      loveTetherMesh.visible = true;
    }

    boyRigRef.current = boyRig;
    girlRigRef.current = girlRig;

    // 7. Initialize Game Controller
    const controller = new GameController(boyRig, girlRig, trapManager, levelDef, settings);
    controller.isSinglePlayer = isSinglePlayer;
    controller.singlePlayerCharacter = activeGender;
    controller.activeControlMode = isSinglePlayer ? 'single_switch' : isOnlineRoom ? 'online_room' : controlMode;
    controller.singleActivePlayer = activeGender;
    controllerRef.current = controller;

    // Start Ambient Music for World Mood
    sound.startMusic(world.musicMood);

    // Keyboard Input Tracking
    const keysDown = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);

      // 'R' resets to checkpoint
      if (e.code === 'KeyR') {
        controller.resetToCheckpoint();
      }

      // 'M' toggles microphone
      if (e.code === 'KeyM') {
        handleToggleMic();
      }

      // 'Escape' toggles pause
      if (e.code === 'Escape') {
        setIsPaused((p) => {
          controller.isPaused = !p;
          return !p;
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Animation & Game Loop
    let animId: number;
    const clock = new THREE.Clock();

    const tick = () => {
      animId = requestAnimationFrame(tick);
      const delta = clock.getDelta();

      // Read Input from multi-touch refs (Never stale in closure!)
      const jActive = joystickActiveRef.current;
      const jOff = joystickOffsetRef.current;
      const isJump = keysDown.has(settings.keyBindings.p1Jump) || jumpPressedRef.current;

      const input: InputState = {
        p1Forward: keysDown.has(settings.keyBindings.p1Up) || (jActive && jOff.y < -10),
        p1Backward: keysDown.has(settings.keyBindings.p1Down) || (jActive && jOff.y > 10),
        p1Left: keysDown.has(settings.keyBindings.p1Left) || (jActive && jOff.x < -10),
        p1Right: keysDown.has(settings.keyBindings.p1Right) || (jActive && jOff.x > 10),
        p1Jump: isJump,
        p2Forward: keysDown.has(settings.keyBindings.p2Up),
        p2Backward: keysDown.has(settings.keyBindings.p2Down),
        p2Left: keysDown.has(settings.keyBindings.p2Left),
        p2Right: keysDown.has(settings.keyBindings.p2Right),
        p2Jump: keysDown.has(settings.keyBindings.p2Jump)
      };

      // Remote player position smoothing in online mode
      if (isOnlineRoom && remoteTargetPosRef.current) {
        const isLocalBoy = activeGender === 'boy';
        const remoteRig = isLocalBoy ? girlRig : boyRig;
        const remoteState = isLocalBoy ? controller.girlState : controller.boyState;

        remoteState.position.x = THREE.MathUtils.damp(remoteState.position.x, remoteTargetPosRef.current.x, 18, delta);
        remoteState.position.y = THREE.MathUtils.damp(remoteState.position.y, remoteTargetPosRef.current.y, 18, delta);
        remoteState.position.z = THREE.MathUtils.damp(remoteState.position.z, remoteTargetPosRef.current.z, 18, delta);
        remoteRig.group.position.copy(remoteState.position);
        remoteRig.group.rotation.y = THREE.MathUtils.damp(remoteRig.group.rotation.y, remoteTargetRotRef.current, 14, delta);
      }

      // Controller Update
      const result = controller.update(delta, input, camera);

      // Throttled Network State Broadcast in Online Multiplayer (~18 Hz)
      if (isOnlineRoom) {
        const now = performance.now();
        if (now - lastNetSendTimeRef.current > 55) {
          lastNetSendTimeRef.current = now;
          const isLocalBoy = activeGender === 'boy';
          const localState = isLocalBoy ? controller.boyState : controller.girlState;
          const localRig = isLocalBoy ? boyRig : girlRig;

          multiplayer.broadcastPlayerState({
            playerId: profile.id,
            character: activeGender,
            position: [localState.position.x, localState.position.y, localState.position.z],
            velocity: [localState.velocity.x, localState.velocity.y, localState.velocity.z],
            rotationY: localRig.group.rotation.y,
            isGrounded: localState.isGrounded,
            animState: localState.velocity.lengthSq() > 0.1 ? 'run' : 'idle',
            timestamp: Date.now()
          });
        }
      }

      // Victory Processing (Once only per stage completion)
      if (result.victory && !isVictoryRef.current) {
        isVictoryRef.current = true;
        setIsVictory(true);

        // Single clean confetti burst (not repeated every frame)
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Save Standard Progress
        const heartsFound = trapManager.collectibles
          .filter((c) => c.config.type === 'heart')
          .map((c) => c.config.collected);

        const stars = Math.min(
          3,
          1 +
            (heartsFound.filter(Boolean).length >= 2 ? 1 : 0) +
            (controller.levelTimer <= levelDef.parTimeSeconds ? 1 : 0)
        );

        const progress: LevelProgress = {
          worldId,
          levelNumber,
          unlocked: true,
          completed: true,
          stars,
          bestTimeSeconds: Math.round(controller.levelTimer * 10) / 10,
          heartsCollected: [heartsFound[0] || false, heartsFound[1] || false, heartsFound[2] || false]
        };
        storage.saveLevelProgress(progress);

        // Requirement 4: Save Level Progress Separately for Each Friend
        if (friendId || (isOnlineRoom && room)) {
          const effectiveFriendId = friendId || (isHost ? room?.player2?.id : room?.player1?.id);
          const effectiveFriendName = friendName || (isHost ? room?.player2?.username : room?.player1?.username);

          if (effectiveFriendId) {
            storage.saveFriendProgress({
              friendId: effectiveFriendId,
              friendName: effectiveFriendName,
              worldId,
              levelNumber,
              unlockedLevel: Math.min(500, levelNumber + 1),
              lastPlayedAt: new Date().toISOString()
            });
          }
        }
      }

      // Positions
      const p1 = controller.boyState.position;
      const p2 = controller.girlState.position;

      // Throttle React HUD state updates (~8 Hz) to eliminate 60 FPS React re-render lag
      const nowHud = performance.now();
      if (nowHud - lastHudUpdateRef.current > 125) {
        lastHudUpdateRef.current = nowHud;
        setLevelTimer(controller.levelTimer);

        const heartsFound = trapManager.collectibles
          .filter((c) => c.config.type === 'heart')
          .map((c) => c.config.collected);
        setCollectedHearts([heartsFound[0] || false, heartsFound[1] || false, heartsFound[2] || false]);

        if (!isSinglePlayer) {
          const dist = p1.distanceTo(p2);
          setPartnerDistance(Math.round(dist * 10) / 10);
        }
      }

      if (!isSinglePlayer) {
        const dist = p1.distanceTo(p2);
        const tetherPoints = [
          p1.clone().add(new THREE.Vector3(0, 0.9, 0)),
          p2.clone().add(new THREE.Vector3(0, 0.9, 0))
        ];
        loveTetherMesh.geometry.setFromPoints(tetherPoints);
        loveTetherMaterial.opacity = Math.max(0.1, 0.7 - dist * 0.04);
      }

      // Animate Sacred Goal Portal
      goalPortal.rotation.y += delta * 1.2;

      // Atmospheric Particles
      particles.rotation.y += delta * 0.05;

      // Smooth Camera Follow Focus
      const targetFocus = new THREE.Vector3();
      if (isSinglePlayer) {
        // Camera follows only the selected character
        targetFocus.copy(activeGender === 'boy' ? p1 : p2);
      } else if (isOnlineRoom) {
        // Online: camera tracks the local player
        targetFocus.copy(activeGender === 'boy' ? p1 : p2);
      } else {
        // Local co-op: camera focuses on midpoint
        targetFocus.addVectors(p1, p2).multiplyScalar(0.5);
      }

      const cameraOffset = new THREE.Vector3(
        0,
        6 + (isSinglePlayer ? 0 : Math.min(partnerDistance * 0.25, 4)),
        9 + (isSinglePlayer ? 0 : Math.min(partnerDistance * 0.35, 6))
      );
      const targetCamPos = targetFocus.clone().add(cameraOffset);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 6, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 6, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 6, delta);
      camera.lookAt(targetFocus.x, targetFocus.y + 1.2, targetFocus.z);

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      sound.stopMusic();
      trapManager.clear();
      sceneContext.dispose();
    };
  }, [worldId, levelNumber, gameMode, activeGender]);

  // Multi-Touch Movement Handlers (Touch-Identifier Aware)
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;
    joystickCenterRef.current = { x: touch.clientX, y: touch.clientY };
    joystickActiveRef.current = true;
    joystickOffsetRef.current = { x: 0, y: 0 };
    setJoystickUIActive(true);
    setJoystickUIOffset({ x: 0, y: 0 });
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!joystickActiveRef.current || !joystickCenterRef.current) return;

    let targetTouch: React.Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickTouchIdRef.current) {
        targetTouch = e.touches[i];
        break;
      }
    }
    if (!targetTouch) return;

    const dx = targetTouch.clientX - joystickCenterRef.current.x;
    const dy = targetTouch.clientY - joystickCenterRef.current.y;
    const maxR = 38;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const newOffset = dist > maxR ? { x: (dx / dist) * maxR, y: (dy / dist) * maxR } : { x: dx, y: dy };

    joystickOffsetRef.current = newOffset;
    setJoystickUIOffset(newOffset);
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        joystickActiveRef.current = false;
        joystickOffsetRef.current = { x: 0, y: 0 };
        setJoystickUIActive(false);
        setJoystickUIOffset({ x: 0, y: 0 });
        break;
      }
    }
  };

  const triggerMobileJump = () => {
    if (controllerRef.current) {
      if (isSinglePlayer) {
        if (activeGender === 'boy') {
          controllerRef.current.boyState.jumpBufferTimer = 0.16;
        } else {
          controllerRef.current.girlState.jumpBufferTimer = 0.16;
        }
      } else {
        controllerRef.current.boyState.jumpBufferTimer = 0.16;
        controllerRef.current.girlState.jumpBufferTimer = 0.16;
      }
    }
  };

  const toggleSound = () => {
    setSoundMuted((prev) => {
      const next = !prev;
      if (next) {
        sound.setVolumes(0, 0, 0);
      } else {
        sound.setVolumes(settings.masterVolume, settings.musicVolume, settings.sfxVolume);
      }
      return next;
    });
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden select-none font-sans touch-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="absolute inset-0 z-0 touch-none" />

      {/* Top HUD Header */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex items-center justify-between pointer-events-none gap-1.5 sm:gap-3">
        {/* Left: Back & Level Title */}
        <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto">
          <button
            onClick={() => {
              sound.playButtonClick();
              onExitToMenu();
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-lg backdrop-blur-md transition-all active:scale-95 text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Map</span>
          </button>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-lg backdrop-blur-md">
            <div className="text-[9px] sm:text-[10px] tracking-wider font-semibold text-rose-400 uppercase flex items-center gap-1 sm:gap-1.5">
              <span>{world.name}</span>
              {isSinglePlayer && (
                <span className="hidden md:inline-flex px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30 items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Offline</span>
                </span>
              )}
              {isOnlineRoom && (
                <span className="hidden md:inline-flex px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-bold border border-blue-500/30 items-center gap-1">
                  <Wifi className="w-2.5 h-2.5 text-blue-400" />
                  <span>Online</span>
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2">
              <span>Lvl {levelNumber}</span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {Math.floor(levelTimer / 60)}:{(levelTimer % 60).toFixed(1).padStart(4, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Romantic Hearts Collected */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 border border-rose-900/50 rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-lg backdrop-blur-md pointer-events-auto">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`transition-all duration-300 transform ${
                collectedHearts[idx] ? 'scale-110 text-rose-500 fill-rose-500' : 'scale-95 text-slate-600'
              }`}
            >
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  collectedHearts[idx] ? 'fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : ''
                }`}
              />
            </div>
          ))}
          <span className="text-[11px] sm:text-xs font-semibold text-rose-200 ml-0.5 sm:ml-1">
            {collectedHearts.filter(Boolean).length}/3
          </span>
        </div>

        {/* Right: Partner Distance, Sound & Pause */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
          {/* Active Character Badge in Single Player */}
          {isSinglePlayer && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 border border-emerald-500/40 rounded-xl px-3 py-2 shadow-lg backdrop-blur-md text-xs font-medium text-emerald-300">
              <span>{activeGender === 'boy' ? '👦' : '👧'}</span>
              <span>{activeGender === 'boy' ? (profile.boyName || 'Boyfriend') : (profile.girlName || 'Girlfriend')} (Offline)</span>
            </div>
          )}

          {/* Partner Bond Indicator in Co-Op */}
          {!isSinglePlayer && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 shadow-lg backdrop-blur-md text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Bond: {partnerDistance < 4 ? 'Harmonized ❤️' : `${partnerDistance}m`}</span>
            </div>
          )}

          {/* User Voice Mic Toggle Button (Only in online/co-op mode) */}
          {!isSinglePlayer && (
            <button
              onClick={handleToggleMic}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 ${
                voiceState.isMicOn
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-700/60'
              }`}
              title={voiceState.isMicOn ? 'Microphone LIVE (Press M to Mute)' : 'Microphone MUTED (Press M to Speak)'}
            >
              {voiceState.isMicOn ? (
                <Mic className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${voiceState.isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'}`} />
              ) : (
                <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              )}
              <span className="hidden md:inline text-xs font-bold">
                {voiceState.isMicOn ? (voiceState.isSpeaking ? 'Live...' : 'Mic ON') : 'Mic OFF'}
              </span>
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Toggle Sound"
          >
            {soundMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              if (controllerRef.current) {
                controllerRef.current.resetToCheckpoint();
              }
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Restart Checkpoint (R)"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setIsPaused((p) => {
                if (controllerRef.current) {
                  controllerRef.current.isPaused = !p;
                }
                return !p;
              });
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Pause (Esc)"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Touch Controls for Mobile / Tablet */}
      {showMobileControls && (
        <>
          {/* Virtual Joystick (Bottom Left) */}
          <div
            className="absolute z-30 touch-none pointer-events-auto select-none"
            style={{
              left: `${settings.mobileControls.joystickX}%`,
              top: `${settings.mobileControls.joystickY}%`,
              transform: 'translate(-50%, -50%)',
              opacity: settings.mobileControls.opacity
            }}
            onTouchStart={handleJoystickTouchStart}
            onTouchMove={handleJoystickTouchMove}
            onTouchEnd={handleJoystickTouchEnd}
            onTouchCancel={handleJoystickTouchEnd}
          >
            <div className="relative w-28 h-28 rounded-full bg-slate-900/70 border-2 border-slate-600/80 backdrop-blur-md flex items-center justify-center shadow-2xl">
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 shadow-lg border-2 border-rose-300"
                style={{
                  transform: `translate(${joystickUIOffset.x}px, ${joystickUIOffset.y}px)`,
                  transition: joystickUIActive ? 'none' : 'transform 0.12s ease-out'
                }}
              />
            </div>
          </div>

          {/* Jump Button (Bottom Right) */}
          <div
            className="absolute z-30 touch-none pointer-events-auto select-none"
            style={{
              left: `${settings.mobileControls.jumpBtnX}%`,
              top: `${settings.mobileControls.jumpBtnY}%`,
              transform: 'translate(-50%, -50%)',
              opacity: settings.mobileControls.opacity
            }}
          >
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                jumpPressedRef.current = true;
                triggerMobileJump();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                jumpPressedRef.current = false;
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                jumpPressedRef.current = false;
              }}
              onMouseDown={() => {
                jumpPressedRef.current = true;
                triggerMobileJump();
              }}
              onMouseUp={() => {
                jumpPressedRef.current = false;
              }}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white font-extrabold text-sm shadow-2xl border-2 border-rose-300 flex items-center justify-center active:scale-90 transition-transform select-none"
            >
              JUMP
            </button>
          </div>

          {/* Quick Mic On/Off Touch Button for Mobile */}
          <div
            className="absolute z-30 touch-none pointer-events-auto select-none"
            style={{
              left: `${settings.mobileControls.switchBtnX}%`,
              top: `${Math.max(12, settings.mobileControls.switchBtnY - 20)}%`,
              transform: 'translate(-50%, -50%)',
              opacity: settings.mobileControls.opacity
            }}
          >
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                handleToggleMic();
              }}
              onClick={handleToggleMic}
              className={`w-12 h-12 rounded-full border shadow-xl flex items-center justify-center active:scale-90 transition-transform ${
                voiceState.isMicOn
                  ? 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-500/30'
                  : 'bg-slate-900/80 border-slate-600 text-slate-400'
              }`}
              title={voiceState.isMicOn ? 'Mic ON (Tap to Mute)' : 'Mic OFF (Tap to Unmute)'}
            >
              {voiceState.isMicOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5" />}
            </button>
          </div>
        </>
      )}

      {/* Mic Status Toast Notification */}
      {micToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-emerald-500/50 rounded-2xl px-5 py-2.5 shadow-2xl backdrop-blur-lg flex items-center gap-2.5 text-xs font-bold text-emerald-300 animate-bounce pointer-events-none">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{micToast}</span>
        </div>
      )}

      {/* Partner Disconnected Overlay */}
      {partnerDisconnected && !isVictory && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Partner Disconnected</h3>
            <p className="text-xs text-slate-400 mb-5">
              Your partner left the session. Progress up to this stage has been preserved!
            </p>
            <button
              onClick={() => {
                sound.playButtonClick();
                onExitToMenu();
              }}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              Return to Menu
            </button>
          </div>
        </div>
      )}

      {/* Victory Celebration Modal */}
      {isVictory && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 font-serif">
              STAGE CLEAR!
            </h2>
            <p className="text-xs text-rose-200 mt-1 mb-4">
              {isSinglePlayer
                ? `${activeGender === 'boy' ? (profile.boyName || 'Boyfriend') : (profile.girlName || 'Girlfriend')} conquered the trial solo!`
                : `${profile.boyName || 'Boyfriend'} & ${profile.girlName || 'Girlfriend'} conquered the trial together!`}
            </p>

            {/* Friend Progression Saved Notification */}
            {(friendId || friendName) && (
              <div className="mb-4 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-800/40 text-[11px] text-indigo-300 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Progress saved separately for friend {friendName || friendId}!</span>
              </div>
            )}

            {/* Stars Rating */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2].map((idx) => {
                const filled =
                  idx === 0 ||
                  (idx === 1 && collectedHearts.filter(Boolean).length >= 2) ||
                  (idx === 2 && levelTimer <= 35);
                return (
                  <div
                    key={idx}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                      filled
                        ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-lg shadow-amber-500/20 scale-110'
                        : 'bg-slate-800/50 border-slate-700 text-slate-600'
                    }`}
                  >
                    ★
                  </div>
                );
              })}
            </div>

            {/* Time & Hearts Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-800/40 rounded-2xl p-3 border border-slate-700/50 text-left">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Clear Time</div>
                <div className="text-lg font-bold text-white font-mono">{levelTimer.toFixed(1)}s</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Hearts Saved</div>
                <div className="text-lg font-bold text-rose-400 flex items-center gap-1">
                  <Heart className="w-4 h-4 fill-rose-400" />
                  <span>{collectedHearts.filter(Boolean).length} / 3</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  sound.playButtonClick();
                  onExitToMenu();
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all active:scale-95 border border-slate-700"
              >
                Level Select
              </button>

              <button
                onClick={() => {
                  sound.playButtonClick();
                  isVictoryRef.current = false;
                  setIsVictory(false);
                  onNextLevel(worldId, Math.min(500, levelNumber + 1));
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-sm shadow-lg shadow-rose-500/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Next Stage</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu Modal */}
      {isPaused && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">GAME PAUSED</h3>
            <p className="text-xs text-slate-400 mb-6">Take a breath, your adventure awaits!</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setIsPaused(false);
                  if (controllerRef.current) controllerRef.current.isPaused = false;
                }}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all"
              >
                Resume Quest
              </button>

              <button
                onClick={() => {
                  sound.playButtonClick();
                  setIsPaused(false);
                  if (controllerRef.current) {
                    controllerRef.current.isPaused = false;
                    controllerRef.current.resetToCheckpoint();
                  }
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all"
              >
                Restart Level
              </button>

              <button
                onClick={() => {
                  sound.playButtonClick();
                  setIsPaused(false);
                  onExitToMenu();
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all"
              >
                Quit to Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
