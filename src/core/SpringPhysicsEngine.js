import * as THREE from 'three';

/**
 * SpringPhysicsEngine - Cosmic Gravitational Well & Fluid Orbital Physics
 * Simulates soft gravitational attraction, tangential orbital swirl, and silky Hooke restoring forces.
 */
export class SpringPhysicsEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.stiffness=12.0] - Elastic Hooke restoration coefficient
   * @param {number} [options.damping=0.88] - Viscous fluid momentum factor [0.0 - 1.0]
   * @param {number} [options.attractionRadius=6.0] - Maximum gravitational interaction radius
   * @param {number} [options.attractionForce=15.0] - Gravitational pull intensity
   * @param {number} [options.orbitalSwirl=2.5] - Subtle tangential slingshot swirl factor
   * @param {number} [options.coreRadius=0.75] - Inner cushion preventing particle collapse
   */
  constructor({
    stiffness = 12.0,
    damping = 0.88,
    attractionRadius = 6.0,
    attractionForce = 15.0,
    orbitalSwirl = 2.5,
    coreRadius = 0.75
  } = {}) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.attractionRadius = attractionRadius;
    this.attractionForce = attractionForce;
    this.orbitalSwirl = orbitalSwirl;
    this.coreRadius = coreRadius;
  }

  /**
   * Advances the physical simulation for all nodes by delta time
   * @param {Array<Object>} nodes - Array of nodes with position, basePosition, and velocity Vector3s
   * @param {THREE.Vector3|null} pointerWorldPos - 3D world coordinates of gravitational center (or null)
   * @param {number} [delta=0.016] - Frame delta time in seconds
   */
  update(nodes, pointerWorldPos = null, delta = 0.016) {
    if (!nodes || nodes.length === 0) return;

    const timeScale = delta > 0 ? (delta * 60) : 1.0;
    const effectiveDamping = Math.pow(this.damping, timeScale);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.position || !node.basePosition) continue;

      if (!node.velocity) {
        node.velocity = new THREE.Vector3(0, 0, 0);
      }

      // 1. Restoring force towards basePosition (Hooke's Law: F = -k * x)
      const dispX = node.position.x - node.basePosition.x;
      const dispY = node.position.y - node.basePosition.y;
      const dispZ = node.position.z - node.basePosition.z;

      let forceX = -this.stiffness * dispX;
      let forceY = -this.stiffness * dispY;
      let forceZ = -this.stiffness * dispZ;

      // 2. Gravitational Well Attraction & Orbital Slingshot Swirl
      if (pointerWorldPos) {
        const toPtrX = pointerWorldPos.x - node.position.x;
        const toPtrY = pointerWorldPos.y - node.position.y;
        const toPtrZ = pointerWorldPos.z - node.position.z;
        const distSq = toPtrX * toPtrX + toPtrY * toPtrY + toPtrZ * toPtrZ;

        if (distSq < this.attractionRadius * this.attractionRadius && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const normDist = dist / this.attractionRadius;

          // Smooth quadratic falloff curve: seamless across boundaries
          const falloff = (1.0 - normDist) * (1.0 - normDist);

          if (dist > this.coreRadius) {
            // Gravitational Pull towards cursor
            const pullFactor = (this.attractionForce * falloff) / dist;
            forceX += toPtrX * pullFactor;
            forceY += toPtrY * pullFactor;
            forceZ += toPtrZ * pullFactor;

            // Subtle tangential orbital curl
            if (this.orbitalSwirl > 0) {
              const swirlFactor = (this.orbitalSwirl * falloff) / dist;
              forceX += -toPtrY * swirlFactor;
              forceY += toPtrX * swirlFactor;
            }
          } else {
            // Soft inner cushion buffer: prevents nodes from collapsing into the cursor center
            const pushFactor = ((this.coreRadius - dist) / this.coreRadius) * this.attractionForce * 1.5;
            forceX -= (toPtrX / dist) * pushFactor;
            forceY -= (toPtrY / dist) * pushFactor;
            forceZ -= (toPtrZ / dist) * pushFactor;
          }
        }
      }

      // 3. Integrate forces into velocity with fluid damping
      node.velocity.x = (node.velocity.x + forceX * timeScale) * effectiveDamping;
      node.velocity.y = (node.velocity.y + forceY * timeScale) * effectiveDamping;
      node.velocity.z = (node.velocity.z + forceZ * timeScale) * effectiveDamping;

      // 4. Update position scaled by delta
      node.position.x += node.velocity.x * delta;
      node.position.y += node.velocity.y * delta;
      node.position.z += node.velocity.z * delta;

      // Precision settling snap when forces and velocities are near zero
      if (!pointerWorldPos) {
        const currentDispSq = dispX * dispX + dispY * dispY + dispZ * dispZ;
        const currentVelSq = node.velocity.lengthSq();
        if (currentDispSq < 0.0025 && currentVelSq < 0.0025) {
          node.position.copy(node.basePosition);
          node.velocity.set(0, 0, 0);
        }
      }
    }
  }

  /**
   * Returns whether all nodes have settled into equilibrium with near-zero kinetic energy
   * @param {Array<Object>} nodes - Array of physical nodes
   * @param {number} [tolerance=0.01] - Kinetic and displacement energy threshold
   * @returns {boolean}
   */
  isResting(nodes, tolerance = 0.01) {
    if (!nodes || nodes.length === 0) return true;

    const tolSq = tolerance * tolerance;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.position || !node.basePosition) continue;

      const dx = node.position.x - node.basePosition.x;
      const dy = node.position.y - node.basePosition.y;
      const dz = node.position.z - node.basePosition.z;
      const dispSq = dx * dx + dy * dy + dz * dz;

      if (dispSq > tolSq) return false;

      if (node.velocity) {
        const velSq = node.velocity.lengthSq();
        if (velSq > tolSq) return false;
      }
    }

    return true;
  }

  /**
   * Cleanup method in accordance with Coding Standard #7
   */
  dispose() {
    // Stateless physics engine cleanup
  }
}
