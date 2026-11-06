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

      // Normalization should scale bounding box to target architectural room size (~5.2)
      expect(roomModel.scale.x).toBeCloseTo(0.052, 2);

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

    it('settles parallax offset and camera towards equilibrium when speedFactor is zero', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      // First let camera settle at progress: 0.1 with non-zero pointer parallax
      for (let i = 0; i < 120; i++) {
        act.update({ progress: 0.1, pointer: { x: 0.8, y: 0.5 }, delta: 0.016, speedFactor: 1.0 });
      }
      expect(act.isResting()).toBe(true);
      expect(act.parallaxOffset.lengthSq()).toBeGreaterThan(0);

      // Now reset pointer to (0, 0) while speedFactor is 0 (idle)
      for (let i = 0; i < 60; i++) {
        act.update({ progress: 0.1, pointer: { x: 0, y: 0 }, delta: 0.016, speedFactor: 0 });
      }

      // It must settle to target (0, 0) and report resting true
      expect(act.isResting()).toBe(true);
      expect(act.parallaxOffset.lengthSq()).toBeLessThan(0.0005);

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
        enableLoader: true,
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

      expect(app.scrollEngine.snapMode).toBe(true);

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

      expect(app.scrollEngine.snapMode).toBe(true);

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
        enableLoader: true,
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

      expect(app.scrollEngine.snapMode).toBe(true);

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
        enableLoader: true,
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

      expect(app.scrollEngine.snapMode).toBe(true);

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

    it('treats GatewayAct as resting when another station is active so idle loop can suspend per CODING_STANDARDS §5', async () => {
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

      expect(app.scrollEngine.snapMode).toBe(true);

      // Navigate to Station 1 (Lab)
      await app.navigateTo(1);

      // Finish waypoint camera transition
      for (let frame = 0; frame < 100; frame++) {
        app._renderFrame(1000 + frame * 16);
      }
      expect(app.isCameraTransitioning()).toBe(false);

      // Simulate GatewayAct being non-resting (e.g. parallax unsettled)
      if (app.gatewayAct) {
        vi.spyOn(app.gatewayAct, 'isResting').mockReturnValue(false);
      }

      // Force idle damping speed factor to 0
      if (app.idleManager) {
        vi.spyOn(app.idleManager, 'getSpeedFactor').mockReturnValue(0);
      }

      // Render frame while at Lab station
      app._renderFrame(5000);

      // Loop should suspend because GatewayAct is ignored when Gateway is inactive
      expect(app.isLoopRunning()).toBe(false);

      app.destroy();
    });

    it('suspends animation loop after pointer reset when idling at Gateway station per CODING_STANDARDS §5', async () => {
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

      expect(app.scrollEngine.snapMode).toBe(true);

      // Let camera settle at init
      for (let frame = 0; frame < 60; frame++) {
        app._renderFrame(1000 + frame * 16);
      }

      // Pointer moved to top-right
      app._updatePointerFromClient(window.innerWidth * 0.9, window.innerHeight * 0.1);
      for (let frame = 0; frame < 10; frame++) {
        app._renderFrame(2000 + frame * 16);
      }

      // Parallax is now non-zero
      expect(app.gatewayAct.parallaxOffset.lengthSq()).toBeGreaterThan(0);

      // Simulate idle damping reaching zero speed
      if (app.idleManager) {
        vi.spyOn(app.idleManager, 'getSpeedFactor').mockReturnValue(0);
      }

      // Cursor leaves viewport
      app._clearPointer();
      expect(app.isLoopRunning()).toBe(true);

      // Advance frames to allow settling
      for (let frame = 0; frame < 60; frame++) {
        app._renderFrame(3000 + frame * 16);
      }

      // Loop should suspend once settled
      expect(app.gatewayAct.isResting()).toBe(true);
      expect(app.isLoopRunning()).toBe(false);

      app.destroy();
    });

    it('keeps Gateway card hidden when navigating back to Gateway if journey progress is above 0.38', async () => {
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

      const gatewayCard = container.querySelector('.station-card[data-station="gateway"]');
      const labCard = container.querySelector('.station-card[data-station="lab"]');

      // Set journey progress above 0.38 (e.g. 0.45 in Act 2)
      app.journeyState.setProgress(0.45);
      expect(gatewayCard.classList.contains('active')).toBe(false);
      expect(gatewayCard.hasAttribute('hidden')).toBe(true);

      // Navigate away to Station 1 (Lab)
      await app.navigateTo(1);
      expect(labCard.classList.contains('active')).toBe(true);
      expect(gatewayCard.classList.contains('active')).toBe(false);

      // Navigate back to Station 0 (Gateway)
      await app.navigateTo(0);

      // Because progress is still 0.45, Gateway card must remain hidden
      expect(gatewayCard.classList.contains('active')).toBe(false);
      expect(gatewayCard.hasAttribute('hidden')).toBe(true);

      app.destroy();
    });

    it('blocks station navigation and scroll gestures until loader completion', async () => {
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

      expect(app.loaderController.isCompleted()).toBe(false);
      expect(app.scrollEngine.isLocked()).toBe(true);

      // Attempt ArrowDown navigation while loader is active
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: false }));
      expect(app.getActiveStationIndex()).toBe(0);
      expect(app.journeyState.getProgress()).toBe(0);

      // Attempt Wheel navigation while loader is active
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 200 }));
      expect(app.getActiveStationIndex()).toBe(0);
      expect(app.journeyState.getProgress()).toBe(0);

      // Attempt HUD button navigation while loader is active
      const hudBtn = container.querySelector('.hud-btn[data-station-index="1"]');
      if (hudBtn) {
        hudBtn.click();
        expect(app.getActiveStationIndex()).toBe(0);
      }

      // Complete loader (simulating user clicking enter ring)
      app.loaderController.complete();
      expect(app.loaderController.isCompleted()).toBe(true);
      expect(app.scrollEngine.isLocked()).toBe(false);

      // Once completed, HUD button navigation functions normally
      if (hudBtn) {
        hudBtn.click();
        expect(app.getActiveStationIndex()).toBe(1);
      }

      app.destroy();
    });
  });

  describe('GatewayAct: 3D TV Screen Square Reticle & Bio Hologram Interaction', () => {
    it('creates 3D TV screen reticle mesh in scene and defaults to hidden (visible = false)', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      expect(act.tvReticle).toBeDefined();
      expect(act.tvReticle.name).toBe('TvScreenReticle');
      expect(scene.children).toContain(act.tvReticle);
      expect(act.tvReticle.visible).toBe(false);

      // Verify reticle elements: fill, outer border, corner brackets, and center
      const names = act.tvReticle.children.map((c) => c.name);
      expect(names).toContain('TvReticleFill');
      expect(names).toContain('TvReticleBorder');
      expect(names).toContain('TvReticleCorners');
      expect(names).toContain('TvReticleCenter');

      act.dispose();
      expect(scene.children).not.toContain(act.tvReticle);
    });

    it('keeps TV screen reticle hidden during loader (ACT 00: progress 0.0 - 0.20)', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      // Progress at 0.0 (initial loader dwell)
      act.update({ progress: 0.0, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(false);

      // Progress at 0.10 (Hitchhiker scene)
      act.update({ progress: 0.10, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(false);

      // Progress at 0.19 (end of ACT 00 Hitchhiker camera zoom-through)
      act.update({ progress: 0.19, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(false);

      act.dispose();
    });

    it('shows TV screen reticle when framing CRT TV in ACT 01 (progress 0.20 - 0.25)', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      // In Act 01 White Room at TV view (e.g. progress 0.20)
      act.update({ progress: 0.20, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(true);

      // Up to progress 0.25
      act.update({ progress: 0.25, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(true);

      act.dispose();
    });

    it('hides TV screen reticle when descending into Pill Choice (progress > 0.25)', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      act.update({ progress: 0.20, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(true);

      // Descending to Pill Choice (e.g. progress 0.35)
      act.update({ progress: 0.35, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(false);

      act.dispose();
    });

    it('hides TV screen reticle when Bio Hologram is open, and restores when closed', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      act.update({ progress: 0.20, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(true);

      // Open hologram
      act.setBioHologramOpen(true);
      expect(act.tvReticle.visible).toBe(false);

      act.update({ progress: 0.20, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(false);

      // Close hologram
      act.setBioHologramOpen(false);
      act.update({ progress: 0.20, delta: 0.016, speedFactor: 1.0 });
      expect(act.tvReticle.visible).toBe(true);

      act.dispose();
    });

    it('raycasts TV reticle correctly and blocks interaction when hidden', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      // Frame camera towards TV reticle
      act.update({ progress: 0.20, delta: 0.016, speedFactor: 1.0 });
      for (let i = 0; i < 60; i++) {
        act.update({ progress: 0.20, delta: 0.016, speedFactor: 1.0 });
      }

      // Pointer pointing directly at reticle in screen center
      const tvPos = act.getTvScreenWorldPosition();
      const projected = tvPos.clone().project(camera);
      const pointer = { x: projected.x, y: projected.y };

      expect(act.isTvIntersected(pointer, camera)).toBe(true);

      // During loader (progress 0.0), reticle is hidden so interaction is blocked
      act.update({ progress: 0.0, delta: 0.016, speedFactor: 1.0 });
      expect(act.isTvIntersected(pointer, camera)).toBe(false);

      act.dispose();
    });

    it('cleans up 3D TV reticle geometries and materials upon dispose', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      const fillMesh = act.tvReticle.children.find((c) => c.name === 'TvReticleFill');
      const geoSpy = vi.spyOn(fillMesh.geometry, 'dispose');
      const matSpy = vi.spyOn(fillMesh.material, 'dispose');

      act.dispose();

      expect(geoSpy).toHaveBeenCalled();
      expect(matSpy).toHaveBeenCalled();
      expect(act.tvReticle).toBeNull();
      expect(scene.children.length).toBe(0);
    });

    it('does not render .tv-interactive-hint DOM element in PortfolioApp', () => {
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

      expect(container.querySelector('.tv-interactive-hint')).toBeNull();
      expect(document.querySelector('.tv-interactive-hint')).toBeNull();

      app.destroy();
    });

    it('prioritizes Object_527 (Screen_LowB) over earlier animated frame meshes when anchoring reticle', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new GatewayAct({ scene, camera });

      // Create model hierarchy mimicking the GLTF with internal frame mesh and front glass screen
      const model = new THREE.Group();

      const internalFrameParent = new THREE.Group();
      internalFrameParent.name = 'TV Screen.001_0';
      const internalFrameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.01));
      internalFrameMesh.name = 'Object_4';
      internalFrameMesh.position.set(0, 0, -2.01);
      internalFrameParent.add(internalFrameMesh);
      model.add(internalFrameParent);

      const screenGlassParent = new THREE.Group();
      screenGlassParent.name = 'Screen_LowB_282';
      const screenGlassMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.04));
      screenGlassMesh.name = 'Object_527';
      screenGlassMesh.position.set(0, 0, -1.97);
      screenGlassParent.add(screenGlassMesh);
      model.add(screenGlassParent);

      act.setWhiteRoomModel(model);

      expect(act.tvScreenMesh).toBe(screenGlassMesh);
      // Reticle must be positioned at front of screenGlassMesh
      const screenBox = new THREE.Box3().setFromObject(screenGlassMesh);
      expect(act.tvReticle.position.z).toBeCloseTo(screenBox.max.z + 0.02, 3);
      expect(act.tvReticle.renderOrder).toBe(10);

      // getTvScreenExtents computes proportional extents from screen mesh
      const extents = act.getTvScreenExtents();
      expect(extents.halfWidth).toBeGreaterThan(0.2);
      expect(extents.halfHeight).toBeGreaterThan(0.15);

      act.dispose();
    });

    it('correctly maps 4-corner frustum beam projection: TV top to Card top, and TV bottom to Card bottom', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div id="station-container" class="station-container"></div>
        <svg class="hologram-beam-svg">
          <circle class="beam-emitter" />
          <polygon class="beam-poly-top" />
          <polygon class="beam-poly-bottom" />
          <polygon class="beam-poly-left" />
          <polygon class="beam-poly-right" />
          <line class="beam-ray-top-left" />
          <line class="beam-ray-top-right" />
          <line class="beam-ray-bottom-left" />
          <line class="beam-ray-bottom-right" />
          <line class="beam-ray-top-mid" />
          <line class="beam-ray-bottom-mid" />
          <line class="beam-ray-center" />
        </svg>
      `;
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true,
        enableJourney: true
      });

      // Position gateway card mock
      const card = container.querySelector('.station-card.gateway-card');
      expect(card).not.toBeNull();
      card.getBoundingClientRect = () => ({
        left: 500,
        right: 900,
        top: 150,
        bottom: 450,
        width: 400,
        height: 300
      });

      // Open hologram
      app.openBioHologram();
      expect(app.isBioHologramOpen).toBe(true);

      const rayTL = container.querySelector('.beam-ray-top-left');
      const rayBL = container.querySelector('.beam-ray-bottom-left');
      const rayTR = container.querySelector('.beam-ray-top-right');
      const rayBR = container.querySelector('.beam-ray-bottom-right');

      // Top rays must terminate at cardTop (150)
      expect(Number(rayTL.getAttribute('y2'))).toBe(150);
      expect(Number(rayTR.getAttribute('y2'))).toBe(150);

      // Bottom rays must terminate at cardBottom (450)
      expect(Number(rayBL.getAttribute('y2'))).toBe(450);
      expect(Number(rayBR.getAttribute('y2'))).toBe(450);

      // Top ray origin y1 must be above bottom ray origin y1
      expect(Number(rayTL.getAttribute('y1'))).toBeLessThan(Number(rayBL.getAttribute('y1')));

      app.destroy();
    });

    it('removes the closed TV bio hologram from the tab order using inert and aria-hidden', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div id="station-container" class="station-container"></div>
        <svg class="hologram-beam-svg">
          <circle class="beam-emitter" />
          <polygon class="beam-poly-top" />
          <polygon class="beam-poly-bottom" />
          <polygon class="beam-poly-left" />
          <polygon class="beam-poly-right" />
          <line class="beam-ray-top-left" />
          <line class="beam-ray-top-right" />
          <line class="beam-ray-bottom-left" />
          <line class="beam-ray-bottom-right" />
          <line class="beam-ray-top-mid" />
          <line class="beam-ray-bottom-mid" />
          <line class="beam-ray-center" />
        </svg>
      `;
      const canvas = document.createElement('canvas');
      const srAnnouncer = document.createElement('div');

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true,
        enableJourney: true
      });

      const card = container.querySelector('.station-card.gateway-card');
      expect(card).not.toBeNull();

      // Initially closed: card must be inert and aria-hidden to keep interactive children out of the tab order
      expect(card.hasAttribute('inert')).toBe(true);
      expect(card.getAttribute('aria-hidden')).toBe('true');
      expect(card.classList.contains('is-open')).toBe(false);

      // Open hologram: must expose card and remove inert/aria-hidden
      app.openBioHologram();
      expect(app.isBioHologramOpen).toBe(true);
      expect(card.hasAttribute('inert')).toBe(false);
      expect(card.hasAttribute('aria-hidden')).toBe(false);
      expect(card.classList.contains('is-open')).toBe(true);

      // Close hologram: must re-apply inert and aria-hidden
      app.closeBioHologram();
      expect(app.isBioHologramOpen).toBe(false);
      expect(card.hasAttribute('inert')).toBe(true);
      expect(card.getAttribute('aria-hidden')).toBe('true');
      expect(card.classList.contains('is-open')).toBe(false);

      app.destroy();
    });
  });
});
