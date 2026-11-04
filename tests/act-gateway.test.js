import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { GatewayAct } from '../src/acts/GatewayAct.js';
import { JourneyScene } from '../src/core/JourneyScene.js';
import { LoaderUI } from '../src/ui/Loader.js';
import { PortfolioApp } from '../src/core/PortfolioApp.js';
import { AssetLibrary } from '../src/core/AssetLibrary.js';

describe('Ticket 05: Act Gateway (Matrix White Room Zoom-Through & Bio)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('GatewayAct: 3D Scene & Matrix Room Setup', () => {
    it('creates GatewayAct with scene, camera, and positions room to the right', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      expect(act.scene).toBe(scene);
      expect(act.camera).toBe(camera);
      // Room position must be placed to the right (x > 0) per user specification
      expect(act.roomPosition.x).toBeGreaterThan(15);
      expect(act.roomPosition.x).toBeLessThan(40);

      act.dispose();
    });

    it('normalizes Matrix White Room model scale and adds to scene at roomPosition', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      const roomMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 50, 100));
      const roomModel = new THREE.Group();
      roomModel.add(roomMesh);

      act.setWhiteRoomModel(roomModel);

      expect(scene.children).toContain(roomModel);
      expect(roomModel.position.x).toBe(act.roomPosition.x);
      expect(roomModel.position.y).toBe(act.roomPosition.y);
      expect(roomModel.position.z).toBe(act.roomPosition.z);

      // Normalization should scale bounding box to target architectural room size (~28)
      expect(roomModel.scale.x).toBeCloseTo(0.28, 2);

      act.dispose();
      expect(scene.children).not.toContain(roomModel);
    });

    it('adds balanced lighting for the Matrix White Room', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      const lights = scene.children.filter((child) => child.isLight);
      expect(lights.length).toBeGreaterThanOrEqual(1);

      act.dispose();
      const lightsAfterDispose = scene.children.filter((child) => child.isLight);
      expect(lightsAfterDispose.length).toBe(0);
    });
  });

  describe('GatewayAct: Camera Navigation & Pointer Parallax', () => {
    it('transitions camera smoothly towards the right as progress advances from 0.0 to 0.2', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0.4, 4.5);
      camera.lookAt(0, 0, 0);

      const act = new GatewayAct({ scene, camera });

      // At progress 0.0: Act 0 waypoint
      act.update({ progress: 0.0, delta: 0.016, speedFactor: 1.0 });
      const pos0 = camera.position.clone();

      // At progress 0.2: Camera must turn right towards Matrix Room (x coordinate significantly higher)
      for (let i = 0; i < 60; i++) {
        act.update({ progress: 0.2, delta: 0.016, speedFactor: 1.0 });
      }

      expect(camera.position.x).toBeGreaterThan(pos0.x + 10);
      expect(act.currentLookAt.x).toBeGreaterThan(10);

      act.dispose();
    });

    it('applies subtle pointer parallax and decays to resting equilibrium when stationary', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      // Initial resting state
      act.update({ progress: 0.1, pointer: { x: 0, y: 0 }, delta: 0.016, speedFactor: 1.0 });

      // Pointer moved to top-right
      act.update({ progress: 0.1, pointer: { x: 0.8, y: 0.5 }, delta: 0.016, speedFactor: 1.0 });
      expect(act.isResting()).toBe(false);

      // Advance frames without pointer movement to allow decay
      for (let i = 0; i < 120; i++) {
        act.update({ progress: 0.1, pointer: { x: 0.8, y: 0.5 }, delta: 0.016, speedFactor: 1.0 });
      }

      // Parallax and camera should reach target equilibrium
      expect(act.isResting()).toBe(true);

      act.dispose();
    });

    it('applies subtle ambient camera drift when inside Act 1 (Matrix White Room)', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      // In Act 1 (e.g. progress 0.25)
      act.update({ progress: 0.25, delta: 0.016, speedFactor: 1.0 });
      const posA = camera.position.clone();

      // Advance time by 1 second
      for (let i = 0; i < 60; i++) {
        act.update({ progress: 0.25, delta: 0.016, speedFactor: 1.0 });
      }
      const posB = camera.position.clone();

      // Ambient drift should subtly modulate camera position
      expect(posA.distanceTo(posB)).toBeGreaterThan(0);

      act.dispose();
    });

    it('rebases camera coordinates and lookAt vector when requested', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      const newPos = new THREE.Vector3(0, 0, 16);
      const newLookAt = new THREE.Vector3(0, 0, 0);

      act.rebaseCamera(newPos, newLookAt);

      expect(act.currentCamPos.x).toBe(0);
      expect(act.currentCamPos.y).toBe(0);
      expect(act.currentCamPos.z).toBe(16);
      expect(act.currentLookAt.x).toBe(0);
      expect(act.currentLookAt.y).toBe(0);
      expect(act.currentLookAt.z).toBe(0);

      act.dispose();
    });
  });

  describe('GatewayAct: Teardown & Resource Cleanup', () => {
    it('cleans up all meshes, lights, and textures per CODING_STANDARDS §7', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      const geometry = new THREE.BufferGeometry();
      const geoDispose = vi.spyOn(geometry, 'dispose');
      const material = new THREE.MeshBasicMaterial();
      const matDispose = vi.spyOn(material, 'dispose');
      const mesh = new THREE.Mesh(geometry, material);

      const model = new THREE.Group();
      model.add(mesh);
      act.setWhiteRoomModel(model);

      act.dispose();

      expect(act.isDisposed).toBe(true);
      expect(geoDispose).toHaveBeenCalled();
      expect(matDispose).toHaveBeenCalled();
      expect(scene.children.length).toBe(0);
    });
  });

  describe('JourneyScene: Hitchhiker Book Mouse Parallax (No Auto-Rotation)', () => {
    it('tilts with pointer coordinates and does not auto-rotate continuously', () => {
      const scene = new THREE.Scene();
      const journey = new JourneyScene({ scene });

      const bookModel = new THREE.Group();
      journey.setHitchhikerModel(bookModel);

      const initialRotY = bookModel.rotation.y;

      // Update with zero pointer offset for multiple frames
      journey.update(0.1, 1.0, { x: 0, y: 0 });
      journey.update(0.1, 1.0, { x: 0, y: 0 });

      // User directive: "il modello don't panick si muove in base al movimento del mouse, ma non rotea"
      // Without pointer movement, rotation.y should remain stable (not continuously spin)
      expect(bookModel.rotation.y).toBeCloseTo(initialRotY, 2);

      // Now move pointer to the right: book should tilt towards pointer
      for (let i = 0; i < 30; i++) {
        journey.update(0.016, 1.0, { x: 1.0, y: 0.0 });
      }
      expect(bookModel.rotation.y).toBeGreaterThan(initialRotY);

      journey.dispose();
    });
  });

  describe('LoaderUI: Falling Whale & Petunia Pot Elements', () => {
    it('renders falling whale and bowl of petunias below the loading circle', () => {
      const container = document.createElement('div');
      const loader = new LoaderUI();
      loader.mount(container);

      // User directive: "la balena e il vaso che cadono, devono essere posizionati sotto il cerchio del caricamento"
      const fallingContainer = container.querySelector('.loader-falling-artifacts');
      expect(fallingContainer).not.toBeNull();

      const whaleEl = fallingContainer.querySelector('.falling-whale');
      expect(whaleEl).not.toBeNull();

      const petuniasEl = fallingContainer.querySelector('.falling-petunias');
      expect(petuniasEl).not.toBeNull();

      loader.dispose();
      expect(container.querySelector('.loader-falling-artifacts')).toBeNull();
    });
  });

  describe('PortfolioApp Integration: Gateway Act & Bio Card Lifecycle', () => {
    it('mounts Gateway card with valid CV download and GitHub link', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: false,
        enableJourney: true
      });

      const gatewayCard = container.querySelector('.station-card[data-station="gateway"]');
      expect(gatewayCard).not.toBeNull();

      // Check CV download action
      const cvLink = gatewayCard.querySelector('a.btn-cv');
      expect(cvLink).not.toBeNull();
      expect(cvLink.getAttribute('href')).toContain('resume_PaoloMariaScarlata.pdf');
      expect(cvLink.hasAttribute('download')).toBe(true);

      // Check GitHub action
      const ghLink = gatewayCard.querySelector('a.btn-github');
      expect(ghLink).not.toBeNull();
      expect(ghLink.getAttribute('target')).toBe('_blank');
      expect(ghLink.getAttribute('rel')).toContain('noopener');

      app.destroy();
    });

    it('coordinates GatewayAct camera and pointer during render loop', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true,
        enableJourney: true
      });

      expect(app.gatewayAct).toBeDefined();

      app.destroy();
    });

    it('triggers zoom-through into Matrix White Room upon loader completion', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true,
        enableJourney: true
      });

      expect(app.journeyState.getProgress()).toBe(0);

      // Complete the loader
      app.loaderController.complete();

      expect(app.scrollEngine.getTargetProgress()).toBe(0.2);

      app.destroy();
    });

    it('controls Gateway card DOM visibility window based on journey progress', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: false,
        enableJourney: true
      });

      const gatewayCard = container.querySelector('.station-card[data-station="gateway"]');
      expect(gatewayCard.classList.contains('active')).toBe(true);
      expect(gatewayCard.hasAttribute('hidden')).toBe(false);

      // Advance progress to Act 2 (progress >= 0.4)
      app.journeyState.setProgress(0.45);
      expect(gatewayCard.classList.contains('active')).toBe(false);
      expect(gatewayCard.hasAttribute('hidden')).toBe(true);

      // Rewind progress back to Act 1
      app.journeyState.setProgress(0.2);
      expect(gatewayCard.classList.contains('active')).toBe(true);
      expect(gatewayCard.hasAttribute('hidden')).toBe(false);

      app.destroy();
    });

    it('advances station camera transition and clears transition flag even when GatewayAct is active', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true,
        enableJourney: true
      });

      expect(app.gatewayAct).toBeDefined();

      // Navigate to Station 1 (Lab)
      await app.navigateTo(1);
      expect(app.isCameraTransitioning()).toBe(true);

      // Simulate render frames
      for (let frame = 0; frame < 100; frame++) {
        app._renderFrame(1000 + frame * 16);
      }

      // Transition flag should clear and camera should reach target
      expect(app.isCameraTransitioning()).toBe(false);
      expect(app.camera.position.x).toBeCloseTo(6, 0.5);

      app.destroy();
    });

    it('does not unhide Gateway card on journey progress when another station is active', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: false,
        enableJourney: true
      });

      // Select Station 1 (Lab)
      await app.navigateTo(1);
      const gatewayCard = container.querySelector('.station-card[data-station="gateway"]');
      const labCard = container.querySelector('.station-card[data-station="lab"]');

      expect(labCard.classList.contains('active')).toBe(true);
      expect(gatewayCard.classList.contains('active')).toBe(false);

      // Trigger progress update at or below 0.38
      app.journeyState.setProgress(0.15);

      // Gateway card must remain inactive/hidden
      expect(gatewayCard.classList.contains('active')).toBe(false);
      expect(gatewayCard.hasAttribute('hidden')).toBe(true);
      expect(labCard.classList.contains('active')).toBe(true);

      app.destroy();
    });

    it('rebases GatewayAct coordinates when returning to Gateway after station transition to avoid jumping', async () => {
      const container = document.createElement('div');
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true,
        enableJourney: true
      });

      // Move camera to White Room in Act 1
      app.scrollEngine.scrollTo(0.25);
      app.scrollEngine.currentProgress = 0.25;
      app.journeyState.setProgress(0.25);
      for (let frame = 0; frame < 60; frame++) {
        app._renderFrame(1000 + frame * 16);
      }
      expect(app.camera.position.x).toBeGreaterThan(15);
      expect(app.gatewayAct.currentCamPos.x).toBeGreaterThan(15);

      // Navigate to Lab station
      await app.navigateTo(1);
      for (let frame = 0; frame < 100; frame++) {
        app._renderFrame(2000 + frame * 16);
      }
      expect(app.isCameraTransitioning()).toBe(false);
      expect(app.camera.position.x).toBeCloseTo(6, 0.5);

      // Navigate back to Gateway
      await app.navigateTo(0);
      expect(app.isCameraTransitioning()).toBe(true);

      // Advance frames until transition finishes
      let frameSettled = -1;
      for (let frame = 0; frame < 100; frame++) {
        app._renderFrame(4000 + frame * 16);
        if (!app.isCameraTransitioning()) {
          frameSettled = frame;
          break;
        }
      }
      expect(frameSettled).toBeGreaterThan(-1);

      // In the frame that clears transition, gatewayAct was rebased from the camera
      // rather than retaining stale position (~24) and jumping
      expect(app.camera.position.x).toBeLessThan(3.0);
      expect(app.gatewayAct.currentCamPos.x).toBeLessThan(3.0);

      app.destroy();
    });
  });
});
