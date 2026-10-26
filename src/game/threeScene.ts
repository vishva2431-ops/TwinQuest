import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { WorldData, PlatformConfig } from '../types/game';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  ambientLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  charFillLight: THREE.DirectionalLight;
  particles: THREE.Points;
  goalPortal: THREE.Group;
  loveTetherMesh: THREE.Line;
  loveTetherMaterial: THREE.LineBasicMaterial;
  platformMeshes: THREE.Object3D[];
  skyMesh: THREE.Mesh;
  distantIslands: THREE.Group;
  castleGroup: THREE.Group;
  cloudsGroup: THREE.Group;
  goldenTrailsGroup: THREE.Group;
  dispose: () => void;
  updateTheme: (world: WorldData) => void;
}

/* -------------------------------------------------------------------------- */
/* Small shared helpers                                                        */
/* -------------------------------------------------------------------------- */

const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const coarse = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && coarse);
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash3 = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Collects instance transforms and builds one InstancedMesh (one draw call). */
class InstanceList {
  private items: Array<{ p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; c?: THREE.Color }> = [];
  add(p: THREE.Vector3, euler: THREE.Euler, s: THREE.Vector3 | number, c?: THREE.ColorRepresentation) {
    this.items.push({
      p,
      q: new THREE.Quaternion().setFromEuler(euler),
      s: typeof s === 'number' ? new THREE.Vector3(s, s, s) : s,
      c: c !== undefined ? new THREE.Color(c) : undefined
    });
  }
  get count() {
    return this.items.length;
  }
  build(geo: THREE.BufferGeometry, mat: THREE.Material, cast = false): THREE.InstancedMesh | null {
    if (!this.items.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, this.items.length);
    const m = new THREE.Matrix4();
    this.items.forEach((it, i) => {
      m.compose(it.p, it.q, it.s);
      mesh.setMatrixAt(i, m);
      if (it.c) mesh.setColorAt(i, it.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = cast;
    return mesh;
  }
}

function makeSoftDotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWaterfallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(147,197,253,0.55)';
  g.fillRect(0, 0, 64, 128);
  const rng = mulberry32(99);
  for (let i = 0; i < 26; i++) {
    const x = rng() * 64;
    const y = rng() * 128;
    g.fillStyle = `rgba(255,255,255,${0.25 + rng() * 0.45})`;
    g.fillRect(x, y, 1.5 + rng() * 2.5, 14 + rng() * 40);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function paintSky(geo: THREE.SphereGeometry, bottom: THREE.Color, top: THREE.Color, radius: number) {
  const pos = geo.attributes.position;
  let colors = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!colors) {
    colors = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
    geo.setAttribute('color', colors);
  }
  const horizon = bottom.clone().lerp(new THREE.Color('#fde7f3'), 0.4);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / radius;
    if (h < 0) c.copy(horizon).lerp(bottom, THREE.MathUtils.clamp(-h * 2, 0, 1));
    else c.copy(horizon).lerp(top, Math.pow(THREE.MathUtils.clamp(h * 1.6, 0, 1), 0.7));
    colors.setXYZ(i, c.r, c.g, c.b);
  }
  colors.needsUpdate = true;
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Creates the TwinQuest fantasy environment: gradient sky with sun glow, layered mountains,
 * soft clouds, distant floating islands with waterfalls, a fairytale castle, drifting sparkles
 * and the glowing heart portal. Public contract (SceneContext) is unchanged.
 */
export function createTwinQuestScene(container: HTMLDivElement, world: WorldData): SceneContext {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  const mobile = isMobileDevice();

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(world.fogColor || '#c7d2fe', 0.009);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 400);
  camera.position.set(0, 7, 12);

  const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !isHeadless;
  renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  /* ------------------------------ lighting -------------------------------- */
  const ambientLight = new THREE.HemisphereLight('#bae6fd', '#6d7bd8', 0.95);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight('#fff3d6', 2.0);
  sunLight.position.set(22, 38, 18);
  sunLight.castShadow = !isHeadless;
  const shadowSize = mobile ? 1024 : 2048;
  sunLight.shadow.mapSize.set(shadowSize, shadowSize);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 120;
  const d = 35;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  // Cool sky fill that also gives a soft violet rim from behind
  const fillLight = new THREE.DirectionalLight('#a5b4fc', 0.7);
  fillLight.position.set(-18, 12, -15);
  scene.add(fillLight);

  // Frontal fill attached to the camera so both characters stay readable on every island
  const charFillLight = new THREE.DirectionalLight('#ffffff', 0.8);
  charFillLight.position.set(0, 3, 6);
  camera.add(charFillLight);
  scene.add(camera);

  /* ------------------------------ sky + sun -------------------------------- */
  const SKY_R = 260;
  const skyGeo = new THREE.SphereGeometry(SKY_R, 32, 24);
  const skyBottom = new THREE.Color(world.skyColorBottom || '#bae6fd');
  const skyTop = new THREE.Color(world.skyColorTop || '#38bdf8');
  paintSky(skyGeo, skyBottom, skyTop, SKY_R);
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  const dotTex = makeSoftDotTexture();
  const sun = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dotTex, color: '#fff1c2', transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    })
  );
  sun.position.copy(sunLight.position).normalize().multiplyScalar(235);
  sun.scale.setScalar(95);
  scene.add(sun);

  /* ------------------------------ mountains -------------------------------- */
  scene.add(createMountains());

  /* ------------------------------ clouds ----------------------------------- */
  const cloudsGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 0.95, metalness: 0, emissive: '#fdf2f8', emissiveIntensity: 0.14
  });
  const cloudSphere = new THREE.SphereGeometry(1, 14, 10);
  const cloudConfigs = [
    { x: -35, y: 14, z: -55, scale: 1.4 },
    { x: 38, y: 18, z: -65, scale: 1.6 },
    { x: -15, y: 22, z: -85, scale: 2.0 },
    { x: 20, y: 26, z: -95, scale: 1.8 },
    { x: -45, y: 8, z: -35, scale: 1.2 },
    { x: 42, y: 10, z: -40, scale: 1.3 },
    { x: 0, y: -6, z: -45, scale: 2.2 },
    { x: -30, y: -8, z: -60, scale: 2.5 },
    { x: 32, y: -7, z: -55, scale: 2.4 }
  ];
  cloudConfigs.forEach((c) => {
    const cloud = createPuffyCloud(cloudMat, cloudSphere, c.scale);
    cloud.position.set(c.x, c.y, c.z);
    cloudsGroup.add(cloud);
  });
  scene.add(cloudsGroup);

  /* ------------------------------ castle ----------------------------------- */
  const castleGroup = createFairytaleCastle();
  castleGroup.position.set(0, 6, -72);
  scene.add(castleGroup);

  /* ------------------------------ distant islands -------------------------- */
  const distantIslands = createDistantIslands();
  scene.add(distantIslands);

  /* ------------------------------ sparkles --------------------------------- */
  const particleCount = 220;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const palette = [new THREE.Color('#fbbf24'), new THREE.Color('#f9a8d4'), new THREE.Color('#ffffff'), new THREE.Color('#c4b5fd')];
  const prng = mulberry32(2024);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (prng() - 0.5) * 70;
    particlePositions[i * 3 + 1] = prng() * 30 - 5;
    particlePositions[i * 3 + 2] = -prng() * 90;
    const col = palette[Math.floor(prng() * palette.length)];
    particleColors.set([col.r, col.g, col.b], i * 3);
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  const particleMat = new THREE.PointsMaterial({
    color: '#ffffff', size: 0.6, map: dotTex, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  particles.frustumCulled = false;
  scene.add(particles);

  /* ------------------------------ portal ----------------------------------- */
  const { portalGroup, goldenTrails } = createOfficialHeartPortal(dotTex);
  const goalPortal = portalGroup;
  const goldenTrailsGroup = goldenTrails;
  scene.add(goalPortal);

  /* ------------------------------ love tether ------------------------------ */
  const tetherGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)]);
  const loveTetherMaterial = new THREE.LineBasicMaterial({ color: '#fb7185', transparent: true, opacity: 0.55 });
  const loveTetherMesh = new THREE.Line(tetherGeo, loveTetherMaterial);
  scene.add(loveTetherMesh);

  const platformMeshes: THREE.Object3D[] = [];

  const updateTheme = (newWorld: WorldData) => {
    fog.color.set(newWorld.fogColor || '#c7d2fe');
    ambientLight.color.set(newWorld.skyColorBottom || '#bae6fd');
    fillLight.color.set(newWorld.accentColor || '#a5b4fc');
    paintSky(
      skyGeo,
      new THREE.Color(newWorld.skyColorBottom || '#bae6fd'),
      new THREE.Color(newWorld.skyColorTop || '#38bdf8'),
      SKY_R
    );
    particleMat.color.set('#ffffff');
  };

  const onWindowResize = () => {
    if (!container) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onWindowResize);

  const dispose = () => {
    window.removeEventListener('resize', onWindowResize);
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    dotTex.dispose();
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };

  return {
    scene, camera, renderer, ambientLight, sunLight, charFillLight, particles, goalPortal,
    loveTetherMesh, loveTetherMaterial, platformMeshes, skyMesh, distantIslands, castleGroup,
    cloudsGroup, goldenTrailsGroup, dispose, updateTheme
  };
}

