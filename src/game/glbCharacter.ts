import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CharacterCustomization, CharacterGender } from '../types/game';
import {
  CharacterRig,
  CharacterAnimationState,
  FacialController,
  createProceduralCharacterRig
} from './characterModel';

/**
 * GLB-based characters for TwinQuest.
 *
 *   Leo  ('boy')  -> public/models/characters/leo.glb   (child model)
 *   Maya ('girl') -> public/models/characters/maya.glb  (woman model)
 *
 * `createCharacterRig` keeps the exact same contract as the old procedural factory, so
 * GameController / HomePage / CustomizationModal / GameCanvas need no changes besides the import.
 *
 * The GLBs are single static meshes (no skeleton, no animation clips), so instead of moving
 * limbs we animate the whole body: idle breathing, walk bob + lean, jump stretch, landing squash,
 * fall, death, cheer and small event reactions.
 *
 * If a model fails to load (missing file, offline first run, decoder error) the original
 * procedural character is shown instead, so the game never ends up without a character.
 */

interface ModelConfig {
  url: string;
  /** Height in world units the model is scaled to (feet at y = 0). */
  height: number;
}

const BASE_URL: string = (import.meta as any).env?.BASE_URL ?? '/';

const MODELS: Record<CharacterGender, ModelConfig> = {
  boy: { url: `${BASE_URL}models/characters/leo.glb`, height: 1.35 },
  girl: { url: `${BASE_URL}models/characters/maya.glb`, height: 1.65 }
};

/* -------------------------------------------------------------------------- */
/* Loading + cache                                                             */
/* -------------------------------------------------------------------------- */

const resolved = new Map<CharacterGender, THREE.Object3D>();
const pending = new Map<CharacterGender, Promise<THREE.Object3D>>();
let sharedLoader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    // Needed when the GLBs were compressed with `npm run optimize:models` (meshopt).
    sharedLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  return sharedLoader;
}

/** Loads a model once, normalises it (feet on y = 0, centred on x/z, scaled to height). */
function loadModel(gender: CharacterGender): Promise<THREE.Object3D> {
  const existing = pending.get(gender);
  if (existing) return existing;

  const cfg = MODELS[gender];
  const promise = getLoader()
    .loadAsync(cfg.url)
    .then((gltf) => {
      const scene = gltf.scene;
      scene.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const s = size.y > 0 ? cfg.height / size.y : 1;

      scene.scale.multiplyScalar(s);
      scene.position.set(-center.x * s, -box.min.y * s, -center.z * s);

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = false;
          mesh.frustumCulled = false;
        }
      });

      const holder = new THREE.Group();
      holder.name = gender === 'boy' ? 'LeoModel' : 'MayaModel';
      holder.add(scene);
      resolved.set(gender, holder);
      return holder as THREE.Object3D;
    })
    .catch((err) => {
      pending.delete(gender); // allow a retry on the next rig creation
      throw err;
    });

  pending.set(gender, promise);
  return promise;
}

/**
 * Start downloading both models. Call once at app start so they are ready (and cached by the
 * service worker for offline play) before the first scene needs them. Never throws.
 */
export function preloadCharacterModels(): void {
  (['boy', 'girl'] as CharacterGender[]).forEach((g) => {
    loadModel(g).catch((err) => console.warn(`[TwinQuest] Could not preload ${MODELS[g].url}`, err));
  });
}

/* -------------------------------------------------------------------------- */
/* Rig factory                                                                 */
/* -------------------------------------------------------------------------- */

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

