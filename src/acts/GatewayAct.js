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
    this.mixer = null;
    this.tvAction = null;
    this.lights = [];
    this.isDisposed = false;
    this.elapsedTime = 0;
    this._hologramLightBlend = 0;

    // Waypoints for Act 0 (Loader / Hitchhiker) and Act 1 (Gateway / White Room)
    this.act0CamPos = new THREE.Vector3(0, 0.30, 1.25);
    this.act0LookAt = new THREE.Vector3(0, 0.34, 0);

    // Fog & Background palettes for Act 0 (Hitchhiker Magrathea), Act 1 (White Room), & Act 2 (Dimmed Pill Choice)
    this.act0FogColor = 0xb4b8b8;
    this.act1FogColor = 0xeaecef;
    this.act2FogColor = 0x070c13;
    this._lightRoomColor = new THREE.Color(this.act1FogColor);
    this._darkRoomColor = new THREE.Color(this.act2FogColor);
    this._hologramRoomColor = new THREE.Color(0x0a1420);
    if (this.scene) {
      this.scene.background = new THREE.Color(this.act0FogColor);
      this.scene.fog = new THREE.Fog(this.act0FogColor, 0.77, 2.32);
    }

    // Entrance into Matrix Room: centered framing on CRT TV and flanking armchairs
    this.act1EntranceCamPos = new THREE.Vector3(this.roomPosition.x - 0.2, 1.8, 5.6);
    this.act1EntranceLookAt = new THREE.Vector3(this.roomPosition.x - 0.2, 0.8, -0.5);

    // Pill choice descent waypoint: camera pitches downward to frame open hands holding pills
    // while keeping armchairs and lower half of CRT TV visible in the upper third of the viewport
    this.act1InteriorCamPos = new THREE.Vector3(this.roomPosition.x - 0.2, 1.72, 5.22);
    this.act1InteriorLookAt = new THREE.Vector3(this.roomPosition.x - 0.2, -0.94, 0.90);

    // Dynamic camera coordinates and parallax state
    this.currentCamPos = this.act0CamPos.clone();
    this.currentLookAt = this.act0LookAt.clone();
    this.targetFinalCamPos = this.act0CamPos.clone();
    this.targetFinalLookAt = this.act0LookAt.clone();

    this.parallaxOffset = new THREE.Vector2(0, 0);
    this.targetParallax = new THREE.Vector2(0, 0);

    this.contactShadow = this._createContactShadow();
    if (this.contactShadow && this.scene) {
      this.scene.add(this.contactShadow);
    }

    this.isHologramOpen = false;
    this.isTvHovered = false;
    this.tvInteractiveTargets = [];
    this.tvReticle = this._createTvReticle();
    if (this.tvReticle && this.scene) {
      this.scene.add(this.tvReticle);
    }
    if (this.tvReticle) {
      this.tvReticle.traverse((child) => {
        if (child.isMesh) {
          child.userData.interactive = 'tv';
          this.tvInteractiveTargets.push(child);
        }
      });
    }

    this._setupLighting();
  }

  /**
   * Creates a 3D cyberpunk square reticle pinned to the CRT TV screen
   * @private
   * @returns {THREE.Group}
   */
  _createTvReticle() {
    const group = new THREE.Group();
    group.name = 'TvScreenReticle';

    const size = 0.26;
    const half = size / 2;

    // 1. Semi-transparent cyan fill square
    const fillGeo = new THREE.PlaneGeometry(size, size);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);
    fillMesh.name = 'TvReticleFill';
    fillMesh.userData.interactive = 'tv';
    group.add(fillMesh);

    // 2. Outer glowing square border
    const borderPoints = [
      new THREE.Vector3(-half, -half, 0),
      new THREE.Vector3(half, -half, 0),
      new THREE.Vector3(half, half, 0),
      new THREE.Vector3(-half, half, 0),
      new THREE.Vector3(-half, -half, 0)
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const borderLine = new THREE.Line(borderGeo, borderMat);
    borderLine.name = 'TvReticleBorder';
    group.add(borderLine);

    // 3. Four corner reticle brackets for high-tech cyberpunk framing
    const cornerLen = size * 0.28;
    const cornerPoints = [
      new THREE.Vector3(-half, half - cornerLen, 0.001),
      new THREE.Vector3(-half, half, 0.001),
      new THREE.Vector3(-half + cornerLen, half, 0.001),
      new THREE.Vector3(half - cornerLen, half, 0.001),
      new THREE.Vector3(half, half, 0.001),
      new THREE.Vector3(half, half - cornerLen, 0.001),
      new THREE.Vector3(half, -half + cornerLen, 0.001),
      new THREE.Vector3(half, -half, 0.001),
      new THREE.Vector3(half - cornerLen, -half, 0.001),
      new THREE.Vector3(-half + cornerLen, -half, 0.001),
      new THREE.Vector3(-half, -half, 0.001),
      new THREE.Vector3(-half, -half + cornerLen, 0.001)
    ];
    const cornersGeo = new THREE.BufferGeometry().setFromPoints(cornerPoints);
    const cornersMat = new THREE.LineBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const cornersLine = new THREE.LineSegments(cornersGeo, cornersMat);
    cornersLine.name = 'TvReticleCorners';
    group.add(cornersLine);

    // 4. Center pulsing indicator micro-square
    const centerSize = size * 0.22;
    const centerGeo = new THREE.PlaneGeometry(centerSize, centerSize);
    const centerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.70,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.name = 'TvReticleCenter';
    centerMesh.position.z = 0.001;
    centerMesh.userData.interactive = 'tv';
    group.add(centerMesh);

    // Position at default TV screen coordinates
    const defaultPos = new THREE.Vector3(
      this.roomPosition.x,
      this.roomPosition.y + 0.88,
      this.roomPosition.z - 2.55
    );
    group.position.copy(defaultPos);

    // Default hidden during loader and Hitchhiker scene
    group.visible = false;
    group.renderOrder = 10;

    this.tvReticleMaterials = [fillMat, borderMat, cornersMat, centerMat];
    this.tvReticleGeometries = [fillGeo, borderGeo, cornersGeo, centerGeo];

    return group;
  }

  /**
   * Creates a subtle procedural contact shadow disc underneath the furniture
   * @private
   * @returns {THREE.Mesh|null}
   */
  _createContactShadow() {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext && canvas.getContext('2d');
      let texture = null;
      if (ctx && typeof ctx.createRadialGradient === 'function') {
        const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 60);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
        gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.12)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        texture = new THREE.CanvasTexture(canvas);
      }
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: texture ? 0xffffff : 0x0f172a,
        transparent: true,
        depthWrite: false,
        opacity: texture ? 0.75 : 0.05
      });
      const geometry = new THREE.PlaneGeometry(6.0, 4.0);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(this.roomPosition.x, this.roomPosition.y + 0.01, this.roomPosition.z);
      return mesh;
    } catch {
      return null;
    }
  }

  /**
   * Configures balanced studio lighting for the Matrix White Room
   * @private
   */
  _setupLighting() {
    if (!this.scene) return;

    // Directional studio key light highlighting room architecture
    const keyLight = new THREE.DirectionalLight(0xffe4c4, 3.2);
    keyLight.position.set(this.roomPosition.x - 3.5, 6, 4.5);
    keyLight.target.position.set(this.roomPosition.x, this.roomPosition.y + 0.8, 0.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    Object.assign(keyLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 20 });
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.012;
    keyLight.shadow.radius = 5;
    keyLight.shadow.blurSamples = 8;
    keyLight.shadow.autoUpdate = false;
    keyLight.shadow.needsUpdate = true;
    this.scene.add(keyLight);
    this.scene.add(keyLight.target);
    this.keyLight = keyLight;
    this.lights.push(keyLight, keyLight.target);

    // Soft hemisphere ambient fill to maintain high-key studio light
    const hemiLight = new THREE.HemisphereLight(0xc9e2ff, 0x65524a, 0.22);
    hemiLight.position.set(this.roomPosition.x, 15, 0);
    this.scene.add(hemiLight);
    this.hemiLight = hemiLight;
    this.lights.push(hemiLight);

    const fill = new THREE.DirectionalLight(0xb1d3ff, 0.65);
    fill.position.set(this.roomPosition.x + 4, 3, 2);
    fill.target.position.copy(this.roomPosition);
    this.scene.add(fill, fill.target);
    this.fillLight = fill;
    this.lights.push(fill, fill.target);

    const rim = new THREE.DirectionalLight(0xe7f2ff, 1.7);
    rim.position.set(this.roomPosition.x + 1, 4, -3);
    rim.target.position.copy(this.roomPosition);
    this.scene.add(rim, rim.target);
    this.rimLight = rim;
    this.lights.push(rim, rim.target);

    this.tvLight = new THREE.PointLight(0xa0e5ff, 0.6, 4, 2);
    this.scene.add(this.tvLight);
    this.lights.push(this.tvLight);

    // A broad emissive projection lights the inner edges of the furniture.
    this.hologramLight = new THREE.RectAreaLight(0x8edfff, 0, 1.9, 1.2);
    this.hologramLight.position.set(this.roomPosition.x - 0.2, 2.1, 2.1);
    this.hologramLight.lookAt(this.roomPosition.x - 0.2, 0.3, 0);
    this.scene.add(this.hologramLight);
    this.lights.push(this.hologramLight);

    this.shadowFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ color: 0x222b39, opacity: 0.23, depthWrite: false })
    );
    this.shadowFloor.rotation.x = -Math.PI / 2;
    this.shadowFloor.receiveShadow = true;
    this.scene.add(this.shadowFloor);
  }

  /**
   * Sets and normalizes the Matrix White Room model in the scene
   * @param {THREE.Object3D} model
   */
  setWhiteRoomModel(model) {
    if (this.isDisposed || !model) return;

    if (this.whiteRoomModel && this.scene) {
      if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
        this.tvAction = null;
      }
      this.scene.remove(this.whiteRoomModel);
      disposeThreeObject(this.whiteRoomModel);
    }

    this.whiteRoomModel = model;

    // Initialize animation mixer for built-in CRT TV playback clip
    if (model.animations && model.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.whiteRoomModel);
      const clip = THREE.AnimationClip.findByName(model.animations, 'Animation') || model.animations[0];
      if (clip) {
        this.tvAction = this.mixer.clipAction(clip);
        this.tvAction.play();
      }
    }

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
    this.whiteRoomModel.updateMatrixWorld(true);
    const furnitureBounds = new THREE.Box3().setFromObject(this.whiteRoomModel);
    const floorY = Number.isFinite(furnitureBounds.min.y) ? furnitureBounds.min.y : this.roomPosition.y;
    this.shadowFloor.position.set(this.roomPosition.x, floorY - 0.004, this.roomPosition.z);
    this.keyLight.shadow.needsUpdate = true;

    // Collect CRT TV screen, reticle, and casing meshes for interactive raycast projection
    this.tvInteractiveTargets = [];
    if (this.tvReticle) {
      this.tvReticle.traverse((child) => {
        if (child.isMesh) {
          child.userData.interactive = 'tv';
          this.tvInteractiveTargets.push(child);
        }
      });
    }

    this.tvScreenMesh = null;
    this._dimmableScreenMaterials = [];
    let fallbackScreenMesh = null;
    this.whiteRoomModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        let nameChain = (child.name || '');
        let p = child.parent;
        while (p && p !== this.whiteRoomModel) {
          nameChain += ' ' + (p.name || '');
          p = p.parent;
        }
        const lower = nameChain.toLowerCase();
        if (lower.includes('screen') || lower.includes('tv') || lower.includes('case') || lower.includes('frame') || lower.includes('527')) {
          child.userData.interactive = 'tv';
          this.tvInteractiveTargets.push(child);
          if (lower.includes('screen_lowb') || lower.includes('527') || child.name === 'Object_527') {
            this.tvScreenMesh = child;
          } else if (lower.includes('screen') && !fallbackScreenMesh) {
            fallbackScreenMesh = child;
          }
          if ((lower.includes('screen') || lower.includes('527')) && child.material && typeof child.material.clone === 'function') {
            const clonedMat = child.material.clone();
            if (clonedMat.emissive) {
              clonedMat.emissive.setHex(0xc9e7ed);
              clonedMat.emissiveMap = clonedMat.map;
              clonedMat.emissiveIntensity = 0.35;
            }
            child.material = clonedMat;
            this._dimmableScreenMaterials.push({
              material: clonedMat,
              baseColor: clonedMat.color ? clonedMat.color.clone() : null,
              baseEmissive: clonedMat.emissive ? clonedMat.emissive.clone() : null
            });
          }
        }
      }
    });

    if (!this.tvScreenMesh) {
      this.tvScreenMesh = fallbackScreenMesh;
    }

    if (this.scene) {
      this.scene.add(this.whiteRoomModel);
    }

    // Mathematically anchor 3D square reticle to front plane of CRT TV screen
    if (this.tvScreenMesh && this.tvReticle) {
      this.whiteRoomModel.updateMatrixWorld(true);
      const screenBox = new THREE.Box3().setFromObject(this.tvScreenMesh);
      const center = new THREE.Vector3();
      screenBox.getCenter(center);
      this.tvReticle.position.set(center.x, center.y, screenBox.max.z + 0.02);
      this.tvReticle.renderOrder = 10;
      this.tvScreenWorldPos = center.clone();
      this.tvLight.position.copy(this.tvReticle.position);
      this.tvLight.position.z += 0.1;
    }
  }

  /**
   * Updates camera trajectory, pointer parallax, subtle ambient drift, and resting state
   * @param {Object} state
   * @param {number} state.progress - Narrative timeline progress [0.0 - 1.0]
   * @param {Object} [state.pointer] - Normalized pointer coordinates { x, y } [-1.0 - 1.0]
   * @param {number} [state.delta=0.016] - Time delta in seconds
   * @param {number} [state.speedFactor=1.0] - Idle speed dampening factor
   * @param {'blue'|'red'|null} [state.branch=null] - Selected path
   * @param {number} [state.selectionProgress=0] - Pill flight progress [0, 1]
   */
  update({ progress = 0, pointer = { x: 0, y: 0 }, delta = 0.016, speedFactor = 1.0, branch = null, selectionProgress = 0 } = {}) {
    if (this.isDisposed || !this.camera) return;

    const safeDelta = Math.max(0, Math.min(delta, 0.1));

    if (speedFactor > 0.0001) {
      this.elapsedTime += safeDelta * speedFactor;
    }

    if (this.mixer && speedFactor > 0.0001) {
      this.mixer.update(safeDelta * speedFactor);
    }

    // Room dimming factor as camera descends from CRT TV (0.22) to Pill Choice (0.35 - 0.65)
    let dimT = 0;
    if (progress > 0.22 && progress <= 0.65) {
      const rawDim = Math.max(0, Math.min((progress - 0.22) / 0.13, 1.0));
      dimT = rawDim * rawDim * (3 - 2 * rawDim);
    }

    const hologramTarget = this.isHologramOpen ? 1 : 0;
    this._hologramLightBlend = THREE.MathUtils.damp(this._hologramLightBlend, hologramTarget, 4, safeDelta);
    if (Math.abs(hologramTarget - this._hologramLightBlend) < 0.001) this._hologramLightBlend = hologramTarget;
    const hologram = this._hologramLightBlend;
    const roomDim = 1 - (1 - dimT) * (1 - hologram * 0.965);

    // Preserve darkness while practical sources and grazing light shape the subjects.
    if (this.keyLight) {
      this.keyLight.intensity = 3.2 * (1 - roomDim * 0.995);
    }
    if (this.hemiLight) {
      this.hemiLight.intensity = 0.22 * (1 - roomDim * 0.96);
    }
    this.fillLight.intensity = 0.65 * (1 - roomDim * 0.965);
    this.rimLight.intensity = 1.7 * (1 - roomDim * 0.90);
    this.hologramLight.intensity = 3.2 * hologram * (1 - dimT);
    const tvTarget = (0.6 + hologram * 0.5) * (1 - dimT * 0.98);
    this.tvLight.intensity = THREE.MathUtils.damp(this.tvLight.intensity, tvTarget, 6, safeDelta);
    this.shadowFloor.material.opacity = 0.23 * (1 - roomDim * 0.9);
    if (this.scene) this.scene.environmentIntensity = 0.45 * (1 - roomDim * 0.94);
    if (this.contactShadow && this.contactShadow.material) {
      const baseShadowOpacity = this.contactShadow.material.map ? 0.28 : 0.025;
      this.contactShadow.material.opacity = baseShadowOpacity * (1 - roomDim * 0.85);
    }
    if (this.scene) {
      const amb = this.scene.getObjectByName && this.scene.getObjectByName('AmbientLight');
      if (amb && amb.isLight) {
        amb.intensity = 0.12 * (1 - roomDim * 0.97);
      }
    }
    if (this._dimmableScreenMaterials && this._dimmableScreenMaterials.length > 0) {
      const darkScreen = new THREE.Color(0x161918);
      for (const entry of this._dimmableScreenMaterials) {
        if (entry.material.color && entry.baseColor) {
          entry.material.color.copy(entry.baseColor).lerp(darkScreen, dimT * 0.92);
        }
        if (entry.material.emissive && entry.baseEmissive) {
          entry.material.emissive.copy(entry.baseEmissive).multiplyScalar(1 - dimT * 0.92);
          entry.material.emissiveIntensity = 0.35 * (1 - hologram * 0.35);
        }
      }
    }

    // Dynamic fog & background interpolation between Act 0 (Magrathea), Act 1 (White Room), and Act 2 (Dimmed Room)
    if (this.scene && this.scene.fog) {
      if (progress <= ACT0_END_PROGRESS) {
        const t = Math.max(0, Math.min(progress / ACT0_END_PROGRESS, 1.0));
        this.scene.fog.near = 0.77 + t * 50;
        this.scene.fog.far = 2.32 + t * 200;
        if (this.scene.background && this.scene.background.isColor) {
          this.scene.background.setHex(t < 0.5 ? this.act0FogColor : this.act1FogColor);
          this.scene.background.lerp(this._hologramRoomColor, hologram);
        }
        if (this.scene.fog.color) {
          this.scene.fog.color.setHex(t < 0.5 ? this.act0FogColor : this.act1FogColor);
          this.scene.fog.color.lerp(this._hologramRoomColor, hologram);
        }
      } else {
        this.scene.fog.near = 100;
        this.scene.fog.far = 500;
        if (this.scene.background && this.scene.background.isColor) {
          this.scene.background.copy(this._lightRoomColor).lerp(this._darkRoomColor, dimT);
          this.scene.background.lerp(this._hologramRoomColor, hologram);
        }
        if (this.scene.fog.color) {
          this.scene.fog.color.copy(this._lightRoomColor).lerp(this._darkRoomColor, dimT);
          this.scene.fog.color.lerp(this._hologramRoomColor, hologram);
        }
      }
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

    // Leave room above the CRT for its projection, retaining the visible light source.
    if (this.isHologramOpen) {
      baseCamPos.z += 0.25;
      baseLookAt.y += 0.55;
    }

    // Let the pill lead, then carry the camera towards the chosen branch entrance.
    if (branch === 'blue' || branch === 'red') {
      const travel = Math.max(0, Math.min((selectionProgress - 0.25) / 0.75, 1));
      const eased = travel * travel * (3 - 2 * travel);
      const side = branch === 'blue' ? -1 : 1;
      baseCamPos.x += side * eased * 0.24;
      baseCamPos.z -= eased * 0.32;
      baseLookAt.x += side * eased * 0.28;
    }

    // Compute pointer parallax target
    if (pointer && typeof pointer.x === 'number' && typeof pointer.y === 'number') {
      this.targetParallax.set(pointer.x * 0.45, pointer.y * 0.25);
    } else {
      this.targetParallax.set(0, 0);
    }

    // Smoothly lerp parallax offset allowing true 0-damping when idle but settling when resetting
    const settleSpeed = speedFactor > 0.0001 ? speedFactor : 1.0;
    const parallaxDamp = 1.0 - Math.exp(-6.5 * safeDelta * settleSpeed);
    this.parallaxOffset.lerp(this.targetParallax, parallaxDamp);
    if (this.parallaxOffset.distanceToSquared(this.targetParallax) < 1e-7) {
      this.parallaxOffset.copy(this.targetParallax);
    }

    // Subtle ambient camera drift when inside Matrix White Room (Act 1)
    let driftX = 0;
    let driftY = 0;
    if (progress > 0.1 && speedFactor > 0.0001) {
      driftX = Math.sin(this.elapsedTime * 0.5) * 0.03 * speedFactor;
      driftY = Math.cos(this.elapsedTime * 0.38) * 0.02 * speedFactor;
    }

    // Final target positions
    this.targetFinalCamPos.copy(baseCamPos);
    this.targetFinalCamPos.x += this.parallaxOffset.x * 0.3 + driftX;
    this.targetFinalCamPos.y += this.parallaxOffset.y * 0.2 + driftY;

    this.targetFinalLookAt.copy(baseLookAt);
    this.targetFinalLookAt.x += this.parallaxOffset.x + driftX * 0.5;
    this.targetFinalLookAt.y += this.parallaxOffset.y + driftY * 0.5;

    const camDamp = 1.0 - Math.exp(-7.5 * safeDelta * settleSpeed);
    this.currentCamPos.lerp(this.targetFinalCamPos, camDamp);
    this.currentLookAt.lerp(this.targetFinalLookAt, camDamp);
    if (this.currentCamPos.distanceToSquared(this.targetFinalCamPos) < 1e-7) {
      this.currentCamPos.copy(this.targetFinalCamPos);
    }
    if (this.currentLookAt.distanceToSquared(this.targetFinalLookAt) < 1e-7) {
      this.currentLookAt.copy(this.targetFinalLookAt);
    }

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentLookAt);

    // Update TV screen reticle visibility and subtle cyber glow pulse
    const shouldShowReticle = progress >= ACT0_END_PROGRESS && progress <= 0.25 && !this.isHologramOpen;
    if (this.tvReticle) {
      this.tvReticle.visible = shouldShowReticle;
      if (shouldShowReticle && speedFactor > 0.0001) {
        const pulse = 0.75 + 0.25 * Math.sin(this.elapsedTime * 3.5);
        if (this.tvReticleMaterials && this.tvReticleMaterials.length >= 4) {
          this.tvReticleMaterials[0].opacity = 0.16 * pulse; // fill
          this.tvReticleMaterials[1].opacity = 0.85 * pulse; // border
          this.tvReticleMaterials[2].opacity = 0.95 * pulse; // corners
          this.tvReticleMaterials[3].opacity = 0.70 * pulse; // center
        }
        const hoverScale = this.isTvHovered ? 1.08 : 1.0;
        this.tvReticle.scale.lerp(new THREE.Vector3(hoverScale, hoverScale, 1.0), 0.2);
      }
    }
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

    const lightSettled = this._hologramLightBlend === (this.isHologramOpen ? 1 : 0);
    return lightSettled && parallaxDistSq < 1e-5 && camPosDistSq < 1e-5 && lookAtDistSq < 1e-5;
  }

  /**
   * Raycasts against CRT TV to detect pointer hover or click
   * @param {{ x: number, y: number }} pointer - Normalized pointer coords [-1, 1]
   * @param {THREE.Camera} camera
   * @returns {boolean}
   */
  isTvIntersected(pointer, camera) {
    if (this.isDisposed || !camera || !pointer || !this.tvInteractiveTargets || this.tvInteractiveTargets.length === 0) {
      this.isTvHovered = false;
      return false;
    }
    // If TV reticle is currently not visible, TV is non-interactive
    if (this.tvReticle && !this.tvReticle.visible) {
      this.isTvHovered = false;
      return false;
    }
    if (this.tvReticle && typeof this.tvReticle.updateMatrixWorld === 'function') {
      this.tvReticle.updateMatrixWorld(true);
    }
    if (camera && typeof camera.updateMatrixWorld === 'function') {
      camera.updateMatrixWorld(true);
    }
    this.raycaster = this.raycaster || new THREE.Raycaster();
    this.raycaster.setFromCamera(pointer, camera);
    const hits = this.raycaster.intersectObjects(this.tvInteractiveTargets, true);
    this.isTvHovered = hits.length > 0;
    return this.isTvHovered;
  }

  /**
   * Returns world position of the CRT TV screen center or reticle
   * @returns {THREE.Vector3}
   */
  getTvScreenWorldPosition() {
    if (this.tvReticle) {
      const pos = new THREE.Vector3();
      this.tvReticle.getWorldPosition(pos);
      return pos;
    }
    if (this.tvScreenWorldPos) {
      return this.tvScreenWorldPos.clone();
    }
    return new THREE.Vector3(
      this.roomPosition.x,
      this.roomPosition.y + 0.88,
      this.roomPosition.z - 2.55
    );
  }

  /**
   * Returns world half-extents of the CRT TV screen for projector frustum calculation
   * @returns {{ halfWidth: number, halfHeight: number }}
   */
  getTvScreenExtents() {
    if (this.tvScreenMesh) {
      const box = new THREE.Box3().setFromObject(this.tvScreenMesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      return {
        halfWidth: size.x * 0.48,
        halfHeight: size.y * 0.46
      };
    }
    return {
      halfWidth: 0.42,
      halfHeight: 0.30
    };
  }

  /**
   * Updates state when Bio Hologram pop-up is opened or closed
   * @param {boolean} isOpen
   */
  setBioHologramOpen(isOpen) {
    this.isHologramOpen = Boolean(isOpen);
    if (this.tvReticle && this.isHologramOpen) {
      this.tvReticle.visible = false;
    }
  }

  /**
   * Explicit visibility control for the 3D TV reticle
   * @param {boolean} visible
   */
  setTvReticleVisible(visible) {
    if (this.tvReticle) {
      this.tvReticle.visible = Boolean(visible);
    }
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
    if (this.shadowFloor) {
      this.scene?.remove(this.shadowFloor);
      disposeThreeObject(this.shadowFloor);
      this.shadowFloor = null;
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
      this.tvAction = null;
    }

    if (this.whiteRoomModel) {
      disposeThreeObject(this.whiteRoomModel);
      if (this.scene) {
        this.scene.remove(this.whiteRoomModel);
      }
      this.whiteRoomModel = null;
    }

    if (this.contactShadow) {
      disposeThreeObject(this.contactShadow);
      if (this.scene) {
        this.scene.remove(this.contactShadow);
      }
      this.contactShadow = null;
    }

    if (this.tvReticle) {
      if (this.scene) {
        this.scene.remove(this.tvReticle);
      }
      disposeThreeObject(this.tvReticle);
      this.tvReticle = null;
      this.tvReticleMaterials = null;
      this.tvReticleGeometries = null;
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

    if (this.scene) {
      this.scene.fog = null;
      this.scene.background = null;
    }

    this.scene = null;
    this.camera = null;
  }
}
