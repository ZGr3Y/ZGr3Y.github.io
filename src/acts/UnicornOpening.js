/**
 * Fragmented origami unfolding choreography built from the sculpted unicorn geometry.
 * At progress 0, the original un-tessellated sculpture renders unchanged; as progress
 * advances to 1, 85 faceted fragments turn and assemble onto the open portrait sheet.
 */
import * as THREE from 'three';
import { createCinematicUnicorn, PAGE_WIDTH, PAGE_HEIGHT } from './CinematicUnicorn.js';
import { disposeTree } from './UnicornSurface.js';

export { PAGE_WIDTH, PAGE_HEIGHT };

const smooth = THREE.MathUtils.smoothstep;
const clamp = THREE.MathUtils.clamp;
const WIDTH = (PAGE_WIDTH - 0.012) / 2;
const SHIFT = WIDTH + 0.012;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const IDENTITY_MATRIX = new THREE.Matrix4();

const cross2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const hash = n => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function snapshot(record) {
  const mesh = record.meshes[0];
  const geometry = record.original;
  const p = geometry.attributes.position;
  const n = geometry.attributes.normal;
  const positions = new Float32Array(p.count * 3);
  const normals = new Float32Array(n.count * 3);

  if (mesh.matrixWorld.equals(IDENTITY_MATRIX)) {
    positions.set(p.array);
    normals.set(n.array);
  } else {
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const point = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const k = i * 3;
      point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      point.toArray(positions, k);
      point.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
      point.toArray(normals, k);
    }
  }

  return { positions, normals };
}

function splitPolygon(polygon, axis, value, positive) {
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = a[6 + axis] - value;
    const db = b[6 + axis] - value;

    if (positive ? da >= -1e-9 : da <= 1e-9) {
      result.push(a);
    }
    if (da * db < -1e-16) {
      const t = da / (da - db);
      result.push(a.map((v, j) => v + (b[j] - v) * t));
    }
  }
  return result;
}

