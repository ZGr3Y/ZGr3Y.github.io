import * as THREE from 'three';
import { disposeThreeObject } from '../utils/threeUtils.js';

/**
 * GatewayAct — Act 01 Scene Coordinator (Matrix White Room & Station 01 Bio)
 * Coordinates the 3D Matrix White Room environment, balanced studio lighting,
 * smooth camera yaw transition from the Hitchhiker Guide, and pointer parallax.
 */
export class GatewayAct {
  /**
   * @param {Object} [options]
   * @param {THREE.Scene} options.scene
   * @param {THREE.PerspectiveCamera} options.camera
   * @param {THREE.Vector3} [options.roomPosition] - Spatial center for Matrix White Room
   */
  constructor({ scene, camera, roomPosition = new THREE.Vector3(25, -0.5, 0) } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.roomPosition = roomPosition;

    this.whiteRoomModel = null;
    this.lights = [];
    this.isDisposed = false;

    // Waypoints for Act 0 (Loader / Hitchhiker) and Act 1 (Gateway / White Room)
    this.act0CamPos = new THREE.Vector3(0, 0.4, 4.5);
    this.act0LookAt = new THREE.Vector3(0, 0, 0);

    this.act1CamPos = new THREE.Vector3(this.roomPosition.x - 1.0, 0.9, 6.0);
    this.act1LookAt = new THREE.Vector3(this.roomPosition.x, 0.7, -4.0);

    // Dynamic camera coordinates and parallax state
    this.currentCamPos = this.act0CamPos.clone();
    this.currentLookAt = this.act0LookAt.clone();
    this.parallaxOffset = new THREE.Vector2(0, 0);
    this.targetParallax = new THREE.Vector2(0, 0);

    this._setupLighting();
  }

  /**
   * Configures balanced studio lighting for the Matrix White Room
   * @private
   */
  _setupLighting() {
    if (!this.scene) return;

    // Directional studio key light highlighting room architecture
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(this.roomPosition.x + 6, 12, 8);
    keyLight.target.position.copy(this.roomPosition);
    this.scene.add(keyLight);
    this.scene.add(keyLight.target);
    this.lights.push(keyLight, keyLight.target);

    // Soft hemisphere ambient fill to maintain high-key studio light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd8dce2, 0.6);
    hemiLight.position.set(this.roomPosition.x, 15, 0);
    this.scene.add(hemiLight);
    this.lights.push(hemiLight);
  }

  /**
   * Sets and normalizes the Matrix White Room model in the scene
   * @param {THREE.Object3D} model
   */
  setWhiteRoomModel(model) {
    if (this.isDisposed || !model) return;

    if (this.whiteRoomModel && this.scene) {
      this.scene.remove(this.whiteRoomModel);
      disposeThreeObject(this.whiteRoomModel);
    }

    this.whiteRoomModel = model;

    // Normalize model scale from bounding box so it frames properly (~28 units)
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (Number.isFinite(maxDim) && maxDim > 0) {
      const targetSize = 28;
      const scale = targetSize / maxDim;
      this.whiteRoomModel.scale.set(scale, scale, scale);
    }

    this.whiteRoomModel.position.copy(this.roomPosition);

    if (this.scene) {
      this.scene.add(this.whiteRoomModel);
    }
  }

  /**
   * Updates camera trajectory, pointer parallax, and resting state
   * @param {Object} state
   * @param {number} state.progress - Narrative timeline progress [0.0 - 1.0]
   * @param {Object} [state.pointer] - Normalized pointer coordinates { x, y } [-1.0 - 1.0]
   * @param {number} [state.delta=0.016] - Time delta in seconds
   * @param {number} [state.speedFactor=1.0] - Idle speed dampening factor
   */
  update({ progress = 0, pointer = { x: 0, y: 0 }, delta = 0.016, speedFactor = 1.0 } = {}) {
    if (this.isDisposed || !this.camera) return;

    // Timeline mapping: Act 0 -> Act 1 occurs within progress [0.0, 0.2]
    const clampedProgress = Math.max(0, Math.min(progress / 0.2, 1.0));
    // Smooth easing curve (easeInOutQuad)
    const easedT = clampedProgress < 0.5
      ? 2 * clampedProgress * clampedProgress
      : 1 - Math.pow(-2 * clampedProgress + 2, 2) / 2;

    const baseCamPos = new THREE.Vector3().lerpVectors(this.act0CamPos, this.act1CamPos, easedT);
    const baseLookAt = new THREE.Vector3().lerpVectors(this.act0LookAt, this.act1LookAt, easedT);

    // Compute pointer parallax target
    if (pointer && typeof pointer.x === 'number' && typeof pointer.y === 'number') {
      this.targetParallax.set(pointer.x * 0.45, pointer.y * 0.25);
    } else {
      this.targetParallax.set(0, 0);
    }

    // Smoothly lerp parallax offset
    const parallaxLerp = Math.min(1.0, delta * 3.5 * Math.max(speedFactor, 0.1));
    this.parallaxOffset.lerp(this.targetParallax, parallaxLerp);

    // Apply interpolated positions to camera
    const finalCamPos = baseCamPos.clone();
    finalCamPos.x += this.parallaxOffset.x * 0.3;
    finalCamPos.y += this.parallaxOffset.y * 0.2;

    const finalLookAt = baseLookAt.clone();
    finalLookAt.x += this.parallaxOffset.x;
    finalLookAt.y += this.parallaxOffset.y;

    const camLerp = Math.min(1.0, delta * 4.0 * Math.max(speedFactor, 0.1));
    this.currentCamPos.lerp(finalCamPos, camLerp);
    this.currentLookAt.lerp(finalLookAt, camLerp);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Reports whether camera and parallax have reached equilibrium
   * @returns {boolean}
   */
  isResting() {
    if (this.isDisposed) return true;
    const parallaxDistSq = this.parallaxOffset.distanceToSquared(this.targetParallax);
    return parallaxDistSq < 0.0005;
  }

  /**
   * Cleans up all 3D assets, lights, and GPU resources per CODING_STANDARDS §7
   */
  dispose() {
    this.isDisposed = true;

    if (this.whiteRoomModel) {
      disposeThreeObject(this.whiteRoomModel);
      if (this.scene) {
        this.scene.remove(this.whiteRoomModel);
      }
      this.whiteRoomModel = null;
    }

    if (this.lights && this.lights.length > 0) {
      this.lights.forEach((light) => {
        if (this.scene) {
          this.scene.remove(light);
        }
        if (typeof light.dispose === 'function') {
          light.dispose();
        }
      });
      this.lights = [];
    }

    this.scene = null;
    this.camera = null;
  }
}
