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
    this.baseRotX = 0.12;
    this.baseRotY = 0;
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

    this.hitchhikerModel.position.set(0, 0, -2.5);
    this.hitchhikerModel.rotation.set(this.baseRotX, this.baseRotY, 0);

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
   */
  update(delta, speedFactor = 1.0, pointer = null) {
    if (this.isDisposed || !this.hitchhikerModel || speedFactor <= 0.0001) return;

    const px = pointer && typeof pointer.x === 'number' ? pointer.x : 0;
    const py = pointer && typeof pointer.y === 'number' ? pointer.y : 0;

    const targetRotX = this.baseRotX - py * 0.2;
    const targetRotY = this.baseRotY + px * 0.35;

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
