import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NORMAL_ROUGHNESS_WEBP_OPTIONS, writeNormalRoughnessPixel } from './lib/packNormalRoughness.mjs';

const texturesDir = fileURLToPath(new URL('../public/textures/', import.meta.url));
const unicornSourcePath = fileURLToPath(new URL('./assets/unicorn-reference.png', import.meta.url));

/**
 * Extracts high-frequency foil relief from the reference unicorn texture into
 * precomputed WebP normal and roughness maps.
 */
async function generateUnicornReferenceMaps() {
  if (!existsSync(unicornSourcePath)) {
    throw new Error(`Missing raw unicorn reference source asset at ${unicornSourcePath}`);
  }

  await mkdir(texturesDir, { recursive: true });
  const { data, info } = await sharp(unicornSourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const gray = new Float32Array(width * height);
  const integral = new Float64Array((width + 1) * (height + 1));
  const detail = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const offset = idx * 4;
      gray[idx] = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
      rowSum += gray[idx];
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + rowSum;
    }
  }

  const stride = width + 1;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - 3);
    const y1 = Math.min(height, y + 4);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - 3);
      const x1 = Math.min(width, x + 4);
      const sum =
        integral[y1 * stride + x1] -
        integral[y0 * stride + x1] -
        integral[y1 * stride + x0] +
        integral[y0 * stride + x0];
      const idx = y * width + x;
      detail[idx] = gray[idx] - sum / ((x1 - x0) * (y1 - y0));
    }
  }

  const normalData = new Uint8ClampedArray(width * height * 4);
  const roughData = new Uint8ClampedArray(width * height * 4);
  const sampleDetail = (x, y) =>
    detail[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = -(sampleDetail(x + 1, y) - sampleDetail(x - 1, y)) * 0.016;
      const ny = (sampleDetail(x, y + 1) - sampleDetail(x, y - 1)) * 0.016;
      const idx = y * width + x;
      const roughValue = 46 + (1 - gray[idx] / 255) * 35;
      writeNormalRoughnessPixel(normalData, roughData, idx * 4, nx, ny, roughValue);
    }
  }

  await sharp(normalData, { raw: { width, height, channels: 4 } })
    .webp(NORMAL_ROUGHNESS_WEBP_OPTIONS)
    .toFile(`${texturesDir}unicorn-reference-normal.webp`);
  await sharp(roughData, { raw: { width, height, channels: 4 } })
    .webp(NORMAL_ROUGHNESS_WEBP_OPTIONS)
    .toFile(`${texturesDir}unicorn-reference-roughness.webp`);
  console.log('Generated unicorn-reference normal/roughness WebP maps');
}

await generateUnicornReferenceMaps();
