import * as THREE from 'three';

/**
 * AdaptiveLightingEngine - Interactive Photon Lighting & Network Ping Wave System
 * Replaces physical node jitter with smooth proximity illumination, scale bloom, and water ripple waves.
 */
export class AdaptiveLightingEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.ambientOpacity=0.25] - Resting opacity for nodes in ambient state
   * @param {number} [options.activeOpacity=0.95] - Maximum illuminated opacity when under cursor spotlight
   * @param {number} [options.lightRadius=7.0] - Spatial reach of pointer illumination
   * @param {number} [options.scaleBoost=0.35] - Subtle geometric scale boost under light focus
   * @param {number} [options.pulseSpeed=14.0] - Expansion velocity of concentric water ripple/ping waves
   * @param {number} [options.maxPulseRadius=18.0] - Maximum travel distance for ripple pulses
   */
  constructor({
    ambientOpacity = 0.25,
    activeOpacity = 0.95,
    lightRadius = 7.0,
    scaleBoost = 0.35,
    pulseSpeed = 14.0,
    maxPulseRadius = 18.0
  } = {}) {
    this.ambientOpacity = ambientOpacity;
    this.activeOpacity = activeOpacity;
    this.lightRadius = lightRadius;
    this.scaleBoost = scaleBoost;
    this.pulseSpeed = pulseSpeed;
    this.maxPulseRadius = maxPulseRadius;

    this.pulses = [];
  }

  /**
   * Triggers a concentric network ping wave (water ripple of light) from a 3D origin
   * @param {THREE.Vector3} origin - Center coordinate of the ripple
   * @param {number} [intensity=1.0] - Initial wave intensity [0.0 - 1.0]
   */
  triggerPulse(origin, intensity = 1.0) {
    if (!origin) return;
    this.pulses.push({
      origin: origin.clone(),
      radius: 0.1,
      intensity: Math.min(1.0, Math.max(0.05, intensity))
    });
  }

  /**
   * Updates lighting intensity, scales, conduit opacities, and active ripple pulses
   * @param {Array<Object>} nodes - 3D semantic nodes
   * @param {Array<Object>} conduits - Network conduits with line meshes
   * @param {THREE.Vector3|null} pointerWorldPos - 3D world coordinates of pointer focus
   * @param {number} [delta=0.016] - Elapsed frame time in seconds
   */
  update(nodes, conduits = [], pointerWorldPos = null, delta = 0.016) {
    // 1. Advance concentric water ripple/ping waves
    for (let p = this.pulses.length - 1; p >= 0; p--) {
      const pulse = this.pulses[p];
      pulse.radius += this.pulseSpeed * delta;
      pulse.intensity = Math.max(0.0, 1.0 - (pulse.radius / this.maxPulseRadius));

      if (pulse.intensity <= 0.001 || pulse.radius >= this.maxPulseRadius) {
        this.pulses.splice(p, 1);
      }
    }

    const lerpSpeed = Math.min(1.0, Math.max(0.0, delta * 10.0));

    // 2. Compute illumination and scale bloom for nodes
    if (nodes && nodes.length > 0) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node.mesh || !node.mesh.material) continue;

        // Proximity light spotlight factor
        let proxFactor = 0.0;
        if (pointerWorldPos) {
          const dx = node.position.x - pointerWorldPos.x;
          const dy = node.position.y - pointerWorldPos.y;
          const dz = node.position.z - pointerWorldPos.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < this.lightRadius * this.lightRadius) {
            const dist = Math.sqrt(distSq);
            proxFactor = Math.pow(1.0 - (dist / this.lightRadius), 1.8);
          }
        }

        // Ripple pulse wave factor
        let waveFactor = 0.0;
        for (let w = 0; w < this.pulses.length; w++) {
          const pulse = this.pulses[w];
          const distToCenter = node.position.distanceTo(pulse.origin);
          const waveDiff = Math.abs(distToCenter - pulse.radius);

          if (waveDiff < 2.5) {
            const waveGlow = pulse.intensity * Math.exp(-(waveDiff * waveDiff) / 1.5);
            if (waveGlow > waveFactor) {
              waveFactor = waveGlow;
            }
          }
        }

        const totalIllumination = Math.min(1.0, proxFactor + waveFactor * 0.9);
        const targetOpacity = this.ambientOpacity + (this.activeOpacity - this.ambientOpacity) * totalIllumination;
        const targetScale = 1.0 + this.scaleBoost * totalIllumination;

        // Smooth transition
        node.mesh.material.opacity += (targetOpacity - node.mesh.material.opacity) * lerpSpeed;
        const currentScale = node.mesh.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * lerpSpeed;
        node.mesh.scale.set(newScale, newScale, newScale);
      }
    }

    // 3. Modulate conduit fiber-optic cable opacities
    if (conduits && conduits.length > 0) {
      for (let c = 0; c < conduits.length; c++) {
        const conduit = conduits[c];
        if (!conduit.line || !conduit.line.material) continue;

        let conduitIllumination = 0.0;
        if (pointerWorldPos && conduit.curve) {
          const midPoint = conduit.curve.getPoint(0.5);
          const distToMid = midPoint.distanceTo(pointerWorldPos);
          if (distToMid < this.lightRadius) {
            conduitIllumination = Math.pow(1.0 - (distToMid / this.lightRadius), 1.5);
          }
        }

        const targetLineOpacity = 0.15 + conduitIllumination * 0.50;
        conduit.line.material.opacity += (targetLineOpacity - conduit.line.material.opacity) * lerpSpeed;
      }
    }
  }

  /**
   * Returns whether all nodes and ripples have settled into resting ambient state
   * @param {Array<Object>} nodes - 3D nodes
   * @returns {boolean}
   */
  isResting(nodes) {
    if (this.pulses.length > 0) return false;
    if (!nodes || nodes.length === 0) return true;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.mesh || !node.mesh.material) continue;

      if (Math.abs(node.mesh.material.opacity - this.ambientOpacity) > 0.015) {
        return false;
      }
      if (Math.abs(node.mesh.scale.x - 1.0) > 0.015) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cleanup method in accordance with Coding Standard #7
   */
  dispose() {
    this.pulses = [];
  }
}
