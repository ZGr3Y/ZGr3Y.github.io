# Paolo Maria Scarlata (ZGr3Y) — Spatial 3D Security Portfolio

A high-performance spatial 3D portfolio website featuring real-time optical physics, transparent glass shaders, holographic interface panels, and camera waypoint travel.

Deployed to GitHub Pages at: `https://zgr3y.github.io/`

---

## 🌌 Spatial Stations Architecture

Instead of traditional vertical 1D scrolling, the experience is organized into **4 Spatial Stations** situated in 3D coordinate space:

1. **01 // GATEWAY (`X: 0.0, Y: 0.0, Z: 15.0`)**
   - Identity, research role, and spatial system telemetry
   - Quick navigation triggers and Curriculum Vitae download link (`resume_PaoloMariaScarlata.pdf`)
2. **02 // LAB (`X: 24.0, Y: 6.0, Z: -10.0`)**
   - Holographic glass cards with interactive 3D pointer tilt and specular highlight tracking:
     - **CTF Vulnerability Lab** (*Bachelor's Thesis*): Docker & Node.js offensive sandbox (IDOR + WAF bypass, JWT injection, weak crypto)
     - **Broken Access Control & Mitigations** (*Research Project*): OWASP Top 10 study featuring exploit PoCs & parallel Hardened code (AES-256, strict RBAC)
     - **Zero-Trust Kernel Telemetry** (*Experimental*): eBPF syscall tracing probe for container anomaly detection
     - **Quantum-Resistant Key Exchange** (*Cryptographic Bench*): NIST ML-KEM lattice crypto with WebAssembly
   - Modal deep-dive inspector for architecture, vulnerabilities, and mitigations
3. **03 // ARSENAL (`X: -22.0, Y: -12.0, Z: -45.0`)**
   - Tactical capabilities categorized into 4 security and engineering pillars:
     - Offensive Security (OWASP Top 10, IDOR, JWT, WAF Evasion, Burp Suite, Network Pentesting)
     - Defensive & Hardening (Zero-Trust, RBAC/ABAC, AES-256, Session Hardening, CI/CD Auditing)
     - Systems & Programming (Node.js, TypeScript/JS, Python, C/C++, Linux, Docker, Git)
     - Creative & Interactive (Three.js, WebGL, GLSL Shaders, Modern Glassmorphism UI)
4. **04 // TRANSMISSION (`X: 6.0, Y: 22.0, Z: -85.0`)**
   - Cyber security terminal simulation (`whoami`, `status`, `gpg fingerprint`)
   - Direct uplinks to GitHub, Resume PDF download, and encrypted communication channels

---

## 🎨 Radically Different Prototype Variations (`?variant=`)

Switchable in real time via the bottom floating switcher bar (with left/right arrows and variant badges) or keyboard shortcuts `[← / →]` and `[V]`:

- **Variant A — Deep Space Optics & Panoramic Glass (`?variant=A`)**:
  - Focuses on procedural optical physics: anamorphic lens flare streaks, chromatic diffraction rings, caustic glare halos, and volumetric beacon rings.
  - Symmetrical panoramic layout with wide holographic glass panels, chromatic aberration gradients, and 4-card testbed grid.
- **Variant B — 3D Sculptures & Spatial Cockpit (`?variant=B`)**:
  - Focuses on physical 3D refractive polyhedra anchors (faceted Dodecahedron crystal at Gateway, twin crystalline prisms at Lab, gyroscopic security torus knot at Arsenal, quantum beacon at Transmission) catching dynamic specular light.
  - Asymmetric spatial cockpit layout with left-docked telemetry and project decks, leaving an unobstructed viewport window framing each live 3D crystal sculpture.
  - Interactive **3D Sculpture Inspector HUD**: live rotation speed multiplier (`1x`, `2x`, `Pause`) and facet rendering mode (`Glass`, `Wireframe`, `Hybrid`).

---

## ⚡ Performance & Battery Optimization

- **Idle Damping**: When the camera reaches its destination and no pointer interaction is detected for >3 seconds, the GPU render loop automatically throttles from 60 FPS down to 15 FPS. Any user movement immediately wakes the engine back to full 60 FPS without lag.
- **DPR Clamping**: Device Pixel Ratio is clamped to `Math.min(window.devicePixelRatio, 2)` to eliminate GPU thermal throttling on high-DPI (Retina/4K) screens.
- **Boundary-Aware Navigation**: Mouse wheel and touch swipes intelligently scroll overflowing text panels when needed, and transition between 3D stations when reaching boundaries.
- **Zero Asset Overhead**: Starfield particles, optical flare textures, and glass materials are procedurally generated in memory, eliminating external asset latency and 404 risks.

---

## 🚀 Local Development

To run locally with Vite:

```bash
# 1. Install dependencies
npm install

# 2. Start local Vite development server
npm run dev

# 3. Build for production (outputs to /dist)
npm run build

# 4. Preview production build
npm run preview
```

### Standalone / Zero-Build Mode
`index.html` includes standard browser `<script type="importmap">` targeting CDN Three.js modules. The application can also be served directly by any static HTTP server (e.g., Python `python -m http.server`, Live Server, or GitHub Pages root) without requiring a build step. `.nojekyll` is configured to prevent Jekyll bypass on GitHub Pages.

---

## 🎮 Controls

| Action | Control |
|---|---|
| **Next Station** | `ArrowDown`, `PageDown`, Mouse Wheel Down, Touch Swipe Up |
| **Previous Station** | `ArrowUp`, `PageUp`, Mouse Wheel Up, Touch Swipe Down |
| **Jump to Station (1-4)** | Top HUD buttons, Right Dock dots, or Number keys `1`, `2`, `3`, `4` |
| **Cycle Prototype Variant** | Floating Switcher `[←] / [→]` buttons, keyboard `ArrowLeft` / `ArrowRight`, or key `[V]` |
| **3D Sculpture Controls (Variant B)** | Interactive Inspector HUD: `[1x / 2x / Pause]`, `[Glass / Wire / Hybrid]` |
| **Toggle Synthesized Audio** | HUD Speaker button or key `[M]` |
| **Card Parallax & Specular Glint** | Pointer / Cursor movement over holographic cards |
| **Inspect Project Modal** | Click card or "Inspect Architecture" button (Close: `Esc`) |