function tessellate(record) {
  const g = record.original;
  const indices = g.index?.array || Array.from({ length: g.attributes.position.count }, (_, i) => i);
  const data = [];
  const lines = [];

  if (record.part !== 'horn') {
    const center = record.part === 'front' ? SHIFT / 2 : -SHIFT / 2;
    const left = center - WIDTH / 2;
    for (let i = 1; i < 6; i++) lines.push([0, left + (WIDTH * i) / 6]);
    for (let i = 1; i < 7; i++) lines.push([1, 0.32 - PAGE_HEIGHT / 2 + (PAGE_HEIGHT * i) / 7]);
  }

  const uvAttr = g.attributes.uv;
  const uv1Attr = g.attributes.uv1;
  const vertex = i => {
    const k = i * 3;
    return [
      record.start.positions[k], record.start.positions[k + 1], record.start.positions[k + 2],
      record.start.normals[k], record.start.normals[k + 1], record.start.normals[k + 2],
      record.end.positions[k], record.end.positions[k + 1], record.end.positions[k + 2],
      record.end.normals[k], record.end.normals[k + 1], record.end.normals[k + 2],
      uvAttr.getX(i), uvAttr.getY(i),
      uv1Attr ? uv1Attr.getX(i) : 0, uv1Attr ? uv1Attr.getY(i) : 0,
    ];
  };

  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    let polygons = [[vertex(indices[i]), vertex(indices[i + 1]), vertex(indices[i + 2])]];

    for (const [axis, value] of lines) {
      polygons = polygons.flatMap(polygon => {
        let minCoord = Infinity;
        let maxCoord = -Infinity;
        for (const p of polygon) {
          const coord = p[6 + axis];
          if (coord < minCoord) minCoord = coord;
          if (coord > maxCoord) maxCoord = coord;
        }
        if (minCoord >= value - 1e-9 || maxCoord <= value + 1e-9) return [polygon];
        return [splitPolygon(polygon, axis, value, true), splitPolygon(polygon, axis, value, false)].filter(
          p => p.length >= 3
        );
      });
    }

    for (const polygon of polygons) {
      for (let j = 1; j < polygon.length - 1; j++) {
        const t0 = polygon[0];
        const t1 = polygon[j];
        const t2 = polygon[j + 1];
        // Preserve triangles that are folded onto a zero-area boundary at the end.
        ab.set(t1[0] - t0[0], t1[1] - t0[1], t1[2] - t0[2]);
        ac.set(t2[0] - t0[0], t2[1] - t0[1], t2[2] - t0[2]);
        const sourceArea = ab.cross(ac).length();
        const endArea = Math.abs(
          cross2([t0[6], t0[7]], [t1[6], t1[7]], [t2[6], t2[7]])
        );
        if (sourceArea < 1e-12 && endArea < 1e-12) continue;
        data.push(t0, t1, t2);
      }
    }
  }

  const count = data.length;
  const start = new Float32Array(count * 3);
  const startNormals = new Float32Array(count * 3);
  const end = new Float32Array(count * 3);
  const endNormals = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const uv1 = new Float32Array(count * 2);
  const groups = new Uint16Array(count);

  const seamOffset = record.part === 'rear' ? 0.006 : -0.006;
  const endScaleX = 3.1 / (PAGE_WIDTH - 0.012);
  const endScaleY = 4.38 / PAGE_HEIGHT;

  for (let i = 0; i < count; i++) {
    const v = data[i];
    const k3 = i * 3;
    const k2 = i * 2;
    start[k3] = v[0];
    start[k3 + 1] = v[1];
    start[k3 + 2] = v[2];
    startNormals[k3] = v[3];
    startNormals[k3 + 1] = v[4];
    startNormals[k3 + 2] = v[5];
    end[k3] = (v[6] + seamOffset) * endScaleX;
    end[k3 + 1] = (v[7] - 0.32) * endScaleY;
    end[k3 + 2] = v[8];
    endNormals[k3] = v[9];
    endNormals[k3 + 1] = v[10];
    endNormals[k3 + 2] = v[11];
    uv[k2] = v[12];
    uv[k2 + 1] = v[13];
    uv1[k2] = v[14];
    uv1[k2 + 1] = v[15];
  }

  for (let i = 0; i < count; i += 3) {
    const k0 = i * 3;
    const k1 = (i + 1) * 3;
    const k2 = (i + 2) * 3;
    // Match the pre-portrait-stretch group grid for identical fragment boundaries.
    const rawX = end[k0] / endScaleX - seamOffset;
    const rawX1 = end[k1] / endScaleX - seamOffset;
    const rawX2 = end[k2] / endScaleX - seamOffset;
    const rawY = end[k0 + 1] / endScaleY + 0.32;
    const rawY1 = end[k1 + 1] / endScaleY + 0.32;
    const rawY2 = end[k2 + 1] / endScaleY + 0.32;
    const x = (rawX + rawX1 + rawX2) / 3;
    const y = (rawY + rawY1 + rawY2) / 3;

    let group = 84;
    if (record.part !== 'horn') {
      const page = record.part === 'front' ? 1 : 0;
      const left = page ? 0.006 : -PAGE_WIDTH / 2;
      const column = clamp(Math.floor(((x - left) / WIDTH) * 6), 0, 5);
      const row = clamp(Math.floor(((y - (0.32 - PAGE_HEIGHT / 2)) / PAGE_HEIGHT) * 7), 0, 6);
      group = page * 42 + row * 6 + column;
    }
    groups.fill(group, i, i + 3);
  }

  return {
    part: record.part,
    meshSpecs: record.meshSpecs,
    originalPositions: record.start.positions,
    originalNormals: record.start.normals,
    originalUv: new Float32Array(uvAttr.array),
    originalUv1: uv1Attr ? new Float32Array(uv1Attr.array) : null,
    originalIndex: g.index ? g.index.array.slice() : null,
    start,
    startNormals,
    end,
    endNormals,
    uv,
    uv1,
    groups,
    vertexCount: count,
  };
}

