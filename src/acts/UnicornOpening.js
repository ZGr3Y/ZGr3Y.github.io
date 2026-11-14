/**
 * Fragmented origami unfolding choreography built from the sculpted unicorn geometry.
 * At progress 0, the original un-tessellated sculpture renders unchanged; as progress
 * advances to 1, 85 faceted fragments turn and assemble onto the open portrait sheet.
 */
import * as THREE from 'three';
import { createCinematicUnicorn, PAGE_WIDTH, PAGE_HEIGHT } from './CinematicUnicorn.js';

export { PAGE_WIDTH, PAGE_HEIGHT };

const smooth = THREE.MathUtils.smoothstep;
const clamp = THREE.MathUtils.clamp;
const WIDTH = (PAGE_WIDTH - .012) / 2;
const SHIFT = WIDTH + .012;
const Y = new THREE.Vector3(0, 1, 0);
const identity = new THREE.Matrix4();
const cross2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function snapshot(record) {
  const mesh = record.meshes[0], geometry = record.original;
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  const positions = new Float32Array(p.count * 3), normals = new Float32Array(n.count * 3);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld), point = new THREE.Vector3();
  if (mesh.matrixWorld.equals(identity)) {
    positions.set(p.array);
    normals.set(n.array);
  } else {
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      positions.set(point.toArray(), i * 3);
      point.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
      normals.set(point.toArray(), i * 3);
    }
  }
  return { positions, normals };
}

function split(polygon, axis, value, positive) {
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], da = a[6 + axis] - value, db = b[6 + axis] - value;
    if (positive ? da >= -1e-9 : da <= 1e-9) result.push(a);
    if (da * db < -1e-16) {
      const t = da / (da - db);
      result.push(a.map((v, j) => v + (b[j] - v) * t));
    }
  }
  return result;
}

