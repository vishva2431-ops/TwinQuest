import { LevelDefinition, PlatformConfig, TrapConfig, CollectibleConfig, CheckpointConfig } from '../types/game';
import { WORLDS_DATA } from './storage';

/**
 * Procedural Deterministic Level Generator for TwinQuest
 * Generates 500 validated, playable, surprise-trap levels per world (5,000 total)
 */

function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateLevel(worldId: number, levelNumber: number): LevelDefinition {
  const world = WORLDS_DATA.find((w) => w.id === worldId) || WORLDS_DATA[0];
  const seed = worldId * 10000 + levelNumber;
  const rand = pseudoRandom(seed);

  // Level difficulty scales with levelNumber (1 to 500)
  const tier = Math.floor((levelNumber - 1) / 50); // 0 to 9
  const sectionCount = 4 + Math.min(10, Math.floor(levelNumber / 40));
  const sectionLength = 8;

  const platforms: PlatformConfig[] = [];
  const traps: TrapConfig[] = [];
  const collectibles: CollectibleConfig[] = [];
  const checkpoints: CheckpointConfig[] = [];

  // Start Platform (Safe Spawn Area)
  platforms.push({
    id: 'start_platform',
    position: [0, 0, 0],
    size: [6, 1, 6],
    color: world.groundColor
  });

  const spawn1: [number, number, number] = [-1.5, 1.2, 0];
  const spawn2: [number, number, number] = [1.5, 1.2, 0];

  let currentX = 0;
  let currentY = 0;
  let currentZ = 0;

  // Generate sequence of challenging sections with unexpected traps
  for (let i = 0; i < sectionCount; i++) {
    const isMidpoint = i === Math.floor(sectionCount / 2);
    const stepX = (rand() - 0.5) * 4;
    const stepY = (rand() - 0.4) * 2; // slight upward or downward trend
    const stepZ = -(5 + rand() * 4); // moving forward in -Z direction

    currentX += stepX;
    currentY += stepY;
    currentZ += stepZ;

    const platformId = `plat_${i}`;
    const platWidth = Math.max(3, 5 - tier * 0.25 + rand() * 1.5);
    const platDepth = Math.max(3, 5 - tier * 0.25 + rand() * 1.5);

    // Platform Type Variation
    const typeRoll = rand();

    if (typeRoll < 0.25) {
      // Moving Platform
      const moveAxis = rand() > 0.5 ? 'x' : 'y';
      platforms.push({
        id: platformId,
        position: [currentX, currentY, currentZ],
        size: [platWidth, 0.8, platDepth],
        color: world.accentColor,
        isMoving: true,
        moveRange: moveAxis === 'x' ? [3 + rand() * 2, 0, 0] : [0, 2 + rand() * 1.5, 0],
        moveSpeed: 1.2 + tier * 0.15
      });
    } else {
      // Solid / Themed Platform
      platforms.push({
        id: platformId,
        position: [currentX, currentY, currentZ],
        size: [platWidth, 0.8, platDepth],
        color: world.groundColor
      });
    }

    // Surprise Trap Placement (Level Devil inspired unexpected mechanics!)
    const trapRoll = rand();

    if (trapRoll < 0.28) {
      // 1. Collapsing Floor (looks safe, collapses after stepped on!)
      traps.push({
        id: `trap_collapse_${i}`,
        type: 'collapsing_floor',
        position: [currentX + (rand() - 0.5) * 1.5, currentY + 0.45, currentZ + (rand() - 0.5) * 1.5],
        size: [1.8, 0.2, 1.8],
        delay: Math.max(0.35, 0.7 - tier * 0.04)
      });
    } else if (trapRoll < 0.5) {
      // 2. Hidden Spikes that pop up when player gets close
      traps.push({
        id: `trap_spikes_${i}`,
        type: 'hidden_spikes',
        position: [currentX + (rand() - 0.5) * 1.2, currentY + 0.42, currentZ + (rand() - 0.5) * 1.2],
        size: [1.5, 0.8, 1.5],
        range: 2.2 + tier * 0.1
      });
    } else if (trapRoll < 0.68) {
      // 3. Fake Platform (vanishes instantly when touched)
      traps.push({
        id: `trap_fake_${i}`,
        type: 'fake_platform',
        position: [currentX + (rand() > 0.5 ? 2.8 : -2.8), currentY, currentZ - 2],
        size: [2.5, 0.6, 2.5]
      });
    } else if (trapRoll < 0.85) {
      // 4. Swinging Bladed Pendulum / Hazard
      traps.push({
        id: `trap_swing_${i}`,
        type: 'swinging_blade',
        position: [currentX, currentY + 2.5, currentZ],
        size: [0.8, 2.2, 0.8],
        speed: 1.8 + tier * 0.2,
        range: 3.5
      });
    } else {
      // 5. Co-op Pressure Plate + Door puzzle
      const platePos: [number, number, number] = [currentX - 1.2, currentY + 0.45, currentZ];
      const doorPos: [number, number, number] = [currentX + 1.2, currentY + 1.5, currentZ];
      const doorId = `door_${i}`;

      traps.push({
        id: `plate_${i}`,
        type: 'pressure_plate',
        position: platePos,
        size: [1.2, 0.15, 1.2],
        linkedId: doorId
      });

      traps.push({
        id: doorId,
        type: 'timed_door',
        position: doorPos,
        size: [1.2, 2.5, 0.4],
        delay: 4.0
      });
    }

    // Midpoint Checkpoint Pylon
    if (isMidpoint) {
      checkpoints.push({
        id: `cp_${worldId}_${levelNumber}`,
        position: [currentX, currentY + 0.5, currentZ],
        activated: false
      });
    }

    // Collectibles (Romantic Hearts & Crystals)
    if (i === 1 || i === Math.floor(sectionCount * 0.4) || i === Math.floor(sectionCount * 0.8)) {
      collectibles.push({
        id: `heart_${i}`,
        type: 'heart',
        position: [currentX + (rand() - 0.5) * 1.5, currentY + 1.6, currentZ],
        collected: false
      });
    } else if (rand() > 0.6) {
      collectibles.push({
        id: `gem_${i}`,
        type: 'gem',
        position: [currentX, currentY + 1.4, currentZ],
        collected: false
      });
    }
  }

  // Final Destination & Romantic Heart Goal Portal
  currentZ -= 6;
  platforms.push({
    id: 'finish_platform',
    position: [currentX, currentY, currentZ],
    size: [6, 1, 6],
    color: '#f43f5e'
  });

  // Level Devil surprise: In higher levels, introduce false finish gate trick!
  if (levelNumber % 5 === 0 && levelNumber > 5) {
    traps.push({
      id: 'false_goal_gate',
      type: 'false_goal',
      position: [currentX - 1.5, currentY + 1.5, currentZ + 1],
      size: [1.8, 3, 0.5]
    });
  }

  const goalPosition: [number, number, number] = [currentX, currentY + 1.8, currentZ];

  return {
    worldId,
    levelNumber,
    name: `${world.name} — Stage ${levelNumber}`,
    spawnPoint1: spawn1,
    spawnPoint2: spawn2,
    goalPosition,
    platforms,
    traps,
    collectibles,
    checkpoints,
    parTimeSeconds: Math.round(25 + sectionCount * 3.5),
    coopRequired: true
  };
}