/* -------------------------------------------------------------------------- */
/* Biomes + level platforms                                                    */
/* -------------------------------------------------------------------------- */

export type Biome = 'meadow' | 'autumn' | 'crystal' | 'blossom';

interface BiomePalette {
  grass: string; tuft: string; rock: string; bush: string; trim: string;
  flowers: string[]; crystals: string[];
}

const BIOMES: Record<Biome, BiomePalette> = {
  meadow: {
    grass: '#3fcf5f', tuft: '#22a84a', rock: '#7a5233', bush: '#1f9d4a', trim: '#fecdd3',
    flowers: ['#f43f5e', '#ec4899', '#fde047', '#ffffff', '#60a5fa'], crystals: ['#f472b6', '#a78bfa']
  },
  autumn: {
    grass: '#d9a441', tuft: '#b9731f', rock: '#6b3f2a', bush: '#b45309', trim: '#fed7aa',
    flowers: ['#fb923c', '#fde047', '#ef4444', '#fff7ed'], crystals: ['#fb923c', '#fbbf24']
  },
  crystal: {
    grass: '#2dd4bf', tuft: '#0f9d8e', rock: '#5b5a96', bush: '#0d9488', trim: '#a5f3fc',
    flowers: ['#67e8f9', '#c4b5fd', '#f0abfc', '#ffffff'], crystals: ['#22d3ee', '#a78bfa', '#f0abfc']
  },
  blossom: {
    grass: '#7fdc8a', tuft: '#4cb86a', rock: '#855766', bush: '#f472b6', trim: '#fbcfe8',
    flowers: ['#f9a8d4', '#fbcfe8', '#ffffff', '#f472b6'], crystals: ['#f472b6', '#fb7185']
  }
};

