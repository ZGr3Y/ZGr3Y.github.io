# SPEC: Cloud-Native 3D Spatial Portfolio (Ice White Edition)

## Problem Statement

Paolo Maria Scarlata (ZGr3Y) is a security and systems engineer specializing in Cloud Systems. The current portfolio is an unstyled, static Jekyll template that fails to communicate technical competence, interactive engineering skill, or cloud-native architecture. A prior prototype established that dark cyberpunk themes with optical glare and ungrounded 3D crystals felt visually noisy, lacked engineering meaning, and offered substandard mobile ergonomics.

## Solution

A clean, high-performance spatial portfolio built on an **Ice White Canvas** (`#F4F7FB`) with soft elevated cards, semantic primary color accents (Blue, Green, Yellow, Red), and an interactive **3D Cloud Mesh Topology** simulating microservices, compute nodes, and network packet routes reacting to pointer input with fluid spring physics. 

Navigation smoothly travels the camera across 4 infrastructure tiers (Gateway, Lab, Arsenal, Transmission). All debug clutter is removed in favor of a responsive, mobile-first experience with zero battery waste (Idle Damping).

## User Stories

1. As a technical recruiter or engineering manager, I want to land on a clean, professional Ice White interface, so that I immediately perceive modern, enterprise-grade engineering taste without eye strain.
2. As a visitor, I want to see an interactive 3D Cloud Mesh Topology in the background, so that I understand Paolo specializes in distributed cloud systems and infrastructure.
3. As a visitor, I want the 3D cloud nodes and packet lines to react immediately and elastically to my mouse cursor movements, so that the page feels lively, responsive, and tactile.
4. As a visitor, I want the visual elements to feature semantic primary color accents (Blue for networking, Green for operational status, Yellow for telemetry, Red for offensive security), so that colors carry functional meaning rather than arbitrary decoration.
5. As a visitor, I want to clearly read Paolo's profile and bio at Station 01 (Gateway) without text being obscured by 3D objects or distracting glare.
6. As a visitor, I want a direct download button for the Curriculum Vitae PDF at Station 01 and Station 04, so that I can download his resume with one click.
7. As a visitor, I want to seamlessly jump to any Station using the persistent floating HUD, so that I can reach specific content instantly without forced sequential scrolling.
8. As a desktop user, I want to use my mouse wheel, keyboard arrows (Up/Down), or PageUp/PageDown to navigate smoothly between stations, so that navigation feels intuitive and effortless.
9. As a mobile visitor, I want an ergonomically tailored layout with large touch targets and comfortable vertical spacing, so that I can navigate easily with one thumb.
10. As a mobile visitor, I want to swipe vertically or horizontally to flip between project cards without accidental page freezing or awkward viewport pinching.
11. As a security engineer or peer, I want to explore Station 02 (Lab) and inspect 4 distinct Cloud & Security projects (CTF Vulnerability Lab, Broken Access Control, Zero-Trust Telemetry, and Quantum Key Exchange), so that I can evaluate his technical depth.
12. As a visitor reviewing a project in Station 02, I want to click an "Inspect Architecture" button to open a detailed modal overlay containing vulnerability descriptions, architectural diagrams, and mitigation strategies.
13. As a developer inspecting a project, I want direct GitHub link buttons on each project card, so that I can verify the open-source implementation.
14. As a hiring manager, I want to explore Station 03 (Arsenal) to see categorized skill chips (Offensive Security, Cloud & Infrastructure, Defensive Hardening, Systems & WebGL), so that I can quickly assess technology stack fit.
15. As a visitor, I want to explore Station 04 (Transmission) and view a simulated cloud terminal outputting system status and GPG key verification, so that I get a memorable engineering experience.
16. As a collaborator, I want direct links to GitHub and an encrypted email contact trigger in Station 04, so that I can initiate contact securely.
17. As a user with an older laptop or phone, I want the rendering loop to automatically throttle (Idle Damping) when I am reading without moving the mouse, so that the website does not drain my battery or cause loud fan noise.
18. As a user browsing multiple tabs, I want the 3D rendering loop to completely freeze (0% CPU/GPU) when the tab is hidden, so that background resources are conserved.
19. As a screen-reader user, I want ARIA live region announcements on station transitions and fully accessible semantic HTML card structures, so that I can navigate the portfolio without vision barriers.
20. As a user on a high-DPI display (Retina/4K), I want rendering clamped to a sustainable pixel ratio, so that frame rates stay locked at 60 FPS without stutter.

## Implementation Decisions

### Design System & Theme
- **Ice White Canvas**: Base background set to crisp ice white `#F4F7FB`, contrasting with soft elevated white cards (`#FFFFFF`) with subtle ambient multi-layer drop shadows (`rgba(15, 23, 42, 0.06)`).
- **Semantic Palette**:
  - Blue (`#0284C7`): Network routes, cluster gateways, primary actions.
  - Green (`#16A34A`): Operational health, defense mitigations, security badges.
  - Yellow/Amber (`#D97706`): Telemetry, compute worker nodes, packet signals.
  - Red (`#DC2626`): Exploit vectors, offensive research, vulnerability alerts.
- **Typography**: Inter / JetBrains Mono for telemetry and system chips.

### 3D Cloud Mesh Topology
- Procedural Three.js particle and node graph replacing all crystal geometries and flare sprites.
- Node types: Core Ingress Controller, Microservice Clusters, Storage Nodes, and Packet Pulses traversing bezier curves.
- Input interaction: Mouse/touch position acts as an attractor/repulsor with spring-damper physics (`lerp` with stiffness 0.12 and damping 0.85), providing immediate tactile feedback.

### Navigation & UX
- Minimalist floating HUD: Clean pill bar displaying `01 // GATEWAY`, `02 // LAB`, `03 // ARSENAL`, `04 // TRANSMISSION`.
- Zero debug UI: All experimental sliders, wireframe toggles, and A/B switchers removed.
- Mobile Adaptation: On viewports `< 768px`, the 3D canvas is positioned in an interactive header frame or subtle lower-power background, while content flows as comfortable full-width swipeable cards.

### Performance
- Idle Damping active after 2.5s of inactivity, reducing render calls from 60 FPS to 15 FPS.
- Page Visibility API pauses `requestAnimationFrame` when tab is backgrounded.
- Device Pixel Ratio clamped at `Math.min(window.devicePixelRatio, 1.75)`.

## Testing Decisions

- **Quality Standard**: Tests must verify observable external behavior (user interactions, DOM updates, accessible state, camera station triggers), never internal Three.js matrix coordinates or private helper functions.
- **Modules Tested**:
  - `PortfolioApp`: Full lifecycle initialization, station navigation (`navigateTo`), ARIA announcements, and DOM updates.
  - `CloudMeshTopology`: Node count validation, color mapping, and pointer spring physics bounds.
  - `IdleManager`: Idle timeout trigger and wake-up event dispatching.
- **Prior Art**: Modern Vitest / Playwright component and integration testing patterns.

## Out of Scope

- Backend server infrastructure or dynamic database storage (site remains 100% static on GitHub Pages).
- Contact form backend processing (relies on direct `mailto:` and GitHub links).
- Audio soundscape (eliminated to keep the experience lightweight and enterprise-focused).

## Further Notes

- Build target remains static Vite bundling deployable to GitHub Pages with `.nojekyll`.
- All legacy Jekyll files (`_config.yml`, `jekyll-gh-pages.yml`) will be cleanly deprecated upon production merge.
