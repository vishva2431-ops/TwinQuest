import * as THREE from 'three';
import { CharacterCustomization, CharacterGender } from '../types/game';

/**
 * TwinQuest Realistic Character Rig & Dynamic Facial Animation Controller
 *
 * Visual & Technical Upgrades:
 * 1. Realistic Facial Texture & Anatomy (1024x1024 Multi-Layer Canvas):
 *    - Anatomical skin undertones with soft orbital, nasal, and jaw ambient occlusion
 *    - Realistic eye anatomy: dark limbal ring, fibrous radiating iris striations,
 *      reactive deep pupil, pink lacrimal caruncles, and softbox specular catchlights
 *    - Sculpted realistic nose with soft alar shadows and specular bridge/tip highlights
 *    - Realistic lips: Cupid's bow, defined vermilion border, vertical micro-creases,
 *      delicate hydration gloss sheen, and translucent enamel teeth line
 *    - Realistic feathered eyebrow hairs with natural stroke direction and feathered eyelashes
 * 2. 3D GPU Vertex Morph Targets (Blend Shapes):
 *    - 'blink', 'smile', 'surprise', 'determined'
 *    - Eyelid closure, cheek volume puffing, 3D mouth cavity depth, and brow furrowing
 * 3. Event-Driven Facial Animation Controller:
 *    - Responds to 'jump', 'collect_item', 'checkpoint', 'land', 'trap_near', and 'victory'
 *    - Natural human-like auto-blinking with occasional double-blinks
 * 4. Realistic Hair & Tailored Adventure Apparel:
 *    - Natural strand-layered realistic hairstyles with anisotropic sheen
 *    - Tailored fabric hoodies with visible seam stitching and metal aglets
 *    - Utility denim trousers and rugged athletic trail-running sneakers
 * 5. Full-Body Skeleton Rig with 2D Locomotion Blend Space:
 *    - Continuous Idle <-> Walk <-> Sprint cross-fading, landing squish, and banking
 *    - Dynamic secondary spring-damper physics for Maya's ponytail and drawstrings
 */

export interface FullBodySkeleton {
  root: THREE.Group;
  hips: THREE.Group;
  spineLower: THREE.Group;
  spineUpper: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  leftClavicle: THREE.Group;
  leftArm: THREE.Group;
  leftForearm: THREE.Group;
  leftHand: THREE.Group;
  rightClavicle: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  rightHand: THREE.Group;
  leftThigh: THREE.Group;
  leftCalf: THREE.Group;
  leftFoot: THREE.Group;
  rightThigh: THREE.Group;
  rightCalf: THREE.Group;
  rightFoot: THREE.Group;
  ponytailRoot?: THREE.Group;
  hoodCowl?: THREE.Group;
  leftDrawstring?: THREE.Group;
  rightDrawstring?: THREE.Group;
}

export interface CharacterAnimationState {
  velocity: THREE.Vector3;
  isGrounded: boolean;
  isJumping: boolean;
  isFalling: boolean;
  isDead: boolean;
  isCheering: boolean;
  lookAtPartnerPos?: THREE.Vector3;
  isSurprised?: boolean;
  facialExpression?: 'auto' | 'smile' | 'wide_smile' | 'surprise' | 'blink' | 'determined' | 'neutral';
}

export type FacialBlendShapeName = 'blink' | 'smile' | 'surprise' | 'determined';

export type GameFacialEvent = 'jump' | 'collect_item' | 'checkpoint' | 'trap_near' | 'land' | 'victory' | 'blink';

export interface FacialAnimationController {
  faceMesh?: THREE.Mesh;
  blendShapes: Record<FacialBlendShapeName, number>;
  setBlendShape: (name: FacialBlendShapeName, weight: number) => void;
  getBlendShape: (name: FacialBlendShapeName) => number;
  triggerEvent: (event: GameFacialEvent, options?: { duration?: number }) => void;
  setExpression: (expr: FacialExpressionType, duration?: number) => void;
  triggerBlink: (duration?: number) => void;
  update: (delta: number, animState: CharacterAnimationState) => void;
}

export interface CharacterRig {
  group: THREE.Group;
  gender: CharacterGender;
  skeleton: FullBodySkeleton;
  // Direct joint accessors for backward-compatibility
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  hairGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftCalf: THREE.Group;
  rightCalf: THREE.Group;
  leftFoot: THREE.Group;
  rightFoot: THREE.Group;
  glassesMesh?: THREE.Mesh;
  pendantMesh?: THREE.Mesh;
  backpackMesh?: THREE.Mesh;
  materials: THREE.Material[];
  facialController: FacialAnimationController;
  triggerFacialExpression: (expr: 'smile' | 'wide_smile' | 'surprise' | 'blink' | 'determined', duration?: number) => void;
  updateAnimation: (state: CharacterAnimationState, delta: number) => void;
  updateCustomization: (cust: CharacterCustomization) => void;
}

export type FacialExpressionType = 'neutral' | 'smile' | 'wide_smile' | 'surprise' | 'determined' | 'blink';

interface FaceState {
  expression: FacialExpressionType;
  blinkProgress: number; // 0.0 (open) to 1.0 (closed)
  eyeScale: number; // 1.0 normal, 1.14 in surprise
  eyebrowOffset: number; // -1 to 1 (vertical shift)
  eyebrowSlant: number; // -1 to 1 (angle)
  mouthType: 'neutral' | 'smile' | 'wide_smile' | 'surprise_o' | 'determined';
  blushIntensity: number; // 0.0 to 1.0
}

/**
 * Procedural High-Frequency Micro-Pore & Epidermal Bump Texture Generator
 * Generates organic cellular porosity, follicular pits, and micro-dermal ridges
 */
let sharedPoreTexture: THREE.CanvasTexture | null = null;

function getSharedPoreBumpTexture(): THREE.CanvasTexture {
  if (sharedPoreTexture) return sharedPoreTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return fallback;
  }

  // 50% neutral midtone for bump mapping
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Generate multi-frequency epidermal micro-relief
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // 1. Cellular micro-pore stippling
      const n1 = Math.sin(x * 0.42) * Math.cos(y * 0.42);
      const n2 = Math.sin(x * 0.88 + y * 0.28) * Math.cos(y * 0.88 - x * 0.28);
      const n3 = Math.sin(x * 1.76 + 1.1) * Math.cos(y * 1.76 + 0.6);

      // 2. Micro pore pits: realistic follicular indentations
      const isPore = ((x * 37 + y * 19) % 29 === 0) || ((x * 47 + y * 31) % 41 === 0);
      const poreIndent = isPore ? -26 : 0;

      // 3. Subtle micro-dermal grain
      const grain = ((x ^ y) & 7) - 3.5;

      const bumpVal = Math.max(0, Math.min(255, 128 + Math.round((n1 * 5 + n2 * 4 + n3 * 3) + poreIndent + grain)));

      data[idx] = bumpVal;
      data[idx + 1] = bumpVal;
      data[idx + 2] = bumpVal;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  sharedPoreTexture = texture;
  return texture;
}

export interface SSSShaderOptions {
  sssColorHex?: string;
  bloodColorHex?: string;
  intensity?: number;
  translucencyScale?: number;
  translucencyPower?: number;
  translucencyDistortion?: number;
  isEar?: boolean;
}

/**
 * Injects physically-inspired Subsurface Scattering (SSS) shader into Three.js MeshPhysicalMaterial.
 * Simulates dual-lobe epidermal/dermal scattering and soft light penetration through ears, nose, and thin facial features.
 */