/**
 * Picks a biome from a world's ground colour so levels look different without changing level data.
 * Pass an explicit biome to buildStaticPlatforms to override.
 */
export function biomeFromColor(hex: string): Biome {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex || '#22c55e').getHSL(hsl);
  const h = hsl.h * 360;
  if (hsl.s < 0.12) return 'meadow';
  if (h >= 15 && h < 70) return 'autumn';
  if (h >= 170 && h < 280) return 'crystal';
  if (h >= 280 || h < 15) return 'blossom';
  return 'meadow';
}

interface BiomeKit {
  grassMat: THREE.MeshStandardMaterial;
  rockMat: THREE.MeshStandardMaterial;
  tuftMat: THREE.MeshStandardMaterial;
  bushMat: THREE.MeshStandardMaterial;
}

const kitCache = new Map<Biome, BiomeKit>();
const capCache = new Map<string, THREE.BufferGeometry>();
const frameCache = new Map<string, THREE.BufferGeometry>();

const sharedGeo = {
  rock: null as THREE.BufferGeometry | null,
  tuft: null as THREE.BufferGeometry | null,
  stem: null as THREE.BufferGeometry | null,
  flower: null as THREE.BufferGeometry | null,
  crystal: null as THREE.BufferGeometry | null,
  bush: null as THREE.BufferGeometry | null,
  plank: null as THREE.BufferGeometry | null,
  post: null as THREE.BufferGeometry | null
};

const sharedMats = {
  flower: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, emissive: '#ffffff', emissiveIntensity: 0.18 }),
  stem: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.7 }),
  crystal: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.12, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.4 }),
  wood: new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.75 }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#6b2f0b', roughness: 0.8 }),
  trim: new THREE.MeshBasicMaterial({
    color: '#fecdd3', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false
  })
};

function getGeometries() {
  if (!sharedGeo.rock) {
    // Layered, faceted crag: unit lathe (radius 1, depth 1) with strata colours and deterministic jitter
    const profile = [[1, 0], [0.97, -0.12], [0.84, -0.3], [0.7, -0.5], [0.52, -0.7], [0.3, -0.88], [0.1, -1.0], [0, -1.04]];
    const rock = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 9);
    const pos = rock.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = y > -0.02 ? 0 : 1; // keep the rim stable so it tucks under the grass
      const hx = hash3(Math.round(x * 100), Math.round(y * 100), Math.round(z * 100));
      const hz = hash3(Math.round(z * 100), Math.round(y * 100), Math.round(x * 100));
      x += (hx - 0.5) * 0.14 * k;
      z += (hz - 0.5) * 0.14 * k;
      y += (hx - 0.5) * 0.06 * k;
      pos.setXYZ(i, x, y, z);
      const band = Math.floor(-y * 6) % 2 === 0 ? 1.0 : 0.82;
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = band;
    }
    rock.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    sharedGeo.rock = rock;

    const tuft = new THREE.ConeGeometry(0.07, 0.28, 4);
    tuft.translate(0, 0.14, 0);
    sharedGeo.tuft = tuft;
    const stem = new THREE.CylinderGeometry(0.012, 0.014, 0.2, 4);
    stem.translate(0, 0.1, 0);
    sharedGeo.stem = stem;
    sharedGeo.flower = new THREE.SphereGeometry(0.085, 8, 6);
    const crystal = new THREE.ConeGeometry(0.12, 0.55, 5);
    crystal.translate(0, 0.275, 0);
    sharedGeo.crystal = crystal;
    const bush = new THREE.SphereGeometry(0.4, 10, 8);
    bush.scale(1.2, 0.7, 1.0);
    sharedGeo.bush = bush;
    sharedGeo.plank = new THREE.BoxGeometry(1, 1, 1);
    sharedGeo.post = new THREE.CylinderGeometry(0.05, 0.06, 0.65, 8);
  }
  return sharedGeo as { [K in keyof typeof sharedGeo]: THREE.BufferGeometry };
}

