/**
 * ScrollEngine — Fluid Inertial Scroll Controller
 * Translates wheel, touch, and keyboard interactions into spring-damped lerp progress.
 * Enforces CODING_STANDARDS §8 (scroll isolation, zoom key immunity, modal locking).
 */
export class ScrollEngine {
  /**
   * @param {Object} options
   * @param {import('./JourneyState.js').JourneyState} options.journeyState
   * @param {number} [options.lerpSpeed=0.08] Lerp dampening speed factor
   * @param {number} [options.sensitivity=0.0006] Wheel sensitivity
   * @param {number} [options.keyboardStep=0.05] Keyboard arrow progression step
   */
  constructor({
    journeyState,
    lerpSpeed = 0.08,
    sensitivity = 0.0006,
    keyboardStep = 0.05
  } = {}) {
    this.journeyState = journeyState;
    this.lerpSpeed = lerpSpeed;
    this.sensitivity = sensitivity;
    this.keyboardStep = keyboardStep;

    this.currentProgress = 0;
    this.targetProgress = 0;
    this.locked = false;

    this.touchStartY = 0;

    // Bound listeners for hermetic teardown
    this._onWheel = this._handleWheel.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('wheel', this._onWheel, { passive: false });
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('touchstart', this._onTouchStart, { passive: true });
      window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    }
  }

  /**
   * Returns current interpolated progress
   * @returns {number}
   */
  getCurrentProgress() {
    return this.currentProgress;
  }

  /**
   * Returns target intended progress
   * @returns {number}
   */
  getTargetProgress() {
    return this.targetProgress;
  }

  /**
   * Returns whether scroll navigation is currently locked (e.g. by an open modal)
   * @returns {boolean}
   */
  isLocked() {
    return this.locked;
  }

  /**
   * Locks or unlocks scroll navigation per CODING_STANDARDS §8
   * @param {boolean} locked
   */
  setLocked(locked) {
    this.locked = Boolean(locked);
  }

  /**
   * Sets target progress directly
   * @param {number} value
   */
  setTargetProgress(value) {
    if (this.locked) return;
    const max = this.journeyState ? this.journeyState.getMaxReachable() : 1.0;
    this.targetProgress = Math.max(0, Math.min(value, max));
  }

  /**
   * Advances the lerp smoothing physics tick
   * @param {number} delta Delta time in seconds
   */
  update(delta = 0.016) {
    if (!this.journeyState) return;

    const max = this.journeyState.getMaxReachable();
    this.targetProgress = Math.max(0, Math.min(this.targetProgress, max));

    // Smooth lerp interpolation
    const factor = Math.min(1.0, this.lerpSpeed * (delta / 0.016));
    this.currentProgress += (this.targetProgress - this.currentProgress) * factor;

    this.journeyState.setProgress(this.currentProgress);
  }

  /**
   * Handles wheel interactions, strictly isolating zoom keys per CODING_STANDARDS §8
   * @private
   */
  _handleWheel(e) {
    // Zoom keys immunity: ignore pinch-to-zoom and Ctrl/Cmd-wheel
    if (e.ctrlKey || e.metaKey || this.locked) return;

    const max = this.journeyState ? this.journeyState.getMaxReachable() : 1.0;
    const delta = e.deltaY * this.sensitivity;

    this.targetProgress = Math.max(0, Math.min(this.targetProgress + delta, max));
  }

  /**
   * Handles keyboard navigation (ArrowDown, ArrowUp, PageDown, PageUp)
   * @private
   */
  _handleKeyDown(e) {
    if (e.ctrlKey || e.metaKey || this.locked) return;

    // Do not intercept keyboard shortcuts when user is typing in form controls
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }

    const max = this.journeyState ? this.journeyState.getMaxReachable() : 1.0;

    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      this.targetProgress = Math.max(0, Math.min(this.targetProgress + this.keyboardStep, max));
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      this.targetProgress = Math.max(0, Math.min(this.targetProgress - this.keyboardStep, max));
    }
  }

  /**
   * Handles touch start
   * @private
   */
  _handleTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
      this.touchStartY = e.touches[0].clientY;
    }
  }

  /**
   * Handles touch move swipe
   * @private
   */
  _handleTouchMove(e) {
    if (this.locked || !e.touches || e.touches.length === 0) return;

    const currentY = e.touches[0].clientY;
    const deltaY = this.touchStartY - currentY;
    this.touchStartY = currentY;

    const max = this.journeyState ? this.journeyState.getMaxReachable() : 1.0;
    const delta = deltaY * this.sensitivity * 2.0;

    this.targetProgress = Math.max(0, Math.min(this.targetProgress + delta, max));
  }

  /**
   * Cleans up event listeners and references
   */
  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('wheel', this._onWheel);
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('touchstart', this._onTouchStart);
      window.removeEventListener('touchmove', this._onTouchMove);
    }
  }
}
