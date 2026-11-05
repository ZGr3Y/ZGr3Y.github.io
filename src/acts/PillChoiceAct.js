import * as THREE from 'three';
import { disposeThreeObject } from '../utils/threeUtils.js';

const HAND_NORMALIZED_SIZE = 1.25;

/**
 * PillChoiceAct — Act 02 Scene Coordinator (Creation of Intelligence & Pill Choice)
 * Renders human hand holding a procedural glowing blue pill (left) and robotic hand
 * holding a procedural glowing red pill (right). Both palms face open toward the camera
 * with gentle organic hover/floating physics. Raycasting registers pointer hover and selection clicks.
 */
export class PillChoiceAct {
  /**
   * @param {Object} options
   * @param {THREE.Scene} options.scene
   * @param {THREE.PerspectiveCamera} options.camera
   * @param {THREE.Vector3} [options.roomPosition] - Spatial center anchor
   * @param {Function} [options.onSelect] - Callback when pill is selected (receives 'blue' | 'red')
   * @param {HTMLCanvasElement} [options.canvas] - Canvas for cursor styling
   */
  constructor({
    scene,
    camera,
    roomPosition = new THREE.Vector3(25, -0.5, 0),
    onSelect = null,
    canvas = null
  } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.roomPosition = roomPosition;
    this.onSelect = onSelect;
    this.canvas = canvas;

    this.isDisposed = false;
    this.elapsedTime = 0;
    this.hoveredPill = null;
    this.selectedBranch = null;

    this.raycaster = new THREE.Raycaster();
    this.raycastTargets = [];
    this.lights = [];

    // Root act container in world space
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'PillChoiceActGroup';
    this.rootGroup.visible = false; // Hidden until Gateway descent starts

    // 1. Procedural Blue Pill (Left / Human Palm)
    this.bluePill = this._createProceduralPill({
      colorHex: 0x1d4ed8,
      glowColorHex: 0x38bdf8,
      pillId: 'blue'
    });

    // 2. Procedural Red Pill (Right / Robotic Palm)
    this.redPill = this._createProceduralPill({
      colorHex: 0xb91c1c,
      glowColorHex: 0xef4444,
      pillId: 'red'
    });

    this.raycastTargets = [this.bluePill.mesh, this.redPill.mesh];

    // Left and Right Hand containers
    this.leftGroup = new THREE.Group();
    this.leftGroup.name = 'HumanHandPillGroup';
    this.leftGroup.add(this.bluePill.group);

    this.rightGroup = new THREE.Group();
    this.rightGroup.name = 'RoboticHandPillGroup';
    this.rightGroup.add(this.redPill.group);

    // Anchor coordinates relative to Matrix White Room TV center line (roomPosition.x - 0.2)
    const centerX = this.roomPosition.x - 0.2;
    this.baseLeftPos = new THREE.Vector3(centerX - 0.78, this.roomPosition.y + 0.80, this.roomPosition.z + 3.6);
    this.baseRightPos = new THREE.Vector3(centerX + 0.78, this.roomPosition.y + 0.80, this.roomPosition.z + 3.6);

    this.leftGroup.position.copy(this.baseLeftPos);
    this.rightGroup.position.copy(this.baseRightPos);

    this.rootGroup.add(this.leftGroup);
    this.rootGroup.add(this.rightGroup);

    this._setupLighting();

    if (this.scene) {
      this.scene.add(this.rootGroup);
    }
  }

  /**
   * Creates a procedural glowing pill capsule with soft localized point lighting
   * @private
   * @param {Object} config
   * @param {number} config.colorHex
   * @param {number} config.glowColorHex
   * @param {string} config.pillId
   * @returns {{ group: THREE.Group, mesh: THREE.Mesh, light: THREE.PointLight, baseScale: THREE.Vector3 }}
   */
  _createProceduralPill({ colorHex, glowColorHex, pillId }) {
    const group = new THREE.Group();
    group.name = `Pill_${pillId}`;

    const geometry = new THREE.CapsuleGeometry(0.058, 0.16, 24, 32);
    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: glowColorHex,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.2,
      toneMapped: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `PillMesh_${pillId}`;
    mesh.userData = { pill: pillId };
    mesh.rotation.z = Math.PI / 4;
    mesh.rotation.x = Math.PI / 6;
    group.add(mesh);

    const light = new THREE.PointLight(glowColorHex, 4.0, 3.0);
    light.position.set(0, 0.1, 0.1);
    group.add(light);

    return { group, mesh, light, baseScale: new THREE.Vector3(1, 1, 1) };
  }

