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
