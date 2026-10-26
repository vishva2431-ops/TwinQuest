import * as THREE from 'three';
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

/**
 * Creates the magical fantasy 3D environment for TwinQuest
 * Faithfully recreating the official TwinQuest artwork:
 * - Rich blue skies with fluffy white 3D cartoon clouds
 * - Lush floating grass islands with layered earthen rock crags underneath
 * - Fairytale castle landmark with tall spires, purple flags, and glowing windows
 * - Grand Glowing Heart Portal with layered magenta/purple heart energy
 * - Swirling Golden Magical Trails inspired by the logo's golden energy rings
 */
export function createTwinQuestScene(container: HTMLDivElement, world: WorldData): SceneContext {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();
  // Atmospheric fantasy fog with magical tint
  scene.fog = new THREE.FogExp2('#c7d2fe', 0.009);

  // Perspective Camera
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 400);
  camera.position.set(0, 7, 12);

  // WebGL Renderer with High-Fidelity PBR Tone Mapping
  const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = !isHeadless;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // --- Lighting Rig (Studio Pixar / Anime Fantasy Lighting) ---
  // Warm sky hemisphere light
  const ambientLight = new THREE.HemisphereLight('#bae6fd', '#3b82f6', 1.1);
  scene.add(ambientLight);

  // Bright warm sunlight (casting soft shadows)
  const sunLight = new THREE.DirectionalLight('#fffbeb', 2.2);
  sunLight.position.set(22, 38, 18);
  sunLight.castShadow = !isHeadless;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
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

  // Soft sky blue fill light (fills dark shadows)
  const fillLight = new THREE.DirectionalLight('#93c5fd', 0.8);
  fillLight.position.set(-18, 12, -15);
  scene.add(fillLight);

  // Character Frontal Fill Light (attached to camera so characters are always brilliantly lit across all islands)
  const charFillLight = new THREE.DirectionalLight('#ffffff', 0.85);
  charFillLight.position.set(0, 3, 6);
  camera.add(charFillLight);
  scene.add(camera);

  // Warm Golden Rim Light
  const rimLight = new THREE.DirectionalLight('#fde047', 0.6);
  rimLight.position.set(0, 15, -25);
  scene.add(rimLight);

  // --- 1. Rich Blue Sky Dome with Horizon Gradient ---
  const skyGeo = new THREE.SphereGeometry(260, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    side: THREE.BackSide
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // --- 2. Fluffy White 3D Cartoon Clouds ---
  const cloudsGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.95,
    metalness: 0.05,
    emissive: '#f0fdf4',
    emissiveIntensity: 0.12
  });

  const cloudConfigs = [
    { x: -35, y: 14, z: -55, scale: 1.4 },
    { x: 38, y: 18, z: -65, scale: 1.6 },
    { x: -15, y: 22, z: -85, scale: 2.0 },
    { x: 20, y: 26, z: -95, scale: 1.8 },
    { x: -45, y: 8, z: -35, scale: 1.2 },
    { x: 42, y: 10, z: -40, scale: 1.3 },
    { x: 0, y: -6, z: -45, scale: 2.2 }, // Sea of clouds beneath islands
    { x: -30, y: -8, z: -60, scale: 2.5 },
    { x: 32, y: -7, z: -55, scale: 2.4 }
  ];

  cloudConfigs.forEach((c) => {
    const cloud = createPuffyCloud(cloudMat, c.scale);
    cloud.position.set(c.x, c.y, c.z);
    cloudsGroup.add(cloud);
  });
  scene.add(cloudsGroup);

  // --- 3. Fairytale Castle Landmark (Directly from Twin-Quest.png) ---
  const castleGroup = createFairytaleCastle();
  castleGroup.position.set(0, 6, -72);
  scene.add(castleGroup);

  // --- 4. Distant Floating Islands with Trees & Crystals ---
  const distantIslands = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const dist = 65 + Math.random() * 35;
    const islandX = Math.cos(angle) * dist;
    const islandZ = Math.sin(angle) * dist - 35;
    const islandY = -4 + Math.random() * 18;

    const island = createMiniFloatingIsland(8 + Math.random() * 6);
    island.position.set(islandX, islandY, islandZ);
    distantIslands.add(island);
  }
  scene.add(distantIslands);

  // --- 5. Magical Ambient Sparkles & Petals ---
  const particleCount = 220;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 70;
    particlePositions[i + 1] = Math.random() * 30 - 5;
    particlePositions[i + 2] = -Math.random() * 90;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: '#fbbf24',
    size: 0.45,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // --- 6. Official Glowing Heart Portal (From Twin-Quest.png) ---
  const { portalGroup, goldenTrails } = createOfficialHeartPortal();
  const goalPortal = portalGroup;
  const goldenTrailsGroup = goldenTrails;
  scene.add(goalPortal);

  // --- 7. Romantic Love Tether ---
  const tetherGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 1, 0)
  ]);
  const loveTetherMaterial = new THREE.LineBasicMaterial({
    color: '#f43f5e',
    transparent: true,
    opacity: 0.5,
    linewidth: 2
  });
  const loveTetherMesh = new THREE.Line(tetherGeo, loveTetherMaterial);
  scene.add(loveTetherMesh);

  const platformMeshes: THREE.Object3D[] = [];

  const updateTheme = (newWorld: WorldData) => {
    scene.fog = new THREE.FogExp2(newWorld.fogColor || '#c7d2fe', 0.009);
    ambientLight.color.set(newWorld.skyColorBottom || '#bae6fd');
    fillLight.color.set(newWorld.accentColor || '#93c5fd');
    skyMat.color.set(newWorld.skyColorTop || '#38bdf8');
    particleMat.color.set('#fbbf24');
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
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    ambientLight,
    sunLight,
    charFillLight,
    particles,
    goalPortal,
    loveTetherMesh,
    loveTetherMaterial,
    platformMeshes,
    skyMesh,
    distantIslands,
    castleGroup,
    cloudsGroup,
    goldenTrailsGroup,
    dispose,
    updateTheme
  };
}

