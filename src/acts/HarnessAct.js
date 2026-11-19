import * as THREE from 'three';
import {
  applySceneAnisotropy,
  disposeThreeObject,
  prewarmSceneStage,
  resolveMaxAnisotropy,
} from '../utils/threeUtils.js';
import { SURVEILLANCE_TECHS, drawTechBadgeCanvas } from './surveillanceCatalog.js';
import { mountSurveillanceScreens, setScreenActiveVisual } from './surveillanceScreens.js';
import './HarnessAct.css';

export const HARNESS_LAYER = 2;
export const HARNESS_WORLD_POS = new THREE.Vector3(-22, 0, -10);
export const HARNESS_BG_COLOR = new THREE.Color('#151500');

const FULL_TINT_COLOR = new THREE.Color('#ffffff');
const DIM_TINT_COLOR = new THREE.Color('#cfcba3');
const SCREEN_POP_OFFSET = 0.015;
const SCREEN_POP_SCALE = 0.018;

/**
 * Blue Branch (Arsenal / Surveillance Room) Act Coordinator.
 * Stages the `surveillance_room.glb` 3D environment on the Blue door branch,
 * projects Paolo's 28 technologies onto the curved CRT wall, and reacts to pointer hover/tap.
 */
export class HarnessAct {
  constructor({ container, scene, camera, renderer, canvas, wake } = {}) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.canvas = canvas;
    this.wake = wake || (() => {});

    this.active = false;
    this.ready = false;
    this.disposed = false;

    this.pointer = new THREE.Vector2(0, 0);
    this._parallaxCurrent = new THREE.Vector2(0, 0);
    this._parallaxTarget = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.set(HARNESS_LAYER);
    this.events = new AbortController();

    this.hoveredScreenIndex = -1;
    this.pinnedScreenIndex = -1;
    this._hoverSource = 'none';
    this._lastCursor = '';

    this._scratchWorldPos = new THREE.Vector3();
    this._scratchProjected = new THREE.Vector3();

    this.roomInstance = null;
    this._screenMount = null;
    this.screenMeshes = [];

    this.root = new THREE.Group();
    this.root.name = 'HarnessActRoot';
    this.root.position.copy(HARNESS_WORLD_POS);
    this.root.layers.set(HARNESS_LAYER);
    this.root.visible = false;

    this.roomPivot = new THREE.Group();
    this.roomPivot.name = 'SurveillanceRoomPivot';
    this.roomPivot.layers.set(HARNESS_LAYER);
    this.root.add(this.roomPivot);

    if (this.scene) {
      this.scene.add(this.root);
    }
    if (this.camera && this.camera.layers) {
      this.camera.layers.enable(HARNESS_LAYER);
    }

