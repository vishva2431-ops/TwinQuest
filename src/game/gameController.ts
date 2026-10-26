import * as THREE from 'three';
import { CharacterRig, CharacterAnimationState } from './characterModel';
import { LevelDefinition, GameSettings, CharacterGender, GameEventPayload, PlayerNetState } from '../types/game';
import { TrapManager } from './trapSystem';
import { sound } from '../services/sound';

export interface PlayerPhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationY: number;
  isGrounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  isDead: boolean;
  respawnTimer: number;
  lastCheckpointPos: THREE.Vector3;
}

export interface InputState {
  p1Forward: boolean;
  p1Backward: boolean;
  p1Left: boolean;
  p1Right: boolean;
  p1Jump: boolean;
  p2Forward: boolean;
  p2Backward: boolean;
  p2Left: boolean;
  p2Right: boolean;
  p2Jump: boolean;
}

export class GameController {
  public boyRig: CharacterRig;
  public girlRig: CharacterRig;
  public trapManager: TrapManager;
  public level: LevelDefinition;
  public settings: GameSettings;

  public boyState: PlayerPhysicsState;
  public girlState: PlayerPhysicsState;

  public activeControlMode: 'single_switch' | 'local_coop' | 'online_room' = 'single_switch';
  public singleActivePlayer: 'boy' | 'girl' = 'boy';
  public isSinglePlayer: boolean = false;
  public singlePlayerCharacter: 'boy' | 'girl' = 'boy';

  // --- Online co-op ---
  /** Character this client controls when activeControlMode === 'online_room' */
  public localCharacter: CharacterGender | null = null;
  /** Guest clients never decide deaths/victory; they follow the host's game events */
  public isOnlineGuest: boolean = false;
  /** Host emits authoritative events (death/respawn/victory) through this hook */
  public onGameEvent: ((event: GameEventPayload) => void) | null = null;
  private remoteTargets: Partial<Record<CharacterGender, {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotationY: number;
    isGrounded: boolean;
    timestamp: number;
  }>> = {};

  public gameTime: number = 0;
  public levelTimer: number = 0;
  public isVictory: boolean = false;
  public isPaused: boolean = false;

  private gravity: number = 24.0;
  private moveSpeed: number = 7.5;
  private jumpForce: number = 10.2;
  private airAcceleration: number = 28.0;
  private groundDamping: number = 14.0;

  constructor(
    boyRig: CharacterRig,
    girlRig: CharacterRig,
    trapManager: TrapManager,
    level: LevelDefinition,
    settings: GameSettings
  ) {
    this.boyRig = boyRig;
    this.girlRig = girlRig;
    this.trapManager = trapManager;
    this.level = level;
    this.settings = settings;

    const bSpawn = new THREE.Vector3(...level.spawnPoint1);
    const gSpawn = new THREE.Vector3(...level.spawnPoint2);

    this.boyState = {
      position: bSpawn.clone(),
      velocity: new THREE.Vector3(),
      rotationY: 0,
      isGrounded: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      isDead: false,
      respawnTimer: 0,
      lastCheckpointPos: bSpawn.clone()
    };

    this.girlState = {
      position: gSpawn.clone(),
      velocity: new THREE.Vector3(),
      rotationY: 0,
      isGrounded: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      isDead: false,
      respawnTimer: 0,
      lastCheckpointPos: gSpawn.clone()
    };

    this.boyRig.group.position.copy(bSpawn);
    this.girlRig.group.position.copy(gSpawn);
  }

  public setLevel(level: LevelDefinition) {
    this.level = level;
    this.levelTimer = 0;
    this.isVictory = false;

    const bSpawn = new THREE.Vector3(...level.spawnPoint1);
    const gSpawn = new THREE.Vector3(...level.spawnPoint2);

    this.boyState.position.copy(bSpawn);
    this.boyState.velocity.set(0, 0, 0);
    this.boyState.lastCheckpointPos.copy(bSpawn);
    this.boyState.isDead = false;

    this.girlState.position.copy(gSpawn);
    this.girlState.velocity.set(0, 0, 0);
    this.girlState.lastCheckpointPos.copy(gSpawn);
    this.girlState.isDead = false;

    this.boyRig.group.position.copy(bSpawn);
    this.girlRig.group.position.copy(gSpawn);
  }