function getBiomeKit(biome: Biome): BiomeKit {
  let kit = kitCache.get(biome);
  if (!kit) {
    const p = BIOMES[biome];
    kit = {
      grassMat: new THREE.MeshStandardMaterial({ color: p.grass, roughness: 0.6, metalness: 0 }),
      rockMat: new THREE.MeshStandardMaterial({ color: p.rock, roughness: 0.9, metalness: 0.02, flatShading: true, vertexColors: true }),
      tuftMat: new THREE.MeshStandardMaterial({ color: p.tuft, roughness: 0.7, side: THREE.DoubleSide }),
      bushMat: new THREE.MeshStandardMaterial({ color: p.bush, roughness: 0.75 })
    };
    kitCache.set(biome, kit);
  }
  return kit;
}

function getCapGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = `${w.toFixed(2)}|${h.toFixed(2)}|${d.toFixed(2)}`;
  let g = capCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 2, Math.min(0.14, h * 0.4, w * 0.3, d * 0.3));
    capCache.set(key, g);
  }
  return g;
}

/** Flat glowing outline that marks a platform as safe, walkable ground. */
function getFrameGeometry(w: number, d: number): THREE.BufferGeometry {
  const key = `${w.toFixed(2)}|${d.toFixed(2)}`;
  let g = frameCache.get(key);
  if (!g) {
    const ow = w * 0.5 - 0.06, od = d * 0.5 - 0.06;
    const iw = ow - 0.09, id = od - 0.09;
    const shape = new THREE.Shape();
    shape.moveTo(-ow, -od); shape.lineTo(ow, -od); shape.lineTo(ow, od); shape.lineTo(-ow, od); shape.lineTo(-ow, -od);
    const hole = new THREE.Path();
    hole.moveTo(-iw, -id); hole.lineTo(-iw, id); hole.lineTo(iw, id); hole.lineTo(iw, -id); hole.lineTo(-iw, -id);
    shape.holes.push(hole);
    g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    frameCache.set(key, g);
  }
  return g;
}

function disposeInstances(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
  });
}

/**
 * Builds stylized floating islands and bridges for each static platform.
 * The visual top surface is exactly platform.position.y + size.y / 2, so collision is unchanged.
 * Foliage, flowers, crystals and bushes for the whole level are batched into a few InstancedMeshes.
 */