function tessellate(record) {
  const g = record.original, indices = g.index?.array || Array.from({ length: g.attributes.position.count }, (_, i) => i), data = [];
  const lines = [];
  if (record.part !== 'horn') {
    const center = record.part === 'front' ? SHIFT / 2 : -SHIFT / 2, left = center - WIDTH / 2;
    for (let i = 1; i < 6; i++) lines.push([0, left + WIDTH * i / 6]);
    for (let i = 1; i < 7; i++) lines.push([1, .32 - PAGE_HEIGHT / 2 + PAGE_HEIGHT * i / 7]);
  }
  const vertex = i => [
    ...record.start.positions.slice(i * 3, i * 3 + 3), ...record.start.normals.slice(i * 3, i * 3 + 3),
    ...record.end.positions.slice(i * 3, i * 3 + 3), ...record.end.normals.slice(i * 3, i * 3 + 3),
    g.attributes.uv.getX(i), g.attributes.uv.getY(i), g.attributes.uv1?.getX(i) || 0, g.attributes.uv1?.getY(i) || 0,
  ];
  for (let i = 0; i < indices.length; i += 3) {
    let polygons = [[vertex(indices[i]), vertex(indices[i + 1]), vertex(indices[i + 2])]];
    for (const [axis, value] of lines) {
      polygons = polygons.flatMap(polygon => {
        const coordinates = polygon.map(p => p[6 + axis]);
        if (Math.min(...coordinates) >= value - 1e-9 || Math.max(...coordinates) <= value + 1e-9) return [polygon];
        return [split(polygon, axis, value, true), split(polygon, axis, value, false)].filter(p => p.length >= 3);
      });
    }
    for (const polygon of polygons) {
      for (let j = 1; j < polygon.length - 1; j++) {
        const triangle = [polygon[0], polygon[j], polygon[j + 1]];
        // Preserve triangles that are folded onto a zero-area boundary at the end.
        const sourceArea = new THREE.Vector3(...triangle[1].slice(0, 3)).sub(new THREE.Vector3(...triangle[0].slice(0, 3)))
          .cross(new THREE.Vector3(...triangle[2].slice(0, 3)).sub(new THREE.Vector3(...triangle[0].slice(0, 3)))).length();
        if (sourceArea < 1e-12 && Math.abs(cross2(...triangle.map(p => p.slice(6, 8)))) < 1e-12) continue;
        data.push(...triangle);
      }
    }
  }
  const count = data.length, position = new Float32Array(count * 3), normal = new Float32Array(count * 3), uv = [], uv1 = [];
  const start = new Float32Array(count * 3), startNormals = new Float32Array(count * 3);
  const end = new Float32Array(count * 3), endNormals = new Float32Array(count * 3), groups = new Uint16Array(count);
  for (let i = 0; i < count; i++) {
    const v = data[i];
    start.set(v.slice(0, 3), i * 3);
    startNormals.set(v.slice(3, 6), i * 3);
    end.set(v.slice(6, 9), i * 3);
    endNormals.set(v.slice(9, 12), i * 3);
    uv.push(...v.slice(12, 14));
    uv1.push(...v.slice(14, 16));
  }
  for (let i = 0; i < count; i += 3) {
    const x = (end[i * 3] + end[(i + 1) * 3] + end[(i + 2) * 3]) / 3;
    const y = (end[i * 3 + 1] + end[(i + 1) * 3 + 1] + end[(i + 2) * 3 + 1]) / 3;
    let group = 84;
    if (record.part !== 'horn') {
      const page = record.part === 'front' ? 1 : 0, left = page ? .006 : -PAGE_WIDTH / 2;
      const column = clamp(Math.floor((x - left) / WIDTH * 6), 0, 5);
      const row = clamp(Math.floor((y - (.32 - PAGE_HEIGHT / 2)) / PAGE_HEIGHT * 7), 0, 6);
      group = page * 42 + row * 6 + column;
    }
    groups.fill(group, i, i + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('uv1', new THREE.Float32BufferAttribute(uv1, 2));
  return { geometry, start, startNormals, end, endNormals, groups, part: record.part, record };
}

function centersFor(data) {
  const groups = new Map();
  for (const d of data) {
    for (let i = 0; i < d.groups.length; i++) {
      const id = d.groups[i];
      if (!groups.has(id)) groups.set(id, { id, start: new THREE.Vector3(), end: new THREE.Vector3(), count: 0 });
      const group = groups.get(id);
      group.start.add(new THREE.Vector3().fromArray(d.start, i * 3));
      group.end.add(new THREE.Vector3().fromArray(d.end, i * 3));
      group.count++;
    }
  }
  for (const group of groups.values()) {
    group.start.divideScalar(group.count);
    group.end.divideScalar(group.count);
    const seed = hash(group.id + 1), angle = hash(group.id + 70) * Math.PI * 2;
    group.scatter = new THREE.Vector3(Math.cos(angle) * (.55 + seed * .65), Math.sin(angle) * (.55 + seed * .65), (hash(group.id + 140) - .5) * 1.5);
    group.axis = new THREE.Vector3(hash(group.id + 210) - .5, hash(group.id + 280) - .5, hash(group.id + 350) - .5).normalize();
    group.spin = (1.2 + seed * 1.5) * Math.PI;
    group.seed = seed;
    group.quaternion = new THREE.Quaternion();
    group.center = new THREE.Vector3();
    group.shape = 0;
  }
  return groups;
}

/** Builds a procedural unicorn rig that unfolds into an open portrait project sheet. */
export function createUnicornOpening(frontMaterial, backMaterial) {
  const approved = createCinematicUnicorn(frontMaterial, backMaterial), root = new THREE.Group(), recordMap = new Map(), partMap = new Map();
  approved.sheets.forEach(sheet => sheet.root.traverse(object => { if (object.isMesh) partMap.set(object, sheet.id); }));
  approved.horn.traverse(object => { if (object.isMesh) partMap.set(object, 'horn'); });
  approved.root.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!recordMap.has(mesh.geometry)) recordMap.set(mesh.geometry, { original: mesh.geometry, part: partMap.get(mesh), meshes: [] });
    recordMap.get(mesh.geometry).meshes.push(mesh);
  });
  const records = [...recordMap.values()];
  approved.pose(0);
  records.forEach(record => { record.start = snapshot(record); });
  approved.pose(1);
  records.forEach(record => {
    record.end = snapshot(record);
    const shift = record.part === 'rear' ? -SHIFT : SHIFT;
    for (let i = 0; i < record.end.positions.length; i += 3) record.end.positions[i] += shift;
  });
  approved.pose(0);
  records.forEach(record => {
    record.original.attributes.position.array.set(record.start.positions);
    record.original.attributes.normal.array.set(record.start.normals);
    record.original.attributes.position.needsUpdate = record.original.attributes.normal.needsUpdate = true;
    record.original.computeBoundingSphere();
    record.meshes.forEach(mesh => {
      root.add(mesh);
      mesh.position.set(0, 0, 0);
      mesh.quaternion.identity();
      mesh.scale.set(1, 1, 1);
      mesh.updateMatrix();
    });
  });
  approved.root.traverse(object => { if (object.isLine) { object.geometry.dispose(); object.material.dispose(); } });
  approved.root.clear();

  const data = records.map(record => tessellate(record));
  for (const d of data) {
    for (let i = 0; i < d.end.length; i += 3) {
      // Close the original gap before mapping both halves onto one portrait page.
      const seamOffset = d.part === 'rear' ? .006 : -.006;
      d.end[i] = (d.end[i] + seamOffset) * 3.1 / (PAGE_WIDTH - .012);
      d.end[i + 1] = (d.end[i + 1] - .32) * 4.38 / PAGE_HEIGHT;
    }
  }
  const groups = centersFor(data);
  const endRotation = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI);
  const endInverse = endRotation.clone().invert();
  const spinRotation = new THREE.Quaternion();
  const sourcePoint = new THREE.Vector3(), targetPoint = new THREE.Vector3();
  const sourceNormal = new THREE.Vector3(), targetNormal = new THREE.Vector3();
  const point = new THREE.Vector3(), normal = new THREE.Vector3();
  let progress = 0;

  function useGeometry(closed) {
    data.forEach(d => d.record.meshes.forEach(mesh => { mesh.geometry = closed ? d.record.original : d.geometry; }));
  }

  function updateGroups(value) {
    for (const group of groups.values()) {
      const t = clamp((value - group.seed * .055) / (1 - group.seed * .055), 0, 1);
      const turn = smooth(t, .12, .90);
      const pulse = Math.sin(Math.PI * smooth(t, .015, .98));
      group.quaternion.identity().slerp(endRotation, turn);
      spinRotation.setFromAxisAngle(group.axis, group.spin * pulse);
      group.quaternion.multiply(spinRotation);
      group.center.lerpVectors(group.start, group.end, smooth(t, .12, .97)).addScaledVector(group.scatter, pulse);
      group.shape = smooth(t, .24, .84);
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
    for (const d of data) {
      const output = d.geometry.attributes.position.array, normals = d.geometry.attributes.normal.array;
      for (let i = 0; i < d.groups.length; i++) {
        const group = groups.get(d.groups[i]), k = i * 3;
        sourcePoint.fromArray(d.start, k).sub(group.start);
        sourceNormal.fromArray(d.startNormals, k);
        targetPoint.fromArray(d.end, k).sub(group.end).applyQuaternion(endInverse);
        targetNormal.fromArray(d.endNormals, k).applyQuaternion(endInverse);
        point.lerpVectors(sourcePoint, targetPoint, group.shape).applyQuaternion(group.quaternion).add(group.center);
        normal.lerpVectors(sourceNormal, targetNormal, group.shape);
        if (normal.lengthSq() < 1e-12) normal.set(0, 0, 1);
        normal.normalize().applyQuaternion(group.quaternion);
        output.set(point.toArray(), k);
        normals.set(normal.toArray(), k);
      }
      d.geometry.attributes.position.needsUpdate = d.geometry.attributes.normal.needsUpdate = true;
      d.geometry.computeBoundingSphere();
    }
    root.updateMatrixWorld(true);
  }

  function dispose() {
    const active = new Set();
    root.traverse(o => { if (o.geometry) active.add(o.geometry); });
    for (const d of data) if (!active.has(d.geometry)) d.geometry.dispose();
    for (const r of records) if (!active.has(r.original)) r.original.dispose();
  }

  pose(0);
  return {
    root,
    pose,
    dispose,
    pickables: records.flatMap(r => r.meshes),
    get progress() { return progress; },
  };
}
