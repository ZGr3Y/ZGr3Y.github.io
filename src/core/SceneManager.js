import * as THREE from 'three';
import { createStarfield } from '../shaders/starfield.js';
import { VariantA_Optics } from '../variants/VariantA_Optics.js';
import { VariantB_Sculptures } from '../variants/VariantB_Sculptures.js';
import { IdleManager } from './IdleManager.js';
import { CameraController } from './CameraController.js';
import { STATIONS } from '../stations/stationsData.js';

/**
 * Three.js 3D Scene Manager
 * Controls WebGLRenderer, camera, lighting, variant hot-swapping, and idle power throttling
 */
export class SceneManager {
  constructor({
    canvas,
    initialVariant = 'A',
    onStationChange = () => {},
    onCoordinatesUpdate = () => {},
    onIdleStateChange = () => {}
  }) {
    this.canvas = canvas;
    this.onStationChange = onStationChange;
    this.onCoordinatesUpdate = onCoordinatesUpdate;
    this.onIdleStateChange = onIdleStateChange;

    this.activeVariantKey = initialVariant;
    this.activeVariantInstance = null;

    this.initScene();
    this.initRenderer();
    this.initCamera();
    this.initLighting();
    this.initStarfield();
    this.initIdleManager();
    this.setVariant(this.activeVariantKey);

    this.clock = new THREE.Clock();
    this.isDisposed = false;

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030611);
    this.scene.fog = new THREE.FogExp2(0x030611, 0.008);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    // DPR Clamping for battery & mobile performance
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Modern cinematic color management
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    if (THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
  }

  initCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);

    this.cameraController = new CameraController({
      camera: this.camera,
      stations: STATIONS,
      onStationChange: (index, station) => {
        this.onStationChange(index, station);
      },
      onCoordinatesUpdate: (pos, target) => {
        this.onCoordinatesUpdate(pos, target);
      },
      onMoveStateChange: (isMoving) => {
        if (this.idleManager) {
          this.idleManager.setCameraMoving(isMoving);
        }
      }
    });
  }

  initLighting() {
    // Ambient fill
    this.ambientLight = new THREE.AmbientLight(0x0e1b38, 1.2);
    this.scene.add(this.ambientLight);

    // Primary rim/specular directional light
    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.mainLight.position.set(15, 25, 20);
    this.scene.add(this.mainLight);

    // Subtle blue counter-light
    this.secondaryLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
    this.secondaryLight.position.set(-15, -10, -10);
    this.scene.add(this.secondaryLight);
  }

  initStarfield() {
    this.starfield = createStarfield({ count: 2800, range: 400 });
    this.scene.add(this.starfield.mesh);
  }

  initIdleManager() {
    this.idleManager = new IdleManager({
      idleTimeoutMs: 3000,
      onStateChange: (isIdle) => {
        this.onIdleStateChange(isIdle);
      }
    });
  }

  setVariant(variantKey) {
    if (this.activeVariantInstance) {
      this.activeVariantInstance.destroy();
      this.activeVariantInstance = null;
    }

    this.activeVariantKey = variantKey;

    if (variantKey === 'A') {
      this.activeVariantInstance = new VariantA_Optics(this.scene);
    } else {
      this.activeVariantInstance = new VariantB_Sculptures(this.scene);
    }

    if (this.idleManager) {
      this.idleManager.recordActivity();
    }
  }

  setSculptureSpeed(mult) {
    if (this.activeVariantInstance && this.activeVariantInstance.setSpeedMultiplier) {
      this.activeVariantInstance.setSpeedMultiplier(mult);
      if (this.idleManager) this.idleManager.recordActivity();
    }
  }

  setSculptureWireframeMode(mode) {
    if (this.activeVariantInstance && this.activeVariantInstance.setWireframeMode) {
      this.activeVariantInstance.setWireframeMode(mode);
      if (this.idleManager) this.idleManager.recordActivity();
    }
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.idleManager) {
      this.idleManager.recordActivity();
    }
  }

  animate(now) {
    if (this.isDisposed) return;
    requestAnimationFrame(this.animate);

    // Idle Damping check: throttle render loop if inactive & static
    if (!this.idleManager.shouldRender(now)) {
      return;
    }

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update Camera Controller
    this.cameraController.update(delta);

    // 2. Update Starfield cosmic drift
    if (this.starfield) {
      this.starfield.update(elapsedTime, delta);
    }

    // 3. Update Active Variant (Optics vs 3D Sculptures)
    if (this.activeVariantInstance) {
      this.activeVariantInstance.update(
        elapsedTime,
        this.camera,
        this.cameraController.mouseDamped
      );
    }

    // 4. Render 3D Canvas
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.isDisposed = true;
    window.removeEventListener('resize', this.onWindowResize);
    if (this.starfield && this.starfield.destroy) {
      this.starfield.destroy();
    }
    if (this.activeVariantInstance) {
      this.activeVariantInstance.destroy();
    }
    this.renderer.dispose();
  }
}
