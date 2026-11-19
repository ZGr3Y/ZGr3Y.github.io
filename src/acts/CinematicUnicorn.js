/**
 * Authored paper choreography for the Blade Runner origami unicorn.
 * Two persistent faceted surfaces carry the reference silhouette into two pages.
 * Anatomical hinges lead into broad accordion folds. The horn is a separate prop.
 * All positions are deterministic in progress, so closing exactly reverses opening.
 */
import * as THREE from 'three';
import reference from './UnicornContour.json' with { type: 'json' };
import { UNICORN_FOLD_PANELS } from './UnicornFoldAtlas.js';

export const PAGE_WIDTH = 4.8;
export const PAGE_HEIGHT = 3.5;

const HALF_WIDTH = (PAGE_WIDTH - 0.012) / 2;
const smooth = THREE.MathUtils.smoothstep;
const mix = THREE.MathUtils.lerp;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const FRONT_HINGES = [
  { a: [392, 262], b: [474, 268], sign: -1, angle: -0.45, phase: [0.03, 0.58] },
  { a: [398, 375], b: [494, 390], sign: -1, angle: -0.6, phase: [0.08, 0.66] },
  { a: [425, 550], b: [503, 493], sign: 1, angle: 0.55, phase: [0.02, 0.65] },
];

const REAR_HINGES = [
  { a: [194, 437], b: [211, 535], sign: 1, angle: -0.6, phase: [0.04, 0.64] },
  { a: [214, 548], b: [317, 540], sign: 1, angle: -0.45, phase: [0.08, 0.68], leg: true },
];

const edgeKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

// Author in the reference image plane while retaining true scene depth. The
// perspective camera is eight units away: this keeps its frontal projection.
function imagePointTo([x, y], z = 0, target = new THREE.Vector3()) {
  const perspectiveScale = 1 - z / 8;
  return target.set(
    ((x - 350) / 190) * perspectiveScale,
    ((370 - y) / 190) * perspectiveScale,
    z
  );
}

const imagePoint = (coords, z = 0) => imagePointTo(coords, z, new THREE.Vector3());

const side = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

function signedDistance(p, hinge) {
  return side(p, hinge.a, hinge.b) / hinge.length;
}

function paperDepth() {
  return -0.065;
}

function clip(polygon, coordinate, threshold, positive) {
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = coordinate(a) - threshold;
    const db = coordinate(b) - threshold;

    if (positive ? da >= -1e-8 : da <= 1e-8) {
      result.push(a);
    }
    if (da * db < -1e-12) {
      const t = da / (da - db);
      result.push({
        source: a.source.map((v, j) => mix(v, b.source[j], t)),
        uv: a.uv.map((v, j) => mix(v, b.uv[j], t)),
      });
    }
  }
  return result;
}

function splitContour(contour, positive) {
  return clip(
    contour.map(source => ({ source, uv: [0, 0] })),
    p => p.source[0],
    350,
    positive
  ).map(p => p.source);
}

function barycentric(p, a, b, c) {
  const denominator = side(c, a, b);
  if (Math.abs(denominator) < 1e-8) return null;
  const w0 = side(p, b, c) / denominator;
  const w1 = side(p, c, a) / denominator;
  const w = [w0, w1, 1 - w0 - w1];
  return w.every(v => v >= -1e-7) ? w : null;
}

