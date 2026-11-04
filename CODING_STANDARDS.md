# Coding Standards

Engineering standards enforced by the review agent during `/code-review` and by automated CI checks.

## 1. Static Assets & Vite Public Directory
- All downloadable binaries, PDFs, images, or media referenced in the application must reside strictly within `public/`.
- Never place downloadable files in the repository root or assume Vite copies them from outside `public/`.
- Paths referenced in code for assets in `public/` must use `./<filename>` or `/<filename>`.

## 2. Responsive Viewports & Overflow Protection
- Every full-screen container or modal overlay must include `overflow-y: auto` and `-webkit-overflow-scrolling: touch`.
- Centered flex items inside scrollable containers must use `margin: auto 0` (or `margin: auto`) so content remains scrollable without top/bottom clipping on short landscape viewports or high zoom levels.
- Grid tracks for cards and multi-column layouts must use fluid minimum sizing (`minmax(min(100%, 260px), 1fr)`) paired with narrow-viewport breakpoints (`@media (max-width: 480px) { grid-template-columns: 1fr; }`) to prevent horizontal overflow and horizontal panning on mobile devices under 410px width.

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

## 8. Interactive Gestures & Scroll Isolation
- Window-level gesture listeners (`wheel`, `keydown`, `touchstart`/`touchend`) that trigger view transitions must ignore zoom modifier keys (`e.ctrlKey || e.metaKey`) to preserve native browser pinch-to-zoom and keyboard zoom shortcuts.
- Handlers must check whether the active content panel has remaining scroll headroom before consuming vertical navigation gestures (`direction > 0` and `direction < 0`).
- For multi-phase touch gestures, evaluate scrollability at `touchstart` rather than only at `touchend`, ensuring that gestures that reach a scroll boundary stay within the panel and never trigger view transitions on that same stroke.
- App-wide navigation listeners (`wheel`, `keydown`, `touch`) must strictly guard against active dialogs or overlays (`if (this.activeModal) return;`) so that keyboard navigation, scrolling, and gestures within an active modal never trigger background station transitions.

## 9. DOM Element Visibility & Hidden Attributes
- Whenever styling components with custom layout displays (`display: flex`, `display: grid`, etc.), always pair them with an explicit `.component[hidden], [hidden] { display: none !important; }` rule. Class selector specificity `(0, 1, 0)` will otherwise override the browser user-agent's default `[hidden] { display: none; }` `(0, 0, 0)` rule, leaving inactive elements rendered in the visual layout flow.
- All dynamic station overlays and multi-step UI views must adhere to this reset so that setting or removing the `hidden` attribute deterministically controls layout presence and screen reader visibility.

## 10. Accessible Dialogs & Focus Containment
- Every modal dialog or overlay must declare standard accessibility semantics (`role="dialog"`, `aria-modal="true"`, and `aria-label` / `aria-labelledby`).
- Upon opening, focus must immediately transition inside the dialog to the primary action or dismiss control (`closeBtn.focus()`) rather than lingering behind the overlay.
- Modals must implement strict Tab key containment (focus trap): cycling forward past the last focusable element wraps focus back to the first, and cycling backward (`Shift+Tab`) past the first wraps to the last.
- Dismissing the modal (via Escape key, backdrop click, or close button) must cleanly restore focus back to the triggering element.

## 11. 3D Asset Pipeline, Fatal Build Validation & Budgets
- Production 3D binary models (`.glb`) must reside strictly in `public/models/`. Raw uncompressed assets or editable scenes (e.g. `3dObj/`, `.blend`) must be excluded from version control via `.gitignore`.
- Offline asset optimization scripts (e.g. `npm run optimize:models`) must treat any missing configured source model as a fatal build error (`process.exit(1)`). Scripts must never warn-and-continue, which risks generating incomplete bundles or mistaking stale artifacts for regenerated ones.
- Asset budgets are strictly enforced by hermetic CI tests: no individual model may exceed 5 MB, and the total production 3D bundle must remain under 15 MB.
- All third-party 3D models must be accompanied by explicit attribution documentation (`docs/assets-licenses.md`) recording author, source URL, license type (e.g., CC-BY-4.0), and applied modifications.
