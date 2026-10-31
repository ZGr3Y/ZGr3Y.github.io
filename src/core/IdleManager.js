/**
 * Idle Damping & Power Optimization Manager
 * Monitors user interaction and camera movement to step down GPU rendering loop when idle
 */
export class IdleManager {
  constructor({ idleTimeoutMs = 3000, onStateChange = () => {} } = {}) {
    this.idleTimeoutMs = idleTimeoutMs;
    this.onStateChange = onStateChange;

    this.isIdle = false;
    this.isCameraMoving = false;
    this.lastActivityTime = performance.now();
    this.lastRenderTime = 0;
    this.idleFps = 15; // Throttled FPS when static
    this.idleInterval = 1000 / this.idleFps;

    this.initListeners();
  }

  initListeners() {
    const wake = () => this.recordActivity();

    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('wheel', wake, { passive: true });
    window.addEventListener('keydown', wake, { passive: true });
    window.addEventListener('touchstart', wake, { passive: true });
    window.addEventListener('resize', wake, { passive: true });
  }

  recordActivity() {
    this.lastActivityTime = performance.now();
    if (this.isIdle) {
      this.isIdle = false;
      this.onStateChange(false);
    }
  }

  setCameraMoving(isMoving) {
    this.isCameraMoving = isMoving;
    if (isMoving) {
      this.recordActivity();
    }
  }

  /**
   * Called on every requestAnimationFrame. Returns true if frame should be rendered.
   */
  shouldRender(now) {
    // If camera is actively in flight or user has recently interacted, run at full frame rate
    const elapsedSinceActivity = now - this.lastActivityTime;

    if (this.isCameraMoving || elapsedSinceActivity < this.idleTimeoutMs) {
      if (this.isIdle) {
        this.isIdle = false;
        this.onStateChange(false);
      }
      return true;
    }

    // Static & Inactive -> Step down to idle damped framerate
    if (!this.isIdle) {
      this.isIdle = true;
      this.onStateChange(true);
    }

    if (now - this.lastRenderTime >= this.idleInterval) {
      this.lastRenderTime = now;
      return true;
    }

    return false;
  }
}
