import * as THREE from 'three';
import { STATIONS } from '../stations/stationsData.js';
import { CloudMeshTopology } from './CloudMeshTopology.js';
import { IdleManager } from './IdleManager.js';

/**
 * PortfolioApp — Primary Application Root Seam
 * Coordinates lifecycle, station state, 3D cloud mesh rendering, and external accessibility interfaces.
 */
export class PortfolioApp {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container] - Root DOM container (#app)
   * @param {HTMLCanvasElement} [options.canvas] - Target WebGL canvas (#cloud-canvas)
   * @param {HTMLElement} [options.srAnnouncer] - Live accessibility region
   */
  constructor({ container, canvas, srAnnouncer } = {}) {
    this.container = container;
    this.canvas = canvas;
    this.srAnnouncer = srAnnouncer || (typeof document !== 'undefined' ? document.getElementById('sr-announcements') : null);

    this.stations = STATIONS;
    this.currentStationIndex = 0;
    this.isDestroyed = false;

    // Three.js and rendering state
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.topology = null;
    this.idleManager = null;
    this._animFrameId = null;
    this._isLoopRunning = false;
    this._lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Floating Minimalist HUD Navigation state
    this.hudNav = null;
    this._hudButtons = [];

    // Spatial Camera Waypoint Controller state
    this._targetCamPos = new THREE.Vector3(0, 0, 16);
    this._targetCamLookAt = new THREE.Vector3(0, 0, 0);
    this._currentCamLookAt = new THREE.Vector3(0, 0, 0);
    this._isCameraTransitioning = false;

    // Sequential navigation debounce & touch swipe state
    this._lastNavTime = 0;
    this._navCooldownMs = 450;
    this._touchStartX = null;
    this._touchStartY = null;
    this._touchStartCanScrollDown = false;
    this._touchStartCanScrollUp = false;
    this.stationContainer = null;

    this.init();
  }

  /**
   * Initialize state, DOM hooks, and 3D graphics pipeline
   */
  init() {
    if (this.container) {
      this.container.setAttribute('data-active-station', this.stations[0].id);
      this.stationContainer = this.container.querySelector('.station-container') ||
        (typeof document !== 'undefined' ? document.getElementById('station-container') : null);
      this._initHUD();
      this._initStations();
    }

    if (this.canvas) {
      this._initThree();
    }
  }

  /**
   * Mounts and initializes the minimalist floating HUD station bar
   * @private
   */
  _initHUD() {
    if (!this.container || typeof document === 'undefined') return;

    let hud = this.container.querySelector('.hud-nav');
    if (!hud) {
      hud = document.createElement('nav');
      hud.className = 'hud-nav';
      hud.setAttribute('aria-label', 'Station Navigation');
      this.container.prepend(hud);
    }

    this.hudNav = hud;
    this._renderHUD();
  }

  /**
   * Populates the HUD buttons from the STATIONS registry
   * @private
   */
  _renderHUD() {
    if (!this.hudNav || typeof document === 'undefined') return;
    this.hudNav.innerHTML = '';
    this._hudButtons = [];

    this.stations.forEach((station, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hud-btn ${idx === this.currentStationIndex ? 'active' : ''}`;
      btn.setAttribute('data-station-index', String(idx));
      if (idx === this.currentStationIndex) {
        btn.setAttribute('aria-current', 'step');
      }

      const indexSpan = document.createElement('span');
      indexSpan.className = 'hud-index';
      indexSpan.textContent = station.index;

      const sepSpan = document.createElement('span');
      sepSpan.className = 'hud-sep';
      sepSpan.setAttribute('aria-hidden', 'true');
      sepSpan.textContent = '//';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'hud-name';
      nameSpan.textContent = station.name;

      btn.appendChild(indexSpan);
      btn.appendChild(sepSpan);
      btn.appendChild(nameSpan);

      btn.addEventListener('click', () => {
        this.navigateTo(idx);
      });

      this.hudNav.appendChild(btn);
      this._hudButtons.push(btn);
    });
  }

  /**
   * Initializes and manages station content overlays inside stationContainer
   * @private
   */
  _initStations() {
    if (!this.stationContainer || typeof document === 'undefined') return;

    this.stations.forEach((station) => {
      const existing = this.stationContainer.querySelector(`.station-card[data-station="${station.id}"]`);
      if (!existing) {
        if (station.id === 'gateway') {
          this._renderGatewayCard();
        } else if (station.id === 'lab') {
          this._renderLabCard();
        } else {
          this._renderStationPlaceholder(station);
        }
      }
    });

    this._updateStationVisibility();
  }

  /**
   * Renders semantic placeholder card for upcoming station slices
   * @param {Object} station
   * @private
   */
  _renderStationPlaceholder(station) {
    if (!this.stationContainer || typeof document === 'undefined') return;

    const card = document.createElement('section');
    card.className = `station-card ${station.id}-card`;
    card.setAttribute('data-station', station.id);
    card.setAttribute('aria-label', `Station ${station.index}: ${station.name}`);
    card.setAttribute('hidden', '');
    card.innerHTML = `
      <div class="station-badge">
        <span class="badge-dot" aria-hidden="true"></span>
        <span>STATION ${station.index} // ${station.name} PROTOCOL</span>
      </div>
      <h2 class="hero-name">${station.name}</h2>
      <div class="hero-role">
        <span class="hero-title">${station.subtitle}</span>
      </div>
      <p class="hero-bio">${station.description || 'Architecture and engineering artifacts in active configuration.'}</p>
    `;
    this.stationContainer.appendChild(card);
  }

  /**
   * Renders Station 01 Gateway Card markup
   * @private
   */
  _renderGatewayCard() {
    if (!this.stationContainer || typeof document === 'undefined') return;
    const gatewayData = this.stations.find((s) => s.id === 'gateway') || this.stations[0];
    const hero = gatewayData.hero || {};
    const actionsMarkup = (hero.actions || []).map((action) => {
      const isDownload = Boolean(action.isDownload);
      const downloadAttr = isDownload ? `download="${action.url.replace(/^.*[\\/]/, '')}"` : '';
      const externalAttrs = action.isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
      const btnClass = isDownload ? 'btn btn-cv' : 'btn btn-github';
      const icon = isDownload ? '↓' : '↗';
      return `
        <a href="${action.url}" ${downloadAttr} ${externalAttrs} class="${btnClass}" title="${action.label}">
          <span>${action.label}</span>
          <span class="btn-icon" aria-hidden="true">${icon}</span>
        </a>
      `;
    }).join('');

    const card = document.createElement('section');
    card.className = 'station-card gateway-card active';
    card.setAttribute('data-station', 'gateway');
    card.setAttribute('aria-label', 'Station 01: Gateway');
    card.innerHTML = `
      <div class="station-badge">
        <span class="badge-dot" aria-hidden="true"></span>
        <span>${hero.badge || 'SYSTEM ONLINE // CLOUD MESH PROTOCOL'}</span>
      </div>
      <h1 class="hero-name">${hero.name || 'PAOLO MARIA SCARLATA'}</h1>
      <div class="hero-role">
        <span class="hero-alias">${hero.alias || 'ZGr3Y'}</span>
        <span class="hero-sep" aria-hidden="true">//</span>
        <span class="hero-title">${hero.role || 'Cloud Systems & Security Engineer'}</span>
      </div>
      <p class="hero-bio">${hero.bio || ''}</p>
      <div class="station-actions">
        ${actionsMarkup}
      </div>
    `;
    this.stationContainer.appendChild(card);
  }

  /**
   * Renders Station 02 Lab Card with project Cloud Cards
   * @private
   */
  _renderLabCard() {
    if (!this.stationContainer || typeof document === 'undefined') return;
    const labData = this.stations.find((s) => s.id === 'lab') || this.stations[1];
    const projects = labData.projects || [];

    const card = document.createElement('section');
    card.className = 'station-card lab-card';
    card.setAttribute('data-station', 'lab');
    card.setAttribute('aria-label', `Station ${labData.index}: ${labData.name}`);
    card.setAttribute('hidden', '');

    const projectsMarkup = projects.map((project) => {
      const isWip = project.status === 'wip';
      const ghMarkup = project.github
        ? `<a href="${project.github}" target="_blank" rel="noopener noreferrer" class="btn btn-github btn-sm" title="View Source on GitHub">
             <span>GitHub</span>
             <span class="btn-icon" aria-hidden="true">↗</span>
           </a>`
        : '';
      const inspectMarkup = !isWip
        ? `<button type="button" class="btn btn-inspect btn-sm" data-project-id="${project.id}" aria-label="Inspect Architecture for ${project.title}">
             <span>Inspect Architecture</span>
             <span class="btn-icon" aria-hidden="true">🔍</span>
           </button>`
        : `<span class="badge-wip">IN DEVELOPMENT</span>`;
      const tagsMarkup = (project.tags || []).map((tag) => `<span class="tag-chip">${tag}</span>`).join('');
      const statusPill = !isWip
        ? `<span class="status-pill status-production">PRODUCTION</span>`
        : '';

      return `
        <article class="project-card ${isWip ? 'project-card-wip' : ''}" data-project="${project.id}">
          <div class="project-card-header">
            <span class="project-badge">${project.badge}</span>
            ${statusPill}
          </div>
          <h3 class="project-title">${project.title}</h3>
          <p class="project-desc">${project.shortDesc}</p>
          <div class="project-tags">
            ${tagsMarkup}
          </div>
          <div class="project-actions">
            ${inspectMarkup}
            ${ghMarkup}
          </div>
        </article>
      `;
    }).join('');

    card.innerHTML = `
      <div class="station-badge">
        <span class="badge-dot" aria-hidden="true"></span>
        <span>STATION ${labData.index} // ${labData.name} PROTOCOL</span>
      </div>
      <h2 class="hero-name">${labData.name}</h2>
      <div class="hero-role">
        <span class="hero-title">${labData.subtitle}</span>
      </div>
      <div class="lab-projects-grid">
        ${projectsMarkup}
      </div>
    `;

    card.addEventListener('click', (e) => {
      const inspectBtn = e.target.closest('.btn-inspect');
      if (inspectBtn) {
        const projectId = inspectBtn.getAttribute('data-project-id');
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          this._openArchitectureModal(project, inspectBtn);
        }
      }
    });

    this.stationContainer.appendChild(card);
  }

  /**
   * Opens the accessible Architecture Deep-Dive modal dialog
   * @param {Object} project
   * @param {HTMLElement} [triggerElement]
   * @private
   */
  _openArchitectureModal(project, triggerElement = null) {
    this._closeArchitectureModal();

    if (!this.container || typeof document === 'undefined') return;

    const modal = document.createElement('div');
    modal.className = 'architecture-modal architecture-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', `Architecture Deep-Dive: ${project.title}`);

    const tagsMarkup = (project.tags || []).map((t) => `<span class="tag-chip">${t}</span>`).join('');
    const ghMarkup = project.github
      ? `<a href="${project.github}" target="_blank" rel="noopener noreferrer" class="btn btn-github btn-sm" title="View Source on GitHub">
           <span>GitHub Repository</span>
           <span class="btn-icon" aria-hidden="true">↗</span>
         </a>`
      : '';

    modal.innerHTML = `
      <div class="architecture-modal-content">
        <header class="modal-header">
          <div class="modal-badge-group">
            <span class="project-badge">${project.badge}</span>
            <span class="status-pill status-production">PRODUCTION</span>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close modal">✕</button>
        </header>
        <h3 class="modal-title">${project.title}</h3>
        <p class="modal-full-desc">${project.fullDesc || project.shortDesc}</p>
        <div class="modal-tags">
          ${tagsMarkup}
        </div>
        <div class="modal-actions">
          ${ghMarkup}
        </div>
      </div>
    `;

    const closeBtn = modal.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this._closeArchitectureModal());
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this._closeArchitectureModal();
      }
    });

    this._modalTriggerElement = triggerElement;
    this._modalKeyHandler = (e) => {
      if (e.key === 'Escape') {
        this._closeArchitectureModal();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', this._modalKeyHandler);

    this.container.appendChild(modal);
    this.activeModal = modal;

    if (closeBtn && typeof closeBtn.focus === 'function') {
      closeBtn.focus();
    }
  }

  /**
   * Closes active architecture modal and cleans up listeners
   * @private
   */
  _closeArchitectureModal() {
    if (this._modalKeyHandler) {
      window.removeEventListener('keydown', this._modalKeyHandler);
      this._modalKeyHandler = null;
    }

    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }

    if (this._modalTriggerElement && typeof this._modalTriggerElement.focus === 'function') {
      this._modalTriggerElement.focus();
      this._modalTriggerElement = null;
    }
  }

  /**
   * Toggles visibility of station cards based on the currently active station
   * @private
   */
  _updateStationVisibility() {
    if (!this.stationContainer) return;
    const activeStation = this.getActiveStation();
    const cards = this.stationContainer.querySelectorAll('.station-card');
    cards.forEach((card) => {
      const stationId = card.getAttribute('data-station');
      if (stationId === activeStation.id) {
        card.classList.add('active');
        card.removeAttribute('hidden');
      } else {
        card.classList.remove('active');
        card.setAttribute('hidden', '');
      }
    });
  }

  /**
   * Safely initializes Three.js scene, topology graph, and idle manager
   * @private
   */
  _initThree() {
    this.scene = new THREE.Scene();

    const width = typeof window !== 'undefined' ? window.innerWidth : 800;
    const height = typeof window !== 'undefined' ? window.innerHeight : 600;

    const activeStation = this.getActiveStation();
    const initCamPos = activeStation?.camera?.position || { x: 0, y: 0, z: 16 };
    const initCamTarget = activeStation?.camera?.target || { x: 0, y: 0, z: 0 };

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(initCamPos.x, initCamPos.y, initCamPos.z);
    this._targetCamPos.set(initCamPos.x, initCamPos.y, initCamPos.z);
    this._targetCamLookAt.set(initCamTarget.x, initCamTarget.y, initCamTarget.z);
    this._currentCamLookAt.set(initCamTarget.x, initCamTarget.y, initCamTarget.z);
    this.camera.lookAt(this._currentCamLookAt);

    // Initialize WebGLRenderer with graceful fallback for headless test environments
    try {
      const gl = typeof this.canvas.getContext === 'function' &&
        (this.canvas.getContext('webgl2') || this.canvas.getContext('webgl'));

      if (gl) {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.75));
      } else {
        this.renderer = null;
      }
    } catch {
      this.renderer = null;
    }

    // Initialize 3D cloud mesh topology (56 particles: ~30% lighter constellation)
    this.topology = new CloudMeshTopology({
      scene: this.scene,
      nodeCount: 56
    });

    // Initialize 5s slow-motion idle power damping
    this.idleManager = new IdleManager({
      idleTimeoutMs: 5000,
      onWake: () => this._resumeLoop()
    });

    // Event listeners
    this._onResize = () => {
      if (!this.camera || typeof window === 'undefined') return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();

      if (this.renderer) {
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      }
      if (this.topology && typeof this.topology.onResize === 'function') {
        this.topology.onResize();
      }
      if (this.idleManager) {
        this.idleManager.recordActivity();
      }
      this._resumeLoop();
    };

    this._onPointerMove = (e) => {
      this._updatePointerFromClient(e.clientX, e.clientY);
    };

    this._onPointerLeave = () => {
      this._clearPointer();
    };

    this._onKeyDown = (e) => {
      if (!e || !e.key || e.repeat || this.activeModal) return;
      let direction = 0;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        direction = 1;
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        direction = -1;
      }
      if (direction !== 0) {
        if (this._canScrollInDirection(direction)) return;
        this._triggerSequentialNav(direction);
      }
    };

    this._onWheel = (e) => {
      if (!e || typeof e.deltaY !== 'number' || this.activeModal) return;
      if (e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaY) < 15) return;
      const direction = e.deltaY > 0 ? 1 : -1;
      if (this._canScrollInDirection(direction)) return;
      this._triggerSequentialNav(direction);
    };

    this._onFocusIn = () => {
      if (this.idleManager) {
        this.idleManager.recordActivity();
      }
      this._resumeLoop();
    };

    this._onTouchStart = (e) => {
      if (this.activeModal) return;
      if (e.touches && e.touches.length > 0) {
        const isFromHUD = e.target && typeof e.target.closest === 'function' && e.target.closest('.hud-nav');
        if (!isFromHUD) {
          this._touchStartX = e.touches[0].clientX;
          this._touchStartY = e.touches[0].clientY;
          this._touchStartCanScrollDown = this._canScrollInDirection(1);
          this._touchStartCanScrollUp = this._canScrollInDirection(-1);
        } else {
          this._touchStartX = null;
          this._touchStartY = null;
          this._touchStartCanScrollDown = false;
          this._touchStartCanScrollUp = false;
        }
        this._updatePointerFromClient(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    this._onTouchMove = (e) => {
      if (this.activeModal) return;
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        this._updatePointerFromClient(touch.clientX, touch.clientY);
      }
    };

    this._onTouchEnd = (e) => {
      if (this.activeModal) return;
      if (this._touchStartY !== null) {
        let endX = null;
        let endY = null;
        if (e.changedTouches && e.changedTouches.length > 0) {
          endX = e.changedTouches[0].clientX;
          endY = e.changedTouches[0].clientY;
        } else if (e.touches && e.touches.length > 0) {
          endX = e.touches[0].clientX;
          endY = e.touches[0].clientY;
        }

        if (typeof endY === 'number' && typeof this._touchStartY === 'number') {
          const diffY = endY - this._touchStartY;
          const diffX = (typeof endX === 'number' && typeof this._touchStartX === 'number')
            ? endX - this._touchStartX
            : 0;

          if (Math.abs(diffY) >= 50 && Math.abs(diffY) > Math.abs(diffX) * 1.5) {
            const direction = diffY < 0 ? 1 : -1;
            const canScrollAtStart = direction > 0 ? this._touchStartCanScrollDown : this._touchStartCanScrollUp;
            if (!canScrollAtStart && !this._canScrollInDirection(direction)) {
              this._triggerSequentialNav(direction);
            }
          }
        }
        this._touchStartX = null;
        this._touchStartY = null;
        this._touchStartCanScrollDown = false;
        this._touchStartCanScrollUp = false;
      }
      this._clearPointer();
    };

    this._onTouchCancel = () => {
      this._touchStartX = null;
      this._touchStartY = null;
      this._touchStartCanScrollDown = false;
      this._touchStartCanScrollUp = false;
      this._clearPointer();
    };

    this._onPointerDown = (e) => {
      if (!this.topology || typeof window === 'undefined') return;
      if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        this._updatePointerFromClient(e.clientX, e.clientY);
      }
      if (typeof this.topology.triggerPulse === 'function') {
        this.topology.triggerPulse(null, 1.0);
      }
      if (this.idleManager) {
        this.idleManager.recordActivity();
      }
      this._resumeLoop();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize);
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerleave', this._onPointerLeave);
      window.addEventListener('pointerdown', this._onPointerDown);
      window.addEventListener('focusin', this._onFocusIn);
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('wheel', this._onWheel, { passive: true });
      window.addEventListener('touchstart', this._onTouchStart, { passive: true });
      window.addEventListener('touchmove', this._onTouchMove, { passive: true });
      window.addEventListener('touchend', this._onTouchEnd);
      window.addEventListener('touchcancel', this._onTouchCancel);
    }

    // Start render animation loop
    this._startLoop();
  }

  /**
   * Starts the requestAnimationFrame loop
   * @private
   */
  _startLoop() {
    if (this._isLoopRunning || this.isDestroyed) return;
    this._isLoopRunning = true;
    this._lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    this._renderFrame = (currentTime) => {
      if (this.isDestroyed) {
        this._isLoopRunning = false;
        return;
      }

      const delta = Math.min((currentTime - this._lastFrameTime) / 1000, 0.1);
      this._lastFrameTime = currentTime;

      // 1. Advance spatial camera waypoint transition
      if (this.camera && (this._isCameraTransitioning || this.camera.position.distanceToSquared(this._targetCamPos) > 0.0001)) {
        const camLerp = Math.min(1.0, Math.max(0.01, delta * 3.5));
        this.camera.position.lerp(this._targetCamPos, camLerp);
        this._currentCamLookAt.lerp(this._targetCamLookAt, camLerp);
        this.camera.lookAt(this._currentCamLookAt);

        const distPosSq = this.camera.position.distanceToSquared(this._targetCamPos);
        const distLookSq = this._currentCamLookAt.distanceToSquared(this._targetCamLookAt);

        if (distPosSq < 0.01 && distLookSq < 0.01) {
          this.camera.position.copy(this._targetCamPos);
          this._currentCamLookAt.copy(this._targetCamLookAt);
          this.camera.lookAt(this._currentCamLookAt);
          this._isCameraTransitioning = false;
        }
      }

      if (this.idleManager) {
        this.idleManager.update(delta);
      }

      const speedFactor = this.idleManager ? this.idleManager.getSpeedFactor() : 1.0;

      if (this.topology) {
        this.topology.update(delta, speedFactor);
      }

      // Idle Damping GPU throttling & Hidden Tab Freeze (0% GPU + 0% CPU)
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const isTopologyResting = this.topology && typeof this.topology.isResting === 'function' && this.topology.isResting();
      const isResting = !this._isCameraTransitioning && isTopologyResting;
      const shouldSuspend = isHidden || (speedFactor <= 0.0001 && isResting);

      if (!shouldSuspend && this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      if (shouldSuspend) {
        // Suspend requestAnimationFrame loop completely to avoid continuous idle CPU wakeups
        this._isLoopRunning = false;
        this._animFrameId = null;
        return;
      }

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        this._animFrameId = window.requestAnimationFrame(this._renderFrame);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this._animFrameId = window.requestAnimationFrame(this._renderFrame);
    }
  }

  /**
   * Normalizes viewport client coordinates [-1.0 to 1.0], updates topology pointer, and wakes loop
   * @param {number} clientX
   * @param {number} clientY
   * @private
   */
  _updatePointerFromClient(clientX, clientY) {
    if (!this.topology || typeof window === 'undefined') return;
    const width = window.innerWidth || 800;
    const height = window.innerHeight || 600;
    const normX = (clientX / width) * 2 - 1;
    const normY = -(clientY / height) * 2 + 1;
    this.topology.setPointer(normX, normY);
    if (this.idleManager) {
      this.idleManager.recordActivity();
    }
    this._resumeLoop();
  }

  /**
   * Clears pointer state and wakes loop to animate return to equilibrium
   * @private
   */
  _clearPointer() {
    if (!this.topology || typeof window === 'undefined') return;
    this.topology.setPointer(null, null);
    this._resumeLoop();
  }

  /**
   * Resumes the animation loop if it was suspended during idle
   * @private
   */
  _resumeLoop() {
    if (this.isDestroyed || this._isLoopRunning) return;
    this._startLoop();
  }

  /**
   * Returns whether the animation loop is currently actively scheduling frames
   * @returns {boolean}
   */
  isLoopRunning() {
    return this._isLoopRunning;
  }

  /**
   * Returns whether the camera is currently interpolating between station waypoints
   * @returns {boolean}
   */
  isCameraTransitioning() {
    return Boolean(this._isCameraTransitioning);
  }

  /**
   * Advances sequentially to the next station
   */
  navigateNext() {
    if (this.currentStationIndex < this.stations.length - 1) {
      this.navigateTo(this.currentStationIndex + 1);
    }
  }

  /**
   * Returns sequentially to the previous station
   */
  navigatePrev() {
    if (this.currentStationIndex > 0) {
      this.navigateTo(this.currentStationIndex - 1);
    }
  }

  /**
   * Checks whether stationContainer can scroll further in the requested direction.
   * direction > 0: downward swipe / scroll down (next station)
   * direction < 0: upward swipe / scroll up (prev station)
   * @param {number} direction
   * @returns {boolean}
   * @private
   */
  _canScrollInDirection(direction) {
    const sc = this.stationContainer || (this.container?.querySelector ? this.container.querySelector('.station-container') : null);
    if (!sc) return false;
    const maxScroll = sc.scrollHeight - sc.clientHeight;
    if (maxScroll <= 5) return false;
    if (direction > 0) return sc.scrollTop < maxScroll - 5;
    if (direction < 0) return sc.scrollTop > 5;
    return false;
  }

  /**
   * Triggers sequential navigation with debounce cooldown protection
   * @param {number} direction - Positive (+1) for next station, negative (-1) for previous
   * @private
   */
  _triggerSequentialNav(direction) {
    const now = Date.now();
    if (now - this._lastNavTime < this._navCooldownMs) return;
    this._lastNavTime = now;

    if (direction > 0) {
      this.navigateNext();
    } else if (direction < 0) {
      this.navigatePrev();
    }
  }

  getActiveStationIndex() {
    return this.currentStationIndex;
  }

  getActiveStation() {
    return this.stations[this.currentStationIndex] || this.stations[0];
  }

  async navigateTo(stationIndex) {
    if (this.isDestroyed) return;
    if (stationIndex < 0 || stationIndex >= this.stations.length) return;
    if (this.currentStationIndex === stationIndex) return;

    this.currentStationIndex = stationIndex;
    const activeStation = this.getActiveStation();

    // Trigger smooth 3D camera waypoint transition
    if (this.camera && activeStation && activeStation.camera) {
      const targetPos = activeStation.camera.position || { x: 0, y: 0, z: 16 };
      const targetLookAt = activeStation.camera.target || { x: 0, y: 0, z: 0 };
      this._targetCamPos.set(targetPos.x, targetPos.y, targetPos.z);
      this._targetCamLookAt.set(targetLookAt.x, targetLookAt.y, targetLookAt.z);
      this._isCameraTransitioning = true;
    }

    if (this.container) {
      this.container.setAttribute('data-active-station', activeStation.id);
    }

    if (this._hudButtons && this._hudButtons.length > 0) {
      this._hudButtons.forEach((btn, idx) => {
        if (idx === stationIndex) {
          btn.classList.add('active');
          btn.setAttribute('aria-current', 'step');
        } else {
          btn.classList.remove('active');
          btn.removeAttribute('aria-current');
        }
      });
    }

    this._updateStationVisibility();

    if (this.srAnnouncer) {
      this.srAnnouncer.textContent = `Navigated to station ${activeStation.name}: ${activeStation.subtitle}`;
    }

    this._resumeLoop();
  }

  /**
   * Complete teardown of Three.js context, animation frame, and listeners
   */
  destroy() {
    this._closeArchitectureModal();
    this.isDestroyed = true;
    this._isLoopRunning = false;
    this._isCameraTransitioning = false;

    if (typeof window !== 'undefined') {
      if (this._animFrameId && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this._animFrameId);
      }
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerleave', this._onPointerLeave);
      window.removeEventListener('pointerdown', this._onPointerDown);
      window.removeEventListener('focusin', this._onFocusIn);
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('wheel', this._onWheel);
      window.removeEventListener('touchstart', this._onTouchStart);
      window.removeEventListener('touchmove', this._onTouchMove);
      window.removeEventListener('touchend', this._onTouchEnd);
      window.removeEventListener('touchcancel', this._onTouchCancel);
    }

    if (this.topology) {
      this.topology.dispose();
      this.topology = null;
    }

    if (this.idleManager) {
      this.idleManager.dispose();
      this.idleManager = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this._hudButtons) {
      this._hudButtons = [];
    }

    if (this.hudNav) {
      this.hudNav.innerHTML = '';
      this.hudNav = null;
    }

    if (this.container) {
      this.container.removeAttribute('data-active-station');
    }

    this.stationContainer = null;
  }

  /**
   * Standardized resource teardown lifecycle per CODING_STANDARDS.md §7
   */
  dispose() {
    this.destroy();
  }
}