  /**
   * Configures balanced key and rim lights highlighting both hands
   * @private
   */
  _setupLighting() {
    const centerX = this.roomPosition.x - 0.2;
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(centerX, 4.0, 5.5);
    this.rootGroup.add(keyLight);
    this.lights.push(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0e7ff, 1.2);
    fillLight.position.set(centerX, -0.5, 4.0);
    this.rootGroup.add(fillLight);
    this.lights.push(fillLight);
  }

  /**
   * Sets and normalizes the human hand model in the left group holding the blue pill
   * @param {THREE.Object3D} model
   */
  setHumanHandModel(model) {
    if (this.isDisposed || !model) return;

    if (this.humanHandModel) {
      this.leftGroup.remove(this.humanHandModel);
      disposeThreeObject(this.humanHandModel);
    }

    const clone = model.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const scale = Number.isFinite(maxDim) && maxDim > 0 ? HAND_NORMALIZED_SIZE / maxDim : 0.04;

    // Center clone on the hollow of the palm so (0, 0, 0) is the palm bed
    // Analyzed hollow center for hand.glb: (4.28, 8.91, 14.35)
    const palmHollow = new THREE.Vector3(4.28, 8.91, 14.35);

    const inner = new THREE.Group();
    inner.position.copy(palmHollow).negate();
    inner.add(clone);

    const pivot = new THREE.Group();
    pivot.add(inner);
    // Orient human left hand with palm cupped facing upward and slightly toward camera
    pivot.rotation.set(-Math.PI / 2.3, Math.PI / 10, -Math.PI / 16);

    const container = new THREE.Group();
    container.name = 'HumanHandContainer';
    container.scale.set(scale, scale, scale);
    container.add(pivot);

    this.humanHandModel = container;
    this.leftGroup.add(this.humanHandModel);

    // Position Blue Pill directly in the hollow of the human palm
    this.bluePill.group.position.set(0, 0.04, 0);
  }

