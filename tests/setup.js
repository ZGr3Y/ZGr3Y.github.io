import { beforeEach, vi } from 'vitest';
import { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Unit tests supply their own models; real GLB downloads belong to browser checks.
beforeEach(() => {
  vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(async () => ({
    scene: new Group(),
    animations: []
  }));
});
