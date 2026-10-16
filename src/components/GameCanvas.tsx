import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { Play, Pause, RotateCcw, Heart, Users, Sparkles, ArrowLeft, Volume2, VolumeX, ShieldAlert, CheckCircle2, ChevronRight, Smartphone, Mic, MicOff, Radio } from 'lucide-react';
import { createTwinQuestScene, buildStaticPlatforms } from '../game/threeScene';
import { createCharacterRig, CharacterRig } from '../game/characterModel';
import { TrapManager } from '../game/trapSystem';
import { GameController, InputState } from '../game/gameController';
import { generateLevel } from '../services/levelGenerator';
import { storage, WORLDS_DATA } from '../services/storage';
import { sound } from '../services/sound';
import { voiceChat, VoiceChatState } from '../services/voiceChat';
import { CharacterGender, GameSettings, LevelProgress, WorldData } from '../types/game';

interface GameCanvasProps {
  worldId: number;
  levelNumber: number;
  onExitToMenu: () => void;
  onNextLevel: (worldId: number, nextLevelNumber: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldId,
  levelNumber,
  onExitToMenu,
  onNextLevel
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GameController | null>(null);
  const boyRigRef = useRef<CharacterRig | null>(null);
  const girlRigRef = useRef<CharacterRig | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [levelTimer, setLevelTimer] = useState(0);
  const [controlMode, setControlMode] = useState<'single_switch' | 'local_coop'>('single_switch');
  const [activePlayer, setActivePlayer] = useState<CharacterGender>('boy');
  const [collectedHearts, setCollectedHearts] = useState<boolean[]>([false, false, false]);
  const [partnerDistance, setPartnerDistance] = useState<number>(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceChatState>(voiceChat.getState());
  const [micToast, setMicToast] = useState<string | null>(null);

  const handleToggleMic = () => {
    sound.playButtonClick();
    voiceChat.toggleMic();
    const willBeOn = !voiceState.isMicOn;
    setMicToast(willBeOn ? 'Microphone is ON (Teammates can hear you)' : 'Microphone is OFF (Muted)');
    setTimeout(() => setMicToast(null), 2500);
  };

  useEffect(() => {
    const unsubVoice = voiceChat.subscribe((v) => setVoiceState(v));
    return unsubVoice;
  }, []);

  // Mobile virtual joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 });
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);

  const world: WorldData = WORLDS_DATA.find((w) => w.id === worldId) || WORLDS_DATA[0];
  const settings = storage.getSettings();
  const profile = storage.getProfile();

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Initialize Scene & Three.js Environment
    const sceneContext = createTwinQuestScene(mountRef.current, world);
    const { scene, camera, renderer, goalPortal, loveTetherMesh, loveTetherMaterial, particles } = sceneContext;

    // 2. Generate Target Level
    const levelDef = generateLevel(worldId, levelNumber);

    // 3. Build Static Platforms
    let staticMeshes = buildStaticPlatforms(scene, levelDef.platforms, world.groundColor, []);

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

    // 6. Build Character Rigs (Boyfriend Leo & Girlfriend Maya)
    const boyRig = createCharacterRig('boy', profile.boyCustomization);
    const girlRig = createCharacterRig('girl', profile.girlCustomization);
    scene.add(boyRig.group);
    scene.add(girlRig.group);
    boyRigRef.current = boyRig;
    girlRigRef.current = girlRig;

    // 7. Initialize Game Controller
    const controller = new GameController(boyRig, girlRig, trapManager, levelDef, settings);
    controller.activeControlMode = controlMode;
    controller.singleActivePlayer = activePlayer;
    controllerRef.current = controller;

    // Start Ambient Music for World Mood
    sound.startMusic(world.musicMood);

    // Input Tracking
    const keysDown = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.code);

      // Tab switches active character in single-player
      if (e.code === 'Tab') {
        e.preventDefault();
        const next: CharacterGender = controller.singleActivePlayer === 'boy' ? 'girl' : 'boy';
        controller.singleActivePlayer = next;
        setActivePlayer(next);
        sound.playButtonClick();
      }

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
    let lastTime = performance.now();
    let animId: number;

