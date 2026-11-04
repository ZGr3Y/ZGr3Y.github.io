import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JourneyState } from '../src/core/JourneyState.js';
import { ScrollEngine } from '../src/core/ScrollEngine.js';
import { JourneyHud } from '../src/ui/JourneyHud.js';
import { CreditsDialog } from '../src/ui/CreditsDialog.js';

describe('Ticket 04: ScrollEngine, JourneyState, Minimal HUD & Credits Dialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('JourneyState (Timeline, Segments & Branch Gating)', () => {
    it('initializes at progress 0, unselected branch, and gates progress at Act 2', () => {
      const state = new JourneyState();

      expect(state.getProgress()).toBe(0);
      expect(state.getBranch()).toBe('unselected');
      expect(state.isGated()).toBe(false);

      // Advance into Act 2 (Pill Choice gate at progress 0.6)
      state.setProgress(0.5);
      expect(state.getProgress()).toBe(0.5);
      expect(state.isGated()).toBe(false);

      // Attempting to scroll past 0.6 while unselected is clamped
      state.setProgress(0.8);
      expect(state.getProgress()).toBe(0.6);
      expect(state.isGated()).toBe(true);

      // Selecting a branch unlocks the rest of the journey up to 1.0
      state.selectBranch('blue');
      expect(state.getBranch()).toBe('blue');
      expect(state.isGated()).toBe(false);

      state.setProgress(0.85);
      expect(state.getProgress()).toBe(0.85);

      state.setProgress(1.2);
      expect(state.getProgress()).toBe(1.0);
    });

    it('correctly reports current narrative segment and chapter metadata', () => {
      const state = new JourneyState();

      // Progress 0.0 -> Act 0
      state.setProgress(0.05);
      expect(state.getCurrentSegment().id).toBe('act0');
      expect(state.getCurrentSegment().title).toContain("DON'T PANIC");

      // Progress 0.3 -> Act 1
      state.setProgress(0.3);
      expect(state.getCurrentSegment().id).toBe('act1');
      expect(state.getCurrentSegment().title).toContain('Matrix White Room');

      // Progress 0.5 -> Act 2 (Pill Choice)
      state.setProgress(0.5);
      expect(state.getCurrentSegment().id).toBe('act2');
      expect(state.getCurrentSegment().title).toContain('Pill Choice');

      // Unlock and advance to Act 3 Blue
      state.selectBranch('blue');
      state.setProgress(0.7);
      expect(state.getCurrentSegment().id).toBe('act3_blue');
      expect(state.getCurrentSegment().title).toContain('Origami Unicorns');

      // If branch were red
      state.selectBranch('red');
      expect(state.getCurrentSegment().id).toBe('act3_red');
      expect(state.getCurrentSegment().title).toContain('Wheatley Core');

      // Progress 0.9 -> Act 4/5 (Rick's Ship / Shatter & Transmission)
      state.setProgress(0.9);
      expect(state.getCurrentSegment().id).toBe('act4');
      expect(state.getCurrentSegment().title).toContain('Transmission');
    });
  });

  describe('ScrollEngine (Fluid Inertial Lerp & CODING_STANDARDS §8 Isolation)', () => {
    it('translates wheel and key events to smooth lerp progress', async () => {
      const state = new JourneyState();
      const engine = new ScrollEngine({ journeyState: state, lerpSpeed: 0.1 });

      expect(engine.getTargetProgress()).toBe(0);
      expect(engine.getCurrentProgress()).toBe(0);

      // Simulate wheel event downwards
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 200 }));
      expect(engine.getTargetProgress()).toBeGreaterThan(0);

      // Update engine ticks to lerp towards target
      engine.update(0.016);
      expect(engine.getCurrentProgress()).toBeGreaterThan(0);
      expect(state.getProgress()).toBeCloseTo(engine.getCurrentProgress(), 2);

      engine.dispose();
    });

    it('satisfies CODING_STANDARDS §8: ignores zoom keys (ctrl/meta) and modal scroll locks', () => {
      const state = new JourneyState();
      const engine = new ScrollEngine({ journeyState: state });

      // 1. Wheel event with ctrlKey (browser pinch-to-zoom) must be ignored
      const zoomWheel = new WheelEvent('wheel', { deltaY: 300 });
      Object.defineProperty(zoomWheel, 'ctrlKey', { value: true });
      window.dispatchEvent(zoomWheel);
      expect(engine.getTargetProgress()).toBe(0);

      // 2. Wheel event with metaKey must be ignored
      const metaWheel = new WheelEvent('wheel', { deltaY: 300 });
      Object.defineProperty(metaWheel, 'metaKey', { value: true });
      window.dispatchEvent(metaWheel);
      expect(engine.getTargetProgress()).toBe(0);

      // 3. Arrow down with ctrlKey must be ignored
      const ctrlKey = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      Object.defineProperty(ctrlKey, 'ctrlKey', { value: true });
      window.dispatchEvent(ctrlKey);
      expect(engine.getTargetProgress()).toBe(0);

      // 4. Modal scroll lock prevents progress mutation
      engine.setLocked(true);
      expect(engine.isLocked()).toBe(true);

      const normalWheel = new WheelEvent('wheel', { deltaY: 300 });
      window.dispatchEvent(normalWheel);
      expect(engine.getTargetProgress()).toBe(0);

      engine.setLocked(false);
      window.dispatchEvent(normalWheel);
      expect(engine.getTargetProgress()).toBeGreaterThan(0);

      engine.dispose();
    });
  });

  describe('ui/JourneyHud (Minimal Progress Bar & Chapter Indicator)', () => {
    it('mounts minimal progress track, chapter label, and accessible credits trigger', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const state = new JourneyState();
      const onOpenCredits = vi.fn();
      const hud = new JourneyHud({ container, journeyState: state, onOpenCredits });
      hud.mount();

      const track = container.querySelector('.journey-progress-track');
      const bar = container.querySelector('.journey-progress-bar');
      const chapterLabel = container.querySelector('.journey-chapter-label');
      const creditsBtn = container.querySelector('.btn-credits-trigger');

      expect(track).not.toBeNull();
      expect(bar).not.toBeNull();
      expect(chapterLabel).not.toBeNull();
      expect(creditsBtn).not.toBeNull();
      expect(creditsBtn.getAttribute('aria-label')).toContain('Credits');

      // Click credits button triggers callback
      creditsBtn.click();
      expect(onOpenCredits).toHaveBeenCalledTimes(1);

      // Updating state reflects in HUD
      state.setProgress(0.5);
      hud.update();
      expect(bar.style.width).toBe('50%');
      expect(chapterLabel.textContent).toContain('Pill Choice');

      hud.dispose();
      expect(container.querySelector('.journey-hud-root')).toBeNull();
    });
  });

  describe('ui/CreditsDialog (Accessible Modal per CODING_STANDARDS §10)', () => {
    it('satisfies ARIA attributes, focus trap, Escape closure, and focus restoration', () => {
      const triggerBtn = document.createElement('button');
      triggerBtn.id = 'trigger-btn';
      triggerBtn.textContent = 'Credits';
      document.body.appendChild(triggerBtn);
      triggerBtn.focus();

      const scrollLockSpy = vi.fn();
      const dialog = new CreditsDialog({
        onLockScroll: scrollLockSpy
      });

      dialog.open(triggerBtn);

      const dialogEl = document.querySelector('[role="dialog"]');
      expect(dialogEl).not.toBeNull();
      expect(dialogEl.getAttribute('aria-modal')).toBe('true');
      expect(dialogEl.getAttribute('aria-labelledby')).not.toBeNull();
      expect(scrollLockSpy).toHaveBeenCalledWith(true);

      // Focus should move inside dialog
      const closeBtn = dialogEl.querySelector('.credits-close-btn');
      expect(document.activeElement).toBe(closeBtn);

      // Escape key closes dialog and restores focus
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(scrollLockSpy).toHaveBeenCalledWith(false);
      expect(document.activeElement).toBe(triggerBtn);

      dialog.dispose();
    });
  });
});
