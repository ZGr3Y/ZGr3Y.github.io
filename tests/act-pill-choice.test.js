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
    it('eases into and out of a raycast hover without an instantaneous scale change', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });

      act.update({ progress: 0.38, speedFactor: 0 });
      // Frame the current transformed pill, including responsive hand placement.
      const blueWorldPos = new THREE.Vector3();
      act.bluePill.mesh.getWorldPosition(blueWorldPos);
      camera.position.set(blueWorldPos.x, blueWorldPos.y, blueWorldPos.z + 1.0);
      camera.lookAt(blueWorldPos);
      camera.updateMatrixWorld();

      // Pointer at dead center (0, 0)
      act.handlePointerMove({ x: 0, y: 0 });
      expect(act.hoveredPill).toBe('blue');
      expect(act.bluePill.mesh.scale.x).toBe(1.0);
      expect(act.isResting()).toBe(false);
      act.update({ progress: 0.38, delta: 0.016, speedFactor: 0 });
      expect(act.bluePill.mesh.scale.x).toBeGreaterThan(1.0);

      // Move pointer away
      act.handlePointerMove({ x: 0.99, y: 0.99 });
      expect(act.hoveredPill).toBeNull();
      expect(act.bluePill.mesh.scale.x).toBeGreaterThan(1.0);
      for (let i = 0; i < 120; i++) act.update({ progress: 0.38, delta: 0.016, speedFactor: 0 });
      expect(act.bluePill.mesh.scale.x).toBe(1.0);
      expect(act.isResting()).toBe(true);

      act.dispose();
    });

    it('selects branch via handlePointerClick and triggers callback', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const onSelect = vi.fn();
      const act = new PillChoiceAct({ scene, camera, onSelect });

      act.update({ progress: 0.38, speedFactor: 0 });
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

    it('keeps the selected pill in its palm while the camera moves, then resets its light', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const onSelect = vi.fn();
      const act = new PillChoiceAct({ scene, camera, onSelect });
      act.update({ progress: 0.38, delta: 0, speedFactor: 0 });
      const originalParent = act.bluePill.group.parent;
      const originalPosition = act.bluePill.group.position.clone();
      const initialWorld = act.bluePill.mesh.getWorldPosition(new THREE.Vector3());
      camera.position.copy(initialWorld).add(new THREE.Vector3(0, 0, 1));
      camera.lookAt(initialWorld);

      act.selectBranch('blue');
      act.selectBranch('blue');
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(act.bluePill.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(initialWorld)).toBeLessThan(0.00001);
      expect(act.getSelectionProgress()).toBe(0);
      expect(act.isResting()).toBe(false);

      act.update({ progress: 0.38, delta: 0.016, speedFactor: 0 });
      expect(act.getSelectionProgress()).toBeGreaterThan(0);
      expect(act.getSelectionProgress()).toBeLessThan(1);
      for (let i = 0; i < 120; i++) act.update({ progress: 0.6, delta: 0.016, speedFactor: 0 });
      expect(act.getSelectionProgress()).toBe(1);
      expect(act.bluePill.group.parent).toBe(originalParent);
      expect(act.bluePill.group.position.equals(originalPosition)).toBe(true);
      camera.position.set(42, 0, -1);
      act.update({ progress: .6, delta: .1, speedFactor: 0 });
      expect(act.bluePill.group.position.equals(originalPosition)).toBe(true);

      expect(act.isResting()).toBe(true);

      const selectedWorld = act.bluePill.group.getWorldPosition(new THREE.Vector3());
      act.resetSelection();
      expect(act.bluePill.group.getWorldPosition(new THREE.Vector3()).distanceTo(selectedWorld)).toBeLessThan(0.00001);
      expect(act.isResting()).toBe(false);
      for (let i = 0; i < 120; i++) act.update({ progress: 0.38, delta: 0.016, speedFactor: 0 });
      expect(act.bluePill.group.parent).toBe(originalParent);
      expect(act.bluePill.group.position.equals(originalPosition)).toBe(true);
      expect(act.getSelectionProgress()).toBe(0);
      expect(act.isResting()).toBe(true);
      act.dispose();
    });

    it('ignores pill hover and click hits while the choice scene is hidden', () => {
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

      // At loader progress 0.10, rootGroup is hidden
      act.update({ progress: 0.10 });
      expect(act.rootGroup.visible).toBe(false);

      // Pointer hover should be ignored
      act.handlePointerMove({ x: 0, y: 0 });
      expect(act.hoveredPill).toBeNull();

      // Pointer click should be ignored and not select branch
      const result = act.handlePointerClick({ x: 0, y: 0 });
      expect(result).toBeNull();
      expect(act.selectedBranch).toBeNull();
      expect(onSelect).not.toHaveBeenCalled();

      // Fast-forward to White Room entrance (progress 0.20, still < 0.22)
      act.update({ progress: 0.20 });
      expect(act.rootGroup.visible).toBe(false);
      expect(act.handlePointerClick({ x: 0, y: 0 })).toBeNull();
      expect(act.selectedBranch).toBeNull();
      expect(onSelect).not.toHaveBeenCalled();

      act.dispose();
    });
  });

  describe('JourneyState & Branch Gating Integration', () => {
    it('maps experiences to red branch and harness to blue branch per ADR 0003', () => {
      const state = new JourneyState();

      expect(state.getBranch()).toBe('unselected');

      state.selectBranch('experiences');
      expect(state.getBranch()).toBe('red');

      state.resetBranch();
      expect(state.getBranch()).toBe('unselected');

      state.selectBranch('harness');
      expect(state.getBranch()).toBe('blue');
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
    function createRenderer() {
      const renderStates = [];
      return {
        renderStates,
        getViewport: (v) => v.set(0, 0, 800, 600),
        getScissor: (v) => v.set(0, 0, 800, 600),
        getScissorTest: () => false,
        setViewport: vi.fn(),
        setScissor: vi.fn(),
        setScissorTest: vi.fn(),
        compileAsync: vi.fn().mockResolvedValue(undefined),
        render: (scene) => renderStates.push(scene.getObjectByName('PillChoiceActGroup').visible)
      };
    }

    it('prepares both lighting configurations before first entry and restores rendering state', async () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });
      const renderer = createRenderer();
      const mesh = act.bluePill.mesh;
      const wasCulled = mesh.frustumCulled;
      // A loader animation frame can hide the hands while compileAsync is pending.
      renderer.compileAsync.mockImplementation(async () => {
        act.update({ progress: 0 });
      });

      await act.prepare(renderer);

      expect(renderer.renderStates).toEqual([true, false]);
      expect(act.rootGroup.visible).toBe(false);
      expect(mesh.frustumCulled).toBe(wasCulled);
      expect(renderer.setViewport).toHaveBeenLastCalledWith(new THREE.Vector4(0, 0, 800, 600));
      expect(renderer.setScissorTest).toHaveBeenLastCalledWith(false);
      act.dispose();
    });

    it('restores visibility and culling if GPU preparation fails', async () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });
      const renderer = createRenderer();
      renderer.compileAsync.mockRejectedValue(new Error('Context lost'));

      await expect(act.prepare(renderer)).rejects.toThrow('Context lost');

      expect(act.rootGroup.visible).toBe(false);
      expect(act.bluePill.mesh.frustumCulled).toBe(true);
      expect(renderer.renderStates).toEqual([]);
      act.dispose();
    });

    it('does not render after disposal while shader preparation is pending', async () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });
      const renderer = createRenderer();
      let finishCompilation;
      renderer.compileAsync.mockImplementation(() => new Promise(resolve => { finishCompilation = resolve; }));

      const pending = act.prepare(renderer);
      act.dispose();
      finishCompilation();
      await pending;

      expect(renderer.renderStates).toEqual([]);
    });

    it('reports isResting true when hands are stationary, including during a settled hover', () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      const act = new PillChoiceAct({ scene, camera });

      expect(act.isResting()).toBe(true);

      act.rootGroup.visible = true;
      expect(act.isResting()).toBe(true);

      // Settled hover must also be treated as resting per Codex P2
      act.hoveredPill = 'blue';
      expect(act.isResting()).toBe(true);

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

    it('animates to the branch entrance after selection without entering an unbuilt act', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });
      if (app.loaderController) app.loaderController.complete();

      app.scrollEngine.scrollTo(0.38);
      app.scrollEngine.currentProgress = 0.38;
      app.journeyState.setProgress(0.38);

      // Select Blue Pill
      app.pillChoiceAct.selectBranch('blue');
      expect(app.journeyState.getBranch()).toBe('blue');
      expect(app.scrollEngine.getTargetProgress()).toBe(0.60);

      // Advance past debounce cooldown
      vi.advanceTimersByTime(600);

      // Further scrolling holds at the current slice's branch entrance.
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
      expect(app.getActiveStationIndex()).toBe(0);
      expect(app.scrollEngine.getTargetProgress()).toBe(0.60);
    });

    it('scrolling up from a selected branch returns to the choice and re-arms its gate', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });
      app.loaderController.complete();
      app.scrollEngine.currentProgress = 0.6;
      app.journeyState.selectBranch('red');
      app.journeyState.setProgress(0.6);
      app.scrollEngine.scrollTo(0.6);

      window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));

      expect(app.journeyState.getBranch()).toBe('unselected');
      expect(app.pillChoiceAct.selectedBranch).toBeNull();
      expect(app.scrollEngine.getTargetProgress()).toBe(0.38);
      expect(app.isStationGated(1)).toBe(true);
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

      expect(keyIntensityAtEntrance).toBeGreaterThan(0);
      expect(hemiIntensityAtEntrance).toBeGreaterThan(0);
      expect(ambIntensityAtEntrance).toBeGreaterThan(0);
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
      for (let i = 0; i < 120; i++) app.pillChoiceAct.update({ progress: 0.6, delta: 0.016, speedFactor: 0 });
      expect(app.pillChoiceAct.bluePill.light.intensity).toBeGreaterThan(baseBlueLight);
      app.pillChoiceAct.resetSelection();
      for (let i = 0; i < 120; i++) app.pillChoiceAct.update({ progress: 0.38, delta: 0.016, speedFactor: 0 });
      expect(app.pillChoiceAct.bluePill.haloMesh.scale.x).toBeCloseTo(1.0, 2);
      expect(app.pillChoiceAct.bluePill.light.intensity).toBeCloseTo(baseBlueLight, 2);
      expect(app.pillChoiceAct.redPill.light.intensity).toBeCloseTo(baseRedLight, 2);

      // Ascending back to progress 0.20 restores full studio lighting
      app.gatewayAct.update({ progress: 0.20, pointer: { x: 0, y: 0 }, delta: 0.016, speedFactor: 1.0 });
      expect(app.gatewayAct.keyLight.intensity).toBeCloseTo(keyIntensityAtEntrance, 2);
      expect(app.gatewayAct.hemiLight.intensity).toBeCloseTo(hemiIntensityAtEntrance, 2);
      expect(app.ambientLight.intensity).toBeCloseTo(ambIntensityAtEntrance, 2);
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

      // Navigating to another station once a branch is chosen hides PillChoiceAct and restores ambient light
      app.journeyState.selectBranch('blue');
      app.navigateTo(1);
      // The hands stay in world space during the dolly, then leave the project view.
      expect(app.pillChoiceAct.rootGroup.visible).toBe(true);
      app._advanceCameraFlight(2.8);
      expect(app.pillChoiceAct.rootGroup.visible).toBe(false);
      expect(app.scene.background.getHexString()).toBe('979d9b');
      expect(app.ambientLight.intensity).toBeCloseTo(0.9, 2);
    });

    it('gates direct station jumps and marks HUD buttons until a branch is chosen', async () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });
      if (app.loaderController) app.loaderController.complete();

      // Before branch selection, direct jump to Station 1 (Lab) must be gated
      expect(app.isStationGated(1)).toBe(true);
      expect(app.isStationGated(2)).toBe(true);
      expect(app.isStationGated(3)).toBe(true);

      const labHudBtn = container.querySelector('.hud-btn[data-station-index="1"]');
      expect(labHudBtn).not.toBeNull();
      expect(labHudBtn.getAttribute('aria-disabled')).toBe('true');
      expect(labHudBtn.classList.contains('is-gated')).toBe(true);

      // Calling navigateTo(1) while unselected keeps user at Gateway (Station 0) and scrolls to pill choice (0.38)
      await app.navigateTo(1);
      expect(app.getActiveStationIndex()).toBe(0);
      expect(app.scrollEngine.getTargetProgress()).toBe(0.38);

      // Clicking HUD button while unselected also keeps user at Gateway
      labHudBtn.click();
      expect(app.getActiveStationIndex()).toBe(0);
      expect(app.scrollEngine.getTargetProgress()).toBe(0.38);

      // Selecting a branch unlocks the gate and removes aria-disabled from HUD buttons
      app.journeyState.selectBranch('red');
      expect(app.isStationGated(1)).toBe(false);
      expect(labHudBtn.hasAttribute('aria-disabled')).toBe(false);
      expect(labHudBtn.classList.contains('is-gated')).toBe(false);

      // Now direct navigation succeeds
      await app.navigateTo(1);
      expect(app.getActiveStationIndex()).toBe(1);
      expect(app.getActiveStation().id).toBe('lab');
    });

    it('selects the pills from the focused canvas without overlay buttons', () => {
      app = new PortfolioApp({ container, canvas, enableLoader: true });
      app.loaderController.complete();
      app.journeyState.setProgress(0.38);
      app.pillChoiceAct.update({ progress: 0.38 });
      app.journeyHud.update();
      expect(container.querySelector('.journey-branch-actions')).toBeNull();
      expect(container.querySelector('.btn-branch-choice')).toBeNull();

      canvas.focus();
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      // Normal rendering between key presses must keep the keyboard highlight.
      app.pillChoiceAct.update({ progress: 0.38, pointer: { x: 0, y: 0 } });
      expect(app.pillChoiceAct.hoveredPill).toBe('blue');
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(app.journeyState.getBranch()).toBe('blue');
      expect(app.pillChoiceAct.selectedBranch).toBe('blue');
      expect(app.scrollEngine.getTargetProgress()).toBe(0.60);
    });
  });
});
