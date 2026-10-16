import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Users, Sparkles, Map, Layers, ShieldCheck, Heart, ArrowRight, Zap, Trophy, Compass, User, Mail, Mic, Check } from 'lucide-react';
import { PlayerProfile, WorldData } from '../types/game';
import { WORLDS_DATA, storage } from '../services/storage';
import { createCharacterRig, CharacterRig } from '../game/characterModel';
import { sound } from '../services/sound';

interface HomePageProps {
  profile: PlayerProfile;
  onPlay: (worldId: number, levelNumber: number) => void;
  onSelectTab: (tab: 'home' | 'maps' | 'levels' | 'friends' | 'rooms' | 'settings' | 'deliverables') => void;
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
  const hero3DMountRef = useRef<HTMLDivElement>(null);
  const currentWorld = WORLDS_DATA.find((w) => w.id === profile.currentWorldId) || WORLDS_DATA[0];

  const [boyNameInput, setBoyNameInput] = useState(profile.boyName || 'Boyfriend');
  const [girlNameInput, setGirlNameInput] = useState(profile.girlName || 'Girlfriend');
  const [namesSaved, setNamesSaved] = useState(false);

  useEffect(() => {
    setBoyNameInput(profile.boyName || 'Boyfriend');
    setGirlNameInput(profile.girlName || 'Girlfriend');
  }, [profile.boyName, profile.girlName]);

