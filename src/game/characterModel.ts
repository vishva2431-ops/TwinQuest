import * as THREE from 'three';
import { CharacterCustomization, CharacterGender } from '../types/game';

/**
 * TwinQuest High-Fidelity Stylized 3D Character Rig
 * Crafted to precisely match the vibrant Pixar / Anime art style of Twin-Quest.png:
 * - Boy (Leo): Charming boyish face, fluffy layered anime chocolate-brown hair,
 *   giant sparkling sapphire-blue anime eyes, confident warm smile, vibrant royal-blue
 *   hoodie with folded neck cowl, white drawstrings, brown leather backpack straps, and sneakers.
 * - Girl (Maya): Beautiful sweet face, warm rosy blushing cheeks, sparkling hazel/ruby anime eyes,
 *   rich brunette hair with soft swept bangs and a high bouncy ponytail cinched by a vibrant
 *   hot-pink scrunchie, bright magenta hoodie with folded hood collar, heart pendant, and sneakers.
 */

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
  lookAtPartnerPos?: THREE.Vector3;
}

export function createCharacterRig(gender: CharacterGender, customization: CharacterCustomization): CharacterRig {
  const root = new THREE.Group();
  const materials: THREE.Material[] = [];

  const isBoy = gender === 'boy';
  const scale = isBoy ? 1.0 : 0.95;

  // Base Colors aligned with Twin-Quest.png Artwork
  const skinColor = new THREE.Color(customization.skinTone || (isBoy ? '#ffe4cb' : '#ffe8d6'));
  const hairColor = new THREE.Color(customization.hairColor || (isBoy ? '#452210' : '#5c2e17'));
  const eyeColor = new THREE.Color(customization.eyeColor || (isBoy ? '#2563eb' : '#9f2d1e'));
  const hoodieColor = new THREE.Color(customization.clothingPrimaryColor || (isBoy ? '#2563eb' : '#ec4899'));
  const pantsColor = new THREE.Color(isBoy ? '#1e293b' : '#27272a');
  const accentColor = new THREE.Color(customization.clothingSecondaryColor || (isBoy ? '#ffffff' : '#fb7185'));

  // --- Material Library ---
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.55,
    metalness: 0.02
  });
  materials.push(skinMat);

  const blushMat = new THREE.MeshStandardMaterial({
    color: isBoy ? '#fca5a5' : '#fb7185',
    roughness: 0.8,
    transparent: true,
    opacity: isBoy ? 0.35 : 0.55
  });
  materials.push(blushMat);

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.35,
    metalness: 0.08
  });
  materials.push(hairMat);

  const hairHighlightMat = new THREE.MeshStandardMaterial({
    color: hairColor.clone().offsetHSL(0.02, 0.12, 0.12),
    roughness: 0.28,
    metalness: 0.12
  });
  materials.push(hairHighlightMat);

  const hoodieMat = new THREE.MeshStandardMaterial({
    color: hoodieColor,
    roughness: 0.45,
    metalness: 0.05
  });
  materials.push(hoodieMat);

  const hoodieTrimMat = new THREE.MeshStandardMaterial({
    color: hoodieColor.clone().offsetHSL(0, 0.05, -0.08),
    roughness: 0.45,
    metalness: 0.05
  });
  materials.push(hoodieTrimMat);

  const drawstringsMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.3,
    metalness: 0.05
  });
  materials.push(drawstringsMat);

  const strapMat = new THREE.MeshStandardMaterial({
    color: '#78350f',
    roughness: 0.6,
    metalness: 0.1
  });
  materials.push(strapMat);

  const buckleMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    roughness: 0.25,
    metalness: 0.85
  });
  materials.push(buckleMat);

  const scrunchieMat = new THREE.MeshStandardMaterial({
    color: '#f43f5e',
    roughness: 0.3,
    metalness: 0.15
  });
  materials.push(scrunchieMat);

  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.7,
    metalness: 0.05
  });
  materials.push(pantsMat);

  const whiteSneakerMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.35,
    metalness: 0.05
  });
  materials.push(whiteSneakerMat);

  const sneakerUpperMat = new THREE.MeshStandardMaterial({
    color: hoodieColor,
    roughness: 0.4,
    metalness: 0.08
  });
  materials.push(sneakerUpperMat);

  // Eye Materials
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.1,
    metalness: 0.0
  });
  materials.push(eyeWhiteMat);

  const irisMat = new THREE.MeshStandardMaterial({
    color: eyeColor,
    roughness: 0.15,
    metalness: 0.05
  });
  materials.push(irisMat);

  const irisHighlightMat = new THREE.MeshStandardMaterial({
    color: isBoy ? '#60a5fa' : '#fb923c',
    roughness: 0.2,
    metalness: 0.05
  });
  materials.push(irisHighlightMat);

  const pupilMat = new THREE.MeshBasicMaterial({ color: '#09090b' });
  materials.push(pupilMat);

  const sparkleMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  materials.push(sparkleMat);

  const eyelinerMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });
  materials.push(eyelinerMat);

  const lipsMat = new THREE.MeshStandardMaterial({
    color: isBoy ? '#fca5a5' : '#f472b6',
    roughness: 0.4,
    metalness: 0.05
  });
  materials.push(lipsMat);

  // --- Hierarchical Rig Assembly ---

  // Hips (Pelvis)
  const hips = new THREE.Group();
  hips.position.y = 0.92 * scale;
  root.add(hips);

  const pelvisGeo = new THREE.CylinderGeometry(0.18 * scale, 0.16 * scale, 0.16 * scale, 16);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Torso / Chest (Cozy Hoodie Body)
  const torso = new THREE.Group();
  torso.position.y = 0.08 * scale;
  hips.add(torso);

  // Rounded Hoodie Main Body
  const hoodieBodyGeo = new THREE.CylinderGeometry(0.23 * scale, 0.19 * scale, 0.42 * scale, 18);
  const hoodieBodyMesh = new THREE.Mesh(hoodieBodyGeo, hoodieMat);
  hoodieBodyMesh.position.y = 0.21 * scale;
  hoodieBodyMesh.castShadow = true;
  torso.add(hoodieBodyMesh);

  // Lower Ribbed Waistband Hem
  const hemGeo = new THREE.CylinderGeometry(0.195 * scale, 0.19 * scale, 0.06 * scale, 18);
  const hemMesh = new THREE.Mesh(hemGeo, hoodieTrimMat);
  hemMesh.position.y = 0.03 * scale;
  torso.add(hemMesh);

  // Folded Cozy Hoodie Cowl / Neck Collar (Iconic feature from Twin-Quest.png)
  const cowlGeo = new THREE.TorusGeometry(0.13 * scale, 0.048 * scale, 12, 24);
  const cowlMesh = new THREE.Mesh(cowlGeo, hoodieTrimMat);
  cowlMesh.position.set(0, 0.42 * scale, 0.01 * scale);
  cowlMesh.rotation.x = Math.PI * 0.45;
  torso.add(cowlMesh);

  // Folded Hood Drapery on Upper Back
  const hoodBackGeo = new THREE.SphereGeometry(0.14 * scale, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hoodBackMesh = new THREE.Mesh(hoodBackGeo, hoodieTrimMat);
  hoodBackMesh.position.set(0, 0.36 * scale, -0.12 * scale);
  hoodBackMesh.rotation.x = -Math.PI * 0.45;
  hoodBackMesh.castShadow = true;
  torso.add(hoodBackMesh);

  // White Hoodie Drawstrings (Hanging in front)
  [-0.04, 0.04].forEach((x) => {
    const stringGeo = new THREE.CylinderGeometry(0.005 * scale, 0.005 * scale, 0.16 * scale, 6);
    const stringMesh = new THREE.Mesh(stringGeo, drawstringsMat);
    stringMesh.position.set(x * scale, 0.33 * scale, 0.14 * scale);
    stringMesh.rotation.z = (x > 0 ? 0.08 : -0.08);
    torso.add(stringMesh);

    // Silver Aglet Tip
    const tipGeo = new THREE.CylinderGeometry(0.007 * scale, 0.007 * scale, 0.02 * scale, 6);
    const tipMesh = new THREE.Mesh(tipGeo, buckleMat);
    tipMesh.position.set(x * scale, 0.24 * scale, 0.145 * scale);
    torso.add(tipMesh);
  });

  // Explorer Backpack Straps Running Over Shoulders (From Twin-Quest.png)
  [-0.11, 0.11].forEach((x) => {
    const strapFrontGeo = new THREE.BoxGeometry(0.034 * scale, 0.32 * scale, 0.012 * scale);
    const strapFront = new THREE.Mesh(strapFrontGeo, strapMat);
    strapFront.position.set(x * scale, 0.28 * scale, 0.138 * scale);
    strapFront.rotation.z = (x > 0 ? -0.1 : 0.1);
    torso.add(strapFront);

    // Golden Strap Buckle
    const buckleGeo = new THREE.BoxGeometry(0.042 * scale, 0.022 * scale, 0.018 * scale);
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(x * scale, 0.22 * scale, 0.146 * scale);
    torso.add(buckle);
  });

  // Optional Full Backpack on Back
  let backpackMesh: THREE.Mesh | undefined;
  if (customization.accessories.backpack) {
    const packGeo = new THREE.BoxGeometry(0.28 * scale, 0.32 * scale, 0.15 * scale);
    const packMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.65 });
    materials.push(packMat);
    backpackMesh = new THREE.Mesh(packGeo, packMat);
    backpackMesh.position.set(0, 0.26 * scale, -0.19 * scale);
    backpackMesh.castShadow = true;
    torso.add(backpackMesh);

    // Front Pocket
    const pocketGeo = new THREE.BoxGeometry(0.22 * scale, 0.14 * scale, 0.06 * scale);
    const pocket = new THREE.Mesh(pocketGeo, packMat);
    pocket.position.set(0, -0.06 * scale, -0.08 * scale);
    backpackMesh.add(pocket);
  }

  // Romantic Heart Pendant for Maya (Girlfriend)
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
    pendantMesh.scale.set(0.65 * scale, 0.65 * scale, 0.65 * scale);
    pendantMesh.position.set(0, 0.38 * scale, 0.155 * scale);
    torso.add(pendantMesh);
  }

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.07 * scale, 0.08 * scale, 0.1 * scale, 14);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.y = 0.45 * scale;
  torso.add(neckMesh);

  // Head Group
  const head = new THREE.Group();
  head.position.y = 0.52 * scale;
  torso.add(head);

  // Sculpted Anime Head Shape (Soft, Rounded, Pixar/Anime proportions)
  const headGeo = new THREE.SphereGeometry(0.19 * scale, 24, 24);
  headGeo.scale(0.96, 1.05, 0.94);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.14 * scale;
  headMesh.castShadow = true;
  head.add(headMesh);

  // Cute Sculpted Ears with Inner Crease
  [-0.185, 0.185].forEach((x) => {
    const earGeo = new THREE.SphereGeometry(0.04 * scale, 12, 12);
    earGeo.scale(0.4, 1.2, 0.8);
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(x * scale, 0.14 * scale, -0.01 * scale);
    ear.rotation.y = (x > 0 ? -0.2 : 0.2);
    head.add(ear);

    // Inner Ear shadow
    const innerEarGeo = new THREE.SphereGeometry(0.022 * scale, 8, 8);
    innerEarGeo.scale(0.3, 1.0, 0.6);
    const innerEarMat = new THREE.MeshStandardMaterial({ color: isBoy ? '#fca5a5' : '#fda4af', roughness: 0.8 });
    const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerEar.position.set(x * scale * 1.02, 0.14 * scale, -0.005 * scale);
    head.add(innerEar);
  });

  // Cute Soft Button Nose
  const noseGeo = new THREE.SphereGeometry(0.016 * scale, 12, 12);
  noseGeo.scale(1.1, 0.9, 1.3);
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.position.set(0, 0.128 * scale, 0.182 * scale);
  head.add(noseMesh);

  // Warm Rosy Blushing Cheeks (Delicate Peach / Rose Glow)
  [-0.105, 0.105].forEach((x) => {
    const blushGeo = new THREE.SphereGeometry(0.034 * scale, 12, 12);
    blushGeo.scale(1.4, 0.75, 0.35);
    const blushMesh = new THREE.Mesh(blushGeo, blushMat);
    blushMesh.position.set(x * scale, 0.11 * scale, 0.158 * scale);
    head.add(blushMesh);
  });

  // Sweet Radiant Smile (Curved Natural Anime Lips)
  const smileCurve = new THREE.TorusGeometry(0.034 * scale, 0.007 * scale, 8, 20, Math.PI * 0.7);
  const smileMesh = new THREE.Mesh(smileCurve, lipsMat);
  smileMesh.position.set(0, 0.088 * scale, 0.168 * scale);
  smileMesh.rotation.x = Math.PI * 0.52;
  smileMesh.rotation.z = Math.PI * 0.15;
  head.add(smileMesh);

  // Large, Expressive Sparkling Anime Eyes (Almond-Oval Anime Contours)
  [-0.068, 0.068].forEach((xOffset) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(xOffset * scale, 0.155 * scale, 0.162 * scale);
    head.add(eyeGroup);

    // 1. Sclera (White base curved smoothly over face)
    const eyeWhiteGeo = new THREE.SphereGeometry(0.042 * scale, 16, 16);
    eyeWhiteGeo.scale(1.0, 1.15, 0.35);
    const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    eyeGroup.add(eyeWhite);

    // 2. Large Vibrant Iris
    const irisGeo = new THREE.CircleGeometry(0.026 * scale, 24);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(0, -0.002 * scale, 0.016 * scale);
    eyeGroup.add(iris);

    // 3. Inner Iris Luminous Glow Accent
    const irisHighlightGeo = new THREE.CircleGeometry(0.018 * scale, 18, 0, Math.PI);
    const irisHighlight = new THREE.Mesh(irisHighlightGeo, irisHighlightMat);
    irisHighlight.position.set(0, -0.006 * scale, 0.017 * scale);
    irisHighlight.rotation.z = Math.PI;
    eyeGroup.add(irisHighlight);

    // 4. Deep Black Pupil
    const pupilGeo = new THREE.CircleGeometry(0.013 * scale, 18);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(0, 0, 0.018 * scale);
    eyeGroup.add(pupil);

    // 5. Primary Big Star Specular Catchlight (Top-Right Sparkle)
    const glint1 = new THREE.Mesh(new THREE.SphereGeometry(0.0065 * scale, 10, 10), sparkleMat);
    glint1.position.set(0.008 * scale, 0.008 * scale, 0.022 * scale);
    eyeGroup.add(glint1);

    // 6. Secondary Micro Twinkle Catchlight (Lower-Left)
    const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.0035 * scale, 8, 8), sparkleMat);
    glint2.position.set(-0.006 * scale, -0.007 * scale, 0.022 * scale);
    eyeGroup.add(glint2);

    // 7. Clean Dark Curved Upper Eyelash / Liner (Framing without obscuring)
    const lashCurve = new THREE.TorusGeometry(0.042 * scale, 0.0055 * scale, 6, 16, Math.PI * 0.6);
    const lashMesh = new THREE.Mesh(lashCurve, eyelinerMat);
    lashMesh.position.set(0, 0.018 * scale, 0.018 * scale);
    lashMesh.rotation.z = (xOffset > 0 ? -0.2 : 0.2);
    eyeGroup.add(lashMesh);

    // Delicate winged flick for Girl (Maya)
    if (!isBoy) {
      const wingGeo = new THREE.ConeGeometry(0.006 * scale, 0.018 * scale, 6);
      const wing = new THREE.Mesh(wingGeo, eyelinerMat);
      wing.rotation.z = (xOffset > 0 ? -Math.PI / 3 : Math.PI / 3);
      wing.position.set((xOffset > 0 ? 0.034 : -0.034) * scale, 0.022 * scale, 0.018 * scale);
      eyeGroup.add(wing);
    }

    // 8. Expressive Arched Eyebrows (Positioned safely above eyes!)
    const browGeo = new THREE.BoxGeometry(0.052 * scale, 0.009 * scale, 0.014 * scale);
    const browMesh = new THREE.Mesh(browGeo, hairMat);
    browMesh.position.set(0, 0.048 * scale, 0.016 * scale);
    browMesh.rotation.z = (xOffset > 0 ? -0.12 : 0.12);
    eyeGroup.add(browMesh);
  });

  // --- Hair Model Assembly (Directly inspired by Twin-Quest.png) ---
  const hairGroup = new THREE.Group();
  head.add(hairGroup);

  if (isBoy) {
    // === Leo: Fluffy Layered Anime Chocolate-Brown Hair ===
    // 1. Sleek Head Base Cap
    const capGeo = new THREE.SphereGeometry(0.198 * scale, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const capMesh = new THREE.Mesh(capGeo, hairMat);
    capMesh.position.y = 0.14 * scale;
    hairGroup.add(capMesh);

    // 2. High Layered Top Crest & Dynamic Fluffy Tuft
    const crestGeo = new THREE.SphereGeometry(0.16 * scale, 14, 14);
    crestGeo.scale(1.15, 0.75, 1.1);
    const crest = new THREE.Mesh(crestGeo, hairMat);
    crest.position.set(0.02 * scale, 0.30 * scale, -0.02 * scale);
    crest.rotation.x = -0.15;
    hairGroup.add(crest);

    // 3. Dynamic Curved Hair Locks / Spikes (Radiating with volume)
    const tuftCoords = [
      { x: -0.08, y: 0.32, z: 0.08, rx: 0.4, rz: -0.3, len: 0.14, rad: 0.045 },
      { x: 0.02, y: 0.35, z: 0.06, rx: 0.5, rz: 0.1, len: 0.16, rad: 0.05 },
      { x: 0.09, y: 0.32, z: 0.07, rx: 0.4, rz: 0.35, len: 0.14, rad: 0.045 },
      { x: -0.12, y: 0.28, z: 0.02, rx: 0.2, rz: -0.6, len: 0.13, rad: 0.04 },
      { x: 0.13, y: 0.27, z: 0.02, rx: 0.2, rz: 0.6, len: 0.13, rad: 0.04 },
      { x: 0.0, y: 0.36, z: -0.05, rx: -0.4, rz: 0.05, len: 0.15, rad: 0.048 }
    ];

    tuftCoords.forEach((t, i) => {
      const tuftGeo = new THREE.ConeGeometry(t.rad * scale, t.len * scale, 8);
      const tuft = new THREE.Mesh(tuftGeo, i % 2 === 0 ? hairHighlightMat : hairMat);
      tuft.position.set(t.x * scale, t.y * scale, t.z * scale);
      tuft.rotation.x = t.rx;
      tuft.rotation.z = t.rz;
      hairGroup.add(tuft);
    });

    // 4. Front Sweeping Bangs (Framing forehead naturally, parting at center)
    const bangCoords = [
      { x: -0.09, y: 0.24, z: 0.15, rz: -0.3, len: 0.13 },
      { x: -0.04, y: 0.25, z: 0.165, rz: -0.15, len: 0.12 },
      { x: 0.05, y: 0.25, z: 0.165, rz: 0.2, len: 0.13 },
      { x: 0.10, y: 0.24, z: 0.15, rz: 0.35, len: 0.12 }
    ];

    bangCoords.forEach((b, i) => {
      const bangGeo = new THREE.ConeGeometry(0.038 * scale, b.len * scale, 7);
      const bang = new THREE.Mesh(bangGeo, i === 1 || i === 2 ? hairHighlightMat : hairMat);
      bang.position.set(b.x * scale, b.y * scale, b.z * scale);
      bang.rotation.x = Math.PI * 0.72;
      bang.rotation.z = b.rz;
      hairGroup.add(bang);
    });
  } else {
    // === Maya: High Bouncy Ponytail with Hot-Pink Scrunchie ===
    // 1. Smooth Voluminous Crown Base
    const capGeo = new THREE.SphereGeometry(0.202 * scale, 22, 22, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const capMesh = new THREE.Mesh(capGeo, hairMat);
    capMesh.position.y = 0.14 * scale;
    hairGroup.add(capMesh);

    // 2. Soft Sweeping Face-Framing Front Bangs
    const girlBangs = [
      { x: -0.10, y: 0.25, z: 0.15, rz: -0.35, len: 0.13 },
      { x: -0.04, y: 0.26, z: 0.165, rz: -0.12, len: 0.11 },
      { x: 0.04, y: 0.26, z: 0.165, rz: 0.15, len: 0.12 },
      { x: 0.10, y: 0.25, z: 0.15, rz: 0.35, len: 0.13 }
    ];

    girlBangs.forEach((b, i) => {
      const bGeo = new THREE.ConeGeometry(0.034 * scale, b.len * scale, 8);
      const bang = new THREE.Mesh(bGeo, i === 1 || i === 2 ? hairHighlightMat : hairMat);
      bang.position.set(b.x * scale, b.y * scale, b.z * scale);
      bang.rotation.x = Math.PI * 0.72;
      bang.rotation.z = b.rz;
      hairGroup.add(bang);
    });

    // 3. Twin Delicate Cheek-Framing Wavy Tendrils
    [-0.14, 0.14].forEach((x) => {
      const tendrilGeo = new THREE.CylinderGeometry(0.016 * scale, 0.008 * scale, 0.28 * scale, 8);
      const tendril = new THREE.Mesh(tendrilGeo, hairMat);
      tendril.position.set(x * scale, 0.09 * scale, 0.10 * scale);
      tendril.rotation.z = (x > 0 ? -0.18 : 0.18);
      tendril.rotation.x = 0.1;
      hairGroup.add(tendril);
    });

    // 4. Vibrant Hot-Pink Scrunchie Cinched at High Ponytail Base!
    const ponyRoot = new THREE.Group();
    ponyRoot.position.set(0, 0.31 * scale, -0.08 * scale);
    hairGroup.add(ponyRoot);

    const scrunchieGeo = new THREE.TorusGeometry(0.048 * scale, 0.018 * scale, 12, 24);
    const scrunchieMesh = new THREE.Mesh(scrunchieGeo, scrunchieMat);
    scrunchieMesh.rotation.x = Math.PI * 0.35;
    ponyRoot.add(scrunchieMesh);

    // 5. High Bouncy Ponytail Plume (Sweeping upward & cascading back)
    const ponyMainGeo = new THREE.ConeGeometry(0.11 * scale, 0.36 * scale, 14);
    const ponyMain = new THREE.Mesh(ponyMainGeo, hairMat);
    ponyMain.position.set(0, 0.06 * scale, -0.16 * scale);
    ponyMain.rotation.x = -Math.PI * 0.65;
    ponyRoot.add(ponyMain);

    // Cascading Lower Ponytail Curl
    const ponyCurlGeo = new THREE.ConeGeometry(0.085 * scale, 0.32 * scale, 12);
    const ponyCurl = new THREE.Mesh(ponyCurlGeo, hairHighlightMat);
    ponyCurl.position.set(0, -0.18 * scale, -0.28 * scale);
    ponyCurl.rotation.x = -Math.PI * 0.45;
    ponyRoot.add(ponyCurl);
  }

  // Glasses Mesh (Cleanly isolated in a toggle group; HIDDEN by default!)
  const glassesGroup = new THREE.Group();
  glassesGroup.visible = !!customization.accessories.glasses;
  head.add(glassesGroup);

  const frameGeo = new THREE.TorusGeometry(0.042 * scale, 0.006 * scale, 8, 16);
  const frameMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.8 });
  materials.push(frameMat);

  const leftLens = new THREE.Mesh(frameGeo, frameMat);
  leftLens.position.set(-0.068 * scale, 0.155 * scale, 0.192 * scale);
  glassesGroup.add(leftLens);

  const rightLens = new THREE.Mesh(frameGeo, frameMat);
  rightLens.position.set(0.068 * scale, 0.155 * scale, 0.192 * scale);
  glassesGroup.add(rightLens);

  const bridgeGeo = new THREE.BoxGeometry(0.04 * scale, 0.007 * scale, 0.007 * scale);
  const bridge = new THREE.Mesh(bridgeGeo, frameMat);
  bridge.position.set(0, 0.155 * scale, 0.195 * scale);
  glassesGroup.add(bridge);

  // --- Limbs & Articulation ---

  const armRadius = 0.058 * scale;
  const armLen = 0.25 * scale;
  const chestHalfWidth = 0.22 * scale;

  // Left Arm (Sleeve)
  const leftArm = new THREE.Group();
  leftArm.position.set(-chestHalfWidth - armRadius * 0.85, 0.36 * scale, 0);
  torso.add(leftArm);

  const leftShoulderMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.08, 12, 12), hoodieMat);
  leftArm.add(leftShoulderMesh);

  const leftBicepMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius * 0.92, armLen, 12), hoodieMat);
  leftBicepMesh.position.y = -armLen * 0.5;
  leftBicepMesh.castShadow = true;
  leftArm.add(leftBicepMesh);

  const leftForearm = new THREE.Group();
  leftForearm.position.y = -armLen;
  leftArm.add(leftForearm);

  const leftForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.92, armRadius * 0.85, armLen, 12), hoodieMat);
  leftForearmMesh.position.y = -armLen * 0.5;
  leftForearmMesh.castShadow = true;
  leftForearm.add(leftForearmMesh);

  // Left Ribbed Hoodie Cuff
  const leftCuff = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.92, armRadius * 0.88, 0.04 * scale, 12), hoodieTrimMat);
  leftCuff.position.y = -armLen + 0.02 * scale;
  leftForearm.add(leftCuff);

  const leftHand = new THREE.Group();
  leftHand.position.y = -armLen;
  leftForearm.add(leftHand);

  const leftHandMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 0.78, 12, 12), skinMat);
  leftHandMesh.scale.set(0.9, 1.2, 0.8);
  leftHandMesh.position.y = -armRadius * 0.6;
  leftHand.add(leftHandMesh);

  // Right Arm (Sleeve)
  const rightArm = new THREE.Group();
  rightArm.position.set(chestHalfWidth + armRadius * 0.85, 0.36 * scale, 0);
  torso.add(rightArm);

  const rightShoulderMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.08, 12, 12), hoodieMat);
  rightArm.add(rightShoulderMesh);

  const rightBicepMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius * 0.92, armLen, 12), hoodieMat);
  rightBicepMesh.position.y = -armLen * 0.5;
  rightBicepMesh.castShadow = true;
  rightArm.add(rightBicepMesh);

  const rightForearm = new THREE.Group();
  rightForearm.position.y = -armLen;
  rightArm.add(rightForearm);

  const rightForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.92, armRadius * 0.85, armLen, 12), hoodieMat);
  rightForearmMesh.position.y = -armLen * 0.5;
  rightForearmMesh.castShadow = true;
  rightForearm.add(rightForearmMesh);

  // Right Ribbed Hoodie Cuff
  const rightCuff = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.92, armRadius * 0.88, 0.04 * scale, 12), hoodieTrimMat);
  rightCuff.position.y = -armLen + 0.02 * scale;
  rightForearm.add(rightCuff);

  const rightHand = new THREE.Group();
  rightHand.position.y = -armLen;
  rightForearm.add(rightHand);

  const rightHandMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 0.78, 12, 12), skinMat);
  rightHandMesh.scale.set(0.9, 1.2, 0.8);
  rightHandMesh.position.y = -armRadius * 0.6;
  rightHand.add(rightHandMesh);

  // --- Legs & Chunky Adventure Sneakers ---

  const legRadius = 0.068 * scale;
  const thighLen = 0.36 * scale;
  const calfLen = 0.36 * scale;
  const hipSpacing = 0.105 * scale;

  // Left Leg
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-hipSpacing, -0.06 * scale, 0);
  hips.add(leftLeg);

  const leftThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 1.05, legRadius * 0.92, thighLen, 12), pantsMat);
  leftThighMesh.position.y = -thighLen * 0.5;
  leftThighMesh.castShadow = true;
  leftLeg.add(leftThighMesh);

  const leftCalf = new THREE.Group();
  leftCalf.position.y = -thighLen;
  leftLeg.add(leftCalf);

  const leftCalfMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.92, legRadius * 0.82, calfLen, 12), pantsMat);
  leftCalfMesh.position.y = -calfLen * 0.5;
  leftCalfMesh.castShadow = true;
  leftCalf.add(leftCalfMesh);

  const leftFoot = new THREE.Group();
  leftFoot.position.y = -calfLen;
  leftCalf.add(leftFoot);

  // Left Chunky Adventure Sneaker
  const leftShoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.13 * scale, 0.11 * scale, 0.24 * scale), sneakerUpperMat);
  leftShoeBody.position.set(0, -0.05 * scale, 0.04 * scale);
  leftShoeBody.castShadow = true;
  leftFoot.add(leftShoeBody);

  const leftShoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.04 * scale, 0.26 * scale), whiteSneakerMat);
  leftShoeSole.position.set(0, -0.095 * scale, 0.04 * scale);
  leftFoot.add(leftShoeSole);

  const leftToeCap = new THREE.Mesh(new THREE.SphereGeometry(0.065 * scale, 10, 10), whiteSneakerMat);
  leftToeCap.scale.set(1.0, 0.7, 0.9);
  leftToeCap.position.set(0, -0.055 * scale, 0.14 * scale);
  leftFoot.add(leftToeCap);

  // Right Leg
  const rightLeg = new THREE.Group();
  rightLeg.position.set(hipSpacing, -0.06 * scale, 0);
  hips.add(rightLeg);

  const rightThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 1.05, legRadius * 0.92, thighLen, 12), pantsMat);
  rightThighMesh.position.y = -thighLen * 0.5;
  rightThighMesh.castShadow = true;
  rightLeg.add(rightThighMesh);

  const rightCalf = new THREE.Group();
  rightCalf.position.y = -thighLen;
  rightLeg.add(rightCalf);

  const rightCalfMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.92, legRadius * 0.82, calfLen, 12), pantsMat);
  rightCalfMesh.position.y = -calfLen * 0.5;
  rightCalfMesh.castShadow = true;
  rightCalf.add(rightCalfMesh);

  const rightFoot = new THREE.Group();
  rightFoot.position.y = -calfLen;
  rightCalf.add(rightFoot);

  // Right Chunky Adventure Sneaker
  const rightShoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.13 * scale, 0.11 * scale, 0.24 * scale), sneakerUpperMat);
  rightShoeBody.position.set(0, -0.05 * scale, 0.04 * scale);
  rightShoeBody.castShadow = true;
  rightFoot.add(rightShoeBody);

  const rightShoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.04 * scale, 0.26 * scale), whiteSneakerMat);
  rightShoeSole.position.set(0, -0.095 * scale, 0.04 * scale);
  rightFoot.add(rightShoeSole);

  const rightToeCap = new THREE.Mesh(new THREE.SphereGeometry(0.065 * scale, 10, 10), whiteSneakerMat);
  rightToeCap.scale.set(1.0, 0.7, 0.9);
  rightToeCap.position.set(0, -0.055 * scale, 0.14 * scale);
  rightFoot.add(rightToeCap);

  // --- Procedural Kinematic Animation Controller ---
  let animTimer = Math.random() * 10;

  const updateAnimation = (state: CharacterAnimationState, delta: number) => {
    animTimer += delta;

    if (state.isDead) {
      hips.position.y = THREE.MathUtils.damp(hips.position.y, 0.2 * scale, 8, delta);
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, Math.PI * 0.45, 10, delta);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -Math.PI * 0.5, 8, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -Math.PI * 0.5, 8, delta);
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0.6, 8, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, -0.6, 8, delta);
      return;
    }

    if (state.isCheering) {
      hips.position.y = (0.92 + Math.abs(Math.sin(animTimer * 6)) * 0.12) * scale;
      leftArm.rotation.x = -Math.PI * 0.8 + Math.sin(animTimer * 8) * 0.25;
      rightArm.rotation.x = -Math.PI * 0.8 - Math.sin(animTimer * 8) * 0.25;
      torso.rotation.y = Math.sin(animTimer * 4) * 0.15;
      return;
    }

    const horizontalSpeed = Math.sqrt(state.velocity.x * state.velocity.x + state.velocity.z * state.velocity.z);
    const isMoving = horizontalSpeed > 0.3;

    if (!state.isGrounded) {
      hips.position.y = 0.92 * scale;
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, -0.4, 10, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0.5, 10, delta);
      leftCalf.rotation.x = THREE.MathUtils.damp(leftCalf.rotation.x, 0.6, 10, delta);
      rightCalf.rotation.x = THREE.MathUtils.damp(rightCalf.rotation.x, 0.2, 10, delta);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.7, 10, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.7, 10, delta);
      torso.rotation.x = 0.15;
    } else if (isMoving) {
      const walkFrequency = 9.5;
      const t = animTimer * walkFrequency;
      const legSwing = Math.sin(t) * 0.65;
      const armSwing = Math.sin(t) * 0.65;

      leftLeg.rotation.x = legSwing;
      rightLeg.rotation.x = -legSwing;

      leftCalf.rotation.x = legSwing < 0 ? Math.abs(Math.sin(t)) * 0.8 : 0.05;
      rightCalf.rotation.x = -legSwing < 0 ? Math.abs(Math.sin(t)) * 0.8 : 0.05;

      leftArm.rotation.x = -armSwing;
      rightArm.rotation.x = armSwing;

      leftForearm.rotation.x = -Math.abs(Math.sin(t)) * 0.35;
      rightForearm.rotation.x = -Math.abs(Math.sin(t)) * 0.35;

      const bounce = Math.abs(Math.sin(t)) * 0.04;
      hips.position.y = (0.92 + bounce) * scale;
      torso.rotation.y = Math.sin(t) * 0.12;
      torso.rotation.x = 0.08;
    } else {
      // Natural Breathing Idle
      const breath = Math.sin(animTimer * 2.2) * 0.015;
      hips.position.y = (0.92 + breath) * scale;
      torso.position.y = (0.08 + breath * 0.5) * scale;

      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0.05, 6, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0.05, 6, delta);
      leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, -0.1, 6, delta);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0.1, 6, delta);
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 6, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 6, delta);
      leftCalf.rotation.x = THREE.MathUtils.damp(leftCalf.rotation.x, 0, 6, delta);
      rightCalf.rotation.x = THREE.MathUtils.damp(rightCalf.rotation.x, 0, 6, delta);
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0, 6, delta);
      torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, 0, 6, delta);

      if (state.lookAtPartnerPos) {
        const dx = state.lookAtPartnerPos.x - root.position.x;
        const targetHeadRotY = THREE.MathUtils.clamp(dx * 0.35, -0.65, 0.65);
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, targetHeadRotY, 6, delta);
      } else {
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, 0, 6, delta);
      }
    }
  };

  const updateCustomization = (cust: CharacterCustomization) => {
    skinMat.color.set(cust.skinTone);
    hairMat.color.set(cust.hairColor);
    hairHighlightMat.color.set(new THREE.Color(cust.hairColor).offsetHSL(0.02, 0.12, 0.12));
    hoodieMat.color.set(cust.clothingPrimaryColor);
    hoodieTrimMat.color.set(new THREE.Color(cust.clothingPrimaryColor).offsetHSL(0, 0.05, -0.08));
    sneakerUpperMat.color.set(cust.clothingPrimaryColor);
    irisMat.color.set(cust.eyeColor);

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
    glassesMesh: glassesGroup as unknown as THREE.Mesh,
    pendantMesh,
    backpackMesh,
    materials,
    updateAnimation,
    updateCustomization
  };
}