function triangulate(contour, anchors) {
  const points = contour.map(p => [...p]);
  const faces = THREE.ShapeUtils.triangulateShape(
    points.map(p => new THREE.Vector2(...p)),
    []
  );

  for (const anchor of anchors) {
    const faceIndex = faces.findIndex(f =>
      barycentric(anchor, ...f.map(i => points[i]))?.every(v => v > 1e-5)
    );
    if (faceIndex < 0) continue;
    const [a, b, c] = faces[faceIndex];
    const p = points.length;
    points.push(anchor);
    faces.splice(faceIndex, 1, [a, b, p], [b, c, p], [c, a, p]);
  }

  // Improve the interior diagonals while preserving every silhouette edge.
  const boundary = new Set(contour.map((_, i) => edgeKey(i, (i + 1) % contour.length)));
  const angle = (a, p, b) =>
    Math.atan2(
      Math.abs(side(p, a, b)),
      (a[0] - p[0]) * (b[0] - p[0]) + (a[1] - p[1]) * (b[1] - p[1])
    );

  for (let pass = 0; pass < 120; pass++) {
    const edges = new Map();
    let changed = false;

    faces.forEach((face, fi) => {
      face.forEach((a, i) => {
        const b = face[(i + 1) % 3];
        const k = edgeKey(a, b);
        if (!edges.has(k)) edges.set(k, []);
        edges.get(k).push({ fi, a, b, c: face[(i + 2) % 3] });
      });
    });

    for (const [k, neighbors] of edges) {
      if (neighbors.length !== 2 || boundary.has(k)) continue;
      const { a, b, c } = neighbors[0];
      const d = neighbors[1].c;
      if (side(points[a], points[c], points[d]) * side(points[b], points[c], points[d]) >= -1e-9) {
        continue;
      }
      if (angle(points[a], points[c], points[b]) + angle(points[a], points[d], points[b]) <= Math.PI + 1e-5) {
        continue;
      }
      faces[neighbors[0].fi] = [c, d, a];
      faces[neighbors[1].fi] = [d, c, b];
      changed = true;
      break;
    }

    if (!changed) break;
  }

  return { points, faces, boundaryCount: contour.length };
}

function layout(contour, anchors, corners) {
  const { points, faces, boundaryCount } = triangulate(contour, anchors);
  const uv = points.map(() => [0, 0]);
  const nearest = p =>
    contour.reduce(
      (best, q, i) =>
        Math.hypot(p[0] - q[0], p[1] - q[1]) < Math.hypot(p[0] - contour[best][0], p[1] - contour[best][1])
          ? i
          : best,
      0
    );

  const cornerData = corners
    .map(([point, value]) => ({ index: nearest(point), value }))
    .sort((a, b) => a.index - b.index);

  for (let c = 0; c < 4; c++) {
    const start = cornerData[c];
    const end = cornerData[(c + 1) % 4];
    const indices = [start.index];
    const distances = [0];
    let i = start.index;
    let total = 0;

    while (i !== end.index) {
      const next = (i + 1) % boundaryCount;
      total += Math.hypot(points[next][0] - points[i][0], points[next][1] - points[i][1]);
      indices.push(next);
      distances.push(total);
      i = next;
    }

    indices.forEach((id, n) => {
      const ratio = distances[n] / total;
      uv[id] = [
        mix(start.value[0], end.value[0], ratio),
        mix(start.value[1], end.value[1], ratio),
      ];
    });
  }

  const adjacency = points.map(() => new Set());
  for (const face of faces) {
    for (const a of face) {
      for (const b of face) {
        if (a !== b) adjacency[a].add(b);
      }
    }
  }

  for (let pass = 0; pass < 1000; pass++) {
    let error = 0;
    for (let i = boundaryCount; i < points.length; i++) {
      let nextU = 0;
      let nextV = 0;
      for (const j of adjacency[i]) {
        nextU += uv[j][0];
        nextV += uv[j][1];
      }
      const degree = adjacency[i].size;
      nextU /= degree;
      nextV /= degree;
      error = Math.max(error, Math.abs(nextU - uv[i][0]), Math.abs(nextV - uv[i][1]));
      uv[i][0] = nextU;
      uv[i][1] = nextV;
    }
    if (error < 1e-9) break;
  }

  // Explicit material-space creases keep the large page folds straight.
  let polygons = faces.map(face => face.map(i => ({ source: points[i], uv: uv[i] })));
  for (const value of [0.32, 0.68]) {
    polygons = polygons.flatMap(polygon =>
      [clip(polygon, p => p.uv[1], value, true), clip(polygon, p => p.uv[1], value, false)].filter(
        p => p.length >= 3
      )
    );
  }
  return polygons.flatMap(polygon =>
    polygon.slice(1, -1).map((_, i) => [polygon[0], polygon[i + 1], polygon[i + 2]])
  );
}

