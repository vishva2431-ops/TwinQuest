import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Users, Sparkles, ShieldCheck, Heart, ArrowRight, Trophy, Mail } from 'lucide-react';
import { PlayerProfile, WorldData } from '../types/game';
import { WORLDS_DATA, storage } from '../services/storage';
import { createCharacterRig, CharacterRig } from '../game/characterModel';
import { sound } from '../services/sound';

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
  const hero3DMountRef = useRef<HTMLDivElement>(null);
  const currentWorld = WORLDS_DATA.find((w) => w.id === profile.currentWorldId) || WORLDS_DATA[0];

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
            <span>Cooperative 3D Adventure</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white font-serif tracking-tight leading-tight">
            TWIN<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-400">QUEST</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Guide <strong className="text-blue-400">{profile.boyName || 'Boyfriend'}</strong> and <strong className="text-rose-400">{profile.girlName || 'Girlfriend'}</strong> through surprise-filled worlds, and reach the heart portal together.
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