    const clock = new THREE.Clock();

    const tick = () => {
      animId = requestAnimationFrame(tick);

      const currentTime = performance.now();
      const delta = clock.getDelta();

      // Read Input
      const input: InputState = {
        p1Forward: keysDown.has(settings.keyBindings.p1Up) || (joystickActive && joystickOffset.y < -15),
        p1Backward: keysDown.has(settings.keyBindings.p1Down) || (joystickActive && joystickOffset.y > 15),
        p1Left: keysDown.has(settings.keyBindings.p1Left) || (joystickActive && joystickOffset.x < -15),
        p1Right: keysDown.has(settings.keyBindings.p1Right) || (joystickActive && joystickOffset.x > 15),
        p1Jump: keysDown.has(settings.keyBindings.p1Jump),
        p2Forward: keysDown.has(settings.keyBindings.p2Up),
        p2Backward: keysDown.has(settings.keyBindings.p2Down),
        p2Left: keysDown.has(settings.keyBindings.p2Left),
        p2Right: keysDown.has(settings.keyBindings.p2Right),
        p2Jump: keysDown.has(settings.keyBindings.p2Jump)
      };

      // Controller Update
      const result = controller.update(delta, input, camera);

      if (result.victory && !isVictory) {
        setIsVictory(true);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });

        // Save Completed Progress
        const heartsFound = trapManager.collectibles
          .filter((c) => c.config.type === 'heart')
          .map((c) => c.config.collected);