function addHingeAxes(hinges) {
  return hinges.map(h => ({
    ...h,
    origin: imagePoint(h.a),
    direction: imagePoint(h.b).sub(imagePoint(h.a)).normalize(),
    length: Math.hypot(h.b[0] - h.a[0], h.b[1] - h.a[1]),
  }));
}

function clippedPanel(polygon, triangle) {
  let result = polygon;
  const orientation = Math.sign(side(triangle[2], triangle[0], triangle[1]));

  for (let edge = 0; edge < 3 && result.length; edge++) {
    const a = triangle[edge];
    const b = triangle[(edge + 1) % 3];
    const next = [];

    for (let i = 0; i < result.length; i++) {
      const p = result[i];
      const q = result[(i + 1) % result.length];
      const dp = side(p, a, b) * orientation;
      const dq = side(q, a, b) * orientation;

      if (dp >= -1e-7) next.push(p);
      if (dp * dq < -1e-12) {
        const t = dp / (dp - dq);
        next.push(p.map((v, j) => mix(v, q[j], t)));
      }
    }
    result = next;
  }

  return result;
}

function makeFoldLayers(root, vertices, baseGeometry, material, back, contour) {
  const layers = [];
  const pickables = [];
  const pos = baseGeometry.attributes.position.array;
  const baseUv1 = baseGeometry.attributes.uv1.array;

  const innerMaterial = material.clone();
  innerMaterial.color.multiplyScalar(0.58);
  innerMaterial.roughness = material.roughness * 1.15;

  const sourceTriangles = [];
  for (let i = 0; i < vertices.length; i += 3) {
    const p0 = vertices[i].source;
    const p1 = vertices[i + 1].source;
    const p2 = vertices[i + 2].source;
    sourceTriangles.push({
      i,
      points: [p0, p1, p2],
      minX: Math.min(p0[0], p1[0], p2[0]),
      maxX: Math.max(p0[0], p1[0], p2[0]),
      minY: Math.min(p0[1], p1[1], p2[1]),
      maxY: Math.max(p0[1], p1[1], p2[1]),
    });
  }

  const bindingAt = point => {
    for (const triangle of sourceTriangles) {
      const weights = barycentric(point, ...triangle.points);
      if (weights) return { i: triangle.i, weights };
    }
    return null;
  };

  const tmpDesired = new THREE.Vector3();
  const tmpBase = new THREE.Vector3();
  const offsetFor = (source, binding, depth) => {
    const [x, y] = source;
    const wrinkle = 0.004 * Math.sin(x * 0.31 + y * 0.17) + 0.002 * Math.sin(x * 0.11 - y * 0.33);
    imagePointTo(source, depth + wrinkle, tmpDesired);
    tmpBase.set(0, 0, 0);
    binding.weights.forEach((weight, j) => {
      tmpBase.addScaledVector(vertices[binding.i + j].closed, weight);
    });
    return tmpDesired.sub(tmpBase).toArray();
  };

  const newGeometry = (samples, indices = null) => {
    const geometry = new THREE.BufferGeometry();
    const uv = new Float32Array(samples.length * 2);
    const documentUV = new Float32Array(samples.length * 2);

    samples.forEach((sample, sampleIdx) => {
      const uvOffset = sampleIdx * 2;
      uv[uvOffset] = sample.source[0] / 720;
      uv[uvOffset + 1] = 1 - sample.source[1] / 721;

      const { i, weights } = sample.binding;
      let u = 0;
      let v = 0;
      for (let j = 0; j < weights.length; j++) {
        const srcOffset = (i + j) * 2;
        u += baseUv1[srcOffset] * weights[j];
        v += baseUv1[srcOffset + 1] * weights[j];
      }
      documentUV[uvOffset] = u;
      documentUV[uvOffset + 1] = v;
    });

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(samples.length * 3), 3).setUsage(THREE.DynamicDrawUsage)
    );
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geometry.setAttribute('uv1', new THREE.BufferAttribute(documentUV, 2));
    if (indices) geometry.setIndex(indices);
    return geometry;
  };

  const panelTriangles = UNICORN_FOLD_PANELS.map(panel =>
    THREE.ShapeUtils.triangulateShape(
      panel.points.map(p => new THREE.Vector2(p[0], p[1])),
      []
    )
  );

  UNICORN_FOLD_PANELS.forEach((panel, panelIdx) => {
    const samples = [];
    for (const face of panelTriangles[panelIdx]) {
      const polygon = face.map(i => panel.points[i]);
      const minX = Math.min(...polygon.map(p => p[0]));
      const maxX = Math.max(...polygon.map(p => p[0]));
      const minY = Math.min(...polygon.map(p => p[1]));
      const maxY = Math.max(...polygon.map(p => p[1]));

      for (const triangle of sourceTriangles) {
        if (maxX < triangle.minX || minX > triangle.maxX || maxY < triangle.minY || minY > triangle.maxY) {
          continue;
        }
        const cut = clippedPanel(polygon, triangle.points);
        for (let k = 1; k < cut.length - 1; k++) {
          const cell = [cut[0], cut[k], cut[k + 1]];
          const signedArea = side(cell[2], cell[0], cell[1]);
          if (Math.abs(signedArea) < 1e-6) continue;
          if (signedArea > 0) cell.reverse();

          for (const source of cell) {
            const weights = barycentric(source, ...triangle.points);
            if (!weights) throw Error(`Invalid fold binding: ${panel.id}`);
            const binding = { i: triangle.i, weights };
            samples.push({ source, binding, offset: offsetFor(source, binding, source[2]) });
          }
        }
      }
    }

    if (!samples.length) return;

    const geometry = newGeometry(samples);
    const front = new THREE.Mesh(geometry, panel.shade === 'inner' ? innerMaterial : material);
    const reverse = new THREE.Mesh(geometry, back);
    geometry.userData.foldId = panel.id;
    geometry.userData.hinge = panel.points.slice(0, 2).map(p => imagePoint(p, p[2]).toArray());

    front.castShadow = front.receiveShadow = true;
    reverse.castShadow = true;
    root.add(front, reverse);
    pickables.push(front, reverse);

    const shared = new Map();
    samples.forEach((sample, i) => {
      const k = `${sample.source[0].toFixed(4)},${sample.source[1].toFixed(4)}`;
      if (!shared.has(k)) shared.set(k, []);
      shared.get(k).push(i);
    });
    layers.push({ id: panel.id, geometry, samples, normalGroups: [...shared.values()] });
  });

  // Close the paper edge in depth, including the thin folded neck and legs.
  const edgeSamples = [];
  const edgeIndices = [];
  for (let i = 0; i < contour.length; i++) {
    const source = contour[i];
    const binding = bindingAt(source);
    if (!binding) continue;

    let frontDepth = -0.065;
    UNICORN_FOLD_PANELS.forEach((panel, panelIdx) => {
      for (const face of panelTriangles[panelIdx]) {
        const corners = face.map(index => panel.points[index]);
        const weights = barycentric(source, ...corners);
        if (weights) {
          frontDepth = Math.max(
            frontDepth,
            weights.reduce((sum, w, j) => sum + w * corners[j][2], 0)
          );
        }
      }
    });

    edgeSamples.push(
      { source, binding, offset: offsetFor(source, binding, frontDepth) },
      { source, binding, offset: offsetFor(source, binding, -0.12) }
    );
  }

  for (let i = 0; i < edgeSamples.length / 2; i++) {
    const a = i * 2;
    const b = ((i + 1) % (edgeSamples.length / 2)) * 2;
    if (Math.abs(edgeSamples[a].source[0] - 350) < 1e-6 && Math.abs(edgeSamples[b].source[0] - 350) < 1e-6) {
      continue;
    }
    edgeIndices.push(a, b, a + 1, b, b + 1, a + 1);
  }

  const edgeGeometry = newGeometry(edgeSamples, edgeIndices);
  const edgeMaterial = material.clone();
  edgeMaterial.side = THREE.DoubleSide;
  edgeMaterial.color.multiplyScalar(0.8);
  const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
  edgeMesh.castShadow = true;
  root.add(edgeMesh);
  pickables.push(edgeMesh);
  layers.push({ id: 'paper-edge', geometry: edgeGeometry, samples: edgeSamples });

  function pose(progress) {
    const relief = 1 - smooth(progress, 0.08, 0.85);
    for (const layer of layers) {
      const output = layer.geometry.attributes.position.array;
      layer.samples.forEach((sample, index) => {
        const { i, weights } = sample.binding;
        let x = 0;
        let y = 0;
        let z = 0;
        for (let j = 0; j < 3; j++) {
          const k = (i + j) * 3;
          x += pos[k] * weights[j];
          y += pos[k + 1] * weights[j];
          z += pos[k + 2] * weights[j];
        }
        const outIdx = index * 3;
        output[outIdx] = x + sample.offset[0] * relief;
        output[outIdx + 1] = y + sample.offset[1] * relief;
        output[outIdx + 2] = z + sample.offset[2] * relief + 0.0004;
      });
      layer.geometry.attributes.position.needsUpdate = true;
      layer.geometry.computeVertexNormals();
      layer.geometry.computeBoundingSphere();

      if (layer.normalGroups) {
        const normals = layer.geometry.attributes.normal.array;
        for (const group of layer.normalGroups) {
          let x = 0;
          let y = 0;
          let z = 0;
          for (const idx of group) {
            const k = idx * 3;
            x += normals[k];
            y += normals[k + 1];
            z += normals[k + 2];
          }
          const length = Math.hypot(x, y, z) || 1;
          const nx = x / length;
          const ny = y / length;
          const nz = z / length;
          for (const idx of group) {
            const k = idx * 3;
            normals[k] = nx;
            normals[k + 1] = ny;
            normals[k + 2] = nz;
          }
        }
        layer.geometry.attributes.normal.needsUpdate = true;
      }
    }
  }

  return { pose, count: layers.length - 1, pickables };
}