export function buildStaticPlatforms(
  scene: THREE.Scene,
  platforms: PlatformConfig[],
  groundColor: string,
  existingList: THREE.Object3D[],
  biomeHint?: Biome
): THREE.Object3D[] {
  existingList.forEach((m) => {
    scene.remove(m);
    disposeInstances(m);
  });
  const newList: THREE.Object3D[] = [];

  const biome = biomeHint ?? biomeFromColor(groundColor);
  const palette = BIOMES[biome];
  const kit = getBiomeKit(biome);
  const geo = getGeometries();
  sharedMats.trim.color.set(palette.trim);

  const tufts = new InstanceList();
  const flowers = new InstanceList();
  const stems = new InstanceList();
  const crystals = new InstanceList();
  const bushes = new InstanceList();
  const foliage = new THREE.Group();
  foliage.name = 'levelFoliage';

  platforms.forEach((p, pIndex) => {
    if (p.isMoving) return;
    const [w, h, d] = p.size;
    const [px, py, pz] = p.position;
    const rng = mulberry32(pIndex * 7919 + Math.round(px * 13 + pz * 31));
    const top = py + h * 0.5;

    const group = new THREE.Group();
    group.position.set(px, py, pz);

    const isBridge = (w < 2.2 && d >= 4) || (d < 2.2 && w >= 4);

    if (isBridge) {
      const isAlongZ = d >= w;
      const length = isAlongZ ? d : w;
      const width = isAlongZ ? w : d;
      const plankCount = Math.floor(length / 0.6);
      const planks = new InstanceList();
      for (let i = 0; i < plankCount; i++) {
        const off = (i - (plankCount - 1) / 2) * 0.58;
        planks.add(
          new THREE.Vector3(isAlongZ ? 0 : off, h * 0.5 - 0.07, isAlongZ ? off : 0),
          new THREE.Euler(0, 0, (rng() - 0.5) * 0.02),
          new THREE.Vector3(isAlongZ ? width * 0.95 : 0.45, 0.14, isAlongZ ? 0.45 : width * 0.95)
        );
      }
      const plankMesh = planks.build(geo.plank, sharedMats.wood, true);
      if (plankMesh) {
        plankMesh.receiveShadow = true;
        group.add(plankMesh);
      }
      const posts = new InstanceList();
      [-1, 1].forEach((side) => {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, length, 6), sharedMats.woodDark);
        rope.position.set(isAlongZ ? side * width * 0.48 : 0, h * 0.5 + 0.35, isAlongZ ? 0 : side * width * 0.48);
        if (isAlongZ) rope.rotation.x = Math.PI / 2;
        else rope.rotation.z = Math.PI / 2;
        group.add(rope);
        for (let pi = 0; pi < 3; pi++) {
          const o = (pi - 1) * length * 0.4;
          posts.add(
            new THREE.Vector3(isAlongZ ? side * width * 0.48 : o, h * 0.5 + 0.15, isAlongZ ? o : side * width * 0.48),
            new THREE.Euler(), 1
          );
        }
      });
      const postMesh = posts.build(geo.post, sharedMats.wood, true);
      if (postMesh) group.add(postMesh);
    } else {
      // Grass cap
      const grassH = Math.min(0.45, h * 0.6);
      const cap = new THREE.Mesh(getCapGeometry(w, grassH, d), kit.grassMat);
      cap.position.y = h * 0.5 - grassH * 0.5;
      cap.castShadow = true;
      cap.receiveShadow = true;
      group.add(cap);

      // Layered rock underbody
      const rockH = Math.min(6, Math.max(1.8, Math.min(w, d) * 0.85));
      const rock = new THREE.Mesh(geo.rock, kit.rockMat);
      rock.position.y = h * 0.5 - grassH + 0.02;
      rock.scale.set(w * 0.5 * 1.04, rockH, d * 0.5 * 1.04);
      rock.rotation.y = rng() * Math.PI;
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);

      // Safe-ground outline
      if (Math.min(w, d) >= 1.2) {
        const frame = new THREE.Mesh(getFrameGeometry(w, d), sharedMats.trim);
        frame.position.y = h * 0.5 + 0.012;
        frame.renderOrder = 2;
        group.add(frame);
      }

      // Grass tufts across the top and drooping over the rim
      const area = w * d;
      const tuftCount = THREE.MathUtils.clamp(Math.round(area * 1.4), 6, 60);
      for (let i = 0; i < tuftCount; i++) {
        const x = (rng() - 0.5) * (w - 0.3);
        const z = (rng() - 0.5) * (d - 0.3);
        tufts.add(
          new THREE.Vector3(px + x, top, pz + z),
          new THREE.Euler((rng() - 0.5) * 0.4, rng() * Math.PI, (rng() - 0.5) * 0.4),
          0.8 + rng() * 0.7
        );
      }
      const droop = Math.min(12, Math.floor((w + d) * 1.2));
      for (let i = 0; i < droop; i++) {
        const onX = i % 2 === 0;
        const sign = rng() < 0.5 ? -1 : 1;
        const x = onX ? sign * (w * 0.5 - 0.02) : (rng() - 0.5) * w * 0.9;
        const z = onX ? (rng() - 0.5) * d * 0.9 : sign * (d * 0.5 - 0.02);
        tufts.add(
          new THREE.Vector3(px + x, top - grassH + 0.05, pz + z),
          new THREE.Euler(Math.PI, rng() * Math.PI, 0),
          1.0 + rng() * 0.8
        );
      }

      // Flowers, bushes, crystals on larger islands
      if (w >= 2.5 && d >= 2.5) {
        const flowerCount = 3 + (pIndex % 4) + Math.floor(area / 18);
        for (let f = 0; f < flowerCount; f++) {
          const x = (rng() - 0.5) * (w - 0.8);
          const z = (rng() - 0.5) * (d - 0.8);
          const col = palette.flowers[Math.floor(rng() * palette.flowers.length)];
          const s = 0.9 + rng() * 0.5;
          stems.add(new THREE.Vector3(px + x, top, pz + z), new THREE.Euler(), s);
          flowers.add(new THREE.Vector3(px + x, top + 0.2 * s, pz + z), new THREE.Euler(), s, col);
        }
        bushes.add(
          new THREE.Vector3(px + w * 0.35, top + 0.12, pz - d * 0.3),
          new THREE.Euler(0, rng() * Math.PI, 0),
          0.8 + rng() * 0.4
        );
        if (w >= 3 && (pIndex % 3 === 0 || biome === 'crystal')) {
          const cx = (rng() < 0.5 ? -1 : 1) * (w * 0.5 - 0.5);
          const cz = (rng() < 0.5 ? -1 : 1) * (d * 0.5 - 0.5);
          for (let k = 0; k < 3; k++) {
            const col = palette.crystals[Math.floor(rng() * palette.crystals.length)];
            crystals.add(
              new THREE.Vector3(px + cx + (rng() - 0.5) * 0.3, top, pz + cz + (rng() - 0.5) * 0.3),
              new THREE.Euler((rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.5),
              0.6 + rng() * 0.7,
              col
            );
          }
        }
      }
    }

    scene.add(group);
    newList.push(group);
  });

  const meshes = [
    tufts.build(geo.tuft, kit.tuftMat),
    stems.build(geo.stem, sharedMats.stem),
    flowers.build(geo.flower, sharedMats.flower),
    crystals.build(geo.crystal, sharedMats.crystal),
    bushes.build(geo.bush, kit.bushMat, true)
  ];
  meshes.forEach((m) => m && foliage.add(m));
  scene.add(foliage);
  newList.push(foliage);

  return newList;
}

/* -------------------------------------------------------------------------- */
/* Background scenery                                                          */
/* -------------------------------------------------------------------------- */

