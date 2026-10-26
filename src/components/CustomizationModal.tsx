import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Check, Sparkles, Shirt, Eye, Glasses, Backpack } from 'lucide-react';
import { CharacterCustomization, CharacterGender, PlayerProfile } from '../types/game';
import { CharacterRig } from '../game/characterModel';
import { createCharacterRig } from '../game/glbCharacter';
import { sound } from '../services/sound';
import { storage } from '../services/storage';

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onSaveProfile: (profile: PlayerProfile) => void;
}

const OUTFITS = [
  { id: 'twinquest', name: 'TwinQuest Signature', desc: 'Iconic cozy adventure hoodie & chunky sneakers', color: '#2563eb', accent: '#ffffff' },
  { id: 'explorer', name: 'Sunset Explorer', desc: 'Warm sunrise adventure hoodie', color: '#ec4899', accent: '#fbbf24' },
  { id: 'forest', name: 'Emerald Forest', desc: 'Lush trail hoodie & white sneakers', color: '#10b981', accent: '#a7f3d0' },
  { id: 'cyber', name: 'Neon Cyber', desc: 'High-tech glowing fiber hoodie', color: '#06b6d4', accent: '#e0f2fe' },
  { id: 'royal', name: 'Royal Amethyst', desc: 'Royal velvet hoodie & gold trim', color: '#7c3aed', accent: '#fde047' }
];

const HAIR_STYLES_BOY = [
  { id: 'short_quiff', name: 'Anime Layered Tufts' },
  { id: 'textured_crop', name: 'Textured Crop' },
  { id: 'swept_back', name: 'Swept Back' }
];

const HAIR_STYLES_GIRL = [
  { id: 'ponytail', name: 'High Bouncy Ponytail' },
  { id: 'long_waves', name: 'Flowing Waves' },
  { id: 'braids', name: 'Adventure Braids' }
];

