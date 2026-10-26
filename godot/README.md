# TwinQuest — Godot 4 Character Rig & Animation Tree Architecture

This directory contains the production-ready Godot 4 scripts for the **TwinQuest Full-Body Skeleton Rig**, **Dynamic Facial Expression System**, and **AnimationTree Blend Spaces**.

## Files Included:
1. `TwinQuestCharacterRig.gd`:
   - Full-body `Skeleton3D` bone hierarchy mapping:
     `Hips` -> `SpineLower` -> `SpineUpper` -> `Neck` -> `Head` (plus clavicle/arm/leg chains).
   - Dynamic real-time facial expression state machine:
     - Natural human-like auto-blinking (120ms curve with periodic double-blinks).
     - Morph poses: `SMILE`, `WIDE_SMILE`, `SURPRISE`, `DETERMINED`, `NEUTRAL`.
   - Secondary spring-damper physics for Maya's bouncy ponytail and hoodie drawstrings.
   - Elastic landing impact squish and partner glance look-at system.
   - PBR Subsurface Scattering (SSS) & Epidermal Transmittance configuration (`subsurf_scatter_enabled`, `clearcoat`, `rim`).
2. `TwinQuestAnimationTree.gd`:
   - `AnimationNodeStateMachine` + `AnimationNodeBlendSpace2D` setup.
   - Continuous 2D Locomotion blending (`Idle` -> `Walk` -> `Sprint/Run`).
   - Airborne takeoff, soaring rise, and controlled fall transitions.

The same complete architecture is also actively running in the Web/Three.js game at `src/game/characterModel.ts` and `src/game/gameController.ts`, featuring procedural micro-pore bump mapping, Subsurface Scattering (SSS) wrap lighting shaders, multi-tier studio softbox eye catchlights, and wet tear film meniscus reflections!
