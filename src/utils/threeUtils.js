/**
 * Shared Three.js Disposal Utilities
 * Enforces memory cleanup standards per CODING_STANDARDS.md §7
 */

/**
 * Recursively disposes geometries, materials, and textures for any Three.js Object3D hierarchy
 * Ensures all texture slots (map, normalMap, roughnessMap, metalnessMap, aoMap, etc.) are freed
 * deduplicating shared textures.
 * @param {THREE.Object3D|null} object3D
 */
export function disposeThreeObject(object3D) {
  if (!object3D || typeof object3D.traverse !== 'function') return;

  const disposedTextures = new Set();

  object3D.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (!m) continue;

        // Inspect and dispose all texture-valued slots on the material
        for (const key of Object.keys(m)) {
          const value = m[key];
          if (
            value &&
            typeof value.dispose === 'function' &&
            (value.isTexture || key.toLowerCase().includes('map'))
          ) {
            if (!disposedTextures.has(value)) {
              disposedTextures.add(value);
              value.dispose();
            }
          }
        }

        if (typeof m.dispose === 'function') {
          m.dispose();
        }
      }
    }
  });
}
