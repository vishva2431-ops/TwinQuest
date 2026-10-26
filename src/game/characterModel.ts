import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CharacterCustomization, CharacterGender } from '../types/game';

/**
 * Premium stylized character rig for TwinQuest (Leo = 'boy', Maya = 'girl').
 *
 * Fully procedural (no external assets). Compared with the previous version:
 *  - lathe-sculpted torso, tapered limbs, rounded hands with fingers, detailed shoes
 *  - layered instanced hair (one draw call per hair layer), ponytail with secondary motion
 *  - large expressive eyes (iris, pupil, highlights), lashes, brows, mouth, blush, ears
 *  - jacket seams, stitching, pockets, collar, hem and cuffs; skirt + bow for Maya
 *  - pose-target animation (idle breathing, blinking, walk/run, jump, landing, fall, cheer, dead)
 *
 * The public contract (CharacterRig, CharacterAnimationState, createCharacterRig) is unchanged.
 * Requires three >= r137 (no CapsuleGeometry / sheen used) and three/examples RoundedBoxGeometry.
 */

/**
 * Event-driven facial reactions. GameController calls
 * rig.facialController.triggerEvent('jump' | 'land' | 'trap_near' | 'collect_item' | 'checkpoint' | 'victory', { duration }).
 * Unknown event names are ignored, so new events can be added safely.
 */
export interface FacialController {
  triggerEvent: (event: string, options?: { duration?: number }) => void;
}

interface ExpressionOverride {
  smile?: number;
  mouthOpen?: number;
  brow?: number;
  eyeOpen?: number;
  duration: number;
}

export interface CharacterRig {
  group: THREE.Group;
  gender: CharacterGender;
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
  facialController: FacialController;
  materials: THREE.Material[];
  updateAnimation: (state: CharacterAnimationState, delta: number) => void;
  updateCustomization: (cust: CharacterCustomization) => void;
}

export interface CharacterAnimationState {
  velocity: THREE.Vector3;
  isGrounded: boolean;
  isJumping: boolean;
  isFalling: boolean;
  isDead: boolean;
  isCheering: boolean;
  isSurprised?: boolean;
  lookAtPartnerPos?: THREE.Vector3;
}

/* -------------------------------------------------------------------------- */
/* Module helpers                                                              */
/* -------------------------------------------------------------------------- */

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Deterministic PRNG so hair looks identical every time a character is created. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounded, tapered limb segment built from a lathe profile (cap centres are `length` apart). */
function taperedLimbGeometry(rTop: number, rBottom: number, length: number, radial = 14): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const b = (Math.PI / 2) * (1 - i / steps);
    pts.push(new THREE.Vector2(Math.max(rBottom * Math.cos(b), 0.0001), -length / 2 - rBottom * Math.sin(b)));
  }
  for (let i = 0; i <= steps; i++) {
    const a = (Math.PI / 2) * (1 - i / steps);
    pts.push(new THREE.Vector2(Math.max(rTop * Math.sin(a), 0.0001), length / 2 + rTop * Math.cos(a)));
  }
  return new THREE.LatheGeometry(pts, radial);
}

function tubeGeometry(points: THREE.Vector3[], radius: number, segments = 24, radial = 6): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, radial, false);
}