        const stars = Math.min(3, 1 + (heartsFound.filter(Boolean).length >= 2 ? 1 : 0) + (controller.levelTimer <= levelDef.parTimeSeconds ? 1 : 0));

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
      }

      setLevelTimer(controller.levelTimer);

      // Collectible Status Check
      const heartsFound = trapManager.collectibles
        .filter((c) => c.config.type === 'heart')
        .map((c) => c.config.collected);
      setCollectedHearts([heartsFound[0] || false, heartsFound[1] || false, heartsFound[2] || false]);

      // Romantic Love Tether & Distance
      const p1 = controller.boyState.position;
      const p2 = controller.girlState.position;
      const dist = p1.distanceTo(p2);
      setPartnerDistance(Math.round(dist * 10) / 10);

      const tetherPoints = [p1.clone().add(new THREE.Vector3(0, 0.9, 0)), p2.clone().add(new THREE.Vector3(0, 0.9, 0))];
      loveTetherMesh.geometry.setFromPoints(tetherPoints);
      loveTetherMaterial.opacity = Math.max(0.1, 0.7 - dist * 0.04);

      // Animate Sacred Goal Portal
      goalPortal.rotation.y += delta * 1.2;

      // Animate Sky & Atmospheric Particles
      particles.rotation.y += delta * 0.05;

      // Smooth Follow Camera Focus
      let targetFocus = new THREE.Vector3();
      if (controlMode === 'local_coop') {
        // Midpoint between both partners
        targetFocus.addVectors(p1, p2).multiplyScalar(0.5);
      } else {
        targetFocus.copy(controller.singleActivePlayer === 'boy' ? p1 : p2);
      }

      const cameraOffset = new THREE.Vector3(0, 6 + Math.min(dist * 0.25, 4), 9 + Math.min(dist * 0.35, 6));
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
  }, [worldId, levelNumber]);

  // Sync Control Mode with Ref
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.activeControlMode = controlMode;
    }
  }, [controlMode]);

  // Sync Active Player Switch with Ref
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.singleActivePlayer = activePlayer;
    }
  }, [activePlayer]);

  // Mobile Touch Joystick Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    joystickCenterRef.current = { x: touch.clientX, y: touch.clientY };
    setJoystickActive(true);
    setJoystickOffset({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickActive || !joystickCenterRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickCenterRef.current.x;
    const dy = touch.clientY - joystickCenterRef.current.y;
    const maxR = 40;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) {
      setJoystickOffset({ x: (dx / dist) * maxR, y: (dy / dist) * maxR });
    } else {
      setJoystickOffset({ x: dx, y: dy });
    }
  };

  const handleTouchEnd = () => {
    setJoystickActive(false);
    setJoystickOffset({ x: 0, y: 0 });
  };

  const triggerMobileJump = () => {
    if (controllerRef.current) {
      if (controlMode === 'single_switch') {
        if (activePlayer === 'boy') {
          controllerRef.current.boyState.jumpBufferTimer = 0.15;
        } else {
          controllerRef.current.girlState.jumpBufferTimer = 0.15;
        }
      } else {
        controllerRef.current.boyState.jumpBufferTimer = 0.15;
        controllerRef.current.girlState.jumpBufferTimer = 0.15;
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
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden select-none font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* Top HUD Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Back & Level Title */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => {
              sound.playButtonClick();
              onExitToMenu();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-lg backdrop-blur-md transition-all active:scale-95 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Map</span>
          </button>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2 shadow-lg backdrop-blur-md">
            <div className="text-[10px] tracking-wider font-semibold text-rose-400 uppercase">
              {world.name}
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Level {levelNumber}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {Math.floor(levelTimer / 60)}:{(levelTimer % 60).toFixed(1).padStart(4, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Romantic Hearts Collected */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-rose-900/50 rounded-2xl px-4 py-2 shadow-lg backdrop-blur-md pointer-events-auto">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`transition-all duration-300 transform ${
                collectedHearts[idx] ? 'scale-110 text-rose-500 fill-rose-500' : 'scale-95 text-slate-600'
              }`}
            >
              <Heart className={`w-5 h-5 ${collectedHearts[idx] ? 'fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : ''}`} />
            </div>
          ))}
          <span className="text-xs font-semibold text-rose-200 ml-1">
            {collectedHearts.filter(Boolean).length}/3
          </span>
        </div>

        {/* Right: Partner Distance, Sound & Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Partner Bond Indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 shadow-lg backdrop-blur-md text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Bond: {partnerDistance < 4 ? 'Harmonized ❤️' : `${partnerDistance}m`}</span>
          </div>

          {/* Partner Speaking Indicator */}
          {voiceState.partnerSpeaking && (
            <div className="flex items-center gap-1.5 bg-rose-600/30 border border-rose-500/50 rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-md text-xs font-bold text-rose-200 animate-pulse">
              <Radio className="w-3.5 h-3.5 text-rose-400" />
              <span>{activePlayer === 'boy' ? (profile.girlName || 'Girlfriend') : (profile.boyName || 'Boyfriend')} speaking...</span>
            </div>
          )}

          {/* User Voice Mic Toggle Button */}
          <button
            onClick={handleToggleMic}
            className={`px-3 py-2 rounded-xl border shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 ${
              voiceState.isMicOn
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-700/60'
            }`}
            title={voiceState.isMicOn ? "Microphone LIVE (Press M to Mute)" : "Microphone MUTED (Press M to Speak)"}
          >
            {voiceState.isMicOn ? (
              <Mic className={`w-4 h-4 ${voiceState.isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'}`} />
            ) : (
              <MicOff className="w-4 h-4 text-slate-400" />
            )}
            <span className="hidden sm:inline text-xs font-bold">
              {voiceState.isMicOn ? (voiceState.isSpeaking ? 'Live...' : 'Mic ON') : 'Mic OFF'}
            </span>
            {voiceState.isMicOn && (
              <div className="w-7 h-2 bg-slate-800 rounded-full overflow-hidden hidden md:block">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.round(voiceState.audioLevel * 100)}%` }}
                />
              </div>
            )}
          </button>

          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Toggle Sound"
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              if (controllerRef.current) {
                controllerRef.current.resetToCheckpoint();
              }
            }}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Restart Checkpoint (R)"
          >
            <RotateCcw className="w-4 h-4" />
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
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-lg backdrop-blur-md transition-all active:scale-95"
            title="Pause (Esc)"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-900/90 border border-slate-700/70 rounded-2xl px-5 py-2.5 shadow-2xl backdrop-blur-lg">
        {/* Switch Control Mode (Single vs Local Co-Op) */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => {
              sound.playButtonClick();
              setControlMode('single_switch');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              controlMode === 'single_switch'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Solo (Tab Switch)
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setControlMode('local_coop');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              controlMode === 'local_coop'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2-Player Local</span>
          </button>
        </div>

        {/* In Solo Mode: Character Switch Buttons */}
        {controlMode === 'single_switch' && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <button
              onClick={() => {
                sound.playButtonClick();
                setActivePlayer('boy');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePlayer === 'boy'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <span>{profile.boyName || 'Boyfriend'}</span>
              <span className="text-[10px] opacity-75">(WASD)</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonClick();
                setActivePlayer('girl');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePlayer === 'girl'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <span>{profile.girlName || 'Girlfriend'}</span>
              <span className="text-[10px] opacity-75">(WASD)</span>
            </button>
          </div>
        )}

        {/* In Local Co-Op Mode: Key Guide */}
        {controlMode === 'local_coop' && (
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 pl-2 border-l border-slate-700">
            <div><span className="text-blue-400 font-bold">{profile.boyName || 'Boyfriend'}:</span> WASD + Space</div>
            <div><span className="text-rose-400 font-bold">{profile.girlName || 'Girlfriend'}:</span> Arrows + RShift</div>
          </div>
        )}
      </div>

      {/* On-Screen Touch Controls for Mobile / Tablet */}
      {showMobileControls && (
        <>
          {/* Virtual Joystick (Bottom Left) */}
          <div
            className="absolute z-30 touch-none pointer-events-auto"
            style={{
              left: `${settings.mobileControls.joystickX}%`,
              top: `${settings.mobileControls.joystickY}%`,
              transform: 'translate(-50%, -50%)',
              opacity: settings.mobileControls.opacity
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative w-24 h-24 rounded-full bg-slate-900/60 border-2 border-slate-600/80 backdrop-blur-md flex items-center justify-center">
              <div
                className="w-10 h-10 rounded-full bg-rose-500 shadow-lg border border-rose-300"
                style={{
                  transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)`,
                  transition: joystickActive ? 'none' : 'transform 0.15s ease-out'
                }}
              />
            </div>
          </div>

          {/* Jump Button (Bottom Right) */}
          <div
            className="absolute z-30 touch-none pointer-events-auto"
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
                triggerMobileJump();
              }}
              onClick={triggerMobileJump}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 text-white font-bold text-sm shadow-xl border-2 border-rose-300 flex items-center justify-center active:scale-90 transition-transform"
            >
              JUMP
            </button>
          </div>

          {/* Switch Partner Button (Above Jump) */}
          <div
            className="absolute z-30 touch-none pointer-events-auto"
            style={{
              left: `${settings.mobileControls.switchBtnX}%`,
              top: `${settings.mobileControls.switchBtnY}%`,
              transform: 'translate(-50%, -50%)',
              opacity: settings.mobileControls.opacity
            }}
          >
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                const next: CharacterGender = activePlayer === 'boy' ? 'girl' : 'boy';
                if (controllerRef.current) {
                  controllerRef.current.singleActivePlayer = next;
                }
                setActivePlayer(next);
                sound.playButtonClick();
              }}
              className="w-14 h-14 rounded-full bg-slate-900/80 border border-slate-600 text-white text-[11px] font-bold shadow-lg flex items-center justify-center active:scale-90 transition-transform px-1 text-center truncate"
            >
              {activePlayer === 'boy' ? `${profile.girlName || 'Girl'} 👧` : `${profile.boyName || 'Boy'} 👦`}
            </button>
          </div>

          {/* Quick Mic On/Off Touch Button for Mobile */}
          <div
            className="absolute z-30 touch-none pointer-events-auto"
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
              title={voiceState.isMicOn ? "Mic ON (Tap to Mute)" : "Mic OFF (Tap to Unmute)"}
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
            <p className="text-xs text-rose-200 mt-1 mb-6">
              {profile.boyName || 'Boyfriend'} & {profile.girlName || 'Girlfriend'} completed the trial together!
            </p>

            {/* Stars Rating */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2].map((idx) => {
                const filled = idx === 0 || (idx === 1 && collectedHearts.filter(Boolean).length >= 2) || (idx === 2 && levelTimer <= 35);
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
            <p className="text-xs text-slate-400 mb-6">Take a breath, your partner is waiting!</p>

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
