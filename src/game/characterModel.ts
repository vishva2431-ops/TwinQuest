import * as THREE from 'three';
import { CharacterCustomization, CharacterGender } from '../types/game';

/**
 * High-Fidelity Human-Proportioned Character Model for TwinQuest
 * Features Boyfriend (Leo) and Girlfriend (Maya) with detailed anatomical parts,
 * realistic hair, expressive faces, clothing, and procedural kinematics.
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
  const scale = isBoy ? 1.0 : 0.94; // Realistic male/female proportion ratio

  // Base Colors from Customization
  const skinColor = new THREE.Color(customization.skinTone || (isBoy ? '#e0a980' : '#fcd3b8'));
  const hairColor = new THREE.Color(customization.hairColor || (isBoy ? '#3b2518' : '#78350f'));
  const eyeColor = new THREE.Color(customization.eyeColor || (isBoy ? '#2563eb' : '#059669'));
  const jacketColor = new THREE.Color(customization.clothingPrimaryColor || (isBoy ? '#1e3a8a' : '#e11d48'));
  const pantsColor = new THREE.Color(isBoy ? '#1f2937' : '#374151');
  const bootColor = new THREE.Color(isBoy ? '#451a03' : '#1c1917');
  const accentColor = new THREE.Color(customization.clothingSecondaryColor || '#fbbf24');

  // Materials with Realistic PBR Properties
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.65,
    metalness: 0.05
  });
  materials.push(skinMat);

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.5,
    metalness: 0.1
  });
  materials.push(hairMat);

  const jacketMat = new THREE.MeshStandardMaterial({
    color: jacketColor,
    roughness: 0.45,
    metalness: 0.2
  });
  materials.push(jacketMat);

  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.8,
    metalness: 0.05
  });
  materials.push(pantsMat);

  const bootMat = new THREE.MeshStandardMaterial({
    color: bootColor,
    roughness: 0.4,
    metalness: 0.25
  });
  materials.push(bootMat);

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.1,
    metalness: 0.0
  });
  materials.push(eyeWhiteMat);

  const irisMat = new THREE.MeshStandardMaterial({
    color: eyeColor,
    roughness: 0.2,
    metalness: 0.1
  });
  materials.push(irisMat);

  const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });
  materials.push(pupilMat);

  const goldMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.25,
    metalness: 0.85
  });
  materials.push(goldMat);

  // --- Hierarchical Rig Assembly ---

  // Hips (Pelvis) - Center of mass at height ~0.95
  const hips = new THREE.Group();
  hips.position.y = 0.95 * scale;
  root.add(hips);

  const pelvisGeo = new THREE.BoxGeometry(0.32 * scale, 0.18 * scale, 0.22 * scale);
  const pelvisMesh = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Belt with Gold Buckle
  const beltGeo = new THREE.BoxGeometry(0.34 * scale, 0.05 * scale, 0.24 * scale);
  const beltMat = new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.5 });
  materials.push(beltMat);
  const beltMesh = new THREE.Mesh(beltGeo, beltMat);
  beltMesh.position.y = 0.08 * scale;
  hips.add(beltMesh);

  const buckleGeo = new THREE.BoxGeometry(0.08 * scale, 0.06 * scale, 0.25 * scale);
  const buckleMesh = new THREE.Mesh(buckleGeo, goldMat);
  buckleMesh.position.y = 0.08 * scale;
  hips.add(buckleMesh);

  // Torso / Chest (Spine)
  const torso = new THREE.Group();
  torso.position.y = 0.1 * scale;
  hips.add(torso);

  const chestWidth = isBoy ? 0.42 * scale : 0.36 * scale;
  const chestGeo = new THREE.BoxGeometry(chestWidth, 0.44 * scale, 0.25 * scale);
  const chestMesh = new THREE.Mesh(chestGeo, jacketMat);
  chestMesh.position.y = 0.22 * scale;
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  // Shirt / Inner Collar
  const shirtGeo = new THREE.BoxGeometry(chestWidth * 0.4, 0.15 * scale, 0.26 * scale);
  const shirtMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7 });
  materials.push(shirtMat);
  const shirtMesh = new THREE.Mesh(shirtGeo, shirtMat);
  shirtMesh.position.set(0, 0.36 * scale, 0);
  torso.add(shirtMesh);

  // Optional Adventure Backpack for Leo
  let backpackMesh: THREE.Mesh | undefined;
  if (isBoy && customization.accessories.backpack) {
    const packGeo = new THREE.BoxGeometry(0.28 * scale, 0.34 * scale, 0.14 * scale);
    const packMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
    materials.push(packMat);
    backpackMesh = new THREE.Mesh(packGeo, packMat);
    backpackMesh.position.set(0, 0.24 * scale, -0.18 * scale);
    backpackMesh.castShadow = true;
    torso.add(backpackMesh);
  }

  // Romantic Heart Pendant for Maya
  let pendantMesh: THREE.Mesh | undefined;
  if (!isBoy || customization.accessories.pendant) {
    const pendantShape = new THREE.Shape();
    pendantShape.moveTo(0, 0);
    pendantShape.bezierCurveTo(0.04, 0.04, 0.06, 0.08, 0.04, 0.1);
    pendantShape.bezierCurveTo(0.02, 0.12, -0.02, 0.12, -0.04, 0.1);
    pendantShape.bezierCurveTo(-0.06, 0.08, -0.04, 0.04, 0, 0);

    const heartGeo = new THREE.ExtrudeGeometry(pendantShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.005 });
    heartGeo.center();
    const pendantMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', metalness: 0.8, roughness: 0.2 });
    materials.push(pendantMat);
    pendantMesh = new THREE.Mesh(heartGeo, pendantMat);
    pendantMesh.scale.set(0.6 * scale, 0.6 * scale, 0.6 * scale);
    pendantMesh.position.set(0, 0.32 * scale, 0.14 * scale);
    torso.add(pendantMesh);
  }

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.07 * scale, 0.08 * scale, 0.1 * scale, 8);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.y = 0.46 * scale;
  torso.add(neckMesh);

  // Head
  const head = new THREE.Group();
  head.position.y = 0.52 * scale;
  torso.add(head);

  // Head Shape (Sculpted Human Head)
  const headGeo = new THREE.SphereGeometry(0.16 * scale, 16, 16);
  headGeo.scale(0.85, 1.1, 0.95);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.14 * scale;
  headMesh.castShadow = true;
  head.add(headMesh);

  // Nose Bridge
  const noseGeo = new THREE.ConeGeometry(0.025 * scale, 0.06 * scale, 5);
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.rotation.x = -Math.PI / 2.2;
  noseMesh.position.set(0, 0.13 * scale, 0.155 * scale);
  head.add(noseMesh);

  // Left & Right Expressive Eyes
  [-0.055, 0.055].forEach((xOffset) => {
    // Sclera (White)
    const eyeWhiteGeo = new THREE.SphereGeometry(0.032 * scale, 8, 8);
    eyeWhiteGeo.scale(1.0, 0.7, 0.5);
    const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    eyeWhite.position.set(xOffset * scale, 0.15 * scale, 0.13 * scale);
    head.add(eyeWhite);

    // Iris (Color)
    const irisGeo = new THREE.CircleGeometry(0.016 * scale, 8);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(xOffset * scale, 0.15 * scale, 0.146 * scale);
    head.add(iris);

    // Pupil
    const pupilGeo = new THREE.CircleGeometry(0.008 * scale, 8);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(xOffset * scale, 0.15 * scale, 0.148 * scale);
    head.add(pupil);

    // Eyebrow
    const browGeo = new THREE.BoxGeometry(0.045 * scale, 0.012 * scale, 0.02 * scale);
    const browMesh = new THREE.Mesh(browGeo, hairMat);
    browMesh.position.set(xOffset * scale, 0.185 * scale, 0.135 * scale);
    head.add(browMesh);
  });

  // Lips / Smile
  const lipsGeo = new THREE.BoxGeometry(0.055 * scale, 0.012 * scale, 0.02 * scale);
  const lipsMat = new THREE.MeshStandardMaterial({ color: isBoy ? '#c28766' : '#f472b6', roughness: 0.5 });
  materials.push(lipsMat);
  const lipsMesh = new THREE.Mesh(lipsGeo, lipsMat);
  lipsMesh.position.set(0, 0.075 * scale, 0.14 * scale);
  head.add(lipsMesh);

  // Hair Model Assembly
  const hairGroup = new THREE.Group();
  head.add(hairGroup);

  if (isBoy) {
    // Boy Hair: Undercut / Modern Textured Quiff
    const hairBaseGeo = new THREE.SphereGeometry(0.168 * scale, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairBase = new THREE.Mesh(hairBaseGeo, hairMat);
    hairBase.position.y = 0.14 * scale;
    hairGroup.add(hairBase);

    // Swept Quiff Top Volume
    const quiffGeo = new THREE.BoxGeometry(0.18 * scale, 0.08 * scale, 0.22 * scale);
    const quiffMesh = new THREE.Mesh(quiffGeo, hairMat);
    quiffMesh.position.set(0, 0.28 * scale, 0.02 * scale);
    quiffMesh.rotation.x = -0.15;
    quiffMesh.rotation.y = 0.1;
    hairGroup.add(quiffMesh);
  } else {
    // Girl Hair: Flowing Crown + Long Ponytail & Bangs
    const hairBaseGeo = new THREE.SphereGeometry(0.172 * scale, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairBase = new THREE.Mesh(hairBaseGeo, hairMat);
    hairBase.position.y = 0.14 * scale;
    hairGroup.add(hairBase);

    // Face-Framing Soft Bangs
    const bangsGeo = new THREE.BoxGeometry(0.18 * scale, 0.08 * scale, 0.08 * scale);
    const bangs = new THREE.Mesh(bangsGeo, hairMat);
    bangs.position.set(0, 0.25 * scale, 0.13 * scale);
    bangs.rotation.x = 0.2;
    hairGroup.add(bangs);

    // High Ponytail Flowing Back
    const ponyGeo = new THREE.ConeGeometry(0.07 * scale, 0.45 * scale, 8);
    const ponytail = new THREE.Mesh(ponyGeo, hairMat);
    ponytail.position.set(0, 0.16 * scale, -0.22 * scale);
    ponytail.rotation.x = -0.55;
    hairGroup.add(ponytail);
  }

  // Glasses / Specs
  let glassesMesh: THREE.Mesh | undefined;
  if (customization.accessories.glasses) {
    const frameGeo = new THREE.TorusGeometry(0.04 * scale, 0.007 * scale, 6, 12);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.8 });
    materials.push(frameMat);

    const leftLens = new THREE.Mesh(frameGeo, frameMat);
    leftLens.position.set(-0.06 * scale, 0.15 * scale, 0.152 * scale);
    head.add(leftLens);

    const rightLens = new THREE.Mesh(frameGeo, frameMat);
    rightLens.position.set(0.06 * scale, 0.15 * scale, 0.152 * scale);
    head.add(rightLens);

    const bridgeGeo = new THREE.BoxGeometry(0.04 * scale, 0.008 * scale, 0.008 * scale);
    const bridge = new THREE.Mesh(bridgeGeo, frameMat);
    bridge.position.set(0, 0.15 * scale, 0.155 * scale);
    head.add(bridge);
    glassesMesh = bridge;
  }

  // --- Limbs & Articulation ---

  // Arms (Left & Right)
  const armRadius = 0.055 * scale;
  const armLen = 0.26 * scale;

  // Left Arm
  const leftArm = new THREE.Group();
  leftArm.position.set((-chestWidth * 0.5 - armRadius) * 0.95, 0.38 * scale, 0);
  torso.add(leftArm);

  const leftShoulderMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.1, 8, 8), jacketMat);
  leftArm.add(leftShoulderMesh);

  const leftUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armLen, 8), jacketMat);
  leftUpperArmMesh.position.y = -armLen * 0.5;
  leftUpperArmMesh.castShadow = true;
  leftArm.add(leftUpperArmMesh);

  const leftForearm = new THREE.Group();
  leftForearm.position.y = -armLen;
  leftArm.add(leftForearm);

  const leftForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.85, armRadius * 0.8, armLen, 8), jacketMat);
  leftForearmMesh.position.y = -armLen * 0.5;
  leftForearmMesh.castShadow = true;
  leftForearm.add(leftForearmMesh);

  const leftHand = new THREE.Group();
  leftHand.position.y = -armLen;
  leftForearm.add(leftHand);

  const leftHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.09 * scale, 0.04 * scale), skinMat);
  leftHandMesh.position.y = -0.045 * scale;
  leftHand.add(leftHandMesh);

  // Right Arm
  const rightArm = new THREE.Group();
  rightArm.position.set((chestWidth * 0.5 + armRadius) * 0.95, 0.38 * scale, 0);
  torso.add(rightArm);

  const rightShoulderMesh = new THREE.Mesh(new THREE.SphereGeometry(armRadius * 1.1, 8, 8), jacketMat);
  rightArm.add(rightShoulderMesh);

  const rightUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armLen, 8), jacketMat);
  rightUpperArmMesh.position.y = -armLen * 0.5;
  rightUpperArmMesh.castShadow = true;
  rightArm.add(rightUpperArmMesh);

  const rightForearm = new THREE.Group();
  rightForearm.position.y = -armLen;
  rightArm.add(rightForearm);

  const rightForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(armRadius * 0.85, armRadius * 0.8, armLen, 8), jacketMat);
  rightForearmMesh.position.y = -armLen * 0.5;
  rightForearmMesh.castShadow = true;
  rightForearm.add(rightForearmMesh);

  const rightHand = new THREE.Group();
  rightHand.position.y = -armLen;
  rightForearm.add(rightHand);

  const rightHandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.09 * scale, 0.04 * scale), skinMat);
  rightHandMesh.position.y = -0.045 * scale;
  rightHand.add(rightHandMesh);

  // Legs (Left & Right)
  const legRadius = 0.075 * scale;
  const thighLen = 0.38 * scale;
  const calfLen = 0.38 * scale;
  const hipSpacing = 0.11 * scale;

  // Left Leg
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-hipSpacing, -0.05 * scale, 0);
  hips.add(leftLeg);

  const leftThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius, legRadius * 0.9, thighLen, 8), pantsMat);
  leftThighMesh.position.y = -thighLen * 0.5;
  leftThighMesh.castShadow = true;
  leftLeg.add(leftThighMesh);

  const leftCalf = new THREE.Group();
  leftCalf.position.y = -thighLen;
  leftLeg.add(leftCalf);

  const leftCalfMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.88, legRadius * 0.8, calfLen, 8), pantsMat);
  leftCalfMesh.position.y = -calfLen * 0.5;
  leftCalfMesh.castShadow = true;
  leftCalf.add(leftCalfMesh);

  const leftFoot = new THREE.Group();
  leftFoot.position.y = -calfLen;
  leftCalf.add(leftFoot);

  const leftBootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 0.24 * scale), bootMat);
  leftBootMesh.position.set(0, -0.06 * scale, 0.04 * scale);
  leftBootMesh.castShadow = true;
  leftFoot.add(leftBootMesh);

  // Right Leg
  const rightLeg = new THREE.Group();
  rightLeg.position.set(hipSpacing, -0.05 * scale, 0);
  hips.add(rightLeg);

  const rightThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius, legRadius * 0.9, thighLen, 8), pantsMat);
  rightThighMesh.position.y = -thighLen * 0.5;
  rightThighMesh.castShadow = true;
  rightLeg.add(rightThighMesh);

  const rightCalf = new THREE.Group();
  rightCalf.position.y = -thighLen;
  rightLeg.add(rightCalf);

  const rightCalfMesh = new THREE.Mesh(new THREE.CylinderGeometry(legRadius * 0.88, legRadius * 0.8, calfLen, 8), pantsMat);
  rightCalfMesh.position.y = -calfLen * 0.5;
  rightCalfMesh.castShadow = true;
  rightCalf.add(rightCalfMesh);

  const rightFoot = new THREE.Group();
  rightFoot.position.y = -calfLen;
  rightCalf.add(rightFoot);

  const rightBootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 0.24 * scale), bootMat);
  rightBootMesh.position.set(0, -0.06 * scale, 0.04 * scale);
  rightBootMesh.castShadow = true;
  rightFoot.add(rightBootMesh);

  // --- Procedural Kinematic Animation Controller ---
  let animTimer = Math.random() * 10;

  const updateAnimation = (state: CharacterAnimationState, delta: number) => {
    animTimer += delta;

    if (state.isDead) {
      // Comedic Level Devil tumble / collapse
      hips.position.y = THREE.MathUtils.damp(hips.position.y, 0.2 * scale, 8, delta);
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, Math.PI * 0.45, 10, delta);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -Math.PI * 0.5, 8, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -Math.PI * 0.5, 8, delta);
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0.6, 8, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, -0.6, 8, delta);
      return;
    }

    if (state.isCheering) {
      // Victorious dual-arm wave & bounce
      hips.position.y = (0.95 + Math.abs(Math.sin(animTimer * 6)) * 0.12) * scale;
      leftArm.rotation.x = -Math.PI * 0.8 + Math.sin(animTimer * 8) * 0.25;
      rightArm.rotation.x = -Math.PI * 0.8 - Math.sin(animTimer * 8) * 0.25;
      torso.rotation.y = Math.sin(animTimer * 4) * 0.15;
      return;
    }

    const horizontalSpeed = Math.sqrt(state.velocity.x * state.velocity.x + state.velocity.z * state.velocity.z);
    const isMoving = horizontalSpeed > 0.3;

    if (!state.isGrounded) {
      // Airborne / Jumping Kinematics
      hips.position.y = 0.95 * scale;
      const jumpProgress = state.velocity.y > 0 ? 1 : -1;

      // Arms swing up for aerodynamic balance
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.8 * jumpProgress, 12, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.8 * jumpProgress, 12, delta);
      leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, -0.3, 10, delta);
      rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, 0.3, 10, delta);

      // Legs tuck upward slightly
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, -0.4, 12, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0.3, 12, delta);
      leftCalf.rotation.x = THREE.MathUtils.damp(leftCalf.rotation.x, 0.6, 12, delta);
      rightCalf.rotation.x = THREE.MathUtils.damp(rightCalf.rotation.x, 0.5, 12, delta);

      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, jumpProgress * 0.1, 10, delta);
    } else if (isMoving) {
      // Running / Walking cycle
      const walkFreq = Math.min(14, 6 + horizontalSpeed * 1.2);
      const strideAngle = Math.min(0.85, 0.3 + horizontalSpeed * 0.08);

      const legSwing = Math.sin(animTimer * walkFreq);
      const armSwing = Math.cos(animTimer * walkFreq);

      // Opposite arm and leg swing
      leftLeg.rotation.x = legSwing * strideAngle;
      rightLeg.rotation.x = -legSwing * strideAngle;

      // Natural knee bend on trailing leg
      leftCalf.rotation.x = legSwing < 0 ? Math.abs(legSwing) * 0.8 : 0.05;
      rightCalf.rotation.x = legSwing > 0 ? Math.abs(legSwing) * 0.8 : 0.05;

      leftArm.rotation.x = -legSwing * (strideAngle * 0.9);
      rightArm.rotation.x = legSwing * (strideAngle * 0.9);
      leftForearm.rotation.x = -0.4 - Math.abs(legSwing) * 0.3;
      rightForearm.rotation.x = -0.4 - Math.abs(legSwing) * 0.3;

      // Subtle pelvis and torso bounce
      hips.position.y = (0.95 - Math.abs(Math.sin(animTimer * walkFreq)) * 0.06) * scale;
      torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, legSwing * 0.08, 10, delta);
      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0.15, 8, delta); // forward lean

      // Hair bounce
      hairGroup.rotation.x = THREE.MathUtils.damp(hairGroup.rotation.x, -0.15 + Math.sin(animTimer * walkFreq * 2) * 0.08, 8, delta);
    } else {
      // Idle Breathing & Natural Posture
      hips.position.y = THREE.MathUtils.damp(hips.position.y, (0.95 + Math.sin(animTimer * 2) * 0.015) * scale, 6, delta);

      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 8, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 8, delta);
      leftCalf.rotation.x = THREE.MathUtils.damp(leftCalf.rotation.x, 0, 8, delta);
      rightCalf.rotation.x = THREE.MathUtils.damp(rightCalf.rotation.x, 0, 8, delta);

      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, Math.sin(animTimer * 2) * 0.04, 6, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -Math.sin(animTimer * 2) * 0.04, 6, delta);
      leftForearm.rotation.x = THREE.MathUtils.damp(leftForearm.rotation.x, -0.15, 6, delta);
      rightForearm.rotation.x = THREE.MathUtils.damp(rightForearm.rotation.x, -0.15, 6, delta);

      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, 0, 8, delta);
      torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, Math.sin(animTimer * 1.2) * 0.04, 6, delta);

      // Romantic glance toward partner if nearby
      if (state.lookAtPartnerPos) {
        const dx = state.lookAtPartnerPos.x - root.position.x;
        const dz = state.lookAtPartnerPos.z - root.position.z;
        const angle = Math.atan2(dx, dz) - root.rotation.y;
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, Math.max(-0.6, Math.min(0.6, angle)), 6, delta);
      } else {
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, 0, 6, delta);
      }
    }
  };

  const updateCustomization = (cust: CharacterCustomization) => {
    skinMat.color.set(cust.skinTone);
    hairMat.color.set(cust.hairColor);
    jacketMat.color.set(cust.clothingPrimaryColor);
    irisMat.color.set(cust.eyeColor);
    goldMat.color.set(cust.clothingSecondaryColor);

    if (glassesMesh) {
      glassesMesh.visible = !!cust.accessories.glasses;
    }
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
    glassesMesh,
    pendantMesh,
    backpackMesh,
    materials,
    updateAnimation,
    updateCustomization
  };
}
