/**
 * LoaderUI — DOM & SVG "DON'T PANIC" Progress Component
 * Renders circular SVG progress with curved textPath and centered glitch counter.
 */
export class LoaderUI {
  constructor() {
    this.container = null;
    this.root = null;
    this.arcCircle = null;
    this.counterEl = null;
    this.isDisposed = false;
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
          <text class="loader-textpath-element" font-family="'JetBrains Mono', monospace" font-weight="700" letter-spacing="0.15em">
            <textPath href="#dont-panic-circle-path" startOffset="50%" text-anchor="middle">DON'T PANIC</textPath>
          </text>
        </svg>
        <div class="loader-counter" aria-hidden="true">0%</div>
      </div>
    `;

    this.root = wrapper;
    this.arcCircle = wrapper.querySelector('.loader-arc');
    this.counterEl = wrapper.querySelector('.loader-counter');

    if (this.arcCircle) {
      const radius = 80;
      const circumference = 2 * Math.PI * radius;
      this.arcCircle.style.strokeDasharray = `${circumference}`;
      this.arcCircle.style.strokeDashoffset = `${circumference}`;
    }

    container.appendChild(wrapper);
  }

  /**
   * Updates progress visual representation
   * @param {Object} state
   * @param {number} state.actualPercent - Real progression (0 to 100)
   * @param {number} state.displayPercent - Visual progression (glitches on 42)
   * @param {boolean} state.isGlitching - Whether glitch animation is active
   */
  update({ actualPercent = 0, displayPercent = 0, isGlitching = false } = {}) {
    if (this.isDisposed || !this.root) return;

    this.root.setAttribute('aria-valuenow', String(actualPercent));

    if (this.counterEl) {
      this.counterEl.textContent = `${displayPercent}%`;
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
    if (this._dismissTimer) {
      clearTimeout(this._dismissTimer);
      this._dismissTimer = null;
    }
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.root = null;
    this.arcCircle = null;
    this.counterEl = null;
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
