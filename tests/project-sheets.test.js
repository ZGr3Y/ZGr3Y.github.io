import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { metalSheetMaps } from '../src/acts/UnicornSurface.js';
import { createUnicornOpening } from '../src/acts/UnicornOpening.js';

describe('project sheet texture loading', () => {
  it.each([0, 1, 2])('loads precomputed maps asynchronously for sheet %i', async variant => {
    const pending = [];
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    const normal = new THREE.Texture(), roughness = new THREE.Texture();
    try {
      const result = metalSheetMaps(variant);
      expect(result).toBeInstanceOf(Promise);
      expect(load.mock.calls.map(([url]) => url)).toEqual([
        `./textures/project-sheets/${variant}-normal.webp`,
        `./textures/project-sheets/${variant}-roughness.webp`,
      ]);
      let ready = false;
      result.then(() => { ready = true; });
      pending[0](normal);
      await Promise.resolve();
      expect(ready).toBe(false);
      pending[1](roughness);
      expect(await result).toEqual({ normal, roughness });
      expect(normal.channel).toBe(1);
      expect(roughness.channel).toBe(1);
    } finally {
      load.mockRestore(); normal.dispose(); roughness.dispose();
    }
  });

  it.each([0, 1, 2])('ships precomputed normal and roughness webp assets for sheet %i in public/', variant => {
    const texturesDir = path.resolve(process.cwd(), 'public/textures/project-sheets');
    for (const kind of ['normal', 'roughness']) {
      const filePath = path.join(texturesDir, `${variant}-${kind}.webp`);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.statSync(filePath).size).toBeGreaterThan(0);
    }
  });
});

describe('UnicornOpening geometry & folding math', () => {
  it('poses fragments from 0 to 1 without NaN vertices/normals, restores original geometry at 0, and disposes cleanly', () => {
    const front = new THREE.MeshStandardMaterial({ side: THREE.FrontSide });
    const paper = new THREE.MeshStandardMaterial({ side: THREE.BackSide });
    const rig = createUnicornOpening(front, paper);

    try {
      const meshes = [];
      rig.root.traverse(obj => {
        if (obj.isMesh) meshes.push(obj);
      });
      expect(meshes.length).toBeGreaterThan(0);

      // Snapshot original geometry positions at progress 0
      rig.pose(0);
      const originalPositions = meshes.map(m => Float32Array.from(m.geometry.attributes.position.array));

      for (const progress of [0.25, 0.5, 0.85, 1]) {
        rig.pose(progress);
        for (const mesh of meshes) {
          for (const attrName of ['position', 'normal']) {
            const arr = mesh.geometry.attributes[attrName].array;
            for (let i = 0; i < arr.length; i++) {
              expect(Number.isFinite(arr[i])).toBe(true);
            }
          }
        }
      }

      // Returning to 0 restores exact un-tessellated starting vertex buffers
      rig.pose(0);
      meshes.forEach((mesh, idx) => {
        expect(mesh.geometry.attributes.position.array).toEqual(originalPositions[idx]);
      });
    } finally {
      rig.dispose();
      const disposed = new Set();
      rig.root.traverse(obj => {
        if (obj.geometry && !disposed.has(obj.geometry)) {
          disposed.add(obj.geometry);
          obj.geometry.dispose();
        }
      });
      front.dispose();
      paper.dispose();
    }
  });
});