  /**
   * Sets and normalizes the robotic hand model in the right group holding the red pill
   * @param {THREE.Object3D} model
   */
  setRoboticHandModel(model) {
    if (this.isDisposed || !model) return;

    if (this.roboticHandModel) {
      this.rightGroup.remove(this.roboticHandModel);
      disposeThreeObject(this.roboticHandModel);
    }

    const clone = model.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const scale = Number.isFinite(maxDim) && maxDim > 0 ? HAND_NORMALIZED_SIZE / maxDim : 6.0;

    // Center clone on the hollow of the palm so (0, 0, 0) is the palm bed
    // Analyzed hollow center for robotic_hand.glb: (-0.0127, 0.0495, -0.0004)
    const palmHollow = new THREE.Vector3(-0.0127, 0.0495, -0.0004);

    // Ensure double-sided materials so inverted mirror scale does not cull front faces
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => { m.side = THREE.DoubleSide; });
        } else {
          child.material.side = THREE.DoubleSide;
        }
      }
    });

    const inner = new THREE.Group();
    inner.position.copy(palmHollow).negate();
    inner.add(clone);

    // In raw robotic_hand.glb, palm faces -X and thumb is at +Z.
    // Pre-rotate around Y by +Math.PI / 2 to align with hand.glb coordinate axes:
    const alignGroup = new THREE.Group();
    alignGroup.add(inner);
    alignGroup.rotation.y = Math.PI / 2;

    const pivot = new THREE.Group();
    pivot.add(alignGroup);
    // Symmetrical rotation for right hand: rotX same, rotY negated, rotZ negated
    pivot.rotation.set(-Math.PI / 2.25, -Math.PI / 10, Math.PI / 16);

    const container = new THREE.Group();
    container.name = 'RoboticHandContainer';
    // Mirror X to turn left hand into true anatomical right hand
    container.scale.set(-scale, scale, scale);
    container.add(pivot);

    this.roboticHandModel = container;
    this.rightGroup.add(this.roboticHandModel);

    // Position Red Pill directly in the hollow of the robotic palm
    this.redPill.group.position.set(0, 0.04, 0);
  }

  /**
   * Updates organic hover physics, subtle pill spinning, raycasting, and visibility transitions
   * @param {Object} state
   * @param {number} state.progress - Continuous narrative progress [0.0 - 1.0]
   * @param {Object} [state.pointer] - Normalized pointer coordinates { x, y }
   * @param {number} [state.delta=0.016] - Time delta in seconds
   * @param {number} [state.speedFactor=1.0] - Idle speed factor
   */
  update({ progress = 0, pointer = null, delta = 0.016, speedFactor = 1.0 } = {}) {
    if (this.isDisposed) return;

    if (speedFactor > 0.0001) {
      this.elapsedTime += delta * speedFactor;
    }

    // Visibility window: Hands emerge as progress advances past Matrix White Room entrance (0.22)
    const isVisibleWindow = progress >= 0.22 && progress <= 0.65;
    this.rootGroup.visible = isVisibleWindow;
    if (!isVisibleWindow) return;

    // Smooth emergence rise: from 0.22 to 0.35, hands rise up into cinematic view
    let entranceT = Math.max(0, Math.min((progress - 0.22) / 0.13, 1.0));
    // Easing cubic out
    entranceT = 1 - Math.pow(1 - entranceT, 3);
    const yRiseOffset = (1 - entranceT) * -0.9;

    // Organic hover breathing floating physics
    let floatL = 0;
    let floatR = 0;
    if (speedFactor > 0.0001) {
      floatL = Math.sin(this.elapsedTime * 1.6) * 0.025 * speedFactor;
      floatR = Math.cos(this.elapsedTime * 1.6) * 0.025 * speedFactor;
    }

    this.leftGroup.position.set(
      this.baseLeftPos.x,
      this.baseLeftPos.y + yRiseOffset + floatL,
      this.baseLeftPos.z
    );
    this.rightGroup.position.set(
      this.baseRightPos.x,
      this.baseRightPos.y + yRiseOffset + floatR,
      this.baseRightPos.z
    );

    // Subtle gentle pill rotation on palm
    if (speedFactor > 0.0001) {
      if (this.bluePill && this.bluePill.mesh) {
        this.bluePill.mesh.rotation.y += delta * 0.5 * speedFactor;
      }
      if (this.redPill && this.redPill.mesh) {
        this.redPill.mesh.rotation.y += delta * 0.5 * speedFactor;
      }
    }

    // Interactive pointer raycasting
    if (pointer && this.camera && progress >= 0.30) {
      this.handlePointerMove(pointer);
    }
  }

  /**
   * Raycasts against the pills on pointer move to trigger interactive pulse and glow
   * @param {{ x: number, y: number }} pointer - Normalized pointer coords [-1, 1]
   */
  handlePointerMove(pointer) {
    if (this.isDisposed || !this.camera || !pointer) return;

    this.raycaster.setFromCamera(pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.raycastTargets, true);

    let nextHovered = null;
    if (intersects.length > 0) {
      const topHit = intersects[0].object;
      nextHovered = topHit.userData && topHit.userData.pill ? topHit.userData.pill : null;
    }

    if (this.hoveredPill !== nextHovered) {
      this.hoveredPill = nextHovered;
      this._applyHoverStates();
    }
  }

  /**
   * Updates pill scale and emissive intensity based on hover state
   * @private
   */
  _applyHoverStates() {
    if (this.isDisposed) return;

    const isBlueHover = this.hoveredPill === 'blue';
    const isRedHover = this.hoveredPill === 'red';

    if (this.bluePill) {
      const targetScale = isBlueHover ? 1.18 : 1.0;
      this.bluePill.mesh.scale.set(targetScale, targetScale, targetScale);
      if (this.bluePill.mesh.material) {
        this.bluePill.mesh.material.emissiveIntensity = isBlueHover ? 3.5 : 2.2;
      }
      if (this.bluePill.light) {
        this.bluePill.light.intensity = isBlueHover ? 6.0 : 4.0;
      }
    }

    if (this.redPill) {
      const targetScale = isRedHover ? 1.18 : 1.0;
      this.redPill.mesh.scale.set(targetScale, targetScale, targetScale);
      if (this.redPill.mesh.material) {
        this.redPill.mesh.material.emissiveIntensity = isRedHover ? 3.5 : 2.2;
      }
      if (this.redPill.light) {
        this.redPill.light.intensity = isRedHover ? 6.0 : 4.0;
      }
    }

    if (this.canvas) {
      this.canvas.style.cursor = this.hoveredPill ? 'pointer' : 'default';
    }
  }

  /**
   * Handles pointer click/tap to register pill selection
   * @param {{ x: number, y: number }} pointer - Normalized pointer coords [-1, 1]
   * @returns {'blue' | 'red' | null} Selected branch, or null if no hit
   */
  handlePointerClick(pointer) {
    if (this.isDisposed || !this.camera || !pointer) return null;

    this.raycaster.setFromCamera(pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.raycastTargets, true);

    if (intersects.length > 0) {
      const topHit = intersects[0].object;
      const pill = topHit.userData && topHit.userData.pill ? topHit.userData.pill : null;
      if (pill === 'blue' || pill === 'red') {
        this.selectBranch(pill);
        return pill;
      }
    }

    return null;
  }

  /**
   * Selects a narrative branch ('blue' or 'red') with selection animation
   * @param {'blue' | 'red'} branch
   */
  selectBranch(branch) {
    if (this.isDisposed || (branch !== 'blue' && branch !== 'red')) return;

    this.selectedBranch = branch;

    // Trigger visual selection pulse
    const selectedPill = branch === 'blue' ? this.bluePill : this.redPill;
    const otherPill = branch === 'blue' ? this.redPill : this.bluePill;

    if (selectedPill && selectedPill.mesh) {
      selectedPill.mesh.scale.set(1.3, 1.3, 1.3);
      if (selectedPill.mesh.material) {
        selectedPill.mesh.material.emissiveIntensity = 5.0;
      }
      if (selectedPill.light) {
        selectedPill.light.intensity = 8.0;
      }
    }

    if (otherPill && otherPill.mesh) {
      otherPill.mesh.scale.set(0.8, 0.8, 0.8);
      if (otherPill.mesh.material) {
        otherPill.mesh.material.emissiveIntensity = 1.0;
      }
    }

    if (typeof this.onSelect === 'function') {
      this.onSelect(branch);
    }
  }

  /**
   * Resets selection when scrolling back up per issue specification
   */
  resetSelection() {
    this.selectedBranch = null;
    this.hoveredPill = null;
    this._applyHoverStates();
  }

  /**
   * Reports whether animations and physics are currently at rest
   * @returns {boolean}
   */
  isResting() {
    if (this.isDisposed || !this.rootGroup.visible) return true;
    return this.hoveredPill === null;
  }

  /**
   * Full teardown of Three.js objects, lights, and materials
   */
  dispose() {
    this.isDisposed = true;

    if (this.canvas) {
      this.canvas.style.cursor = 'default';
      this.canvas = null;
    }

    if (this.humanHandModel) {
      disposeThreeObject(this.humanHandModel);
      this.humanHandModel = null;
    }

    if (this.roboticHandModel) {
      disposeThreeObject(this.roboticHandModel);
      this.roboticHandModel = null;
    }

    if (this.bluePill) {
      disposeThreeObject(this.bluePill.group);
      this.bluePill = null;
    }

    if (this.redPill) {
      disposeThreeObject(this.redPill.group);
      this.redPill = null;
    }

    if (this.lights && this.lights.length > 0) {
      this.lights.forEach((l) => {
        if (typeof l.dispose === 'function') l.dispose();
      });
      this.lights = [];
    }

    if (this.rootGroup) {
      disposeThreeObject(this.rootGroup);
      if (this.scene) {
        this.scene.remove(this.rootGroup);
      }
      this.rootGroup = null;
    }

    this.scene = null;
    this.camera = null;
    this.raycastTargets = [];
  }
}
