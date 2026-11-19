export const NORMAL_ROUGHNESS_WEBP_OPTIONS = {
  quality: 92,
  effort: 6,
  smartSubsample: true,
};

/**
 * Packs tangent-space normal slopes (nx, ny) and scalar roughness into two RGBA pixel buffers.
 */
export function writeNormalRoughnessPixel(normalData, roughData, pixelOffset, nx, ny, roughValue) {
  const length = Math.hypot(nx, ny, 1);
  normalData[pixelOffset] = 128 + (127 * nx) / length;
  normalData[pixelOffset + 1] = 128 + (127 * ny) / length;
  normalData[pixelOffset + 2] = 128 + 127 / length;
  normalData[pixelOffset + 3] = 255;

  roughData[pixelOffset] = roughValue;
  roughData[pixelOffset + 1] = roughValue;
  roughData[pixelOffset + 2] = roughValue;
  roughData[pixelOffset + 3] = 255;
}
