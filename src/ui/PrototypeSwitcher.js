/**
 * Prototype Variant Switcher (Floating Bottom Bar)
 * Implements the prototype skill specification (prototype/UI.md):
 * - Left arrow (previous variant, wraps around)
 * - Variant label (shows current variant key and exported name)
 * - Right arrow (next variant, wraps around)
 * - Keyboard navigation (← and → arrow keys cycle variants, plus [V] shortcut)
 * - URL search param synchronization (?variant=A | ?variant=B)
 */
export class PrototypeSwitcher {
  constructor({ container, activeVariant = 'A', onVariantChange = () => {} }) {
    this.container = container;
    this.variants = ['A', 'B'];
    this.activeVariant = this.variants.includes(activeVariant) ? activeVariant : 'A';
    this.onVariantChange = onVariantChange;

    this.variantMeta = {
      A: {
        name: 'Variant A: Optics & Panoramic Glass',
        short: 'Optics & Flares',
        desc: 'Panoramic layout, anamorphic flares, chromatic aberration & holographic glass panels'
      },
      B: {
        name: 'Variant B: 3D Sculptures & Spatial Cockpit',
        short: '3D Sculptures',
        desc: 'Asymmetric cockpit layout framing real-time refractive 3D glass crystals & interactive inspector'
      }
    };

    this.render();
    this.initKeyboardShortcut();
  }

  render() {
    const meta = this.variantMeta[this.activeVariant];

    this.container.innerHTML = `
      <div class="switcher-bar" role="toolbar" aria-label="Prototype Variant Switcher">
        <!-- Prev Variant Arrow -->
        <button class="switcher-arrow-btn prev-btn" id="switcher-prev" aria-label="Previous variant (Left Arrow)" title="Previous variant [←]">
          <span aria-hidden="true">←</span>
        </button>

        <!-- Variant Label & Identity -->
        <div class="switcher-identity">
          <div class="switcher-tag">
            <span class="switcher-pulse"></span>
            <span class="switcher-badge">PROTOTYPE [${this.activeVariant}]</span>
          </div>
          <div class="switcher-title" id="switcher-active-name" title="${meta.desc}">
            ${meta.name}
          </div>
        </div>

        <!-- Direct Variant Toggle Buttons -->
        <div class="switcher-pills" role="tablist">
          <button class="switcher-pill ${this.activeVariant === 'A' ? 'active' : ''}" data-variant="A" role="tab" aria-selected="${this.activeVariant === 'A'}">
            A
          </button>
          <button class="switcher-pill ${this.activeVariant === 'B' ? 'active' : ''}" data-variant="B" role="tab" aria-selected="${this.activeVariant === 'B'}">
            B
          </button>
        </div>

        <!-- Next Variant Arrow -->
        <button class="switcher-arrow-btn next-btn" id="switcher-next" aria-label="Next variant (Right Arrow)" title="Next variant [→]">
          <span aria-hidden="true">→</span>
        </button>

        <!-- Keyboard Shortcut Hint -->
        <div class="switcher-hints" title="Use Arrow Left/Right or key V to cycle variants">
          <span class="key-badge">←/→</span>
          <span class="key-badge">V</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const prevBtn = this.container.querySelector('#switcher-prev');
    const nextBtn = this.container.querySelector('#switcher-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.cycleVariant(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.cycleVariant(1);
      });
    }

    this.container.querySelectorAll('.switcher-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const variant = pill.dataset.variant;
        this.selectVariant(variant);
      });
    });
  }

  initKeyboardShortcut() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept arrow keys or typing when input, textarea, or contenteditable is focused
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.cycleVariant(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.cycleVariant(1);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        this.cycleVariant(1);
      }
    });
  }

  cycleVariant(direction) {
    const currentIdx = this.variants.indexOf(this.activeVariant);
    const nextIdx = (currentIdx + direction + this.variants.length) % this.variants.length;
    this.selectVariant(this.variants[nextIdx]);
  }

  selectVariant(variant) {
    if (!this.variants.includes(variant)) return;
    if (this.activeVariant === variant) return;

    this.activeVariant = variant;
    const meta = this.variantMeta[variant];

    // Update Pills
    this.container.querySelectorAll('.switcher-pill').forEach((pill) => {
      const isCurrent = pill.dataset.variant === variant;
      pill.classList.toggle('active', isCurrent);
      pill.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    // Update Label & Badge
    const badgeEl = this.container.querySelector('.switcher-badge');
    if (badgeEl) badgeEl.textContent = `PROTOTYPE [${variant}]`;

    const titleEl = this.container.querySelector('#switcher-active-name');
    if (titleEl) {
      titleEl.textContent = meta.name;
      titleEl.title = meta.desc;
    }

    // Synchronize URL query parameter without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant);
    window.history.replaceState({}, '', url.toString());

    this.onVariantChange(variant);
  }
}