  const handleSaveNames = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButtonClick();
    const updated = storage.updateCharacterNames(boyNameInput, girlNameInput);
    onUpdateProfile(updated);
    setNamesSaved(true);
    setTimeout(() => setNamesSaved(false), 2000);
  };

  useEffect(() => {
    if (!hero3DMountRef.current) return;

    const width = hero3DMountRef.current.clientWidth || 360;
    const height = hero3DMountRef.current.clientHeight || 420;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.4, 3.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    hero3DMountRef.current.appendChild(renderer.domElement);

    // Warm Romantic Lighting
    const amb = new THREE.HemisphereLight('#fef08a', '#1e1b4b', 1.0);
    scene.add(amb);

    const key = new THREE.DirectionalLight('#fff7ed', 1.8);
    key.position.set(3, 5, 4);
    scene.add(key);

    const rim = new THREE.DirectionalLight('#f43f5e', 0.9);
    rim.position.set(-3, 3, -3);
    scene.add(rim);

    // Double Pedestal for Boyfriend & Girlfriend Standing Together!
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.7 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.08;
    scene.add(baseMesh);

    // Romantic Golden Heart on Ground Pedestal
    const ringGeo = new THREE.TorusGeometry(1.0, 0.04, 8, 32);
    const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.2 });
    const ringMesh = new THREE.Mesh(ringGeo, goldMat);
    ringMesh.rotation.x = Math.PI / 2;
    scene.add(ringMesh);

    // Create Both Leo & Maya
    const boyRig = createCharacterRig('boy', profile.boyCustomization);
    boyRig.group.position.set(-0.45, 0, 0);
    scene.add(boyRig.group);

    const girlRig = createCharacterRig('girl', profile.girlCustomization);
    girlRig.group.position.set(0.45, 0, 0);
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

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12 space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Atmosphere glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Left Column: Title & Actions */}
        <div className="max-w-xl space-y-5 z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
            <span>Romantic Cooperative Adventure • 5,000 Stages</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white font-serif tracking-tight leading-tight">
            TWIN<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-400">QUEST</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Take control of <strong className="text-blue-400">{profile.boyName || 'Boyfriend'}</strong> and <strong className="text-rose-400">{profile.girlName || 'Girlfriend'}</strong> in a breathtaking 3D adventure inspired by the surprise traps of <em>Level Devil</em>. Trust each other, survive unexpected hazards, and reach the heart portal together!
          </p>

          {/* Quick Play CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
            <button
              onClick={() => {
                sound.playButtonClick();
                onPlay(profile.currentWorldId, profile.currentLevelIndex);
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-sm shadow-xl shadow-rose-500/30 transition-all active:scale-95 flex items-center justify-center gap-2.5"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>CONTINUE (STAGE {profile.currentLevelIndex})</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonClick();
                onSelectTab('rooms');
              }}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-rose-400" />
              <span>2-Player Co-Op Room</span>
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
        <div className="w-full max-w-sm flex flex-col items-center z-10">
          <div
            ref={hero3DMountRef}
            className="w-full h-80 sm:h-96 rounded-3xl overflow-hidden relative cursor-grab active:cursor-grabbing border border-slate-800/90 shadow-2xl bg-slate-950/60"
          />
          <div className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{profile.boyName || 'Boyfriend'} & {profile.girlName || 'Girlfriend'} • Live 3D Rig</span>
          </div>
        </div>
      </div>

      {/* Direct Character Names & Roles Customizer Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>Customize Character Names</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">Who are the two adventurers?</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Change the names of your Boyfriend and Girlfriend characters. Never hardcoded — personalize your story!
            </p>
          </div>

          <button
            onClick={() => {
              sound.playButtonClick();
              onOpenCustomization();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors w-fit"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Open Full 3D Wardrobe Studio</span>
          </button>
        </div>

        <form onSubmit={handleSaveNames} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-blue-300 block mb-1.5 flex items-center gap-1">
              <span>👦</span>
              <span>Boyfriend Character Name</span>
            </label>
            <input
              type="text"
              required
              value={boyNameInput}
              onChange={(e) => setBoyNameInput(e.target.value)}
              placeholder="e.g. Leo, Romeo, Jack..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-blue-500 shadow-inner"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-rose-300 block mb-1.5 flex items-center gap-1">
              <span>👧</span>
              <span>Girlfriend Character Name</span>
            </label>
            <input
              type="text"
              required
              value={girlNameInput}
              onChange={(e) => setGirlNameInput(e.target.value)}
              placeholder="e.g. Maya, Juliet, Rose..."
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-rose-500 shadow-inner"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {namesSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Check className="w-4 h-4" />}
              <span>{namesSaved ? 'Names Saved!' : 'Apply Character Names'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Email OTP Verification & In-Game Mic Callout Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email OTP Verification Callout */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              profile.isEmailVerified
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Email OTP Account Verification</h3>
                {profile.isEmailVerified && (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {profile.isEmailVerified
                  ? `Your account is verified with ${profile.verifiedEmail}. Persistent cloud saves and secure matchmaking are enabled.`
                  : 'Log in with your email address, adventurer name, and password to receive a 6-digit email OTP verification code.'}
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
            <span>{profile.isEmailVerified ? 'Manage Verified Account' : 'Sign In & Get Email OTP'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live In-Game Voice Mic Callout */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">In-Game Teammate Voice Mic</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Speak live through your microphone with your partner to warn each other about falling floors, sudden boulders, and fake portals. Easily toggle Mic ON / OFF anytime!
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Shortcut in-game: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">M</kbd></span>
            <button
              onClick={() => {
                sound.playButtonClick();
                onSelectTab('settings');
              }}
              className="text-xs font-bold text-emerald-400 hover:underline"
            >
              Configure Mic & Sensitivity →
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">5,000</div>
            <div className="text-xs text-slate-400">Total Stages Available</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">100%</div>
            <div className="text-xs text-slate-400">Surprise Trap Readiness</div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white font-serif">ADVENTURE MECHANICS</h2>
            <p className="text-xs text-slate-400">Engineered for unexpected laughs, precise jumps, and true teamwork.</p>
          </div>
          <button
            onClick={() => {
              sound.playButtonClick();
              onSelectTab('maps');
            }}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <span>Explore All Worlds</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold">
              💥
            </div>
            <h3 className="text-base font-bold text-white">Level Devil Surprise Traps</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Floors that suddenly collapse, hidden spikes shooting from tiles, decoy portals that teleport away, and swinging bladed pendulums.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold">
              🤝
            </div>
            <h3 className="text-base font-bold text-white">Co-Op Bond Physics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Both partners must reach the portal! Coordinate dual pressure plates, timed levers, and stay tethered with romantic heart bonds.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold">
              📱
            </div>
            <h3 className="text-base font-bold text-white">PC & Mobile Draggable Controls</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full keyboard support (WASD + Arrows) plus customizable on-screen touch joysticks you can drag anywhere in Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