  /** Apply a network snapshot for the remote character (ignored if stale or for our own character). */
  public applyRemoteState(net: PlayerNetState) {
    if (this.activeControlMode !== 'online_room') return;
    if (net.character === this.localCharacter) return;
    const prev = this.remoteTargets[net.character];
    if (prev && net.timestamp < prev.timestamp) return; // out-of-order packet
    this.remoteTargets[net.character] = {
      position: new THREE.Vector3(...net.position),
      velocity: new THREE.Vector3(...net.velocity),
      rotationY: net.rotationY,
      isGrounded: net.isGrounded,
      timestamp: net.timestamp
    };
  }

  /** Snapshot of the local character, to be broadcast to the partner. */
  public getLocalNetState(playerId: string): PlayerNetState | null {
    if (!this.localCharacter) return null;
    const st = this.localCharacter === 'boy' ? this.boyState : this.girlState;
    return {
      playerId,
      character: this.localCharacter,
      position: [st.position.x, st.position.y, st.position.z],
      velocity: [st.velocity.x, st.velocity.y, st.velocity.z],
      rotationY: st.rotationY,
      isGrounded: st.isGrounded,
      animState: st.isDead ? 'dead' : st.isGrounded ? 'ground' : 'air',
      timestamp: Date.now()
    };
  }

  /** Guest: host says both players died. */
  public applyRemoteDeath() {
    this.boyState.isDead = true;
    this.girlState.isDead = true;
    // The host owns respawning; a guest just waits for the host's 'respawn' event
    const t = this.isOnlineGuest ? 999 : 0.8;
    this.boyState.respawnTimer = t;
    this.girlState.respawnTimer = t;
    sound.playDeath();
  }

  /** Guest: host says respawn at these positions. */
  public applyRemoteRespawn(boyPos: [number, number, number], girlPos: [number, number, number]) {
    this.boyState.lastCheckpointPos.set(...boyPos);
    this.girlState.lastCheckpointPos.set(...girlPos);
    this.resetToCheckpoint();
  }

  /** Guest: host says the level is cleared. */
  public applyRemoteVictory(finalTime: number) {
    if (this.isVictory) return;
    this.isVictory = true;
    this.levelTimer = finalTime;
    sound.playVictory();
  }

  /** Guest: keep trap/moving-platform clock in step with the host. */
  public syncGameTime(hostTime: number) {
    if (Math.abs(this.gameTime - hostTime) > 0.1) this.gameTime = hostTime;
  }

  private isRemoteCharacter(c: CharacterGender): boolean {
    return this.activeControlMode === 'online_room' && this.localCharacter !== null && c !== this.localCharacter;
  }

  private updateRemotePlayer(c: CharacterGender, state: PlayerPhysicsState, rig: CharacterRig, dt: number) {
    const target = this.remoteTargets[c];
    if (!target || state.isDead) return;
    const dist = state.position.distanceTo(target.position);
    if (dist > 6) {
      state.position.copy(target.position);
    } else {
      // Dead-reckon the target forward a little, then ease toward it
      const k = 1 - Math.exp(-14 * dt);
      state.position.lerp(target.position, k);
    }
    target.position.addScaledVector(target.velocity, dt * 0.5);
    state.velocity.copy(target.velocity);
    state.isGrounded = target.isGrounded;
    let dAng = target.rotationY - state.rotationY;
    dAng = Math.atan2(Math.sin(dAng), Math.cos(dAng));
    state.rotationY += dAng * (1 - Math.exp(-16 * dt));
    rig.group.rotation.y = state.rotationY;
    rig.group.position.copy(state.position);
  }