function makeSheet(id, contour, material, back) {
  const isFront = id === 'front';
  const anchors = isFront
    ? [[445, 245], [427, 285], [436, 324], [451, 365], [424, 404], [465, 426], [402, 462], [443, 475], [468, 511], [485, 537], [547, 572]]
    : [[229, 459], [282, 460], [319, 471], [255, 493], [300, 515], [224, 522], [252, 568], [255, 604], [164, 491], [119, 532]];
  const corners = isFront
    ? [[[539, 247], [1, 1]], [[646, 632], [1, 0]], [[350, 531], [0, 0]], [[437, 220], [0, 1]]]
    : [[[350, 531], [1, 0]], [[240, 685], [0, 0]], [[49, 581], [0, 1]], [[350, 409], [1, 1]]];

  const faces = layout(contour, anchors, corners);
  const hinges = addHingeAxes(isFront ? FRONT_HINGES : REAR_HINGES);
  const vertices = faces.flat().map(vertex => ({
    ...vertex,
    closed: imagePoint(vertex.source, paperDepth(vertex.source, id)),
  }));

  const positions = new Float32Array(vertices.length * 3);
  const uvs = new Float32Array(vertices.length * 2);
  const documentUV = new Float32Array(vertices.length * 2);
  const pageCenter = isFront ? HALF_WIDTH / 2 + 0.006 : -HALF_WIDTH / 2 - 0.006;

  vertices.forEach((vertex, i) => {
    const x = pageCenter + (vertex.uv[0] - 0.5) * HALF_WIDTH;
    const uvOffset = i * 2;
    // The foil grain has a uniform scale in the closed sculpture. It is a
    // procedural material, not photographic highlights projected onto a mesh.
    uvs[uvOffset] = vertex.source[0] / 720;
    uvs[uvOffset + 1] = 1 - vertex.source[1] / 721;
    documentUV[uvOffset] = x / PAGE_WIDTH + 0.5;
    documentUV[uvOffset + 1] = vertex.uv[1];
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('uv1', new THREE.BufferAttribute(documentUV, 2));

  const root = new THREE.Group();
  const frontMesh = new THREE.Mesh(geometry, material);
  const backMesh = new THREE.Mesh(geometry, back);
  frontMesh.castShadow = frontMesh.receiveShadow = true;
  backMesh.castShadow = true;
  root.add(frontMesh, backMesh);

  // Keep one consistent winding in material space, including concave source tips.
  for (let i = 0; i < vertices.length; i += 3) {
    if (side(vertices[i + 2].source, vertices[i].source, vertices[i + 1].source) <= 0) continue;
    [vertices[i + 1], vertices[i + 2]] = [vertices[i + 2], vertices[i + 1]];
    for (const attribute of ['uv', 'uv1']) {
      const array = geometry.attributes[attribute].array;
      const a0 = array[(i + 1) * 2];
      const a1 = array[(i + 1) * 2 + 1];
      array.copyWithin((i + 1) * 2, (i + 2) * 2, (i + 3) * 2);
      array[(i + 2) * 2] = a0;
      array[(i + 2) * 2 + 1] = a1;
    }
  }

  const lineMaterial = new THREE.LineBasicMaterial({ color: '#b5c7cf', transparent: true, opacity: 0.32 });
  const wire = new THREE.LineSegments(new THREE.BufferGeometry(), lineMaterial);
  wire.visible = false;
  root.add(wire);
  let wireGeometry = null;

  const coincident = new Map();
  vertices.forEach((v, i) => {
    const k = `${v.source[0].toFixed(5)},${v.source[1].toFixed(5)}`;
    if (!coincident.has(k)) coincident.set(k, []);
    coincident.get(k).push(i);
  });
  const normalGroups = vertices.map(v =>
    coincident.get(`${v.source[0].toFixed(5)},${v.source[1].toFixed(5)}`)
  );

  const foldLayers = makeFoldLayers(root, vertices, geometry, material, back, contour);
  const coverVertex = vertices.reduce(
    (best, v, i) =>
      (v.uv[0] - 0.5) ** 2 + (v.uv[1] - 0.5) ** 2 <
      (vertices[best].uv[0] - 0.5) ** 2 + (vertices[best].uv[1] - 0.5) ** 2
        ? i
        : best,
    0
  );
  const coverPoint = new THREE.Vector3();
  let rawNormals = null;
  const point = new THREE.Vector3();
  const target = new THREE.Vector3();
  const pivot = new THREE.Vector3();

  function pose(progress) {
    const spread = smooth(progress, 0.02, 0.83);
    const flatten = smooth(progress, 0.74, 1);
    const separation = 0.32 * Math.sin(Math.PI * smooth(progress, 0.015, 0.94)) * (isFront ? 1 : -1);

    vertices.forEach((vertex, i) => {
      point.copy(vertex.closed);
      for (const hinge of hinges) {
        const distance = signedDistance(vertex.source, hinge) * hinge.sign;
        if (distance <= 0) continue;
        const t = smooth(progress, ...hinge.phase);
        const amount = Math.sin(Math.PI * t);
        const weight = smooth(distance, 0, 8) * (hinge.leg ? smooth(vertex.source[0], 197, 220) : 1);
        point.sub(hinge.origin).applyAxisAngle(hinge.direction, hinge.angle * amount * weight).add(hinge.origin);
      }

      const u = vertex.uv[0];
      const v = vertex.uv[1];
      target.set(pageCenter + (u - 0.5) * HALF_WIDTH, (v - 0.5) * PAGE_HEIGHT + 0.32, 0);

      // Upper and lower flaps are driven separately around two parallel creases.
      if (v > 0.68) {
        pivot.set(0, (0.68 - 0.5) * PAGE_HEIGHT + 0.32, 0);
        target.sub(pivot).applyAxisAngle(X_AXIS, -1.05 * (1 - smooth(progress, 0.1, 0.69))).add(pivot);
      }
      if (v < 0.32) {
        pivot.set(0, (0.32 - 0.5) * PAGE_HEIGHT + 0.32, 0);
        target.sub(pivot).applyAxisAngle(X_AXIS, 1.1 * (1 - smooth(progress, 0.21, 0.83))).add(pivot);
      }

      point.lerp(target, spread);
      point.x += separation * (1 - flatten);
      // A slight broad camber avoids an unnaturally perfect plane before settling.
      point.z += Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.045 * Math.sin(progress * Math.PI);
      point.toArray(positions, i * 3);
    });

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const normals = geometry.attributes.normal.array;
    rawNormals ??= new Float32Array(normals.length);
    rawNormals.set(normals);

    // Smooth shallow facets while retaining the sharp opening creases.
    for (let i = 0; i < vertices.length; i++) {
      let x = 0;
      let y = 0;
      let z = 0;
      const ri = i * 3;
      for (const j of normalGroups[i]) {
        const rj = j * 3;
        const dot =
          rawNormals[ri] * rawNormals[rj] +
          rawNormals[ri + 1] * rawNormals[rj + 1] +
          rawNormals[ri + 2] * rawNormals[rj + 2];
        const weight = smooth(dot, 0.2, 0.85);
        if (weight === 0) continue;
        x += rawNormals[rj] * weight;
        y += rawNormals[rj + 1] * weight;
        z += rawNormals[rj + 2] * weight;
      }
      const length = Math.hypot(x, y, z) || 1;
      normals[ri] = x / length;
      normals[ri + 1] = y / length;
      normals[ri + 2] = z / length;
    }

    geometry.attributes.normal.needsUpdate = true;
    foldLayers.pose(progress);
    root.rotation.y = Math.PI * smooth(progress, ...(isFront ? [0.035, 0.56] : [0.2, 0.76]));
    coverPoint.fromArray(positions, coverVertex * 3).applyAxisAngle(Y_AXIS, root.rotation.y);

    if (wire.visible) {
      wireGeometry?.dispose();
      wireGeometry = new THREE.WireframeGeometry(geometry);
      wire.geometry = wireGeometry;
    }
  }

  return {
    id,
    root,
    pose,
    geometry,
    pickables: [frontMesh, backMesh, ...foldLayers.pickables],
    wire,
    coverPoint,
    panelCount: faces.length,
    foldPanelCount: foldLayers.count,
  };
}

function makeHorn(contour, material) {
  const levels = [...new Set(contour.map(p => p[1]))].sort((a, b) => a - b);
  const rings = [];

  for (const y of levels) {
    const crossings = [];
    contour.forEach((a, i) => {
      const b = contour[(i + 1) % contour.length];
      if (a[1] === b[1]) {
        if (y === a[1]) crossings.push(a[0], b[0]);
        return;
      }
      const t = (y - a[1]) / (b[1] - a[1]);
      if (t >= 0 && t <= 1) crossings.push(mix(a[0], b[0], t));
    });
    if (!crossings.length) continue;

    const left = Math.min(...crossings);
    const right = Math.max(...crossings);
    const width = right - left;
    const twist = Math.sin(y * 0.27);
    const depth = (width / 380) * 1.15;

    rings.push([
      [left, y, depth * 0.12 * twist],
      [(left + right) / 2 + width * 0.18 * twist, y, depth],
      [right, y, -depth * 0.12 * twist],
      [(left + right) / 2 - width * 0.18 * twist, y, -depth],
    ]);
  }

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const uv = [];
  const tmpPt = new THREE.Vector3();

  for (let row = 0; row < rings.length - 1; row++) {
    for (let sideIdx = 0; sideIdx < 4; sideIdx++) {
      const a = rings[row][sideIdx];
      const b = rings[row][(sideIdx + 1) % 4];
      const c = rings[row + 1][sideIdx];
      const d = rings[row + 1][(sideIdx + 1) % 4];
      const order = row % 2 ? [a, b, c, b, d, c] : [a, b, d, a, d, c];

      for (const p of order) {
        imagePointTo(p, p[2], tmpPt);
        positions.push(tmpPt.x, tmpPt.y, tmpPt.z);
        uv.push(p[0] / 720, 1 - p[1] / 721);
      }
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();

  const root = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  root.add(mesh);
  return { root, mesh };
}

export function createCinematicUnicorn(frontMaterial, backMaterial) {
  const contour = reference.contour;
  const right = contour.findIndex(p => p[0] === 466 && p[1] === 211);
  const left = contour.findIndex(p => p[0] === 437 && p[1] === 220);
  const body = contour.slice(right, left + 1);
  const hornContour = [...contour.slice(0, right + 1), contour[left], ...contour.slice(left + 1)];

  const root = new THREE.Group();
  const sheets = [
    makeSheet('rear', splitContour(body, false), frontMaterial, backMaterial),
    makeSheet('front', splitContour(body, true), frontMaterial, backMaterial),
  ];
  sheets.forEach(sheet => root.add(sheet.root));

  const hornMaterial = frontMaterial.clone();
  hornMaterial.side = THREE.DoubleSide;
  const horn = makeHorn(hornContour, hornMaterial);
  root.add(horn.root);

  const hornCenter = imagePoint([424, 123]);
  const rotatedHornCenter = new THREE.Vector3();
  const hornDestination = new THREE.Vector3();
  let progress = 0;

  function pose(value) {
    progress = value;
    sheets.forEach(sheet => sheet.pose(value));

    // Keep the opening gesture expansive while the two faces turn over.
    // This is a cinematic scale cue, not an area-conservation constraint.
    let lower = Infinity;
    let upper = -Infinity;
    for (const sheet of sheets) {
      const positions = sheet.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        lower = Math.min(lower, positions[i]);
        upper = Math.max(upper, positions[i]);
      }
    }

    const desiredHeight = mix((685 - 211) / 190, PAGE_HEIGHT, smooth(value, 0.02, 0.72));
    root.scale.setScalar(THREE.MathUtils.clamp(desiredHeight / (upper - lower), 1, 2));
    root.rotation.y = 0;

    const tuck = smooth(value, 0.015, 0.23);
    const frontSheet = sheets[1];
    horn.root.rotation.set(0, frontSheet.root.rotation.y * tuck, -0.15 * tuck);
    rotatedHornCenter.copy(hornCenter).applyEuler(horn.root.rotation);
    hornDestination.copy(frontSheet.coverPoint);
    hornDestination.z -= 0.35;
    hornDestination.lerpVectors(hornCenter, hornDestination, tuck);
    horn.root.position.copy(hornDestination).sub(rotatedHornCenter);

    // The horn remains present, physically covered by the opened paper.
    root.updateMatrixWorld(true);
  }

  pose(0);
  return {
    root,
    sheets,
    horn: horn.root,
    pickables: sheets.flatMap(s => s.pickables),
    creaseLines: sheets.map(s => s.wire),
    pose,
    inspect: () => ({
      construction: 'authored cinematic paper folds',
      sheetCount: 2,
      panelCount: sheets.reduce((sum, s) => sum + s.panelCount, 0),
      foldPanelCount: sheets.reduce((sum, s) => sum + s.foldPanelCount, 0),
      progress,
      physicalSimulation: false,
      hornIsSeparate: true,
    }),
  };
}
