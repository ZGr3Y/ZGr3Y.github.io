import * as THREE from 'three';
import { SURVEILLANCE_TECHS, drawMonitorScreenCanvas } from './surveillanceCatalog.js';

const SCREEN_MIN_DIM = 0.3;
const ROW_Y_THRESHOLD = 0.35;
const VIEWER_ANCHOR = new THREE.Vector3(0, -0.5, 2.0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

function findComponentGroups(vertexCount, indexArray) {
  const parent = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;

  const find = x => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  };

  for (let i = 0; i < indexArray.length; i += 3) {
    const a = indexArray[i];
    const b = indexArray[i + 1];
    const c = indexArray[i + 2];
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
    const rc = find(c);
    if (ra !== rc) parent[rc] = ra;
  }

  const components = new Map();
  for (let i = 0; i < indexArray.length; i += 3) {
    const root = find(indexArray[i]);
    let entry = components.get(root);
    if (!entry) {
      entry = { tris: [], vertSet: new Set() };
      components.set(root, entry);
    }
    const a = indexArray[i];
    const b = indexArray[i + 1];
    const c = indexArray[i + 2];
    entry.tris.push(a, b, c);
    entry.vertSet.add(a);
    entry.vertSet.add(b);
    entry.vertSet.add(c);
  }
  return components;
}

