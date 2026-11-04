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
  }

  /**
   * Sets the 3D Hitchhiker's Guide book model in the scene
   * @param {THREE.Object3D} model
   */
  setHitchhikerModel(model) {
    if (this.isDisposed || !model) return;

    if (this.hitchhikerModel && this.scene) {
      this.scene.remove(this.hitchhikerModel);
    }

    this.hitchhikerModel = model;
    this.hitchhikerModel.position.set(0, 0, -2.5);
    this.hitchhikerModel.rotation.set(0.1, 0, 0);

    if (this.scene) {
      this.scene.add(this.hitchhikerModel);
    }
  }

  /**
   * Advances animations during active render loop frames
   * @param {number} delta - Seconds since last frame
   * @param {number} speedFactor - Power throttling factor (0.0 to 1.0)
   */
  update(delta, speedFactor = 1.0) {
    if (this.isDisposed) return;

    if (this.hitchhikerModel && speedFactor > 0.0001) {
      this.hitchhikerModel.rotation.y += delta * 0.25 * speedFactor;
    }
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
