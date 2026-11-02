import * as THREE from 'three';

// Ice White canvas base RGB (#F4F7FB) for mathematically exact per-line alpha blending
const BG_R = 244 / 255;
const BG_G = 247 / 255;
const BG_B = 251 / 255;

// Cursor nexus highlight RGB (#00B4FF)
const CURSOR_R = 0 / 255;
const CURSOR_G = 180 / 255;
const CURSOR_B = 255 / 255;

/**
 * AdaptiveLightingEngine — Vincent Garreau (particles.js) Constellation, Grab & Ripple Engine
 * Implements:
 * 1. Dynamic particle-to-particle proximity links (`linkParticles` formula)
 * 2. Interactive cursor-to-particle spiderweb links (`grabParticle` formula)
 * 3. Proximity node illumination & scale bloom (`bubbleParticle` formula)
 * 4. Gentle elastic cursor repulsion (`repulseParticle` + spring-damper recovery)
 * 5. Concentric click/tap shockwave pulses
 */
export class AdaptiveLightingEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.ambientOpacity=0.25] - Resting opacity for nodes in ambient state
   * @param {number} [options.activeOpacity=0.95] - Maximum illuminated opacity when under cursor spotlight
   * @param {number} [options.lightRadius=7.0] - Spatial reach of pointer illumination & grab lines
   * @param {number} [options.scaleBoost=0.35] - Geometric scale boost under light focus (bubble mode)
   * @param {number} [options.pulseSpeed=14.0] - Expansion velocity of concentric ripple/ping waves
   * @param {number} [options.maxPulseRadius=18.0] - Maximum travel distance for ripple pulses
   * @param {number} [options.linkDistance=4.8] - Max distance for particle-to-particle constellation lines
   * @param {number} [options.linkOpacity=0.42] - Base opacity of particle-to-particle lines
   * @param {number} [options.grabDistance=6.2] - Max distance for cursor-to-particle grab lines
   * @param {number} [options.grabOpacity=0.85] - Base opacity of cursor grab spiderweb lines
   * @param {number} [options.repulseRadius=2.6] - Radius around cursor that gently parts nodes
   * @param {number} [options.repulseStrength=0.85] - Maximum elastic deflection distance
   */
  constructor({
    ambientOpacity = 0.25,
    activeOpacity = 0.95,
    lightRadius = 7.0,
    scaleBoost = 0.35,
    pulseSpeed = 14.0,
    maxPulseRadius = 18.0,
    linkDistance = 4.8,
    linkOpacity = 0.42,
    grabDistance = 6.2,
    grabOpacity = 0.85,
    repulseRadius = 2.6,
    repulseStrength = 0.85
  } = {}) {
    this.ambientOpacity = ambientOpacity;
    this.activeOpacity = activeOpacity;
    this.lightRadius = lightRadius;
    this.scaleBoost = scaleBoost;
    this.pulseSpeed = pulseSpeed;
    this.maxPulseRadius = maxPulseRadius;

    this.linkDistance = linkDistance;
    this.linkOpacity = linkOpacity;
    this.grabDistance = grabDistance;
    this.grabOpacity = grabOpacity;
    this.repulseRadius = repulseRadius;
    this.repulseStrength = repulseStrength;

    this.pulses = [];
    this.activeLinkCount = 0;
    this.activeGrabCount = 0;
  }

  /**
   * Triggers a concentric network ping wave (water ripple / push burst) from a 3D origin
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
   * Updates node illumination, bubble scale, elastic repulse, conduit glow, and constellation lines
   * @param {Array<Object>} nodes - 3D semantic nodes
   * @param {Array<Object>} [conduits=[]] - Network conduits with line meshes
   * @param {THREE.Vector3|null} [pointerWorldPos=null] - 3D world coordinates of pointer focus
   * @param {number} [delta=0.016] - Elapsed frame time in seconds
   * @param {THREE.BufferGeometry|null} [constellationGeometry=null] - Dynamic LineSegments geometry
   */
  update(nodes, conduits = [], pointerWorldPos = null, delta = 0.016, constellationGeometry = null) {
    // 1. Advance concentric ripple/ping waves
    for (let p = this.pulses.length - 1; p >= 0; p--) {
      const pulse = this.pulses[p];
      pulse.radius += this.pulseSpeed * delta;
      pulse.intensity = Math.max(0.0, 1.0 - (pulse.radius / this.maxPulseRadius));

      if (pulse.intensity <= 0.001 || pulse.radius >= this.maxPulseRadius) {
        this.pulses.splice(p, 1);
      }
    }

    const lerpSpeed = Math.min(1.0, Math.max(0.0, delta * 10.0));

    // 2. Compute illumination, bubble scale, and gentle repulse for nodes
    if (nodes && nodes.length > 0) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node.mesh || !node.mesh.material) continue;

        const refPos = node.basePosition || node.position;
        const baseScale = typeof node.baseScale === 'number' ? node.baseScale : 1.0;

        // Proximity light & bubble factor (particles.js bubbleParticle ratio)
        let proxFactor = 0.0;
        let targetOffsetX = 0.0;
        let targetOffsetY = 0.0;

        if (pointerWorldPos) {
          const dx = refPos.x - pointerWorldPos.x;
          const dy = refPos.y - pointerWorldPos.y;
          const dz = refPos.z - pointerWorldPos.z;
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq < this.lightRadius * this.lightRadius) {
            const dist = Math.sqrt(distSq);
            proxFactor = Math.pow(1.0 - (dist / this.lightRadius), 1.5);

            // Gentle particles.js repulseParticle deflection when cursor is close
            if (dist < this.repulseRadius && dist > 0.0001) {
              const normX = dx / dist;
              const normY = dy / dist;
              const ratio = dist / this.repulseRadius;
              // Garreau quadratic repulse curve: (1 - (d/R)^2)
              const repulseMag = (1.0 - ratio * ratio) * this.repulseStrength;
              targetOffsetX = normX * repulseMag;
              targetOffsetY = normY * repulseMag;
            }
          }
        }

        // Ripple pulse wave factor
        let waveFactor = 0.0;
        for (let w = 0; w < this.pulses.length; w++) {
          const pulse = this.pulses[w];
          const distToCenter = refPos.distanceTo(pulse.origin);
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
        const targetScale = baseScale * (1.0 + this.scaleBoost * totalIllumination);

        // Smooth opacity & scale transition
        node.mesh.material.opacity += (targetOpacity - node.mesh.material.opacity) * lerpSpeed;
        const currentScale = node.mesh.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * lerpSpeed;
        node.mesh.scale.set(newScale, newScale, newScale);

        // Smooth elastic spring-damper position update around basePosition
        if (node.basePosition) {
          const targetX = node.basePosition.x + targetOffsetX;
          const targetY = node.basePosition.y + targetOffsetY;
          const targetZ = node.basePosition.z;

          node.position.x += (targetX - node.position.x) * lerpSpeed;
          node.position.y += (targetY - node.position.y) * lerpSpeed;
          node.position.z += (targetZ - node.position.z) * lerpSpeed;
          node.mesh.position.copy(node.position);
        }
      }
    }

    // 3. Update dynamic constellation lines (linkParticles + grabParticle from particles.js)
    if (constellationGeometry && nodes && nodes.length > 0) {
      this.updateConstellation(nodes, pointerWorldPos, constellationGeometry);
    }

    // 4. Modulate conduit fiber-optic cable opacities
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

        const targetLineOpacity = 0.12 + conduitIllumination * 0.45;
        conduit.line.material.opacity += (targetLineOpacity - conduit.line.material.opacity) * lerpSpeed;
      }
    }
  }

  /**
   * Computes Vincent Garreau's `linkParticles` (node-to-node) and `grabParticle` (cursor-to-node)
   * dynamic line segments and writes them into the preallocated Three.js BufferGeometry.
   * @param {Array<Object>} nodes
   * @param {THREE.Vector3|null} pointerWorldPos
   * @param {THREE.BufferGeometry} lineGeometry
   */
  updateConstellation(nodes, pointerWorldPos, lineGeometry) {
    const posAttr = lineGeometry.getAttribute('position');
    const colAttr = lineGeometry.getAttribute('color');
    if (!posAttr || !colAttr) return;

    const positions = posAttr.array;
    const colors = colAttr.array;
    const maxVertices = posAttr.count;

    let vIdx = 0;
    let linkCount = 0;
    let grabCount = 0;

    const linkDist = this.linkDistance;
    const linkDistSq = linkDist * linkDist;
    const grabDist = this.grabDistance;
    const grabDistSq = grabDist * grabDist;

    // A. Particle-to-Particle Dynamic Links (particles.js: pJS.fn.interact.linkParticles)
    const nLen = nodes.length;
    for (let i = 0; i < nLen; i++) {
      const p1 = nodes[i];
      const pos1 = p1.position;
      const c1 = (p1.mesh && p1.mesh.material && p1.mesh.material.color)
        ? p1.mesh.material.color
        : { r: 0.25, g: 0.45, b: 0.75 };

      for (let j = i + 1; j < nLen; j++) {
        if (vIdx + 2 > maxVertices) break;

        const p2 = nodes[j];
        const pos2 = p2.position;

        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq <= linkDistSq) {
          const dist = Math.sqrt(distSq);
          // Exact Vincent Garreau formula:
          // opacity_line = line_linked.opacity - (dist / (1 / line_linked.opacity)) / line_linked.distance
          const opacityLine = this.linkOpacity * (1.0 - (dist / linkDist));

          if (opacityLine > 0.005) {
            const c2 = (p2.mesh && p2.mesh.material && p2.mesh.material.color)
              ? p2.mesh.material.color
              : c1;

            const base = vIdx * 3;
            positions[base] = pos1.x;
            positions[base + 1] = pos1.y;
            positions[base + 2] = pos1.z;
            positions[base + 3] = pos2.x;
            positions[base + 4] = pos2.y;
            positions[base + 5] = pos2.z;

            // Blend node colors over Ice White (#F4F7FB) by opacityLine
            colors[base] = BG_R + (c1.r - BG_R) * opacityLine;
            colors[base + 1] = BG_G + (c1.g - BG_G) * opacityLine;
            colors[base + 2] = BG_B + (c1.b - BG_B) * opacityLine;

            colors[base + 3] = BG_R + (c2.r - BG_R) * opacityLine;
            colors[base + 4] = BG_G + (c2.g - BG_G) * opacityLine;
            colors[base + 5] = BG_B + (c2.b - BG_B) * opacityLine;

            vIdx += 2;
            linkCount++;
          }
        }
      }

      // B. Cursor-to-Particle "Grab" Spiderweb Links (particles.js: pJS.fn.modes.grabParticle)
      if (pointerWorldPos && vIdx + 2 <= maxVertices) {
        const dxM = pos1.x - pointerWorldPos.x;
        const dyM = pos1.y - pointerWorldPos.y;
        const dzM = pos1.z - pointerWorldPos.z;
        const distMouseSq = dxM * dxM + dyM * dyM + dzM * dzM;

        if (distMouseSq <= grabDistSq) {
          const distMouse = Math.sqrt(distMouseSq);
          // Exact Vincent Garreau grab formula:
          // opacity_line = grab.opacity - (dist_mouse / (1 / grab.opacity)) / grab.distance
          const opacityGrab = this.grabOpacity * (1.0 - (distMouse / grabDist));

          if (opacityGrab > 0.005) {
            const base = vIdx * 3;
            positions[base] = pointerWorldPos.x;
            positions[base + 1] = pointerWorldPos.y;
            positions[base + 2] = pointerWorldPos.z;
            positions[base + 3] = pos1.x;
            positions[base + 4] = pos1.y;
            positions[base + 5] = pos1.z;

            // Vertex 1 (at cursor): Primary Blue blended by opacityGrab
            colors[base] = BG_R + (CURSOR_R - BG_R) * opacityGrab;
            colors[base + 1] = BG_G + (CURSOR_G - BG_G) * opacityGrab;
            colors[base + 2] = BG_B + (CURSOR_B - BG_B) * opacityGrab;

            // Vertex 2 (at node): Node semantic tier color blended by opacityGrab
            colors[base + 3] = BG_R + (c1.r - BG_R) * opacityGrab;
            colors[base + 4] = BG_G + (c1.g - BG_G) * opacityGrab;
            colors[base + 5] = BG_B + (c1.b - BG_B) * opacityGrab;

            vIdx += 2;
            grabCount++;
          }
        }
      }
    }

    this.activeLinkCount = linkCount;
    this.activeGrabCount = grabCount;

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    lineGeometry.setDrawRange(0, vIdx);
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

      const baseScale = typeof node.baseScale === 'number' ? node.baseScale : 1.0;

      if (Math.abs(node.mesh.material.opacity - this.ambientOpacity) > 0.02) {
        return false;
      }
      if (Math.abs(node.mesh.scale.x - baseScale) > 0.02) {
        return false;
      }
      if (node.basePosition && node.position.distanceTo(node.basePosition) > 0.02) {
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
    this.activeLinkCount = 0;
    this.activeGrabCount = 0;
  }
}