function createPuffyCloud(material: THREE.Material, sphere: THREE.BufferGeometry, scale: number): THREE.Group {
  const cloud = new THREE.Group();
  const offsets = [
    { x: 0, y: 0, z: 0, r: 2.2 },
    { x: 1.8, y: 0.2, z: 0.2, r: 1.8 },
    { x: -1.7, y: 0.1, z: -0.1, r: 1.7 },
    { x: 0.8, y: 1.0, z: -0.2, r: 1.9 },
    { x: -0.9, y: 0.9, z: 0.3, r: 1.6 },
    { x: 0, y: -0.4, z: 0.8, r: 1.5 }
  ];
  const list = new InstanceList();
  offsets.forEach((o) =>
    list.add(
      new THREE.Vector3(o.x * scale, o.y * scale, o.z * scale),
      new THREE.Euler(),
      new THREE.Vector3(o.r * scale, o.r * scale * 0.78, o.r * scale) // flattened underside
    )
  );
  const mesh = list.build(sphere, material);
  if (mesh) cloud.add(mesh);
  return cloud;
}

function createMountains(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mountains';
  const rng = mulberry32(777);
  const bodyGeo = new THREE.ConeGeometry(1, 1, 6, 1);
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
  const capGeo = new THREE.ConeGeometry(1, 1, 6, 1);
  const capMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9, flatShading: true });
  const body = new InstanceList();
  const caps = new InstanceList();
  const tones = ['#6d7bd8', '#8b7fd6', '#7aa2e3', '#9a8bd9'];
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const x = -150 + t * 300 + (rng() - 0.5) * 18;
    const z = -118 - rng() * 40;
    const h = 40 + rng() * 38;
    const w = 20 + rng() * 18;
    const y = -10 + h / 2;
    const rot = new THREE.Euler(0, rng() * Math.PI, 0);
    body.add(new THREE.Vector3(x, y, z), rot, new THREE.Vector3(w, h, w), tones[i % tones.length]);
    caps.add(
      new THREE.Vector3(x, -10 + h * 0.84, z), rot,
      new THREE.Vector3(w * 0.32, h * 0.32, w * 0.32)
    );
  }
  const b = body.build(bodyGeo, bodyMat);
  const c = caps.build(capGeo, capMat);
  if (b) group.add(b);
  if (c) group.add(c);
  return group;
}

