import * as THREE from 'three';
import { disposeThreeObject } from '../utils/threeUtils.js';

/**
 * JourneyScene — Three.js Scene Coordinator for Narrative 3D Journey
 * Manages narrative models, camera waypoints, and background ambient elements.
 */
export class JourneyScene {
  /**
   * @param {Object} options
   * @param {THREE.Scene} options.scene
   */
  constructor({ scene } = {}) {
    this.scene = scene;
    this.hitchhikerModel = null;
    this.isDisposed = false;
    this.baseRotX = 0;
    this.baseRotY = Math.PI / 2;
  }

  /**
   * Sets the 3D Hitchhiker's Guide book model in the scene, normalizing its scale
   * @param {THREE.Object3D} model
   */
  setHitchhikerModel(model) {
    if (this.isDisposed || !model) return;

    if (this.hitchhikerModel && this.scene) {
      this.scene.remove(this.hitchhikerModel);
    }

    this.hitchhikerModel = model;

    // Normalize model scale from bounding box so it fits cleanly in the background
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (Number.isFinite(maxDim) && maxDim > 0) {
      const targetSize = 4.2;
      const scale = targetSize / maxDim;
      this.hitchhikerModel.scale.set(scale, scale, scale);
    }

    this.hitchhikerModel.position.set(0, 0, 0);
    this.hitchhikerModel.rotation.set(this.baseRotX, this.baseRotY, 0);

    // Apply authentic monochrome grayscale shader to KHR_materials_unlit texture
    this.hitchhikerModel.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>
            float gray = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
            gl_FragColor.rgb = vec3(gray);
            `
          );
        };
        child.material.needsUpdate = true;
      }
    });

    if (this.scene) {
      this.scene.add(this.hitchhikerModel);
    }
  }

  /**
   * Advances animations during active render loop frames.
   * Model tilts smoothly with mouse/pointer movement without continuous rotation per user directive.
   * @param {number} delta - Seconds since last frame
   * @param {number} speedFactor - Power throttling factor (0.0 to 1.0)
   * @param {Object} [pointer] - Normalized pointer coordinates { x, y } [-1.0 to 1.0]
   * @param {number} [progress=0] - Scroll progress (0.0 to 1.0)
   */
  update(delta, speedFactor = 1.0, pointer = null, progress = 0) {
    if (this.isDisposed || !this.hitchhikerModel) return;

    if (typeof progress === 'number') {
      this.hitchhikerModel.visible = progress < 0.20;
    }

    if (speedFactor <= 0.0001 || !this.hitchhikerModel.visible) return;

    const px = pointer && typeof pointer.x === 'number' ? pointer.x : 0;
    const py = pointer && typeof pointer.y === 'number' ? pointer.y : 0;

    const targetRotX = this.baseRotX - py * 0.05;
    const targetRotY = this.baseRotY + px * 0.08;

    const lerpFactor = Math.min(1.0, delta * 3.5 * speedFactor);
    this.hitchhikerModel.rotation.x += (targetRotX - this.hitchhikerModel.rotation.x) * lerpFactor;
    this.hitchhikerModel.rotation.y += (targetRotY - this.hitchhikerModel.rotation.y) * lerpFactor;
  }

  /**
   * Cleans up 3D objects from scene per CODING_STANDARDS.md §7
   */
  dispose() {
    this.isDisposed = true;

    if (this.hitchhikerModel) {
      disposeThreeObject(this.hitchhikerModel);

      if (this.scene) {
        this.scene.remove(this.hitchhikerModel);
      }
      this.hitchhikerModel = null;
    }

    this.scene = null;
  }
}
