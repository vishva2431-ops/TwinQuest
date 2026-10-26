import * as THREE from 'three';
import { TrapConfig, PlatformConfig, CollectibleConfig, CheckpointConfig } from '../types/game';
import { sound } from '../services/sound';

export interface ActiveTrapInstance {
  config: TrapConfig;
  mesh: THREE.Object3D;
  initialPos: THREE.Vector3;
  state: 'idle' | 'triggered' | 'active' | 'cooldown' | 'disappeared';
  timer: number;
}

export interface ActivePlatformInstance {
  config: PlatformConfig;
  mesh: THREE.Mesh;
  initialPos: THREE.Vector3;
}

export interface ActiveCollectibleInstance {
  config: CollectibleConfig;
  group: THREE.Group;
  initialPos: THREE.Vector3;
}

export interface ActiveCheckpointInstance {
  config: CheckpointConfig;
  group: THREE.Group;
  crystalMesh: THREE.Mesh;
  pylonMesh: THREE.Mesh;
  light: THREE.PointLight;
}

export class TrapManager {
  public traps: ActiveTrapInstance[] = [];
  public movingPlatforms: ActivePlatformInstance[] = [];
  public collectibles: ActiveCollectibleInstance[] = [];
  public checkpoints: ActiveCheckpointInstance[] = [];
  public parentScene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.parentScene = scene;
  }

  public clear() {
    this.traps.forEach((t) => this.parentScene.remove(t.mesh));
    this.movingPlatforms.forEach((p) => this.parentScene.remove(p.mesh));
    this.collectibles.forEach((c) => this.parentScene.remove(c.group));
    this.checkpoints.forEach((cp) => this.parentScene.remove(cp.group));

    this.traps = [];
    this.movingPlatforms = [];
    this.collectibles = [];
    this.checkpoints = [];
  }

  public buildLevelObjects(
    platforms: PlatformConfig[],
    trapConfigs: TrapConfig[],
    collectibleConfigs: CollectibleConfig[],
    checkpointConfigs: CheckpointConfig[],
    groundColor: string,
    accentColor: string
  ) {
    this.clear();

    // 1. Build Moving Platforms (Magical Floating Rune Slabs)
    platforms.forEach((p) => {
      if (p.isMoving) {
        const [w, h, d] = p.size;
        const group = new THREE.Group();
        group.position.set(p.position[0], p.position[1], p.position[2]);

        // Main Rune Stone Slab
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
          color: '#334155',
          roughness: 0.4,
          metalness: 0.3
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Top Magic Grass / Rune Inlay
        const topInlayGeo = new THREE.BoxGeometry(w * 0.9, 0.04, d * 0.9);
        const topInlayMat = new THREE.MeshStandardMaterial({
          color: '#22c55e',
          roughness: 0.6
        });
        const topInlay = new THREE.Mesh(topInlayGeo, topInlayMat);
        topInlay.position.y = h * 0.5 + 0.02;
        group.add(topInlay);

        // Glowing Magical Perimeter Neon Trim
        const trimGeo = new THREE.BoxGeometry(w + 0.06, 0.08, d + 0.06);
        const trimMat = new THREE.MeshStandardMaterial({
          color: p.color || '#38bdf8',
          emissive: p.color || '#38bdf8',
          emissiveIntensity: 0.8,
          roughness: 0.2
        });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        group.add(trim);

        // Underside Levitation Crystal
        const crystalGeo = new THREE.OctahedronGeometry(Math.min(w, d) * 0.25, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: '#c084fc',
          emissive: '#9333ea',
          emissiveIntensity: 0.9,
          roughness: 0.1,
          metalness: 0.8
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = -h * 0.5 - 0.25;
        group.add(crystal);

        this.parentScene.add(group);

        this.movingPlatforms.push({
          config: p,
          mesh: group as unknown as THREE.Mesh,
          initialPos: group.position.clone()
        });
      }
    });

    // 2. Build Surprise Traps
    trapConfigs.forEach((t) => {
      const pos = new THREE.Vector3(...t.position);

      if (t.type === 'collapsing_floor') {
        const size = t.size || [1.8, 0.2, 1.8];
        const geo = new THREE.BoxGeometry(...size);
        const mat = new THREE.MeshStandardMaterial({
          color: '#fb7185',
          roughness: 0.6,
          metalness: 0.2
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.parentScene.add(mesh);

        this.traps.push({
          config: t,
          mesh,
          initialPos: pos.clone(),
          state: 'idle',
          timer: 0
        });
      } else if (t.type === 'hidden_spikes') {
        // Spikes group (hidden below floor initially)
        const group = new THREE.Group();
        group.position.copy(pos);
        group.position.y -= 0.6; // hidden

        // 3x3 spike grid
        for (let sx = -0.4; sx <= 0.4; sx += 0.4) {
          for (let sz = -0.4; sz <= 0.4; sz += 0.4) {
            const spikeGeo = new THREE.ConeGeometry(0.08, 0.7, 5);
            const spikeMat = new THREE.MeshStandardMaterial({
              color: '#475569',
              roughness: 0.2,
              metalness: 0.9
            });
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(sx, 0.35, sz);
            spike.castShadow = true;
            group.add(spike);
          }
        }
        this.parentScene.add(group);

        this.traps.push({
          config: t,
          mesh: group,
          initialPos: pos.clone(),
          state: 'idle',
          timer: 0
        });
      } else if (t.type === 'fake_platform') {
        const size = t.size || [2.5, 0.6, 2.5];
        const geo = new THREE.BoxGeometry(...size);
        const mat = new THREE.MeshStandardMaterial({
          color: groundColor,
          roughness: 0.5,
          metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.parentScene.add(mesh);

        this.traps.push({
          config: t,
          mesh,
          initialPos: pos.clone(),
          state: 'idle',
          timer: 0
        });
      } else if (t.type === 'swinging_blade') {
        const group = new THREE.Group();
        group.position.copy(pos);

        // Chain/Arm
        const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6);
        const metalMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.9, roughness: 0.3 });
        const rod = new THREE.Mesh(rodGeo, metalMat);
        rod.position.y = -1.25;
        group.add(rod);

        // Crescent blade at bottom
        const bladeGeo = new THREE.TorusGeometry(0.6, 0.08, 6, 16, Math.PI);
        const bladeMat = new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.85, roughness: 0.2 });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotation.x = Math.PI / 2;
        blade.position.y = -2.5;
        blade.castShadow = true;
        group.add(blade);

        this.parentScene.add(group);

        this.traps.push({
          config: t,
          mesh: group,
          initialPos: pos.clone(),
          state: 'idle',
          timer: 0
        });
      } else if (t.type === 'pressure_plate') {
        const size = t.size || [1.2, 0.12, 1.2];
        const geo = new THREE.BoxGeometry(...size);
        const mat = new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          roughness: 0.3,
          metalness: 0.7
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.receiveShadow = true;
        this.parentScene.add(mesh);

        this.traps.push({
          config: t,
          mesh,
          initialPos: pos.clone(),
          state: 'idle',
          timer: 0
        });
      } else if (t.type === 'timed_door') {
        const size = t.size || [1.2, 2.5, 0.4];
        const geo = new THREE.BoxGeometry(...size);
        const mat = new THREE.MeshStandardMaterial({
          color: '#475569',
          roughness: 0.4,
          metalness: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.castShadow = true;
        this.parentScene.add(mesh);

        this.traps.push({
          config: t,
          mesh,
          initialPos: pos.clone(),
          state: 'idle',
          timer: 0
        });
      } else if (t.type === 'false_goal') {
        // Deceptive imposter gate
        const group = new THREE.Group();
        group.position.copy(pos);

        const archGeo = new THREE.TorusGeometry(0.9, 0.1, 8, 16, Math.PI);
        const archMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.7, roughness: 0.3 });
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.y = 0.9;
        group.add(arch);

        this.parentScene.add(group);

        this.traps.push({
          config: t,
          mesh: group,
          initialPos: pos.clone(),
          state: 'idle',
          timer: 0
        });
      }
    });

    // 3. Build Collectibles (Hearts & Crystals)
    collectibleConfigs.forEach((c) => {
      const pos = new THREE.Vector3(...c.position);
      const group = new THREE.Group();
      group.position.copy(pos);

      if (c.type === 'heart') {
        const heartShape = new THREE.Shape();
        heartShape.moveTo(0, 0);
        heartShape.bezierCurveTo(0.18, 0.18, 0.3, 0.38, 0.18, 0.5);
        heartShape.bezierCurveTo(0.08, 0.6, -0.08, 0.6, -0.18, 0.5);
        heartShape.bezierCurveTo(-0.3, 0.38, -0.18, 0.18, 0, 0);

        const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03 });
        heartGeo.center();
        const heartMat = new THREE.MeshStandardMaterial({
          color: '#f43f5e',
          roughness: 0.15,
          metalness: 0.4,
          emissive: '#e11d48',
          emissiveIntensity: 0.6
        });
        const heartMesh = new THREE.Mesh(heartGeo, heartMat);
        heartMesh.scale.set(1.4, 1.4, 1.4);
        group.add(heartMesh);

        // Swirling Golden Halo Ring
        const ringGeo = new THREE.TorusGeometry(0.58, 0.024, 8, 24);
        const ringMat = new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          emissive: '#f59e0b',
          emissiveIntensity: 0.9,
          metalness: 0.85,
          roughness: 0.2
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI * 0.4;
        group.add(ring);
      } else {
        // Gem / Diamond octahedron
        const gemGeo = new THREE.OctahedronGeometry(0.3, 0);
        const gemMat = new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          roughness: 0.1,
          metalness: 0.7,
          emissive: '#0284c7',
          emissiveIntensity: 0.5
        });
        const gemMesh = new THREE.Mesh(gemGeo, gemMat);
        group.add(gemMesh);
      }

      this.parentScene.add(group);
      this.collectibles.push({
        config: c,
        group,
        initialPos: pos.clone()
      });
    });

    // 4. Build Checkpoints
    checkpointConfigs.forEach((cp) => {
      const pos = new THREE.Vector3(...cp.position);
      const group = new THREE.Group();
      group.position.copy(pos);

      // Stone Pylon Base
      const pylonGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.4, 6);
      const pylonMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.7 });
      const pylonMesh = new THREE.Mesh(pylonGeo, pylonMat);
      pylonMesh.position.y = 0.7;
      pylonMesh.castShadow = true;
      group.add(pylonMesh);

      // Floating Crystal on top
      const crystalGeo = new THREE.OctahedronGeometry(0.22, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        emissive: '#334155',
        emissiveIntensity: 0.2,
        roughness: 0.1,
        metalness: 0.8
      });
      const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
      crystalMesh.position.y = 1.7;
      group.add(crystalMesh);

      const light = new THREE.PointLight('#38bdf8', 0, 5);
      light.position.y = 1.8;
      group.add(light);

      this.parentScene.add(group);
      this.checkpoints.push({
        config: cp,
        group,
        crystalMesh,
        pylonMesh,
        light
      });
    });
  }

  public update(
    delta: number,
    time: number,
    p1Pos: THREE.Vector3,
    p2Pos: THREE.Vector3,
    onPlayerHitTrap: (trapType: string) => void,
    onCollectItem?: (collector: 'boy' | 'girl' | 'both', itemType: string) => void,
    onCheckpoint?: (activator: 'boy' | 'girl' | 'both') => void
  ) {
    // 1. Update Moving Platforms
    this.movingPlatforms.forEach((p) => {
      if (p.config.moveRange && p.config.moveSpeed) {
        const sinVal = Math.sin(time * p.config.moveSpeed);
        p.mesh.position.x = p.initialPos.x + p.config.moveRange[0] * sinVal;
        p.mesh.position.y = p.initialPos.y + p.config.moveRange[1] * sinVal;
        p.mesh.position.z = p.initialPos.z + p.config.moveRange[2] * sinVal;
      }
    });

    // 2. Animate Collectibles (Float & Spin)
    this.collectibles.forEach((c) => {
      if (!c.config.collected) {
        c.group.rotation.y += delta * 2.5;
        c.group.position.y = c.initialPos.y + Math.sin(time * 3 + c.initialPos.x) * 0.15;

        // Player Collection Detection (proximity check)
        const d1 = p1Pos.distanceTo(c.group.position);
        const d2 = p2Pos.distanceTo(c.group.position);

        if (d1 < 1.1 || d2 < 1.1) {
          c.config.collected = true;
          c.group.visible = false;
          if (c.config.type === 'heart') {
            sound.playHeartCollect();
          } else {
            sound.playGemCollect();
          }
          const collector = d1 < 1.1 && d2 < 1.1 ? 'both' : d1 < 1.1 ? 'boy' : 'girl';
          onCollectItem?.(collector, c.config.type);
        }
      }
    });

    // 3. Animate Checkpoints
    this.checkpoints.forEach((cp) => {
      cp.crystalMesh.rotation.y += delta * 1.5;
      cp.crystalMesh.position.y = 1.7 + Math.sin(time * 2) * 0.08;

      if (!cp.config.activated) {
        const d1 = p1Pos.distanceTo(cp.group.position);
        const d2 = p2Pos.distanceTo(cp.group.position);

        if (d1 < 1.5 || d2 < 1.5) {
          cp.config.activated = true;
          (cp.crystalMesh.material as THREE.MeshStandardMaterial).color.set('#38bdf8');
          (cp.crystalMesh.material as THREE.MeshStandardMaterial).emissive.set('#38bdf8');
          (cp.crystalMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
          cp.light.intensity = 2.0;
          sound.playCheckpoint();
          const activator = d1 < 1.5 && d2 < 1.5 ? 'both' : d1 < 1.5 ? 'boy' : 'girl';
          onCheckpoint?.(activator);
        }
      }
    });

    // 4. Update Traps with Level Devil Surprise Logic
    this.traps.forEach((trap) => {
      const type = trap.config.type;

      if (type === 'collapsing_floor') {
        const p1Dist = p1Pos.distanceTo(trap.mesh.position);
        const p2Dist = p2Pos.distanceTo(trap.mesh.position);
        const onPlate = (p1Dist < 1.3 && Math.abs(p1Pos.y - trap.mesh.position.y) < 0.8) ||
                        (p2Dist < 1.3 && Math.abs(p2Pos.y - trap.mesh.position.y) < 0.8);

        if (trap.state === 'idle') {
          if (onPlate) {
            trap.state = 'triggered';
            trap.timer = trap.config.delay || 0.45;
            sound.playTrapCrumble();
            (trap.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: '#dc2626' });
          }
        } else if (trap.state === 'triggered') {
          trap.timer -= delta;
          // Shake effect
          trap.mesh.position.x = trap.initialPos.x + (Math.random() - 0.5) * 0.08;
          trap.mesh.position.z = trap.initialPos.z + (Math.random() - 0.5) * 0.08;

          if (trap.timer <= 0) {
            trap.state = 'active';
            trap.timer = 3.0; // Stay collapsed for 3 seconds before resetting
          }
        } else if (trap.state === 'active') {
          // Plunge down into void!
          trap.mesh.position.y -= delta * 14;

          if (onPlate && trap.mesh.position.y < trap.initialPos.y - 0.4) {
            onPlayerHitTrap('collapsing_floor');
          }

          trap.timer -= delta;
          if (trap.timer <= 0) {
            // Reset floor for fairness
            trap.mesh.position.copy(trap.initialPos);
            trap.state = 'idle';
            (trap.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: '#fb7185' });
          }
        }
      } else if (type === 'hidden_spikes') {
        const range = trap.config.range || 2.2;
        const d1 = p1Pos.distanceTo(trap.initialPos);
        const d2 = p2Pos.distanceTo(trap.initialPos);
        const inRange = d1 < range || d2 < range;

        if (trap.state === 'idle') {
          if (inRange) {
            trap.state = 'triggered';
            trap.timer = 0.12; // Snap up quickly!
            sound.playTrapSpike();
          }
        } else if (trap.state === 'triggered') {
          trap.timer -= delta;
          // Shoot upward
          trap.mesh.position.y = THREE.MathUtils.damp(trap.mesh.position.y, trap.initialPos.y + 0.1, 24, delta);

          if (d1 < 1.0 || d2 < 1.0) {
            onPlayerHitTrap('hidden_spikes');
          }

          if (trap.timer <= 0) {
            trap.state = 'active';
            trap.timer = 1.8;
          }
        } else if (trap.state === 'active') {
          if (d1 < 0.95 || d2 < 0.95) {
            onPlayerHitTrap('hidden_spikes');
          }

          trap.timer -= delta;
          if (trap.timer <= 0) {
            // Retract spikes
            trap.mesh.position.y = THREE.MathUtils.damp(trap.mesh.position.y, trap.initialPos.y - 0.6, 6, delta);
            if (trap.mesh.position.y <= trap.initialPos.y - 0.55) {
              trap.state = 'idle';
            }
          }
        }
      } else if (type === 'fake_platform') {
        const p1Dist = p1Pos.distanceTo(trap.mesh.position);
        const p2Dist = p2Pos.distanceTo(trap.mesh.position);
        const touched = (p1Dist < 1.5 && Math.abs(p1Pos.y - trap.mesh.position.y) < 0.6) ||
                        (p2Dist < 1.5 && Math.abs(p2Pos.y - trap.mesh.position.y) < 0.6);

        if (trap.state === 'idle') {
          if (touched) {
            trap.state = 'triggered';
            trap.timer = 0.15;
            sound.playTrapCrumble();
          }
        } else if (trap.state === 'triggered') {
          trap.timer -= delta;
          trap.mesh.scale.multiplyScalar(0.85);

          if (trap.timer <= 0) {
            trap.state = 'disappeared';
            trap.mesh.visible = false;
            trap.timer = 4.0;
            onPlayerHitTrap('fake_platform');
          }
        } else if (trap.state === 'disappeared') {
          trap.timer -= delta;
          if (trap.timer <= 0) {
            trap.state = 'idle';
            trap.mesh.visible = true;
            trap.mesh.scale.set(1, 1, 1);
          }
        }
      } else if (type === 'swinging_blade') {
        const speed = trap.config.speed || 1.8;
        const angle = Math.sin(time * speed) * (Math.PI * 0.42);
        trap.mesh.rotation.z = angle;

        // Check if blade position intersects player
        const bladeBottomWorld = new THREE.Vector3(0, -2.5, 0).applyMatrix4(trap.mesh.matrixWorld);
        const d1 = p1Pos.distanceTo(bladeBottomWorld);
        const d2 = p2Pos.distanceTo(bladeBottomWorld);

        if (d1 < 1.1 || d2 < 1.1) {
          onPlayerHitTrap('swinging_blade');
        }
      } else if (type === 'pressure_plate') {
        const d1 = p1Pos.distanceTo(trap.mesh.position);
        const d2 = p2Pos.distanceTo(trap.mesh.position);
        const isPressed = (d1 < 1.0 && Math.abs(p1Pos.y - trap.mesh.position.y) < 0.5) ||
                          (d2 < 1.0 && Math.abs(p2Pos.y - trap.mesh.position.y) < 0.5);

        if (isPressed) {
          trap.mesh.position.y = THREE.MathUtils.damp(trap.mesh.position.y, trap.initialPos.y - 0.08, 12, delta);
          if (trap.state !== 'active') {
            trap.state = 'active';
            sound.playPressurePlate();
          }

          // Open linked door
          if (trap.config.linkedId) {
            const linkedDoor = this.traps.find((t) => t.config.id === trap.config.linkedId);
            if (linkedDoor) {
              linkedDoor.mesh.position.y = THREE.MathUtils.damp(linkedDoor.mesh.position.y, linkedDoor.initialPos.y + 3.2, 8, delta);
            }
          }
        } else {
          trap.mesh.position.y = THREE.MathUtils.damp(trap.mesh.position.y, trap.initialPos.y, 8, delta);
          trap.state = 'idle';

          // Close linked door if not held down
          if (trap.config.linkedId) {
            const linkedDoor = this.traps.find((t) => t.config.id === trap.config.linkedId);
            if (linkedDoor) {
              linkedDoor.mesh.position.y = THREE.MathUtils.damp(linkedDoor.mesh.position.y, linkedDoor.initialPos.y, 8, delta);
            }
          }
        }
      } else if (type === 'false_goal') {
        // Teleports away if only 1 player reaches it!
        const d1 = p1Pos.distanceTo(trap.mesh.position);
        const d2 = p2Pos.distanceTo(trap.mesh.position);
        const onePlayerClose = (d1 < 2.0 && d2 > 5.0) || (d2 < 2.0 && d1 > 5.0);

        if (onePlayerClose && trap.state === 'idle') {
          trap.state = 'triggered';
          sound.playTrapSpike();
          // Jumps backwards to surprise player!
          trap.mesh.position.z -= 4.0;
        }
      }
    });
  }
}
