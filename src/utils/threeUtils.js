/**
 * Shared Three.js Disposal Utilities
 * Enforces memory cleanup standards per CODING_STANDARDS.md §7
 */

/**
 * Recursively disposes geometries, materials, and textures for any Three.js Object3D hierarchy
 * @param {THREE.Object3D|null} object3D
 */
export function disposeThreeObject(object3D) {
  if (!object3D || typeof object3D.traverse !== 'function') return;

  object3D.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m.map && typeof m.map.dispose === 'function') {
          m.map.dispose();
        }
        if (typeof m.dispose === 'function') {
          m.dispose();
        }
      }
    }
  });
}
