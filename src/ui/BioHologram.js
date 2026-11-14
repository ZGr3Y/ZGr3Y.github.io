import { Vector2, Vector3 } from 'three';

/** A projected DOM plane and its light cone, driven by the existing scene loop. */
export class BioHologram {
  constructor({ card, beam = null } = {}) {
    this.card = card;
    this.beam = beam;
    this.isOpen = false;
    this.reveal = 0;
    this.motion = new Vector2();
    this.source = new Vector3();
    this.width = 460;
    this.height = 320;
    this._disposed = false;
    this._volume = beam?.querySelector('.beam-volume');
    this._core = beam?.querySelector('.beam-core');
    this._emitter = beam?.querySelector('.beam-emitter');
    this._observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
    if (card) {
      card.hidden = true;
      this._observer?.observe(card);
    }
    if (beam) beam.setAttribute('hidden', '');
  }

  resize() {
    if (!this.card || this.card.hidden) return;
    // Read only after opening, resizing or a content/font size change.
    this.width = this.card.offsetWidth || this.width;
    this.height = this.card.offsetHeight || this.height;
    const topLimit = window.innerWidth < 769 ? 80 : 118;
    this.centerY = Math.max(topLimit + this.height * 0.5, window.innerHeight * 0.32);
    this.card.style.left = `${window.innerWidth * 0.5}px`;
    this.card.style.top = `${this.centerY}px`;
  }

  open() {
    if (this._disposed || !this.card) return;
    this.isOpen = true;
    this.card.hidden = false;
    this.card.classList.remove('is-closing');
    this.card.classList.add('is-open');
    this.resize();
    if (this.beam) this.beam.removeAttribute('hidden');
  }

  close() {
    if (this._disposed || !this.card) return;
    this.isOpen = false;
    this.card.classList.add('is-closing');
    this.card.classList.remove('is-open');
    if (this.reveal === 0) {
      this.card.hidden = true;
      this.card.classList.remove('is-closing');
      if (this.beam) this.beam.setAttribute('hidden', '');
    }
  }

  isVisible() {
    return !this._disposed && (this.isOpen || this.reveal > 0);
  }

  isResting() {
    return this._disposed || (!this.isOpen && this.reveal === 0) ||
      (this.reveal === 1 && this._motionSettled);
  }

  /** Updates compositor transforms; the animated panel is never measured here. */
  update({ delta = 0.016, pointer = { x: 0, y: 0 }, camera, source, idle = false } = {}) {
    if (this._disposed || !this.card || !camera || !source || !this.isVisible()) return;
    const dt = Math.max(0, Math.min(delta, 0.1));
    const target = this.isOpen ? 1 : 0;
    this.reveal += (target - this.reveal) * (1 - Math.exp(-12 * dt));
    if (Math.abs(target - this.reveal) < 0.002) this.reveal = target;

    const x = Math.max(-1, Math.min(pointer.x || 0, 1));
    const y = Math.max(-1, Math.min(pointer.y || 0, 1));
    const damping = 1 - Math.exp(-7 * dt);
    this.motion.x += (x - this.motion.x) * damping;
    this.motion.y += (y - this.motion.y) * damping;
    this._motionSettled = Math.abs(x - this.motion.x) + Math.abs(y - this.motion.y) < 0.001;
    if (this._motionSettled) this.motion.set(x, y);

    if (this.reveal === 0) {
      this.card.hidden = true;
      this.card.classList.remove('is-closing');
      this.card.style.opacity = '0';
      if (this.beam) this.beam.setAttribute('hidden', '');
      return;
    }

    this.source.copy(source).project(camera);
    const sourceX = (this.source.x + 1) * window.innerWidth * 0.5;
    const sourceY = (1 - this.source.y) * window.innerHeight * 0.5;
    const halfWidth = this.width * 0.5;
    const halfHeight = this.height * 0.5;
    const centerX = window.innerWidth * 0.5;
    const centerY = this.centerY;
    const offsetX = this.motion.x * 7;
    const offsetY = -this.motion.y * 4 + (1 - this.reveal) * 14;
    const pitch = this.motion.y * 1.8;
    const yaw = this.motion.x * 3;
    const scale = 0.94 + this.reveal * 0.06;

    this.card.style.opacity = String(this.reveal);
    this.card.style.transform = `translate(-50%, -50%) translate3d(${offsetX}px, ${offsetY}px, 0) perspective(1000px) rotateX(${pitch}deg) rotateY(${yaw}deg) scale(${scale})`;
    this.card.classList.toggle('is-resting', idle);

    if (this.beam) {
      // Same plane projection as the CSS transform, without a forced layout read.
      const rx = pitch * Math.PI / 180;
      const ry = yaw * Math.PI / 180;
      const edge = (localX) => {
        const px = localX * scale;
        const py = halfHeight * scale;
        const rotatedX = px * Math.cos(ry);
        const z = -px * Math.sin(ry);
        const rotatedY = py * Math.cos(rx) - z * Math.sin(rx);
        const depth = py * Math.sin(rx) + z * Math.cos(rx);
        const perspective = 1 / (1 - depth / 1000);
        return [centerX + offsetX + rotatedX * perspective, centerY + offsetY + rotatedY * perspective];
      };
      const left = edge(-halfWidth);
      const right = edge(halfWidth);
      const spread = Math.max(16, Math.min(32, window.innerWidth * 0.025));
      this._volume?.setAttribute('d', `M ${sourceX - spread} ${sourceY} L ${left[0]} ${left[1]} L ${right[0]} ${right[1]} L ${sourceX + spread} ${sourceY} Z`);
      this._core?.setAttribute('d', `M ${sourceX - spread * 0.35} ${sourceY} L ${centerX + offsetX - halfWidth * 0.28} ${left[1]} L ${centerX + offsetX + halfWidth * 0.28} ${right[1]} L ${sourceX + spread * 0.35} ${sourceY} Z`);
      this._emitter?.setAttribute('cx', String(sourceX));
      this._emitter?.setAttribute('cy', String(sourceY));
      this._emitter?.setAttribute('rx', String(spread));
      this.beam.style.opacity = String(this.reveal);
    }
  }

  dispose() {
    this._disposed = true;
    this._observer?.disconnect();
    if (this.card) this.card.hidden = true;
    if (this.beam) this.beam.setAttribute('hidden', '');
    this.card = null;
    this.beam = null;
    this._volume = null;
    this._core = null;
    this._emitter = null;
  }
}