  public resetToCheckpoint() {
    if (this.isSinglePlayer) {
      if (this.singlePlayerCharacter === 'boy') {
        this.boyState.position.copy(this.boyState.lastCheckpointPos);
        this.boyState.velocity.set(0, 0, 0);
        this.boyState.isDead = false;
        this.boyRig.group.position.copy(this.boyState.position);
      } else {
        this.girlState.position.copy(this.girlState.lastCheckpointPos);
        this.girlState.velocity.set(0, 0, 0);
        this.girlState.isDead = false;
        this.girlRig.group.position.copy(this.girlState.position);
      }
      return;
    }

    this.boyState.position.copy(this.boyState.lastCheckpointPos);
    this.boyState.velocity.set(0, 0, 0);
    this.boyState.isDead = false;

    this.girlState.position.copy(this.girlState.lastCheckpointPos);
    this.girlState.velocity.set(0, 0, 0);
    this.girlState.isDead = false;

    this.boyRig.group.position.copy(this.boyState.position);
    this.girlRig.group.position.copy(this.girlState.position);
  }

  public update(delta: number, input: InputState, camera: THREE.Camera): { victory: boolean; deaths: number } {
    if (this.isPaused) return { victory: false, deaths: 0 };
    const dt = Math.min(delta, 0.05); // prevent physics tunneling on lag
    this.gameTime += dt;
    if (!this.isVictory) {
      this.levelTimer += dt;
    }

    let deathsCount = 0;

    // Checkpoints update
    this.trapManager.checkpoints.forEach((cp) => {
      if (cp.config.activated) {
        if (this.isSinglePlayer) {
          if (this.singlePlayerCharacter === 'boy') {
            this.boyState.lastCheckpointPos.set(cp.config.position[0], cp.config.position[1] + 1, cp.config.position[2]);
          } else {
            this.girlState.lastCheckpointPos.set(cp.config.position[0], cp.config.position[1] + 1, cp.config.position[2]);
          }
        } else {
          this.boyState.lastCheckpointPos.set(cp.config.position[0] - 1, cp.config.position[1] + 1, cp.config.position[2]);
          this.girlState.lastCheckpointPos.set(cp.config.position[0] + 1, cp.config.position[1] + 1, cp.config.position[2]);
        }
      }
    });

    // ===== SINGLE PLAYER / NORMAL GAMEPLAY MODE =====
    if (this.isSinglePlayer) {
      const isBoy = this.singlePlayerCharacter === 'boy';
      const activeState = isBoy ? this.boyState : this.girlState;
      const activeRig = isBoy ? this.boyRig : this.girlRig;

      let moveX = 0;
      let moveZ = 0;
      if (input.p1Forward) moveZ -= 1;
      if (input.p1Backward) moveZ += 1;
      if (input.p1Left) moveX -= 1;
      if (input.p1Right) moveX += 1;
      const jump = input.p1Jump;

      this.updatePlayerPhysics(activeState, activeRig, moveX, moveZ, jump, dt);

      // Traps update: check only active player position
      const dummyOffscreen = new THREE.Vector3(0, -999, 0);
      const bPos = isBoy ? activeState.position : dummyOffscreen;
      const gPos = isBoy ? dummyOffscreen : activeState.position;

      this.trapManager.update(dt, this.gameTime, bPos, gPos, () => {
        if (!activeState.isDead) {
          sound.playDeath();
          activeState.isDead = true;
          activeState.respawnTimer = 1.0;
          deathsCount++;
        }
      });

      // Void Fall Death
      if (activeState.position.y < -15) {
        if (!activeState.isDead) {
          sound.playDeath();
          activeState.isDead = true;
          activeState.respawnTimer = 0.8;
          deathsCount++;
        }
      }

      // Respawn
      if (activeState.isDead) {
        activeState.respawnTimer -= dt;
        if (activeState.respawnTimer <= 0) {
          this.resetToCheckpoint();
        }
      }

      // Goal Completion in Single Player
      const goalPos = new THREE.Vector3(...this.level.goalPosition);
      const dist = activeState.position.distanceTo(goalPos);
      if (dist < 2.5 && !this.isVictory && !activeState.isDead) {
        this.isVictory = true;
        sound.playVictory();
      }

      // Character Animation
      const animState: CharacterAnimationState = {
        velocity: activeState.velocity,
        isGrounded: activeState.isGrounded,
        isJumping: activeState.velocity.y > 0.5,
        isFalling: activeState.velocity.y < -0.5,
        isDead: activeState.isDead,
        isCheering: this.isVictory
      };
      activeRig.updateAnimation(animState, dt);

      return { victory: this.isVictory, deaths: deathsCount };
    }

    // 1. Process Boy Inputs
    let bMoveX = 0;
    let bMoveZ = 0;
    let bJump = false;

    if (this.activeControlMode === 'local_coop') {
      if (input.p1Forward) bMoveZ -= 1;
      if (input.p1Backward) bMoveZ += 1;
      if (input.p1Left) bMoveX -= 1;
      if (input.p1Right) bMoveX += 1;
      bJump = input.p1Jump;
    } else if (this.activeControlMode === 'single_switch') {
      if (this.singleActivePlayer === 'boy') {
        if (input.p1Forward) bMoveZ -= 1;
        if (input.p1Backward) bMoveZ += 1;
        if (input.p1Left) bMoveX -= 1;
        if (input.p1Right) bMoveX += 1;
        bJump = input.p1Jump;
      }
    } else {
      // online mode - this client controls only its own character
      if (this.localCharacter === 'boy') {
        if (input.p1Forward) bMoveZ -= 1;
        if (input.p1Backward) bMoveZ += 1;
        if (input.p1Left) bMoveX -= 1;
        if (input.p1Right) bMoveX += 1;
        bJump = input.p1Jump;
      }
    }

    // 2. Process Girl Inputs
    let gMoveX = 0;
    let gMoveZ = 0;
    let gJump = false;

    if (this.activeControlMode === 'local_coop') {
      if (input.p2Forward) gMoveZ -= 1;
      if (input.p2Backward) gMoveZ += 1;
      if (input.p2Left) gMoveX -= 1;
      if (input.p2Right) gMoveX += 1;
      gJump = input.p2Jump;
    } else if (this.activeControlMode === 'single_switch') {
      if (this.singleActivePlayer === 'girl') {
        if (input.p1Forward) gMoveZ -= 1;
        if (input.p1Backward) gMoveZ += 1;
        if (input.p1Left) gMoveX -= 1;
        if (input.p1Right) gMoveX += 1;
        gJump = input.p1Jump;
      }
    } else {
      if (this.localCharacter === 'girl') {
        if (input.p1Forward) gMoveZ -= 1;
        if (input.p1Backward) gMoveZ += 1;
        if (input.p1Left) gMoveX -= 1;
        if (input.p1Right) gMoveX += 1;
        gJump = input.p1Jump;
      }
    }

    // Update Physics for both players
    if (this.isRemoteCharacter('boy')) {
      this.updateRemotePlayer('boy', this.boyState, this.boyRig, dt);
    } else {
      this.updatePlayerPhysics(this.boyState, this.boyRig, bMoveX, bMoveZ, bJump, dt);
    }
    if (this.isRemoteCharacter('girl')) {
      this.updateRemotePlayer('girl', this.girlState, this.girlRig, dt);
    } else {
      this.updatePlayerPhysics(this.girlState, this.girlRig, gMoveX, gMoveZ, gJump, dt);
    }

    // Update Traps, Collectibles & Checkpoints
    this.trapManager.update(
      dt,
      this.gameTime,
      this.boyState.position,
      this.girlState.position,
      (trapType) => {
        // Surprise Trap Hit!
        this.boyRig.facialController.triggerEvent('trap_near', { duration: 1.5 });
        this.girlRig.facialController.triggerEvent('trap_near', { duration: 1.5 });
        if (this.isOnlineGuest) return;
        if (!this.boyState.isDead && !this.girlState.isDead) {
          sound.playDeath();
          this.boyState.isDead = true;
          this.girlState.isDead = true;
          this.boyState.respawnTimer = 1.0;
          this.girlState.respawnTimer = 1.0;
          deathsCount++;
          this.emitDeath();
        }
      },
      (collector, itemType) => {
        // Collect Item Event: triggers beaming smile & happy expression!
        if (collector === 'boy' || collector === 'both') {
          this.boyRig.facialController.triggerEvent('collect_item', { duration: 1.5 });
        }
        if (collector === 'girl' || collector === 'both') {
          this.girlRig.facialController.triggerEvent('collect_item', { duration: 1.5 });
        }
      },
      (activator) => {
        // Checkpoint Event: confident smile!
        if (activator === 'boy' || activator === 'both') {
          this.boyRig.facialController.triggerEvent('checkpoint', { duration: 1.2 });
        }
        if (activator === 'girl' || activator === 'both') {
          this.girlRig.facialController.triggerEvent('checkpoint', { duration: 1.2 });
        }
      }
    );

    // Check Fall Death into Void
    // Guests only report their OWN fall (the host sees the rest through the host-side check below)
    const guestOwnFall =
      this.isOnlineGuest &&
      this.localCharacter !== null &&
      (this.localCharacter === 'boy' ? this.boyState : this.girlState).position.y < -15;
    if (guestOwnFall && !this.boyState.isDead && !this.girlState.isDead) {
      sound.playDeath();
      this.boyState.isDead = true;
      this.girlState.isDead = true;
      this.boyState.respawnTimer = 999;
      this.girlState.respawnTimer = 999;
      deathsCount++;
      this.emitDeath();
    }
    if (!this.isOnlineGuest && (this.boyState.position.y < -15 || this.girlState.position.y < -15)) {
      if (!this.boyState.isDead && !this.girlState.isDead) {
        sound.playDeath();
        this.boyState.isDead = true;
        this.girlState.isDead = true;
        this.boyState.respawnTimer = 0.8;
        this.girlState.respawnTimer = 0.8;
        deathsCount++;
        this.emitDeath();
      }
    }

    // Handle Respawn after Death
    if (this.boyState.isDead && !this.isOnlineGuest) {
      this.boyState.respawnTimer -= dt;
      if (this.boyState.respawnTimer <= 0) {
        this.resetToCheckpoint();
        const b = this.boyState.position;
        const g = this.girlState.position;
        this.onGameEvent?.({ type: 'respawn', boyPos: [b.x, b.y, b.z], girlPos: [g.x, g.y, g.z] });
      }
    }

    // Check Romantic Goal Completion (Both characters must reach the finish portal together!)
    const goalPos = new THREE.Vector3(...this.level.goalPosition);
    // Horizontal distance + generous height tolerance (the portal floats above the platform)
    const nearGoal = (p: THREE.Vector3) =>
      Math.hypot(p.x - goalPos.x, p.z - goalPos.z) < 3.0 && Math.abs(p.y - goalPos.y) < 3.5;

    // Online: whichever client sees both partners at the portal declares victory (not only the host),
    // so finishing doesn't depend on one particular window being active.
    if (nearGoal(this.boyState.position) && nearGoal(this.girlState.position) && !this.isVictory && !this.boyState.isDead && !this.girlState.isDead) {
      this.isVictory = true;
      sound.playVictory();
      this.boyRig.facialController.triggerEvent('victory', { duration: 5.0 });
      this.girlRig.facialController.triggerEvent('victory', { duration: 5.0 });
      this.onGameEvent?.({ type: 'victory', finalTime: this.levelTimer });
    }

    // Update Character Animation Kinematics with Expressive Facial State Machine
    const boySurprised = this.boyState.velocity.y < -4.0 || (this.boyState.isDead && this.boyState.respawnTimer > 0.6);
    const girlSurprised = this.girlState.velocity.y < -4.0 || (this.girlState.isDead && this.girlState.respawnTimer > 0.6);

    const boyAnimState: CharacterAnimationState = {
      velocity: this.boyState.velocity,
      isGrounded: this.boyState.isGrounded,
      isJumping: this.boyState.velocity.y > 0.5,
      isFalling: this.boyState.velocity.y < -0.5,
      isDead: this.boyState.isDead,
      isCheering: this.isVictory,
      isSurprised: boySurprised,
      lookAtPartnerPos: this.girlState.position
    };
    this.boyRig.updateAnimation(boyAnimState, dt);

    const girlAnimState: CharacterAnimationState = {
      velocity: this.girlState.velocity,
      isGrounded: this.girlState.isGrounded,
      isJumping: this.girlState.velocity.y > 0.5,
      isFalling: this.girlState.velocity.y < -0.5,
      isDead: this.girlState.isDead,
      isCheering: this.isVictory,
      isSurprised: girlSurprised,
      lookAtPartnerPos: this.boyState.position
    };
    this.girlRig.updateAnimation(girlAnimState, dt);

    return { victory: this.isVictory, deaths: deathsCount };
  }