const HAIR_COLORS = ['#452210', '#5c2e17', '#78350f', '#18181b', '#d97706', '#f43f5e', '#6366f1', '#e2e8f0'];
const SKIN_TONES = ['#ffe4cb', '#ffe8d6', '#fcd3b8', '#e0a980', '#c28766', '#8d5b4c'];
const EYE_COLORS = ['#2563eb', '#9f2d1e', '#059669', '#7c3aed', '#b45309', '#0f172a', '#e11d48'];

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile
}) => {
  const [selectedGender, setSelectedGender] = useState<CharacterGender>(profile.activeCharacter);
  const [boyName, setBoyName] = useState(profile.boyName || 'Boyfriend');
  const [girlName, setGirlName] = useState(profile.girlName || 'Girlfriend');
  const [username, setUsername] = useState(profile.username || 'Adventurer');
  const [custom, setCustom] = useState<CharacterCustomization>(
    selectedGender === 'boy' ? { ...profile.boyCustomization } : { ...profile.girlCustomization }
  );

  const previewMountRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<CharacterRig | null>(null);

  useEffect(() => {
    setBoyName(profile.boyName || 'Boyfriend');
    setGirlName(profile.girlName || 'Girlfriend');
    setUsername(profile.username || 'Adventurer');
  }, [profile]);

  // Update current custom state when switching gender
  useEffect(() => {
    setCustom(selectedGender === 'boy' ? { ...profile.boyCustomization } : { ...profile.girlCustomization });
  }, [selectedGender]);

  // Setup 3D rotating preview canvas
  useEffect(() => {
    if (!isOpen || !previewMountRef.current) return;

    const width = previewMountRef.current.clientWidth || 320;
    const height = previewMountRef.current.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c1322');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 0.96, 2.2);
    camera.lookAt(0, 0.88, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    previewMountRef.current.appendChild(renderer.domElement);

    // Studio 4-Point Anime Lighting
    const amb = new THREE.HemisphereLight('#ffffff', '#334155', 1.4);
    scene.add(amb);

    const keyLight = new THREE.DirectionalLight('#fffbeb', 2.2);
    keyLight.position.set(1.5, 3.5, 3.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#e0f2fe', 1.2);
    fillLight.position.set(-2.0, 1.8, 3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#fb7185', 1.4);
    rimLight.position.set(0, 3.0, -3.0);
    scene.add(rimLight);

    const bounce = new THREE.PointLight('#f59e0b', 0.8, 4);
    bounce.position.set(0, 0.2, 0.6);
    scene.add(bounce);

    // Soft Circular Pedestal with Golden Ring
    const pedestalGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.12, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8, roughness: 0.2 });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.06;
    scene.add(pedestal);

    const ringGeo = new THREE.TorusGeometry(0.72, 0.025, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      metalness: 0.9,
      roughness: 0.15,
      emissive: new THREE.Color('#d97706'),
      emissiveIntensity: 0.35
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Character Rig
    const rig = createCharacterRig(selectedGender, custom);
    rig.group.position.y = 0;
    scene.add(rig.group);
    rigRef.current = rig;

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Gentle natural turntable rotation
      rig.group.rotation.y = Math.sin(elapsed * 0.8) * 0.35;

      rig.updateAnimation(
        {
          velocity: new THREE.Vector3(),
          isGrounded: true,
          isJumping: false,
          isFalling: false,
          isDead: false,
          isCheering: false
        },
        delta
      );

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!previewMountRef.current) return;
      const newW = previewMountRef.current.clientWidth || 320;
      const newH = previewMountRef.current.clientHeight || 420;
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
  }, [isOpen, selectedGender]);

  // Live update 3D materials on modification
  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.updateCustomization(custom);
    }
  }, [custom]);

  if (!isOpen) return null;

  const handleSave = () => {
    sound.playButtonClick();
    const updated = {
      ...profile,
      username: username.trim() || 'Adventurer',
      boyName: boyName.trim() || 'Boyfriend',
      girlName: girlName.trim() || 'Girlfriend',
      activeCharacter: selectedGender
    };
    if (selectedGender === 'boy') {
      updated.boyCustomization = custom;
    } else {
      updated.girlCustomization = custom;
    }

    storage.saveProfile(updated);
    onSaveProfile(updated);
    onClose();
  };

  const hairStyleOptions = selectedGender === 'boy' ? HAIR_STYLES_BOY : HAIR_STYLES_GIRL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-serif">Character Studio</h2>
              <p className="text-xs text-slate-400">Rename & Customize Boyfriend & Girlfriend</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playButtonClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 3D Viewport on Left, Control Options on Right */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto">
          {/* Left: 3D Interactive Turntable */}
          <div className="w-full md:w-5/12 bg-slate-950/50 p-4 sm:p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-slate-800">
            {/* Gender Switcher */}
            <div className="flex p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60 w-full max-w-xs mb-3 sm:mb-4">
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setSelectedGender('boy');
                }}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all truncate ${
                  selectedGender === 'boy'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {boyName || 'Boyfriend'}
              </button>
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setSelectedGender('girl');
                }}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all truncate ${
                  selectedGender === 'girl'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {girlName || 'Girlfriend'}
              </button>
            </div>

            {/* 3D Canvas Container */}
            <div
              ref={previewMountRef}
              className="w-full h-60 sm:h-80 rounded-2xl overflow-hidden relative border border-slate-800 shadow-inner"
            />

            <div className="text-[11px] text-slate-400 text-center mt-2 sm:mt-3">
              Realistic Human 3D Model • 12-Part Articulated Rig
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="w-full md:w-7/12 p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
            {/* Character & Player Names Section */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Custom Character Names</span>
                </div>
                <span className="text-[10px] text-slate-400">Zero hardcoded names</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Boy Name Field */}
                <div>
                  <label className="text-[11px] font-bold text-blue-300 block mb-1 flex items-center gap-1">
                    <span>👦</span>
                    <span>Boyfriend Name</span>
                  </label>
                  <input
                    type="text"
                    value={boyName}
                    onChange={(e) => setBoyName(e.target.value)}
                    placeholder="e.g. Leo, Romeo, Jack..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Girl Name Field */}
                <div>
                  <label className="text-[11px] font-bold text-rose-300 block mb-1 flex items-center gap-1">
                    <span>👧</span>
                    <span>Girlfriend Name</span>
                  </label>
                  <input
                    type="text"
                    value={girlName}
                    onChange={(e) => setGirlName(e.target.value)}
                    placeholder="e.g. Maya, Juliet, Rose..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Player Profile / Account Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center gap-1">
                    <span>🎮</span>
                    <span>Account / Gamer Tag</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter player name..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Preset Ideas */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-slate-400">Quick ideas:</span>
                {[
                  ['Romeo', 'Juliet'],
                  ['Jack', 'Rose'],
                  ['Alex', 'Sam'],
                  ['Ethan', 'Emma'],
                  ['Leo', 'Maya'],
                  ['Boyfriend', 'Girlfriend']
                ].map(([b, g]) => (
                  <button
                    key={`${b}-${g}`}
                    type="button"
                    onClick={() => {
                      sound.playButtonClick();
                      setBoyName(b);
                      setGirlName(g);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600/60 transition-colors"
                  >
                    {b} & {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Outfits / Costumes */}
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Shirt className="w-4 h-4 text-rose-400" />
                <span>Adventure Outfit</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {OUTFITS.map((outfit) => (
                  <button
                    key={outfit.id}
                    onClick={() => {
                      sound.playButtonClick();
                      setCustom({
                        ...custom,
                        outfit: outfit.id,
                        clothingPrimaryColor: outfit.color,
                        clothingSecondaryColor: outfit.accent
                      });
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      custom.outfit === outfit.id
                        ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{outfit.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: outfit.color }} />
                        <span className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: outfit.accent }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{outfit.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Style */}
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 block">
                Hair Style
              </label>
              <div className="flex flex-wrap gap-2">
                {hairStyleOptions.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      sound.playButtonClick();
                      setCustom({ ...custom, hairStyle: h.id });
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      custom.hairStyle === h.id
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-800/50 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color Palette */}
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 block">
                Hair Color
              </label>
              <div className="flex items-center gap-2.5">
                {HAIR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      sound.playButtonClick();
                      setCustom({ ...custom, hairColor: c });
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      custom.hairColor === c ? 'scale-125 border-rose-400 shadow-md' : 'border-slate-700 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Skin Tone Palette */}
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 block">
                Natural Skin Tone
              </label>
              <div className="flex items-center gap-2.5">
                {SKIN_TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      sound.playButtonClick();
                      setCustom({ ...custom, skinTone: t });
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      custom.skinTone === t ? 'scale-125 border-rose-400 shadow-md' : 'border-slate-700 hover:scale-110'
                    }`}
                    style={{ backgroundColor: t }}
                  />
                ))}
              </div>
            </div>

            {/* Eye Color */}
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-2.5">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Eye Color</span>
              </label>
              <div className="flex items-center gap-2.5">
                {EYE_COLORS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      sound.playButtonClick();
                      setCustom({ ...custom, eyeColor: e });
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      custom.eyeColor === e ? 'scale-125 border-white shadow-md' : 'border-slate-700 hover:scale-110'
                    }`}
                    style={{ backgroundColor: e }}
                  />
                ))}
              </div>
            </div>

            {/* Accessories / Specs */}
            <div>
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Glasses className="w-4 h-4 text-amber-400" />
                <span>Accessories & Specs</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    sound.playButtonClick();
                    setCustom({
                      ...custom,
                      accessories: { ...custom.accessories, glasses: !custom.accessories.glasses }
                    });
                  }}
                  className={`p-3 rounded-2xl text-left border flex items-center justify-between text-xs font-semibold ${
                    custom.accessories.glasses
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <span>Designer Specs</span>
                  <Check className={`w-4 h-4 ${custom.accessories.glasses ? 'opacity-100 text-indigo-400' : 'opacity-0'}`} />
                </button>

                <button
                  onClick={() => {
                    sound.playButtonClick();
                    setCustom({
                      ...custom,
                      accessories: { ...custom.accessories, pendant: !custom.accessories.pendant }
                    });
                  }}
                  className={`p-3 rounded-2xl text-left border flex items-center justify-between text-xs font-semibold ${
                    custom.accessories.pendant
                      ? 'bg-rose-600/20 border-rose-500 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <span>Heart Pendant</span>
                  <Check className={`w-4 h-4 ${custom.accessories.pendant ? 'opacity-100 text-rose-400' : 'opacity-0'}`} />
                </button>

                <button
                  onClick={() => {
                    sound.playButtonClick();
                    setCustom({
                      ...custom,
                      accessories: { ...custom.accessories, backpack: !custom.accessories.backpack }
                    });
                  }}
                  className={`p-3 rounded-2xl text-left border flex items-center justify-between text-xs font-semibold ${
                    custom.accessories.backpack
                      ? 'bg-amber-600/20 border-amber-500 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <span>Travel Backpack</span>
                  <Check className={`w-4 h-4 ${custom.accessories.backpack ? 'opacity-100 text-amber-400' : 'opacity-0'}`} />
                </button>

                <button
                  onClick={() => {
                    sound.playButtonClick();
                    setCustom({
                      ...custom,
                      accessories: { ...custom.accessories, gloves: !custom.accessories.gloves }
                    });
                  }}
                  className={`p-3 rounded-2xl text-left border flex items-center justify-between text-xs font-semibold ${
                    custom.accessories.gloves
                      ? 'bg-emerald-600/20 border-emerald-500 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <span>Utility Gloves</span>
                  <Check className={`w-4 h-4 ${custom.accessories.gloves ? 'opacity-100 text-emerald-400' : 'opacity-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Playing as: <span className="font-bold text-white capitalize">{selectedGender === 'boy' ? (boyName || 'Boyfriend') : (girlName || 'Girlfriend')}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                sound.playButtonClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 active:scale-95 transition-all"
            >
              Save Customization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
