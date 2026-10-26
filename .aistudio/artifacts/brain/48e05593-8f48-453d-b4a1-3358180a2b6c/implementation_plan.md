# Realistic Character Face & Visual Overhaul

Upgrade TwinQuest's player characters with realistic, high-fidelity facial textures, authentic anatomical skin shading, realistic iris refraction with specular catchlights, natural strand-layered hair, and tailored realistic adventure apparel while maintaining full compatibility with the existing skeleton rig and blend shape animation controller.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following directions have been confirmed based on your interview answers and will govern the character upgrade:

- **Confirmed Decision 1 (Facial Fidelity)**: **High-resolution realistic skin texture with authentic irises and specular catchlights**. We will replace the flat cartoon face artwork with a multi-pass realistic texture system featuring anatomical micro-skin tones, subsurface scattering gradients, defined realistic philtrum and lip lines, soft eye corner caruncles, layered realistic irises with limbal rings and pupillary fibers, and dynamic specularity.
- **Confirmed Decision 2 (Full Realistic Overhaul)**: **Complete realistic makeover for hair and outfits**. We will replace the chunky cartoon hair and simple hoodie blocks with realistic strand-layered hairstyles (textured brunette flow for Maya and dynamic layered cut for Leo), realistic woven denim/cotton apparel textures with seam stitching, natural fabric folds, leather explorer straps with brushed brass hardware, and realistic athletic trail sneakers.
- **Confirmed Decision 3 (Preserved Gameplay Mechanics)**: All existing gameplay physics, multiplayer synchronization, collision geometry, sound effects, and facial animation triggers (`jump`, `collect_item`, `checkpoint`, `land`, `trap_near`, `victory`) will remain 100% intact and seamlessly drive the new realistic blend shapes.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the visual appearance of both playable adventurers (Leo and Maya) from stylized cartoon toy figures into striking, realistic 3D characters. Features photorealistic skin shading, realistic eye anatomy with dynamic pupil dilation and wet cornea highlights, groomed layered hair, and tactile adventure gear.
- **Target Audience / Experience**: Players who desire a modern, cinematic, and emotionally resonant co-op adventure where characters feel alive, expressive, and visually mature during gameplay, cutscenes, and customization menus.
- **Key Value**: Delivers the visual depth of modern character rendering without sacrificing performance (running at a locked 60 FPS on WebGL) and without breaking multiplayer or physics state.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  - **Turntable / Home Menu**: Characters stand side-by-side with lifelike micro-idle breathing, natural eye saccades, realistic auto-blinking, and warm mutual glances with realistic skin specularity under studio key and rim lights.
  - **Customization Screen**: Players customize realistic skin undertones (fair, warm golden, olive, deep bronze), natural eye colors (deep hazel, sapphire blue, emerald green, warm amber with intricate iris fibers), and realistic outfit colorways with preview turntable.
  - **Gameplay & Traps**: During jumps, characters exhibit realistic facial anticipation and wind-swept hair inertia. Collecting gems and hearts triggers realistic, genuine smiles with visible teeth gleam and lip curvature. Approaching hazards or falling triggers genuine startled expressions.

- **Visual Identity & Theme**:
  - *Skin & Face Aesthetics*: Realistic anatomical skin with soft ambient occlusion in the eye sockets, natural nasal bridge highlights, subtle epidermal blush on cheekbones and nose tip, defined vermilion border on lips with delicate hydration gloss, and realistic eyelashes.
  - *Eye Anatomy*: Multi-tier realistic eye shader containing a dark limbal ring, fibrous trabecular iris structure, deep pupil with reactive scaling, and dual specular highlights mimicking high-end softbox reflections.
  - *Hair Styling*: Strand-textured hair cards with anisotropic specular sheen, layered fringe, flowing ponytail with physics spring-damping for Maya, and textured natural waves for Leo.
  - *Apparel*: Textured ripstop nylon and woven cotton hoodies with visible weave, rib-knit cuffs, real canvas drawstrings with metal aglets, dark utility denim with pockets and seam highlights, and rugged trail-running sneakers with sculpted tread lugs.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Realistic Canvas/Procedural Texture Pipeline vs External Heavy FBX/GLTF Meshes**
  - *Chosen Approach*: Procedural multi-layer 1024x1024 HTML5 Canvas PBR Texture Generator with sub-surface skin tone emulation, integrated directly with Three.js `MeshStandardMaterial` roughness, metalness, and normal bump attributes.
  - *Why*: Eliminates 404 network asset failures, maintains sub-second loading time, guarantees zero external dependency issues, and allows instant live recoloring during character customization without downloading heavy multi-megabyte model files.
  - *Alternative Considered*: Loading static 50MB external glTF models (rejected due to loading delays, broken mobile performance, and loss of real-time customizable skin/hair/hoodie palettes).

