import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Mobile-First Ergonomics & Touch Target A11y (Issue #11)', () => {
  let css;

  beforeEach(() => {
    css = fs.readFileSync(path.resolve(__dirname, '../src/styles/main.css'), 'utf-8');
  });

  it('enforces WCAG >= 44px minimum touch targets on interactive controls', () => {
    // 1. Modal close button must have at least 44px min-width and min-height
    expect(css).toMatch(/\.modal-close-btn\s*\{[^}]*min-width:\s*(?:4[4-9]|[5-9]\d)px/);
    expect(css).toMatch(/\.modal-close-btn\s*\{[^}]*min-height:\s*(?:4[4-9]|[5-9]\d)px/);

    // 2. HUD buttons must have min-height and min-width >= 44px for thumb accessibility
    expect(css).toMatch(/\.hud-btn\s*\{[^}]*min-height:\s*(?:4[4-9]|[5-9]\d)px/);
    expect(css).toMatch(/\.hud-btn\s*\{[^}]*min-width:\s*(?:4[4-9]|[5-9]\d)px/);

    // 3. Action buttons (Inspect Architecture, CV download, GitHub links) must have min-height and min-width >= 44px
    expect(css).toMatch(/\.btn-inspect\s*\{[^}]*min-height:\s*(?:4[4-9]|[5-9]\d)px/);
    expect(css).toMatch(/\.btn-inspect\s*\{[^}]*min-width:\s*(?:4[4-9]|[5-9]\d)px/);
    expect(css).toMatch(/\.btn\s*,\s*\.btn-cv\s*,\s*\.btn-github\s*\{[^}]*min-height:\s*(?:4[4-9]|[5-9]\d)px/);
    expect(css).toMatch(/\.btn\s*,\s*\.btn-cv\s*,\s*\.btn-github\s*\{[^}]*min-width:\s*(?:4[4-9]|[5-9]\d)px/);
  });

  it('configures mobile-first thumb navigation and canvas opacity under 768px media query', () => {
    // 1. Mobile media query must anchor HUD to thumb zone at bottom
    expect(css).toMatch(/@media\s*\(\s*max-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.hud-nav\s*\{[^}]*top:\s*auto;[^}]*bottom:/);

    // 2. Mobile 3D canvas must have reduced opacity and pointer-events none to avoid occlusion and scroll stutter
    expect(css).toMatch(/@media\s*\(\s*max-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.webgl-canvas\s*\{[^}]*pointer-events:\s*none;[^}]*opacity:\s*0\.[3-5]/);

    // 3. Station card must occupy full width and preserve margin: auto 0 to prevent vertical clipping (CODING_STANDARDS.md § 2)
    expect(css).toMatch(/@media\s*\(\s*max-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.station-card\s*\{[^}]*width:\s*100%/);
    expect(css).toMatch(/@media\s*\(\s*max-width:\s*768px\s*\)[^{]*\{[\s\S]*?\.station-card\s*\{[^}]*margin:\s*auto 0/);
  });
});