/**
 * Builds stylized 3D floating grass islands for each level platform.
 * Aligns the top grass surface precisely with the platform's bounding box top
 * to preserve 100% accurate collision detection and responsive jumping!
 */
export function buildStaticPlatforms(
  scene: THREE.Scene,
  platforms: PlatformConfig[],
  groundColor: string,
  existingList: THREE.Object3D[]
): THREE.Object3D[] {
  // Clear existing
  existingList.forEach((m) => scene.remove(m));
  const newList: THREE.Object3D[] = [];

  const grassMat = new THREE.MeshStandardMaterial({
    color: '#22c55e', // Vibrant lush green from Twin-Quest.png
    roughness: 0.55,
    metalness: 0.05
  });

  const rockMat = new THREE.MeshStandardMaterial({
    color: '#5c3a21', // Layered earthen rock
    roughness: 0.85,
    metalness: 0.08
  });

  const rockDarkMat = new THREE.MeshStandardMaterial({
    color: '#3d2413',
    roughness: 0.9,
    metalness: 0.05
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: '#92400e',
    roughness: 0.7,
    metalness: 0.1
  });

  const flowerColors = ['#f43f5e', '#ec4899', '#fde047', '#ffffff', '#60a5fa'];

  platforms.forEach((p, pIndex) => {
    if (!p.isMoving) {
      const [w, h, d] = p.size;
      const [px, py, pz] = p.position;

      const islandGroup = new THREE.Group();
      islandGroup.position.set(px, py, pz);

      const isBridge = (w < 2.2 && d >= 4) || (d < 2.2 && w >= 4);

      if (isBridge) {
        // --- Stylized Wooden Rope Bridge ---
        const plankCount = Math.floor(Math.max(w, d) / 0.6);
        const isAlongZ = d >= w;

        for (let i = 0; i < plankCount; i++) {
          const plankGeo = new THREE.BoxGeometry(
            isAlongZ ? w * 0.95 : 0.45,
            0.14,
            isAlongZ ? 0.45 : d * 0.95
          );
          const plank = new THREE.Mesh(plankGeo, woodMat);
          const offset = (i - (plankCount - 1) / 2) * 0.58;
          plank.position.set(isAlongZ ? 0 : offset, h * 0.5 - 0.07, isAlongZ ? offset : 0);
          plank.castShadow = true;
          plank.receiveShadow = true;
          islandGroup.add(plank);
        }

        // Rope Railings
        [-1, 1].forEach((side) => {
          const ropeGeo = new THREE.CylinderGeometry(0.04, 0.04, isAlongZ ? d : w, 8);
          const rope = new THREE.Mesh(ropeGeo, woodMat);
          rope.position.set(
            isAlongZ ? side * (w * 0.48) : 0,
            h * 0.5 + 0.35,
            isAlongZ ? 0 : side * (d * 0.48)
          );
          if (isAlongZ) rope.rotation.x = Math.PI / 2;
          else rope.rotation.z = Math.PI / 2;
          islandGroup.add(rope);

          // Posts
          for (let pi = 0; pi < 3; pi++) {
            const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.65, 8);
            const post = new THREE.Mesh(postGeo, woodMat);
            const poffset = (pi - 1) * (isAlongZ ? d * 0.4 : w * 0.4);
            post.position.set(
              isAlongZ ? side * (w * 0.48) : poffset,
              h * 0.5 + 0.15,
              isAlongZ ? poffset : side * (d * 0.48)
            );
            islandGroup.add(post);
          }
        });
      } else {
        // --- Lush Floating Grass Island with Tapered Earthen Rock Base ---
        // 1. Lush Green Grass Cap (Top aligns precisely with py + h*0.5)
        const grassH = Math.min(0.45, h * 0.6);
        const grassGeo = new THREE.BoxGeometry(w, grassH, d);
        const grassMesh = new THREE.Mesh(grassGeo, grassMat);
        grassMesh.position.y = h * 0.5 - grassH * 0.5;
        grassMesh.castShadow = true;
        grassMesh.receiveShadow = true;
        islandGroup.add(grassMesh);

        // Hanging Grass Overhang Clumps
        const clumpCount = Math.min(8, Math.floor((w + d) * 0.7));
        for (let c = 0; c < clumpCount; c++) {
          const clumpW = 0.4 + (c % 3) * 0.2;
          const clumpH = 0.25 + (c % 2) * 0.15;
          const clumpGeo = new THREE.ConeGeometry(clumpW * 0.5, clumpH, 5);
          const clump = new THREE.Mesh(clumpGeo, grassMat);
          clump.rotation.x = Math.PI;

          // Place along perimeter
          const isXSide = c % 2 === 0;
          const sign = c % 4 < 2 ? 1 : -1;
          const cx = isXSide ? sign * (w * 0.5) : ((c / clumpCount) - 0.5) * w * 0.8;
          const cz = isXSide ? ((c / clumpCount) - 0.5) * d * 0.8 : sign * (d * 0.5);
          clump.position.set(cx, h * 0.5 - grassH - clumpH * 0.4, cz);
          islandGroup.add(clump);
        }

        // 2. Layered Earthen Rock Underbody (Tapered Crag)
        const rockH = Math.max(1.8, Math.min(w, d) * 0.85);
        const rockTopW = w * 0.94;
        const rockTopD = d * 0.94;
        const rockBotW = w * 0.35;
        const rockBotD = d * 0.35;

        // Inverted pyramidal rock base
        const rockGeo = new THREE.CylinderGeometry(
          Math.min(rockTopW, rockTopD) * 0.5,
          Math.min(rockBotW, rockBotD) * 0.5,
          rockH,
          7
        );
        const rockMesh = new THREE.Mesh(rockGeo, (pIndex % 2 === 0) ? rockMat : rockDarkMat);
        rockMesh.position.y = h * 0.5 - grassH - rockH * 0.5;
        rockMesh.scale.set(rockTopW / Math.min(rockTopW, rockTopD), 1, rockTopD / Math.min(rockTopW, rockTopD));
        rockMesh.castShadow = true;
        rockMesh.receiveShadow = true;
        islandGroup.add(rockMesh);

        // Lower Jagged Stalactite Tip
        const tipGeo = new THREE.ConeGeometry(Math.min(rockBotW, rockBotD) * 0.45, rockH * 0.6, 6);
        const tip = new THREE.Mesh(tipGeo, rockDarkMat);
        tip.rotation.x = Math.PI;
        tip.position.y = h * 0.5 - grassH - rockH - (rockH * 0.6) * 0.45;
        islandGroup.add(tip);

        // 3. Environmental Foliage: Flowers & Cute Shrub Mounds
        if (w >= 2.5 && d >= 2.5) {
          // Shrub Mound
          const bushGeo = new THREE.SphereGeometry(0.35, 8, 8);
          bushGeo.scale(1.2, 0.7, 1.0);
          const bushMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.7 });
          const bush = new THREE.Mesh(bushGeo, bushMat);
          bush.position.set(w * 0.35, h * 0.5 + 0.15, -d * 0.3);
          islandGroup.add(bush);

          // Wild Flowers (Pink, Yellow, White)
          const flowerCount = 3 + (pIndex % 4);
          for (let f = 0; f < flowerCount; f++) {
            const fColor = flowerColors[(pIndex + f) % flowerColors.length];
            const flowerGeo = new THREE.SphereGeometry(0.09, 6, 6);
            const flowerMat = new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.3, emissive: fColor, emissiveIntensity: 0.25 });
            const flower = new THREE.Mesh(flowerGeo, flowerMat);
            const fx = ((f / flowerCount) - 0.5) * (w * 0.65);
            const fz = (((f * 2) % flowerCount) / flowerCount - 0.5) * (d * 0.65);
            flower.position.set(fx, h * 0.5 + 0.08, fz);
            islandGroup.add(flower);

            // Green Stem
            const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 4);
            const stemMat = new THREE.MeshBasicMaterial({ color: '#16a34a' });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.set(fx, h * 0.5 + 0.04, fz);
            islandGroup.add(stem);
          }
        }
      }

      scene.add(islandGroup);
      newList.push(islandGroup);
    }
  });

  return newList;
}