function buildGroupTemplates(records) {
  const groups = new Map();
  const tmpPt = new THREE.Vector3();

  for (const record of records) {
    for (let i = 0; i < record.groups.length; i++) {
      const id = record.groups[i];
      if (!groups.has(id)) {
        groups.set(id, { id, start: new THREE.Vector3(), end: new THREE.Vector3(), count: 0 });
      }
      const group = groups.get(id);
      group.start.add(tmpPt.fromArray(record.start, i * 3));
      group.end.add(tmpPt.fromArray(record.end, i * 3));
      group.count++;
    }
  }

  for (const group of groups.values()) {
    group.start.divideScalar(group.count);
    group.end.divideScalar(group.count);
    const seed = hash(group.id + 1);
    const angle = hash(group.id + 70) * Math.PI * 2;
    group.scatter = new THREE.Vector3(
      Math.cos(angle) * (0.55 + seed * 0.65),
      Math.sin(angle) * (0.55 + seed * 0.65),
      (hash(group.id + 140) - 0.5) * 1.5
    );
    group.axis = new THREE.Vector3(
      hash(group.id + 210) - 0.5,
      hash(group.id + 280) - 0.5,
      hash(group.id + 350) - 0.5
    ).normalize();
    group.spin = (1.2 + seed * 1.5) * Math.PI;
    group.seed = seed;
  }

  return groups;
}

/**
 * Computes the shared origami sculpt + 85-fragment tessellation template once so
 * multiple unicorn rigs can instantiate independent WebGL buffers without re-triangulating.
 */
export function createUnicornOpeningTemplate() {
  const tmpFront = new THREE.MeshStandardMaterial({ side: THREE.FrontSide });
  const tmpBack = new THREE.MeshStandardMaterial({ side: THREE.BackSide });
  const approved = createCinematicUnicorn(tmpFront, tmpBack);

  const partMap = new Map();
  approved.sheets.forEach(sheet => {
    sheet.root.traverse(object => {
      if (object.isMesh) partMap.set(object, sheet.id);
    });
  });
  approved.horn.traverse(object => {
    if (object.isMesh) partMap.set(object, 'horn');
  });

  const classifyMaterial = (mesh, part) => {
    if (mesh.material === tmpFront) return 'front';
    if (mesh.material === tmpBack) return 'back';
    if (part === 'horn') return 'horn';
    if (mesh.material.side === THREE.DoubleSide) return 'edge';
    return 'inner';
  };

  const recordMap = new Map();
  approved.root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const part = partMap.get(mesh);
    if (!recordMap.has(mesh.geometry)) {
      recordMap.set(mesh.geometry, {
        original: mesh.geometry,
        part,
        meshes: [],
        meshSpecs: [],
      });
    }
    const entry = recordMap.get(mesh.geometry);
    entry.meshes.push(mesh);
    entry.meshSpecs.push({
      role: classifyMaterial(mesh, part),
      castShadow: mesh.castShadow,
      receiveShadow: mesh.receiveShadow,
      frustumCulled: mesh.frustumCulled,
    });
  });

  const rawRecords = [...recordMap.values()];
  approved.pose(0);
  rawRecords.forEach(record => {
    record.start = snapshot(record);
  });

  approved.pose(1);
  rawRecords.forEach(record => {
    record.end = snapshot(record);
    const shift = record.part === 'rear' ? -SHIFT : SHIFT;
    for (let i = 0; i < record.end.positions.length; i += 3) {
      record.end.positions[i] += shift;
    }
  });

  approved.pose(0);
  const records = rawRecords.map(record => tessellate(record));
  const groups = buildGroupTemplates(records);

  disposeTree(approved.root);
  approved.root.clear();
  tmpFront.dispose();
  tmpBack.dispose();

  return { records, groups };
}

