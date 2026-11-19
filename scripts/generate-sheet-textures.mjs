import * as THREE from 'three';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NORMAL_ROUGHNESS_WEBP_OPTIONS, writeNormalRoughnessPixel } from './lib/packNormalRoughness.mjs';

const SHEET_SIZE = 2048;
const SHEET_COUNT = 3;
const captures = [];

globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (width, height) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      }),
      putImageData(image) {
        captures.push(image);
      },
    }),
  }),
};

function createRng(seedValue) {
  let seed = seedValue >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/**
 * Generates dedicated full-sheet normal & roughness relief maps
 * independent of the smaller unicorn reference texture.
 */
export function metalSheetMaps(variant = 0) {
  const height = new Float32Array(SHEET_SIZE * SHEET_SIZE);
  const random = createRng(9127 + variant * 104729);
  const creases = Array.from({ length: 15 + variant * 2 }, () => {
    const angle = random() * Math.PI;
    return {
      x: random(),
      y: random(),
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      invWidthSq: 1 / (0.001 + random() * 0.001) ** 2,
      invLengthSq: 1 / (0.12 + random() * 0.22) ** 2,
    };
  });
  const brushed = Float32Array.from({ length: SHEET_SIZE }, () => (random() - 0.5) * 0.0015);

  for (let y = 0; y < SHEET_SIZE; y++) {
    const v = y / SHEET_SIZE;
    const rowBrush = brushed[y];
    const rowOffset = y * SHEET_SIZE;
    for (let x = 0; x < SHEET_SIZE; x++) {
      const u = x / SHEET_SIZE;
      let relief = rowBrush + (random() - 0.5) * 0.001;
      for (const crease of creases) {
        const dx = u - crease.x;
        const dy = v - crease.y;
        const across = dx * crease.cos + dy * crease.sin;
        const along = -dx * crease.sin + dy * crease.cos;
        relief +=
          0.021 * Math.exp(-across * across * crease.invWidthSq - along * along * crease.invLengthSq);
      }
      height[rowOffset + x] = relief;
    }
  }

  const normalCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = roughCanvas.width = roughCanvas.height = SHEET_SIZE;

  const normalCtx = normalCanvas.getContext('2d');
  const roughCtx = roughCanvas.getContext('2d');
  const normal = normalCtx.createImageData(SHEET_SIZE, SHEET_SIZE);
  const rough = roughCtx.createImageData(SHEET_SIZE, SHEET_SIZE);

  const sampleHeight = (x, y) => {
    const cx = Math.max(0, Math.min(SHEET_SIZE - 1, x));
    const cy = Math.max(0, Math.min(SHEET_SIZE - 1, y));
    return height[cy * SHEET_SIZE + cx];
  };

  for (let y = 0; y < SHEET_SIZE; y++) {
    for (let x = 0; x < SHEET_SIZE; x++) {
      const nx = (sampleHeight(x - 1, y) - sampleHeight(x + 1, y)) * 40;
      const ny = (sampleHeight(x, y + 1) - sampleHeight(x, y - 1)) * 40;
      const idx = y * SHEET_SIZE + x;
      const roughValue = 170 + height[idx] * 400;
      writeNormalRoughnessPixel(normal.data, rough.data, idx * 4, nx, ny, roughValue);
    }
  }

  normalCtx.putImageData(normal, 0, 0);
  roughCtx.putImageData(rough, 0, 0);

  const maps = {
    normal: new THREE.CanvasTexture(normalCanvas),
    roughness: new THREE.CanvasTexture(roughCanvas),
  };
  for (const texture of Object.values(maps)) {
    texture.channel = 1;
  }
  return maps;
}

const outputDir = fileURLToPath(new URL('../public/textures/project-sheets/', import.meta.url));
await mkdir(outputDir, { recursive: true });

for (let index = 0; index < SHEET_COUNT; index++) {
  captures.length = 0;
  const maps = metalSheetMaps(index);
  for (const [i, type] of ['normal', 'roughness'].entries()) {
    const image = captures[i];
    await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } })
      .webp(NORMAL_ROUGHNESS_WEBP_OPTIONS)
      .toFile(`${outputDir}${index}-${type}.webp`);
  }
  Object.values(maps).forEach(texture => texture.dispose());
  console.log(`Generated sheet ${index}`);
}