/**
 * Creates fluffy white 3D cartoon cloud clusters.
 */
function createPuffyCloud(material: THREE.Material, scale: number): THREE.Group {
  const cloud = new THREE.Group();
  const sphereCount = 6;
  const offsets = [
    { x: 0, y: 0, z: 0, r: 2.2 },
    { x: 1.8, y: 0.2, z: 0.2, r: 1.8 },
    { x: -1.7, y: 0.1, z: -0.1, r: 1.7 },
    { x: 0.8, y: 1.0, z: -0.2, r: 1.9 },
    { x: -0.9, y: 0.9, z: 0.3, r: 1.6 },
    { x: 0, y: -0.4, z: 0.8, r: 1.5 }
  ];

  offsets.forEach((o) => {
    const geo = new THREE.SphereGeometry(o.r * scale, 12, 12);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(o.x * scale, o.y * scale, o.z * scale);
    cloud.add(mesh);
  });

  return cloud;
}

/**
 * Creates the Fairytale Castle landmark directly inspired by the official logo.
 */
function createFairytaleCastle(): THREE.Group {
  const castle = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.7,
    metalness: 0.1
  });

  const stoneDarkMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.8,
    metalness: 0.1
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: '#6d28d9', // Royal purple spires from Twin-Quest.png
    roughness: 0.35,
    metalness: 0.25
  });

  const flagMat = new THREE.MeshStandardMaterial({
    color: '#ec4899', // Hot-pink / purple flags
    roughness: 0.4,
    side: THREE.DoubleSide
  });

  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#f59e0b',
    emissiveIntensity: 0.8,
    roughness: 0.2
  });

  // Base Castle Island
  const baseGeo = new THREE.CylinderGeometry(18, 10, 14, 10);
  const baseIsland = new THREE.Mesh(baseGeo, stoneDarkMat);
  baseIsland.position.y = -7;
  castle.add(baseIsland);

  // Main Keep Body
  const keepGeo = new THREE.BoxGeometry(14, 16, 12);
  const keep = new THREE.Mesh(keepGeo, stoneMat);
  keep.position.y = 8;
  castle.add(keep);

  // Central Grand Spire Tower
  const centerTowerGeo = new THREE.CylinderGeometry(3.5, 4.0, 22, 14);
  const centerTower = new THREE.Mesh(centerTowerGeo, stoneMat);
  centerTower.position.set(0, 19, 0);
  castle.add(centerTower);

  // Central Roof Cone
  const centerRoofGeo = new THREE.ConeGeometry(4.8, 12, 14);
  const centerRoof = new THREE.Mesh(centerRoofGeo, roofMat);
  centerRoof.position.set(0, 36, 0);
  castle.add(centerRoof);

  // Central Flagpole & Flag
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6);
  const pole = new THREE.Mesh(poleGeo, stoneMat);
  pole.position.set(0, 43, 0);
  castle.add(pole);

  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(1.8, -0.6);
  flagShape.lineTo(0, -1.2);
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), flagMat);
  flag.position.set(0.08, 44.5, 0);
  castle.add(flag);

  // 4 Corner Towers with Spire Roofs
  const towerPositions = [
    { x: -6.5, z: -5.5 },
    { x: 6.5, z: -5.5 },
    { x: -6.5, z: 5.5 },
    { x: 6.5, z: 5.5 }
  ];

  towerPositions.forEach((tp) => {
    const towerGeo = new THREE.CylinderGeometry(2.0, 2.3, 18, 12);
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(tp.x, 9, tp.z);
    castle.add(tower);

    const roofGeo = new THREE.ConeGeometry(2.8, 8, 12);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(tp.x, 22, tp.z);
    castle.add(roof);

    // Corner Flags
    const cPole = new THREE.Mesh(poleGeo, stoneMat);
    cPole.position.set(tp.x, 27, tp.z);
    castle.add(cPole);

    const cFlag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), flagMat);
    cFlag.position.set(tp.x + 0.08, 28, tp.z);
    castle.add(cFlag);
  });

  // Glowing Castle Windows
  [-3, 0, 3].forEach((wx) => {
    const winGeo = new THREE.BoxGeometry(1.0, 1.8, 0.2);
    const win = new THREE.Mesh(winGeo, windowGlowMat);
    win.position.set(wx, 10, 6.1);
    castle.add(win);
  });

  return castle;
}

