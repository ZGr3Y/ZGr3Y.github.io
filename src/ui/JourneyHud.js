/**
 * JourneyHud — Minimal Narrative Progress HUD
 * Renders a thin, non-intrusive progress track, current chapter telemetry,
 * and an accessible Credits dialog trigger.
 */
export class JourneyHud {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container Target container element
   * @param {import('../core/JourneyState.js').JourneyState} options.journeyState
   * @param {Function} [options.onOpenCredits]
   */
  constructor({ container, journeyState, onOpenCredits } = {}) {
    this.container = container;
    this.journeyState = journeyState;
    this.onOpenCredits = onOpenCredits;

    this.root = null;
    this.progressBar = null;
    this.chapterLabel = null;
    this.creditsBtn = null;
    this.branchActions = null;
  }

  /**
   * Mounts the HUD element inside the target container
   */
  mount() {
    if (!this.container) return;

    this.root = document.createElement('header');
    this.root.className = 'journey-hud-root';
    this.root.setAttribute('aria-label', 'Narrative Journey Navigation and Telemetry');

    this.root.innerHTML = `
      <div class="journey-progress-track" role="progressbar" aria-label="Journey Progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
        <div class="journey-progress-bar"></div>
      </div>
      <div class="journey-hud-content">
        <div class="journey-chapter-info">
          <span class="journey-telemetry-dot" aria-hidden="true"></span>
          <span class="journey-chapter-label">ACT 00 // DON'T PANIC</span>
        </div>
        <div class="journey-branch-actions" hidden>
          <span class="branch-prompt-text">CHOOSE PATH:</span>
          <button type="button" class="btn-branch-choice branch-blue" aria-label="Choose Blue Pill: Experiences">
            <span>EXPERIENCES (BLUE)</span>
          </button>
          <button type="button" class="btn-branch-choice branch-red" aria-label="Choose Red Pill: Harness">
            <span>HARNESS (RED)</span>
          </button>
        </div>
        <div class="journey-hud-actions">
          <button type="button" class="btn-credits-trigger" aria-label="Open 3D Model Credits and Attributions">
            <span>CREDITS</span>
          </button>
        </div>
      </div>
    `;

    this.progressBar = this.root.querySelector('.journey-progress-bar');
    this.chapterLabel = this.root.querySelector('.journey-chapter-label');
    this.creditsBtn = this.root.querySelector('.btn-credits-trigger');
    this.branchActions = this.root.querySelector('.journey-branch-actions');

    const blueBtn = this.root.querySelector('.branch-blue');
    const redBtn = this.root.querySelector('.branch-red');

    if (blueBtn && this.journeyState) {
      blueBtn.addEventListener('click', () => {
        this.journeyState.selectBranch('blue');
        this.update();
      });
    }

    if (redBtn && this.journeyState) {
      redBtn.addEventListener('click', () => {
        this.journeyState.selectBranch('red');
        this.update();
      });
    }

    if (this.creditsBtn && typeof this.onOpenCredits === 'function') {
      this.creditsBtn.addEventListener('click', () => this.onOpenCredits());
    }

    this.container.appendChild(this.root);
    this.update();
  }

  /**
   * Updates visual progress bar and chapter title
   */
  update() {
    if (!this.root || !this.journeyState) return;

    const progress = this.journeyState.getProgress();
    const percent = Math.round(progress * 100);

    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
      const track = this.root.querySelector('.journey-progress-track');
      if (track) {
        track.setAttribute('aria-valuenow', String(percent));
      }
    }

    if (this.chapterLabel) {
      const segment = this.journeyState.getCurrentSegment();
      this.chapterLabel.textContent = `${segment.tag} // ${segment.title}`;
    }

    if (this.branchActions) {
      const shouldPrompt = this.journeyState.getBranch() === 'unselected' && progress >= 0.55;
      if (shouldPrompt) {
        this.branchActions.removeAttribute('hidden');
      } else {
        this.branchActions.setAttribute('hidden', '');
      }
    }
  }

  /**
   * Cleans up DOM elements
   */
  dispose() {
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.root = null;
    this.progressBar = null;
    this.chapterLabel = null;
    this.creditsBtn = null;
  }
}
