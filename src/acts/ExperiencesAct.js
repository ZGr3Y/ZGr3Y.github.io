import * as THREE from 'three';
import { createUnicornOpening } from './UnicornOpening.js';
import { foilStudio, paperGrain, referenceFoilMaps, metalSheetMaps, disposeTree } from './UnicornSurface.js';
import { trapFocus } from '../utils/a11yUtils.js';
import './ExperiencesAct.css';

function createProjectSheet(project) {
  const sheet = document.createElement('article');
  sheet.className = 'project-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'true');
  sheet.setAttribute('aria-label', `${project.title} · project details`);

  const paper = document.createElement('div'); paper.className = 'project-sheet__paper';
  if (project.status === 'wip') {
    const stamp = document.createElement('strong'); stamp.className = 'project-sheet__stamp';
    stamp.textContent = 'WORK IN PROGRESS'; paper.append(stamp);
  }
  const eyebrow = document.createElement('p'); eyebrow.className = 'project-sheet__eyebrow';
  eyebrow.textContent = project.sheet?.eyebrow || project.badge;
  const title = document.createElement('h3'); title.className = 'project-sheet__title'; title.textContent = project.title;
  const summary = document.createElement('p'); summary.className = 'project-sheet__summary';
  summary.textContent = project.sheet?.summary || project.shortDesc;
  const highlights = document.createElement('ul'); highlights.className = 'project-sheet__highlights';
  (project.sheet?.highlights || []).forEach((text, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span'); number.className = 'project-sheet__number';
    number.textContent = String(index + 1).padStart(2, '0');
    const description = document.createElement('span'); description.textContent = text;
    item.append(number, description); highlights.append(item);
  });
  const stackLabel = document.createElement('p'); stackLabel.className = 'project-sheet__stack-label'; stackLabel.textContent = 'SELECTED STACK';
  const stack = document.createElement('ul'); stack.className = 'project-sheet__stack';
  (project.tags || []).slice(0, 6).forEach(tag => {
    const item = document.createElement('li'); item.textContent = tag; stack.append(item);
  });
  const detail = document.createElement('p'); detail.className = 'project-sheet__detail';
  detail.textContent = project.fullDesc;
  paper.append(eyebrow, title, summary, highlights, detail, stackLabel, stack);
  for (const type of ['wheel', 'touchstart', 'touchmove', 'keydown']) {
    sheet.addEventListener(type, event => { if (event.key !== 'Escape' && event.key !== 'Tab') event.stopPropagation(); }, { passive: true });
  }
  if (project.github) {
    const link = document.createElement('a'); link.className = 'project-sheet__source';
    link.href = project.github; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = 'SOURCE ON GITHUB ↗'; paper.append(link);
  }
  sheet.append(paper);
  return sheet;
}