/**
 * Creates mini background floating islands with tiny trees and crystals.
 */
function createMiniFloatingIsland(radius: number): THREE.Group {
  const island = new THREE.Group();

  const grassMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.6 });
  const rockMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.9 });

  const topGeo = new THREE.CylinderGeometry(radius, radius * 0.85, 1.2, 8);
  const top = new THREE.Mesh(topGeo, grassMat);
  island.add(top);

  const bottomGeo = new THREE.ConeGeometry(radius * 0.85, radius * 1.5, 7);
  bottomGeo.rotateX(Math.PI);
  const bottom = new THREE.Mesh(bottomGeo, rockMat);
  bottom.position.y = -radius * 0.75;
  island.add(bottom);

  // Tiny Stylized Tree
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f' });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(0.5, 1.2, 0);
  island.add(trunk);

  const leavesGeo = new THREE.ConeGeometry(1.2, 2.4, 7);
  const leavesMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.5 });
  const leaves = new THREE.Mesh(leavesGeo, leavesMat);
  leaves.position.set(0.5, 2.8, 0);
  island.add(leaves);

  return island;
}

/**
 * Creates the official glowing Heart Portal with concentric energy rings
 * and swirling golden light arcs directly inspired by Twin-Quest.png.
 */
function createOfficialHeartPortal(): { portalGroup: THREE.Group; goldenTrails: THREE.Group } {
  const portalGroup = new THREE.Group();

  // 1. Ancient Stone Archway Frame
  const archStoneMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.65,
    metalness: 0.2
  });

  // Left & Right Stone Pillars
  [-1.6, 1.6].forEach((x) => {
    const pillarGeo = new THREE.BoxGeometry(0.55, 3.8, 0.55);
    const pillar = new THREE.Mesh(pillarGeo, archStoneMat);
    pillar.position.set(x, 1.9, 0);
    pillar.castShadow = true;
    portalGroup.add(pillar);

    // Carved Capital / Base
    const capGeo = new THREE.BoxGeometry(0.75, 0.25, 0.75);
    const cap = new THREE.Mesh(capGeo, archStoneMat);
    cap.position.set(x, 3.8, 0);
    portalGroup.add(cap);
  });

  // Top Curved Arch Beam
  const archBeamGeo = new THREE.BoxGeometry(3.9, 0.55, 0.65);
  const archBeam = new THREE.Mesh(archBeamGeo, archStoneMat);
  archBeam.position.set(0, 3.9, 0);
  archBeam.castShadow = true;
  portalGroup.add(archBeam);

  // Stone Steps Leading Up
  for (let s = 0; s < 3; s++) {
    const stepGeo = new THREE.BoxGeometry(3.2 + s * 0.4, 0.22, 0.8 + s * 0.4);
    const step = new THREE.Mesh(stepGeo, archStoneMat);
    step.position.set(0, (2 - s) * 0.22, 0.5 + s * 0.4);
    step.receiveShadow = true;
    portalGroup.add(step);
  }

  // 2. Radiant Concentric Glowing Heart Portals (Directly from Twin-Quest.png)
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0);
  heartShape.bezierCurveTo(0.35, 0.35, 0.65, 0.7, 0.38, 1.05);
  heartShape.bezierCurveTo(0.18, 1.25, -0.18, 1.25, -0.38, 1.05);
  heartShape.bezierCurveTo(-0.65, 0.7, -0.35, 0.35, 0, 0);

  const heartEnergy = new THREE.Group();
  heartEnergy.name = 'portalHeartEnergy';
  heartEnergy.position.set(0, 2.1, 0);
  portalGroup.add(heartEnergy);

  // Outer Radiant Violet/Purple Heart Ring
  const outerHeartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.06 });
  outerHeartGeo.center();
  const outerHeartMat = new THREE.MeshStandardMaterial({
    color: '#c084fc',
    emissive: '#9333ea',
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.5
  });
  const outerHeart = new THREE.Mesh(outerHeartGeo, outerHeartMat);
  outerHeart.scale.set(1.9, 1.9, 1.9);
  heartEnergy.add(outerHeart);

  // Inner Neon Pink Glowing Heart
  const innerHeartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05 });
  innerHeartGeo.center();
  const innerHeartMat = new THREE.MeshStandardMaterial({
    color: '#f43f5e',
    emissive: '#ec4899',
    emissiveIntensity: 1.4,
    roughness: 0.1,
    metalness: 0.2
  });
  const innerHeart = new THREE.Mesh(innerHeartGeo, innerHeartMat);
  innerHeart.scale.set(1.4, 1.4, 1.4);
  innerHeart.position.z = 0.04;
  heartEnergy.add(innerHeart);

  // Core Luminous White/Pink Portal Heart Center
  const coreHeartGeo = new THREE.ShapeGeometry(heartShape);
  coreHeartGeo.center();
  const coreHeartMat = new THREE.MeshBasicMaterial({
    color: '#fff1f2',
    transparent: true,
    opacity: 0.95
  });
  const coreHeart = new THREE.Mesh(coreHeartGeo, coreHeartMat);
  coreHeart.position.z = 0.08;
  heartEnergy.add(coreHeart);

  // 3. Swirling Golden Magical Trails (Circling the Heart Portal like in the TwinQuest Logo!)
  const goldenTrails = new THREE.Group();
  goldenTrails.name = 'portalGoldenTrails';
  goldenTrails.position.set(0, 2.1, 0);
  portalGroup.add(goldenTrails);

  const goldTrailMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    emissive: '#fbbf24',
    emissiveIntensity: 1.2,
    metalness: 0.9,
    roughness: 0.15
  });

  // Golden Orbital Ring 1
  const trail1Geo = new THREE.TorusGeometry(2.1, 0.065, 12, 48);
  const trail1 = new THREE.Mesh(trail1Geo, goldTrailMat);
  trail1.rotation.x = Math.PI * 0.35;
  trail1.rotation.y = Math.PI * 0.15;
  goldenTrails.add(trail1);

  // Golden Orbital Ring 2 (Counter-angled)
  const trail2Geo = new THREE.TorusGeometry(1.7, 0.045, 10, 40);
  const trail2 = new THREE.Mesh(trail2Geo, goldTrailMat);
  trail2.rotation.x = -Math.PI * 0.3;
  trail2.rotation.z = Math.PI * 0.25;
  goldenTrails.add(trail2);

  // Magical Portal Illumination
  const portalLight = new THREE.PointLight('#f43f5e', 3.5, 16);
  portalLight.position.set(0, 2.1, 1.2);
  portalGroup.add(portalLight);

  return { portalGroup, goldenTrails };
}
