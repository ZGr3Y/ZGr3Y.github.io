import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { LoaderController } from '../src/core/LoaderController.js';
import { LoaderUI } from '../src/ui/Loader.js';
import { AssetLibrary } from '../src/core/AssetLibrary.js';
import { JourneyScene } from '../src/core/JourneyScene.js';
import { disposeThreeObject } from '../src/utils/threeUtils.js';
import { PortfolioApp } from '../src/core/PortfolioApp.js';

describe('Ticket 03: Loader "DON\'T PANIC" (42 Glitch) & Hitchhiker Scene Foundation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('LoaderController (Timing & 42 Glitch Progression)', () => {
    it('enforces a minimum 4000ms display dwell before completing', async () => {
      let isAssetReady = false;
      const assetPromise = new Promise((resolve) => {
        setTimeout(() => {
          isAssetReady = true;
          resolve();
        }, 1000);
      });

      const controller = new LoaderController({
        minDwellMs: 4000,
        assetPromise
      });

      const completeSpy = vi.fn();
      controller.onComplete(completeSpy);
      controller.start();

      // At 1000ms: assets ready, but minimum dwell (4000ms) not reached
      await vi.advanceTimersByTimeAsync(1000);
      expect(isAssetReady).toBe(true);
      expect(controller.isCompleted()).toBe(false);
      expect(completeSpy).not.toHaveBeenCalled();

      // At 3999ms: still dwelling
      await vi.advanceTimersByTimeAsync(2999);
      expect(controller.isCompleted()).toBe(false);
      expect(completeSpy).not.toHaveBeenCalled();

      // At 4000ms: minimum dwell satisfied and assets ready -> completes
      await vi.advanceTimersByTimeAsync(1);
      expect(controller.isCompleted()).toBe(true);
      expect(completeSpy).toHaveBeenCalledTimes(1);

      controller.dispose();
    });

    it('waits for asset promise if assets take longer than minimum dwell, with fallback timeout', async () => {
      let resolveAssets;
      const slowAssetPromise = new Promise((resolve) => {
        resolveAssets = resolve;
      });

      const controller = new LoaderController({
        minDwellMs: 4000,
        maxTimeoutMs: 8000,
        assetPromise: slowAssetPromise
      });

      const completeSpy = vi.fn();
      controller.onComplete(completeSpy);
      controller.start();

      // At 4000ms: dwell satisfied, but assets still pending -> does not complete
      await vi.advanceTimersByTimeAsync(4000);
      expect(controller.isCompleted()).toBe(false);
      expect(completeSpy).not.toHaveBeenCalled();

      // Assets finish at 5500ms -> completes immediately
      resolveAssets();
      await vi.advanceTimersByTimeAsync(10);
      expect(controller.isCompleted()).toBe(true);
      expect(completeSpy).toHaveBeenCalledTimes(1);

      controller.dispose();
    });

    it('triggers glitch state periodically resetting visual percentage back to 42', () => {
      const controller = new LoaderController({ minDwellMs: 4000 });
      const progressUpdates = [];

      controller.onProgress((state) => {
        progressUpdates.push({ ...state });
      });

      controller.start();

      // Advance time and collect progress updates
      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(100);
      }

      // Check that at least one glitch event occurred with displayPercent === 42 and isGlitching === true
      const glitchUpdates = progressUpdates.filter((u) => u.isGlitching && u.displayPercent === 42);
      expect(glitchUpdates.length).toBeGreaterThan(0);
      for (const update of glitchUpdates) {
        expect(update.actualPercent).toBeGreaterThan(42);
      }

      // Check overall progress climbed toward 100
      const maxPercent = Math.max(...progressUpdates.map((u) => u.actualPercent));
      expect(maxPercent).toBeGreaterThanOrEqual(95);

      controller.dispose();
    });

    it('cleans up timers and frame updates cleanly via dispose()', () => {
      const controller = new LoaderController({ minDwellMs: 4000 });
      const completeSpy = vi.fn();
      controller.onComplete(completeSpy);
      controller.start();

      vi.advanceTimersByTime(1500);
      controller.dispose();

      // Advancing past 4000ms must not trigger complete after dispose
      vi.advanceTimersByTime(5000);
      expect(completeSpy).not.toHaveBeenCalled();
      expect(controller.isDisposed).toBe(true);
    });

    it('halts tick interval upon readiness when requireClick is true to ensure zero-CPU idle', async () => {
      const controller = new LoaderController({
        minDwellMs: 4000,
        requireClick: true
      });
      const progressSpy = vi.fn();
      controller.onProgress(progressSpy);
      controller.start();

      await vi.advanceTimersByTimeAsync(4050);
      expect(controller.isReady).toBe(true);
      expect(controller.isCompleted()).toBe(false);
      expect(controller._tickInterval).toBeNull();

      const callCountAtReady = progressSpy.mock.calls.length;

      // Further time advancement while waiting for user click must not emit ticks or consume CPU
      await vi.advanceTimersByTimeAsync(2000);
      expect(progressSpy.mock.calls.length).toBe(callCountAtReady);

      // User click completes
      controller.complete();
      expect(controller.isCompleted()).toBe(true);
      controller.dispose();
    });
  });

  describe('LoaderUI (SVG Circle & Curved DON\'T PANIC textPath)', () => {
    it('renders accessible progressbar with curved textPath containing DON\'T PANIC and supports dismiss', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const loaderUI = new LoaderUI();
      loaderUI.mount(container);

      const root = container.querySelector('.narrative-loader');
      expect(root).not.toBeNull();
      expect(root.getAttribute('role')).toBe('progressbar');
      expect(root.getAttribute('aria-label')).toMatch(/loading/i);

      // SVG with textPath containing DON'T PANIC
      const textPath = container.querySelector('textPath');
      expect(textPath).not.toBeNull();
      expect(textPath.textContent).toContain("DON'T PANIC");

      // Centered percentage display element
      const percentEl = container.querySelector('.loader-counter');
      expect(percentEl).not.toBeNull();

      loaderUI.update({ actualPercent: 50, displayPercent: 42, isGlitching: true });
      expect(percentEl.textContent).toBe('42%');
      expect(root.classList.contains('glitching')).toBe(true);

      loaderUI.update({ actualPercent: 60, displayPercent: 60, isGlitching: false });
      expect(percentEl.textContent).toBe('60%');
      expect(root.classList.contains('glitching')).toBe(false);

      // Dismiss triggers fade-out transition before unmounting
      const dismissPromise = loaderUI.dismiss(400);
      expect(root.classList.contains('loader-hidden')).toBe(true);
      expect(container.querySelector('.narrative-loader')).not.toBeNull();
      await vi.advanceTimersByTimeAsync(400);
      await dismissPromise;
      expect(container.querySelector('.narrative-loader')).toBeNull();

      loaderUI.dispose();
      expect(container.querySelector('.narrative-loader')).toBeNull();
    });
  });

  describe('AssetLibrary (Critical GLTF Preloading & Caching)', () => {
    it('caches loaded models and provides preloadCritical helper', async () => {
      const library = new AssetLibrary();

      // Mock internal loader
      const mockModel = new THREE.Group();
      library._loader = {
        loadAsync: vi.fn().mockResolvedValue({ scene: mockModel })
      };

      const criticalPaths = [
        './models/the_hitchhikers_guide_to_the_galaxy.glb',
        './models/the_matrix_white_room.glb',
        './models/hand.glb',
        './models/robotic_hand.glb'
      ];

      await library.preloadCritical(criticalPaths);

      for (const p of criticalPaths) {
        expect(library.isLoaded(p)).toBe(true);
        expect(library.get(p)).toBe(mockModel);
      }

      // Requesting already loaded asset returns cached instance without re-loading
      const cached = await library.load(criticalPaths[0]);
      expect(cached).toBe(mockModel);
      expect(library._loader.loadAsync).toHaveBeenCalledTimes(4);

      library.dispose();
    });
  });

  describe('JourneyScene (Hitchhiker Foundation & Rotation)', () => {
    it('initializes with Hitchhiker book model in background and responds to pointer tilt', () => {
      const scene = new THREE.Scene();
      const journey = new JourneyScene({ scene });

      const bookModel = new THREE.Group();
      bookModel.name = 'HitchhikerGuide';
      journey.setHitchhikerModel(bookModel);

      expect(scene.children).toContain(bookModel);

      const initialRotY = bookModel.rotation.y;
      journey.update(0.016, 1.0, { x: 1.0, y: 0 });
      expect(bookModel.rotation.y).toBeGreaterThan(initialRotY);

      journey.dispose();
      expect(scene.children).not.toContain(bookModel);
    });

    it('normalizes model scale based on bounding box', () => {
      const scene = new THREE.Scene();
      const journey = new JourneyScene({ scene });

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(100, 50, 20));
      const model = new THREE.Group();
      model.add(mesh);

      journey.setHitchhikerModel(model);

      // maxDim is 100, targetSize is 4.2 -> scale = 0.042
      expect(model.scale.x).toBeCloseTo(0.042, 5);
      expect(model.scale.y).toBeCloseTo(0.042, 5);
      expect(model.scale.z).toBeCloseTo(0.042, 5);

      journey.dispose();
    });
  });

  describe('threeUtils: disposeThreeObject', () => {
    it('disposes all texture slots and deduplicates shared textures', () => {
      const sharedTexture = { isTexture: true, dispose: vi.fn() };
      const normalTexture = { isTexture: true, dispose: vi.fn() };
      const roughnessTexture = { isTexture: true, dispose: vi.fn() };
      const geoDispose = vi.fn();
      const matDispose1 = vi.fn();
      const matDispose2 = vi.fn();

      const mesh1 = {
        geometry: { dispose: geoDispose },
        material: {
          map: sharedTexture,
          normalMap: normalTexture,
          roughnessMap: roughnessTexture,
          dispose: matDispose1
        }
      };

      const mesh2 = {
        material: {
          map: sharedTexture, // Same shared texture instance
          dispose: matDispose2
        }
      };

      const root = {
        traverse(cb) {
          cb(root);
          cb(mesh1);
          cb(mesh2);
        }
      };

      disposeThreeObject(root);

      expect(geoDispose).toHaveBeenCalledTimes(1);
      expect(matDispose1).toHaveBeenCalledTimes(1);
      expect(matDispose2).toHaveBeenCalledTimes(1);
      // Shared texture should only be disposed once
      expect(sharedTexture.dispose).toHaveBeenCalledTimes(1);
      expect(normalTexture.dispose).toHaveBeenCalledTimes(1);
      expect(roughnessTexture.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('PortfolioApp Integration (Loader & Idle Wake)', () => {
    it('wakes loop and records activity when Hitchhiker model resolves', async () => {
      const container = document.createElement('div');
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');
      container.appendChild(canvas);
      container.appendChild(srAnnouncer);
      document.body.appendChild(container);

      const mockModel = new THREE.Group();
      let resolveHitchhiker;
      const hitchhikerPromise = new Promise((resolve) => {
        resolveHitchhiker = resolve;
      });

      const originalLoad = AssetLibrary.prototype.load;
      const originalPreload = AssetLibrary.prototype.preloadCritical;
      AssetLibrary.prototype.preloadCritical = vi.fn().mockResolvedValue([]);
      AssetLibrary.prototype.load = vi.fn().mockImplementation((path) => {
        if (path.includes('hitchhiker')) {
          return hitchhikerPromise;
        }
        return Promise.resolve(mockModel);
      });

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true
      });

      const recordSpy = vi.spyOn(app.idleManager, 'recordActivity');
      const resumeSpy = vi.spyOn(app, '_resumeLoop');

      expect(recordSpy).not.toHaveBeenCalled();
      expect(resumeSpy).not.toHaveBeenCalled();

      // Resolve the Hitchhiker model
      resolveHitchhiker(mockModel);
      await hitchhikerPromise;
      await Promise.resolve();

      expect(recordSpy).toHaveBeenCalledTimes(1);
      expect(resumeSpy).toHaveBeenCalled();

      AssetLibrary.prototype.load = originalLoad;
      AssetLibrary.prototype.preloadCritical = originalPreload;
      app.destroy();
    });
  });
});
