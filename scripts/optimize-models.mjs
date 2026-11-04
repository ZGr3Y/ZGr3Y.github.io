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
import { prune, dedup, resample, textureCompress } from '@gltf-transform/functions';
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
  }
];

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
      console.warn(`[SKIP] Source file missing: ${modelConfig.name}`);
      continue;
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
