import * as THREE from 'three';
import { WorldData, PlatformConfig } from '../types/game';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  ambientLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  particles: THREE.Points;
  goalPortal: THREE.Group;
  loveTetherMesh: THREE.Line;
  loveTetherMaterial: THREE.LineBasicMaterial;
  platformMeshes: THREE.Mesh[];
  skyMesh: THREE.Mesh;
  distantIslands: THREE.Group;
  dispose: () => void;
  updateTheme: (world: WorldData) => void;
}

export function createTwinQuestScene(container: HTMLDivElement, world: WorldData): SceneContext {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(world.fogColor, 0.012);

  // Camera
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 300);
  camera.position.set(0, 7, 12);

  // WebGL Renderer
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
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = !isHeadless;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Lighting Rig: Warm Key Light + Cool Ambient Hemisphere
  const ambientLight = new THREE.HemisphereLight(world.skyColorBottom, world.groundColor, 0.85);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight('#fff7ed', 1.8);
  sunLight.position.set(20, 35, 15);
  sunLight.castShadow = !isHeadless;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 100;
  const d = 30;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  // Soft Fill Light
  const fillLight = new THREE.DirectionalLight(world.accentColor, 0.45);
  fillLight.position.set(-15, 10, -20);
  scene.add(fillLight);

  // Player Character Frontal Fill Light (Keeps characters clear and vibrant)
  const charFillLight = new THREE.DirectionalLight('#ffffff', 0.65);
  charFillLight.position.set(0, 10, 15);
  scene.add(charFillLight);

  // Procedural Sky Dome
  const skyGeo = new THREE.SphereGeometry(220, 24, 24);
  const skyMat = new THREE.MeshBasicMaterial({
    color: world.skyColorTop,
    side: THREE.BackSide
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  // Distant Floating Islands & Mountain Silhouettes
  const distantIslands = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const dist = 70 + Math.random() * 30;
    const islandX = Math.cos(angle) * dist;
    const islandZ = Math.sin(angle) * dist - 30;
    const islandY = -5 + Math.random() * 15;

    const islandGeo = new THREE.ConeGeometry(8 + Math.random() * 6, 14, 6);
    islandGeo.rotateX(Math.PI);
    const islandMat = new THREE.MeshStandardMaterial({
      color: world.groundColor,
      roughness: 0.9,
      metalness: 0.1
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.set(islandX, islandY, islandZ);
    distantIslands.add(island);

    // Castle spire / crystal cluster on distant island
    const spireGeo = new THREE.CylinderGeometry(0.3, 1.2, 8, 5);
    const spireMat = new THREE.MeshStandardMaterial({ color: world.accentColor, roughness: 0.3, metalness: 0.7 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.set(islandX, islandY + 7, islandZ);
    distantIslands.add(spire);
  }
  scene.add(distantIslands);

  // Ambient Floating Romantic Particles (Blossoms/Embers/Sparks)
  const particleCount = 200;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 60;
    particlePositions[i + 1] = Math.random() * 25;
    particlePositions[i + 2] = -Math.random() * 80;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: world.accentColor,
    size: 0.35,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Finish Golden Heart Goal Portal
  const goalPortal = new THREE.Group();

  // Grand Portal Arch with Sacred Rings
  const outerRingGeo = new THREE.TorusGeometry(1.8, 0.12, 12, 32);
  const goldPortalMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    roughness: 0.2,
    metalness: 0.9,
    emissive: '#d97706',
    emissiveIntensity: 0.3
  });
  const outerRing = new THREE.Mesh(outerRingGeo, goldPortalMat);
  goalPortal.add(outerRing);

  const innerRingGeo = new THREE.TorusGeometry(1.4, 0.08, 10, 24);
  const innerRingMat = new THREE.MeshStandardMaterial({
    color: '#f43f5e',
    roughness: 0.1,
    metalness: 0.8,
    emissive: '#e11d48',
    emissiveIntensity: 0.5
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  goalPortal.add(innerRing);

  // Floating Radiant Heart at Center
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0);
  heartShape.bezierCurveTo(0.3, 0.3, 0.5, 0.6, 0.3, 0.85);
  heartShape.bezierCurveTo(0.12, 1.0, -0.12, 1.0, -0.3, 0.85);
  heartShape.bezierCurveTo(-0.5, 0.6, -0.3, 0.3, 0, 0);

  const portalHeartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05 });
  portalHeartGeo.center();
  const portalHeartMat = new THREE.MeshStandardMaterial({
    color: '#f43f5e',
    emissive: '#f43f5e',
    emissiveIntensity: 0.65,
    roughness: 0.1,
    metalness: 0.5
  });
  const portalHeart = new THREE.Mesh(portalHeartGeo, portalHeartMat);
  goalPortal.add(portalHeart);

  const portalLight = new THREE.PointLight('#f43f5e', 2.5, 12);
  goalPortal.add(portalLight);

  scene.add(goalPortal);

  // Romantic Love Tether Line connecting Boyfriend & Girlfriend
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

  const platformMeshes: THREE.Mesh[] = [];

  const updateTheme = (newWorld: WorldData) => {
    scene.fog = new THREE.FogExp2(newWorld.fogColor, 0.012);
    ambientLight.color.set(newWorld.skyColorBottom);
    ambientLight.groundColor.set(newWorld.groundColor);
    fillLight.color.set(newWorld.accentColor);
    skyMat.color.set(newWorld.skyColorTop);
    particleMat.color.set(newWorld.accentColor);
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
    particles,
    goalPortal,
    loveTetherMesh,
    loveTetherMaterial,
    platformMeshes,
    skyMesh,
    distantIslands,
    dispose,
    updateTheme
  };
}

export function buildStaticPlatforms(
  scene: THREE.Scene,
  platforms: PlatformConfig[],
  groundColor: string,
  existingList: THREE.Mesh[]
): THREE.Mesh[] {
  // Clear existing
  existingList.forEach((m) => scene.remove(m));
  const newList: THREE.Mesh[] = [];

  platforms.forEach((p) => {
    if (!p.isMoving) {
      const geo = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
      const mat = new THREE.MeshStandardMaterial({
        color: p.color || groundColor,
        roughness: 0.7,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.position[0], p.position[1], p.position[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      newList.push(mesh);
    }
  });

  return newList;
}
