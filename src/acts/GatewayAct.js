import * as THREE from 'three';
import { disposeThreeObject } from '../utils/threeUtils.js';

const ROOM_NORMALIZED_SIZE = 5.2;
const ACT0_END_PROGRESS = 0.2;
const ACT1_END_PROGRESS = 0.4;

/**
 * GatewayAct — Act 01 Scene Coordinator (Matrix White Room & Station 01 Bio)
 * Coordinates the 3D Matrix White Room environment, balanced studio lighting,
 * smooth camera yaw transition from the Hitchhiker Guide, subtle ambient drift,
 * and pointer parallax.
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
    this.elapsedTime = 0;

    // Waypoints for Act 0 (Loader / Hitchhiker) and Act 1 (Gateway / White Room)
    this.act0CamPos = new THREE.Vector3(0, 0.4, 4.5);
    this.act0LookAt = new THREE.Vector3(0, 0, 0);

    // Entrance into Matrix Room (yawing right, cinematic 3/4 framing both armchairs and TV)
    this.act1EntranceCamPos = new THREE.Vector3(this.roomPosition.x - 1.3, 2.0, 6.2);
    this.act1EntranceLookAt = new THREE.Vector3(this.roomPosition.x + 0.2, 0.9, -0.5);

    // Interior exploration waypoint within Act 1
    this.act1InteriorCamPos = new THREE.Vector3(this.roomPosition.x - 1.0, 1.9, 5.5);
    this.act1InteriorLookAt = new THREE.Vector3(this.roomPosition.x + 0.1, 0.9, -1.2);

    // Dynamic camera coordinates and parallax state
    this.currentCamPos = this.act0CamPos.clone();
    this.currentLookAt = this.act0LookAt.clone();
    this.targetFinalCamPos = this.act0CamPos.clone();
    this.targetFinalLookAt = this.act0LookAt.clone();

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

    // Normalize model scale from bounding box so it frames properly
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (Number.isFinite(maxDim) && maxDim > 0) {
      const scale = ROOM_NORMALIZED_SIZE / maxDim;
      this.whiteRoomModel.scale.set(scale, scale, scale);
    }

    this.whiteRoomModel.position.copy(this.roomPosition);

    if (this.scene) {
      this.scene.add(this.whiteRoomModel);
    }
  }

  /**
   * Updates camera trajectory, pointer parallax, subtle ambient drift, and resting state
   * @param {Object} state
   * @param {number} state.progress - Narrative timeline progress [0.0 - 1.0]
   * @param {Object} [state.pointer] - Normalized pointer coordinates { x, y } [-1.0 - 1.0]
   * @param {number} [state.delta=0.016] - Time delta in seconds
   * @param {number} [state.speedFactor=1.0] - Idle speed dampening factor
   */
  update({ progress = 0, pointer = { x: 0, y: 0 }, delta = 0.016, speedFactor = 1.0 } = {}) {
    if (this.isDisposed || !this.camera) return;

    if (speedFactor > 0.0001) {
      this.elapsedTime += delta * speedFactor;
    }

    let baseCamPos;
    let baseLookAt;

    if (progress <= ACT0_END_PROGRESS) {
      // Act 0 -> Act 1: Turn right from Hitchhiker book into Matrix White Room
      const t = Math.max(0, Math.min(progress / ACT0_END_PROGRESS, 1.0));
      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      baseCamPos = new THREE.Vector3().lerpVectors(this.act0CamPos, this.act1EntranceCamPos, easedT);
      baseLookAt = new THREE.Vector3().lerpVectors(this.act0LookAt, this.act1EntranceLookAt, easedT);
    } else {
      // Act 1 exploration: subtle forward navigation deeper into the Matrix White Room
      const t = Math.max(0, Math.min((progress - ACT0_END_PROGRESS) / (ACT1_END_PROGRESS - ACT0_END_PROGRESS), 1.0));
      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      baseCamPos = new THREE.Vector3().lerpVectors(this.act1EntranceCamPos, this.act1InteriorCamPos, easedT);
      baseLookAt = new THREE.Vector3().lerpVectors(this.act1EntranceLookAt, this.act1InteriorLookAt, easedT);
    }

    // Compute pointer parallax target
    if (pointer && typeof pointer.x === 'number' && typeof pointer.y === 'number') {
      this.targetParallax.set(pointer.x * 0.45, pointer.y * 0.25);
    } else {
      this.targetParallax.set(0, 0);
    }

    // Smoothly lerp parallax offset allowing true 0-damping when idle but settling when resetting
    const settleSpeed = speedFactor > 0.0001 ? speedFactor : 1.0;
    const parallaxLerp = Math.min(1.0, delta * 3.5 * settleSpeed);
    this.parallaxOffset.lerp(this.targetParallax, parallaxLerp);
    if (this.parallaxOffset.distanceToSquared(this.targetParallax) < 0.0005) {
      this.parallaxOffset.copy(this.targetParallax);
    }

    // Subtle ambient camera drift when inside Matrix White Room (Act 1)
    let driftX = 0;
    let driftY = 0;
    if (progress > 0.1 && speedFactor > 0.0001) {
      driftX = Math.sin(this.elapsedTime * 0.6) * 0.08 * speedFactor;
      driftY = Math.cos(this.elapsedTime * 0.45) * 0.05 * speedFactor;
    }

    // Final target positions
    this.targetFinalCamPos.copy(baseCamPos);
    this.targetFinalCamPos.x += this.parallaxOffset.x * 0.3 + driftX;
    this.targetFinalCamPos.y += this.parallaxOffset.y * 0.2 + driftY;

    this.targetFinalLookAt.copy(baseLookAt);
    this.targetFinalLookAt.x += this.parallaxOffset.x + driftX * 0.5;
    this.targetFinalLookAt.y += this.parallaxOffset.y + driftY * 0.5;

    const camLerp = Math.min(1.0, delta * 4.0 * settleSpeed);
    this.currentCamPos.lerp(this.targetFinalCamPos, camLerp);
    this.currentLookAt.lerp(this.targetFinalLookAt, camLerp);
    if (this.currentCamPos.distanceToSquared(this.targetFinalCamPos) < 0.0005) {
      this.currentCamPos.copy(this.targetFinalCamPos);
    }
    if (this.currentLookAt.distanceToSquared(this.targetFinalLookAt) < 0.0005) {
      this.currentLookAt.copy(this.targetFinalLookAt);
    }

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Reports whether camera, drift, and parallax have reached complete equilibrium per CODING_STANDARDS §5
   * @returns {boolean}
   */
  isResting() {
    if (this.isDisposed) return true;
    const parallaxDistSq = this.parallaxOffset.distanceToSquared(this.targetParallax);
    const camPosDistSq = this.currentCamPos.distanceToSquared(this.targetFinalCamPos);
    const lookAtDistSq = this.currentLookAt.distanceToSquared(this.targetFinalLookAt);

    return parallaxDistSq < 0.0005 && camPosDistSq < 0.0005 && lookAtDistSq < 0.0005;
  }

  /**
   * Rebases current camera coordinates to external camera transform (e.g. after station transitions)
   * to prevent visual jumping when GatewayAct resumes camera control.
   * @param {THREE.Vector3} [camPos]
   * @param {THREE.Vector3} [lookAt]
   */
  rebaseCamera(camPos, lookAt) {
    if (this.isDisposed) return;
    if (camPos) {
      this.currentCamPos.copy(camPos);
    }
    if (lookAt) {
      this.currentLookAt.copy(lookAt);
    }
  }

  /**
   * Alias for rebaseCamera
   * @param {THREE.Vector3} [camPos]
   * @param {THREE.Vector3} [lookAt]
   */
  rebase(camPos, lookAt) {
    this.rebaseCamera(camPos, lookAt);
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
