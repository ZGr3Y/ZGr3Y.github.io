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
        this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));
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
      idleTimeoutMs: 5000
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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      }
    };

    this._onPointerMove = (e) => {
      if (!this.topology || typeof window === 'undefined') return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.topology.setPointer(normX, normY);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._onResize);
      window.addEventListener('pointermove', this._onPointerMove);
    }

    // Start render animation loop
    this._startLoop();
  }

  /**
   * Starts the requestAnimationFrame loop
   * @private
   */
  _startLoop() {
    const loop = (currentTime) => {
      if (this.isDestroyed) return;

      const delta = Math.min((currentTime - this._lastFrameTime) / 1000, 0.1);
      this._lastFrameTime = currentTime;

      if (this.idleManager) {
        this.idleManager.update(delta);
      }

      const speedFactor = this.idleManager ? this.idleManager.getSpeedFactor() : 1.0;

      if (this.topology) {
        this.topology.update(delta, speedFactor);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        this._animFrameId = window.requestAnimationFrame(loop);
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this._animFrameId = window.requestAnimationFrame(loop);
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

    if (this.container) {
      this.container.setAttribute('data-active-station', activeStation.id);
    }

    if (this.srAnnouncer) {
      this.srAnnouncer.textContent = `Navigated to station ${activeStation.name}: ${activeStation.subtitle}`;
    }
  }

  /**
   * Complete teardown of Three.js context, animation frame, and listeners
   */
  destroy() {
    this.isDestroyed = true;

    if (typeof window !== 'undefined') {
      if (this._animFrameId && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this._animFrameId);
      }
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('pointermove', this._onPointerMove);
    }

    if (this.topology) {
      this.topology.destroy();
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
