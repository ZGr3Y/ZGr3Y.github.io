# 0003. Light Gray Narrative Journey & Scrollytelling Architecture

## Status
Accepted (supersedes [0002](0002-cloud-native-light-theme-and-topology.md))

## Context
ADR 0002 established a light theme ("Ice White") with an abstract 3D Cloud Mesh Topology (particles constellation). While clean, the abstract network nodes lacked emotional resonance, visceral narrative engagement, and a clear storytelling progression celebrating Paolo Maria Scarlata's background in Cloud Systems & Security Engineering.

User feedback and design alignment demonstrated the need for a continuous narrative WebGL scrollytelling journey — "DON'T PANIC" — grounded in iconic cultural artifacts (The Hitchhiker's Guide to the Galaxy, The Matrix, Blade Runner, Portal 2, Rick and Morty).

## Decision
1. **Light Gray Narrative Palette**:
   - Canvas background pivots from cold ice-white to a refined, warm-neutral **Light Gray** (`#EAECEF` with surface subtle `#F0F2F5`).
   - Browser chrome `theme-color` meta is set to `#EAECEF`.
   - High text contrast (`#0F172A` primary, `#475569` secondary) and semantic cloud accents (Blue, Green, Yellow, Red) are preserved.

2. **Scrollytelling Journey Architecture**:
   - A single, continuous Three.js `<canvas>` orchestrated across a 6-act narrative arc:
     - **Act 0 (Loader)**: Hitchhiker's Guide 3D book (`the_hitchhikers_guide_to_the_galaxy.glb`) with a circular "DON'T PANIC" SVG progress indicator and a glitch counter repeatedly resetting to 42.
     - **Act 1 (Gateway)**: Camera zoom-through from book into the Matrix White Room (`the_matrix_white_room.glb`), bio card, CV download, and GitHub uplinks.
     - **Act 2 (Pill Choice)**: Human hand (`hand.glb`) with Blue Pill vs Robotic hand (`robotic_hand.glb`) with Red Pill. Downward progression is gated until a pill is chosen; upward scroll allows re-selection.
     - **Act 3 (Branching)**:
       - *Blue Branch (Experiences)*: 3 Origami Unicorns (`origami_unicorn_from_blade_runner.glb`) representing key engineering projects with deep-dive modal support.
       - *Red Branch (Harness)*: Wheatley core (`portal_2_wheatly_rig.glb`) with eye-tracking and pupil animation surrounded by 4 orbital rings of 23 tech stack logos.
     - **Act 4 (Ship & Shatter)**: Rick's ship (`ricks_ship_from_rick_and_morty.glb`) fly-through and procedural viewport shatter effect.
     - **Act 5 (Transmission)**: Peaceful drift of Rick's ship in deep space, terminal interface, and direct contact uplinks.

3. **Legacy Architecture Purge**:
   - The Phase 1 procedural particle network (`CloudMeshTopology.js` and `AdaptiveLightingEngine.js`) is retired and purged.
   - All legacy particle tests (`topology.test.js`, `adaptive-lighting.test.js`) are removed.

4. **Performance & Ergonomics Invariants**:
   - 3D asset budget: ≤ 5 MB per model, ≤ 15 MB total production bundle (enforced by `tests/assets-budget.test.js`).
   - Strict idle damping to 0% GPU/CPU overhead when resting.
   - DPR clamped to `Math.min(window.devicePixelRatio, 1.75)`.
   - WCAG 2.1 AA accessibility with keyboard trap management, screen reader announcements (`#sr-announcements`), and DOM station isolation (`hidden=""`).

## Consequences
- The portfolio becomes a distinctive narrative journey rather than an abstract node graph.
- Codebase complexity is streamlined by removing custom procedural particle shaders in favor of curated, WebP-compressed GLTF models and smooth spring-based camera choreography.
- Full backwards navigation is supported (scrolling upward cleanly reverses the journey).
