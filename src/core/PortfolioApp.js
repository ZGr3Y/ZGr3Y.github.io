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
    this.srAnnouncer = srAnnouncer;

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

    this.init();
  }

  /**
   * Initialize state, DOM hooks, and 3D graphics pipeline
   */
  init() {
    if (this.container) {
      this.container.setAttribute('data-active-station', this.stations[0].id);
    }

    if (this.canvas) {
      this._initThree();
    }
  }

  /**
   * Safely initializes Three.js scene, topology graph, and idle manager
   * @private
   */
  _initThree() {
    this.scene = new THREE.Scene();

    const width = typeof window !== 'undefined' ? window.innerWidth : 800;
    const height = typeof window !== 'undefined' ? window.innerHeight : 600;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 16);

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

    // Initialize 3D cloud mesh topology
    this.topology = new CloudMeshTopology({
      scene: this.scene,
      nodeCount: 40
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
      this._resumeLoop();
    };

    this._onPointerMove = (e) => {
      if (!this.topology || typeof window === 'undefined') return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.topology.setPointer(normX, normY);
      if (this.idleManager) {
        this.idleManager.recordActivity();
      }
      this._resumeLoop();
    };

    this._onPointerLeave = () => {
      if (!this.topology || typeof window === 'undefined') return;
      this.topology.setPointer(null, null);
      this._resumeLoop();
    };

    this._onTouchMove = (e) => {
      if (!this.topology || typeof window === 'undefined') return;
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const normX = (touch.clientX / window.innerWidth) * 2 - 1;
        const normY = -(touch.clientY / window.innerHeight) * 2 + 1;
        this.topology.setPointer(normX, normY);
        if (this.idleManager) {
          this.idleManager.recordActivity();
        }
        this._resumeLoop();
      }
    };

    this._onTouchEnd = () => {
      if (!this.topology || typeof window === 'undefined') return;
      this.topology.setPointer(null, null);
      this._resumeLoop();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize);
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerleave', this._onPointerLeave);
      window.addEventListener('touchstart', this._onTouchMove, { passive: true });
      window.addEventListener('touchmove', this._onTouchMove, { passive: true });
      window.addEventListener('touchend', this._onTouchEnd);
      window.addEventListener('touchcancel', this._onTouchEnd);
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

      if (this.idleManager) {
        this.idleManager.update(delta);
      }

      const speedFactor = this.idleManager ? this.idleManager.getSpeedFactor() : 1.0;

      if (this.topology) {
        this.topology.update(delta, speedFactor);
      }

      // Idle Damping GPU throttling & Hidden Tab Freeze (0% GPU + 0% CPU)
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const isResting = this.topology && typeof this.topology.isResting === 'function' && this.topology.isResting();
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

    if (this.container) {
      this.container.setAttribute('data-active-station', activeStation.id);
    }

    if (this.srAnnouncer) {
      this.srAnnouncer.textContent = `Navigated to station ${activeStation.name}: ${activeStation.subtitle}`;
    }

    this._resumeLoop();
  }

  /**
   * Complete teardown of Three.js context, animation frame, and listeners
   */
  destroy() {
    this.isDestroyed = true;
    this._isLoopRunning = false;

    if (typeof window !== 'undefined') {
      if (this._animFrameId && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this._animFrameId);
      }
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerleave', this._onPointerLeave);
      window.removeEventListener('touchstart', this._onTouchMove);
      window.removeEventListener('touchmove', this._onTouchMove);
      window.removeEventListener('touchend', this._onTouchEnd);
      window.removeEventListener('touchcancel', this._onTouchEnd);
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

    if (this.container) {
      this.container.removeAttribute('data-active-station');
    }
  }
}