function createDistantIslands(): THREE.Group {
  const islands = new THREE.Group();
  const rng = mulberry32(31337);

  const grassMat = new THREE.MeshStandardMaterial({ color: '#3fcf5f', roughness: 0.6 });
  const rockMat = new THREE.MeshStandardMaterial({ color: '#7a5233', roughness: 0.9, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.55 });
  const crystalMat = sharedMats.crystal;

  const topGeo = new THREE.CylinderGeometry(1, 0.88, 1.2, 9);
  const rockGeo = new THREE.ConeGeometry(0.88, 1.6, 7);
  rockGeo.rotateX(Math.PI);
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.4, 6);
  trunkGeo.translate(0, 0.7, 0);
  const leafGeo = new THREE.ConeGeometry(0.8, 1.6, 7);
  leafGeo.translate(0, 0.8, 0);
  const crystalGeo = new THREE.ConeGeometry(0.3, 1.4, 5);
  crystalGeo.translate(0, 0.7, 0);

  const wfTex = makeWaterfallTexture();
  const wfMat = new THREE.MeshBasicMaterial({
    map: wfTex, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const wfGeo = new THREE.PlaneGeometry(1, 1);
  let lastTick = 0;

  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const dist = 65 + rng() * 35;
    const radius = 8 + rng() * 6;
    const island = new THREE.Group();
    island.position.set(Math.cos(angle) * dist, -4 + rng() * 18, Math.sin(angle) * dist - 35);

    const top = new THREE.Mesh(topGeo, grassMat);
    top.scale.set(radius, 1, radius);
    island.add(top);
    const bottom = new THREE.Mesh(rockGeo, rockMat);
    bottom.scale.set(radius, radius * 0.95, radius);
    bottom.position.y = -radius * 0.8 - 0.4;
    island.add(bottom);

    const trunks = new InstanceList();
    const leaves = new InstanceList();
    const treeCount = 3 + Math.floor(rng() * 3);
    for (let t = 0; t < treeCount; t++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * radius * 0.7;
      const s = 0.8 + rng() * 0.9;
      const p = new THREE.Vector3(Math.cos(a) * r, 0.6, Math.sin(a) * r);
      trunks.add(p, new THREE.Euler(), s);
      leaves.add(p.clone().setY(0.6 + 1.1 * s), new THREE.Euler(), s);
    }
    const trunkMesh = trunks.build(trunkGeo, trunkMat);
    const leafMesh = leaves.build(leafGeo, leafMat);
    if (trunkMesh) island.add(trunkMesh);
    if (leafMesh) island.add(leafMesh);

    const crystals = new InstanceList();
    const crystalPalette = ['#f472b6', '#a78bfa', '#67e8f9'];
    for (let c = 0; c < 4; c++) {
      const a = rng() * Math.PI * 2;
      const r = radius * (0.5 + rng() * 0.35);
      crystals.add(
        new THREE.Vector3(Math.cos(a) * r, 0.6, Math.sin(a) * r),
        new THREE.Euler((rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.5),
        0.5 + rng() * 0.8,
        crystalPalette[Math.floor(rng() * crystalPalette.length)]
      );
    }
    const crystalMesh = crystals.build(crystalGeo, crystalMat);
    if (crystalMesh) island.add(crystalMesh);

    // Waterfalls pouring off some islands; the texture scroll runs from the render callback
    if (i % 3 === 0) {
      const len = radius * 1.5;
      const fall = new THREE.Mesh(wfGeo, wfMat);
      fall.scale.set(1.8, len, 1);
      fall.position.set(radius * 0.92, -len * 0.5 + 0.4, 0);
      fall.rotation.y = Math.PI / 2;
      fall.frustumCulled = false;
      fall.onBeforeRender = () => {
        const now = performance.now();
        if (now !== lastTick) {
          lastTick = now;
          wfTex.offset.y = -(now * 0.0007) % 1;
        }
      };
      island.add(fall);
    }

    island.rotation.y = rng() * Math.PI * 2;
    islands.add(island);
  }
  return islands;
}

function createFairytaleCastle(): THREE.Group {
  const castle = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7, metalness: 0.05 });
  const stoneDarkMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.85, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#7c3aed', roughness: 0.35, metalness: 0.25 });
  const flagMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.4, side: THREE.DoubleSide });
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: '#fef08a', emissive: '#f59e0b', emissiveIntensity: 0.9, roughness: 0.2
  });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.7 });
  const heartMat = new THREE.MeshStandardMaterial({
    color: '#fb7185', emissive: '#f43f5e', emissiveIntensity: 1.1, roughness: 0.3
  });

  const baseIsland = new THREE.Mesh(new THREE.CylinderGeometry(18, 10, 14, 10), stoneDarkMat);
  baseIsland.position.y = -7;
  castle.add(baseIsland);

  const keep = new THREE.Mesh(new THREE.BoxGeometry(14, 16, 12), stoneMat);
  keep.position.y = 8;
  castle.add(keep);

  const centerTower = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.0, 22, 14), stoneMat);
  centerTower.position.set(0, 19, 0);
  castle.add(centerTower);

  const centerRoof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 12, 14), roofMat);
  centerRoof.position.set(0, 36, 0);
  castle.add(centerRoof);

  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6);
  const pole = new THREE.Mesh(poleGeo, stoneMat);
  pole.position.set(0, 43, 0);
  castle.add(pole);

  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(1.8, -0.6);
  flagShape.lineTo(0, -1.2);
  const flagGeo = new THREE.ShapeGeometry(flagShape);
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(0.08, 44.5, 0);
  castle.add(flag);

  const towerGeo = new THREE.CylinderGeometry(2.0, 2.3, 18, 12);
  const roofGeo = new THREE.ConeGeometry(2.8, 8, 12);
  [
    { x: -6.5, z: -5.5 }, { x: 6.5, z: -5.5 }, { x: -6.5, z: 5.5 }, { x: 6.5, z: 5.5 }
  ].forEach((tp) => {
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(tp.x, 9, tp.z);
    castle.add(tower);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(tp.x, 22, tp.z);
    castle.add(roof);
    const cPole = new THREE.Mesh(poleGeo, stoneMat);
    cPole.position.set(tp.x, 27, tp.z);
    castle.add(cPole);
    const cFlag = new THREE.Mesh(flagGeo, flagMat);
    cFlag.position.set(tp.x + 0.08, 28, tp.z);
    castle.add(cFlag);
  });

  // Battlements along the keep roof line (one draw call)
  const merlons = new InstanceList();
  for (let i = 0; i < 9; i++) {
    const x = -5.6 + i * 1.4;
    merlons.add(new THREE.Vector3(x, 16.5, 5.8), new THREE.Euler(), new THREE.Vector3(0.8, 1.0, 0.7));
    merlons.add(new THREE.Vector3(x, 16.5, -5.8), new THREE.Euler(), new THREE.Vector3(0.8, 1.0, 0.7));
  }
  const merlonMesh = merlons.build(new THREE.BoxGeometry(1, 1, 1), stoneMat);
  if (merlonMesh) castle.add(merlonMesh);

  // Glowing windows (one draw call) and arched door
  const windows = new InstanceList();
  [-3.6, 0, 3.6].forEach((wx) => {
    windows.add(new THREE.Vector3(wx, 11, 6.1), new THREE.Euler(), new THREE.Vector3(1.0, 1.9, 0.2));
    windows.add(new THREE.Vector3(wx, 5.6, 6.1), new THREE.Euler(), new THREE.Vector3(0.9, 1.6, 0.2));
  });
  const windowMesh = windows.build(new THREE.BoxGeometry(1, 1, 1), windowGlowMat);
  if (windowMesh) castle.add(windowMesh);

  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), doorMat);
  door.position.set(0, 1.6, 6.1);
  castle.add(door);
  const doorArch = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 14, 1, false, 0, Math.PI), doorMat);
  doorArch.rotation.x = Math.PI / 2;
  doorArch.rotation.z = Math.PI / 2;
  doorArch.position.set(0, 3.2, 6.1);
  castle.add(doorArch);

  // Glowing heart emblem above the gate
  const heart = new THREE.Shape();
  heart.moveTo(0, -0.5);
  heart.bezierCurveTo(-0.1, -0.3, -0.6, 0.0, -0.5, 0.3);
  heart.bezierCurveTo(-0.45, 0.55, -0.1, 0.55, 0, 0.32);
  heart.bezierCurveTo(0.1, 0.55, 0.45, 0.55, 0.5, 0.3);
  heart.bezierCurveTo(0.6, 0.0, 0.1, -0.3, 0, -0.5);
  const emblem = new THREE.Mesh(
    new THREE.ExtrudeGeometry(heart, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 }),
    heartMat
  );
  emblem.scale.setScalar(1.4);
  emblem.position.set(0, 8.2, 6.2);
  castle.add(emblem);

  return castle;
}

