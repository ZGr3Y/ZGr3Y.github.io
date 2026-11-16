import * as THREE from 'three';
import { createUnicornOpening, createUnicornOpeningTemplate } from './UnicornOpening.js';
import { foilStudio, paperGrain, referenceFoilMaps, metalSheetMaps, disposeTree } from './UnicornSurface.js';
import { createProjectSheet, syncProjectSheet } from './ProjectSheetView.js';
import { trapFocus } from '../utils/a11yUtils.js';
import './ExperiencesAct.css';

const CLOSED_SURFACE_COLOR = new THREE.Color('#d1d5d8');
const OPEN_SURFACE_COLOR = new THREE.Color('#dce3e9');
const MOBILE_BASES = [[0, 1.9, -0.6], [-1.5, -1.35, 0.45], [1.5, -1.35, -0.2]];
const DESKTOP_BASES = [[0, 1.7, -0.7], [-3, -1.5, 0.6], [3, -1.5, -0.5]];
const RIG_ROTATIONS = [[-0.09, 0.22, -0.05], [0.14, -0.6, 0.07], [-0.12, Math.PI - 0.5, -0.08]];
const STATUS_IDLE_TEXT = 'Choose an origami';

/** A world-space project constellation, rendered by the portfolio's camera. */
export class ExperiencesAct {
  constructor({ container, projects, wake, scene, camera, renderer, canvas }) {
    Object.assign(this, { container, wake, scene, camera, renderer, canvas });
    this.projects = projects.slice(0, 3);
    this.active = false;
    this.ready = false;
    this.disposed = false;
    this.selected = -1;
    this.progress = 0;
    this.target = 0;
    this.elapsed = 0;
    this.events = new AbortController();

    this.root = new THREE.Group();
    this.root.name = 'ExperiencesConstellation';
    // Keep the origami constellation outside wide Matrix White Room camera frustums.
    this.root.position.set(64, 0, -10);
    scene.add(this.root);

    this.host = document.createElement('section');
    this.host.className = 'experiences-scene';
    this.host.hidden = true;
    this.host.setAttribute('aria-label', 'Projects');
    this.host.innerHTML =
      '<header><p>02 / PROJECTS</p><h2>Inside the folds.</h2></header>' +
      '<p class="experiences-status" aria-live="polite">Preparing origami…</p>' +
      '<div class="experiences-picks"></div>' +
      '<button type="button" class="experiences-close" hidden>Close</button>';
    container.append(this.host);

    this.statusEl = this.host.querySelector('.experiences-status');
    const picksEl = this.host.querySelector('.experiences-picks');
    this.buttons = this.projects.map((project, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = project.title;
      button.setAttribute('aria-label', `Open origami: ${project.title}`);
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => this.open(index), { signal: this.events.signal });
      picksEl.append(button);
      return button;
    });

    this.closeButton = this.host.querySelector('.experiences-close');
    this.closeButton.addEventListener('click', () => this.close(), { signal: this.events.signal });

    this.projectSheets = this.projects.map(createProjectSheet);
    this._sheetStates = this.projectSheets.map(() => ({ hidden: true }));
    this.host.append(...this.projectSheets);

    this.host.addEventListener('keydown', e => this._onHostKeyDown(e), { signal: this.events.signal });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(10, 10);
    this.hovered = -1;
    this.pressure = new THREE.Vector2();
    this.projected = new THREE.Vector3();
    this.floaters = this.buttons.map(() => ({
      offset: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      tilt: new THREE.Vector3(),
      tiltVelocity: new THREE.Vector3(),
    }));
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reusable scratch buffers keep 60 FPS layout/physics loops free of heap allocations.
    this._scratchTarget = new THREE.Vector3();
    this._scratchTilt = new THREE.Vector3();
    this._scratchProj = new THREE.Vector3();
    this._scratchSheet = {
      center: new THREE.Vector3(),
      left: new THREE.Vector3(),
      right: new THREE.Vector3(),
      top: new THREE.Vector3(),
      bottom: new THREE.Vector3(),
    };
    this._visiblePickables = [];
    this._lastCursor = '';

