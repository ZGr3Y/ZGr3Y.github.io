#!/usr/bin/env node

/**
 * 3D Model Optimization Pipeline
 * Paolo Maria Scarlata (ZGr3Y) Portfolio
 *
 * Compresses raw 3D assets from 3dObj/ into lightweight, production-ready
 * WebGL assets in public/models/ using WebP texture compression and animation pruning.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, textureCompress, weld, quantize } from '@gltf-transform/functions';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const inputDir = path.join(rootDir, '3dObj');
const outputDir = path.join(rootDir, 'public', 'models');

const MODELS = [
  {
    name: 'the_hitchhikers_guide_to_the_galaxy.glb',
    quality: 85,
    resize: [1024, 1024]
  },
  {
    name: 'the_matrix_white_room.glb',
    quality: 80,
    resize: [1024, 1024]
  },
  {
    name: 'hand.glb',
    quality: 85,
    resize: [1024, 1024]
  },
  {
    name: 'robotic_hand.glb',
    quality: 80,
    resize: [1024, 1024]
  },
  {
    name: 'origami_unicorn_from_blade_runner.glb',
    quality: 85,
    resize: [1024, 1024]
  },
  {
    name: 'portal_2_wheatly_rig.glb',
    quality: 85,
    resize: [1024, 1024],
    keepAnimations: [
      'core_personality_sphere_base_skeleton|core01_idle',
      'core_personality_sphere_base_skeleton|sphere_idle_front',
      'core_personality_sphere_base_skeleton|sphere_WideEye'
    ]
  },
  {
    name: 'ricks_ship_from_rick_and_morty.glb',
    quality: 85,
    resize: [1024, 1024]
  },
  {
    name: 'surveillance_room.glb',
    quality: 82,
    resize: [1024, 1024],
    compactUnlitGeometry: true
  }
];

function compactUnlitRoomMeshes(doc) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prim.setAttribute('NORMAL', null);
      const isCables = prim.getMaterial()?.getName() === 'Shading2_cables';
      const posAttr = prim.getAttribute('POSITION');
      const uvAttr = prim.getAttribute('TEXCOORD_0');
      if (!posAttr || !uvAttr) continue;
      const pos = posAttr.getArray();
      const uv = uvAttr.getArray();
      const seen = new Map();
      const grid = isCables ? 34 : 500;
      const uvTol = isCables ? 0.006 : 0.002;
      for (let i = 0; i < pos.length / 3; i++) {
        const pk =
          Math.round(pos[i * 3] * grid) +
          ',' +
          Math.round(pos[i * 3 + 1] * grid) +
          ',' +
          Math.round(pos[i * 3 + 2] * grid);
        const u = uv[i * 2];
        const v = uv[i * 2 + 1];
        const bucket = seen.get(pk);
        if (!bucket) {
          seen.set(pk, [{ u, v, x: pos[i * 3], y: pos[i * 3 + 1], z: pos[i * 3 + 2] }]);
        } else {
          let matched = null;
          for (const entry of bucket) {
            if (Math.abs(u - entry.u) <= uvTol && Math.abs(v - entry.v) <= uvTol) {
              matched = entry;
              break;
            }
          }
          if (matched) {
            pos[i * 3] = matched.x;
            pos[i * 3 + 1] = matched.y;
            pos[i * 3 + 2] = matched.z;
            uv[i * 2] = matched.u;
            uv[i * 2 + 1] = matched.v;
          } else {
            bucket.push({ u, v, x: pos[i * 3], y: pos[i * 3 + 1], z: pos[i * 3 + 2] });
          }
        }
      }
      posAttr.setArray(pos);
      uvAttr.setArray(uv);
    }
  }
}

function stripDegenerateTriangles(doc) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idxAttr = prim.getIndices();
      if (!idxAttr) continue;
      const idx = idxAttr.getArray();
      const filtered = [];
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i];
        const b = idx[i + 1];
        const c = idx[i + 2];
        if (a !== b && b !== c && a !== c) {
          filtered.push(a, b, c);
        }
      }
      idxAttr.setArray(new Uint16Array(filtered));
    }
  }
}

async function run() {
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Raw assets directory not found at ${inputDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

  console.log('='.repeat(70));
  console.log(' Starting 3D Model Optimization Pipeline');
  console.log(` Input:  ${inputDir}`);
  console.log(` Output: ${outputDir}`);
  console.log('='.repeat(70));

  let totalRawBytes = 0;
  let totalOptimizedBytes = 0;

  for (const modelConfig of MODELS) {
    const srcPath = path.join(inputDir, modelConfig.name);
    const destPath = path.join(outputDir, modelConfig.name);

    if (!fs.existsSync(srcPath)) {
      console.error(`[ERROR] Required source model missing: ${srcPath}`);
      process.exit(1);
    }

    const rawStat = fs.statSync(srcPath);
    totalRawBytes += rawStat.size;

    console.log(`\nProcessing: ${modelConfig.name} (${(rawStat.size / (1024 * 1024)).toFixed(2)} MB)...`);

    const doc = await io.read(srcPath);

    // If specific animations must be preserved, dispose of all others and their channels/samplers
    if (modelConfig.keepAnimations) {
      const animations = doc.getRoot().listAnimations();
      for (const animation of animations) {
        if (!modelConfig.keepAnimations.includes(animation.getName())) {
          for (const channel of animation.listChannels()) channel.dispose();
          for (const sampler of animation.listSamplers()) {
            sampler.getInput()?.dispose();
            sampler.getOutput()?.dispose();
            sampler.dispose();
          }
          animation.dispose();
        }
      }
    }

    if (modelConfig.compactUnlitGeometry) {
      compactUnlitRoomMeshes(doc);
      await doc.transform(dedup(), resample(), weld());
      stripDegenerateTriangles(doc);
      await doc.transform(
        weld(),
        quantize(),
        textureCompress({
          encoder: sharp,
          targetFormat: 'webp',
          quality: modelConfig.quality,
          resize: modelConfig.resize
        }),
        prune()
      );
    } else {
      // Apply optimizations
      await doc.transform(
        dedup(),
        resample(),
        textureCompress({
          encoder: sharp,
          targetFormat: 'webp',
          quality: modelConfig.quality,
          resize: modelConfig.resize
        }),
        prune()
      );
    }

    const optimizedBuffer = await io.writeBinary(doc);
    fs.writeFileSync(destPath, Buffer.from(optimizedBuffer));

    const optSize = optimizedBuffer.byteLength;
    totalOptimizedBytes += optSize;

    const savingsPercent = (((rawStat.size - optSize) / rawStat.size) * 100).toFixed(1);
    console.log(
      ` ✓ Done: ${(optSize / (1024 * 1024)).toFixed(2)} MB (Saved ${savingsPercent}%)`
    );
  }

  console.log('\n' + '='.repeat(70));
  console.log(' Optimization Complete Summary:');
  console.log(` Total Raw Size:       ${(totalRawBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(` Total Optimized Size: ${(totalOptimizedBytes / (1024 * 1024)).toFixed(2)} MB`);
  const overallSavings = (((totalRawBytes - totalOptimizedBytes) / totalRawBytes) * 100).toFixed(1);
  console.log(` Overall Bundle Saved: ${overallSavings}%`);
  console.log('='.repeat(70) + '\n');
}

run().catch((err) => {
  console.error('Fatal error during model optimization:', err);
  process.exit(1);
});
