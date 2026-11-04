/**
 * CreditsDialog — Accessible 3D Creative Attributions Modal
 * Satisfies CODING_STANDARDS §10 (focus trap, ARIA dialog, Escape dismissal, focus restoration).
 */
export class CreditsDialog {
  /**
   * @param {Object} [options]
   * @param {Function} [options.onLockScroll] Callback to lock/unlock scroll engine
   */
  constructor({ onLockScroll } = {}) {
    this.onLockScroll = onLockScroll;
    this.dialogElement = null;
    this.triggerElement = null;
    this.isOpen = false;

    this._onKeyDown = this._handleKeyDown.bind(this);
  }

  /**
   * Opens the accessible credits modal
   * @param {HTMLElement} [triggerEl] Element that triggered the dialog
   */
  open(triggerEl = null) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.triggerElement = triggerEl || document.activeElement;

    if (typeof this.onLockScroll === 'function') {
      this.onLockScroll(true);
    }

    this._render();

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
    }
  }

  /**
   * Closes the dialog, restores focus, and unlocks scroll navigation
   */
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
    }

    if (this.dialogElement && this.dialogElement.parentNode) {
      this.dialogElement.parentNode.removeChild(this.dialogElement);
    }
    this.dialogElement = null;

    if (typeof this.onLockScroll === 'function') {
      this.onLockScroll(false);
    }

    if (this.triggerElement && typeof this.triggerElement.focus === 'function') {
      this.triggerElement.focus();
    }
  }

  /**
   * Renders the dialog DOM
   * @private
   */
  _render() {
    this.dialogElement = document.createElement('div');
    this.dialogElement.className = 'credits-dialog-backdrop';

    this.dialogElement.innerHTML = `
      <div class="credits-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="credits-title" aria-describedby="credits-desc">
        <header class="credits-dialog-header">
          <h2 id="credits-title" class="credits-title">CREATIVE & 3D ASSET ATTRIBUTIONS</h2>
          <button type="button" class="credits-close-btn" aria-label="Close Credits Dialog">×</button>
        </header>
        <div id="credits-desc" class="credits-dialog-body">
          <p class="credits-intro">
            This spatial narrative portfolio utilizes optimized, low-poly 3D models under Creative Commons and open-source licenses.
          </p>
          <ul class="credits-list">
            <li>
              <strong>The Hitchhiker's Guide to the Galaxy (3D Book)</strong> — Sketchfab (CC-BY 4.0).
            </li>
            <li>
              <strong>The Matrix White Room Environment</strong> — Sketchfab (CC-BY 4.0).
            </li>
            <li>
              <strong>Creation of Intelligence (Human & Robotic Hands)</strong> — Sketchfab (CC-BY 4.0).
            </li>
            <li>
              <strong>Blade Runner Origami Unicorn</strong> — Sketchfab (CC-BY 4.0).
            </li>
            <li>
              <strong>Portal 2 Wheatley Personality Core</strong> — Valve Corporation / Sketchfab (CC-BY 4.0).
            </li>
            <li>
              <strong>Rick's Space Cruiser (Rick and Morty)</strong> — Sketchfab (CC-BY 4.0).
            </li>
            <li>
              <strong>Tech Stack & Toolchain Brand Icons</strong> — Simple Icons (CC0 1.0 Universal).
            </li>
          </ul>
        </div>
        <footer class="credits-dialog-footer">
          <button type="button" class="btn btn-primary credits-confirm-btn">Close Attributions</button>
        </footer>
      </div>
    `;

    const closeBtn = this.dialogElement.querySelector('.credits-close-btn');
    const confirmBtn = this.dialogElement.querySelector('.credits-confirm-btn');

    closeBtn.addEventListener('click', () => this.close());
    confirmBtn.addEventListener('click', () => this.close());

    // Click outside panel closes dialog
    this.dialogElement.addEventListener('click', (e) => {
      if (e.target === this.dialogElement) {
        this.close();
      }
    });

    document.body.appendChild(this.dialogElement);

    // Initial focus placed on close button
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  /**
   * Keyboard handling for Escape closure and Focus Trap (CODING_STANDARDS §10)
   * @private
   */
  _handleKeyDown(e) {
    if (!this.isOpen || !this.dialogElement) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = this.dialogElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  /**
   * Cleans up dialog DOM and listeners
   */
  dispose() {
    this.close();
  }
}