    this._buildDom();
    this._bindEvents();
  }

  _buildDom() {
    if (!this.container || typeof document === 'undefined') return;
    this.host = document.createElement('section');
    this.host.className = 'harness-scene';
    this.host.hidden = true;
    this.host.setAttribute('aria-label', 'Surveillance Room Tech Monitors');

    this.host.innerHTML = `
      <p class="harness-status" aria-live="polite">03 / ARSENAL · HOVER OR TAP A MONITOR</p>
      <div class="harness-tooltip" role="status" aria-live="polite" hidden>
        <div class="harness-tooltip__head">
          <div class="harness-tooltip__badge-wrap" aria-hidden="true">
            <canvas class="harness-tooltip__badge"></canvas>
          </div>
          <div class="harness-tooltip__meta">
            <p class="harness-tooltip__category"></p>
            <h3 class="harness-tooltip__title"></h3>
          </div>
          <button type="button" class="harness-tooltip__close" aria-label="Dismiss monitor telemetry">✕</button>
        </div>
        <p class="harness-tooltip__role"></p>
      </div>
    `;

    this.container.appendChild(this.host);
    this.statusEl = this.host.querySelector('.harness-status');
    this.tooltipEl = this.host.querySelector('.harness-tooltip');
    this.tooltipBadgeCanvas = this.host.querySelector('.harness-tooltip__badge');
    this.tooltipCatEl = this.host.querySelector('.harness-tooltip__category');
    this.tooltipTitleEl = this.host.querySelector('.harness-tooltip__title');
    this.tooltipRoleEl = this.host.querySelector('.harness-tooltip__role');
    this.tooltipCloseBtn = this.host.querySelector('.harness-tooltip__close');

    this.tooltipCloseBtn?.addEventListener(
      'click',
      () => {
        this.pinnedScreenIndex = -1;
        this.setHoveredScreen(-1);
        this.wake();
      },
      { signal: this.events.signal }
    );
  }

  _bindEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener(
      'pointermove',
      event => {
        if (!this.active || event.pointerType === 'touch') return;
        const width = window.innerWidth || 800;
        const height = window.innerHeight || 600;
        this.pointer.set((event.clientX / width) * 2 - 1, -(event.clientY / height) * 2 + 1);
        this._parallaxTarget.copy(this.pointer);

        if (event.target === this.canvas) {
          this._hoverSource = 'canvas';
          const hitIdx = this._raycastScreenIndex();
          if (hitIdx !== this.hoveredScreenIndex) {
            this.setHoveredScreen(hitIdx);
          }
          this._setCanvasCursor(hitIdx >= 0 ? 'pointer' : '');
        } else {
          this._hoverSource = 'none';
          if (this.hoveredScreenIndex >= 0) {
            this.setHoveredScreen(-1);
          }
          this._setCanvasCursor('');
        }
        this.wake();
      },
      { signal: this.events.signal }
    );

    window.addEventListener(
      'pointerleave',
      () => {
        if (!this.active) return;
        this._hoverSource = 'none';
        this.pointer.set(0, 0);
        this._parallaxTarget.set(0, 0);
        this._setCanvasCursor('');
        if (this.pinnedScreenIndex < 0) {
          this.setHoveredScreen(-1);
        }
        this.wake();
      },
      { signal: this.events.signal }
    );

    this.canvas?.addEventListener(
      'pointerdown',
      event => {
        if (!this.active || !event.isPrimary) return;
        const width = window.innerWidth || 800;
        const height = window.innerHeight || 600;
        this.pointer.set((event.clientX / width) * 2 - 1, -(event.clientY / height) * 2 + 1);
        const hitIdx = this._raycastScreenIndex();
        if (hitIdx >= 0) {
          this.pinnedScreenIndex = this.pinnedScreenIndex === hitIdx ? -1 : hitIdx;
          this.setHoveredScreen(event.pointerType === 'touch' ? this.pinnedScreenIndex : hitIdx);
        } else if (this.pinnedScreenIndex >= 0) {
          this.pinnedScreenIndex = -1;
          this.setHoveredScreen(-1);
        }
        this.wake();
      },
      { signal: this.events.signal }
    );
  }

  _setCanvasCursor(cursor) {
    if (this.canvas && this._lastCursor !== cursor) {
      this.canvas.style.cursor = cursor;
      this._lastCursor = cursor;
    }
  }

  _raycastScreenIndex() {
    if (!this.camera || this.screenMeshes.length === 0) return -1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.screenMeshes, false);
    if (hits.length === 0) return -1;
    const idx = hits[0].object?.userData?.techIndex;
    return typeof idx === 'number' ? idx : -1;
  }

  _getEffectiveActiveIndex() {
    return this.hoveredScreenIndex >= 0 ? this.hoveredScreenIndex : this.pinnedScreenIndex;
  }

  /**
   * Highlights the hovered or pinned CRT monitor in 3D and opens its telemetry tooltip.
   * @param {number} index
   */
  setHoveredScreen(index) {
    this.hoveredScreenIndex = typeof index === 'number' ? index : -1;
    const activeIdx = this._getEffectiveActiveIndex();

    for (let i = 0; i < this.screenMeshes.length; i++) {
      setScreenActiveVisual(this.screenMeshes[i], i === activeIdx);
    }

    this._syncStatus(activeIdx);
    this._syncTooltip(activeIdx);
    this.wake();
  }

  _syncStatus(activeIdx) {
    if (!this.statusEl) return;
    if (activeIdx >= 0 && SURVEILLANCE_TECHS[activeIdx]) {
      const tech = SURVEILLANCE_TECHS[activeIdx];
      this.statusEl.textContent = `03 / ARSENAL · ${tech.name} [${tech.category}]`;
    } else {
      this.statusEl.textContent = '03 / ARSENAL · HOVER OR TAP A MONITOR';
    }
  }

  _syncTooltip(activeIdx) {
    if (!this.tooltipEl) return;
    const tech = activeIdx >= 0 ? SURVEILLANCE_TECHS[activeIdx] : null;
    if (!this.active || !tech) {
      this.tooltipEl.hidden = true;
      return;
    }

    this.tooltipEl.hidden = false;
    this.tooltipEl.style.setProperty('--tooltip-accent', tech.accent);
    if (this.tooltipBadgeCanvas) {
      drawTechBadgeCanvas(this.tooltipBadgeCanvas, tech);
    }
    if (this.tooltipCatEl) this.tooltipCatEl.textContent = tech.category;
    if (this.tooltipTitleEl) this.tooltipTitleEl.textContent = tech.name;
    if (this.tooltipRoleEl) this.tooltipRoleEl.textContent = tech.role;

    this._positionTooltip(activeIdx);
  }

  _positionTooltip(activeIdx) {
    if (!this.tooltipEl || this.tooltipEl.hidden || !this.camera) return;
    const mesh = this.screenMeshes[activeIdx];
    if (!mesh) return;

    mesh.updateWorldMatrix(true, false);
    mesh.getWorldPosition(this._scratchWorldPos);
    this._scratchProjected.copy(this._scratchWorldPos).project(this.camera);

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    if (vw <= 768) return;

    const screenX = (this._scratchProjected.x * 0.5 + 0.5) * vw;
    const screenY = (-this._scratchProjected.y * 0.5 + 0.5) * vh;

    const cardWidth = Math.min(296, vw - 28);
    const preferLeft = screenX > vw * 0.54;
    const rawLeft = preferLeft ? screenX - cardWidth - 78 : screenX + 78;
    const left = THREE.MathUtils.clamp(rawLeft, 14, Math.max(14, vw - cardWidth - 14));
    const top = THREE.MathUtils.clamp(screenY - 58, 92, Math.max(92, vh - 180));

    this.tooltipEl.style.left = `${Math.round(left)}px`;
    this.tooltipEl.style.top = `${Math.round(top)}px`;
  }

  _clearRoom() {
    this._screenMount?.dispose();
    this._screenMount = null;
    this.screenMeshes = [];

    if (this.roomInstance) {
      disposeThreeObject(this.roomInstance);
      this.roomPivot.remove(this.roomInstance);
      this.roomInstance = null;
    }
  }

  /**
   * Attaches and centers the `surveillance_room.glb` scene instance and mounts all 28 tech screens.
   * @param {THREE.Object3D} asset
   */
  setRoomModel(asset) {
    if (this.disposed || !asset) return;

    this._clearRoom();

    const cloned = asset.clone(true);

    // Clone materials so disposal and fog configuration stay isolated to this act
    cloned.traverse(child => {
      child.layers.set(HARNESS_LAYER);
      if (child.isMesh) {
        child.geometry?.computeBoundingSphere?.();
        child.frustumCulled = true;
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => (m ? m.clone() : m));
        } else if (child.material) {
          child.material = child.material.clone();
        }
      }
    });

    // Center the surveillance console, monitor bank, and desk around local origin
    cloned.position.set(-2.46, 0.85, -1.0);

    this.roomInstance = cloned;
    this.roomPivot.add(cloned);

    const maxAniso = resolveMaxAnisotropy(this.renderer, 16);
    applySceneAnisotropy(cloned, maxAniso);
    this._screenMount = mountSurveillanceScreens({
      roomPivot: this.roomPivot,
      roomInstance: cloned,
      maxAnisotropy: maxAniso,
      layer: HARNESS_LAYER,
    });
    this.screenMeshes = this._screenMount.screens;

    this.ready = true;
    this.wake();
  }

  /**
   * Backwards-compatible alias in case external callers pass the room model via setWheatleyModel.
   * @param {THREE.Object3D} asset
   */
  setWheatleyModel(asset) {
    this.setRoomModel(asset);
  }

  /**
   * Reveals the surveillance room stage during incoming camera flight.
   * @param {boolean} visible
   */
  setStageVisible(visible) {
    if (this.disposed) return;
    this.root.visible = Boolean(visible);
  }

  /**
   * Pre-compiles GPU shaders and uploads screen textures for the surveillance room during loading.
   */
  async prepare(renderer = this.renderer, camera = this.camera) {
    if (!renderer || this.disposed || !this.scene || !camera) return;
    if (typeof renderer.compileAsync !== 'function') return;

    const wasVisible = this.root.visible;
    const culling = [];
    this.root.traverse(child => {
      if (child.isMesh) {
        culling.push([child, child.frustumCulled]);
        child.frustumCulled = false;
      }
    });

    try {
      this.root.visible = true;
      await renderer.compileAsync(this.scene, camera);
      if (!this.disposed) {
        prewarmSceneStage(renderer, this.scene, camera);
      }
    } finally {
      for (const [child, wasCulled] of culling) {
        child.frustumCulled = wasCulled;
      }
      if (!this.disposed) {
        this.root.visible = wasVisible;
      }
    }
  }

  /**
   * Computes camera position & lookAt target framing the surveillance room console and monitor wall.
   * Positioned slightly lower and orbited counter-clockwise so the bottom-left monitor stays clear
   * of the foreground console, with inverted mouse parallax.
   * @param {{ position: THREE.Vector3, target: THREE.Vector3 }} [out]
   */
  getCameraPose(out) {
    const aspect = Math.max(0.3, this.camera?.aspect || 1.6);
    const isPortrait = aspect < 0.85;
    const vFovRad = THREE.MathUtils.degToRad(this.camera?.fov || 45);
    const halfTan = Math.tan(vFovRad / 2);

    // Orbit ~17.5deg counter-clockwise around the monitor bank so the left rack never hides col 0 row 3
    const dist = Math.max(4.48, 5.15 / (2 * aspect * halfTan));
    const yaw = isPortrait ? 0.26 : 0.305;
    const targetX = -0.10;
    const targetY = -0.47;
    const targetZ = -0.20;

    const camX = targetX + dist * Math.sin(yaw);
    const camY = isPortrait ? 1.25 : 0.08;
    const camZ = targetZ + dist * Math.cos(yaw);

    // Inverted mouse parallax along the camera's screen-right and up axes
    const parRight = -this._parallaxCurrent.x * 0.26;
    const parUp = -this._parallaxCurrent.y * 0.16;
    const parWorldX = parRight * Math.cos(yaw);
    const parWorldZ = -parRight * Math.sin(yaw);

    if (out) {
      out.position.set(
        this.root.position.x + camX + parWorldX,
        this.root.position.y + camY + parUp,
        this.root.position.z + camZ + parWorldZ
      );
      out.target.set(
        this.root.position.x + targetX + parWorldX * 0.25,
        this.root.position.y + targetY + parUp * 0.25,
        this.root.position.z + targetZ + parWorldZ * 0.25
      );
      return out;
    }

    return {
      position: new THREE.Vector3(
        this.root.position.x + camX + parWorldX,
        this.root.position.y + camY + parUp,
        this.root.position.z + camZ + parWorldZ
      ),
      target: new THREE.Vector3(
        this.root.position.x + targetX + parWorldX * 0.25,
        this.root.position.y + targetY + parUp * 0.25,
        this.root.position.z + targetZ + parWorldZ * 0.25
      ),
    };
  }

  /**
   * Activates or deactivates HarnessAct scene & DOM overlay.
   * @param {boolean} active
   */
  setActive(active) {
    if (this.active === active) return;
    this.active = active;
    this.root.visible = active;
    if (this.host) {
      this.host.hidden = !active;
    }
    if (!active) {
      this.pointer.set(0, 0);
      this._parallaxTarget.set(0, 0);
      this._hoverSource = 'none';
      this.pinnedScreenIndex = -1;
      this._setCanvasCursor('');
      this.setHoveredScreen(-1);
    } else {
      if (this.scene?.fog && this.scene.fog.far < 55) {
        this.scene.fog.near = 26;
        this.scene.fog.far = 64;
      }
      this._syncStatus(-1);
      this._syncTooltip(-1);
      this.wake();
    }
  }

  /**
   * Updates smooth pointer parallax and per-screen 3D hover pop animations when active.
   * @param {number} delta
   * @param {number} [speedFactor=1]
   */
  update(delta, speedFactor = 1) {
    if (this.disposed || !this.active) return;

    const parallaxAlpha = Math.min(1, delta * (4.5 + 2.5 * speedFactor));
    this._parallaxCurrent.lerp(this._parallaxTarget, parallaxAlpha);

    if (this._hoverSource === 'canvas' && this.pinnedScreenIndex < 0) {
      const hitIdx = this._raycastScreenIndex();
      if (hitIdx !== this.hoveredScreenIndex) {
        this.setHoveredScreen(hitIdx);
      }
      this._setCanvasCursor(hitIdx >= 0 ? 'pointer' : '');
    }

    const activeIdx = this._getEffectiveActiveIndex();
    const animAlpha = 1 - Math.exp(-14 * Math.min(delta, 0.1));

    for (let i = 0; i < this.screenMeshes.length; i++) {
      const mesh = this.screenMeshes[i];
      const data = mesh.userData;
      const targetHover = i === activeIdx ? 1 : 0;
      let nextHover = data.hoverAmount + (targetHover - data.hoverAmount) * animAlpha;
      if (Math.abs(targetHover - nextHover) < 0.002) {
        nextHover = targetHover;
      }
      data.hoverAmount = nextHover;

      if (data.restPosition && data.localNormal) {
        mesh.position.copy(data.restPosition).addScaledVector(data.localNormal, nextHover * SCREEN_POP_OFFSET);
      }
      mesh.scale.setScalar(1 + nextHover * SCREEN_POP_SCALE);

      if (mesh.material?.color) {
        const targetTint = activeIdx >= 0 && i !== activeIdx ? DIM_TINT_COLOR : FULL_TINT_COLOR;
        mesh.material.color.lerp(targetTint, animAlpha);
        if (Math.abs(mesh.material.color.r - targetTint.r) < 0.002) {
          mesh.material.color.copy(targetTint);
        }
      }
    }

    if (activeIdx >= 0) {
      this._positionTooltip(activeIdx);
    }
  }

  /**
   * Reports whether the act has settled so IdleManager can suspend the render loop (0% CPU/GPU).
   */
  isResting(speedFactor = 0) {
    if (!this.active) return true;
    const parallaxRest = this._parallaxCurrent.distanceToSquared(this._parallaxTarget) < 1e-5;
    if (!parallaxRest) return false;

    const activeIdx = this._getEffectiveActiveIndex();
    for (let i = 0; i < this.screenMeshes.length; i++) {
      const mesh = this.screenMeshes[i];
      const targetHover = i === activeIdx ? 1 : 0;
      if (Math.abs(mesh.userData.hoverAmount - targetHover) >= 0.002) {
        return false;
      }
      const targetTint = activeIdx >= 0 && i !== activeIdx ? DIM_TINT_COLOR : FULL_TINT_COLOR;
      if (mesh.material?.color && Math.abs(mesh.material.color.r - targetTint.r) >= 0.002) {
        return false;
      }
    }
    return speedFactor <= 0.0001;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.events.abort();
    this._setCanvasCursor('');
    this.host?.remove();

    this._clearRoom();

    disposeThreeObject(this.root);
    this.scene?.remove(this.root);
  }
}