function createOfficialHeartPortal(glowTex: THREE.Texture): { portalGroup: THREE.Group; goldenTrails: THREE.Group } {
  const portalGroup = new THREE.Group();

  const archStoneMat = new THREE.MeshStandardMaterial({ color: '#a8b4c6', roughness: 0.6, metalness: 0.15 });

  [-1.6, 1.6].forEach((x) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.8, 0.55), archStoneMat);
    pillar.position.set(x, 1.9, 0);
    pillar.castShadow = true;
    portalGroup.add(pillar);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.25, 0.75), archStoneMat);
    cap.position.set(x, 3.8, 0);
    portalGroup.add(cap);
  });

  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.55, 0.65), archStoneMat);
  archBeam.position.set(0, 3.9, 0);
  archBeam.castShadow = true;
  portalGroup.add(archBeam);

  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.2 + s * 0.4, 0.22, 0.8 + s * 0.4), archStoneMat);
    step.position.set(0, (2 - s) * 0.22, 0.5 + s * 0.4);
    step.receiveShadow = true;
    portalGroup.add(step);
  }

  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0);
  heartShape.bezierCurveTo(0.35, 0.35, 0.65, 0.7, 0.38, 1.05);
  heartShape.bezierCurveTo(0.18, 1.25, -0.18, 1.25, -0.38, 1.05);
  heartShape.bezierCurveTo(-0.65, 0.7, -0.35, 0.35, 0, 0);

  // Names are kept: other code may animate these groups
  const heartEnergy = new THREE.Group();
  heartEnergy.name = 'portalHeartEnergy';
  heartEnergy.position.set(0, 2.1, 0);
  portalGroup.add(heartEnergy);

  const outerHeartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.06 });
  outerHeartGeo.center();
  const outerHeart = new THREE.Mesh(
    outerHeartGeo,
    new THREE.MeshStandardMaterial({ color: '#c084fc', emissive: '#9333ea', emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.5 })
  );
  outerHeart.scale.setScalar(1.9);
  heartEnergy.add(outerHeart);

  const innerHeartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05 });
  innerHeartGeo.center();
  const innerHeart = new THREE.Mesh(
    innerHeartGeo,
    new THREE.MeshStandardMaterial({ color: '#f43f5e', emissive: '#ec4899', emissiveIntensity: 1.4, roughness: 0.1, metalness: 0.2 })
  );
  innerHeart.scale.setScalar(1.4);
  innerHeart.position.z = 0.04;
  heartEnergy.add(innerHeart);

  const coreHeartGeo = new THREE.ShapeGeometry(heartShape);
  coreHeartGeo.center();
  const coreHeart = new THREE.Mesh(
    coreHeartGeo,
    new THREE.MeshBasicMaterial({ color: '#fff1f2', transparent: true, opacity: 0.95 })
  );
  coreHeart.position.z = 0.08;
  heartEnergy.add(coreHeart);

  // Soft halo behind the heart
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex, color: '#fb7185', transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  halo.scale.setScalar(7);
  halo.position.set(0, 2.1, -0.3);
  portalGroup.add(halo);

  // Glowing ground ring so the destination reads clearly from a distance
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.2, 40),
    new THREE.MeshBasicMaterial({
      color: '#fda4af', transparent: true, opacity: 0.4, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.03, 0.9);
  portalGroup.add(ring);

  const goldenTrails = new THREE.Group();
  goldenTrails.name = 'portalGoldenTrails';
  goldenTrails.position.set(0, 2.1, 0);
  portalGroup.add(goldenTrails);

  const goldTrailMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b', emissive: '#fbbf24', emissiveIntensity: 1.2, metalness: 0.9, roughness: 0.15
  });
  const trail1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.065, 12, 48), goldTrailMat);
  trail1.rotation.set(Math.PI * 0.35, Math.PI * 0.15, 0);
  goldenTrails.add(trail1);
  const trail2 = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.045, 10, 40), goldTrailMat);
  trail2.rotation.set(-Math.PI * 0.3, 0, Math.PI * 0.25);
  goldenTrails.add(trail2);

  const portalLight = new THREE.PointLight('#f43f5e', 3.5, 16);
  portalLight.position.set(0, 2.1, 1.2);
  portalGroup.add(portalLight);

  return { portalGroup, goldenTrails };
}