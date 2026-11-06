import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { PillChoiceAct } from '../src/acts/PillChoiceAct.js';
import { JourneyState } from '../src/core/JourneyState.js';
import { PortfolioApp } from '../src/core/PortfolioApp.js';

describe('Ticket 06: Act Pill Choice (Human Blue / Robotic Red Hands & Gated Branching)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('PillChoiceAct: Procedural Pills & Hand Mounting', () => {
    it('initializes PillChoiceAct with procedural glowing capsules in left and right groups', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });

      expect(act.scene).toBe(scene);
      expect(act.camera).toBe(camera);
      expect(scene.children).toContain(act.rootGroup);

      // Verify Blue Pill (Human / Left)
      expect(act.bluePill).toBeDefined();
      expect(act.bluePill.mesh.userData.pill).toBe('blue');
      expect(act.bluePill.mesh.geometry).toBeInstanceOf(THREE.CapsuleGeometry);
      expect(act.leftGroup.children).toContain(act.bluePill.group);

      // Verify Red Pill (Robotic / Right)
      expect(act.redPill).toBeDefined();
      expect(act.redPill.mesh.userData.pill).toBe('red');
      expect(act.redPill.mesh.geometry).toBeInstanceOf(THREE.CapsuleGeometry);
      expect(act.rightGroup.children).toContain(act.redPill.group);

      // Symmetrical horizontal offset relative to center
      expect(act.leftGroup.position.x).toBeLessThan(act.roomPosition.x);
      expect(act.rightGroup.position.x).toBeGreaterThan(act.leftGroup.position.x);

      act.dispose();
      expect(scene.children).not.toContain(act.rootGroup);
    });

    it('normalizes human and robotic hand models and adds them with open palm orientations', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });

      // Mock human hand mesh
      const humanMesh = new THREE.Mesh(new THREE.BoxGeometry(20, 25, 25));
      const humanModel = new THREE.Group();
      humanModel.add(humanMesh);

      // Mock robotic hand mesh with sub-parts (pCube41, pCube42, polySurface1, polySurface39_covers_0)
      const sharedRobotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.FrontSide });
      const robotMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), sharedRobotMat);
      robotMesh.name = 'pSphere5_Hand_0';
      const pCube41 = new THREE.Group();
      pCube41.name = 'pCube41';
      const pCube42 = new THREE.Group();
      pCube42.name = 'pCube42';
      const polySurface1 = new THREE.Group();
      polySurface1.name = 'polySurface1';
      const cableMesh = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), sharedRobotMat);
      cableMesh.name = 'polySurface39_covers_0';
      const robotModel = new THREE.Group();
      robotModel.add(robotMesh, pCube41, pCube42, polySurface1, cableMesh);

      act.setHumanHandModel(humanModel);
      act.setRoboticHandModel(robotModel);

      expect(act.humanHandModel).toBeDefined();
      expect(act.roboticHandModel).toBeDefined();
      expect(act.leftGroup.children).toContain(act.humanHandModel);
      expect(act.rightGroup.children).toContain(act.roboticHandModel);

      // Verify source asset material is never mutated in-place
      expect(sharedRobotMat.side).toBe(THREE.FrontSide);
      expect(sharedRobotMat.color.getHex()).toBe(0xffffff);

      // Verify pCube41 & pCube42 remain visible as the carbon-fiber thumb pad while polySurface1 is hidden
      let cloned41 = null;
      let cloned42 = null;
      let clonedPoly1 = null;
      act.roboticHandModel.traverse((c) => {
        if (c.name === 'pCube41') cloned41 = c;
        if (c.name === 'pCube42') cloned42 = c;
        if (c.name === 'polySurface1') clonedPoly1 = c;
      });
      expect(cloned41.visible).toBe(true);
      expect(cloned42.visible).toBe(true);
      expect(clonedPoly1.visible).toBe(false);

      // Verify normalization scales models to normalized hand dimension (and mirrors robotic hand X for anatomical right hand)
      expect(act.humanHandModel.scale.x).toBeCloseTo(1.25 / 25, 2);
      expect(Math.abs(act.roboticHandModel.scale.x)).toBeCloseTo(1.25 / 0.15, 2);
      expect(act.roboticHandModel.scale.x).toBeLessThan(0);

      act.dispose();
    });
  });

  describe('PillChoiceAct: Raycasting Hover & Selection Logic', () => {
    it('detects raycast intersection on pills and applies hover highlight and scale', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });

      // Frame camera directly at Blue Pill
      const blueWorldPos = new THREE.Vector3();
      act.bluePill.mesh.getWorldPosition(blueWorldPos);
      camera.position.set(blueWorldPos.x, blueWorldPos.y, blueWorldPos.z + 1.0);
      camera.lookAt(blueWorldPos);
      camera.updateMatrixWorld();

      // Pointer at dead center (0, 0)
      act.handlePointerMove({ x: 0, y: 0 });
      expect(act.hoveredPill).toBe('blue');
      expect(act.bluePill.mesh.scale.x).toBeGreaterThan(1.0);

      // Move pointer away
      act.handlePointerMove({ x: 0.99, y: 0.99 });
      expect(act.hoveredPill).toBeNull();
      expect(act.bluePill.mesh.scale.x).toBe(1.0);

      act.dispose();
    });

    it('selects branch via handlePointerClick and triggers callback', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const onSelect = vi.fn();
      const act = new PillChoiceAct({ scene, camera, onSelect });

      // Frame camera directly at Red Pill
      const redWorldPos = new THREE.Vector3();
      act.redPill.mesh.getWorldPosition(redWorldPos);
      camera.position.set(redWorldPos.x, redWorldPos.y, redWorldPos.z + 1.0);
      camera.lookAt(redWorldPos);
      camera.updateMatrixWorld();

      const result = act.handlePointerClick({ x: 0, y: 0 });
      expect(result).toBe('red');
      expect(act.selectedBranch).toBe('red');
      expect(onSelect).toHaveBeenCalledWith('red');

      act.dispose();
    });
  });

  describe('JourneyState & Branch Gating Integration', () => {
    it('maps experiences to blue branch and harness to red branch', () => {
      const state = new JourneyState();

      expect(state.getBranch()).toBe('unselected');

      state.selectBranch('experiences');
      expect(state.getBranch()).toBe('blue');

      state.resetBranch();
      expect(state.getBranch()).toBe('unselected');

      state.selectBranch('harness');
      expect(state.getBranch()).toBe('red');
    });

    it('allows resetting selection when scrolling back up', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });

      act.selectBranch('blue');
      expect(act.selectedBranch).toBe('blue');

      act.resetSelection();
      expect(act.selectedBranch).toBeNull();
      expect(act.hoveredPill).toBeNull();

      act.dispose();
    });
  });

  describe('Zero-CPU Idle & Teardown', () => {
    it('reports isResting true when hands are stationary and unhovered', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });

      expect(act.isResting()).toBe(true);

      act.rootGroup.visible = true;
      expect(act.isResting()).toBe(true);

      act.hoveredPill = 'blue';
      expect(act.isResting()).toBe(false);

      act.hoveredPill = null;
      expect(act.isResting()).toBe(true);

      act.dispose();
      expect(act.isResting()).toBe(true);
    });

    it('completely disposes all meshes, lights, and materials without memory leaks', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });

      const humanMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      act.setHumanHandModel(humanMesh);

      const robotMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      act.setRoboticHandModel(robotMesh);

      act.dispose();

      expect(act.isDisposed).toBe(true);
      expect(act.humanHandModel).toBeNull();
      expect(act.roboticHandModel).toBeNull();
      expect(act.bluePill).toBeNull();
      expect(act.redPill).toBeNull();
      expect(act.lights.length).toBe(0);
      expect(scene.children).not.toContain(act.rootGroup);
    });
  });

  describe('PortfolioApp Integration: Pill Choice Descent & Gating', () => {
    let container;
    let canvas;
    let app;

    beforeEach(() => {
      container = document.createElement('div');
      container.id = 'app';
      container.innerHTML = `
        <canvas id="cloud-canvas"></canvas>
        <div class="station-container">
          <section class="station-card gateway-card active" data-station="gateway">
            <h1>Bio</h1>
          </section>
          <section class="station-card lab-card" data-station="lab" hidden>
            <h2>Lab</h2>
          </section>
        </div>
      `;
      document.body.appendChild(container);
      canvas = container.querySelector('#cloud-canvas');
    });

    afterEach(() => {
      if (app) {
        app.destroy();
        app = null;
      }
      document.body.innerHTML = '';
    });

    it('mounts PillChoiceAct alongside GatewayAct when enableLoader is true', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });

      expect(app.gatewayAct).toBeDefined();
      expect(app.pillChoiceAct).toBeDefined();
      expect(app.pillChoiceAct).toBeInstanceOf(PillChoiceAct);
    });

    it('scroll down within Gateway descends to Pill Choice (progress 0.38) and fades card', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });

      // Complete loader to enter White Room
      if (app.loaderController) {
        app.loaderController.complete();
      }

      // Initial state at 0.20
      app.scrollEngine.scrollTo(0.20);
      expect(app.scrollEngine.getTargetProgress()).toBe(0.20);

      const gatewayCard = container.querySelector('.station-card.gateway-card');
      expect(gatewayCard.classList.contains('faded')).toBe(false);

      // Trigger scroll down
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));

      // Target progress moves to 0.38 (descent inside Gateway)
      expect(app.scrollEngine.getTargetProgress()).toBe(0.38);

      // Fast forward progress to 0.35
      app.journeyState.setProgress(0.35);
      expect(gatewayCard.classList.contains('faded')).toBe(true);

      // Station must remain on Gateway
      expect(app.getActiveStation().id).toBe('gateway');
    });

    it('blocks downward scroll past Pill Choice when branch is unselected', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });
      if (app.loaderController) app.loaderController.complete();

      // At Pill Choice (both targetProgress and currentProgress at 0.38)
      app.scrollEngine.scrollTo(0.38);
      app.scrollEngine.currentProgress = 0.38;
      app.journeyState.setProgress(0.38);

      expect(app.journeyState.getBranch()).toBe('unselected');

      // Advance past snap/navigation cooldown and attempt to scroll down via wheel and keyboard
      vi.advanceTimersByTime(600);
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
      expect(app.getActiveStation().id).toBe('gateway');
      expect(app.scrollEngine.getTargetProgress()).toBe(0.38);

      vi.advanceTimersByTime(600);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(app.getActiveStation().id).toBe('gateway');
      expect(app.scrollEngine.getTargetProgress()).toBe(0.38);
    });

    it('unlocks navigation once a pill is clicked', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });
      if (app.loaderController) app.loaderController.complete();

      app.scrollEngine.scrollTo(0.38);
      app.scrollEngine.currentProgress = 0.38;
      app.journeyState.setProgress(0.38);

      // Select Blue Pill
      app.pillChoiceAct.selectBranch('blue');
      expect(app.journeyState.getBranch()).toBe('blue');

      // Advance past debounce cooldown
      vi.advanceTimersByTime(600);

      // Now scroll down advances to next station
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
      expect(app.getActiveStationIndex()).toBe(1);
    });

    it('dims room lighting and background while tilting camera downward at Pill Choice (progress 0.38) and restores at 0.20', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });
      if (app.loaderController) app.loaderController.complete();

      // At progress 0.20 (Matrix White Room entrance): full high-key studio lighting
      app.gatewayAct.update({ progress: 0.20, pointer: { x: 0, y: 0 }, delta: 0.016, speedFactor: 1.0 });
      const keyIntensityAtEntrance = app.gatewayAct.keyLight.intensity;
      const hemiIntensityAtEntrance = app.gatewayAct.hemiLight.intensity;
      const ambIntensityAtEntrance = app.ambientLight.intensity;
      const bgHexAtEntrance = app.scene.background.getHex();

      expect(keyIntensityAtEntrance).toBeCloseTo(0.85, 2);
      expect(hemiIntensityAtEntrance).toBeCloseTo(0.60, 2);
      expect(ambIntensityAtEntrance).toBeCloseTo(0.90, 2);
      expect(bgHexAtEntrance).toBe(0xeaecef);

      // Descend to Pill Choice (progress 0.38): room lights dim down and background darkens
      for (let i = 0; i < 60; i++) {
        app.gatewayAct.update({ progress: 0.38, pointer: { x: 0, y: 0 }, delta: 0.05, speedFactor: 1.0 });
        app.pillChoiceAct.update({ progress: 0.38, pointer: { x: 0, y: 0 }, delta: 0.05, speedFactor: 1.0 });
      }

      expect(app.gatewayAct.keyLight.intensity).toBeLessThan(keyIntensityAtEntrance * 0.2);
      expect(app.gatewayAct.hemiLight.intensity).toBeLessThan(hemiIntensityAtEntrance * 0.2);
      expect(app.ambientLight.intensity).toBeLessThan(ambIntensityAtEntrance * 0.2);
      expect(app.scene.background.getHex()).toBe(app.gatewayAct.act2FogColor);

      // Camera lookAt pitches downward (y < -0.85) to place armchairs and lower half of CRT TV in upper third
      expect(app.gatewayAct.currentLookAt.y).toBeLessThan(-0.85);

      // Pill capsules use sleek palm-proportioned geometry with localized non-overlapping point lights and aura groups
      expect(app.pillChoiceAct.bluePill.mesh.geometry.parameters.radius).toBeLessThan(0.035);
      expect(app.pillChoiceAct.redPill.mesh.geometry.parameters.radius).toBeLessThan(0.035);
      expect(app.pillChoiceAct.bluePill.light.distance).toBeLessThan(1.0);
      expect(app.pillChoiceAct.redPill.light.distance).toBeLessThan(1.0);
      expect(app.pillChoiceAct.blueWispsGroup).toBeDefined();
      expect(app.pillChoiceAct.redGlitchGroup).toBeDefined();

      // Verify hover and resetSelection preserve exact calibrated base light intensities
      const baseBlueLight = app.pillChoiceAct.bluePill.baseLightIntensity;
      const baseRedLight = app.pillChoiceAct.redPill.baseLightIntensity;
      app.pillChoiceAct.selectBranch('blue');
      expect(app.pillChoiceAct.bluePill.haloMesh.scale.x).toBeCloseTo(1.3, 2);
      app.pillChoiceAct.resetSelection();
      expect(app.pillChoiceAct.bluePill.haloMesh.scale.x).toBeCloseTo(1.0, 2);
      expect(app.pillChoiceAct.bluePill.light.intensity).toBeCloseTo(baseBlueLight, 2);
      expect(app.pillChoiceAct.redPill.light.intensity).toBeCloseTo(baseRedLight, 2);

      // Ascending back to progress 0.20 restores full studio lighting
      app.gatewayAct.update({ progress: 0.20, pointer: { x: 0, y: 0 }, delta: 0.016, speedFactor: 1.0 });
      expect(app.gatewayAct.keyLight.intensity).toBeCloseTo(0.85, 2);
      expect(app.gatewayAct.hemiLight.intensity).toBeCloseTo(0.60, 2);
      expect(app.ambientLight.intensity).toBeCloseTo(0.90, 2);
      expect(app.scene.background.getHex()).toBe(0xeaecef);
    });

    it('scales horizontal hand offsets and localized light distance on narrow mobile portrait viewports', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });
      if (app.loaderController) app.loaderController.complete();

      app.camera.aspect = 375 / 667;
      app.camera.updateProjectionMatrix();

      for (let i = 0; i < 60; i++) {
        app.gatewayAct.update({ progress: 0.38, pointer: { x: 0, y: 0 }, delta: 0.05, speedFactor: 1.0 });
        app.pillChoiceAct.update({ progress: 0.38, pointer: { x: 0, y: 0 }, delta: 0.05, speedFactor: 1.0 });
      }
      app.scene.updateMatrixWorld(true);
      app.camera.updateMatrixWorld(true);

      const blueWorld = new THREE.Vector3();
      const redWorld = new THREE.Vector3();
      app.pillChoiceAct.bluePill.mesh.getWorldPosition(blueWorld);
      app.pillChoiceAct.redPill.mesh.getWorldPosition(redWorld);

      const blueNdc = blueWorld.clone().project(app.camera);
      const redNdc = redWorld.clone().project(app.camera);

      // Both pills must project cleanly inside the horizontal mobile viewport frustum [-1, 1]
      expect(blueNdc.x).toBeGreaterThan(-0.92);
      expect(blueNdc.x).toBeLessThan(0);
      expect(redNdc.x).toBeGreaterThan(0);
      expect(redNdc.x).toBeLessThan(0.92);

      // Localized light distance shrinks proportionally on narrow screens to prevent cross-hand light bleed
      expect(app.pillChoiceAct.bluePill.light.distance).toBeLessThan(0.6);
      expect(app.pillChoiceAct.redPill.light.distance).toBeLessThan(0.6);

      // Navigating to another station hides PillChoiceAct and restores ambient light
      app.navigateTo(1);
      expect(app.pillChoiceAct.rootGroup.visible).toBe(false);
      expect(app.ambientLight.intensity).toBeCloseTo(0.9, 2);
    });
  });
});