- **Decision 2: 3D Blend Shape Vertex Deformation Synchronized with Texture Morphs**
  - *Chosen Approach*: Dual-layer synchronization. Three.js GPU `morphAttributes.position` dynamically deforms the 3D cheek volume, eyelid planes, and mouth cavity, while the internal expression controller updates the facial texture features in lockstep.
  - *Why*: Provides genuine physical 3D perspective shifts and shadow changes when characters turn their heads, while keeping facial details razor-sharp at close camera ranges.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          TwinQuest Application                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────┐                 ┌────────────────────────┐   │
│   │   GameController    │                 │   CustomizationModal   │   │
│   │ (Physics, Jump,     │                 │   & HomePage Turn-     │   │
│   │ Collectibles, Goal) │                 │   table Previews       │   │
│   └──────────┬──────────┘                 └───────────┬────────────┘   │
│              │                                        │                │
│              │ (triggers 'jump', 'collect_item', etc.)│ (updates cust) │
│              ▼                                        ▼                │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 CharacterRig (characterModel.ts)               │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │                                                                │   │
│   │  ┌──────────────────────────────────────────────────────────┐  │   │
│   │  │              FullBodySkeleton Hierarchy                  │  │   │
│   │  │  Hips ──► SpineLower ──► SpineUpper ──► Neck ──► Head    │  │   │
│   │  │   ├── Legs (Thigh ──► Calf ──► Foot / Trail Sneaker)     │  │   │
│   │  │   └── Arms (Clavicle ──► Arm ──► Forearm ──► Hand)       │  │   │
│   │  └──────────────────────────────────────────────────────────┘  │   │
│   │                                                                │   │
│   │  ┌──────────────────────────────────────────────────────────┐  │   │
│   │  │           RealisticFacialAnimationController             │  │   │
│   │  │  • 1024x1024 Realistic PBR Skin & Iris Texture           │  │   │
│   │  │  • GPU 3D Morph Targets (blink, smile, surprise, focus)  │  │   │
│   │  │  • Auto-Blinking & Micro-Saccade Glance Timer            │  │   │
│   │  │  • Event Receiver: jump, collect_item, checkpoint, land  │  │   │
│   │  └──────────────────────────────────────────────────────────┘  │   │
│   │                                                                │   │
│   │  ┌──────────────────────────────────────────────────────────┐  │   │
│   │  │             Realistic Hair & Apparel System              │  │   │
│   │  │  • Layered Textured Strand Hair with Specular Highlights │  │   │
│   │  │  • Secondary Spring-Damper Ponytail / Drawstring Physics │  │   │
│   │  │  • Tailored Fabric Hoodies with Seams & Metal Hardware   │  │   │
│   │  └──────────────────────────────────────────────────────────┘  │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - `characterModel.ts`:
    - `createRealisticFaceTexture(gender, skinTone, eyeColor, hairColor, expressionState)`: Generates high-res realistic skin texture with realistic irises, limbal rings, pupil depth, natural lip creases, and fine skin specularity.
    - `buildRealisticHair(gender, scale, hairMat, highlightMat)`: Builds natural layered strand hair with realistic flow and volume.
    - `buildRealisticApparel(gender, scale, hoodieMat, trimMat, pantsMat)`: Replaces blocky shapes with tailored clothing, visible seam ribbing, and real sneaker soles.
    - `FacialAnimationController`: Blends realistic morph weights seamlessly into GPU morph targets and dynamic texture states.
  - `gameController.ts`: Dispatches realistic expression events when jumping, landing, collecting gems/hearts, and hitting checkpoints.
