import * as THREE from 'three';

/**
 * Procedural Deep Space Starfield & Chromatic Cosmic Dust
 */
export function createStarfield({ count = 2500, range = 300 } = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const palette = [
    new THREE.Color(0x00f0ff), // Cyan
    new THREE.Color(0x8b5cf6), // Violet
    new THREE.Color(0x38bdf8), // Sky Blue
    new THREE.Color(0xffffff), // White photon
    new THREE.Color(0xf59e0b)  // Amber flare
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * range;
    positions[i3 + 1] = (Math.random() - 0.5) * range;
    positions[i3 + 2] = (Math.random() - 0.5) * range;

    const chosenColor = palette[Math.floor(Math.random() * palette.length)];
    colors[i3] = chosenColor.r;
    colors[i3 + 1] = chosenColor.g;
    colors[i3 + 2] = chosenColor.b;

    sizes[i] = Math.random() * 2.2 + 0.6;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Procedural circular soft point sprite
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(0.7, 'rgba(0, 240, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    size: 2.5,
    vertexColors: true,
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);

  return {
    mesh: points,
    update(time, cameraDelta) {
      // Subtle cosmic drift
      points.rotation.y = time * 0.015;
      points.rotation.x = time * 0.008;
    },
    destroy() {
      geometry.dispose();
      texture.dispose();
      material.dispose();
    }
  };
}
