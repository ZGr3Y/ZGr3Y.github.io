/**
 * LoaderUI — DOM & SVG "DON'T PANIC" Progress Component
 * Renders circular SVG progress with curved textPath, centered glitch counter,
 * and falling whale & bowl of petunias artifacts below the ring.
 */
export class LoaderUI {
  constructor() {
    this.container = null;
    this.root = null;
    this.ringWrapper = null;
    this.arcCircle = null;
    this.counterEl = null;
    this.isDisposed = false;
    this.isReady = false;
    this._onEnter = null;
  }

  /**
   * Sets callback to invoke when user clicks to enter
   * @param {Function} cb
   */
  onEnter(cb) {
    this._onEnter = cb;
  }

  /**
   * Mounts the loader into the specified DOM container
   * @param {HTMLElement} container
   */
  mount(container) {
    if (this.isDisposed || !container) return;
    this.container = container;

    const wrapper = document.createElement('div');
    wrapper.className = 'narrative-loader';
    wrapper.setAttribute('role', 'progressbar');
    wrapper.setAttribute('aria-label', 'Loading interactive 3D journey');
    wrapper.setAttribute('aria-valuenow', '0');
    wrapper.setAttribute('aria-valuemin', '0');
    wrapper.setAttribute('aria-valuemax', '100');

    wrapper.innerHTML = `
      <div class="loader-ring-wrapper">
        <svg class="loader-svg" viewBox="0 0 240 240" aria-hidden="true">
          <defs>
            <path id="dont-panic-circle-path" d="M 40,120 A 80,80 0 1,1 200,120 A 80,80 0 1,1 40,120" />
          </defs>
          <circle class="loader-track" cx="120" cy="120" r="80" />
          <circle class="loader-arc" cx="120" cy="120" r="80" />
          <text class="loader-textpath-element" font-family="'JetBrains Mono', monospace" font-weight="800" letter-spacing="0.18em">
            <textPath href="#dont-panic-circle-path" startOffset="50%" text-anchor="middle">DON'T PANIC</textPath>
          </text>
        </svg>
        <div class="loader-counter" aria-hidden="true">0%</div>
      </div>

      <div class="loader-falling-artifacts" aria-hidden="true">
        <div class="falling-whale">
          <svg viewBox="0 0 100 50" class="falling-whale-svg">
            <path d="M10,25 C20,10 50,8 75,18 C85,22 95,20 98,15 C96,25 90,32 75,34 C50,38 30,36 18,32 C12,30 10,27 10,25 Z M70,18 C65,12 60,10 55,10 C58,15 62,17 70,18 Z M35,32 C38,36 42,38 45,38 C42,35 40,33 35,32 Z" fill="currentColor" />
            <circle cx="20" cy="22" r="1.5" fill="#ffffff" />
          </svg>
        </div>
        <div class="falling-petunias">
          <svg viewBox="0 0 60 50" class="falling-petunias-svg">
            <polygon points="18,22 42,22 38,44 22,44" fill="currentColor" opacity="0.85" />
            <rect x="16" y="19" width="28" height="4" rx="1.5" fill="currentColor" />
            <circle cx="24" cy="14" r="5" fill="#f43f5e" opacity="0.9" />
            <circle cx="36" cy="14" r="5" fill="#38bdf8" opacity="0.9" />
            <circle cx="30" cy="10" r="5.5" fill="#a855f7" opacity="0.9" />
            <circle cx="30" cy="12" r="2" fill="#fbbf24" />
          </svg>
        </div>
      </div>
    `;

    this.root = wrapper;
    this.ringWrapper = wrapper.querySelector('.loader-ring-wrapper');
    this.arcCircle = wrapper.querySelector('.loader-arc');
    this.counterEl = wrapper.querySelector('.loader-counter');

    const handleTrigger = () => {
      if (this.isReady && typeof this._onEnter === 'function') {
        this._onEnter();
      }
    };

    if (this.ringWrapper) {
      this.ringWrapper.addEventListener('click', handleTrigger);
      this.ringWrapper.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTrigger();
        }
      });
    }

    if (this.arcCircle) {
      const radius = 80;
      const circumference = 2 * Math.PI * radius;
      this.arcCircle.style.strokeDasharray = `${circumference}`;
      this.arcCircle.style.strokeDashoffset = `${circumference}`;
    }

    container.appendChild(wrapper);

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('has-loader-active');
    }
  }

  /**
   * Updates progress visual representation
   * @param {Object} state
   * @param {number} state.actualPercent - Real progression (0 to 100)
   * @param {number} state.displayPercent - Visual progression (glitches on 42)
   * @param {boolean} state.isGlitching - Whether glitch animation is active
   * @param {boolean} [state.isReady=false] - Whether loader is in ready-to-enter state
   */
  update({ actualPercent = 0, displayPercent = 0, isGlitching = false, isReady = false } = {}) {
    if (this.isDisposed || !this.root) return;

    this.root.setAttribute('aria-valuenow', String(actualPercent));

    if (isReady && !this.isReady) {
      this.isReady = true;
      this.root.classList.add('is-ready');
      if (this.ringWrapper) {
        this.ringWrapper.setAttribute('role', 'button');
        this.ringWrapper.setAttribute('tabindex', '0');
        this.ringWrapper.setAttribute('aria-label', 'Enter Portfolio');
      }
      if (this.counterEl) {
        this.counterEl.innerHTML = `
          <span class="enter-label">ENTER</span>
          <span class="enter-sub">// CLICK //</span>
        `;
      }
    } else if (!this.isReady) {
      if (this.counterEl) {
        this.counterEl.textContent = `${displayPercent}%`;
      }
    }

    if (this.arcCircle) {
      const radius = 80;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (actualPercent / 100) * circumference;
      this.arcCircle.style.strokeDashoffset = `${offset}`;
    }

    if (isGlitching) {
      this.root.classList.add('glitching');
    } else {
      this.root.classList.remove('glitching');
    }
  }

  /**
   * Smoothly fades out the loader overlay before unmounting from DOM
   * @param {number} [durationMs=400]
   * @returns {Promise<void>}
   */
  dismiss(durationMs = 400) {
    if (this.isDisposed || !this.root) return Promise.resolve();

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('has-loader-active');
    }

    this.root.classList.add('loader-hidden');

    return new Promise((resolve) => {
      this._dismissTimer = setTimeout(() => {
        this.unmount();
        resolve();
      }, durationMs);
    });
  }

  /**
   * Unmounts element from the DOM
   */
  unmount() {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('has-loader-active');
    }
    if (this._dismissTimer) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.root = null;
    this.ringWrapper = null;
    this.arcCircle = null;
    this.counterEl = null;
    this._onEnter = null;
  }

  /**
   * Teardown per CODING_STANDARDS.md §7
   */
  dispose() {
    this.isDisposed = true;
    if (this._dismissTimer) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
    this.unmount();
    this.container = null;
  }
}
