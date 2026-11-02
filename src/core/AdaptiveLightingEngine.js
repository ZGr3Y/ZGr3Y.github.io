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
 * AdaptiveLightingEngine — Vincent Garreau (particles.js) Constellation, Grab & Laser Pulse Engine
 * Implements:
 * 1. Dynamic particle-to-particle proximity links (`linkParticles` formula)
 * 2. Interactive cursor-to-particle spiderweb links (`grabParticle` formula)
 * 3. Asynchronous traveling laser pulses (`linePackets`) along node links and from the pointer
 * 4. Proximity node illumination & scale bloom (`bubbleParticle` formula)
 * 5. Gentle elastic cursor repulsion (`repulseParticle` + spring-damper recovery)
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
   * @param {number} [options.linkOpacity=0.28] - Base opacity of particle-to-particle lines
   * @param {number} [options.grabDistance=6.2] - Max distance for cursor-to-particle grab lines
   * @param {number} [options.grabOpacity=0.42] - Base opacity of cursor grab spiderweb lines
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
    linkOpacity = 0.28,
    grabDistance = 6.2,
    grabOpacity = 0.42,
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
    this.linePackets = [];
    this.activeLinkCount = 0;
    this.activeGrabCount = 0;
  }

  /**
   * Triggers a concentric network ping wave from a 3D origin
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
   * Spawns a single desynchronized laser pulse along a connected edge (node->node or pointer->node)
   * @param {number} fromIndex - Source node index (-1 if originating from pointer)
   * @param {number} toIndex - Destination node index
   * @param {{r: number, g: number, b: number}} color - RGB color of the laser pulse
   * @param {boolean} [fromPointer=false] - Whether pulse starts at the cursor tip
   */
  spawnLinePacket(fromIndex, toIndex, color, fromPointer = false) {
    if (this.linePackets.length >= 160) return;

    // Prevent two pulses from overlapping on the exact same directed edge at the same time
    for (let k = 0; k < this.linePackets.length; k++) {
      const existing = this.linePackets[k];
      if (
        existing.fromPointer === fromPointer &&
        existing.fromIndex === fromIndex &&
        existing.toIndex === toIndex &&
        existing.progress < 0.45
      ) {
        return;
      }
    }

    this.linePackets.push({
      fromPointer,
      fromIndex,
      toIndex,
      progress: 0.0,
      // Desynchronized random transit velocity and laser trail length
      speed: 1.15 + Math.random() * 1.45,
      tailLength: 0.28 + Math.random() * 0.16,
      color: { r: color.r, g: color.g, b: color.b }
    });
  }

  /**
   * Updates node illumination, bubble scale, elastic repulse, constellation lines, and laser pulses
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

        node.mesh.material.opacity += (targetOpacity - node.mesh.material.opacity) * lerpSpeed;
        const currentScale = node.mesh.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * lerpSpeed;
        node.mesh.scale.set(newScale, newScale, newScale);

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

    // 3. Update dynamic constellation lines + asynchronous laser pulses along edges
    if (constellationGeometry && nodes && nodes.length > 0) {
      this.updateConstellation(nodes, pointerWorldPos, constellationGeometry, delta);
    }

    // 4. Modulate conduit opacities
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
   * Computes `linkParticles`, `grabParticle`, and asynchronous laser pulses (`linePackets`)
   * traveling along the connecting lines, writing all segments into `lineGeometry`.
   * @param {Array<Object>} nodes
   * @param {THREE.Vector3|null} pointerWorldPos
   * @param {THREE.BufferGeometry} lineGeometry
   * @param {number} [delta=0.016]
   */
  updateConstellation(nodes, pointerWorldPos, lineGeometry, delta = 0.016) {
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
    const lightRadSq = this.lightRadius * this.lightRadius;

    const nLen = nodes.length;

    // A. Particle-to-Particle Dynamic Links + Desynchronized Packet Spawning
    for (let i = 0; i < nLen; i++) {
      const p1 = nodes[i];
      const pos1 = p1.position;
      const c1 = (p1.mesh && p1.mesh.material && p1.mesh.material.color)
        ? p1.mesh.material.color
        : { r: 0, g: 0.7, b: 1.0 };

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

            colors[base] = BG_R + (c1.r - BG_R) * opacityLine;
            colors[base + 1] = BG_G + (c1.g - BG_G) * opacityLine;
            colors[base + 2] = BG_B + (c1.b - BG_B) * opacityLine;

            colors[base + 3] = BG_R + (c2.r - BG_R) * opacityLine;
            colors[base + 4] = BG_G + (c2.g - BG_G) * opacityLine;
            colors[base + 5] = BG_B + (c2.b - BG_B) * opacityLine;

            vIdx += 2;
            linkCount++;

            // Pseudo-random packet spawning: low ambient rate vs high rate near pointer
            if (delta > 0) {
              let spawnRate = 0.04; // ~5-7 ambient pulses/sec across the whole constellation
              if (pointerWorldPos) {
                const midX = (pos1.x + pos2.x) * 0.5 - pointerWorldPos.x;
                const midY = (pos1.y + pos2.y) * 0.5 - pointerWorldPos.y;
                const distToPtrSq = midX * midX + midY * midY;
                if (distToPtrSq < lightRadSq) {
                  const prox = 1.0 - Math.sqrt(distToPtrSq) / this.lightRadius;
                  // Up to 45x higher packet frequency right near the pointer!
                  spawnRate += prox * 1.8;
                }
              }

              if (Math.random() < spawnRate * delta) {
                if (Math.random() < 0.5) {
                  this.spawnLinePacket(i, j, c1, false);
                } else {
                  this.spawnLinePacket(j, i, c2, false);
                }
              }
            }
          }
        }
      }

      // B. Cursor-to-Particle "Grab" Spiderweb Links + Pulses Originating from Pointer
      if (pointerWorldPos && vIdx + 2 <= maxVertices) {
        const dxM = pos1.x - pointerWorldPos.x;
        const dyM = pos1.y - pointerWorldPos.y;
        const dzM = pos1.z - pointerWorldPos.z;
        const distMouseSq = dxM * dxM + dyM * dyM + dzM * dzM;

        if (distMouseSq <= grabDistSq) {
          const distMouse = Math.sqrt(distMouseSq);
          const proxGrab = 1.0 - (distMouse / grabDist);
          const opacityGrab = this.grabOpacity * proxGrab;

          if (opacityGrab > 0.005) {
            const base = vIdx * 3;
            positions[base] = pointerWorldPos.x;
            positions[base + 1] = pointerWorldPos.y;
            positions[base + 2] = pointerWorldPos.z;
            positions[base + 3] = pos1.x;
            positions[base + 4] = pos1.y;
            positions[base + 5] = pos1.z;

            colors[base] = BG_R + (CURSOR_R - BG_R) * opacityGrab;
            colors[base + 1] = BG_G + (CURSOR_G - BG_G) * opacityGrab;
            colors[base + 2] = BG_B + (CURSOR_B - BG_B) * opacityGrab;

            colors[base + 3] = BG_R + (c1.r - BG_R) * opacityGrab;
            colors[base + 4] = BG_G + (c1.g - BG_G) * opacityGrab;
            colors[base + 5] = BG_B + (c1.b - BG_B) * opacityGrab;

            vIdx += 2;
            grabCount++;

            // Frequent desynchronized pulses shooting out from the pointer into grabbed nodes
            if (delta > 0 && Math.random() < (1.2 + proxGrab * 2.4) * delta) {
              this.spawnLinePacket(
                -1,
                i,
                { r: CURSOR_R, g: CURSOR_G, b: CURSOR_B },
                true
              );
            }
          }
        }
      }
    }

    // C. Advance and Render Active Laser Pulses (Option B: Glowing Laser Trail along the line)
    for (let p = this.linePackets.length - 1; p >= 0; p--) {
      const pkt = this.linePackets[p];
      pkt.progress += pkt.speed * delta;

      if (pkt.progress >= 1.0 + pkt.tailLength) {
        this.linePackets.splice(p, 1);
        continue;
      }

      const targetNode = nodes[pkt.toIndex];
      if (!targetNode) {
        this.linePackets.splice(p, 1);
        continue;
      }

      let startPos = null;
      let maxAllowedDistSq = linkDistSq;

      if (pkt.fromPointer) {
        if (!pointerWorldPos) {
          this.linePackets.splice(p, 1);
          continue;
        }
        startPos = pointerWorldPos;
        maxAllowedDistSq = grabDistSq;
      } else {
        const sourceNode = nodes[pkt.fromIndex];
        if (!sourceNode) {
          this.linePackets.splice(p, 1);
          continue;
        }
        startPos = sourceNode.position;
      }

      const endPos = targetNode.position;
      const dx = endPos.x - startPos.x;
      const dy = endPos.y - startPos.y;
      const dz = endPos.z - startPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // If the two endpoints drifted apart beyond link range, terminate pulse cleanly
      if (distSq > maxAllowedDistSq * 1.15) {
        this.linePackets.splice(p, 1);
        continue;
      }

      const tHead = Math.min(1.0, pkt.progress);
      const tTail = Math.max(0.0, pkt.progress - pkt.tailLength);

      if (tHead > tTail && vIdx + 4 <= maxVertices) {
        const tMid = tTail + (tHead - tTail) * 0.65;

        // Slight +Z bias (+0.03) so the bright laser trail renders cleanly on top of the base wire
        const zBias = 0.03;

        const tailX = startPos.x + dx * tTail;
        const tailY = startPos.y + dy * tTail;
        const tailZ = startPos.z + dz * tTail + zBias;

        const midX = startPos.x + dx * tMid;
        const midY = startPos.y + dy * tMid;
        const midZ = startPos.z + dz * tMid + zBias;

        const headX = startPos.x + dx * tHead;
        const headY = startPos.y + dy * tHead;
        const headZ = startPos.z + dz * tHead + zBias;

        const cr = pkt.color.r;
        const cg = pkt.color.g;
        const cb = pkt.color.b;

        // Segment 1: Fading laser tail (tTail -> tMid)
        const base1 = vIdx * 3;
        positions[base1] = tailX;
        positions[base1 + 1] = tailY;
        positions[base1 + 2] = tailZ;
        positions[base1 + 3] = midX;
        positions[base1 + 4] = midY;
        positions[base1 + 5] = midZ;

        // Tail vertex fades smoothly into the wire (15% intensity), Mid vertex is 90% vivid color
        colors[base1] = BG_R + (cr - BG_R) * 0.15;
        colors[base1 + 1] = BG_G + (cg - BG_G) * 0.15;
        colors[base1 + 2] = BG_B + (cb - BG_B) * 0.15;

        colors[base1 + 3] = BG_R + (cr - BG_R) * 0.92;
        colors[base1 + 4] = BG_G + (cg - BG_G) * 0.92;
        colors[base1 + 5] = BG_B + (cb - BG_B) * 0.92;

        // Segment 2: Intense laser head (tMid -> tHead) at 100% saturation
        const base2 = (vIdx + 2) * 3;
        positions[base2] = midX;
        positions[base2 + 1] = midY;
        positions[base2 + 2] = midZ;
        positions[base2 + 3] = headX;
        positions[base2 + 4] = headY;
        positions[base2 + 5] = headZ;

        colors[base2] = cr;
        colors[base2 + 1] = cg;
        colors[base2 + 2] = cb;

        colors[base2 + 3] = cr;
        colors[base2 + 4] = cg;
        colors[base2 + 5] = cb;

        vIdx += 4;
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
    this.linePackets = [];
    this.activeLinkCount = 0;
    this.activeGrabCount = 0;
  }
}
