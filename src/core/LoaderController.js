export const HITCHHIKER_GLITCH_NUMBER = 42;
export const DEFAULT_MIN_DWELL_MS = 4000;
export const DEFAULT_MAX_TIMEOUT_MS = 8000;

/**
 * LoaderController — Timing & "DON'T PANIC" 42 Glitch Coordinator
 * Enforces a minimum 4000ms dwell, synchronizes asset readiness,
 * and produces the hitchhiker glitch progression resetting display to 42.
 */
export class LoaderController {
  /**
   * @param {Object} [options]
   * @param {number} [options.minDwellMs=DEFAULT_MIN_DWELL_MS] - Minimum display dwell in milliseconds
   * @param {number} [options.maxTimeoutMs=DEFAULT_MAX_TIMEOUT_MS] - Fallback timeout if assets take too long
   * @param {Promise} [options.assetPromise] - Promise signaling asset readiness
   */
  constructor({ minDwellMs = DEFAULT_MIN_DWELL_MS, maxTimeoutMs = DEFAULT_MAX_TIMEOUT_MS, assetPromise = null } = {}) {
    this.minDwellMs = minDwellMs;
    this.maxTimeoutMs = maxTimeoutMs;
    this.assetPromise = assetPromise;

    this._progressCallbacks = [];
    this._completeCallbacks = [];

    this._isCompleted = false;
    this.isDisposed = false;
    this._isAssetReady = false;

    this._startTime = null;
    this._timer = null;
    this._tickInterval = null;

    this.actualPercent = 0;
    this.displayPercent = 0;
    this.isGlitching = false;

    if (this.assetPromise) {
      Promise.resolve(this.assetPromise)
        .then(() => {
          this._isAssetReady = true;
          this._checkCompletion();
        })
        .catch(() => {
          this._isAssetReady = true;
          this._checkCompletion();
        });
    } else {
      this._isAssetReady = true;
    }
  }

  /**
   * Registers a progress update listener
   * @param {Function} cb - Receives ({ actualPercent, displayPercent, isGlitching })
   */
  onProgress(cb) {
    if (typeof cb === 'function') {
      this._progressCallbacks.push(cb);
    }
  }

  /**
   * Registers a completion listener
   * @param {Function} cb
   */
  onComplete(cb) {
    if (typeof cb === 'function') {
      this._completeCallbacks.push(cb);
    }
  }

  /**
   * Starts the timer and progress tick loop
   */
  start() {
    if (this.isDisposed || this._tickInterval) return;

    this._startTime = Date.now();
    const TICK_INTERVAL_MS = 50;

    this._tickInterval = setInterval(() => {
      this._updateProgress();
    }, TICK_INTERVAL_MS);

    // Explicit timer for exact minimum dwell satisfaction
    this._dwellTimer = setTimeout(() => {
      this._checkCompletion();
    }, this.minDwellMs);

    // Fallback maximum timeout
    this._timeoutTimer = setTimeout(() => {
      this._checkCompletion();
    }, this.maxTimeoutMs);

    // Initial tick
    this._updateProgress();
  }

  /**
   * Updates time, glitch state, and checks completion conditions
   * @private
   */
  _updateProgress() {
    if (this.isDisposed || this._isCompleted) return;

    const elapsed = Date.now() - (this._startTime || Date.now());
    const dwellRatio = Math.min(1.0, elapsed / this.minDwellMs);
    this.actualPercent = Math.min(99, Math.floor(dwellRatio * 100));

    // Glitch windows: when climbing past 42% (at ~55%, ~77%, and ~92%), glitch back to 42
    const inFirstGlitch = elapsed >= 2200 && elapsed <= 2500;
    const inSecondGlitch = elapsed >= 3100 && elapsed <= 3400;
    const inLateGlitch = elapsed >= 3700 && elapsed <= 3900;

    if (inFirstGlitch || inSecondGlitch || inLateGlitch) {
      this.isGlitching = true;
      this.displayPercent = HITCHHIKER_GLITCH_NUMBER;
    } else {
      this.isGlitching = false;
      this.displayPercent = this.actualPercent;
    }

    this._emitProgress();
    this._checkCompletion(elapsed);
  }

  /**
   * Checks if both dwell and asset readiness criteria are satisfied
   * @param {number} [elapsed]
   * @private
   */
  _checkCompletion(elapsed = null) {
    if (this.isDisposed || this._isCompleted) return;

    const now = Date.now();
    const currentElapsed = elapsed !== null ? elapsed : (this._startTime ? now - this._startTime : 0);

    const dwellSatisfied = currentElapsed >= this.minDwellMs;
    const timedOut = currentElapsed >= this.maxTimeoutMs;
    const canComplete = (dwellSatisfied && this._isAssetReady) || timedOut;

    if (canComplete) {
      this._isCompleted = true;
      this.actualPercent = 100;
      this.displayPercent = 100;
      this.isGlitching = false;

      if (this._tickInterval) {
        clearInterval(this._tickInterval);
        this._tickInterval = null;
      }

      this._emitProgress();
      for (const cb of this._completeCallbacks) {
        try {
          cb();
        } catch (err) {
          console.error('[LoaderController] Error in complete callback:', err);
        }
      }
    }
  }

  /**
   * Emits progress state to registered listeners
   * @private
   */
  _emitProgress() {
    const state = {
      actualPercent: this.actualPercent,
      displayPercent: this.displayPercent,
      isGlitching: this.isGlitching
    };

    for (const cb of this._progressCallbacks) {
      try {
        cb(state);
      } catch (err) {
        console.error('[LoaderController] Error in progress callback:', err);
      }
    }
  }

  /**
   * Immediately completes loading if not already completed
   */
  complete() {
    this._isAssetReady = true;
    this._checkCompletion(this.minDwellMs);
  }

  /**
   * Returns whether loading has completed
   * @returns {boolean}
   */
  isCompleted() {
    return this._isCompleted;
  }

  /**
   * Teardown per CODING_STANDARDS.md §7
   */
  dispose() {
    this.isDisposed = true;
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
    if (this._dwellTimer) {
      clearTimeout(this._dwellTimer);
      this._dwellTimer = null;
    }
    if (this._timeoutTimer) {
      clearTimeout(this._timeoutTimer);
      this._timeoutTimer = null;
    }
    this._progressCallbacks = [];
    this._completeCallbacks = [];
  }
}
