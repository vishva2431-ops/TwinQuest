import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Users, Sparkles, ShieldCheck, Heart, ArrowRight, Trophy, Mail, Wifi, WifiOff, Globe, Radio, CheckCircle2 } from 'lucide-react';
import { PlayerProfile, WorldData } from '../types/game';
import { WORLDS_DATA, storage } from '../services/storage';
import { CharacterRig } from '../game/characterModel';
import { createCharacterRig } from '../game/glbCharacter';
import { sound } from '../services/sound';
import { useNetworkStatus } from '../services/networkStatus';

interface HomePageProps {
  profile: PlayerProfile;
  onPlay: (worldId: number, levelNumber: number) => void;
  onSelectTab: (tab: 'home' | 'maps' | 'levels' | 'friends' | 'rooms' | 'settings') => void;
  onOpenCustomization: () => void;
  onOpenAuth: () => void;
  onUpdateProfile: (profile: PlayerProfile) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  profile,
  onPlay,
  onSelectTab,
  onOpenCustomization,
  onOpenAuth,
  onUpdateProfile
}) => {
  const isOnline = useNetworkStatus();
  const hero3DMountRef = useRef<HTMLDivElement>(null);
  const currentWorld = WORLDS_DATA.find((w) => w.id === profile.currentWorldId) || WORLDS_DATA[0];

  useEffect(() => {
    if (!hero3DMountRef.current) return;

    const width = hero3DMountRef.current.clientWidth || 360;
    const height = hero3DMountRef.current.clientHeight || 420;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 1.02, 2.3);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    hero3DMountRef.current.appendChild(renderer.domElement);

    // Studio Pixar/Anime 4-Point Lighting Rig
    const amb = new THREE.HemisphereLight('#ffffff', '#334155', 1.4);
    scene.add(amb);

    // Frontal Warm Key Light
    const key = new THREE.DirectionalLight('#fffbeb', 2.2);
    key.position.set(1.5, 3.5, 3.5);
    scene.add(key);

    // Frontal Soft Blue Fill Light (eliminates dark shadows on face)
    const fill = new THREE.DirectionalLight('#e0f2fe', 1.2);
    fill.position.set(-2.0, 1.8, 3.0);
    scene.add(fill);

    // Vibrant Rim Backlight (highlights hair & silhouette)
    const rim = new THREE.DirectionalLight('#fb7185', 1.4);
    rim.position.set(0, 3.0, -3.0);
    scene.add(rim);

    // Soft Warm Bounce from Pedestal
    const bounceLight = new THREE.PointLight('#f59e0b', 0.8, 4);
    bounceLight.position.set(0, 0.2, 0.6);
    scene.add(bounceLight);

    // Floating Golden Glowing Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.05, 1.15, 0.12, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.8 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.06;
    scene.add(baseMesh);

    // Romantic Golden Heart Glow Ring on Pedestal
    const ringGeo = new THREE.TorusGeometry(0.92, 0.035, 12, 32);
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      metalness: 0.9,
      roughness: 0.15,
      emissive: new THREE.Color('#d97706'),
      emissiveIntensity: 0.35
    });
    const ringMesh = new THREE.Mesh(ringGeo, goldMat);
    ringMesh.rotation.x = Math.PI / 2;
    scene.add(ringMesh);

    // Create Both Leo & Maya (Framed closer together as iconic co-op partners)
    const boyRig = createCharacterRig('boy', profile.boyCustomization);
    boyRig.group.position.set(-0.38, 0, 0);
    scene.add(boyRig.group);

    const girlRig = createCharacterRig('girl', profile.girlCustomization);
    girlRig.group.position.set(0.38, 0, 0);
    scene.add(girlRig.group);

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Subtle partner glance & breath animation
      boyRig.updateAnimation(
        {
          velocity: new THREE.Vector3(),
          isGrounded: true,
          isJumping: false,
          isFalling: false,
          isDead: false,
          isCheering: false,
          lookAtPartnerPos: girlRig.group.position
        },
        delta
      );

      girlRig.updateAnimation(
        {
          velocity: new THREE.Vector3(),
          isGrounded: true,
          isJumping: false,
          isFalling: false,
          isDead: false,
          isCheering: false,
          lookAtPartnerPos: boyRig.group.position
        },
        delta
      );

      // Slow elegant turn
      const rot = Math.sin(elapsed * 0.4) * 0.25;
      boyRig.group.rotation.y = rot + 0.2;
      girlRig.group.rotation.y = rot - 0.2;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!hero3DMountRef.current) return;
      const newW = hero3DMountRef.current.clientWidth || 360;
      const newH = hero3DMountRef.current.clientHeight || 420;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12 space-y-10">
      {/* Network Connectivity Notice Banner */}
      {!isOnline ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-xs shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <span className="font-bold text-amber-200">Offline Mode Active: </span>
              <span className="text-slate-300">
                You can play Single Player completely offline anytime! Your levels, stars, and character customization are saved locally on this device.
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 whitespace-nowrap">
            Solo Offline Ready
          </span>
        </div>
      ) : (
        <div className="px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Network Connected:</span>
            <span>Single Player is playable offline, and Play With Friends (Online Co-Op) is ready.</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
            <Wifi className="w-3.5 h-3.5" />
            <span>Online Mode Ready</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Atmosphere glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Left Column: Title & Actions */}
        <div className="max-w-xl space-y-5 z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
            <span>Cooperative 3D Adventure</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-serif tracking-tight leading-tight">
            TWIN<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-400">QUEST</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Choose your mode: Play <strong>Single Player</strong> in 100% offline mode on this device, or jump into <strong>Play With Friends</strong> online with live room codes and real-time voice chat.
          </p>

          {/* Quick Play CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
            <button
              onClick={() => {
                sound.playButtonClick();
                onPlay(profile.currentWorldId, profile.currentLevelIndex);
              }}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-sm shadow-xl shadow-rose-500/30 transition-all active:scale-95 flex items-center justify-center gap-2.5"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>PLAY SINGLE PLAYER (OFFLINE)</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonClick();
                onSelectTab('rooms');
              }}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-rose-400" />
              <span>PLAY WITH FRIENDS (ONLINE)</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonClick();
                onOpenCustomization();
              }}
              className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700/60 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Costumes & Names</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live 3D Partner Preview */}
        <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center z-10">
          <div
            ref={hero3DMountRef}
            className="w-full h-72 sm:h-80 lg:h-96 rounded-3xl overflow-hidden relative cursor-grab active:cursor-grabbing border border-slate-800/90 shadow-2xl bg-slate-950/60"
          />
        </div>
      </div>

      {/* Mode Comparison Cards: Single Player (Offline) vs Play with Friends (Online) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Single Player (Offline Mode) Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-4 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Offline Mode • No Internet Required</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">Stage {profile.currentLevelIndex}</span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              <span>Single Player (Offline)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Control your chosen character ({profile.activeCharacter === 'girl' ? 'Female' : 'Male'}) solo. Puzzles, trap dodging, checkpoint systems, and level progression run completely locally and save directly to device storage without requiring internet.
            </p>
          </div>

          <div className="space-y-1.5 pt-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Works 100% offline anytime, on plane, travel or no-wifi</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All 10 fantasy worlds and 500 levels available offline</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Custom character names and outfits saved locally</span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playButtonClick();
              onPlay(profile.currentWorldId, profile.currentLevelIndex);
            }}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>LAUNCH SINGLE PLAYER (OFFLINE)</span>
          </button>
        </div>

        {/* Play With Friends (Online Multiplayer) Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-rose-500/30 shadow-xl space-y-4 relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              isOnline
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <Globe className="w-3.5 h-3.5" />
              <span>{isOnline ? 'Online Multiplayer Active' : 'Requires Internet'}</span>
            </span>
            <span className="text-xs text-rose-300 font-semibold flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" />
              <span>Live Voice Chat</span>
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-400" />
              <span>Play With Friends (Online)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Real-time online 2-player cooperative platforming over Supabase Realtime. Create or join room codes (TQ-XXXX), invite friends, sync 3D positions at 20Hz, and communicate with real WebRTC audio voice chat.
            </p>
          </div>

          <div className="space-y-1.5 pt-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Private rooms with 6-character room codes (TQ-XXXX)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Separate progression saved independently for each friend</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Integrated WebRTC voice chat with mute toggle</span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('rooms');
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>ENTER ONLINE CO-OP ROOMS</span>
          </button>
        </div>
      </div>

      {/* Account + progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              profile.isEmailVerified
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <Mail className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Account</h3>
                {profile.isEmailVerified && (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Signed in
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 break-words">
                {profile.isEmailVerified
                  ? `${profile.username} (${profile.verifiedEmail})`
                  : 'Playing as guest. Sign in to save your progress.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playButtonClick();
              onOpenAuth();
            }}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
              profile.isEmailVerified
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 active:scale-95'
            }`}
          >
            <span>{profile.isEmailVerified ? 'Manage Account' : 'Sign In / Register'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Heart className="w-6 h-6 fill-rose-500/40" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{profile.heartsCollected}</div>
            <div className="text-xs text-slate-400">Hearts Collected</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{profile.unlockedWorlds} / 10</div>
            <div className="text-xs text-slate-400">Worlds Unlocked</div>
          </div>
        </div>
      </div>
    </div>
  );
};
