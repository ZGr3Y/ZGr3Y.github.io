import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JourneyState } from '../src/core/JourneyState.js';
import { ScrollEngine } from '../src/core/ScrollEngine.js';
import { JourneyHud } from '../src/ui/JourneyHud.js';
import { CreditsDialog } from '../src/ui/CreditsDialog.js';
import { PortfolioApp } from '../src/core/PortfolioApp.js';

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

      // Progress 0.5 & 0.6 (gated threshold boundary) -> Act 2 (Pill Choice)
      state.setProgress(0.5);
      expect(state.getCurrentSegment().id).toBe('act2');
      expect(state.getCurrentSegment().title).toContain('Pill Choice');

      state.setProgress(0.6);
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

      // 4. Multi-touch swipe (pinch-to-zoom) must be ignored
      const multiTouch = new TouchEvent('touchmove', {
        touches: [{ clientY: 200 }, { clientY: 250 }]
      });
      window.dispatchEvent(multiTouch);
      expect(engine.getTargetProgress()).toBe(0);

      // 5. Scroll headroom isolation per §8
      const scrollablePanel = document.createElement('div');
      scrollablePanel.style.overflowY = 'auto';
      Object.defineProperty(scrollablePanel, 'scrollHeight', { value: 500 });
      Object.defineProperty(scrollablePanel, 'clientHeight', { value: 200 });
      Object.defineProperty(scrollablePanel, 'scrollTop', { value: 50, writable: true });
      document.body.appendChild(scrollablePanel);

      const panelWheel = new WheelEvent('wheel', { deltaY: 50 });
      Object.defineProperty(panelWheel, 'target', { value: scrollablePanel });
      window.dispatchEvent(panelWheel);
      expect(engine.getTargetProgress()).toBe(0);

      // Touch started inside scrollable panel keeps entire gesture inside panel
      const panelTouchStart = new TouchEvent('touchstart', {
        touches: [{ clientY: 200 }]
      });
      Object.defineProperty(panelTouchStart, 'target', { value: scrollablePanel });
      window.dispatchEvent(panelTouchStart);

      const panelTouchMove = new TouchEvent('touchmove', {
        touches: [{ clientY: 150 }]
      });
      Object.defineProperty(panelTouchMove, 'target', { value: scrollablePanel });
      window.dispatchEvent(panelTouchMove);
      expect(engine.getTargetProgress()).toBe(0);

      window.dispatchEvent(new TouchEvent('touchend'));

      // 6. Modal scroll lock prevents progress mutation
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

    it('enforces repeat suppression and snap cooldown on keyboard stage snapping', () => {
      const state = new JourneyState();
      state.selectBranch('blue');
      const engine = new ScrollEngine({
        journeyState: state,
        snapMode: true,
        snapPoints: [0.20, 0.45, 0.70, 0.95],
        snapCooldownMs: 450
      });

      expect(engine.getTargetProgress()).toBe(0);

      // First ArrowDown snaps to 0.20
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: false }));
      expect(engine.getTargetProgress()).toBe(0.20);

      // Key repeat must be dropped
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: true }));
      expect(engine.getTargetProgress()).toBe(0.20);

      // Rapid successive keydown within cooldown must be dropped
      vi.advanceTimersByTime(200);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: false }));
      expect(engine.getTargetProgress()).toBe(0.20);

      // After cooldown (450ms), next ArrowDown snaps to 0.45
      vi.advanceTimersByTime(300);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: false }));
      expect(engine.getTargetProgress()).toBe(0.45);

      engine.dispose();
    });

    it('preserves branch gate cap and does not snap backwards when snapping forward at cap', () => {
      const state = new JourneyState();
      // Unselected branch caps max at 0.6
      expect(state.getMaxReachable()).toBe(0.6);

      const engine = new ScrollEngine({
        journeyState: state,
        snapPoints: [0.20, 0.45, 0.70, 0.95],
        snapMode: true
      });

      // Simulate reaching branch gate
      engine.setTargetProgress(0.6);
      expect(engine.getTargetProgress()).toBe(0.6);

      // Snapping forward when no further snap point is reachable under the 0.6 cap
      // must preserve 0.6 and NOT jump backwards to 0.45
      engine.snapDirection(1);
      expect(engine.getTargetProgress()).toBe(0.6);

      // Snapping backward from 0.6 snaps back to 0.45
      engine.snapDirection(-1);
      expect(engine.getTargetProgress()).toBe(0.45);

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

      // Approaching Act 2 gate threshold shows branch selection prompt
      state.setProgress(0.6);
      hud.update();
      const branchActions = container.querySelector('.journey-branch-actions');
      expect(branchActions.hasAttribute('hidden')).toBe(false);

      // Clicking blue branch choice unlocks state
      const blueBtn = branchActions.querySelector('.branch-blue');
      blueBtn.click();
      expect(state.getBranch()).toBe('blue');
      expect(state.getMaxReachable()).toBe(1.0);
      expect(branchActions.hasAttribute('hidden')).toBe(true);

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

  describe('PortfolioApp Integration (Journey Scroll & Legacy HUD Deprecation)', () => {
    it('deprecates legacy discrete HUD and coordinates modal scroll locking', () => {
      const container = document.createElement('div');
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');
      container.appendChild(canvas);
      container.appendChild(srAnnouncer);
      document.body.appendChild(container);

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableJourney: true
      });

      expect(app.journeyState).not.toBeNull();
      expect(app.scrollEngine).not.toBeNull();
      expect(app.journeyHud).not.toBeNull();
      expect(container.getAttribute('data-journey-active')).toBe('true');
      expect(app.hudNav).not.toBeNull();

      // Open credits dialog -> locks scrollEngine & sets activeModal
      app.creditsDialog.open();
      expect(app.activeModal).toBe('credits');
      expect(app.scrollEngine.isLocked()).toBe(true);

      // Close credits dialog -> unlocks scrollEngine & clears activeModal
      app.creditsDialog.close();
      expect(app.activeModal).toBeNull();
      expect(app.scrollEngine.isLocked()).toBe(false);

      app.destroy();
    });
  });
});