function applySubsurfaceScattering(material: THREE.MeshPhysicalMaterial, options: SSSShaderOptions = {}) {
  const sssColor = options.sssColorHex ?? '#fb7185';
  const bloodColor = options.bloodColorHex ?? '#e11d48';
  const intensity = options.intensity ?? 0.40;
  const translucencyScale = options.translucencyScale ?? 0.55;
  const translucencyPower = options.translucencyPower ?? 2.4;
  const translucencyDistortion = options.translucencyDistortion ?? 0.32;
  const isEar = options.isEar ? 1.0 : 0.0;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSssScatterColor = { value: new THREE.Color(sssColor) };
    shader.uniforms.uSssBloodColor = { value: new THREE.Color(bloodColor) };
    shader.uniforms.uSssIntensity = { value: intensity };
    shader.uniforms.uTranslucencyScale = { value: translucencyScale };
    shader.uniforms.uTranslucencyPower = { value: translucencyPower };
    shader.uniforms.uTranslucencyDistortion = { value: translucencyDistortion };
    shader.uniforms.uIsEar = { value: isEar };

    // 1. Pass local model position from vertex shader
    shader.vertexShader = `
      varying vec3 vModelPos;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vModelPos = position;
      `
    );

    // 2. Fragment shader definitions
    shader.fragmentShader = `
      uniform vec3 uSssScatterColor;
      uniform vec3 uSssBloodColor;
      uniform float uSssIntensity;
      uniform float uTranslucencyScale;
      uniform float uTranslucencyPower;
      uniform float uTranslucencyDistortion;
      uniform float uIsEar;
      varying vec3 vModelPos;
    ` + shader.fragmentShader;

    // 3. Subsurface Scattering wrap & light transmittance injection
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
      #ifdef USE_NORMAL
        // --- 1. Dual-Lobe Forward Wrap Scattering (Terminator Capillary Flush) ---
        vec3 keyLightDir = normalize(vec3(0.38, 0.82, 0.44));
        float nDotL = dot(geometryNormal, keyLightDir);

        // Epidermal wrap (softer falloff)
        float wrapEpidermal = clamp((nDotL + 0.48) / 1.48, 0.0, 1.0);
        float epidermalTerminator = smoothstep(0.01, 0.42, wrapEpidermal) * (1.0 - smoothstep(0.22, 0.86, wrapEpidermal));

        // Deep dermal / subcutaneous wrap (narrower, deep red capillary bleed)
        float wrapDermal = clamp((nDotL + 0.32) / 1.32, 0.0, 1.0);
        float dermalTerminator = smoothstep(0.02, 0.35, wrapDermal) * (1.0 - smoothstep(0.18, 0.72, wrapDermal));

        // --- 2. Thin Cartilage & Facial Feature Translucency (Light Penetration) ---
        // Back-light / rim vectors that penetrate from behind ears and head
        vec3 backLight1 = normalize(vec3(0.0, 0.45, -0.89));
        vec3 backLight2 = normalize(vec3(-0.65, 0.35, -0.67));

        vec3 viewVec = normalize(vViewPosition);

        // Jimenez translucency formula: dot(viewVec, -(light + normal * distortion))
        vec3 transLight1 = normalize(backLight1 + geometryNormal * uTranslucencyDistortion);
        float transDot1 = max(0.0, dot(-viewVec, -transLight1));
        float transGlow1 = pow(transDot1, uTranslucencyPower);

        vec3 transLight2 = normalize(backLight2 + geometryNormal * uTranslucencyDistortion);
        float transDot2 = max(0.0, dot(-viewVec, -transLight2));
        float transGlow2 = pow(transDot2, uTranslucencyPower);

        float totalTranslucency = (transGlow1 * 0.7 + transGlow2 * 0.5) * uTranslucencyScale;

        // Anatomical thin-wall thickness multiplier:
        // Ears, nostril wings, and lips have much higher light transmittance
        float thicknessMod = 1.0;
        if (uIsEar > 0.5) {
          thicknessMod = 2.6; // Strong luminous ear translucency
        } else {
          // Detect thin nose tip and lips on face mesh
          float noseDist = length(vModelPos - vec3(0.0, 0.02, 0.16));
          if (noseDist < 0.09) {
            thicknessMod += (1.0 - noseDist / 0.09) * 1.6;
          }
          // Lateral head curvature (near ear roots)
          float earProximity = smoothstep(0.12, 0.20, abs(vModelPos.x));
          thicknessMod += earProximity * 1.3;
        }

        // Combine epidermal peach scatter + rich vascular ruby/amber back-scatter
        vec3 sssEpidermal = uSssScatterColor * epidermalTerminator * uSssIntensity;
        vec3 sssSubcutaneous = uSssBloodColor * dermalTerminator * (uSssIntensity * 0.85);
        vec3 sssTransmittance = uSssBloodColor * (totalTranslucency * thicknessMod);

        gl_FragColor.rgb += gl_FragColor.rgb * (sssEpidermal + sssSubcutaneous) + sssTransmittance;
      #endif
      `
    );
  };
}

/**
 * High-Resolution (1024x1024) Realistic Morphing Face Texture Controller
 */
class FaceExpressionController implements FacialAnimationController {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  private gender: CharacterGender;
  private skinTone: string;
  private eyeColorHex: string;
  private hairColorHex: string;

  // Animation & Blinking State
  private currentState: FaceState;
  private targetState: FaceState;
  private blinkTimer: number = 2.0 + Math.random() * 2.5;
  private isBlinking: boolean = false;
  private blinkElapsed: number = 0;
  private blinkDuration: number = 0.14;
  private isDoubleBlink: boolean = false;
  private doubleBlinkQueued: boolean = false;
  private expressionOverrideTimer: number = 0;
  private isDirty: boolean = true;

  // 3D Morph Target Mesh & Blend Shape Weights
  public faceMesh?: THREE.Mesh;
  public blendShapes: Record<FacialBlendShapeName, number> = {
    blink: 0,
    smile: 0.6,
    surprise: 0,
    determined: 0
  };
  private targetBlendShapes: Record<FacialBlendShapeName, number> = {
    blink: 0,
    smile: 0.6,
    surprise: 0,
    determined: 0
  };

  constructor(
    gender: CharacterGender,
    skinTone: string,
    eyeColorHex: string,
    hairColorHex: string
  ) {
    this.gender = gender;
    this.skinTone = skinTone;
    this.eyeColorHex = eyeColorHex;
    this.hairColorHex = hairColorHex;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    this.ctx = this.canvas.getContext('2d')!;

    this.currentState = {
      expression: 'smile',
      blinkProgress: 0,
      eyeScale: 1.0,
      eyebrowOffset: 0,
      eyebrowSlant: 0,
      mouthType: 'smile',
      blushIntensity: 0.5
    };

    this.targetState = { ...this.currentState };

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.render();
  }

  public setCustomization(skinTone: string, eyeColorHex: string, hairColorHex: string) {
    this.skinTone = skinTone;
    this.eyeColorHex = eyeColorHex;
    this.hairColorHex = hairColorHex;
    this.isDirty = true;
    this.render();
  }

  public setExpression(expr: FacialExpressionType, duration: number = 1.0) {
    this.targetState.expression = expr;
    this.expressionOverrideTimer = duration;

    switch (expr) {
      case 'surprise':
        this.targetState.eyeScale = 1.15;
        this.targetState.eyebrowOffset = 1.0;
        this.targetState.eyebrowSlant = 0.4;
        this.targetState.mouthType = 'surprise_o';
        this.targetState.blushIntensity = 0.85;
        break;
      case 'wide_smile':
        this.targetState.eyeScale = 1.04;
        this.targetState.eyebrowOffset = 0.3;
        this.targetState.eyebrowSlant = 0.1;
        this.targetState.mouthType = 'wide_smile';
        this.targetState.blushIntensity = 0.8;
        break;
      case 'determined':
        this.targetState.eyeScale = 0.98;
        this.targetState.eyebrowOffset = -0.3;
        this.targetState.eyebrowSlant = -0.55;
        this.targetState.mouthType = 'determined';
        this.targetState.blushIntensity = 0.4;
        break;
      case 'smile':
        this.targetState.eyeScale = 1.0;
        this.targetState.eyebrowOffset = 0.1;
        this.targetState.eyebrowSlant = 0.0;
        this.targetState.mouthType = 'smile';
        this.targetState.blushIntensity = 0.55;
        break;
      case 'blink':
        this.targetState.blinkProgress = 1.0;
        break;
      case 'neutral':
      default:
        this.targetState.eyeScale = 1.0;
        this.targetState.eyebrowOffset = 0.0;
        this.targetState.eyebrowSlant = 0.0;
        this.targetState.mouthType = 'neutral';
        this.targetState.blushIntensity = 0.45;
        break;
    }
    this.isDirty = true;
  }

  public setBlendShape(name: FacialBlendShapeName, weight: number) {
    this.targetBlendShapes[name] = THREE.MathUtils.clamp(weight, 0, 1);
    this.isDirty = true;
  }

  public getBlendShape(name: FacialBlendShapeName): number {
    return this.blendShapes[name];
  }

  public triggerBlink(duration: number = 0.14) {
    this.isBlinking = true;
    this.blinkElapsed = 0;
    this.blinkDuration = duration;
    this.isDirty = true;
  }

  public triggerEvent(event: GameFacialEvent, options?: { duration?: number }) {
    const dur = options?.duration ?? 1.3;
    switch (event) {
      case 'jump':
        // JUMP EVENT: Thrilled surprise on takeoff with wide eyes
        this.setExpression('surprise', 0.45);
        this.targetBlendShapes.surprise = 0.85;
        this.targetBlendShapes.smile = 0.2;
        this.targetBlendShapes.determined = 0.4;
        break;
      case 'collect_item':
        // COLLECT ITEM: Radiant genuine smile with visible teeth gleam
        this.setExpression('wide_smile', dur);
        this.targetBlendShapes.smile = 1.0;
        this.targetBlendShapes.surprise = 0.0;
        this.targetBlendShapes.determined = 0.0;
        break;
      case 'checkpoint':
        // CHECKPOINT: Confident adventure smile
        this.setExpression('smile', dur);
        this.targetBlendShapes.smile = 0.9;
        this.targetBlendShapes.surprise = 0.0;
        break;
      case 'trap_near':
        // HAZARD / TRAP NEAR: Startled surprise with open "O" mouth
        this.setExpression('surprise', dur);
        this.targetBlendShapes.surprise = 1.0;
        this.targetBlendShapes.smile = 0.0;
        break;
      case 'land':
        // LANDING IMPACT: Natural impact blink
        this.triggerBlink(0.12);
        break;
      case 'victory':
        // VICTORY: Joyful wide smile and celebration
        this.setExpression('wide_smile', 3.5);
        this.targetBlendShapes.smile = 1.0;
        this.targetBlendShapes.surprise = 0.0;
        break;
      case 'blink':
        this.triggerBlink(0.14);
        break;
    }
  }

  public update(delta: number, animState: CharacterAnimationState) {
    // 1. Expression Override Countdown
    if (this.expressionOverrideTimer > 0) {
      this.expressionOverrideTimer -= delta;
      if (this.expressionOverrideTimer <= 0) {
        this.applyContextExpression(animState);
      }
    } else {
      this.applyContextExpression(animState);
    }

    // 2. Natural Auto-Blink Controller
    this.blinkTimer -= delta;
    if (this.blinkTimer <= 0 && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkElapsed = 0;
      this.blinkDuration = 0.13 + Math.random() * 0.03;
      this.doubleBlinkQueued = Math.random() < 0.25;
    }

    if (this.isBlinking) {
      this.blinkElapsed += delta;
      const t = this.blinkElapsed / this.blinkDuration;
      if (t < 0.4) {
        this.targetState.blinkProgress = t / 0.4;
      } else if (t < 0.6) {
        this.targetState.blinkProgress = 1.0;
      } else if (t < 1.0) {
        this.targetState.blinkProgress = 1.0 - (t - 0.6) / 0.4;
      } else {
        this.targetState.blinkProgress = 0;
        this.isBlinking = false;
        if (this.doubleBlinkQueued) {
          this.doubleBlinkQueued = false;
          this.blinkTimer = 0.08;
        } else {
          this.blinkTimer = 2.5 + Math.random() * 3.5;
        }
      }
      this.isDirty = true;
    }

    // 3. Smooth parameter interpolation
    const lerpSpeed = 14 * delta;
    let paramChanged = false;

    const diffBlink = this.targetState.blinkProgress - this.currentState.blinkProgress;
    if (Math.abs(diffBlink) > 0.01) {
      this.currentState.blinkProgress += diffBlink * Math.min(1, lerpSpeed * 1.5);
      paramChanged = true;
    } else {
      this.currentState.blinkProgress = this.targetState.blinkProgress;
    }

    const diffScale = this.targetState.eyeScale - this.currentState.eyeScale;
    if (Math.abs(diffScale) > 0.005) {
      this.currentState.eyeScale += diffScale * Math.min(1, lerpSpeed);
      paramChanged = true;
    }

    const diffBrowY = this.targetState.eyebrowOffset - this.currentState.eyebrowOffset;
    if (Math.abs(diffBrowY) > 0.01) {
      this.currentState.eyebrowOffset += diffBrowY * Math.min(1, lerpSpeed);
      paramChanged = true;
    }

    const diffBrowS = this.targetState.eyebrowSlant - this.currentState.eyebrowSlant;
    if (Math.abs(diffBrowS) > 0.01) {
      this.currentState.eyebrowSlant += diffBrowS * Math.min(1, lerpSpeed);
      paramChanged = true;
    }

    if (this.currentState.mouthType !== this.targetState.mouthType) {
      this.currentState.mouthType = this.targetState.mouthType;
      paramChanged = true;
    }

    const diffBlush = this.targetState.blushIntensity - this.currentState.blushIntensity;
    if (Math.abs(diffBlush) > 0.01) {
      this.currentState.blushIntensity += diffBlush * Math.min(1, lerpSpeed);
      paramChanged = true;
    }

    // Update target blend shapes based on current expression
    switch (this.targetState.expression) {
      case 'surprise':
        this.targetBlendShapes.surprise = 1.0;
        this.targetBlendShapes.smile = 0.0;
        this.targetBlendShapes.determined = 0.0;
        break;
      case 'wide_smile':
        this.targetBlendShapes.smile = 1.0;
        this.targetBlendShapes.surprise = 0.0;
        this.targetBlendShapes.determined = 0.0;
        break;
      case 'smile':
        this.targetBlendShapes.smile = 0.7;
        this.targetBlendShapes.surprise = 0.0;
        this.targetBlendShapes.determined = 0.0;
        break;
      case 'determined':
        this.targetBlendShapes.determined = 0.9;
        this.targetBlendShapes.smile = 0.2;
        this.targetBlendShapes.surprise = 0.0;
        break;
      case 'neutral':
      default:
        this.targetBlendShapes.smile = 0.1;
        this.targetBlendShapes.surprise = 0.0;
        this.targetBlendShapes.determined = 0.0;
        break;
    }

    this.targetBlendShapes.blink = this.currentState.blinkProgress;

    // Smoothly damp blend shapes
    const blendNames: FacialBlendShapeName[] = ['blink', 'smile', 'surprise', 'determined'];
    for (let k = 0; k < blendNames.length; k++) {
      const bn = blendNames[k];
      this.blendShapes[bn] = THREE.MathUtils.damp(this.blendShapes[bn], this.targetBlendShapes[bn], 16, delta);
    }

    // Drive 3D Mesh Morph Target Influences on GPU
    if (this.faceMesh && this.faceMesh.morphTargetInfluences) {
      this.faceMesh.morphTargetInfluences[0] = this.blendShapes.blink;
      this.faceMesh.morphTargetInfluences[1] = this.blendShapes.smile;
      this.faceMesh.morphTargetInfluences[2] = this.blendShapes.surprise;
      this.faceMesh.morphTargetInfluences[3] = this.blendShapes.determined;
    }

    if (paramChanged || this.isDirty) {
      this.render();
      this.texture.needsUpdate = true;
      this.isDirty = false;
    }
  }

  private applyContextExpression(animState: CharacterAnimationState) {
    if (animState.facialExpression && animState.facialExpression !== 'auto') {
      this.setExpression(animState.facialExpression as FacialExpressionType, 0.2);
      return;
    }

    if (animState.isDead) {
      this.setExpression('surprise', 0.5);
      return;
    }

    if (animState.isCheering) {
      this.setExpression('wide_smile', 0.5);
      return;
    }

    if (animState.isSurprised) {
      this.setExpression('surprise', 0.8);
      return;
    }

    const speed = Math.sqrt(animState.velocity.x * animState.velocity.x + animState.velocity.z * animState.velocity.z);

    if (!animState.isGrounded || speed > 5.0) {
      this.setExpression('determined', 0.3);
    } else {
      this.setExpression('smile', 0.3);
    }
  }

  /**
   * Ultra-High Quality 1024x1024 Realistic Facial Texture Render Routine
   * Creates authentic human anatomical features, realistic irises, and soft specular shading
   */
  private render() {
    const ctx = this.ctx;
    const isBoy = this.gender === 'boy';
    const s = this.currentState;

    ctx.clearRect(0, 0, 1024, 1024);

    // 1. Natural Base Skin Tone with Subsurface Scattering Undertone
    ctx.fillStyle = this.skinTone;
    ctx.fillRect(0, 0, 1024, 1024);

    // Warm dermal undertone gradient
    const sssGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 500);
    sssGrad.addColorStop(0, 'rgba(255, 140, 110, 0.08)');
    sssGrad.addColorStop(0.7, 'rgba(230, 100, 80, 0.04)');
    sssGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sssGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Anatomical Orbital & Temples Shadow (Around eye sockets)
    [-1, 1].forEach((dir) => {
      const eyeCx = 512 + dir * 182;
      const eyeCy = 405;
      const socketGrad = ctx.createRadialGradient(eyeCx, eyeCy, 40, eyeCx, eyeCy, 140);
      socketGrad.addColorStop(0, 'rgba(120, 60, 45, 0.09)');
      socketGrad.addColorStop(0.7, 'rgba(120, 60, 45, 0.03)');
      socketGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = socketGrad;
      ctx.beginPath();
      ctx.arc(eyeCx, eyeCy, 140, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sub-mandibular & Jawline Contour
    const jawGrad = ctx.createLinearGradient(0, 560, 0, 1024);
    jawGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    jawGrad.addColorStop(0.7, 'rgba(140, 70, 50, 0.08)');
    jawGrad.addColorStop(1, 'rgba(100, 45, 35, 0.18)');
    ctx.fillStyle = jawGrad;
    ctx.fillRect(0, 560, 1024, 464);

    // 2. Realistic Zygomatic Cheekbone Blush & Highlights
    const blushAlpha = s.blushIntensity * (isBoy ? 0.22 : 0.32);
    const blushColor = isBoy ? `rgba(225, 115, 65, ${blushAlpha})` : `rgba(235, 95, 130, ${blushAlpha})`;

    [-1, 1].forEach((dir) => {
      const cx = 512 + dir * 240;
      const cy = 550;
      const cheekGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140);
      cheekGrad.addColorStop(0, blushColor);
      cheekGrad.addColorStop(0.6, isBoy ? `rgba(225, 115, 65, ${blushAlpha * 0.35})` : `rgba(235, 95, 130, ${blushAlpha * 0.35})`);
      cheekGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = cheekGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 130, 75, dir * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Realistic skin specular highlight along cheekbone
      const specGrad = ctx.createRadialGradient(cx, cy - 35, 2, cx, cy - 35, 55);
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 35, 50, 22, dir * 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Realistic Sculpted Nose Anatomy
    // A. Nasal Bridge Shadow Contours
    ctx.fillStyle = 'rgba(140, 65, 45, 0.10)';
    ctx.beginPath();
    ctx.moveTo(494, 380);
    ctx.lineTo(492, 530);
    ctx.lineTo(502, 538);
    ctx.lineTo(502, 380);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(530, 380);
    ctx.lineTo(532, 530);
    ctx.lineTo(522, 538);
    ctx.lineTo(522, 380);
    ctx.fill();

    // B. Alar Cartilage (Nostril Wings) & Tip
    const noseTipY = 546;
    ctx.fillStyle = 'rgba(160, 70, 50, 0.14)';
    ctx.beginPath();
    ctx.ellipse(512, noseTipY, 26, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle natural nostril curves
    [-1, 1].forEach((dir) => {
      ctx.fillStyle = 'rgba(100, 35, 25, 0.35)';
      ctx.beginPath();
      ctx.ellipse(512 + dir * 16, noseTipY + 4, 8, 4.5, dir * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    // C. Realistic Specular Highlight on Nose Tip & Bridge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(512, noseTipY - 6, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(512, 455, 3.5, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // D. Realistic Philtrum Columns (Groove between nose and Cupid's bow)
    const philtrumGrad = ctx.createLinearGradient(0, noseTipY + 6, 0, 640);
    philtrumGrad.addColorStop(0, 'rgba(140, 65, 45, 0.12)');
    philtrumGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.strokeStyle = philtrumGrad;
    ctx.lineWidth = 3;
    [-6, 6].forEach((ox) => {
      ctx.beginPath();
      ctx.moveTo(512 + ox, noseTipY + 8);
      ctx.lineTo(512 + ox * 1.3, 636);
      ctx.stroke();
    });

    // 4. Realistic Lips with Cupid's Bow & Hydration Gloss
    const mouthCenterY = 665;

    if (s.mouthType === 'surprise_o') {
      // Realistic open "O" mouth with genuine oral cavity depth
      ctx.fillStyle = '#2b0910';
      ctx.beginPath();
      ctx.ellipse(512, mouthCenterY + 16, 32, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper tooth arch inside
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(512, mouthCenterY - 4, 24, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.fill();

      // Tongue tone
      ctx.fillStyle = '#a83c50';
      ctx.beginPath();
      ctx.arc(512, mouthCenterY + 42, 18, Math.PI, Math.PI * 2);
      ctx.fill();

      // Realistic vermilion border
      ctx.strokeStyle = isBoy ? '#9c3848' : '#b3415c';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.ellipse(512, mouthCenterY + 16, 34, 46, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.mouthType === 'wide_smile') {
      // Radiant open smile with individual teeth delineation
      ctx.beginPath();
      ctx.moveTo(420, mouthCenterY - 4);
      ctx.quadraticCurveTo(512, mouthCenterY + 68, 604, mouthCenterY - 4);
      ctx.quadraticCurveTo(512, mouthCenterY + 12, 420, mouthCenterY - 4);
      ctx.closePath();
      ctx.fillStyle = '#2e0a12';
      ctx.fill();

      // Upper teeth row
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(436, mouthCenterY);
      ctx.quadraticCurveTo(512, mouthCenterY + 32, 588, mouthCenterY);
      ctx.quadraticCurveTo(512, mouthCenterY + 8, 436, mouthCenterY);
      ctx.fill();

      // Subtle vertical tooth separator lines
      ctx.strokeStyle = 'rgba(180, 160, 160, 0.28)';
      ctx.lineWidth = 1.5;
      [-28, -14, 0, 14, 28].forEach((tx) => {
        ctx.beginPath();
        ctx.moveTo(512 + tx, mouthCenterY + 4);
        ctx.lineTo(512 + tx, mouthCenterY + 24);
        ctx.stroke();
      });

      // Upper Lip
      ctx.beginPath();
      ctx.moveTo(416, mouthCenterY - 6);
      ctx.quadraticCurveTo(464, mouthCenterY - 14, 498, mouthCenterY - 16);
      ctx.quadraticCurveTo(512, mouthCenterY - 12, 526, mouthCenterY - 16);
      ctx.quadraticCurveTo(560, mouthCenterY - 14, 608, mouthCenterY - 6);
      ctx.quadraticCurveTo(512, mouthCenterY - 2, 416, mouthCenterY - 6);
      ctx.fillStyle = isBoy ? '#a34856' : '#b8425a';
      ctx.fill();

      // Lower Lip with realistic hydration sheen
      ctx.beginPath();
      ctx.moveTo(422, mouthCenterY - 2);
      ctx.quadraticCurveTo(512, mouthCenterY + 76, 602, mouthCenterY - 2);
      ctx.quadraticCurveTo(512, mouthCenterY + 64, 422, mouthCenterY - 2);
      ctx.fillStyle = isBoy ? '#b85464' : '#cc4d68';
      ctx.fill();

      // Gloss reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(512, mouthCenterY + 54, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Natural closed smile with realistic Cupid's bow and lip creases
      // A. Upper Lip with Cupid's bow
      ctx.beginPath();
      ctx.moveTo(436, mouthCenterY);
      ctx.quadraticCurveTo(476, mouthCenterY - 12, 498, mouthCenterY - 14);
      ctx.quadraticCurveTo(512, mouthCenterY - 9, 526, mouthCenterY - 14);
      ctx.quadraticCurveTo(548, mouthCenterY - 12, 588, mouthCenterY);
      ctx.quadraticCurveTo(512, mouthCenterY + 4, 436, mouthCenterY);
      ctx.closePath();
      ctx.fillStyle = isBoy ? '#a34856' : '#b8425a';
      ctx.fill();

      // B. Lower Lip
      ctx.beginPath();
      ctx.moveTo(442, mouthCenterY + 2);
      ctx.quadraticCurveTo(512, mouthCenterY + (isBoy ? 44 : 52), 582, mouthCenterY + 2);
      ctx.quadraticCurveTo(512, mouthCenterY + 8, 442, mouthCenterY + 2);
      ctx.closePath();
      ctx.fillStyle = isBoy ? '#b85464' : '#cc4d68';
      ctx.fill();

      // C. Lip Seam Line with corner nodes
      ctx.strokeStyle = isBoy ? '#661b28' : '#77182e';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(434, mouthCenterY - 1);
      ctx.quadraticCurveTo(512, mouthCenterY + (isBoy ? 22 : 28), 590, mouthCenterY - 1);
      ctx.stroke();

      // Corner mouth dimple shadow
      [-1, 1].forEach((dir) => {
        ctx.fillStyle = 'rgba(100, 25, 35, 0.4)';
        ctx.beginPath();
        ctx.arc(512 + dir * 76, mouthCenterY - 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // D. Realistic Vertical Lip Creases
      ctx.strokeStyle = 'rgba(90, 25, 35, 0.16)';
      ctx.lineWidth = 1.2;
      [-32, -20, -8, 8, 20, 32].forEach((lx) => {
        ctx.beginPath();
        ctx.moveTo(512 + lx, mouthCenterY + 6);
        ctx.lineTo(512 + lx * 1.05, mouthCenterY + 34);
        ctx.stroke();
      });

      // E. Soft Lip Hydration Gloss
      ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.beginPath();
      ctx.ellipse(512, mouthCenterY + 26, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Realistic Human Eye Anatomy (Multi-Tier Refraction & Trabecular Fibers)
    [-1, 1].forEach((dir) => {
      const eyeX = 512 + dir * 182;
      const eyeBaseY = 405;
      const eyeW = 90 * s.eyeScale;
      const eyeH = 105 * s.eyeScale;
      const eyeOpenHeight = eyeH * Math.max(0.04, 1.0 - s.blinkProgress);

      if (s.blinkProgress > 0.88) {
        // === Closed Eye: Realistic Curved Eyelid Margin & Individual Lashes ===
        ctx.strokeStyle = '#2b1b17';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eyeX - dir * eyeW * 0.95, eyeBaseY + 6);
        ctx.quadraticCurveTo(eyeX, eyeBaseY - 16, eyeX + dir * eyeW * 1.05, eyeBaseY + 8);
        ctx.stroke();

        // Individual realistic fine eyelashes curving downward
        ctx.strokeStyle = '#1e1411';
        ctx.lineWidth = 2;
        for (let l = -35; l <= 35; l += 8) {
          ctx.beginPath();
          ctx.moveTo(eyeX + l * dir * 1.1, eyeBaseY - 6 + Math.abs(l) * 0.25);
          ctx.quadraticCurveTo(
            eyeX + (l + 4) * dir * 1.1,
            eyeBaseY + 8,
            eyeX + (l + 8) * dir * 1.1,
            eyeBaseY + 14
          );
          ctx.stroke();
        }
      } else {
        // === Open Eye: Realistic Eye Socket, Iris, & Specular Highlights ===
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeBaseY, eyeW, eyeOpenHeight, 0, 0, Math.PI * 2);
        ctx.clip();

        // A. Natural Ivory Sclera with vascular gradient
        ctx.fillStyle = '#f8f7f4';
        ctx.fillRect(eyeX - eyeW - 10, eyeBaseY - eyeH - 10, eyeW * 2 + 20, eyeH * 2 + 20);

        // Pinkish lacrimal caruncle gradient (Inner eye corner)
        const caruncleX = eyeX - dir * eyeW * 0.85;
        const caruncleGrad = ctx.createRadialGradient(caruncleX, eyeBaseY, 2, caruncleX, eyeBaseY, 26);
        caruncleGrad.addColorStop(0, 'rgba(235, 120, 115, 0.45)');
        caruncleGrad.addColorStop(1, 'rgba(248, 247, 244, 0)');
        ctx.fillStyle = caruncleGrad;
        ctx.beginPath();
        ctx.arc(caruncleX, eyeBaseY, 26, 0, Math.PI * 2);
        ctx.fill();

        // Soft Upper Eyelid Ambient Shadow cast onto eyeball
        const eyeShadowGrad = ctx.createLinearGradient(eyeX, eyeBaseY - eyeOpenHeight, eyeX, eyeBaseY);
        eyeShadowGrad.addColorStop(0, 'rgba(70, 45, 40, 0.38)');
        eyeShadowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = eyeShadowGrad;
        ctx.fillRect(eyeX - eyeW, eyeBaseY - eyeOpenHeight, eyeW * 2, eyeOpenHeight);

        // B. Realistic Multi-Layer Iris
        const irisX = eyeX + dir * 4;
        const irisY = eyeBaseY + 10 * (1 - s.blinkProgress * 0.5);
        const irisR = 64 * s.eyeScale;

        // Dark Limbal Ring (Authentic realistic eye border)
        ctx.fillStyle = '#0a1017';
        ctx.beginPath();
        ctx.arc(irisX, irisY, irisR + 2, 0, Math.PI * 2);
        ctx.fill();

        // Primary Iris Base Gradient
        const irisGrad = ctx.createRadialGradient(irisX, irisY - 10, 8, irisX, irisY, irisR);
        if (isBoy) {
          // Leo: Deep Realistic Sapphire Blue with warm hazel collarette
          irisGrad.addColorStop(0, '#7dd3fc'); // Luminous cyan center
          irisGrad.addColorStop(0.25, '#38bdf8'); // Sky blue
          irisGrad.addColorStop(0.65, '#0284c7'); // Deep oceanic blue
          irisGrad.addColorStop(0.92, '#0c4a6e'); // Midnight navy
          irisGrad.addColorStop(1.0, '#041d2d'); // Dark limbal rim
        } else {
          // Maya: Radiant Amber-Hazel with coral ring
          irisGrad.addColorStop(0, '#fef08a'); // Warm golden center
          irisGrad.addColorStop(0.28, '#f59e0b'); // Amber
          irisGrad.addColorStop(0.68, '#b45309'); // Warm hazel brown
          irisGrad.addColorStop(0.92, '#78350f'); // Dark chestnut
          irisGrad.addColorStop(1.0, '#381608'); // Dark rim
        }
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
        ctx.fill();

        // Crystalline Anterior Chamber Caustic Refraction Glow (Opposite to key light)
        const causticGrad = ctx.createRadialGradient(irisX - 18, irisY + 16, 2, irisX - 18, irisY + 16, 26);
        causticGrad.addColorStop(0, isBoy ? 'rgba(125, 211, 252, 0.45)' : 'rgba(254, 240, 138, 0.48)');
        causticGrad.addColorStop(0.7, isBoy ? 'rgba(56, 189, 248, 0.20)' : 'rgba(245, 158, 11, 0.22)');
        causticGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = causticGrad;
        ctx.beginPath();
        ctx.arc(irisX - 18, irisY + 16, 26, 0, Math.PI * 2);
        ctx.fill();

        // Realistic Radiating Trabecular Iris Fibers
        ctx.lineWidth = 1.6;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
          const fiberGrad = ctx.createLinearGradient(
            irisX + Math.cos(a) * 14,
            irisY + Math.sin(a) * 14,
            irisX + Math.cos(a) * irisR,
            irisY + Math.sin(a) * irisR
          );
          fiberGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
          fiberGrad.addColorStop(0.6, isBoy ? 'rgba(186, 230, 253, 0.25)' : 'rgba(253, 230, 138, 0.25)');
          fiberGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.strokeStyle = fiberGrad;
          ctx.beginPath();
          ctx.moveTo(irisX + Math.cos(a) * 14, irisY + Math.sin(a) * 14);
          ctx.lineTo(irisX + Math.cos(a) * (irisR - 4), irisY + Math.sin(a) * (irisR - 4));
          ctx.stroke();
        }

        // C. Deep Reactive Pupil
        const pupilRadius = s.mouthType === 'surprise_o' ? 20 : 25;
        ctx.fillStyle = '#05070a';
        ctx.beginPath();
        ctx.arc(irisX, irisY - 2, pupilRadius, 0, Math.PI * 2);
        ctx.fill();

        // D. Studio Softbox & Multi-Layer Corneal Catchlights (Cinematic Photorealism)
        // 1. Soft atmospheric outer glow halo around key reflection
        const catchlightGlow = ctx.createRadialGradient(irisX + 16, irisY - 20, 2, irisX + 16, irisY - 20, 22);
        catchlightGlow.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
        catchlightGlow.addColorStop(0.5, 'rgba(224, 242, 254, 0.18)');
        catchlightGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = catchlightGlow;
        ctx.beginPath();
        ctx.arc(irisX + 16, irisY - 20, 22, 0, Math.PI * 2);
        ctx.fill();

        // 2. Primary studio octabox / softbox catchlight (upper right)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.beginPath();
        ctx.roundRect(irisX + 10, irisY - 24, 15, 11, 2.5);
        ctx.fill();

        // Pinpoint specular core inside softbox
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(irisX + 15, irisY - 19, 3, 0, Math.PI * 2);
        ctx.fill();

        // 3. Secondary ambient fill reflector catchlight (lower left, soft sky reflection)
        ctx.fillStyle = 'rgba(215, 235, 255, 0.68)';
        ctx.beginPath();
        ctx.arc(irisX - 15, irisY + 16, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Curved corneal surface tension sheen arc (upper corneal wetness)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(irisX, irisY, irisR * 0.72, -0.75 * Math.PI, -0.32 * Math.PI);
        ctx.stroke();

        ctx.restore();

        // 5. Wet Tear Film Meniscus along Lower Eyelid Margin (Marginal Tear Strip)
        // In living human eyes, this thin liquid strip produces a crisp horizontal glisten
        const meniscusY = eyeBaseY + eyeOpenHeight * 0.90;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eyeX - dir * eyeW * 0.55, meniscusY - 1);
        ctx.quadraticCurveTo(eyeX, meniscusY + 3.5, eyeX + dir * eyeW * 0.55, meniscusY - 1);
        ctx.stroke();

        // 6. Moist Lacrimal Caruncle Glistening Pinpoint (Inner tear duct)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.arc(caruncleX + dir * 2, eyeBaseY - 2, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // E. Realistic Eyelid Crease (Supratarsal fold) & Curved Eyelashes
        // Upper lid margin
        ctx.strokeStyle = '#1e1411';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(eyeX - dir * eyeW * 1.02, eyeBaseY - 10);
        ctx.quadraticCurveTo(eyeX, eyeBaseY - eyeOpenHeight - 12, eyeX + dir * eyeW * 1.04, eyeBaseY - 6);
        ctx.stroke();

        // Supratarsal fold crease
        ctx.strokeStyle = 'rgba(110, 55, 40, 0.25)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(eyeX - dir * (eyeW * 0.9), eyeBaseY - eyeH * 0.88);
        ctx.quadraticCurveTo(eyeX, eyeBaseY - eyeH * 1.15, eyeX + dir * (eyeW * 0.9), eyeBaseY - eyeH * 0.85);
        ctx.stroke();

        // Feathered individual eyelashes
        ctx.strokeStyle = '#150f0c';
        ctx.lineWidth = 1.8;
        for (let l = -32; l <= 32; l += 7) {
          const lashStartX = eyeX + l * dir * 1.05;
          const lashStartY = eyeBaseY - eyeOpenHeight - 6 + Math.abs(l) * 0.12;
          ctx.beginPath();
          ctx.moveTo(lashStartX, lashStartY);
          ctx.quadraticCurveTo(
            lashStartX + dir * 6,
            lashStartY - 10,
            lashStartX + dir * 12,
            lashStartY - 14
          );
          ctx.stroke();
        }
      }

      // 6. Realistic Feathered Eyebrows (Individual hair strokes with natural arch)
      const browBaseY = eyeBaseY - eyeH - 18 + s.eyebrowOffset * 18;
      const browTilt = dir * s.eyebrowSlant * 16;

      ctx.strokeStyle = this.hairColorHex;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      // Draw layered individual brow hairs
      for (let b = -42; b <= 42; b += 4) {
        const bx = eyeX + b * dir;
        const by = browBaseY + Math.sin(((b + 42) / 84) * Math.PI) * -12 + (b / 42) * browTilt;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + dir * 3, by - 6, bx + dir * 7, by - 10);
        ctx.stroke();
      }
    });
  }
}

/**
 * Creates the Complete Realistic TwinQuest Character Rig
 */
export function createCharacterRig(gender: CharacterGender, customization: CharacterCustomization): CharacterRig {
  const isBoy = gender === 'boy';
  const scale = 1.0;
  const root = new THREE.Group();
  root.name = `TwinQuestRig_${gender}`;

  const materials: THREE.Material[] = [];

  // PBR Realistic Materials with Subsurface Scattering & Epidermal Micro-Pore Mapping
  const skinColorHex = customization.skinTone;
  const hairColorHex = customization.hairColor;
  const hoodieColorHex = customization.clothingPrimaryColor;
  const eyeColorHex = customization.eyeColor;

  const sharedPoreTexture = getSharedPoreBumpTexture();

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: skinColorHex,
    roughness: 0.52,
    metalness: 0.0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.22,
    sheen: 0.65,
    sheenColor: new THREE.Color(isBoy ? '#fb7185' : '#f43f5e'),
    sheenRoughness: 0.48,
    bumpMap: sharedPoreTexture,
    bumpScale: 0.012
  });
  applySubsurfaceScattering(skinMat, {
    sssColorHex: isBoy ? '#fb7185' : '#f43f5e',
    bloodColorHex: '#e11d48',
    intensity: 0.40,
    translucencyScale: 0.55,
    translucencyPower: 2.5,
    isEar: false
  });
  materials.push(skinMat);

  // Dedicated Ear SSS Material with high translucency for thin cartilage light penetration
  const earSkinMat = new THREE.MeshPhysicalMaterial({
    color: skinColorHex,
    roughness: 0.46,
    metalness: 0.0,
    clearcoat: 0.32,
    clearcoatRoughness: 0.20,
    sheen: 0.82,
    sheenColor: new THREE.Color(isBoy ? '#fb7185' : '#f43f5e'),
    sheenRoughness: 0.38,
    bumpMap: sharedPoreTexture,
    bumpScale: 0.006
  });
  applySubsurfaceScattering(earSkinMat, {
    sssColorHex: isBoy ? '#fb7185' : '#f43f5e',
    bloodColorHex: '#e11d48',
    intensity: 0.56,
    translucencyScale: 0.92,
    translucencyPower: 2.0,
    translucencyDistortion: 0.35,
    isEar: true
  });
  materials.push(earSkinMat);

  // Inner Ear (Concha) Vascular SSS Material
  const innerEarMat = new THREE.MeshPhysicalMaterial({
    color: isBoy ? '#f87171' : '#fb7185',
    roughness: 0.40,
    metalness: 0.0,
    clearcoat: 0.36,
    clearcoatRoughness: 0.18,
    sheen: 0.92,
    sheenColor: new THREE.Color('#e11d48'),
    sheenRoughness: 0.32
  });
  applySubsurfaceScattering(innerEarMat, {
    sssColorHex: '#f43f5e',
    bloodColorHex: '#be123c',
    intensity: 0.68,
    translucencyScale: 0.98,
    translucencyPower: 1.8,
    translucencyDistortion: 0.40,
    isEar: true
  });
  materials.push(innerEarMat);

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColorHex,
    roughness: 0.38,
    metalness: 0.08
  });
  materials.push(hairMat);

  const hairHighlightMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hairColorHex).offsetHSL(0.02, 0.08, 0.12),
    roughness: 0.32,
    metalness: 0.12
  });
  materials.push(hairHighlightMat);

  // Realistic Woven Fabric Hoodie Material
  const hoodieMat = new THREE.MeshStandardMaterial({
    color: hoodieColorHex,
    roughness: 0.82,
    metalness: 0.02
  });
  materials.push(hoodieMat);

  const hoodieTrimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hoodieColorHex).offsetHSL(0, 0.04, -0.10),
    roughness: 0.88,
    metalness: 0.02
  });
  materials.push(hoodieTrimMat);

  // Realistic Utility Denim Pants Material
  const pantsMat = new THREE.MeshStandardMaterial({
    color: isBoy ? '#1e293b' : '#334155',
    roughness: 0.84,
    metalness: 0.04
  });
  materials.push(pantsMat);

  const drawstringsMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.6
  });
  materials.push(drawstringsMat);

  const leatherStrapMat = new THREE.MeshStandardMaterial({
    color: '#603115',
    roughness: 0.55,
    metalness: 0.1
  });
  materials.push(leatherStrapMat);

  const brassBuckleMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    metalness: 0.88,
    roughness: 0.22
  });
  materials.push(brassBuckleMat);

  const scrunchieMat = new THREE.MeshStandardMaterial({
    color: '#f43f5e',
    roughness: 0.55,
    metalness: 0.1
  });
  materials.push(scrunchieMat);

  const sneakerMidsoleMat = new THREE.MeshStandardMaterial({
    color: '#f1f5f9',
    roughness: 0.45,
    metalness: 0.02
  });
  materials.push(sneakerMidsoleMat);

  const sneakerOutsoleMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.75,
    metalness: 0.08
  });
  materials.push(sneakerOutsoleMat);

  const sneakerUpperMat = new THREE.MeshStandardMaterial({
    color: hoodieColorHex,
    roughness: 0.68,
    metalness: 0.06
  });
  materials.push(sneakerUpperMat);

  // ==========================================
  // --- FULL-BODY SKELETON JOINT HIERARCHY ---
  // ==========================================

  // 1. Hips / Pelvis
  const hips = new THREE.Group();
  hips.name = 'Bone_Hips';
  hips.position.y = 0.92 * scale;
  root.add(hips);

  const pelvisGeo = new THREE.CylinderGeometry(0.19 * scale, 0.17 * scale, 0.16 * scale, 20);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // 2. SpineLower / Waist
  const spineLower = new THREE.Group();
  spineLower.name = 'Bone_SpineLower';
  spineLower.position.y = 0.08 * scale;
  hips.add(spineLower);

  // Ribbed Waistband Hem
  const hemGeo = new THREE.CylinderGeometry(0.20 * scale, 0.195 * scale, 0.065 * scale, 22);
  const hemMesh = new THREE.Mesh(hemGeo, hoodieTrimMat);
  hemMesh.position.y = 0.03 * scale;
  spineLower.add(hemMesh);

  // 3. SpineUpper / Chest (Natural Tailored Hoodie Silhouette)
  const spineUpper = new THREE.Group();
  spineUpper.name = 'Bone_SpineUpper';
  spineUpper.position.y = 0.06 * scale;
  spineLower.add(spineUpper);

  const chestTopRadius = 0.24 * scale;
  const chestBottomRadius = 0.195 * scale;
  const chestH = 0.42 * scale;

  const hoodieBodyGeo = new THREE.CylinderGeometry(chestTopRadius, chestBottomRadius, chestH, 22);
  const hoodieBodyMesh = new THREE.Mesh(hoodieBodyGeo, hoodieMat);
  hoodieBodyMesh.position.y = 0.18 * scale;
  hoodieBodyMesh.castShadow = true;
  spineUpper.add(hoodieBodyMesh);

  // Realistic Kangaroo Front Pocket with Seam Lines
  const pocketGeo = new THREE.BoxGeometry(0.25 * scale, 0.14 * scale, 0.06 * scale);
  const pocket = new THREE.Mesh(pocketGeo, hoodieTrimMat);
  pocket.position.set(0, 0.12 * scale, 0.18 * scale);
  spineUpper.add(pocket);

  // Realistic Folded Hoodie Cowl around Neck
  const cowlGroup = new THREE.Group();
  cowlGroup.name = 'Bone_HoodCowl';
  cowlGroup.position.set(0, 0.39 * scale, 0.01 * scale);
  spineUpper.add(cowlGroup);

  const cowlGeo = new THREE.TorusGeometry(0.145 * scale, 0.052 * scale, 16, 32);
  const cowlMesh = new THREE.Mesh(cowlGeo, hoodieTrimMat);
  cowlMesh.rotation.x = Math.PI * 0.45;
  cowlGroup.add(cowlMesh);

  // Folded Hood Drapery on Upper Back
  const hoodBackGeo = new THREE.SphereGeometry(0.155 * scale, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const hoodBackMesh = new THREE.Mesh(hoodBackGeo, hoodieTrimMat);
  hoodBackMesh.position.set(0, 0.33 * scale, -0.13 * scale);
  hoodBackMesh.rotation.x = -Math.PI * 0.45;
  hoodBackMesh.castShadow = true;
  spineUpper.add(hoodBackMesh);

  // Braided Cotton Drawstrings with Silver Aglets
  const leftDrawstring = new THREE.Group();
  leftDrawstring.position.set(-0.045 * scale, 0.32 * scale, 0.165 * scale);
  spineUpper.add(leftDrawstring);

  const leftStrMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0055 * scale, 0.0055 * scale, 0.17 * scale, 8), drawstringsMat);
  leftStrMesh.position.y = -0.085 * scale;
  leftDrawstring.add(leftStrMesh);

  const leftTipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0075 * scale, 0.0075 * scale, 0.024 * scale, 8), brassBuckleMat);
  leftTipMesh.position.y = -0.175 * scale;
  leftDrawstring.add(leftTipMesh);

  const rightDrawstring = new THREE.Group();
  rightDrawstring.position.set(0.045 * scale, 0.32 * scale, 0.165 * scale);
  spineUpper.add(rightDrawstring);

  const rightStrMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0055 * scale, 0.0055 * scale, 0.17 * scale, 8), drawstringsMat);
  rightStrMesh.position.y = -0.085 * scale;
  rightDrawstring.add(rightStrMesh);

  const rightTipMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0075 * scale, 0.0075 * scale, 0.024 * scale, 8), brassBuckleMat);
  rightTipMesh.position.y = -0.175 * scale;
  rightDrawstring.add(rightTipMesh);

  // Explorer Leather Backpack Straps with Brass Buckles
  [-0.125, 0.125].forEach((x) => {
    const strapFrontGeo = new THREE.BoxGeometry(0.038 * scale, 0.34 * scale, 0.014 * scale);
    const strapFront = new THREE.Mesh(strapFrontGeo, leatherStrapMat);
    strapFront.position.set(x * scale, 0.24 * scale, 0.16 * scale);
    strapFront.rotation.z = x > 0 ? -0.1 : 0.1;
    spineUpper.add(strapFront);

    const buckleGeo = new THREE.BoxGeometry(0.046 * scale, 0.024 * scale, 0.02 * scale);
    const buckle = new THREE.Mesh(buckleGeo, brassBuckleMat);
    buckle.position.set(x * scale, 0.18 * scale, 0.168 * scale);
    spineUpper.add(buckle);
  });

  // Optional Explorer Backpack on Back
  let backpackMesh: THREE.Mesh | undefined;
  if (customization.accessories.backpack) {
    const packGeo = new THREE.BoxGeometry(0.30 * scale, 0.34 * scale, 0.16 * scale);
    backpackMesh = new THREE.Mesh(packGeo, leatherStrapMat);
    backpackMesh.position.set(0, 0.23 * scale, -0.20 * scale);
    backpackMesh.castShadow = true;
    spineUpper.add(backpackMesh);

    const bpPocket = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.15 * scale, 0.06 * scale), leatherStrapMat);
    bpPocket.position.set(0, -0.06 * scale, -0.09 * scale);
    backpackMesh.add(bpPocket);
  }

  // Romantic Heart Pendant for Maya
  let pendantMesh: THREE.Mesh | undefined;
  if (!isBoy || customization.accessories.pendant) {
    const pendantShape = new THREE.Shape();
    pendantShape.moveTo(0, 0);
    pendantShape.bezierCurveTo(0.035, 0.035, 0.055, 0.075, 0.035, 0.095);
    pendantShape.bezierCurveTo(0.018, 0.115, -0.018, 0.115, -0.035, 0.095);
    pendantShape.bezierCurveTo(-0.055, 0.075, -0.035, 0.035, 0, 0);

    const heartGeo = new THREE.ExtrudeGeometry(pendantShape, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.005 });
    heartGeo.center();
    const heartMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', metalness: 0.85, roughness: 0.15 });
    materials.push(heartMat);
    pendantMesh = new THREE.Mesh(heartGeo, heartMat);
    pendantMesh.scale.set(0.68 * scale, 0.68 * scale, 0.68 * scale);
    pendantMesh.position.set(0, 0.35 * scale, 0.175 * scale);
    spineUpper.add(pendantMesh);
  }

  // 4. Neck Joint
  const neck = new THREE.Group();
  neck.name = 'Bone_Neck';
  neck.position.y = 0.42 * scale;
  spineUpper.add(neck);

  const neckGeo = new THREE.CylinderGeometry(0.07 * scale, 0.082 * scale, 0.11 * scale, 18);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.y = 0.05 * scale;
  neck.add(neckMesh);

  // 5. Head Joint
  const head = new THREE.Group();
  head.name = 'Bone_Head';
  head.position.y = 0.10 * scale;
  neck.add(head);

  const headRadius = 0.205 * scale;
  const headGeo = new THREE.SphereGeometry(headRadius, 36, 36);
  headGeo.scale(0.96, 1.05, 0.94);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.14 * scale;
  headMesh.castShadow = true;
  head.add(headMesh);

  // Dynamic Expressive Face Controller
  const faceController = new FaceExpressionController(gender, skinColorHex, eyeColorHex, hairColorHex);
  const faceMat = new THREE.MeshPhysicalMaterial({
    map: faceController.texture,
    transparent: true,
    roughness: 0.48,
    metalness: 0.0,
    clearcoat: 0.32,
    clearcoatRoughness: 0.20,
    sheen: 0.55,
    sheenColor: new THREE.Color(isBoy ? '#fb7185' : '#f43f5e'),
    sheenRoughness: 0.45,
    bumpMap: sharedPoreTexture,
    bumpScale: 0.008,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  applySubsurfaceScattering(faceMat, {
    sssColorHex: isBoy ? '#fb7185' : '#f43f5e',
    bloodColorHex: '#e11d48',
    intensity: 0.44,
    translucencyScale: 0.65,
    translucencyPower: 2.3,
    translucencyDistortion: 0.32,
    isEar: false
  });
  materials.push(faceMat);

  const facePlaneW = 0.36 * scale;
  const facePlaneH = 0.36 * scale;
  const faceGeo = new THREE.PlaneGeometry(facePlaneW, facePlaneH, 16, 16);
  const posAttr = faceGeo.attributes.position;
  const R = headRadius * 1.002;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = Math.sqrt(Math.max(0.001, R * R - x * x * 0.88 - y * y * 0.88)) - R * 0.28;
    posAttr.setZ(i, z + 0.06 * scale);
  }
  faceGeo.computeVertexNormals();

  // Create 3D Blend Shapes (Morph Targets)
  const vertexCount = posAttr.count;
  const blinkMorph = new Float32Array(vertexCount * 3);
  const smileMorph = new Float32Array(vertexCount * 3);
  const surpriseMorph = new Float32Array(vertexCount * 3);
  const determinedMorph = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    const i3 = i * 3;
    blinkMorph[i3] = x;
    blinkMorph[i3 + 1] = y;
    blinkMorph[i3 + 2] = z;

    smileMorph[i3] = x;
    smileMorph[i3 + 1] = y;
    smileMorph[i3 + 2] = z;

    surpriseMorph[i3] = x;
    surpriseMorph[i3 + 1] = y;
    surpriseMorph[i3 + 2] = z;

    determinedMorph[i3] = x;
    determinedMorph[i3 + 1] = y;
    determinedMorph[i3 + 2] = z;

    // 1. Blink Blend Shape: upper eyelids push down & outward
    const eyeDist = Math.hypot(Math.abs(x) - 0.07 * scale, y - 0.035 * scale);
    if (eyeDist < 0.08 * scale) {
      const weight = Math.cos((eyeDist / (0.08 * scale)) * Math.PI * 0.5);
      blinkMorph[i3 + 1] -= 0.016 * scale * weight;
      blinkMorph[i3 + 2] += 0.008 * scale * weight;
    }

    // 2. Smile Blend Shape: cheek volume puffs up and forward, mouth corners curve up
    const cheekDist = Math.hypot(Math.abs(x) - 0.08 * scale, y - (-0.01 * scale));
    if (cheekDist < 0.09 * scale) {
      const weight = Math.cos((cheekDist / (0.09 * scale)) * Math.PI * 0.5);
      smileMorph[i3 + 1] += 0.012 * scale * weight;
      smileMorph[i3 + 2] += 0.014 * scale * weight;
    }

    // 3. Surprise Blend Shape: mouth center recedes inward, eyebrows arch upward
    const mouthDist = Math.hypot(x, y - (-0.07 * scale));
    if (mouthDist < 0.065 * scale) {
      const weight = Math.cos((mouthDist / (0.065 * scale)) * Math.PI * 0.5);
      surpriseMorph[i3 + 2] -= 0.02 * scale * weight;
    }
    const browDist = Math.hypot(Math.abs(x) - 0.06 * scale, y - (0.08 * scale));
    if (browDist < 0.075 * scale) {
      const weight = Math.cos((browDist / (0.075 * scale)) * Math.PI * 0.5);
      surpriseMorph[i3 + 1] += 0.015 * scale * weight;
      surpriseMorph[i3 + 2] += 0.006 * scale * weight;
    }

    // 4. Determined Blend Shape: brow furrow downward & forward
    if (browDist < 0.075 * scale) {
      const weight = Math.cos((browDist / (0.075 * scale)) * Math.PI * 0.5);
      determinedMorph[i3 + 1] -= 0.012 * scale * weight;
      determinedMorph[i3 + 2] += 0.009 * scale * weight;
    }
  }

  faceGeo.morphAttributes.position = [
    new THREE.BufferAttribute(blinkMorph, 3),
    new THREE.BufferAttribute(smileMorph, 3),
    new THREE.BufferAttribute(surpriseMorph, 3),
    new THREE.BufferAttribute(determinedMorph, 3)
  ];

  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.morphTargetDictionary = {
    blink: 0,
    smile: 1,
    surprise: 2,
    determined: 3
  };
  faceMesh.morphTargetInfluences = [0, 0, 0, 0];
  faceMesh.position.set(0, 0.14 * scale, 0.11 * scale);
  head.add(faceMesh);

  // Link mesh to facial animation controller
  faceController.faceMesh = faceMesh;

  // Realistic Sculpted Ears with Helix & Tragus Detailing and Soft Cartilage Light Penetration
  [-0.19 * scale, 0.19 * scale].forEach((x) => {
    const earGeo = new THREE.SphereGeometry(0.042 * scale, 16, 16);
    earGeo.scale(0.38, 1.15, 0.8);
    const ear = new THREE.Mesh(earGeo, earSkinMat);
    ear.position.set(x, 0.14 * scale, -0.01 * scale);
    ear.rotation.y = x > 0 ? -0.2 : 0.2;
    head.add(ear);

    const innerEarGeo = new THREE.SphereGeometry(0.024 * scale, 12, 12);
    innerEarGeo.scale(0.28, 0.95, 0.6);
    const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerEar.position.set(x * 1.02, 0.14 * scale, -0.006 * scale);
    head.add(innerEar);
  });

  // ==========================================
  // --- REALISTIC STRAND-LAYERED HAIR SYSTEM ---
  // ==========================================
  const hairGroup = new THREE.Group();
  hairGroup.name = 'Bone_HairGroup';
  head.add(hairGroup);

  let ponytailRoot: THREE.Group | undefined;

  if (isBoy) {
    // Leo: Layered Realistic Textured Waves with Sideburns & Natural Flow
    // 1. Scalp Crown Base Cap
    const capGeo = new THREE.SphereGeometry(0.216 * scale, 28, 28, 0, Math.PI * 2, 0, Math.PI * 0.54);
    const capMesh = new THREE.Mesh(capGeo, hairMat);
    capMesh.position.set(0, 0.15 * scale, -0.015 * scale);
    hairGroup.add(capMesh);

    // 2. Layered Hair Waves with Fine Specular Cards
    const waveLayers = [
      { x: 0.0, y: 0.33, z: -0.02, rx: -0.15, rz: 0.05, sx: 1.18, sy: 0.85, sz: 1.12 },
      { x: -0.05, y: 0.30, z: 0.06, rx: 0.32, rz: -0.18, sx: 0.95, sy: 0.72, sz: 0.92 },
      { x: 0.06, y: 0.31, z: 0.05, rx: 0.28, rz: 0.22, sx: 0.95, sy: 0.74, sz: 0.94 }
    ];

    waveLayers.forEach((w) => {
      const wGeo = new THREE.SphereGeometry(0.17 * scale, 18, 18);
      wGeo.scale(w.sx, w.sy, w.sz);
      const wMesh = new THREE.Mesh(wGeo, hairMat);
      wMesh.position.set(w.x * scale, w.y * scale, w.z * scale);
      wMesh.rotation.x = w.rx;
      wMesh.rotation.z = w.rz;
      hairGroup.add(wMesh);
    });

    // 3. Fine Textured Hair Locks & Waves
    const lockCoords = [
      { x: -0.10, y: 0.33, z: 0.09, rx: 0.34, rz: -0.25, len: 0.14, rad: 0.042 },
      { x: 0.01, y: 0.36, z: 0.08, rx: 0.42, rz: 0.10, len: 0.16, rad: 0.046 },
      { x: 0.11, y: 0.33, z: 0.08, rx: 0.34, rz: 0.28, len: 0.14, rad: 0.042 },
      { x: -0.14, y: 0.27, z: 0.03, rx: 0.15, rz: -0.45, len: 0.13, rad: 0.038 },
      { x: 0.14, y: 0.26, z: 0.03, rx: 0.15, rz: 0.45, len: 0.13, rad: 0.038 }
    ];

    lockCoords.forEach((t, i) => {
      const lockGeo = new THREE.ConeGeometry(t.rad * scale, t.len * scale, 12);
      const lock = new THREE.Mesh(lockGeo, i % 2 === 0 ? hairHighlightMat : hairMat);
      lock.position.set(t.x * scale, t.y * scale, t.z * scale);
      lock.rotation.x = t.rx;
      lock.rotation.z = t.rz;
      hairGroup.add(lock);
    });

    // 4. Soft Layered Front Fringe
    const bangCoords = [
      { x: -0.10, y: 0.27, z: 0.16, rz: -0.22, len: 0.12 },
      { x: -0.04, y: 0.28, z: 0.175, rz: -0.08, len: 0.11 },
      { x: 0.04, y: 0.28, z: 0.175, rz: 0.12, len: 0.11 },
      { x: 0.10, y: 0.27, z: 0.16, rz: 0.25, len: 0.12 }
    ];

    bangCoords.forEach((b, i) => {
      const bangGeo = new THREE.ConeGeometry(0.034 * scale, b.len * scale, 10);
      const bang = new THREE.Mesh(bangGeo, i === 1 || i === 2 ? hairHighlightMat : hairMat);
      bang.position.set(b.x * scale, b.y * scale, b.z * scale);
      bang.rotation.x = Math.PI * 0.70;
      bang.rotation.z = b.rz;
      hairGroup.add(bang);
    });
  } else {
    // Maya: Realistic Flowing Brunette Locks with Bouncy Ponytail
    // 1. Scalp Crown Base Cap
    const capGeo = new THREE.SphereGeometry(0.22 * scale, 28, 28, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const capMesh = new THREE.Mesh(capGeo, hairMat);
    capMesh.position.set(0, 0.15 * scale, -0.015 * scale);
    hairGroup.add(capMesh);

    // 2. Realistic Face-Framing Fringe
    const girlBangs = [
      { x: -0.11, y: 0.27, z: 0.16, rz: -0.26, len: 0.13 },
      { x: -0.04, y: 0.28, z: 0.175, rz: -0.08, len: 0.12 },
      { x: 0.04, y: 0.28, z: 0.175, rz: 0.10, len: 0.12 },
      { x: 0.11, y: 0.27, z: 0.16, rz: 0.26, len: 0.13 }
    ];

    girlBangs.forEach((b, i) => {
      const bGeo = new THREE.ConeGeometry(0.032 * scale, b.len * scale, 10);
      const bang = new THREE.Mesh(bGeo, i === 1 || i === 2 ? hairHighlightMat : hairMat);
      bang.position.set(b.x * scale, b.y * scale, b.z * scale);
      bang.rotation.x = Math.PI * 0.70;
      bang.rotation.z = b.rz;
      hairGroup.add(bang);
    });

    // 3. Realistic Flowing Cheek Tendrils
    [-0.15, 0.15].forEach((x) => {
      const tendrilGeo = new THREE.CylinderGeometry(0.014 * scale, 0.006 * scale, 0.32 * scale, 10);
      const tendril = new THREE.Mesh(tendrilGeo, hairMat);
      tendril.position.set(x * scale, 0.09 * scale, 0.11 * scale);
      tendril.rotation.z = x > 0 ? -0.16 : 0.16;
      tendril.rotation.x = 0.08;
      hairGroup.add(tendril);
    });

    // 4. Secondary Dynamic Spring Ponytail Joint with Fabric Scrunchie
    ponytailRoot = new THREE.Group();
    ponytailRoot.name = 'Bone_Ponytail';
    ponytailRoot.position.set(0, 0.32 * scale, -0.09 * scale);
    hairGroup.add(ponytailRoot);

    const scrunchieGeo = new THREE.TorusGeometry(0.052 * scale, 0.02 * scale, 14, 28);
    const scrunchieMesh = new THREE.Mesh(scrunchieGeo, scrunchieMat);
    scrunchieMesh.rotation.x = Math.PI * 0.35;
    ponytailRoot.add(scrunchieMesh);

    // Cascading Textured Ponytail Plume
    const ponyMainGeo = new THREE.ConeGeometry(0.11 * scale, 0.38 * scale, 16);
    const ponyMain = new THREE.Mesh(ponyMainGeo, hairMat);
    ponyMain.position.set(0, 0.07 * scale, -0.18 * scale);
    ponyMain.rotation.x = -Math.PI * 0.65;
    ponytailRoot.add(ponyMain);

    const ponyCurlGeo = new THREE.ConeGeometry(0.085 * scale, 0.34 * scale, 14);
    const ponyCurl = new THREE.Mesh(ponyCurlGeo, hairHighlightMat);
    ponyCurl.position.set(0, -0.19 * scale, -0.30 * scale);
    ponyCurl.rotation.x = -Math.PI * 0.45;
    ponytailRoot.add(ponyCurl);
  }

  // Glasses Mesh (Hidden by default)
  const glassesGroup = new THREE.Group();
  glassesGroup.visible = !!customization.accessories.glasses;
  head.add(glassesGroup);

  const frameGeo = new THREE.TorusGeometry(0.042 * scale, 0.006 * scale, 10, 20);
  const frameMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.8 });
  materials.push(frameMat);

  const leftLens = new THREE.Mesh(frameGeo, frameMat);
  leftLens.position.set(-0.07 * scale, 0.15 * scale, 0.20 * scale);
  glassesGroup.add(leftLens);

  const rightLens = new THREE.Mesh(frameGeo, frameMat);
  rightLens.position.set(0.07 * scale, 0.15 * scale, 0.20 * scale);
  glassesGroup.add(rightLens);

  const bridgeGeo = new THREE.BoxGeometry(0.04 * scale, 0.007 * scale, 0.007 * scale);
  const bridge = new THREE.Mesh(bridgeGeo, frameMat);
  bridge.position.set(0, 0.15 * scale, 0.205 * scale);
  glassesGroup.add(bridge);

  // 6. Upper Limbs: Clavicles -> Shoulders -> Forearms -> Hands
  const armRadius = 0.062 * scale;
  const armLen = 0.25 * scale;
  const shoulderOffset = 0.25 * scale;

  // Left Arm Chain
  const leftClavicle = new THREE.Group();
  leftClavicle.name = 'Bone_LeftClavicle';
  leftClavicle.position.set(-0.06 * scale, 0.33 * scale, 0);
  spineUpper.add(leftClavicle);

  const leftArm = new THREE.Group();
  leftArm.name = 'Bone_LeftArm';
  leftArm.position.set(-shoulderOffset + 0.06 * scale, 0, 0);
  leftClavicle.add(leftArm);

  const leftShoulderMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.15, 16, 16), hoodieMat);
  leftArm.add(leftShoulderMesh);

  const leftBicepMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 1.05, armRadius * 0.95, armLen, 16), hoodieMat);
  leftBicepMesh.position.y = -armLen * 0.5;
  leftBicepMesh.castShadow = true;
  leftArm.add(leftBicepMesh);

  const leftForearm = new THREE.Group();
  leftForearm.name = 'Bone_LeftForearm';
  leftForearm.position.y = -armLen;
  leftArm.add(leftForearm);

  const leftForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.95, armRadius * 0.88, armLen, 16), hoodieMat);
  leftForearmMesh.position.y = -armLen * 0.5;
  leftForearmMesh.castShadow = true;
  leftForearm.add(leftForearmMesh);

  const leftCuff = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.96, armRadius * 0.92, 0.045 * scale, 16), hoodieTrimMat);
  leftCuff.position.y = -armLen + 0.02 * scale;
  leftForearm.add(leftCuff);

  const leftHand = new THREE.Group();
  leftHand.name = 'Bone_LeftHand';
  leftHand.position.y = -armLen;
  leftForearm.add(leftHand);

  const leftHandMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 0.8, 16, 16), skinMat);
  leftHandMesh.scale.set(0.9, 1.25, 0.82);
  leftHandMesh.position.y = -armRadius * 0.6;
  leftHand.add(leftHandMesh);

  // Right Arm Chain
  const rightClavicle = new THREE.Group();
  rightClavicle.name = 'Bone_RightClavicle';
  rightClavicle.position.set(0.06 * scale, 0.33 * scale, 0);
  spineUpper.add(rightClavicle);

  const rightArm = new THREE.Group();
  rightArm.name = 'Bone_RightArm';
  rightArm.position.set(shoulderOffset - 0.06 * scale, 0, 0);
  rightClavicle.add(rightArm);

  const rightShoulderMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.15, 16, 16), hoodieMat);
  rightArm.add(rightShoulderMesh);

  const rightBicepMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 1.05, armRadius * 0.95, armLen, 16), hoodieMat);
  rightBicepMesh.position.y = -armLen * 0.5;
  rightBicepMesh.castShadow = true;
  rightArm.add(rightBicepMesh);

  const rightForearm = new THREE.Group();
  rightForearm.name = 'Bone_RightForearm';
  rightForearm.position.y = -armLen;
  rightArm.add(rightForearm);

  const rightForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.95, armRadius * 0.88, armLen, 16), hoodieMat);
  rightForearmMesh.position.y = -armLen * 0.5;
  rightForearmMesh.castShadow = true;
  rightForearm.add(rightForearmMesh);

  const rightCuff = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.96, armRadius * 0.92, 0.045 * scale, 16), hoodieTrimMat);
  rightCuff.position.y = -armLen + 0.02 * scale;
  rightForearm.add(rightCuff);

  const rightHand = new THREE.Group();
  rightHand.name = 'Bone_RightHand';
  rightHand.position.y = -armLen;
  rightForearm.add(rightHand);

  const rightHandMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 0.8, 16, 16), skinMat);
  rightHandMesh.scale.set(0.9, 1.25, 0.82);
  rightHandMesh.position.y = -armRadius * 0.6;
  rightHand.add(rightHandMesh);

  // Default Relaxed Arm Stance
  leftArm.rotation.z = -0.12;
  rightArm.rotation.z = 0.12;
  leftForearm.rotation.x = -0.15;
  rightForearm.rotation.x = -0.15;

  // 7. Lower Limbs & Rugged Athletic Trail Sneakers
  const legRadius = 0.072 * scale;
  const thighLen = 0.36 * scale;
  const calfLen = 0.36 * scale;
  const hipSpacing = 0.11 * scale;

  // Left Leg Chain
  const leftThigh = new THREE.Group();
  leftThigh.name = 'Bone_LeftThigh';
  leftThigh.position.set(-hipSpacing, -0.06 * scale, 0);
  hips.add(leftThigh);

  const leftThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 1.08, legRadius * 0.95, thighLen, 16), pantsMat);
  leftThighMesh.position.y = -thighLen * 0.5;
  leftThighMesh.castShadow = true;
  leftThigh.add(leftThighMesh);

  const leftCalf = new THREE.Group();
  leftCalf.name = 'Bone_LeftCalf';
  leftCalf.position.y = -thighLen;
  leftThigh.add(leftCalf);

  const leftCalfMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.95, legRadius * 0.82, calfLen, 16), pantsMat);
  leftCalfMesh.position.y = -calfLen * 0.5;
  leftCalfMesh.castShadow = true;
  leftCalf.add(leftCalfMesh);

  const leftFoot = new THREE.Group();
  leftFoot.name = 'Bone_LeftFoot';
  leftFoot.position.y = -calfLen;
  leftCalf.add(leftFoot);

  // Realistic Trail Sneaker: Upper + Midsole + Outsole Lugs
  const leftShoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.135 * scale, 0.10 * scale, 0.24 * scale), sneakerUpperMat);
  leftShoeBody.position.set(0, -0.05 * scale, 0.04 * scale);
  leftShoeBody.castShadow = true;
  leftFoot.add(leftShoeBody);

  const leftShoeMidsole = new THREE.Mesh(new THREE.BoxGeometry(0.145 * scale, 0.035 * scale, 0.26 * scale), sneakerMidsoleMat);
  leftShoeMidsole.position.set(0, -0.085 * scale, 0.04 * scale);
  leftFoot.add(leftShoeMidsole);

  const leftShoeOutsole = new THREE.Mesh(new THREE.BoxGeometry(0.148 * scale, 0.016 * scale, 0.265 * scale), sneakerOutsoleMat);
  leftShoeOutsole.position.set(0, -0.105 * scale, 0.04 * scale);
  leftFoot.add(leftShoeOutsole);

  const leftToeCap = new THREE.Mesh(new THREE.SphereGeometry(0.068 * scale, 14, 14), sneakerMidsoleMat);
  leftToeCap.scale.set(1.0, 0.65, 0.9);
  leftToeCap.position.set(0, -0.055 * scale, 0.14 * scale);
  leftFoot.add(leftToeCap);

  // Right Leg Chain
  const rightThigh = new THREE.Group();
  rightThigh.name = 'Bone_RightThigh';
  rightThigh.position.set(hipSpacing, -0.06 * scale, 0);
  hips.add(rightThigh);

  const rightThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 1.08, legRadius * 0.95, thighLen, 16), pantsMat);
  rightThighMesh.position.y = -thighLen * 0.5;
  rightThighMesh.castShadow = true;
  rightThigh.add(rightThighMesh);

  const rightCalf = new THREE.Group();
  rightCalf.name = 'Bone_RightCalf';
  rightCalf.position.y = -thighLen;
  rightThigh.add(rightCalf);

  const rightCalfMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.95, legRadius * 0.82, calfLen, 16), pantsMat);
  rightCalfMesh.position.y = -calfLen * 0.5;
  rightCalfMesh.castShadow = true;
  rightCalf.add(rightCalfMesh);

  const rightFoot = new THREE.Group();
  rightFoot.name = 'Bone_RightFoot';
  rightFoot.position.y = -calfLen;
  rightCalf.add(rightFoot);

  // Right Trail Sneaker
  const rightShoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.135 * scale, 0.10 * scale, 0.24 * scale), sneakerUpperMat);
  rightShoeBody.position.set(0, -0.05 * scale, 0.04 * scale);
  rightShoeBody.castShadow = true;
  rightFoot.add(rightShoeBody);

  const rightShoeMidsole = new THREE.Mesh(new THREE.BoxGeometry(0.145 * scale, 0.035 * scale, 0.26 * scale), sneakerMidsoleMat);
  rightShoeMidsole.position.set(0, -0.085 * scale, 0.04 * scale);
  rightFoot.add(rightShoeMidsole);

  const rightShoeOutsole = new THREE.Mesh(new THREE.BoxGeometry(0.148 * scale, 0.016 * scale, 0.265 * scale), sneakerOutsoleMat);
  rightShoeOutsole.position.set(0, -0.105 * scale, 0.04 * scale);
  rightFoot.add(rightShoeOutsole);

  const rightToeCap = new THREE.Mesh(new THREE.SphereGeometry(0.068 * scale, 14, 14), sneakerMidsoleMat);
  rightToeCap.scale.set(1.0, 0.65, 0.9);
  rightToeCap.position.set(0, -0.055 * scale, 0.14 * scale);
  rightFoot.add(rightToeCap);

  // Full-Body Skeleton Reference Structure
  const skeleton: FullBodySkeleton = {
    root,
    hips,
    spineLower,
    spineUpper,
    neck,
    head,
    leftClavicle,
    leftArm,
    leftForearm,
    leftHand,
    rightClavicle,
    rightArm,
    rightForearm,
    rightHand,
    leftThigh,
    leftCalf,
    leftFoot,
    rightThigh,
    rightCalf,
    rightFoot,
    ponytailRoot,
    hoodCowl: cowlGroup,
    leftDrawstring,
    rightDrawstring
  };

  // ========================================================
  // --- BLEND SPACE ANIMATION STATE MACHINE & CONTROLLER ---
  // ========================================================
  let animTimer = Math.random() * 10;
  let smoothedSpeed = 0;
  let locomotionWeight = 0;
  let walkRunBlend = 0;
  let inAirWeight = 0;
  let landingSquish = 0;
  let wasGroundedLastFrame = true;

  // Secondary Spring-Damper Physics Variables
  let ponyAngleX = 0;
  let ponyAngleZ = 0;
  let ponyVelX = 0;
  let ponyVelZ = 0;

  let drawstringSwing = 0;
  let prevVel = new THREE.Vector3();

  const triggerFacialExpression = (expr: 'smile' | 'wide_smile' | 'surprise' | 'blink' | 'determined', duration: number = 1.0) => {
    faceController.setExpression(expr, duration);
  };

  const updateAnimation = (state: CharacterAnimationState, delta: number) => {
    const dt = Math.min(delta, 0.1);
    animTimer += dt;

    // Update Facial Animation Controller
    faceController.update(dt, state);

    // 1. Death Animation State
    if (state.isDead) {
      hips.position.y = THREE.MathUtils.damp(hips.position.y, 0.2 * scale, 8, dt);
      spineUpper.rotation.x = THREE.MathUtils.damp(spineUpper.rotation.x, Math.PI * 0.45, 10, dt);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -Math.PI * 0.5, 8, dt);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -Math.PI * 0.5, 8, dt);
      leftThigh.rotation.x = THREE.MathUtils.damp(leftThigh.rotation.x, 0.6, 8, dt);
      rightThigh.rotation.x = THREE.MathUtils.damp(rightThigh.rotation.x, -0.6, 8, dt);
      return;
    }

    // 2. Victory / Cheer State
    if (state.isCheering) {
      const cheerJump = Math.abs(Math.sin(animTimer * 6)) * 0.14 * scale;
      hips.position.y = (0.92 * scale) + cheerJump;

      // Pump arms up in celebration
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -Math.PI * 0.85 + Math.sin(animTimer * 8) * 0.25, 10, dt);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -Math.PI * 0.85 - Math.sin(animTimer * 8) * 0.25, 10, dt);
      leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, -0.35, 10, dt);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0.35, 10, dt);
      spineUpper.rotation.y = Math.sin(animTimer * 5) * 0.18;
      head.rotation.x = -0.15;
      return;
    }

    // 3. Smooth Blend Space Computations
    const rawSpeed = Math.hypot(state.velocity.x, state.velocity.z);
    smoothedSpeed = THREE.MathUtils.damp(smoothedSpeed, rawSpeed, 12, dt);

    const targetLoco = smoothedSpeed > 0.2 ? 1 : 0;
    locomotionWeight = THREE.MathUtils.damp(locomotionWeight, targetLoco, 10, dt);

    const targetWalkRun = THREE.MathUtils.clamp((smoothedSpeed - 1.5) / 4.5, 0, 1);
    walkRunBlend = THREE.MathUtils.damp(walkRunBlend, targetWalkRun, 8, dt);

    const targetAir = state.isGrounded ? 0 : 1;
    inAirWeight = THREE.MathUtils.damp(inAirWeight, targetAir, 12, dt);

    // Detect Touchdown Landing
    if (!wasGroundedLastFrame && state.isGrounded) {
      landingSquish = 0.08 * scale;
    }
    wasGroundedLastFrame = state.isGrounded;

    if (landingSquish > 0.001) {
      landingSquish = THREE.MathUtils.damp(landingSquish, 0, 15, dt);
    } else {
      landingSquish = 0;
    }

    // 4. Directional Banking & Acceleration Lean
    const accelX = (state.velocity.x - prevVel.x) / Math.max(dt, 0.001);
    const accelZ = (state.velocity.z - prevVel.z) / Math.max(dt, 0.001);
    prevVel.copy(state.velocity);

    const bankAngle = THREE.MathUtils.clamp(-state.velocity.x * 0.025, -0.22, 0.22);
    const forwardLean = THREE.MathUtils.clamp(smoothedSpeed * 0.035, 0, 0.24);

    // ==========================================
    // --- EVALUATE BLEND SPACES (Pose Mixing) ---
    // ==========================================

    // --- A. IDLE POSE ---
    const breath = Math.sin(animTimer * 2.2) * 0.016;
    const idleWeightShift = Math.sin(animTimer * 0.8) * 0.02;

    const idleHipsY = (0.92 + breath) * scale - landingSquish;
    const idleSpineX = breath * 0.5;
    const idleSpineZ = idleWeightShift;

    const idleLeftArmX = 0.04;
    const idleRightArmX = 0.04;
    const idleLeftArmZ = -0.12;
    const idleRightArmZ = 0.12;
    const idleForearmX = -0.16;

    const idleLeftLegX = 0;
    const idleRightLegX = 0;
    const idleLeftCalfX = landingSquish * 2.5;
    const idleRightCalfX = landingSquish * 2.5;

    // --- B. WALK POSE ---
    const walkFreq = 9.0;
    const walkCycle = animTimer * walkFreq;
    const walkLegSwing = Math.sin(walkCycle) * 0.52;
    const walkArmSwing = Math.sin(walkCycle) * 0.45;
    const walkBounce = Math.abs(Math.sin(walkCycle)) * 0.035;

    const walkHipsY = (0.92 + walkBounce) * scale - landingSquish;
    const walkSpineX = forwardLean * 0.6;
    const walkSpineY = Math.sin(walkCycle) * 0.09;
    const walkSpineZ = bankAngle;

    const walkLeftArmX = -walkArmSwing;
    const walkRightArmX = walkArmSwing;
    const walkLeftArmZ = -0.14;
    const walkRightArmZ = 0.14;
    const walkForearmX = -Math.abs(Math.sin(walkCycle)) * 0.32;

    const walkLeftLegX = walkLegSwing;
    const walkRightLegX = -walkLegSwing;
    const walkLeftCalfX = walkLegSwing < 0 ? Math.abs(Math.sin(walkCycle)) * 0.72 : 0.04;
    const walkRightCalfX = -walkLegSwing < 0 ? Math.abs(Math.sin(walkCycle)) * 0.72 : 0.04;

    // --- C. RUN / SPRINT POSE ---
    const runFreq = 12.5;
    const runCycle = animTimer * runFreq;
    const runLegSwing = Math.sin(runCycle) * 0.88;
    const runArmSwing = Math.sin(runCycle) * 0.82;
    const runBounce = Math.abs(Math.sin(runCycle)) * 0.06;

    const runHipsY = (0.92 + runBounce) * scale - landingSquish;
    const runSpineX = forwardLean;
    const runSpineY = Math.sin(runCycle) * 0.16;
    const runSpineZ = bankAngle * 1.3;

    const runLeftArmX = -runArmSwing;
    const runRightArmX = runArmSwing;
    const runLeftArmZ = -0.18;
    const runRightArmZ = 0.18;
    const runForearmX = -0.35 - Math.abs(Math.sin(runCycle)) * 0.45;

    const runLeftLegX = runLegSwing;
    const runRightLegX = -runLegSwing;
    const runLeftCalfX = runLegSwing < 0 ? Math.abs(Math.sin(runCycle)) * 1.15 : 0.08;
    const runRightCalfX = -runLegSwing < 0 ? Math.abs(Math.sin(runCycle)) * 1.15 : 0.08;

    // --- D. AIRBORNE POSE ---
    const airRise = state.velocity.y > 0.5;
    const airHipsY = 0.92 * scale;
    const airSpineX = airRise ? -0.08 : 0.14;
    const airSpineY = 0;
    const airSpineZ = bankAngle;

    const airLeftArmX = airRise ? -0.75 : -0.45;
    const airRightArmX = airRise ? -0.75 : -0.45;
    const airLeftArmZ = -0.32;
    const airRightArmZ = 0.32;
    const airForearmX = -0.28;

    const airLeftLegX = airRise ? -0.45 : -0.25;
    const airRightLegX = airRise ? 0.55 : 0.35;
    const airLeftCalfX = 0.65;
    const airRightCalfX = 0.25;

    // Blend Walk and Run
    const locoHipsY = THREE.MathUtils.lerp(walkHipsY, runHipsY, walkRunBlend);
    const locoSpineX = THREE.MathUtils.lerp(walkSpineX, runSpineX, walkRunBlend);
    const locoSpineY = THREE.MathUtils.lerp(walkSpineY, runSpineY, walkRunBlend);
    const locoSpineZ = THREE.MathUtils.lerp(walkSpineZ, runSpineZ, walkRunBlend);

    const locoLeftArmX = THREE.MathUtils.lerp(walkLeftArmX, runLeftArmX, walkRunBlend);
    const locoRightArmX = THREE.MathUtils.lerp(walkRightArmX, runRightArmX, walkRunBlend);
    const locoLeftArmZ = THREE.MathUtils.lerp(walkLeftArmZ, runLeftArmZ, walkRunBlend);
    const locoRightArmZ = THREE.MathUtils.lerp(walkRightArmZ, runRightArmZ, walkRunBlend);
    const locoForearmX = THREE.MathUtils.lerp(walkForearmX, runForearmX, walkRunBlend);

    const locoLeftLegX = THREE.MathUtils.lerp(walkLeftLegX, runLeftLegX, walkRunBlend);
    const locoRightLegX = THREE.MathUtils.lerp(walkRightLegX, runRightLegX, walkRunBlend);
    const locoLeftCalfX = THREE.MathUtils.lerp(walkLeftCalfX, runLeftCalfX, walkRunBlend);
    const locoRightCalfX = THREE.MathUtils.lerp(walkRightCalfX, runRightCalfX, walkRunBlend);

    // Blend Idle and Locomotion
    const groundHipsY = THREE.MathUtils.lerp(idleHipsY, locoHipsY, locomotionWeight);
    const groundSpineX = THREE.MathUtils.lerp(idleSpineX, locoSpineX, locomotionWeight);
    const groundSpineY = THREE.MathUtils.lerp(0, locoSpineY, locomotionWeight);
    const groundSpineZ = THREE.MathUtils.lerp(idleSpineZ, locoSpineZ, locomotionWeight);

    const groundLeftArmX = THREE.MathUtils.lerp(idleLeftArmX, locoLeftArmX, locomotionWeight);
    const groundRightArmX = THREE.MathUtils.lerp(idleRightArmX, locoRightArmX, locomotionWeight);
    const groundLeftArmZ = THREE.MathUtils.lerp(idleLeftArmZ, locoLeftArmZ, locomotionWeight);
    const groundRightArmZ = THREE.MathUtils.lerp(idleRightArmZ, locoRightArmZ, locomotionWeight);
    const groundForearmX = THREE.MathUtils.lerp(idleForearmX, locoForearmX, locomotionWeight);

    const groundLeftLegX = THREE.MathUtils.lerp(idleLeftLegX, locoLeftLegX, locomotionWeight);
    const groundRightLegX = THREE.MathUtils.lerp(idleRightLegX, locoRightLegX, locomotionWeight);
    const groundLeftCalfX = THREE.MathUtils.lerp(idleLeftCalfX, locoLeftCalfX, locomotionWeight);
    const groundRightCalfX = THREE.MathUtils.lerp(idleRightCalfX, locoRightCalfX, locomotionWeight);

    // Final Blend: Ground vs Airborne
    hips.position.y = THREE.MathUtils.lerp(groundHipsY, airHipsY, inAirWeight);
    spineUpper.rotation.x = THREE.MathUtils.lerp(groundSpineX, airSpineX, inAirWeight);
    spineUpper.rotation.y = THREE.MathUtils.lerp(groundSpineY, airSpineY, inAirWeight);
    spineUpper.rotation.z = THREE.MathUtils.lerp(groundSpineZ, airSpineZ, inAirWeight);

    leftArm.rotation.x = THREE.MathUtils.lerp(groundLeftArmX, airLeftArmX, inAirWeight);
    rightArm.rotation.x = THREE.MathUtils.lerp(groundRightArmX, airRightArmX, inAirWeight);
    leftArm.rotation.z = THREE.MathUtils.lerp(groundLeftArmZ, airLeftArmZ, inAirWeight);
    rightArm.rotation.z = THREE.MathUtils.lerp(groundRightArmZ, airRightArmZ, inAirWeight);

    leftForearm.rotation.x = THREE.MathUtils.lerp(groundForearmX, airForearmX, inAirWeight);
    rightForearm.rotation.x = THREE.MathUtils.lerp(groundForearmX, airForearmX, inAirWeight);

    leftThigh.rotation.x = THREE.MathUtils.lerp(groundLeftLegX, airLeftLegX, inAirWeight);
    rightThigh.rotation.x = THREE.MathUtils.lerp(groundRightLegX, airRightLegX, inAirWeight);
    leftCalf.rotation.x = THREE.MathUtils.lerp(groundLeftCalfX, airLeftCalfX, inAirWeight);
    rightCalf.rotation.x = THREE.MathUtils.lerp(groundRightCalfX, airRightCalfX, inAirWeight);

    // 5. Emotional Partner Look-At System
    if (state.lookAtPartnerPos) {
      const dx = state.lookAtPartnerPos.x - root.position.x;
      const dz = state.lookAtPartnerPos.z - root.position.z;
      const targetYaw = THREE.MathUtils.clamp(Math.atan2(dx, dz) * 0.45, -0.65, 0.65);
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, targetYaw, 6, dt);
    } else {
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, 0, 6, dt);
    }

    // 6. Dynamic Secondary Spring Physics: Ponytail & Drawstrings
    if (ponytailRoot) {
      const targetPonyX = -forwardLean * 1.5 - (state.velocity.y < -0.5 ? -0.3 : 0.2);
      const targetPonyZ = bankAngle * 1.8;

      const springK = 38.0;
      const dampingC = 7.5;

      const forceX = -springK * (ponyAngleX - targetPonyX) - dampingC * ponyVelX - accelZ * 0.04;
      const forceZ = -springK * (ponyAngleZ - targetPonyZ) - dampingC * ponyVelZ - accelX * 0.04;

      ponyVelX += forceX * dt;
      ponyVelZ += forceZ * dt;
      ponyAngleX += ponyVelX * dt;
      ponyAngleZ += ponyVelZ * dt;

      ponytailRoot.rotation.x = THREE.MathUtils.clamp(ponyAngleX, -0.6, 0.9);
      ponytailRoot.rotation.z = THREE.MathUtils.clamp(ponyAngleZ, -0.6, 0.6);
    }

    // Secondary Drawstrings Sway
    drawstringSwing = THREE.MathUtils.damp(drawstringSwing, forwardLean * 0.5 + Math.sin(animTimer * 4) * 0.05, 8, dt);
    if (leftDrawstring && rightDrawstring) {
      leftDrawstring.rotation.x = drawstringSwing;
      rightDrawstring.rotation.x = drawstringSwing;
    }
  };

  const updateCustomization = (cust: CharacterCustomization) => {
    skinMat.color.set(cust.skinTone);
    skinMat.sheenColor.set(isBoy ? '#fb7185' : '#f43f5e');
    earSkinMat.color.set(cust.skinTone);
    earSkinMat.sheenColor.set(isBoy ? '#fb7185' : '#f43f5e');
    innerEarMat.sheenColor.set(isBoy ? '#e11d48' : '#be123c');
    faceMat.sheenColor.set(isBoy ? '#fb7185' : '#f43f5e');
    hairMat.color.set(cust.hairColor);
    hairHighlightMat.color.set(new THREE.Color(cust.hairColor).offsetHSL(0.02, 0.08, 0.12));
    hoodieMat.color.set(cust.clothingPrimaryColor);
    hoodieTrimMat.color.set(new THREE.Color(cust.clothingPrimaryColor).offsetHSL(0, 0.04, -0.10));
    sneakerUpperMat.color.set(cust.clothingPrimaryColor);

    // Update dynamic face controller
    faceController.setCustomization(cust.skinTone, cust.eyeColor, cust.hairColor);

    glassesGroup.visible = !!cust.accessories.glasses;

    if (pendantMesh) {
      pendantMesh.visible = !!cust.accessories.pendant;
    }
    if (backpackMesh) {
      backpackMesh.visible = !!cust.accessories.backpack;
    }
  };

  return {
    group: root,
    gender,
    skeleton,
    hips,
    torso: spineUpper,
    head,
    hairGroup,
    leftArm,
    rightArm,
    leftForearm,
    rightForearm,
    leftHand,
    rightHand,
    leftLeg: leftThigh,
    rightLeg: rightThigh,
    leftCalf,
    rightCalf,
    leftFoot,
    rightFoot,
    glassesMesh: glassesGroup as unknown as THREE.Mesh,
    pendantMesh,
    backpackMesh,
    materials,
    facialController: faceController,
    triggerFacialExpression,
    updateAnimation,
    updateCustomization
  };
}
