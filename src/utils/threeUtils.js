import * as THREE from 'three';

/**
 * Shared Three.js Disposal & Warmup Utilities
 * Enforces memory cleanup and stutter-free stage preparation per CODING_STANDARDS.md §7
 */

const TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'bumpMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
];

/**
 * Resolves a safe GPU anisotropic filtering level clamped to `maxLimit`,
 * falling back cleanly when renderer capabilities are unavailable.
 * @param {THREE.WebGLRenderer|null} renderer
 * @param {number} maxLimit
 * @param {number} fallback
 * @returns {number}
 */
export function resolveMaxAnisotropy(renderer, maxLimit = 16, fallback = 4) {
  const cap = renderer?.capabilities?.getMaxAnisotropy?.();
  return Number.isFinite(cap) && cap > 0 ? Math.min(maxLimit, cap) : fallback;
}

/**
 * Applies uniform anisotropic filtering across all texture maps on an Object3D hierarchy
 * so oblique surfaces (floors, walls, angled screens) stay sharp without extra file size.
 * @param {THREE.Object3D|null} object3D
 * @param {number} maxAnisotropy
 */
export function applySceneAnisotropy(object3D, maxAnisotropy = 8) {
  if (!object3D || typeof object3D.traverse !== 'function') return;
  const targetAnisotropy = Math.max(1, maxAnisotropy);
  const visited = new Set();

  object3D.traverse((child) => {
    if (!child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat) continue;
      for (const slot of TEXTURE_SLOTS) {
        const tex = mat[slot];
        if (tex && tex.isTexture && !visited.has(tex)) {
          visited.add(tex);
          if ((tex.anisotropy || 1) < targetAnisotropy) {
            tex.anisotropy = targetAnisotropy;
            tex.needsUpdate = true;
          }
        }
      }
    }
  });
}

/**
 * Performs a 32x32 scissored render pass to upload textures and shaders to VRAM
 * during loading without disturbing the visible framebuffer.
 * @param {THREE.WebGLRenderer|null} renderer
 * @param {THREE.Scene|null} scene
 * @param {THREE.Camera|null} camera
 */
export function prewarmSceneStage(renderer, scene, camera) {
  if (
    !renderer ||
    !scene ||
    !camera ||
    typeof renderer.render !== 'function' ||
    typeof renderer.getViewport !== 'function' ||
    typeof renderer.getScissor !== 'function' ||
    typeof renderer.getScissorTest !== 'function'
  ) {
    return;
  }

  const viewport = renderer.getViewport(new THREE.Vector4());
  const scissor = renderer.getScissor(new THREE.Vector4());
  const scissorTest = renderer.getScissorTest();
  try {
    renderer.setViewport(0, 0, 32, 32);
    renderer.setScissor(0, 0, 32, 32);
    renderer.setScissorTest(true);
    renderer.render(scene, camera);
  } finally {
    renderer.setViewport(viewport);
    renderer.setScissor(scissor);
    renderer.setScissorTest(scissorTest);
  }
}

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
