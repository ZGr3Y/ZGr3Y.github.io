import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * AssetLibrary — 3D Model Cache & Critical Preload Coordinator
 * Manages GLTF/GLB asset loading, memory lifecycle, and graceful timeout fallback.
 */
export class AssetLibrary {
  /**
   * @param {Object} [options]
   * @param {Object} [options.loader] - Optional custom loader instance (for testing/mocking)
   */
  constructor({ loader = null } = {}) {
    this._cache = new Map();
    this._inFlight = new Map();
    this._loader = loader || new GLTFLoader();
    this.isDisposed = false;
  }

  /**
   * Loads a GLTF/GLB asset or returns the cached model
   * @param {string} url - Model path or URL
   * @param {Object} [options]
   * @param {number} [options.timeoutMs=8000] - Load timeout before fallback
   * @returns {Promise<Object>} The root THREE.Group / scene object
   */
  async load(url, { timeoutMs = 8000 } = {}) {
    if (this.isDisposed) {
      throw new Error('AssetLibrary is disposed');
    }

    if (this._cache.has(url)) {
      return this._cache.get(url);
    }

    if (this._inFlight.has(url)) {
      return this._inFlight.get(url);
    }

    const loadPromise = new Promise((resolve, reject) => {
      let isTimedOut = false;
      const timer = setTimeout(() => {
        isTimedOut = true;
        // Fallback: resolve with null instead of hard error to avoid blocking the user experience
        resolve(null);
      }, timeoutMs);

      this._loader
        .loadAsync(url)
        .then((gltf) => {
          clearTimeout(timer);
          if (isTimedOut) return;
          const scene = gltf && gltf.scene ? gltf.scene : gltf;
          this._cache.set(url, scene);
          resolve(scene);
        })
        .catch((err) => {
          clearTimeout(timer);
          if (isTimedOut) return;
          // Graceful fallback for non-fatal asset failure
          console.warn(`[AssetLibrary] Failed to load model at ${url}:`, err);
          resolve(null);
        })
        .finally(() => {
          this._inFlight.delete(url);
        });
    });

    this._inFlight.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Preloads a set of critical assets concurrently
   * @param {string[]} urls - List of asset URLs
   * @param {Object} [options]
   * @returns {Promise<Object[]>}
   */
  async preloadCritical(urls, options = {}) {
    if (!Array.isArray(urls)) return [];
    return Promise.all(urls.map((u) => this.load(u, options)));
  }

  /**
   * Retrieves a loaded asset from cache
   * @param {string} url
   * @returns {Object|null}
   */
  get(url) {
    return this._cache.get(url) || null;
  }

  /**
   * Checks whether an asset is loaded and cached
   * @param {string} url
   * @returns {boolean}
   */
  isLoaded(url) {
    return this._cache.has(url);
  }

  /**
   * Cleans up all cached 3D assets and GPU resources per CODING_STANDARDS.md §7
   */
  dispose() {
    this.isDisposed = true;
    for (const model of this._cache.values()) {
      if (!model) continue;
      if (typeof model.traverse === 'function') {
        model.traverse((child) => {
          if (child.geometry && typeof child.geometry.dispose === 'function') {
            child.geometry.dispose();
          }
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const m of mats) {
              if (m.map && typeof m.map.dispose === 'function') m.map.dispose();
              if (typeof m.dispose === 'function') m.dispose();
            }
          }
        });
      }
    }
    this._cache.clear();
    this._inFlight.clear();
  }
}
