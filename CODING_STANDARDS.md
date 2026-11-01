# Coding Standards

Engineering standards enforced by the review agent during `/code-review` and by automated CI checks.

## 1. Static Assets & Vite Public Directory
- All downloadable binaries, PDFs, images, or media referenced in the application must reside strictly within `public/`.
- Never place downloadable files in the repository root or assume Vite copies them from outside `public/`.
- Paths referenced in code for assets in `public/` must use `./<filename>` or `/<filename>`.

## 2. Responsive Viewports & Overflow Protection
- Every full-screen container or modal overlay must include `overflow-y: auto` and `-webkit-overflow-scrolling: touch`.
- Centered flex items inside scrollable containers must use `margin: auto 0` (or `margin: auto`) so content remains scrollable without top/bottom clipping on short landscape viewports or high zoom levels.

## 3. GitHub Actions CI/CD Workflows
- Any deploy job targeting GitHub Pages on the `main` branch must explicitly allow both `push` and `workflow_dispatch` events (`github.event_name == 'push' || github.event_name == 'workflow_dispatch'`).
- Actions must run `npm test` and `npm run build` deterministically before allowing deployment.

## 4. Local Development Server & Firewall
- The Vite development server must bind to all network interfaces (`host: true`) on port `8000` to maintain compatibility with the host Linux UFW firewall rules.

## 5. Animation Loop Suspension & Power Damping
- Any rendering animation loop using `requestAnimationFrame` must suspend execution (`_isLoopRunning = false`) when the scene settles into equilibrium during idle or when `document.hidden` is true (zero CPU/GPU wakeups).
- Suspended loops must resume immediately upon user interaction (`pointermove`, `touchstart`, `focus`, or station navigation).

## 6. Device Pixel Ratio (DPR) Clamping & Headless WebGL Safety
- Always clamp `renderer.setPixelRatio` with `Math.min(window.devicePixelRatio, 1.75)` to prevent thermal throttling and battery drain on high-DPI retina screens.
- Never instantiate `THREE.WebGLRenderer` unconditionally without checking `canvas.getContext('webgl2') || canvas.getContext('webgl')`, ensuring test environments (happy-dom) do not crash or log noisy warnings to stderr.

## 7. Uniform Resource Teardown Lifecycle
- All domain modules, controllers, and visual systems must implement a standardized teardown method named `dispose()` to guarantee complete garbage collection.