export function createCharacterRig(gender: CharacterGender, customization: CharacterCustomization): CharacterRig {
  // The procedural rig stays underneath as the full-featured fallback and as the owner of `group`.
  const proc = createProceduralCharacterRig(gender, customization);
  const H = MODELS[gender].height;

  const pivot = new THREE.Group(); // animated wrapper around the GLB
  pivot.name = `${proc.group.name}Pivot`;

  const proceduralParts = [...proc.group.children];
  let usingModel = false;

  const attach = (proto: THREE.Object3D) => {
    if (usingModel) return;
    pivot.add(proto.clone(true)); // shares geometry + materials with the cached model
    proc.group.add(pivot);
    proceduralParts.forEach((c) => (c.visible = false));
    usingModel = true;
  };

  const cached = resolved.get(gender);
  if (cached) {
    attach(cached); // synchronous: no flash of the old character
  } else {
    loadModel(gender)
      .then(attach)
      .catch((err) => {
        console.warn(`[TwinQuest] Falling back to procedural ${proc.group.name}:`, err);
      });
  }

  /* ------------------------------ animation ------------------------------ */
  let t = Math.random() * 10;
  let run = 0;
  let phase = 0;
  let wasGrounded = true;
  let landT = 0;

  // Event reactions (bounce / shiver / cheer) driven by facialController.triggerEvent
  let reaction: 'none' | 'bounce' | 'shiver' | 'cheer' = 'none';
  let reactionT = 0;
  let reactionDur = 0;

  const facialController: FacialController = {
    triggerEvent: (event, options) => {
      proc.facialController.triggerEvent(event, options); // keep the fallback face in sync
      const dur = options?.duration ?? 1;
      switch (event) {
        case 'collect_item':
        case 'checkpoint':
          reaction = 'bounce';
          reactionDur = Math.min(dur, 0.5);
          break;
        case 'trap_near':
          reaction = 'shiver';
          reactionDur = dur;
          break;
        case 'victory':
          reaction = 'cheer';
          reactionDur = dur;
          break;
        default:
          return; // 'jump' / 'land' are derived from the animation state
      }
      reactionT = 0;
    }
  };

  const animateModel = (s: CharacterAnimationState, delta: number) => {
    const dt = Math.min(delta, 0.1);
    t += dt;

    const speed = Math.hypot(s.velocity.x, s.velocity.z);
    const runTarget = s.isGrounded && !s.isDead ? clamp(speed / 4, 0, 1) : 0;
    run = damp(run, runTarget, 10, dt);
    phase += dt * (7 + 5 * run) * run;

    if (!wasGrounded && s.isGrounded && !s.isDead) landT = 0.22;
    wasGrounded = s.isGrounded;
    landT = Math.max(0, landT - dt);

    if (reaction !== 'none') {
      reactionT += dt;
      if (reactionT >= reactionDur) reaction = 'none';
    }
    const rk = reaction !== 'none' && reactionDur > 0 ? clamp(reactionT / reactionDur, 0, 1) : 0;

    // Targets
    let y = 0;
    let rx = 0;
    let rz = 0;
    let ry = 0;
    let sy = 1;
    let sxz = 1;

    // Idle breathing + gentle sway
    const idle = 1 - run;
    const breathe = Math.sin(t * 2.2);
    sy += breathe * 0.008 * idle;
    sxz -= breathe * 0.004 * idle;
    rz += Math.sin(t * 0.9) * 0.012 * idle;

    // Walk / run: bob, side roll, forward lean, small yaw wiggle
    y += Math.abs(Math.sin(phase)) * 0.04 * H * run;
    rz += Math.sin(phase) * 0.06 * run;
    ry += Math.sin(phase) * 0.05 * run;
    rx += 0.16 * run;

    // Airborne
    if (!s.isGrounded || s.isJumping) {
      if (s.isFalling && s.velocity.y < -0.5) {
        sy = 1.04;
        sxz = 0.98;
        rx += 0.04;
      } else {
        sy = 1.09;
        sxz = 0.95;
        rx += 0.1;
      }
    }

    // Landing squash
    if (landT > 0) {
      const k = landT / 0.22;
      sy = 1 - 0.14 * k;
      sxz = 1 + 0.07 * k;
    }

    // Cheer (state flag or victory event)
    if (s.isCheering || reaction === 'cheer') {
      y += Math.abs(Math.sin(t * 7)) * 0.12 * H;
      rz += Math.sin(t * 7) * 0.1;
      ry += Math.sin(t * 3.5) * 0.35;
    }

    // Short reactions
    if (reaction === 'bounce') y += Math.sin(Math.PI * rk) * 0.1 * H;
    if (reaction === 'shiver') rz += Math.sin(t * 45) * 0.05 * (1 - rk);

    // Dead: topple backwards
    if (s.isDead) {
      rx = -1.45;
      rz = 0;
      ry = 0;
      y = 0.03;
      sy = 0.97;
      sxz = 1.02;
    }

    const rate = 14;
    pivot.position.y = damp(pivot.position.y, y, rate, dt);
    pivot.rotation.x = damp(pivot.rotation.x, rx, rate, dt);
    pivot.rotation.y = damp(pivot.rotation.y, ry, rate, dt);
    pivot.rotation.z = damp(pivot.rotation.z, rz, rate, dt);
    pivot.scale.y = damp(pivot.scale.y, sy, rate, dt);
    const nxz = damp(pivot.scale.x, sxz, rate, dt);
    pivot.scale.x = nxz;
    pivot.scale.z = nxz;
  };

  const updateAnimation = (state: CharacterAnimationState, delta: number) => {
    if (usingModel) animateModel(state, delta);
    else proc.updateAnimation(state, delta);
  };

  const updateCustomization = (cust: CharacterCustomization) => {
    // Colour/accessory options only affect the procedural fallback; the GLB uses its own textures.
    proc.updateCustomization(cust);
  };

  return {
    ...proc,
    facialController,
    updateAnimation,
    updateCustomization
  };
}
