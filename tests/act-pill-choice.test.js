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

      // Mock robotic hand mesh
      const robotMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08));
      const robotModel = new THREE.Group();
      robotModel.add(robotMesh);

      act.setHumanHandModel(humanModel);
      act.setRoboticHandModel(robotModel);

      expect(act.humanHandModel).toBeDefined();
      expect(act.roboticHandModel).toBeDefined();
      expect(act.leftGroup.children).toContain(act.humanHandModel);
      expect(act.rightGroup.children).toContain(act.roboticHandModel);

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

      // At Pill Choice
      app.scrollEngine.scrollTo(0.38);
      app.journeyState.setProgress(0.38);

      expect(app.journeyState.getBranch()).toBe('unselected');

      // Attempt to scroll down further
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));

      // Station remains Gateway, cannot advance
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
  });
});