interface Lock {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

function buildInstanced(geometry: THREE.BufferGeometry, material: THREE.Material, locks: Lock[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(locks.length, 1));
  const m = new THREE.Matrix4();
  locks.forEach((l, i) => {
    m.compose(l.position, l.quaternion, l.scale);
    mesh.setMatrixAt(i, m);
  });
  mesh.count = locks.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false; // instance bounds are not tracked on older three versions
  mesh.castShadow = true;
  return mesh;
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = THREE.MathUtils.clamp;

/** Neutral pose (targets that the animation system damps toward every frame). */
const REST = {
  hipsY: 0.95,
  torsoX: 0, torsoY: 0, torsoZ: 0,
  headX: 0, headY: 0, headZ: 0,
  lArmX: 0, rArmX: 0, lArmZ: -0.06, rArmZ: 0.06,
  lForeX: -0.12, rForeX: -0.12,
  lLegX: 0, rLegX: 0, lLegZ: 0, rLegZ: 0,
  lCalfX: 0, rCalfX: 0, lFootX: 0, rFootX: 0,
  hairX: 0, ponyX: 0.55, ponyZ: 0, skirtX: 0, skirtZ: 0,
  brow: 0, eyeOpen: 1, smile: 0.85, mouthOpen: 0, lookX: 0, lookY: 0
};
type Pose = typeof REST;
type PoseKey = keyof Pose;

/* -------------------------------------------------------------------------- */
/* Character factory                                                           */
/* -------------------------------------------------------------------------- */

/** Original code-built character. Used as the fallback by glbCharacter.ts (the GLB models). */
export function createProceduralCharacterRig(gender: CharacterGender, customization: CharacterCustomization): CharacterRig {
  const root = new THREE.Group();
  root.name = gender === 'boy' ? 'Leo' : 'Maya';
  const materials: THREE.Material[] = [];

  const isBoy = gender === 'boy';
  const S = isBoy ? 1.0 : 0.94;
  const u = (v: number) => v * S;

  /* ----------------------------- colours --------------------------------- */
  const skinColor = new THREE.Color(customization.skinTone || (isBoy ? '#e0a980' : '#fcd3b8'));
  const hairColor = new THREE.Color(customization.hairColor || (isBoy ? '#3b2518' : '#78350f'));
  const eyeColor = new THREE.Color(customization.eyeColor || (isBoy ? '#2563eb' : '#059669'));
  const jacketColor = new THREE.Color(customization.clothingPrimaryColor || (isBoy ? '#1e3a8a' : '#e11d48'));
  const accentColor = new THREE.Color(customization.clothingSecondaryColor || '#fbbf24');
  const white = new THREE.Color('#ffffff');
  const shade = (c: THREE.Color, f: number) => c.clone().multiplyScalar(f);
  const tint = (c: THREE.Color, a: number) => c.clone().lerp(white, a);

  /* ----------------------------- materials ------------------------------- */
  const std = (
    color: THREE.ColorRepresentation,
    roughness: number,
    metalness = 0,
    extra: THREE.MeshStandardMaterialParameters = {}
  ) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    materials.push(m);
    return m;
  };
  const basic = (color: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) => {
    const m = new THREE.MeshBasicMaterial({ color, ...extra });
    materials.push(m);
    return m;
  };

  // Skin: soft roughness plus a faint warm emissive to fake subsurface scattering in shadow.
  const skinMat = std(skinColor, 0.55, 0, { emissive: shade(skinColor, 0.07) });
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: hairColor, roughness: 0.42, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.32
  });
  materials.push(hairMat);
  const hairHiMat = std(tint(hairColor, 0.3), 0.3, 0);
  const jacketMat = std(jacketColor, 0.72, 0);
  const seamMat = std(shade(jacketColor, 0.62), 0.8);
  const stitchMat = std(tint(jacketColor, 0.5), 0.8);
  const skirtMat = std(tint(jacketColor, 0.08), 0.75, 0, { side: THREE.DoubleSide });
  const pantsMat = std(isBoy ? '#1f2937' : '#4b3b5c', 0.85);
  const bootMat = std(isBoy ? '#5b2a0b' : '#3a2230', 0.45, 0.1);
  const soleMat = std('#f1f5f9', 0.6);
  const goldMat = std(accentColor, 0.25, 0.85);
  const ribbonMat = std(accentColor, 0.45, 0.1);
  const shirtMat = std('#f8fafc', 0.7);
  const beltMat = std('#171717', 0.5);
  const lipMat = std(isBoy ? '#c28766' : '#e8647f', 0.4);
  const scleraMat = std('#fbfbfd', 0.25);
  const irisRingMat = std(shade(eyeColor, 0.35), 0.3);
  const irisMat = std(eyeColor, 0.25, 0, { emissive: shade(eyeColor, 0.35) });
  const irisInnerMat = std(tint(eyeColor, 0.35), 0.3, 0, { emissive: shade(tint(eyeColor, 0.35), 0.3) });
  const pupilMat = basic('#05060a');
  const highlightMat = basic('#ffffff');
  const mouthInnerMat = basic('#5b1a26');
  const blushMat = basic(isBoy ? '#ff9a8a' : '#ff6f8f', {
    transparent: true, opacity: isBoy ? 0.12 : 0.3, depthWrite: false
  });
  const frameMat = std('#0f172a', 0.2, 0.8);
  const packMat = std('#78350f', 0.7);
  const packStrapMat = std('#451a03', 0.75);
  const pendantMat = std('#f43f5e', 0.2, 0.8);

  /* ----------------------------- shared geometry ------------------------- */
  const unitSphere = new THREE.SphereGeometry(1, 24, 16);
  const ell = (
    mat: THREE.Material, rx: number, ry: number, rz: number,
    x = 0, y = 0, z = 0, cast = false
  ) => {
    const m = new THREE.Mesh(unitSphere, mat);
    m.scale.set(rx, ry, rz);
    m.position.set(x, y, z);
    m.castShadow = cast;
    return m;
  };
  const rbox = (mat: THREE.Material, w: number, h: number, d: number, r: number, cast = false) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
    m.castShadow = cast;
    return m;
  };
  const detailNodes: THREE.Object3D[] = []; // hidden by setCharacterDetailLevel('low')

  /* ============================== HIPS ==================================== */
  const hips = new THREE.Group();
  hips.position.y = u(0.95);
  root.add(hips);

  hips.add(ell(pantsMat, u(0.165), u(0.1), u(0.115), 0, 0, 0, true));

  if (isBoy) {
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(u(0.168), u(0.168), u(0.045), 24), beltMat);
    belt.scale.z = 0.74;
    belt.position.y = u(0.075);
    hips.add(belt);
    const buckle = rbox(goldMat, u(0.055), u(0.04), u(0.02), u(0.008));
    buckle.position.set(0, u(0.075), u(0.128));
    hips.add(buckle);
  }

  /* ============================== TORSO =================================== */
  const torso = new THREE.Group();
  torso.position.y = u(0.1);
  hips.add(torso);

  // Chest group is what "breathes" (scaled slightly) without moving head/arms.
  const chest = new THREE.Group();
  torso.add(chest);

  // [y, radius] profile (unscaled) -> lathe, flattened front-to-back.
  const prof: Array<[number, number]> = isBoy
    ? [[0, 0.15], [0.04, 0.15], [0.1, 0.158], [0.18, 0.176], [0.26, 0.2], [0.33, 0.212], [0.38, 0.208], [0.42, 0.17], [0.45, 0.108], [0.47, 0.088]]
    : [[0, 0.138], [0.04, 0.13], [0.1, 0.128], [0.18, 0.142], [0.26, 0.17], [0.33, 0.18], [0.38, 0.176], [0.42, 0.15], [0.45, 0.104], [0.47, 0.088]];
  const DEPTH = 0.66;
  const rAt = (y: number) => {
    if (y <= prof[0][0]) return prof[0][1];
    for (let i = 1; i < prof.length; i++) {
      if (y <= prof[i][0]) {
        const [y0, r0] = prof[i - 1];
        const [y1, r1] = prof[i];
        return r0 + (r1 - r0) * ((y - y0) / (y1 - y0));
      }
    }
    return prof[prof.length - 1][1];
  };
  const surfZ = (x: number, y: number) => DEPTH * Math.sqrt(Math.max(rAt(y) * rAt(y) - x * x, 0));
  const surfPoints = (xOf: (y: number) => number, y0: number, y1: number, n: number, off = 0.003) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const y = y0 + ((y1 - y0) * i) / n;
      const x = xOf(y);
      return new THREE.Vector3(u(x), u(y), u(surfZ(x, y) + off));
    });

  const torsoGeo = new THREE.LatheGeometry(
    [new THREE.Vector2(0.0001, 0), ...prof.map(([y, r]) => new THREE.Vector2(u(r), u(y)))],
    32
  );
  torsoGeo.scale(1, 1, DEPTH);
  const torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
  torsoMesh.castShadow = true;
  chest.add(torsoMesh);

  const addTube = (parent: THREE.Object3D, pts: THREE.Vector3[], radius: number, mat: THREE.Material, seg = 16) => {
    const t = new THREE.Mesh(tubeGeometry(pts, radius, seg, 5), mat);
    parent.add(t);
    detailNodes.push(t);
    return t;
  };

  // Side seams, front placket, stitching
  [-1, 1].forEach((side) => {
    addTube(chest, surfPoints((y) => side * rAt(y) * 0.97, 0.04, 0.34, 8), u(0.0042), seamMat);
    addTube(chest, surfPoints((y) => side * rAt(y) * 0.955, 0.04, 0.34, 8), u(0.0022), stitchMat);
  });
  if (isBoy) {
    addTube(chest, surfPoints(() => 0, 0.03, 0.43, 10), u(0.0045), goldMat); // zipper
    [-1, 1].forEach((s) => addTube(chest, surfPoints(() => s * 0.016, 0.03, 0.43, 10), u(0.0028), stitchMat));
    // chest pockets
    [-1, 1].forEach((s) => {
      const x = s * 0.095;
      const y = 0.13;
      const pocket = rbox(seamMat, u(0.075), u(0.05), u(0.012), u(0.004));
      pocket.position.set(u(x), u(y), u(surfZ(x, y) + 0.003));
      pocket.rotation.y = s * Math.asin(clamp(x / rAt(y), -1, 1)) * 0.9;
      chest.add(pocket);
      detailNodes.push(pocket);
    });
  } else {
    // princess seams + waist sash
    [-1, 1].forEach((s) => {
      addTube(chest, surfPoints((y) => s * rAt(y) * 0.46, 0.05, 0.38, 10), u(0.004), seamMat);
      addTube(chest, surfPoints((y) => s * rAt(y) * 0.46 + s * 0.006, 0.05, 0.38, 10), u(0.002), stitchMat);
    });
  }

  // Hem band and collar
  const hem = new THREE.Mesh(new THREE.TorusGeometry(u(rAt(0.03)), u(0.013), 8, 32), isBoy ? seamMat : ribbonMat);
  hem.rotation.x = Math.PI / 2;
  hem.scale.y = DEPTH;
  hem.position.y = u(0.03);
  chest.add(hem);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(u(0.09), u(0.02), 8, 28), jacketMat);
  collar.rotation.x = Math.PI / 2;
  collar.scale.y = 0.85;
  collar.position.y = u(0.452);
  chest.add(collar);
  if (isBoy) {
    const innerCollar = new THREE.Mesh(new THREE.TorusGeometry(u(0.076), u(0.013), 8, 24), shirtMat);
    innerCollar.rotation.x = Math.PI / 2;
    innerCollar.scale.y = 0.9;
    innerCollar.position.y = u(0.465);
    chest.add(innerCollar);
  } else {
    // bow at the collar
    const bowY = u(0.4);
    const bowZ = u(surfZ(0, 0.4) + 0.012);
    [-1, 1].forEach((s) => {
      const loop = ell(ribbonMat, u(0.035), u(0.02), u(0.01), s * u(0.034), bowY, bowZ);
      loop.rotation.z = s * 0.35;
      chest.add(loop);
    });
    chest.add(ell(ribbonMat, u(0.014), u(0.014), u(0.012), 0, bowY, bowZ + u(0.003)));
  }

  /* ----------------------------- neck ------------------------------------ */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(u(0.066), u(0.074), u(0.1), 14), skinMat);
  neck.position.y = u(0.47);
  neck.castShadow = true;
  torso.add(neck);

  /* ----------------------------- accessories on torso -------------------- */
  const hasGlasses = !!customization.accessories?.glasses;
  const hasPendant = !isBoy || !!customization.accessories?.pendant;
  const hasBackpack = isBoy && !!customization.accessories?.backpack;

  // Backpack (Leo). Built always so it can be toggled later.
  let backpackMesh: THREE.Mesh | undefined;
  if (isBoy) {
    const packPos = new THREE.Vector3(0, u(0.24), u(-0.185));
    backpackMesh = rbox(packMat, u(0.28), u(0.34), u(0.14), u(0.04), true);
    backpackMesh.position.copy(packPos);
    const flap = rbox(packStrapMat, u(0.26), u(0.12), u(0.02), u(0.01));
    flap.position.set(0, u(0.1), u(-0.078));
    backpackMesh.add(flap);
    const pocket = rbox(packStrapMat, u(0.18), u(0.1), u(0.03), u(0.012));
    pocket.position.set(0, u(-0.08), u(-0.08));
    backpackMesh.add(pocket);
    [-1, 1].forEach((s) => {
      const x = s * 0.09;
      const strapPts = [
        new THREE.Vector3(u(x), u(0.1), -u(surfZ(x, 0.1) + 0.008)),
        new THREE.Vector3(u(x), u(0.3), -u(surfZ(x, 0.3) + 0.008)),
        new THREE.Vector3(u(x), u(0.44), -u(0.045)),
        new THREE.Vector3(u(x), u(0.458), 0),
        new THREE.Vector3(u(x), u(0.435), u(0.05)),
        new THREE.Vector3(u(x), u(0.36), u(surfZ(x, 0.36) + 0.008)),
        new THREE.Vector3(u(x), u(0.2), u(surfZ(x, 0.2) + 0.008))
      ].map((p) => p.sub(packPos));
      backpackMesh!.add(new THREE.Mesh(tubeGeometry(strapPts, u(0.012), 20, 6), packStrapMat));
    });
    backpackMesh.visible = hasBackpack;
    torso.add(backpackMesh);
  }

  // Heart pendant (always for Maya, optional for Leo).
  const heart = new THREE.Shape();
  heart.moveTo(0, -0.05);
  heart.bezierCurveTo(-0.01, -0.03, -0.06, 0.0, -0.05, 0.03);
  heart.bezierCurveTo(-0.045, 0.055, -0.01, 0.055, 0, 0.032);
  heart.bezierCurveTo(0.01, 0.055, 0.045, 0.055, 0.05, 0.03);
  heart.bezierCurveTo(0.06, 0.0, 0.01, -0.03, 0, -0.05);
  const heartGeo = new THREE.ExtrudeGeometry(heart, {
    depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 3
  });
  heartGeo.center();
  const pendantMesh = new THREE.Mesh(heartGeo, pendantMat);
  pendantMesh.scale.setScalar(u(0.7));
  const pendantPos = new THREE.Vector3(0, u(0.31), u(surfZ(0, 0.31) + 0.02));
  pendantMesh.position.copy(pendantPos);
  const chainPts = [
    new THREE.Vector3(u(-0.078), u(0.44), u(0.012)),
    new THREE.Vector3(u(-0.06), u(0.4), u(surfZ(0.06, 0.4) + 0.006)),
    new THREE.Vector3(0, u(0.335), u(surfZ(0, 0.335) + 0.012)),
    new THREE.Vector3(u(0.06), u(0.4), u(surfZ(0.06, 0.4) + 0.006)),
    new THREE.Vector3(u(0.078), u(0.44), u(0.012))
  ].map((p) => p.sub(pendantPos).divideScalar(u(0.7)));
  pendantMesh.add(new THREE.Mesh(tubeGeometry(chainPts, 0.0035 / 0.7, 20, 5), goldMat));
  pendantMesh.visible = hasPendant;
  torso.add(pendantMesh);

  /* ============================== HEAD ==================================== */
  const head = new THREE.Group();
  head.position.y = u(0.52);
  torso.add(head);

  const hx = u(0.145);
  const hy = u(0.17);
  const hz = u(0.155);
  const cy = u(0.14);
  const faceZ = (x: number, y: number) => {
    const a = x / hx;
    const b = (y - cy) / hy;
    return hz * Math.sqrt(Math.max(1 - a * a - b * b, 0.02));
  };
  const faceNormal = (x: number, y: number, z: number) =>
    new THREE.Vector3(x / (hx * hx), (y - cy) / (hy * hy), z / (hz * hz)).normalize();

  head.add(ell(skinMat, hx, hy, hz, 0, cy, 0, true));
  head.add(ell(skinMat, u(0.108), u(0.085), u(0.105), 0, cy - u(0.095), u(0.028), true)); // jaw / chin
  [-1, 1].forEach((s) => {
    const ear = ell(skinMat, u(0.02), u(0.034), u(0.014), s * hx * 0.985, cy - u(0.01), u(-0.01));
    ear.rotation.y = s * 0.25;
    head.add(ear);
  });
  const noseY = cy - u(0.045);
  head.add(ell(skinMat, u(0.016), u(0.014), u(0.018), 0, noseY, faceZ(0, noseY) - u(0.004)));

  // Blush
  [-1, 1].forEach((s) => {
    const x = s * u(0.088);
    const y = cy - u(0.05);
    const z = faceZ(x, y) + u(0.002);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(u(0.024), 16), blushMat);
    disc.position.set(x, y, z);
    disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), faceNormal(x, y, z));
    head.add(disc);
    detailNodes.push(disc);
  });

  /* ----------------------------- eyes ------------------------------------ */
  const eyeX = u(0.056);
  const eyeY = cy - u(0.005);
  const eyeZ = (x: number, y: number) =>
    u(0.026) * Math.sqrt(Math.max(1 - (x / u(0.034)) ** 2 - (y / u(0.038)) ** 2, 0.02));

  const eyes: THREE.Group[] = [];
  const irisGroups: THREE.Group[] = [];
  const makeEye = (side: number) => {
    const eye = new THREE.Group();
    const ez = faceZ(side * eyeX, eyeY) - u(0.012);
    eye.position.set(side * eyeX, eyeY, ez);
    eye.rotation.y = side * Math.atan2(eyeX, hx) * 0.7;

    eye.add(ell(scleraMat, u(0.034), u(0.038), u(0.026)));

    const iris = new THREE.Group();
    const disc = (mat: THREE.Material, r: number, z: number, x = 0, y = 0) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(u(r), 20), mat);
      m.position.set(u(x), u(y), u(z));
      iris.add(m);
      return m;
    };
    disc(irisRingMat, 0.0205, 0.0268, 0, -0.002).scale.y = 1.12;
    disc(irisMat, 0.0172, 0.0272, 0, -0.002).scale.y = 1.12;
    disc(irisInnerMat, 0.0105, 0.0275, 0, -0.005);
    disc(pupilMat, 0.0075, 0.0278, 0, -0.002).scale.y = 1.1;
    disc(highlightMat, 0.0046, 0.0284, 0.0068, 0.0075);
    eye.add(iris);
    irisGroups.push(iris);

    // Upper lash line (Maya gets a thicker line with an outer wing).
    const lashPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (0.92 - (0.84 * i) / 8);
      const x = side * u(0.029) * Math.cos(a) * 1; // mirrored per eye
      const y = u(0.0323) * Math.sin(a);
      lashPts.push(new THREE.Vector3(x, y, eyeZ(x, y) + u(0.0012)));
    }
    if (!isBoy) lashPts.push(new THREE.Vector3(side * u(0.042), u(0.03), u(0.013)));
    const lash = new THREE.Mesh(tubeGeometry(lashPts, u(isBoy ? 0.0028 : 0.0042), 20, 5), pupilMat);
    eye.add(lash);

    head.add(eye);
    eyes.push(eye);
  };
  makeEye(-1);
  makeEye(1);

  /* ----------------------------- brows ----------------------------------- */
  const brows: THREE.Mesh[] = [];
  [-1, 1].forEach((side) => {
    const pts: THREE.Vector3[] = [];
    const baseY = eyeY + u(0.047);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const x = side * (eyeX - u(0.027) + u(0.054) * t);
      const y = baseY + u(0.009) * Math.sin(Math.PI * Math.pow(t, 0.8)) - u(0.004) * t + (isBoy ? 0 : u(0.002));
      pts.push(new THREE.Vector3(x, y, faceZ(x, y) + u(0.003)));
    }
    const brow = new THREE.Mesh(tubeGeometry(pts, u(isBoy ? 0.0072 : 0.0048), 14, 5), hairMat);
    head.add(brow);
    brows.push(brow);
  });

  /* ----------------------------- mouth ----------------------------------- */
  const mouthY = cy - u(0.07);
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, mouthY, 0);
  head.add(mouthGroup);
  const mW = u(isBoy ? 0.03 : 0.027);
  const mD = u(0.011);
  const smilePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = -mW + (2 * mW * i) / 10;
    const y = -mD * (1 - (x / mW) * (x / mW));
    smilePts.push(new THREE.Vector3(x, y, faceZ(x, mouthY - mD * 0.5) + u(0.003)));
  }
  mouthGroup.add(new THREE.Mesh(tubeGeometry(smilePts, u(isBoy ? 0.0045 : 0.0055), 18, 6), lipMat));
  const mouthInner = ell(mouthInnerMat, u(0.02), u(0.0001), u(0.008), 0, -mD * 0.4, faceZ(0, mouthY) - u(0.004));
  mouthInner.visible = false;
  mouthGroup.add(mouthInner);

  /* ----------------------------- hair ------------------------------------ */
  const hairGroup = new THREE.Group();
  hairGroup.position.set(0, cy, 0); // pivot at head centre so secondary motion stays attached
  head.add(hairGroup);

  const rng = mulberry32(isBoy ? 1337 : 4242);
  const jit = (a: number) => (rng() - 0.5) * a;
  const tmpN = new THREE.Vector3();
  const tmpD = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const lockOnHead = (
    theta: number, phi: number, len: number, width: number,
    sweep: number, lift: number, gravity = 0, dir = 1
  ): Lock => {
    tmpN.set(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta));
    tmpD.set(Math.cos(phi) * Math.sin(theta), -Math.sin(phi), Math.cos(phi) * Math.cos(theta)).multiplyScalar(dir);
    tmpA.set(Math.cos(theta), 0, -Math.sin(theta));
    const t = new THREE.Vector3()
      .addScaledVector(tmpD, Math.cos(sweep))
      .addScaledVector(tmpA, Math.sin(sweep))
      .addScaledVector(tmpN, lift);
    t.multiplyScalar(1 - gravity).add(new THREE.Vector3(0, -gravity, 0)).normalize();
    const base = new THREE.Vector3(tmpN.x * hx, tmpN.y * hy, tmpN.z * hz).multiplyScalar(1.045);
    const l = u(len);
    return {
      position: base.clone().addScaledVector(t, l * 0.42),
      quaternion: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, t),
      scale: new THREE.Vector3(u(width), l * 0.5, u(width) * 0.85)
    };
  };

  const locks: Lock[] = [];
  const TAU = Math.PI * 2;

  // Cap
  const capLen = isBoy ? 1.5 : 1.7;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18, 0, TAU, 0, capLen), hairMat);
  cap.scale.set(hx * 1.05, hy * 1.04, hz * 1.06);
  cap.rotation.x = isBoy ? -0.32 : -0.42;
  cap.castShadow = true;
  hairGroup.add(cap);

  if (isBoy) {
    // swept quiff
    for (let i = 0; i < 6; i++) {
      const th = (i - 2.5) * 0.24 + jit(0.08);
      locks.push(lockOnHead(th, 0.3 + jit(0.1), 0.13 - Math.abs(i - 2.5) * 0.008, 0.034, th * 0.7, 0.85));
    }
    // crown + back
    for (let i = 0; i < 9; i++) {
      const th = 0.9 + ((TAU - 1.8) * i) / 8 + jit(0.15);
      locks.push(lockOnHead(th, 0.55 + jit(0.12), 0.105, 0.032, jit(0.4), 0.35, 0.15));
    }
    // sides / nape
    for (let i = 0; i < 12; i++) {
      const th = 0.95 + ((TAU - 1.9) * i) / 11 + jit(0.12);
      locks.push(lockOnHead(th, 1.0 + jit(0.15) + (i % 2) * 0.18, 0.09, 0.03, jit(0.3), 0.12, 0.2));
    }
    // fringe
    for (let i = 0; i < 7; i++) {
      const th = (i - 3) * 0.2 + jit(0.06);
      locks.push(lockOnHead(th, 0.66 + jit(0.05), 0.085, 0.024, (i % 2 ? 1 : -1) * 0.35 + jit(0.15), 0.5));
    }
    // sideburns
    [-1, 1].forEach((s) => locks.push(lockOnHead(s * 1.42, 1.18, 0.06, 0.02, 0, 0.1, 0.3)));
  } else {
    // curtain bangs
    for (let i = 0; i < 9; i++) {
      const th = (i - 4) * 0.2 + jit(0.04);
      const s = th === 0 ? 1 : Math.sign(th);
      locks.push(lockOnHead(th, 0.62 + jit(0.05), 0.12, 0.03, s * (0.35 + Math.abs(th) * 0.5), 0.5, 0.05));
    }
    // face-framing long locks
    [-1, 1].forEach((s) => {
      locks.push(lockOnHead(s * 1.18, 0.95, 0.2, 0.034, 0, 0.3, 0.55));
      locks.push(lockOnHead(s * 1.02, 0.8, 0.17, 0.03, s * 0.2, 0.35, 0.5));
    });
    // crown volume
    for (let i = 0; i < 8; i++) {
      const th = 1.0 + ((TAU - 2.0) * i) / 7 + jit(0.12);
      locks.push(lockOnHead(th, 0.45 + jit(0.08), 0.11, 0.034, jit(0.3), 0.45, 0.2));
    }
    // back layers
    [[0.85, 8, 0.16], [1.2, 8, 0.19], [1.5, 6, 0.17]].forEach(([phi, n, len]) => {
      for (let i = 0; i < n; i++) {
        const th = 1.6 + ((TAU - 3.2) * i) / (n - 1) + jit(0.1);
        locks.push(lockOnHead(th, phi + jit(0.08), len, 0.034, jit(0.25), 0.2, 0.6));
      }
    });
    // volume behind head/neck
    const mass = ell(hairMat, hx * 1.02, u(0.2), u(0.095), 0, -u(0.1), -u(0.075), true);
    hairGroup.add(mass);

    // Ponytail with scrunchie + bow, driven by its own pivot for secondary motion
    const ponyPivot = new THREE.Group();
    ponyPivot.position.set(0, u(0.1), -u(0.125));
    ponyPivot.name = 'ponytail';
    hairGroup.add(ponyPivot);
    const scrunchie = new THREE.Mesh(new THREE.TorusGeometry(u(0.032), u(0.013), 8, 16), ribbonMat);
    scrunchie.rotation.x = Math.PI / 2;
    ponyPivot.add(scrunchie);
    [-1, 1].forEach((s) => {
      const loop = ell(ribbonMat, u(0.036), u(0.022), u(0.01), s * u(0.03), u(0.008), -u(0.03));
      loop.rotation.z = s * 0.5;
      ponyPivot.add(loop);
    });
    ponyPivot.add(ell(ribbonMat, u(0.013), u(0.013), u(0.012), 0, u(0.008), -u(0.032)));

    const ponyLocks: Lock[] = [];
    const ponyHi: Lock[] = [];
    for (let i = 0; i < 7; i++) {
      const spread = (i - 3) * 0.1;
      const len = u(0.3 - Math.abs(i - 3) * 0.03);
      const t = new THREE.Vector3(Math.sin(spread) * 0.9, -Math.cos(spread * 0.5), Math.sin(spread * 0.4)).normalize();
      const lock: Lock = {
        position: new THREE.Vector3(spread * u(0.12), -u(0.02), -u(0.02)).addScaledVector(t, len * 0.5),
        quaternion: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, t),
        scale: new THREE.Vector3(u(0.04), len * 0.5, u(0.034))
      };
      (i % 3 === 1 ? ponyHi : ponyLocks).push(lock);
    }
    ponyPivot.add(buildInstanced(unitSphere, hairMat, ponyLocks));
    ponyPivot.add(buildInstanced(unitSphere, hairHiMat, ponyHi));
    (hairGroup.userData as { ponyPivot?: THREE.Group }).ponyPivot = ponyPivot;
  }

  const hairBase: Lock[] = [];
  const hairHi: Lock[] = [];
  locks.forEach((l, i) => (i % 5 === 2 ? hairHi : hairBase).push(l));
  hairGroup.add(buildInstanced(unitSphere, hairMat, hairBase));
  hairGroup.add(buildInstanced(unitSphere, hairHiMat, hairHi));

  /* ----------------------------- glasses --------------------------------- */
  const gy = eyeY;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(u(0.04), u(0.008), u(0.008)), frameMat);
  const bridgePos = new THREE.Vector3(0, gy, faceZ(0, gy) + u(0.018));
  bridge.position.copy(bridgePos);
  [-1, 1].forEach((s) => {
    const x = s * u(0.062);
    const rimZ = faceZ(x, gy) + u(0.016);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(u(0.043), u(0.0052), 8, 28), frameMat);
    rim.position.set(x, gy, rimZ).sub(bridgePos);
    rim.rotation.y = s * 0.4;
    bridge.add(rim);
    const temple = new THREE.Mesh(
      tubeGeometry(
        [
          new THREE.Vector3(s * u(0.103), gy, faceZ(s * u(0.103), gy) + u(0.006)),
          new THREE.Vector3(s * u(0.14), gy, u(0.04)),
          new THREE.Vector3(s * u(0.145), gy - u(0.01), -u(0.01))
        ].map((p) => p.sub(bridgePos)),
        u(0.0036), 10, 5
      ),
      frameMat
    );
    bridge.add(temple);
  });
  bridge.visible = hasGlasses;
  head.add(bridge);
  const glassesMesh: THREE.Mesh = bridge;

  /* ============================== ARMS ==================================== */
  const armR = u(0.055);
  const armLen = u(0.26);
  const chestWidth = isBoy ? 0.42 : 0.36;
  const armX = (chestWidth * 0.5 + 0.055) * 0.95;

  const makeHand = (parent: THREE.Group, inward: number) => {
    const palm = rbox(skinMat, u(0.036), u(0.07), u(0.06), u(0.014), true);
    palm.position.y = -u(0.04);
    parent.add(palm);

    const fingerLens = [0.036, 0.042, 0.04, 0.032];
    const fingerLocks: Lock[] = fingerLens.map((len, i) => {
      const curl = inward * (0.32 + i * 0.03);
      const dir = new THREE.Vector3(Math.sin(curl), -Math.cos(curl), 0);
      const pivot = new THREE.Vector3(0, -u(0.072), u(-0.024 + i * 0.016));
      const l = u(len);
      return {
        position: pivot.clone().addScaledVector(dir, l * 0.5),
        quaternion: new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir),
        scale: new THREE.Vector3(u(0.0105), l * 0.62, u(0.0098))
      };
    });
    const fingers = buildInstanced(unitSphere, skinMat, fingerLocks);
    parent.add(fingers);
    detailNodes.push(fingers);

    const thumb = new THREE.Mesh(taperedLimbGeometry(u(0.0115), u(0.0095), u(0.022), 8), skinMat);
    thumb.position.set(inward * u(0.004), -u(0.034), u(0.036));
    thumb.rotation.x = -0.65;
    thumb.rotation.z = inward * 0.2;
    parent.add(thumb);
    detailNodes.push(thumb);
  };

  const makeArm = (side: number) => {
    const inward = -side; // +1 means "toward the body centre is +x"
    const arm = new THREE.Group();
    arm.position.set(side * u(armX), u(0.38), 0);
    torso.add(arm);

    const upper = new THREE.Mesh(taperedLimbGeometry(armR, armR * 0.88, armLen), jacketMat);
    upper.position.y = -armLen / 2;
    upper.castShadow = true;
    arm.add(upper);

    // armhole seam
    const seam = new THREE.Mesh(new THREE.TorusGeometry(armR * 1.02, u(0.004), 6, 20), seamMat);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = -u(0.02);
    arm.add(seam);
    detailNodes.push(seam);

    const forearm = new THREE.Group();
    forearm.position.y = -armLen;
    arm.add(forearm);

    // Maya wears an elbow-length sleeve, Leo a full sleeve.
    const foreMat = isBoy ? jacketMat : skinMat;
    const fore = new THREE.Mesh(taperedLimbGeometry(armR * 0.86, armR * 0.74, armLen), foreMat);
    fore.position.y = -armLen / 2;
    fore.castShadow = true;
    forearm.add(fore);

    // elbow fold wrinkles
    for (let k = 0; k < 2; k++) {
      const arc = 1.5;
      const fold = new THREE.Mesh(new THREE.TorusGeometry(armR * (0.9 - k * 0.02), u(0.0034), 5, 12, arc), seamMat);
      fold.rotation.set(Math.PI / 2, 0, Math.PI / 2 - arc / 2);
      fold.position.y = -u(0.012) - k * u(0.014);
      forearm.add(fold);
      detailNodes.push(fold);
    }

    if (isBoy) {
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(armR * 0.78, u(0.01), 8, 18), seamMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -armLen + u(0.012);
      forearm.add(cuff);
    } else {
      const sleeveEdge = new THREE.Mesh(new THREE.TorusGeometry(armR * 0.9, u(0.012), 8, 18), ribbonMat);
      sleeveEdge.rotation.x = Math.PI / 2;
      sleeveEdge.position.y = -u(0.03);
      forearm.add(sleeveEdge);
      const bracelet = new THREE.Mesh(new THREE.TorusGeometry(armR * 0.74, u(0.0058), 8, 18), goldMat);
      bracelet.rotation.x = Math.PI / 2;
      bracelet.position.y = -armLen + u(0.014);
      forearm.add(bracelet);
    }

    const hand = new THREE.Group();
    hand.position.y = -armLen;
    forearm.add(hand);
    makeHand(hand, inward);

    return { arm, forearm, hand };
  };
  const L = makeArm(-1);
  const R = makeArm(1);
  const leftArm = L.arm, leftForearm = L.forearm, leftHand = L.hand;
  const rightArm = R.arm, rightForearm = R.forearm, rightHand = R.hand;

  /* ============================== LEGS ==================================== */
  const legR = u(isBoy ? 0.076 : 0.072);
  const thighLen = u(0.38);
  const calfLen = u(0.38);
  const hipSpacing = u(isBoy ? 0.11 : 0.104);

  const makeShoe = (parent: THREE.Group) => {
    const sole = rbox(soleMat, u(0.118), u(0.03), u(0.262), u(0.012), true);
    sole.position.set(0, -u(0.105), u(0.045));
    parent.add(sole);
    const upper = rbox(bootMat, u(0.104), u(0.082), u(0.215), u(0.032), true);
    upper.position.set(0, -u(0.058), u(0.04));
    parent.add(upper);
    const toe = ell(bootMat, u(0.052), u(0.04), u(0.062), 0, -u(0.07), u(0.12), true);
    parent.add(toe);
    const toeCap = ell(soleMat, u(0.05), u(0.014), u(0.052), 0, -u(0.088), u(0.134));
    parent.add(toeCap);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(u(0.06), u(0.011), 8, 18), isBoy ? seamMat : goldMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -u(0.008);
    parent.add(cuff);
    const laceLocks: Lock[] = [0, 1, 2].map((i) => ({
      position: new THREE.Vector3(0, -u(0.014), u(0.03 + i * 0.04)),
      quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2),
      scale: new THREE.Vector3(u(0.007), u(0.04), u(0.007))
    }));
    const laces = buildInstanced(unitSphere, soleMat, laceLocks);
    laces.castShadow = false;
    parent.add(laces);
    detailNodes.push(laces);
    if (!isBoy) {
      const shaft = new THREE.Mesh(taperedLimbGeometry(u(0.06), u(0.054), u(0.07)), bootMat);
      shaft.position.y = u(0.04);
      shaft.castShadow = true;
      parent.add(shaft);
    }
  };

  const makeLeg = (side: number) => {
    const leg = new THREE.Group();
    leg.position.set(side * hipSpacing, -u(0.05), 0);
    hips.add(leg);

    const thigh = new THREE.Mesh(taperedLimbGeometry(legR, legR * 0.86, thighLen), pantsMat);
    thigh.position.y = -thighLen / 2;
    thigh.castShadow = true;
    leg.add(thigh);

    const calf = new THREE.Group();
    calf.position.y = -thighLen;
    leg.add(calf);

    const calfMesh = new THREE.Mesh(taperedLimbGeometry(legR * 0.86, legR * 0.72, calfLen), pantsMat);
    calfMesh.position.y = -calfLen / 2;
    calfMesh.castShadow = true;
    calf.add(calfMesh);

    // knee creases (behind the knee)
    for (let k = 0; k < 2; k++) {
      const arc = 1.4;
      const fold = new THREE.Mesh(new THREE.TorusGeometry(legR * 0.88, u(0.0036), 5, 12, arc), seamMat);
      fold.rotation.set(Math.PI / 2, 0, -Math.PI / 2 - arc / 2);
      fold.position.y = u(0.012) - k * u(0.016);
      calf.add(fold);
      detailNodes.push(fold);
    }

    if (isBoy) {
      const hemCuff = new THREE.Mesh(new THREE.TorusGeometry(legR * 0.74, u(0.009), 8, 18), seamMat);
      hemCuff.rotation.x = Math.PI / 2;
      hemCuff.position.y = -calfLen + u(0.05);
      calf.add(hemCuff);
    }

    const foot = new THREE.Group();
    foot.position.y = -calfLen;
    calf.add(foot);
    makeShoe(foot);

    return { leg, calf, foot };
  };
  const LL = makeLeg(-1);
  const RL = makeLeg(1);
  const leftLeg = LL.leg, leftCalf = LL.calf, leftFoot = LL.foot;
  const rightLeg = RL.leg, rightCalf = RL.calf, rightFoot = RL.foot;

  // Maya's flared skirt (belongs to hips so it follows body motion, sways separately)
  let skirt: THREE.Group | undefined;
  if (!isBoy) {
    skirt = new THREE.Group();
    skirt.position.y = u(0.04);
    hips.add(skirt);
    const skirtProfile = [
      [0.138, 0.07], [0.15, 0.03], [0.185, -0.04], [0.222, -0.12], [0.242, -0.2]
    ].map(([r, y]) => new THREE.Vector2(u(r), u(y)));
    const skirtMesh = new THREE.Mesh(new THREE.LatheGeometry(skirtProfile.reverse(), 36), skirtMat);
    skirtMesh.scale.z = 0.86;
    skirtMesh.castShadow = true;
    skirt.add(skirtMesh);
    const skirtHem = new THREE.Mesh(new THREE.TorusGeometry(u(0.242), u(0.01), 8, 36), ribbonMat);
    skirtHem.rotation.x = Math.PI / 2;
    skirtHem.scale.y = 0.86;
    skirtHem.position.y = -u(0.2);
    skirt.add(skirtHem);
    const waistSash = new THREE.Mesh(new THREE.TorusGeometry(u(0.14), u(0.012), 8, 28), ribbonMat);
    waistSash.rotation.x = Math.PI / 2;
    waistSash.scale.y = 0.86;
    waistSash.position.y = u(0.07);
    skirt.add(waistSash);
  }

  const ponyPivot = (hairGroup.userData as { ponyPivot?: THREE.Group }).ponyPivot;

  /* ============================== ANIMATION =============================== */
  const pose: Pose = { ...REST };
  const bind: Array<[THREE.Object3D, 'x' | 'y' | 'z', PoseKey, number]> = [
    [torso, 'x', 'torsoX', 10], [torso, 'y', 'torsoY', 12], [torso, 'z', 'torsoZ', 10],
    [head, 'x', 'headX', 10], [head, 'y', 'headY', 9], [head, 'z', 'headZ', 8],
    [leftArm, 'x', 'lArmX', 20], [rightArm, 'x', 'rArmX', 20],
    [leftArm, 'z', 'lArmZ', 12], [rightArm, 'z', 'rArmZ', 12],
    [leftForearm, 'x', 'lForeX', 18], [rightForearm, 'x', 'rForeX', 18],
    [leftLeg, 'x', 'lLegX', 22], [rightLeg, 'x', 'rLegX', 22],
    [leftLeg, 'z', 'lLegZ', 10], [rightLeg, 'z', 'rLegZ', 10],
    [leftCalf, 'x', 'lCalfX', 22], [rightCalf, 'x', 'rCalfX', 22],
    [leftFoot, 'x', 'lFootX', 22], [rightFoot, 'x', 'rFootX', 22],
    [hairGroup, 'x', 'hairX', 7]
  ];
  if (ponyPivot) {
    bind.push([ponyPivot, 'x', 'ponyX', 6], [ponyPivot, 'z', 'ponyZ', 5]);
  }
  if (skirt) {
    bind.push([skirt, 'x', 'skirtX', 7], [skirt, 'z', 'skirtZ', 7]);
  }

  let t = Math.random() * 100;
  let phase = Math.random() * Math.PI * 2;
  let wasGrounded = true;
  let lastVy = 0;
  let landT = 0;
  let landImpact = 0;
  let blinkTimer = 1 + Math.random() * 3;
  let blinkProg = -1;
  let eyeOpenCur = 1;
  let browCur = 0;
  let smileCur = REST.smile;
  let mouthOpenCur = 0;
  let lookXCur = 0;
  let lookYCur = 0;
  let hipsYCur = u(REST.hipsY);

  // Event-driven expression overrides (see FacialController)
  const EXPRESSIONS: Record<string, ExpressionOverride> = {
    jump: { smile: 1.25, brow: 0.004, duration: 0.6 },
    land: { eyeOpen: 0.7, smile: 0.6, duration: 0.25 },
    trap_near: { eyeOpen: 1.2, smile: -0.3, mouthOpen: 0.85, brow: 0.009, duration: 1.5 },
    collect_item: { smile: 1.5, mouthOpen: 0.3, brow: 0.005, duration: 1.5 },
    checkpoint: { smile: 1.3, brow: 0.003, duration: 1.2 },
    victory: { smile: 1.6, mouthOpen: 0.55, brow: 0.006, duration: 5 }
  };
  let override: ExpressionOverride | null = null;
  let overrideTimer = 0;
  const facialController: FacialController = {
    triggerEvent: (event, options) => {
      const e = EXPRESSIONS[event];
      if (!e) return;
      override = e;
      overrideTimer = options?.duration ?? e.duration;
    }
  };

  const updateAnimation = (state: CharacterAnimationState, delta: number) => {
    const dt = Math.min(delta, 0.1);
    t += dt;
    Object.assign(pose, REST);
    pose.hipsY = u(REST.hipsY);

    const vx = state.velocity.x;
    const vz = state.velocity.z;
    const vy = state.velocity.y;
    const speed = Math.sqrt(vx * vx + vz * vz);
    const moving = speed > 0.3;
    const runBlend = clamp((speed - 3) / 4, 0, 1);

    // Partner awareness (head + eyes)
    let partnerAngle = 0;
    let hasPartner = false;
    if (state.lookAtPartnerPos) {
      const dx = state.lookAtPartnerPos.x - root.position.x;
      const dz = state.lookAtPartnerPos.z - root.position.z;
      partnerAngle = clamp(wrapAngle(Math.atan2(dx, dz) - root.rotation.y), -0.7, 0.7);
      hasPartner = true;
    }

    // Landing detection
    if (!state.isDead) {
      if (!state.isGrounded) {
        lastVy = vy;
      } else if (!wasGrounded) {
        landImpact = clamp(-lastVy / 10, 0.25, 1);
        landT = 1;
      }
      wasGrounded = state.isGrounded;
    }
    landT = Math.max(0, landT - dt * 3.2);
    const crouch = landT * landImpact;

    if (state.isDead) {
      pose.hipsY = u(0.2);
      pose.torsoX = Math.PI * 0.45;
      pose.lArmX = pose.rArmX = -Math.PI * 0.5;
      pose.lArmZ = -0.5; pose.rArmZ = 0.5;
      pose.lLegX = 0.6; pose.rLegX = -0.6;
      pose.headX = 0.3;
      pose.eyeOpen = 0.1; pose.smile = -0.9; pose.mouthOpen = 0.35; pose.brow = 0.004;
      pose.ponyX = 0.2;
    } else if (state.isCheering) {
      const b = Math.abs(Math.sin(t * 6));
      pose.hipsY = u(REST.hipsY) + b * u(0.12);
      pose.lArmX = -Math.PI * 0.8 + Math.sin(t * 8) * 0.25;
      pose.rArmX = -Math.PI * 0.8 - Math.sin(t * 8) * 0.25;
      pose.lArmZ = -0.35; pose.rArmZ = 0.35;
      pose.lForeX = pose.rForeX = -0.3;
      pose.torsoY = Math.sin(t * 4) * 0.15;
      pose.headX = -0.15;
      pose.lLegX = -0.1 * b; pose.rLegX = -0.1 * b;
      pose.lCalfX = pose.rCalfX = b * 0.5;
      pose.smile = 1.5; pose.mouthOpen = 0.6; pose.brow = 0.006;
      pose.ponyX = 0.55 + b * 0.5;
      pose.skirtX = -b * 0.1;
    } else if (!state.isGrounded) {
      const rising = vy > 0;
      const falling = state.isFalling || vy < -1;
      pose.hipsY = u(REST.hipsY);
      if (falling && !rising) {
        // startled fall: arms flail, eyes wide, mouth open
        pose.lArmX = -1.1 + Math.sin(t * 18) * 0.2;
        pose.rArmX = -1.1 - Math.sin(t * 18) * 0.2;
        pose.lArmZ = -0.5; pose.rArmZ = 0.5;
        pose.lForeX = pose.rForeX = -0.2;
        pose.eyeOpen = 1.15; pose.smile = -0.2; pose.mouthOpen = 0.8; pose.brow = 0.008;
        pose.torsoX = 0.05;
        pose.lLegX = -0.35 + Math.sin(t * 14) * 0.15;
        pose.rLegX = 0.25 - Math.sin(t * 14) * 0.15;
        pose.ponyX = 1.2;
        pose.hairX = -0.06;
        pose.skirtX = -0.18;
      } else {
        // joyful jump: arms up, legs tuck
        pose.lArmX = -0.85; pose.rArmX = -0.85;
        pose.lArmZ = -0.3; pose.rArmZ = 0.3;
        pose.lForeX = pose.rForeX = -0.25;
        pose.lLegX = -0.4; pose.rLegX = 0.3;
        pose.lCalfX = 0.6; pose.rCalfX = 0.5;
        pose.torsoX = -0.05;
        pose.headX = -0.1;
        pose.smile = 1.25; pose.brow = 0.004;
        pose.ponyX = 0.1;
        pose.hairX = 0.05;
        pose.skirtX = 0.12;
      }
      pose.lFootX = 0.35; pose.rFootX = 0.35;
      if (hasPartner) pose.headY = partnerAngle * 0.3;
    } else if (moving) {
      const freq = Math.min(14, 6 + speed * 1.2);
      phase += dt * freq;
      const stride = Math.min(0.85, 0.3 + speed * 0.08);
      const swing = Math.sin(phase);
      const swing2 = Math.cos(phase);

      pose.lLegX = swing * stride;
      pose.rLegX = -swing * stride;
      pose.lCalfX = Math.max(0, -swing2) * (0.7 + 0.5 * runBlend) + 0.05;
      pose.rCalfX = Math.max(0, swing2) * (0.7 + 0.5 * runBlend) + 0.05;
      pose.lFootX = -pose.lCalfX * 0.4 - pose.lLegX * 0.25;
      pose.rFootX = -pose.rCalfX * 0.4 - pose.rLegX * 0.25;

      pose.lArmX = -swing * stride * 0.9;
      pose.rArmX = swing * stride * 0.9;
      pose.lForeX = -0.4 - runBlend * 0.5 - Math.abs(swing) * 0.3;
      pose.rForeX = pose.lForeX;
      pose.lArmZ = -0.05; pose.rArmZ = 0.05;

      pose.hipsY = u(REST.hipsY) - Math.abs(swing) * u(0.05 + 0.03 * runBlend);
      pose.torsoX = 0.1 + runBlend * 0.18;
      pose.torsoY = swing * 0.1;
      pose.torsoZ = swing2 * 0.025;
      pose.headY = -pose.torsoY * 0.5 + (hasPartner ? partnerAngle * 0.25 : 0);
      pose.headX = -pose.torsoX * 0.6;

      pose.hairX = Math.sin(phase * 2) * 0.05 - 0.05 * runBlend;
      pose.ponyX = clamp(0.55 + speed * 0.07, 0.55, 1.15) + Math.sin(phase * 2) * 0.08;
      pose.ponyZ = Math.sin(phase) * 0.1;
      pose.skirtZ = swing * 0.07;
      pose.skirtX = -0.04 - 0.1 * runBlend;
      pose.smile = 1.0 + runBlend * 0.3;
      pose.brow = 0.001 + runBlend * 0.002;
    } else {
      // Idle: breathing, weight shift, micro head motion, partner glance
      pose.hipsY = u(REST.hipsY) + Math.sin(t * 2) * u(0.012);
      pose.lArmX = Math.sin(t * 2) * 0.04;
      pose.rArmX = -Math.sin(t * 2) * 0.04;
      pose.lArmZ = -0.06 - Math.sin(t * 2) * 0.015;
      pose.rArmZ = 0.06 + Math.sin(t * 2) * 0.015;
      pose.lForeX = pose.rForeX = -0.15 + Math.sin(t * 1.3) * 0.03;
      pose.torsoY = Math.sin(t * 1.2) * 0.04;
      pose.torsoZ = Math.sin(t * 0.8) * 0.014;
      const shift = Math.sin(t * 0.5) * 0.02;
      pose.lLegZ = shift; pose.rLegZ = shift;
      pose.headX = Math.sin(t * 0.9) * 0.03;
      pose.headZ = Math.sin(t * 0.7) * 0.02;
      pose.headY = hasPartner ? partnerAngle : Math.sin(t * 0.6) * 0.05;
      pose.hairX = Math.sin(t * 1.5) * 0.015;
      pose.ponyX = 0.5 + Math.sin(t * 1.4) * 0.05;
      pose.ponyZ = Math.sin(t * 1.3) * 0.05;
      pose.skirtX = Math.sin(t * 1.4) * 0.01;
      pose.smile = hasPartner ? 1.1 : 0.85;
    }

    // Event / surprise expression overrides
    if (overrideTimer > 0) overrideTimer -= dt;
    if (!state.isDead) {
      const ex = state.isSurprised ? EXPRESSIONS.trap_near : overrideTimer > 0 ? override : null;
      if (ex) {
        if (ex.smile !== undefined) pose.smile = ex.smile;
        if (ex.mouthOpen !== undefined) pose.mouthOpen = ex.mouthOpen;
        if (ex.brow !== undefined) pose.brow = ex.brow;
        if (ex.eyeOpen !== undefined) pose.eyeOpen = ex.eyeOpen;
      }
    }

    // Landing squash layered on any grounded pose
    if (!state.isDead && state.isGrounded && crouch > 0.001) {
      pose.hipsY -= u(0.12) * crouch;
      pose.torsoX += 0.3 * crouch;
      pose.lLegX -= 0.55 * crouch; pose.rLegX -= 0.55 * crouch;
      pose.lCalfX += 1.0 * crouch; pose.rCalfX += 1.0 * crouch;
      pose.lArmX -= 0.45 * crouch; pose.rArmX -= 0.45 * crouch;
      pose.lArmZ -= 0.3 * crouch; pose.rArmZ += 0.3 * crouch;
      pose.eyeOpen *= 1 - 0.35 * crouch;
      pose.ponyX += 0.5 * crouch;
      pose.skirtX -= 0.2 * crouch;
    }

    // Eyes follow the partner
    if (hasPartner) {
      pose.lookX = clamp(partnerAngle * 0.012, -0.008, 0.008);
    }
    pose.lookY = state.isGrounded ? 0 : vy < -1 ? -u(0.006) : u(0.004);

    // Apply joint targets
    for (let i = 0; i < bind.length; i++) {
      const [obj, axis, key, lambda] = bind[i];
      obj.rotation[axis] = THREE.MathUtils.damp(obj.rotation[axis], pose[key], lambda, dt);
    }
    hipsYCur = THREE.MathUtils.damp(hipsYCur, pose.hipsY, 18, dt);
    hips.position.y = hipsYCur;

    // Breathing (chest only)
    const breath = Math.sin(t * 2) * 0.012;
    chest.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);

    // Expression
    eyeOpenCur = THREE.MathUtils.damp(eyeOpenCur, pose.eyeOpen, 14, dt);
    browCur = THREE.MathUtils.damp(browCur, pose.brow, 12, dt);
    smileCur = THREE.MathUtils.damp(smileCur, pose.smile, 10, dt);
    mouthOpenCur = THREE.MathUtils.damp(mouthOpenCur, pose.mouthOpen, 14, dt);
    lookXCur = THREE.MathUtils.damp(lookXCur, pose.lookX, 10, dt);
    lookYCur = THREE.MathUtils.damp(lookYCur, pose.lookY, 10, dt);

    blinkTimer -= dt;
    if (blinkTimer <= 0 && blinkProg < 0 && !state.isDead) {
      blinkProg = 0;
      blinkTimer = rng() < 0.2 ? 0.25 : 2 + rng() * 3.5; // occasional double blink
    }
    let blink = 1;
    if (blinkProg >= 0) {
      blinkProg += dt / 0.14;
      blink = Math.abs(1 - 2 * Math.min(blinkProg, 1));
      if (blinkProg >= 1) blinkProg = -1;
    }
    const eyeScale = Math.max(0.06, eyeOpenCur * blink);
    for (let i = 0; i < eyes.length; i++) {
      eyes[i].scale.y = eyeScale;
      irisGroups[i].position.x = lookXCur;
      irisGroups[i].position.y = lookYCur;
    }
    for (let i = 0; i < brows.length; i++) brows[i].position.y = browCur;

    mouthGroup.scale.set(1 + mouthOpenCur * 0.15, smileCur, 1);
    const open = Math.max(mouthOpenCur, 0);
    mouthInner.visible = open > 0.05;
    mouthInner.scale.set(u(0.02) * (1 + 0.3 * open), u(0.02) * open + 0.0001, u(0.008));
    mouthInner.position.y = -mD * 0.4 - u(0.01) * open;
  };

  /* ============================== CUSTOMIZATION =========================== */
  const updateCustomization = (cust: CharacterCustomization) => {
    skinMat.color.set(cust.skinTone);
    skinMat.emissive.copy(skinMat.color).multiplyScalar(0.07);

    hairMat.color.set(cust.hairColor);
    hairHiMat.color.copy(hairMat.color).lerp(white, 0.3);

    jacketMat.color.set(cust.clothingPrimaryColor);
    seamMat.color.copy(jacketMat.color).multiplyScalar(0.62);
    stitchMat.color.copy(jacketMat.color).lerp(white, 0.5);
    skirtMat.color.copy(jacketMat.color).lerp(white, 0.08);

    irisMat.color.set(cust.eyeColor);
    irisMat.emissive.copy(irisMat.color).multiplyScalar(0.35);
    irisRingMat.color.copy(irisMat.color).multiplyScalar(0.35);
    irisInnerMat.color.copy(irisMat.color).lerp(white, 0.35);
    irisInnerMat.emissive.copy(irisInnerMat.color).multiplyScalar(0.3);

    goldMat.color.set(cust.clothingSecondaryColor);
    ribbonMat.color.set(cust.clothingSecondaryColor);

    glassesMesh.visible = !!cust.accessories?.glasses;
    pendantMesh.visible = !isBoy || !!cust.accessories?.pendant;
    if (backpackMesh) backpackMesh.visible = !!cust.accessories?.backpack;
  };

  root.userData.detailNodes = detailNodes;

  return {
    group: root,
    gender,
    hips,
    torso,
    head,
    hairGroup,
    leftArm,
    rightArm,
    leftForearm,
    rightForearm,
    leftHand,
    rightHand,
    leftLeg,
    rightLeg,
    leftCalf,
    rightCalf,
    leftFoot,
    rightFoot,
    glassesMesh,
    pendantMesh,
    backpackMesh,
    facialController,
    materials,
    updateAnimation,
    updateCustomization
  };
}

/**
 * Optional performance hook: hides small detail meshes (seams, folds, fingers, laces, blush)
 * for distant or low-end rendering. Safe to ignore; nothing in the game requires calling it.
 */
export function setCharacterDetailLevel(rig: CharacterRig, level: 'high' | 'low'): void {
  const nodes = rig.group.userData.detailNodes as THREE.Object3D[] | undefined;
  if (!nodes) return;
  const visible = level === 'high';
  nodes.forEach((n) => {
    n.visible = visible;
  });
}