function buildScreenGeometry(entry, posAttr, toRoomMat, roomToLocalMat) {
  const uniqueVerts = Array.from(entry.vertSet);
  const remap = new Map();
  uniqueVerts.forEach((vIdx, localIdx) => remap.set(vIdx, localIdx));

  const roomPoints = new Array(uniqueVerts.length);
  const avgNormal = new THREE.Vector3();
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const pc = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  let lcx = 0;
  let lcy = 0;
  let lcz = 0;

  for (let i = 0; i < uniqueVerts.length; i++) {
    const vIdx = uniqueVerts[i];
    const lx = posAttr.getX(vIdx);
    const ly = posAttr.getY(vIdx);
    const lz = posAttr.getZ(vIdx);
    lcx += lx;
    lcy += ly;
    lcz += lz;
    roomPoints[i] = new THREE.Vector3(lx, ly, lz).applyMatrix4(toRoomMat);
  }
  lcx /= uniqueVerts.length;
  lcy /= uniqueVerts.length;
  lcz /= uniqueVerts.length;

  for (let i = 0; i < entry.tris.length; i += 3) {
    pa.copy(roomPoints[remap.get(entry.tris[i])]);
    pb.copy(roomPoints[remap.get(entry.tris[i + 1])]);
    pc.copy(roomPoints[remap.get(entry.tris[i + 2])]);
    ab.subVectors(pb, pa);
    ac.subVectors(pc, pa);
    cross.crossVectors(ab, ac);
    avgNormal.add(cross);
  }
  if (avgNormal.lengthSq() < 1e-10) avgNormal.set(0, 0, 1);
  avgNormal.normalize();

  const toViewer = VIEWER_ANCHOR.clone().sub(entry.center);
  if (avgNormal.dot(toViewer) < 0) avgNormal.negate();

  const right = new THREE.Vector3().crossVectors(WORLD_UP, avgNormal);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new THREE.Vector3().crossVectors(avgNormal, right).normalize();

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  const rel = new THREE.Vector3();

  for (const pt of roomPoints) {
    rel.subVectors(pt, entry.center);
    const u = rel.dot(right);
    const v = rel.dot(up);
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  const spanU = Math.max(1e-4, maxU - minU);
  const spanV = Math.max(1e-4, maxV - minV);

  const positions = new Float32Array(uniqueVerts.length * 3);
  const uvs = new Float32Array(uniqueVerts.length * 2);

  for (let i = 0; i < uniqueVerts.length; i++) {
    const vIdx = uniqueVerts[i];
    positions[i * 3] = posAttr.getX(vIdx) - lcx;
    positions[i * 3 + 1] = posAttr.getY(vIdx) - lcy;
    positions[i * 3 + 2] = posAttr.getZ(vIdx) - lcz;

    rel.subVectors(roomPoints[i], entry.center);
    uvs[i * 2] = (rel.dot(right) - minU) / spanU;
    uvs[i * 2 + 1] = (rel.dot(up) - minV) / spanV;
  }

  const indices = new Uint16Array(entry.tris.length);
  for (let i = 0; i < entry.tris.length; i++) {
    indices[i] = remap.get(entry.tris[i]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  const verticalBias = Math.max(0, -avgNormal.y - 0.58) * 0.44;
  const localNormal = avgNormal.clone().transformDirection(roomToLocalMat).normalize();
  return {
    geometry: geo,
    verticalBias,
    localCenter: new THREE.Vector3(lcx, lcy, lcz),
    localNormal,
  };
}

function createScreenTexture(tech, index, maxAnisotropy, verticalBias = 0) {
  if (typeof document === 'undefined') return { texture: null, canvas: null };
  const canvas = document.createElement('canvas');
  drawMonitorScreenCanvas(canvas, tech, index, { verticalBias, active: false });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (maxAnisotropy > 1) texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return { texture, canvas };
}

/**
 * Redraws a single CRT screen texture between resting and active hover states.
 */
export function setScreenActiveVisual(screenMesh, active) {
  const data = screenMesh?.userData;
  if (!data || data.isActive === Boolean(active)) return;
  data.isActive = Boolean(active);
  if (!data.canvas || !screenMesh.material?.map) return;
  drawMonitorScreenCanvas(data.canvas, data.tech, data.techIndex, {
    verticalBias: data.verticalBias,
    active: data.isActive,
  });
  screenMesh.material.map.needsUpdate = true;
}

/**
 * Splits the 28 CRT monitor screen faces out of the GLB `Lumires` mesh (`Object_13`)
 * and binds a crisp technology CanvasTexture onto each curved CRT dome.
 * Keeps `AssetLibrary` source geometries immutable by cloning before updating the LED index buffer.
 */
export function mountSurveillanceScreens({ roomPivot, roomInstance, maxAnisotropy = 4, layer = 0 } = {}) {
  const disposables = [];
  const screens = [];

  if (!roomPivot || !roomInstance) {
    return { screens, dispose: () => {} };
  }

  let lumiresMesh = null;
  roomInstance.traverse(child => {
    if (!lumiresMesh && child.isMesh && (child.name === 'Object_13' || child.material?.name === 'Lumires')) {
      lumiresMesh = child;
    }
  });

  if (!lumiresMesh || !lumiresMesh.geometry) {
    return { screens, dispose: () => {} };
  }

  roomPivot.updateMatrixWorld(true);
  const toRoomMat = new THREE.Matrix4().copy(roomPivot.matrixWorld).invert().multiply(lumiresMesh.matrixWorld);
  const roomToLocalMat = new THREE.Matrix4().copy(toRoomMat).invert();
  const baseGeo = lumiresMesh.geometry;
  const posAttr = baseGeo.getAttribute('position') || baseGeo.getAttribute('POSITION');
  if (!posAttr) {
    return { screens, dispose: () => {} };
  }

  const indexAttr = baseGeo.getIndex();
  const indexArray = indexAttr ? indexAttr.array : Array.from({ length: posAttr.count }, (_, i) => i);

  const components = findComponentGroups(posAttr.count, indexArray);
  const screenEntries = [];
  const ledIndices = [];
  const pt = new THREE.Vector3();
  const box = new THREE.Box3();
  const size = new THREE.Vector3();

  for (const comp of components.values()) {
    box.makeEmpty();
    for (const vIdx of comp.vertSet) {
      pt.set(posAttr.getX(vIdx), posAttr.getY(vIdx), posAttr.getZ(vIdx)).applyMatrix4(toRoomMat);
      box.expandByPoint(pt);
    }
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim >= SCREEN_MIN_DIM && comp.tris.length >= 18) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      screenEntries.push({ ...comp, center });
    } else {
      for (let i = 0; i < comp.tris.length; i++) {
        ledIndices.push(comp.tris[i]);
      }
    }
  }

  if (screenEntries.length === 0) {
    return { screens, dispose: () => {} };
  }

  // Sort into 4 rows (top-to-bottom) × 7 columns (left-to-right)
  screenEntries.sort((a, b) => {
    if (Math.abs(b.center.y - a.center.y) > ROW_Y_THRESHOLD) {
      return b.center.y - a.center.y;
    }
    return a.center.x - b.center.x;
  });

  // Replace Lumires mesh geometry with a cloned LED-only index buffer so cached asset stays untouched
  const ledGeo = baseGeo.clone();
  ledGeo.setIndex(ledIndices);
  lumiresMesh.geometry = ledGeo;
  disposables.push(ledGeo);

  screenEntries.forEach((entry, idx) => {
    const tech = SURVEILLANCE_TECHS[idx % SURVEILLANCE_TECHS.length];
    const {
      geometry: screenGeo,
      verticalBias,
      localCenter,
      localNormal,
    } = buildScreenGeometry(entry, posAttr, toRoomMat, roomToLocalMat);
    screenGeo.computeBoundingBox();
    screenGeo.computeBoundingSphere();

    const { texture, canvas } = createScreenTexture(tech, idx, maxAnisotropy, verticalBias);
    const screenMat = new THREE.MeshBasicMaterial({
      map: texture,
      color: texture ? 0xffffff : 0xf4f1d2,
      side: THREE.DoubleSide,
    });

    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.name = `SurveillanceScreen_${tech.id}`;
    screenMesh.position.copy(localCenter);
    screenMesh.layers.set(layer);
    screenMesh.frustumCulled = false;
    screenMesh.userData.techIndex = idx;
    screenMesh.userData.techId = tech.id;
    screenMesh.userData.tech = tech;
    screenMesh.userData.verticalBias = verticalBias;
    screenMesh.userData.canvas = canvas;
    screenMesh.userData.restPosition = localCenter.clone();
    screenMesh.userData.localNormal = localNormal;
    screenMesh.userData.hoverAmount = 0;
    screenMesh.userData.isActive = false;

    lumiresMesh.add(screenMesh);
    screens.push(screenMesh);
    disposables.push(screenGeo, screenMat);
    if (texture) disposables.push(texture);
  });

  return {
    screens,
    dispose() {
      for (const mesh of screens) {
        mesh.parent?.remove(mesh);
      }
      for (const res of disposables) {
        res?.dispose?.();
      }
    },
  };
}
