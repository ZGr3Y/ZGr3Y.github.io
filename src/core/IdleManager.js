/**
 * IdleManager - Manages inactivity detection, power-saving damping,
 * progressive slow-motion deceleration curves, and Page Visibility integration.
 */
export class IdleManager {
  /**
   * @param {Object} options
   * @param {number} [options.idleTimeoutMs=5000] - Duration of inactivity before entering idle (ms)
   * @param {number} [options.decelSpeed=2.5] - Exponential decay rate when decelerating
   * @param {number} [options.accelSpeed=3.5] - Linear/lerp recovery rate when waking
   * @param {Function} [options.onIdle] - Callback invoked when entering idle state
   * @param {Function} [options.onWake] - Callback invoked when activity resumes
   * @param {Window} [options.target] - Event target for interaction listeners (defaults to window)
   */
  constructor({
    idleTimeoutMs = 5000,
    decelSpeed = 2.5,
    accelSpeed = 3.5,
    onIdle = null,
    onWake = null,
    target = typeof window !== 'undefined' ? window : null
  } = {}) {
    this._idleTimeoutMs = idleTimeoutMs;
    this._decelSpeed = decelSpeed;
    this._accelSpeed = accelSpeed;
    this._onIdle = onIdle;
    this._onWake = onWake;
    this._target = target;

    this._lastActivityTime = Date.now();
    this._isIdle = false;
    this._speedFactor = 1.0;
    this._targetSpeedFactor = 1.0;

    // Bound event handlers to allow clean disposal
    this._handleActivity = () => this.recordActivity();
    this._handleVisibilityChange = () => this._onVisibilityChange();

    this._bindEvents();
  }

  /**
   * Binds interaction events to detect user presence
   * @private
   */
  _bindEvents() {
    if (this._target && typeof this._target.addEventListener === 'function') {
      this._target.addEventListener('pointermove', this._handleActivity);
      this._target.addEventListener('touchstart', this._handleActivity);
      this._target.addEventListener('keydown', this._handleActivity);
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', this._handleVisibilityChange);
    }
  }

  /**
   * Handles Page Visibility API changes (tab switching / app hidden)
   * @private
   */
  _onVisibilityChange() {
    if (typeof document !== 'undefined' && document.hidden) {
      if (!this._isIdle) {
        this._isIdle = true;
        if (this._onIdle) this._onIdle();
      }
      this._targetSpeedFactor = 0.0;
      this._speedFactor = 0.0; // Immediate halt to preserve GPU/battery
    } else {
      this.recordActivity();
    }
  }

  /**
   * Evaluates if idle timeout has elapsed
   * @private
   */
  _checkIdleState() {
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    const elapsed = Date.now() - this._lastActivityTime;
    if (elapsed >= this._idleTimeoutMs) {
      if (!this._isIdle) {
        this._isIdle = true;
        this._targetSpeedFactor = 0.0;
        if (this._onIdle) this._onIdle();
      }
    }
  }

  /**
   * Records a user interaction, resetting the idle counter and initiating acceleration
   */
  recordActivity() {
    this._lastActivityTime = Date.now();

    if (this._isIdle) {
      this._isIdle = false;
      this._targetSpeedFactor = 1.0;
      if (this._onWake) this._onWake();
    } else {
      this._targetSpeedFactor = 1.0;
    }
  }

  /**
   * Returns whether the manager is currently in idle state
   * @returns {boolean}
   */
  isIdle() {
    this._checkIdleState();
    return this._isIdle;
  }

  /**
   * Returns current progressive animation speed factor [0.0 - 1.0]
   * @returns {number}
   */
  getSpeedFactor() {
    return this._speedFactor;
  }

  /**
   * Advances the interpolation of speed factor by the elapsed delta time
   * @param {number} [delta=0.016] - Frame delta time in seconds
   */
  update(delta = 0.016) {
    this._checkIdleState();

    if (typeof document !== 'undefined' && document.hidden) {
      this._speedFactor = 0.0;
      return;
    }

    const rate = this._isIdle ? this._decelSpeed : this._accelSpeed;
    const factor = Math.min(1.0, Math.max(0.0, delta * rate));

    this._speedFactor += (this._targetSpeedFactor - this._speedFactor) * factor;

    // Numerical precision clamping
    if (this._isIdle && this._speedFactor < 0.01) {
      this._speedFactor = 0.0;
    } else if (!this._isIdle && this._speedFactor > 0.99) {
      this._speedFactor = 1.0;
    }
  }

  /**
   * Cleanly disposes all attached listeners to avoid memory leaks
   */
  dispose() {
    if (this._target && typeof this._target.removeEventListener === 'function') {
      this._target.removeEventListener('pointermove', this._handleActivity);
      this._target.removeEventListener('touchstart', this._handleActivity);
      this._target.removeEventListener('keydown', this._handleActivity);
    }

    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    }
  }
}
