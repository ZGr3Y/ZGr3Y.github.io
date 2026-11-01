import * as THREE from 'three';

/**
 * SpringPhysicsEngine - High-performance spring-damper physics engine
 * Calculates elastic Hooke restoring forces, kinetic damping, and localized pointer repulsion.
 */
export class SpringPhysicsEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.stiffness=0.12] - Spring restoration coefficient
   * @param {number} [options.damping=0.85] - Kinetic velocity retention factor [0.0 - 1.0]
   * @param {number} [options.repulsionRadius=3.5] - Maximum interaction radius around pointer
   * @param {number} [options.repulsionForce=2.0] - Maximum repulsion strength at zero distance
   */
  constructor({
    stiffness = 0.12,
    damping = 0.85,
    repulsionRadius = 3.5,
    repulsionForce = 2.0
  } = {}) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.repulsionRadius = repulsionRadius;
    this.repulsionForce = repulsionForce;

    // Preallocated internal scratch vectors to avoid garbage collection allocations
    this._deltaDisp = new THREE.Vector3();
    this._deltaPtr = new THREE.Vector3();
  }

  /**
   * Advances the physical simulation for all nodes by delta time
   * @param {Array<Object>} nodes - Array of nodes with position, basePosition, and velocity Vector3s
   * @param {THREE.Vector3|null} pointerWorldPos - 3D world coordinates of pointer influence (or null)
   * @param {number} [delta=0.016] - Frame delta time in seconds
   */
  update(nodes, pointerWorldPos = null, delta = 0.016) {
    if (!nodes || nodes.length === 0) return;

    const timeScale = delta > 0 ? (delta / 0.016) : 1.0;
    const effectiveDamping = Math.pow(this.damping, timeScale);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node.position || !node.basePosition) continue;

      if (!node.velocity) {
        node.velocity = new THREE.Vector3(0, 0, 0);
      }

      // 1. Spring restoring force towards basePosition (Hooke's Law: F = -k * x)
      const dispX = node.position.x - node.basePosition.x;
      const dispY = node.position.y - node.basePosition.y;
      const dispZ = node.position.z - node.basePosition.z;

      let forceX = -this.stiffness * dispX;
      let forceY = -this.stiffness * dispY;
      let forceZ = -this.stiffness * dispZ;

      // 2. Localized elastic pointer repulsion
      if (pointerWorldPos) {
        const dx = node.position.x - pointerWorldPos.x;
        const dy = node.position.y - pointerWorldPos.y;
        const dz = node.position.z - pointerWorldPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < this.repulsionRadius * this.repulsionRadius && distSq > 0.000001) {
          const dist = Math.sqrt(distSq);
          const factor = (1.0 - (dist / this.repulsionRadius)) * this.repulsionForce;

          forceX += (dx / dist) * factor;
          forceY += (dy / dist) * factor;
          forceZ += (dz / dist) * factor;
        }
      }

      // 3. Integrate forces into velocity with damping
      node.velocity.x = (node.velocity.x + forceX * timeScale) * effectiveDamping;
      node.velocity.y = (node.velocity.y + forceY * timeScale) * effectiveDamping;
      node.velocity.z = (node.velocity.z + forceZ * timeScale) * effectiveDamping;

      // 4. Update position
      node.position.x += node.velocity.x * timeScale;
      node.position.y += node.velocity.y * timeScale;
      node.position.z += node.velocity.z * timeScale;

      // Numerical precision settling snap
      if (!pointerWorldPos) {
        const currentDispSq = dispX * dispX + dispY * dispY + dispZ * dispZ;
        const currentVelSq = node.velocity.lengthSq();
        if (currentDispSq < 0.0001 && currentVelSq < 0.0001) {
          node.position.copy(node.basePosition);
          node.velocity.set(0, 0, 0);
        }
      }
    }
  }

  /**
   * Returns whether all nodes have settled into equilibrium with near-zero kinetic energy
   * @param {Array<Object>} nodes - Array of physical nodes
   * @param {number} [tolerance=0.001] - Kinetic and displacement energy threshold
   * @returns {boolean}
   */
  isResting(nodes, tolerance = 0.001) {
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
    this._deltaDisp = null;
    this._deltaPtr = null;
  }
}
