import * as THREE from 'three';

function addStudioCard(room, position, size, intensity) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(...size),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(intensity, intensity, intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  );
  mesh.position.set(...position);
  mesh.lookAt(0, 0.5, 0);
  room.add(mesh);
}

export function foilStudio({ cinematic = false } = {}) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0.065, 0.08, 0.095);

  if (cinematic) {
    room.background.setRGB(0.018, 0.022, 0.028);
    addStudioCard(room, [-3.5, 3, 5], [3.2, 5.8], 3.2);
    addStudioCard(room, [4, 1, 3], [0.65, 5], 4.8);
    addStudioCard(room, [1.5, 3, -4], [1.1, 5], 5.2);
    addStudioCard(room, [0, 6, 0.5], [5, 2], 2.0);
    addStudioCard(room, [-2, -3, 2], [4, 1], 0.7);
    addStudioCard(room, [0.5, 1, 6], [3, 4], 0.9);
    return room;
  }

  addStudioCard(room, [-2.2, 1.5, 5], [2.4, 6], 3.5);
  addStudioCard(room, [4, 1, 3], [0.8, 5.5], 6);
  addStudioCard(room, [0, 6, 1], [5, 2.5], 2.5);
  addStudioCard(room, [-2, 1, -5], [4, 1.8], 3);
  addStudioCard(room, [6, 1, 0.5], [1.2, 6], 1.2);
  addStudioCard(room, [-6, 1, 1], [2, 6], 1);
  addStudioCard(room, [0, -4.5, 3], [8, 4], 2);
  addStudioCard(room, [1, 0.2, 5.5], [3, 5], 1.4);
  addStudioCard(room, [1.1, -0.5, 4.5], [0.22, 5], 0.004);
  return room;
}

export function paperGrain() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  let seed = 34;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Fine connected crease ridges, rather than independent television noise.
  for (let i = 0; i < 155; i++) {
    const x = random() * size;
    const y = random() * size;
    const length = 8 + random() * 48;
    const angle = random() * Math.PI * 2;
    const dx = Math.cos(angle) * length;
    const dy = Math.sin(angle) * length;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.strokeStyle = i % 2 ? '#8c8c8c' : '#737373';
    ctx.lineWidth = 0.6 + random() * 0.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 1, y + 1);
    ctx.lineTo(x + dx + 1, y + dy + 1);
    ctx.strokeStyle = i % 2 ? '#777777' : '#888888';
    ctx.lineWidth = 0.65;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.7, 2.3);
  return texture;
}

async function loadNormalRoughnessPair(normalUrl, roughnessUrl, channel = null) {
  const loader = new THREE.TextureLoader();
  const [normal, roughness] = await Promise.all([
    loader.loadAsync(normalUrl),
    loader.loadAsync(roughnessUrl),
  ]);
  if (channel !== null) {
    normal.channel = channel;
    roughness.channel = channel;
  }
  return { normal, roughness };
}

/** Precomputed foil relief maps keep expensive Sobel generation off the startup thread. */
export async function referenceFoilMaps() {
  return loadNormalRoughnessPair(
    './textures/unicorn-reference-normal.webp',
    './textures/unicorn-reference-roughness.webp',
  );
}

/** Precomputed data maps keep expensive relief generation off the startup thread. */
export async function metalSheetMaps(variant = 0) {
  return loadNormalRoughnessPair(
    `./textures/project-sheets/${variant}-normal.webp`,
    `./textures/project-sheets/${variant}-roughness.webp`,
    1,
  );
}

/** Disposes geometries, materials, shadow targets, and unique textures under a Three.js subtree. */
export function disposeTree(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach(material => materials.add(material));
    }
    if (object.shadow) object.shadow.dispose();
  });

  materials.forEach(material => {
    Object.values(material).forEach(value => {
      if (value?.isTexture) textures.add(value);
    });
    material.dispose();
  });

  geometries.forEach(geometry => geometry.dispose());
  textures.forEach(texture => texture.dispose());

  return { geometries, materials, textures };
}