    this._bindCanvasEvents();
  }

  _onHostKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close();
      return;
    }
    if (!this.hasOpenSelection()) return;
    if (event.key === 'Tab') {
      event.stopPropagation();
      trapFocus(this.host, event);
    } else if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'PageDown' ||
      event.key === 'PageUp'
    ) {
      event.stopPropagation();
    }
  }

  _bindCanvasEvents() {
    const on = (type, cb) => this.canvas.addEventListener(type, cb, { signal: this.events.signal });

    window.addEventListener(
      'pointermove',
      e => {
        if (!this.active || e.pointerType === 'touch') return;
        this.pointer.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2);
        this.wake();
      },
      { signal: this.events.signal }
    );

    window.addEventListener(
      'pointerleave',
      () => {
        this.pointer.set(10, 10);
        this.hovered = -1;
        if (this.active) this.wake();
      },
      { signal: this.events.signal }
    );

    let down = null;
    on('pointerdown', e => {
      if (!this.active || !e.isPrimary) return;
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2);
      down = { x: e.clientX, y: e.clientY, index: this.pick() };
      e.stopPropagation();
    });

    on('pointerup', e => {
      if (!down) return;
      const start = down;
      down = null;
      if (!this.active || !this.ready || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2);
      if (this.selected >= 0) this.close();
      else this.open(start.index >= 0 ? start.index : this.pick());
    });

    on('pointercancel', () => {
      down = null;
    });
  }

  prepare() {
    if (!this.preparation) {
      this.preparation = this.initialize().catch(error => {
        console.error('[ExperiencesAct]', error);
        this.statusEl.textContent = '3D preview unavailable.';
      });
    }
    return this.preparation;
  }

  async initialize() {
    if (!this.renderer) return;

    const maps = await referenceFoilMaps();
    if (this.disposed) {
      maps.normal.dispose();
      maps.roughness.dispose();
      return;
    }

    const room = foilStudio({ cinematic: true });
    const generator = new THREE.PMREMGenerator(this.renderer);
    this.environment = generator.fromScene(room, 0.015);
    disposeTree(room);
    generator.dispose();

    const hemisphere = new THREE.HemisphereLight('#c6dce9', '#10151a', 0.16);
    const key = new THREE.DirectionalLight('#fff2dc', 2.8);
    key.position.set(-4, 6, 4);
    const strip = new THREE.RectAreaLight('#c4dcff', 4.5, 0.9, 5);
    strip.position.set(4, 2, -3);
    strip.lookAt(0, 0, 0);
    this.root.add(key.target);
    for (const light of [hemisphere, key, strip]) {
      light.layers.set(1);
      this.root.add(light);
    }
    this.camera.layers.enable(1);

    const maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    maps.normal.anisotropy = maps.roughness.anisotropy = maxAnisotropy;

    const silver = new THREE.MeshStandardMaterial({
      fog: false,
      color: '#d1d5d8',
      metalness: 1,
      roughness: 1,
      roughnessMap: maps.roughness,
      side: THREE.FrontSide,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(0.11, 0.11),
      envMap: this.environment.texture,
      envMapIntensity: 1.05,
    });

    const grain = paperGrain();
    this.grainTexture = grain;
    this.sheetMaps = await Promise.all(this.projects.map((_, index) => metalSheetMaps(index)));
    this.foilMaps = maps;

    if (this.disposed) {
      this.sheetMaps.forEach(surface => {
        surface.normal.dispose();
        surface.roughness.dispose();
      });
      maps.normal.dispose();
      maps.roughness.dispose();
      grain.dispose();
      return;
    }

    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    for (const texture of this.sheetMaps.flatMap(surface => Object.values(surface))) {
      texture.anisotropy = anisotropy;
    }

    const openingTemplate =
      typeof createUnicornOpeningTemplate === 'function' ? createUnicornOpeningTemplate() : undefined;

    this.papers = [];
    this.rearSurfaces = [];
    this.frontSurfaces = [];
    this.interactiveMeshes = [];
    this.rigs = this.buttons.map((_, index) => {
      // The reverse transitions from sculpted foil to a satin metal sheet.
      const paper = new THREE.MeshStandardMaterial({
        fog: false,
        color: '#d1d5d8',
        roughness: 0.23,
        metalness: 1,
        side: THREE.BackSide,
        bumpMap: grain,
        bumpScale: 0.003,
        normalMap: maps.normal,
        normalScale: new THREE.Vector2(0.1, 0.1),
        roughnessMap: maps.roughness,
        envMap: this.environment.texture,
        envMapIntensity: 1.05,
      });
      this.papers.push(paper);
      const front = silver.clone();
      this.frontSurfaces.push(front);
      const rig = createUnicornOpening(front, paper, openingTemplate);

      // Carry the modeled relief onto the reverse, instead of showing a flat silhouette.
      const rearMaterial = silver.clone();
      const rear = new THREE.Group();
      rear.scale.z = -1;
      rear.position.z = -0.035;
      const pairs = [];
      rig.root.traverse(obj => {
        if (obj.isMesh && obj.material.side === THREE.FrontSide) {
          const back = new THREE.Mesh(obj.geometry, rearMaterial);
          back.frustumCulled = obj.frustumCulled;
          rear.add(back);
          pairs.push([obj, back]);
        }
      });
      rig.root.add(rear);
      this.rearSurfaces.push({ material: rearMaterial, pairs, rear });

      rig.root.traverse(obj => {
        obj.layers.set(1);
        if (obj.isMesh) {
          obj.userData.projectIndex = index;
          this.interactiveMeshes.push(obj);
        }
      });
      this.root.add(rig.root);
      return rig;
    });

    silver.dispose();
    this.ready = true;
    this.layout(0, 0);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;

    this.statusEl.textContent = STATUS_IDLE_TEXT;
    this.wake();
  }

  getCameraPose(out) {
    const distance = Math.max(
      11.8,
      6.8 / (Math.max(0.25, this.camera.aspect) * 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))
    );
    if (out) {
      out.position.copy(this.root.position);
      out.position.y += 0.1;
      out.position.z += distance;
      out.target.copy(this.root.position);
      return out;
    }
    return {
      position: this.root.position.clone().add(new THREE.Vector3(0, 0.1, distance)),
      target: this.root.position.clone(),
    };
  }

  setActive(active) {
    if (this.active === active) return;
    this.active = active;
    this.host.hidden = !active;
    if (active) {
      this.prepare();
      this.lastTime = performance.now();
      this.wake();
    } else {
      this._setCanvasCursor('');
      this.selected = -1;
      this.progress = this.target = 0;
      this.pointer.set(10, 10);
      this.hovered = -1;
      this.syncUI();
      this.layout(0, 0);
    }
  }

  _setCanvasCursor(cursor) {
    if (this._lastCursor !== cursor) {
      this.canvas.style.cursor = cursor;
      this._lastCursor = cursor;
    }
  }

  hasOpenSelection() {
    return this.active && this.selected >= 0;
  }

  open(index) {
    if (!this.active || !this.ready || this.selected >= 0 || index < 0) return;
    this.lastTime = performance.now();
    this.selected = index;
    this.target = 1;
    this.syncUI();
    this.closeButton.focus();
    this.wake();
  }

  close() {
    this.lastTime = performance.now();
    this.target = 0;
    this.wake();
  }

  syncUI() {
    const selected = this.selected >= 0;
    this.host.classList.toggle('has-selection', selected);
    this.container?.setAttribute('data-experiences-sheet-open', String(selected));
    this.closeButton.hidden = !selected;
    this.buttons.forEach((button, index) => {
      button.hidden = selected;
      button.setAttribute('aria-expanded', String(index === this.selected));
    });
    this.statusEl.textContent = selected ? '' : STATUS_IDLE_TEXT;
  }

  pick() {
    if (!this.ready || this.pointer.x > 2) return -1;
    this.camera.updateMatrixWorld(true);
    this.root.updateMatrixWorld(true);
    this.raycaster.layers.set(1);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const visible = this._visiblePickables;
    visible.length = 0;
    for (const mesh of this.interactiveMeshes) {
      if (mesh.visible && mesh.parent?.visible) visible.push(mesh);
    }
    const hit = this.raycaster.intersectObjects(visible)[0];
    return hit ? hit.object.userData.projectIndex : -1;
  }

  findHover() {
    this.hovered = -1;
    if (!this.ready || this.selected >= 0 || this.pointer.x > 2) return;
    this.camera.updateMatrixWorld(true);

    const viewWidth = innerWidth;
    const viewHeight = innerHeight;
    const radius = viewWidth < 650 ? 105 : 175;
    let nearest = 1;

    this.rigs.forEach((rig, index) => {
      const center = rig.root.localToWorld(this._scratchProj.set(0, -0.2, 0)).project(this.camera);
      const dx = ((this.pointer.x - center.x) * viewWidth) / (2 * radius);
      const dy = ((this.pointer.y - center.y) * viewHeight) / (2 * radius);
      const distance = Math.hypot(dx, dy);
      if (distance < nearest) {
        nearest = distance;
        this.hovered = index;
        this.pressure.set(dx * (1 - distance * 0.45), dy * (1 - distance * 0.45));
      }
    });
  }

  // Damped springs provide a delayed response and a soft return after the pointer leaves.
  spring(position, velocity, target, dt) {
    const steps = Math.max(1, Math.ceil(dt / 0.016));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      velocity.x += ((target.x - position.x) * 10 - velocity.x * 3.6) * step;
      velocity.y += ((target.y - position.y) * 10 - velocity.y * 3.6) * step;
      velocity.z += ((target.z - position.z) * 10 - velocity.z * 3.6) * step;
      position.addScaledVector(velocity, step);
    }
  }

  layout(delta) {
    if (!this.ready) return;
    this.camera.updateMatrixWorld(true);

    const viewWidth = innerWidth;
    const viewHeightPx = innerHeight;
    const mobile = viewWidth < 650;
    const smooth = THREE.MathUtils.smoothstep(this.progress, 0, 1);
    const bases = mobile ? MOBILE_BASES : DESKTOP_BASES;
    const idleScale = mobile ? 0.58 : 0.79;
    const distance = this.camera.position.distanceTo(this.root.position);
    const viewHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const pageScale = Math.min((viewHeight * 0.76) / 4.38, (viewHeight * this.camera.aspect * 0.88) / 3.1);
    const pointerInsideViewport = Math.abs(this.pointer.x) <= 1 && Math.abs(this.pointer.y) <= 1;

    this.rigs.forEach((rig, i) => {
      const chosen = i === this.selected;
      const fade = chosen ? 1 - smooth : 1;
      const progress = chosen ? this.progress : 0;

      if (rig.lastProgress !== progress) {
        rig.pose(progress);
        rig.lastProgress = progress;
      }

      const state = this.floaters[i];
      const target = this._scratchTarget.set(0, 0, 0);
      const tilt = this._scratchTilt.set(0, 0, 0);

      if (this.hovered === i && this.selected < 0 && !this.reducedMotion) {
        target.set(this.pressure.x * 0.16, -this.pressure.y * 0.1, 0.06);
        tilt.set(this.pressure.y * 0.32, this.pressure.x * 0.2, -this.pressure.x * 0.3);
      } else if (chosen && !this.reducedMotion && pointerInsideViewport) {
        const influence = THREE.MathUtils.smoothstep(progress, 0.8, 1);
        // A small shift of weight keeps the text steady while the page follows the cursor.
        tilt.set(this.pointer.y * 0.025, 0, -this.pointer.x * 0.03).multiplyScalar(influence);
        target.set(this.pointer.x * 0.015, this.pointer.y * 0.015, 0).multiplyScalar(influence);
      }

      this.spring(state.offset, state.velocity, target, delta);
      this.spring(state.tilt, state.tiltVelocity, tilt, delta);

      const bob = this.reducedMotion ? 0 : Math.sin(this.elapsed * 0.65 + i * 2.1) * 0.07;
      const [baseX, baseY, baseZ] = bases[i];
      rig.root.position.set(
        (baseX + state.offset.x) * fade,
        (baseY + bob + state.offset.y) * fade,
        chosen
          ? (baseZ + state.offset.z) * fade
          : baseZ + state.offset.z - (this.selected >= 0 ? smooth * 4 : 0)
      );
      if (chosen) {
        rig.root.position.addScaledVector(state.offset, smooth);
      }

      rig.root.scale.setScalar(chosen ? THREE.MathUtils.lerp(idleScale, pageScale, smooth) : idleScale);

      const idleSpin = this.reducedMotion ? 0 : Math.sin(this.elapsed * 0.35 + i) * 0.035;
      rig.root.rotation.set(
        (RIG_ROTATIONS[i][0] + state.tilt.x) * fade,
        (RIG_ROTATIONS[i][1] + state.tilt.y + idleSpin) * fade,
        (RIG_ROTATIONS[i][2] + state.tilt.z) * fade
      );
      if (chosen) {
        rig.root.rotation.x += state.tilt.x * smooth;
        rig.root.rotation.y += state.tilt.y * smooth;
        rig.root.rotation.z += state.tilt.z * smooth;
      }

      rig.root.visible = chosen || this.selected < 0 || smooth < 0.7;
      const paperBlend = THREE.MathUtils.smoothstep(progress, 0.35, 0.95);
      this._syncRearSurface(i, progress, paperBlend);

      const label = rig.root.localToWorld(this._scratchProj.set(0, -2.0, 0)).project(this.camera);
      this.buttons[i].style.left = `${(label.x * 0.5 + 0.5) * viewWidth}px`;
      this.buttons[i].style.top = `${(-label.y * 0.5 + 0.5) * viewHeightPx}px`;
    });

    this.positionProjectSheet(viewWidth, viewHeightPx);
  }

  _applySurfaceMaterial(material, color, metalness, roughness, surfaceMaps, normalScale) {
    material.color.copy(color);
    material.metalness = metalness;
    material.roughness = roughness;
    if (material.normalMap !== surfaceMaps.normal) {
      material.normalMap = surfaceMaps.normal;
      material.roughnessMap = surfaceMaps.roughness;
      material.needsUpdate = true;
    }
    material.normalScale.setScalar(normalScale);
  }

  _syncRearSurface(index, progress, paperBlend) {
    const paper = this.papers[index];
    const reverse = this.rearSurfaces[index];
    const front = this.frontSurfaces[index];

    paper.color.copy(CLOSED_SURFACE_COLOR).lerp(OPEN_SURFACE_COLOR, paperBlend);
    const metalness = THREE.MathUtils.lerp(1, 0.94, paperBlend);
    const openPhase = paperBlend > 0.5;
    const surfaceMaps = openPhase ? this.sheetMaps[index] : this.foilMaps;
    const normalScale = openPhase ? 0.3 : 0.11;

    this._applySurfaceMaterial(paper, paper.color, metalness, openPhase ? 0.56 : 0.23, surfaceMaps, normalScale);
    this._applySurfaceMaterial(front, paper.color, metalness, openPhase ? 0.56 : 1, surfaceMaps, normalScale);
    this._applySurfaceMaterial(
      reverse.material,
      paper.color,
      metalness,
      THREE.MathUtils.lerp(1, 0.46, paperBlend),
      surfaceMaps,
      normalScale
    );

    reverse.pairs.forEach(([source, back]) => {
      back.geometry = source.geometry;
    });
    reverse.rear.position.z = -0.035 * (1 - paperBlend);
    reverse.rear.visible = progress < 0.98;
  }

  positionProjectSheet(viewportWidth = innerWidth, viewportHeight = innerHeight) {
    this.projectSheets.forEach((sheet, index) => {
      syncProjectSheet(sheet, this._sheetStates[index], {
        selected: index === this.selected,
        rig: this.rigs[index],
        camera: this.camera,
        progress: this.progress,
        viewportWidth,
        viewportHeight,
        scratch: this._scratchSheet,
      });
    });
  }

  update(delta, speedFactor = 1) {
    if (!this.ready || document.hidden) return;
    if (this.active) {
      if (this.selected < 0) {
        this.findHover();
        this._setCanvasCursor(this.pick() >= 0 ? 'pointer' : '');
      } else {
        this.hovered = -1;
        this._setCanvasCursor('');
      }
      const now = performance.now();
      const dt = Math.min((now - (this.lastTime ?? now)) / 1000, 0.5);
      this.lastTime = now;
      const duration = this.reducedMotion ? 0.8 : 4 / 3;
      this.progress += Math.sign(this.target - this.progress) * Math.min(Math.abs(this.target - this.progress), dt / duration);
      this.elapsed += delta * speedFactor;
    }

    this.layout(delta);

    if (this.active && this.selected >= 0 && this.target === 0 && this.progress === 0) {
      const closedIndex = this.selected;
      this.selected = -1;
      this.syncUI();
      this.buttons[closedIndex].focus();
    }
  }

  isResting() {
    return (
      (!this.active || Math.abs(this.target - this.progress) < 1e-6) &&
      this.floaters.every(s => s.velocity.lengthSq() + s.tiltVelocity.lengthSq() < 1e-6)
    );
  }

  dispose() {
    this.disposed = true;
    this.events.abort();
    this.container?.removeAttribute('data-experiences-sheet-open');

    const { textures: disposedTextures } = disposeTree(this.root);
    const disposeUniqueTexture = texture => {
      if (texture && !disposedTextures.has(texture)) {
        disposedTextures.add(texture);
        texture.dispose();
      }
    };

    disposeUniqueTexture(this.foilMaps?.normal);
    disposeUniqueTexture(this.foilMaps?.roughness);
    disposeUniqueTexture(this.grainTexture);
    this.sheetMaps?.forEach(maps => {
      disposeUniqueTexture(maps.normal);
      disposeUniqueTexture(maps.roughness);
    });

    this.rigs?.forEach(rig => rig.dispose());
    this.root.removeFromParent();
    this.environment?.dispose();
    this.host.remove();
  }
}