/** A world-space project constellation, rendered by the portfolio's camera. */
export class ExperiencesAct {
  constructor({ container, projects, wake, scene, camera, renderer, canvas }) {
    Object.assign(this, { wake, scene, camera, renderer, canvas });
    this.projects = projects.slice(0, 3);
    this.active = false; this.ready = false; this.disposed = false;
    this.selected = -1; this.progress = 0; this.target = 0; this.elapsed = 0;
    this.events = new AbortController();
    this.root = new THREE.Group();
    this.root.name = 'ExperiencesConstellation';
    this.root.position.set(42, 0, -12);
    scene.add(this.root);
    this.host = document.createElement('section');
    this.host.className = 'experiences-scene'; this.host.hidden = true;
    this.host.setAttribute('aria-label', 'Projects');
    this.host.innerHTML = `<header><p>02 / PROJECTS</p><h2>Inside the folds.</h2></header><p class="experiences-status" aria-live="polite">Preparing origami…</p><div class="experiences-picks"></div><button type="button" class="experiences-close" hidden>Close</button>`;
    container.append(this.host);
    this.buttons = this.projects.map((project, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = project.title;
      b.setAttribute('aria-label', `Open origami: ${project.title}`); b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', () => this.open(i), { signal: this.events.signal });
      this.host.querySelector('.experiences-picks').append(b); return b;
    });
    this.closeButton = this.host.querySelector('.experiences-close');
    this.closeButton.addEventListener('click', () => this.close(), { signal: this.events.signal });
    this.projectSheets = this.projects.map(createProjectSheet);
    this.host.append(...this.projectSheets);
    this.host.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
        return;
      }
      if (!this.hasOpenSelection()) return;
      if (e.key === 'Tab') {
        e.stopPropagation();
        trapFocus(this.host, e);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp') {
        e.stopPropagation();
      }
    }, { signal: this.events.signal });
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2(10, 10);
    this.hovered = -1; this.pressure = new THREE.Vector2(); this.projected = new THREE.Vector3();
    this.floaters = this.buttons.map(() => ({ offset: new THREE.Vector3(), velocity: new THREE.Vector3(), tilt: new THREE.Vector3(), tiltVelocity: new THREE.Vector3() }));
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const on = (type, cb) => canvas.addEventListener(type, cb, { signal: this.events.signal });
    window.addEventListener('pointermove', e => {
      if (!this.active || e.pointerType === 'touch') return;
      this.pointer.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
      this.wake();
    }, { signal: this.events.signal });
    window.addEventListener('pointerleave', () => { this.pointer.set(10, 10); this.hovered = -1; if (this.active) this.wake(); }, { signal: this.events.signal });
    let down = null;
    on('pointerdown', e => {
      if (!this.active || !e.isPrimary) return;
      this.pointer.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
      down = { x: e.clientX, y: e.clientY, index: this.pick() };
      e.stopPropagation();
    });
    on('pointerup', e => {
      if (!this.active || !this.ready || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
      const pressedIndex = down.index; down = null;
      this.pointer.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
      if (this.selected >= 0) this.close(); else this.open(pressedIndex >= 0 ? pressedIndex : this.pick());
    });
    on('pointercancel', () => { down = null; });
  }

  prepare() {
    if (!this.preparation) this.preparation = this.initialize().catch(error => {
      console.error('[ExperiencesAct]', error);
      this.host.querySelector('.experiences-status').textContent = '3D preview unavailable.';
    });
    return this.preparation;
  }

  async initialize() {
    if (!this.renderer) return;
    const maps = await referenceFoilMaps();
    if (this.disposed) { maps.normal.dispose(); maps.roughness.dispose(); return; }
    const room = foilStudio({ cinematic: true }), generator = new THREE.PMREMGenerator(this.renderer);
    this.environment = generator.fromScene(room, .015); disposeTree(room); generator.dispose();
    const hemisphere = new THREE.HemisphereLight('#c6dce9', '#10151a', .16);
    const key = new THREE.DirectionalLight('#fff2dc', 2.8); key.position.set(-4, 6, 4);
    const strip = new THREE.RectAreaLight('#c4dcff', 4.5, .9, 5); strip.position.set(4, 2, -3); strip.lookAt(0, 0, 0);
    this.root.add(key.target);
    for (const light of [hemisphere, key, strip]) { light.layers.set(1); this.root.add(light); }
    this.camera.layers.enable(1);
    maps.normal.anisotropy = maps.roughness.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const silver = new THREE.MeshStandardMaterial({ fog: false, color: '#d1d5d8', metalness: 1, roughness: 1, roughnessMap: maps.roughness, side: THREE.FrontSide, normalMap: maps.normal, normalScale: new THREE.Vector2(.11, .11), envMap: this.environment.texture, envMapIntensity: 1.05 });
    const grain = paperGrain();
    this.sheetMaps = await Promise.all(this.projects.map((_, index) => metalSheetMaps(index))); this.foilMaps = maps;
    if (this.disposed) {
      this.sheetMaps.forEach(surface => { surface.normal.dispose(); surface.roughness.dispose(); });
      maps.normal.dispose(); maps.roughness.dispose(); return;
    }
    for (const texture of this.sheetMaps.flatMap(maps => Object.values(maps))) texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.papers = []; this.rearSurfaces = []; this.frontSurfaces = [];
    this.interactiveMeshes = [];
    this.rigs = this.buttons.map((_, index) => {
      // The reverse transitions from sculpted foil to a satin metal sheet.
      const paper = new THREE.MeshStandardMaterial({ fog: false, color: '#d1d5d8', roughness: .23, metalness: 1, side: THREE.BackSide, bumpMap: grain, bumpScale: .003, normalMap: maps.normal, normalScale: new THREE.Vector2(.1, .1), roughnessMap: maps.roughness, envMap: this.environment.texture, envMapIntensity: 1.05 });
      this.papers.push(paper);
      const front = silver.clone(); this.frontSurfaces.push(front);
      const rig = createUnicornOpening(front, paper);
      // Carry the modeled relief onto the reverse, instead of showing a flat silhouette.
      const rearMaterial = silver.clone();
      const rear = new THREE.Group(); rear.scale.z = -1; rear.position.z = -.035;
      const pairs = [];
      rig.root.traverse(o => {
        if (o.isMesh && o.material.side === THREE.FrontSide) {
          const back = new THREE.Mesh(o.geometry, rearMaterial); back.frustumCulled = o.frustumCulled;
          rear.add(back); pairs.push([o, back]);
        }
      });
      rig.root.add(rear); this.rearSurfaces.push({ material: rearMaterial, pairs, rear });
      rig.root.traverse(o => { o.layers.set(1); if (o.isMesh) { o.userData.projectIndex = index; this.interactiveMeshes.push(o); } }); this.root.add(rig.root); return rig;
    });
    silver.dispose();
    this.ready = true; this.layout(0, 0);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.host.querySelector('.experiences-status').textContent = 'Choose an origami'; this.wake();
  }

  getCameraPose() {
    const distance = Math.max(11.8, 6.8 / (Math.max(.25, this.camera.aspect) * 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))));
    return { position: this.root.position.clone().add(new THREE.Vector3(0, .1, distance)), target: this.root.position.clone() };
  }

  setActive(active) {
    if (this.active === active) return;
    this.active = active; this.host.hidden = !active;
    if (active) { this.prepare(); this.lastTime = performance.now(); this.wake(); }
    else { this.canvas.style.cursor = ''; this.selected = -1; this.progress = this.target = 0; this.pointer.set(10, 10); this.hovered = -1; this.syncUI(); }
  }

  hasOpenSelection() { return this.active && this.selected >= 0; }
  open(index) {
    if (!this.active || !this.ready || this.selected >= 0 || index < 0) return;
    this.lastTime = performance.now(); this.selected = index; this.target = 1; this.syncUI(); this.closeButton.focus(); this.wake();
  }
  close() { this.lastTime = performance.now(); this.target = 0; this.wake(); }
  syncUI() {
    const selected = this.selected >= 0;
    this.host.classList.toggle('has-selection', selected); this.closeButton.hidden = !selected;
    this.buttons.forEach((b, i) => { b.hidden = selected; b.setAttribute('aria-expanded', String(i === this.selected)); });
    this.host.querySelector('.experiences-status').textContent = selected ? '' : 'Choose an origami';
  }

  pick() {
    if (!this.ready || this.pointer.x > 2) return -1;
    this.camera.updateMatrixWorld(true); this.root.updateMatrixWorld(true);
    this.raycaster.layers.set(1); this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.interactiveMeshes.filter(m => m.parent.visible))[0];
    return hit ? hit.object.userData.projectIndex : -1;
  }

  findHover() {
    this.hovered = -1;
    if (!this.ready || this.selected >= 0 || this.pointer.x > 2) return;
    this.camera.updateMatrixWorld(true);
    let nearest = 1;
    this.rigs.forEach((rig, i) => {
      const center = rig.root.localToWorld(new THREE.Vector3(0, -.2, 0)).project(this.camera);
      const radius = innerWidth < 650 ? 105 : 175;
      const dx = (this.pointer.x - center.x) * innerWidth / (2 * radius);
      const dy = (this.pointer.y - center.y) * innerHeight / (2 * radius);
      const distance = Math.hypot(dx, dy);
      if (distance < nearest) {
        nearest = distance; this.hovered = i;
        this.pressure.set(dx * (1 - distance * .45), dy * (1 - distance * .45));
      }
    });
  }

  // Damped springs provide a delayed response and a soft return after the pointer leaves.
  spring(position, velocity, target, dt) {
    const steps = Math.max(1, Math.ceil(dt / .016)), step = dt / steps;
    for (let i = 0; i < steps; i++) {
      velocity.addScaledVector(target.clone().sub(position).multiplyScalar(10).addScaledVector(velocity, -3.6), step);
      position.addScaledVector(velocity, step);
    }
  }

  layout(delta, speedFactor) {
    if (!this.ready) return;
    this.camera.updateMatrixWorld(true);
    const mobile = innerWidth < 650, smooth = THREE.MathUtils.smoothstep(this.progress, 0, 1);
    const bases = mobile ? [[0, 1.9, -.6], [-1.5, -1.35, .45], [1.5, -1.35, -.2]] : [[0, 1.7, -.7], [-3, -1.5, .6], [3, -1.5, -.5]];
    const distance = this.camera.position.distanceTo(this.root.position);
    const viewHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const pageScale = Math.min(viewHeight * .76 / 4.38, viewHeight * this.camera.aspect * .88 / 3.1);
    const rotations = [[-.09, .22, -.05], [.14, -.60, .07], [-.12, Math.PI - .5, -.08]];
    this.rigs.forEach((rig, i) => {
      const chosen = i === this.selected, fade = chosen ? 1 - smooth : 1, p = chosen ? this.progress : 0;
      if (rig.lastProgress !== p) { rig.pose(p); rig.lastProgress = p; }
      const state = this.floaters[i], hover = this.hovered === i && this.selected < 0 && !this.reducedMotion;
      const target = hover ? new THREE.Vector3(this.pressure.x * .16, -this.pressure.y * .1, .06) : new THREE.Vector3();
      const tilt = hover ? new THREE.Vector3(this.pressure.y * .32, this.pressure.x * .20, -this.pressure.x * .30) : new THREE.Vector3();
      if (chosen && !this.reducedMotion && Math.abs(this.pointer.x) <= 1 && Math.abs(this.pointer.y) <= 1) {
        const influence = THREE.MathUtils.smoothstep(p, .8, 1);
        // A small shift of weight keeps the text steady while the page follows the cursor.
        tilt.set(this.pointer.y * .025, 0, -this.pointer.x * .03).multiplyScalar(influence);
        target.set(this.pointer.x * .015, this.pointer.y * .015, 0).multiplyScalar(influence);
      }
      this.spring(state.offset, state.velocity, target, delta); this.spring(state.tilt, state.tiltVelocity, tilt, delta);
      const bob = this.reducedMotion ? 0 : Math.sin(this.elapsed * .65 + i * 2.1) * .07;
      const [x, y, z] = bases[i];
      rig.root.position.set((x + state.offset.x) * fade, (y + bob + state.offset.y) * fade, chosen ? (z + state.offset.z) * fade : z + state.offset.z - (this.selected >= 0 ? smooth * 4 : 0));
      if (chosen) rig.root.position.addScaledVector(state.offset, smooth);
      rig.root.scale.setScalar(chosen ? THREE.MathUtils.lerp(mobile ? .58 : .79, pageScale, smooth) : mobile ? .58 : .79);
      rig.root.rotation.set((rotations[i][0] + state.tilt.x) * fade, (rotations[i][1] + state.tilt.y + (this.reducedMotion ? 0 : Math.sin(this.elapsed * .35 + i) * .035)) * fade, (rotations[i][2] + state.tilt.z) * fade);
      if (chosen) {
        rig.root.rotation.x += state.tilt.x * smooth;
        rig.root.rotation.y += state.tilt.y * smooth;
        rig.root.rotation.z += state.tilt.z * smooth;
      }
      rig.root.visible = chosen || this.selected < 0 || smooth < .7;
      const paperBlend = THREE.MathUtils.smoothstep(p, .35, .95);
      this._syncRearSurface(i, p, paperBlend);
      const label = rig.root.localToWorld(new THREE.Vector3(0, -2.0, 0)).project(this.camera);
      this.buttons[i].style.left = `${(label.x * .5 + .5) * innerWidth}px`;
      this.buttons[i].style.top = `${(-label.y * .5 + .5) * innerHeight}px`;
    });
    this.positionProjectSheet();
  }

  _syncRearSurface(index, progress, paperBlend) {
    const paper = this.papers[index], reverse = this.rearSurfaces[index];
    paper.color.set('#d1d5d8').lerp(new THREE.Color('#dce3e9'), paperBlend);
    paper.metalness = THREE.MathUtils.lerp(1, .94, paperBlend);
    paper.roughness = THREE.MathUtils.lerp(.23, .46, paperBlend);
    const surfaceMaps = paperBlend > .5 ? this.sheetMaps[index] : this.foilMaps;
    for (const material of [paper, reverse.material, this.frontSurfaces[index]]) {
      material.color.copy(paper.color); material.metalness = paper.metalness;
      material.roughness = paperBlend > .5 ? .56 : (material === paper ? .23 : 1);
      if (material.normalMap !== surfaceMaps.normal) {
        material.normalMap = surfaceMaps.normal; material.roughnessMap = surfaceMaps.roughness;
        material.needsUpdate = true;
      }
      material.normalScale.setScalar(paperBlend > .5 ? .3 : .11);
    }
    reverse.pairs.forEach(([source, back]) => { back.geometry = source.geometry; });
    reverse.material.color.copy(paper.color); reverse.material.metalness = paper.metalness;
    reverse.material.roughness = THREE.MathUtils.lerp(1, .46, paperBlend);
    reverse.rear.position.z = -.035 * (1 - paperBlend);
    reverse.rear.visible = progress < .98;
  }

  positionProjectSheet() {
    this.projectSheets.forEach((sheet, i) => {
      const selected = i === this.selected;
      sheet.hidden = !selected;
      if (!selected) return;
      const opacity = THREE.MathUtils.smoothstep(this.progress, .86, .98);
      sheet.style.opacity = String(opacity);
      sheet.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
      sheet.setAttribute('aria-hidden', String(opacity < .9));

      const rig = this.rigs[i];
      const point = (x, y) => rig.root.localToWorld(new THREE.Vector3(x, y, 0)).project(this.camera);
      const pixels = value => new THREE.Vector2((value.x * .5 + .5) * innerWidth, (-value.y * .5 + .5) * innerHeight);
      const center = pixels(point(0, 0)), left = pixels(point(-1.55, 0)), right = pixels(point(1.55, 0));
      const top = pixels(point(0, 2.19)), bottom = pixels(point(0, -2.19));
      sheet.style.left = `${center.x}px`; sheet.style.top = `${center.y}px`;
      sheet.style.width = `${left.distanceTo(right)}px`; sheet.style.height = `${top.distanceTo(bottom)}px`;
      sheet.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(right.y - left.y, right.x - left.x)}rad)`;
    });
  }

  update(delta, speedFactor = 1) {
    if (!this.ready || document.hidden) return;
    if (this.active) {
      this.findHover(); this.canvas.style.cursor = this.pick() >= 0 ? 'pointer' : '';
      const now = performance.now(), dt = Math.min((now - (this.lastTime ?? now)) / 1000, .5); this.lastTime = now;
      this.progress += Math.sign(this.target - this.progress) * Math.min(Math.abs(this.target - this.progress), dt / (this.reducedMotion ? .8 : 4 / 3));
      this.elapsed += delta * speedFactor;
    }
    this.layout(delta, speedFactor);
    if (this.active && this.selected >= 0 && this.target === 0 && this.progress === 0) {
      const i = this.selected; this.selected = -1; this.syncUI(); this.buttons[i].focus();
    }
  }
  isResting() {
    return (!this.active || Math.abs(this.target - this.progress) < 1e-6) && this.floaters.every(s => s.velocity.lengthSq() + s.tiltVelocity.lengthSq() < 1e-6);
  }
  dispose() {
    this.disposed = true; this.events.abort();
    this.sheetMaps?.forEach((maps, index) => {
      if (this.papers[index].normalMap !== maps.normal) {
        maps.normal.dispose(); maps.roughness.dispose();
      }
    });
    disposeTree(this.root); this.rigs?.forEach(r => r.dispose());
    this.root.removeFromParent(); this.environment?.dispose(); this.host.remove();
  }
}