/** Builds a procedural unicorn rig that unfolds into an open portrait project sheet. */
export function createUnicornOpening(frontMaterial, backMaterial, template = createUnicornOpeningTemplate()) {
  const root = new THREE.Group();

  const innerMaterial = frontMaterial.clone();
  innerMaterial.color.multiplyScalar(0.58);
  innerMaterial.roughness *= 1.15;

  const edgeMaterial = frontMaterial.clone();
  edgeMaterial.side = THREE.DoubleSide;
  edgeMaterial.color.multiplyScalar(0.8);

  const hornMaterial = frontMaterial.clone();
  hornMaterial.side = THREE.DoubleSide;

  const materialsByRole = {
    front: frontMaterial,
    back: backMaterial,
    inner: innerMaterial,
    edge: edgeMaterial,
    horn: hornMaterial,
  };

  const instances = template.records.map(spec => {
    const original = new THREE.BufferGeometry();
    original.setAttribute('position', new THREE.BufferAttribute(new Float32Array(spec.originalPositions), 3));
    original.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(spec.originalNormals), 3));
    original.setAttribute('uv', new THREE.BufferAttribute(spec.originalUv, 2));
    if (spec.originalUv1) original.setAttribute('uv1', new THREE.BufferAttribute(spec.originalUv1, 2));
    if (spec.originalIndex) original.setIndex(new THREE.BufferAttribute(spec.originalIndex, 1));
    original.computeBoundingSphere();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(spec.vertexCount * 3), 3).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(spec.vertexCount * 3), 3).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute('uv', new THREE.BufferAttribute(spec.uv, 2));
    geometry.setAttribute('uv1', new THREE.BufferAttribute(spec.uv1, 2));

    const meshes = spec.meshSpecs.map(meshSpec => {
      const mesh = new THREE.Mesh(original, materialsByRole[meshSpec.role]);
      mesh.castShadow = meshSpec.castShadow;
      mesh.receiveShadow = meshSpec.receiveShadow;
      mesh.frustumCulled = meshSpec.frustumCulled;
      root.add(mesh);
      return mesh;
    });

    return { spec, original, geometry, meshes };
  });

  const groupStates = new Map();
  for (const [id, def] of template.groups) {
    groupStates.set(id, {
      ...def,
      quaternion: new THREE.Quaternion(),
      center: new THREE.Vector3(),
      shape: 0,
    });
  }

  const endRotation = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI);
  const endInverse = endRotation.clone().invert();
  const spinRotation = new THREE.Quaternion();
  const sourcePoint = new THREE.Vector3();
  const targetPoint = new THREE.Vector3();
  const sourceNormal = new THREE.Vector3();
  const targetNormal = new THREE.Vector3();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let progress = 0;

  function useGeometry(closed) {
    for (const inst of instances) {
      const targetGeometry = closed ? inst.original : inst.geometry;
      for (const mesh of inst.meshes) {
        mesh.geometry = targetGeometry;
      }
    }
  }

  function updateGroups(value) {
    for (const group of groupStates.values()) {
      const t = clamp((value - group.seed * 0.055) / (1 - group.seed * 0.055), 0, 1);
      const turn = smooth(t, 0.12, 0.9);
      const pulse = Math.sin(Math.PI * smooth(t, 0.015, 0.98));
      group.quaternion.identity().slerp(endRotation, turn);
      spinRotation.setFromAxisAngle(group.axis, group.spin * pulse);
      group.quaternion.multiply(spinRotation);
      group.center.lerpVectors(group.start, group.end, smooth(t, 0.12, 0.97)).addScaledVector(group.scatter, pulse);
      group.shape = smooth(t, 0.24, 0.84);
    }
  }

  function pose(value) {
    progress = clamp(value, 0, 1);
    useGeometry(progress === 0);
    if (progress === 0) {
      root.updateMatrixWorld(true);
      return;
    }

    updateGroups(progress);
    for (const inst of instances) {
      const { spec, geometry } = inst;
      const output = geometry.attributes.position.array;
      const normals = geometry.attributes.normal.array;

      for (let i = 0; i < spec.groups.length; i++) {
        const group = groupStates.get(spec.groups[i]);
        const k = i * 3;
        sourcePoint.fromArray(spec.start, k).sub(group.start);
        sourceNormal.fromArray(spec.startNormals, k);
        targetPoint.fromArray(spec.end, k).sub(group.end).applyQuaternion(endInverse);
        targetNormal.fromArray(spec.endNormals, k).applyQuaternion(endInverse);
        point.lerpVectors(sourcePoint, targetPoint, group.shape).applyQuaternion(group.quaternion).add(group.center);
        normal.lerpVectors(sourceNormal, targetNormal, group.shape);
        if (normal.lengthSq() < 1e-12) normal.set(0, 0, 1);
        normal.normalize().applyQuaternion(group.quaternion);
        point.toArray(output, k);
        normal.toArray(normals, k);
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.normal.needsUpdate = true;
      geometry.computeBoundingSphere();
    }

    root.updateMatrixWorld(true);
  }

  function dispose() {
    const active = new Set();
    root.traverse(o => {
      if (o.geometry) active.add(o.geometry);
    });
    for (const inst of instances) {
      if (!active.has(inst.geometry)) inst.geometry.dispose();
      if (!active.has(inst.original)) inst.original.dispose();
    }
  }

  pose(0);
  return {
    root,
    pose,
    dispose,
    pickables: instances.flatMap(inst => inst.meshes),
    get progress() {
      return progress;
    },
  };
}