  private emitDeath() {
    this.onGameEvent?.({ type: 'death', playerId: '', character: this.localCharacter ?? 'boy' });
  }

  private updatePlayerPhysics(
    state: PlayerPhysicsState,
    rig: CharacterRig,
    inputX: number,
    inputZ: number,
    jumpInput: boolean,
    dt: number
  ) {
    if (state.isDead) return;

    // 1. Horizontal Movement & Acceleration
    const moveDir = new THREE.Vector2(inputX, inputZ);
    if (moveDir.lengthSq() > 0.001) {
      moveDir.normalize();

      const targetVelX = moveDir.x * this.moveSpeed;
      const targetVelZ = moveDir.y * this.moveSpeed;

      const accel = state.isGrounded ? this.groundDamping : this.airAcceleration;
      state.velocity.x = THREE.MathUtils.damp(state.velocity.x, targetVelX, accel, dt);
      state.velocity.z = THREE.MathUtils.damp(state.velocity.z, targetVelZ, accel, dt);

      // Smooth Character Facing Direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.y);
      state.rotationY = THREE.MathUtils.damp(state.rotationY, targetAngle, 16, dt);
      rig.group.rotation.y = state.rotationY;
    } else {
      // Natural Deceleration
      const drag = state.isGrounded ? this.groundDamping * 1.2 : 3.0;
      state.velocity.x = THREE.MathUtils.damp(state.velocity.x, 0, drag, dt);
      state.velocity.z = THREE.MathUtils.damp(state.velocity.z, 0, drag, dt);
    }

    // 2. Gravity
    state.velocity.y -= this.gravity * dt;

    // 3. Jump Buffering & Coyote Time
    if (jumpInput) {
      state.jumpBufferTimer = 0.12;
    } else {
      state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
    }

    if (state.isGrounded) {
      state.coyoteTimer = 0.12;
    } else {
      state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
    }

    if (state.jumpBufferTimer > 0 && state.coyoteTimer > 0) {
      state.velocity.y = this.jumpForce;
      state.isGrounded = false;
      state.coyoteTimer = 0;
      state.jumpBufferTimer = 0;
      sound.playJump();
      rig.facialController.triggerEvent('jump');
    }

    // 4. Proposed Position
    const nextPos = state.position.clone();
    nextPos.x += state.velocity.x * dt;
    nextPos.y += state.velocity.y * dt;
    nextPos.z += state.velocity.z * dt;

    // 5. Collision Detection with Platforms
    let landed = false;
    const playerRadius = 0.35;

    // Check all level platforms (static + moving)
    const allPlatforms = [
      ...this.level.platforms,
      ...this.trapManager.movingPlatforms.map((mp) => ({
        ...mp.config,
        position: [mp.mesh.position.x, mp.mesh.position.y, mp.mesh.position.z] as [number, number, number]
      }))
    ];

    for (const plat of allPlatforms) {
      const halfW = plat.size[0] * 0.5 + playerRadius;
      const halfH = plat.size[1] * 0.5;
      const halfD = plat.size[2] * 0.5 + playerRadius;

      const px = plat.position[0];
      const py = plat.position[1];
      const pz = plat.position[2];

      const inX = nextPos.x >= px - halfW && nextPos.x <= px + halfW;
      const inZ = nextPos.z >= pz - halfD && nextPos.z <= pz + halfD;

      if (inX && inZ) {
        const topY = py + halfH;
        // Check landing on top
        if (state.position.y >= topY - 0.25 && nextPos.y <= topY + 0.15 && state.velocity.y <= 0) {
          nextPos.y = topY;
          state.velocity.y = 0;
          landed = true;

          // Sound and facial blink on landing
          if (!state.isGrounded) {
            sound.playLand();
            rig.facialController.triggerEvent('land');
          }
        }
      }
    }

    // Footstep audio trigger when moving on ground
    if (landed && (Math.abs(state.velocity.x) > 1.0 || Math.abs(state.velocity.z) > 1.0)) {
      if (Math.sin(this.gameTime * 12) > 0.95) {
        sound.playFootstep();
      }
    }

    state.isGrounded = landed;
    state.position.copy(nextPos);
    rig.group.position.copy(state.position);
  }
}
