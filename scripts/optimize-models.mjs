#!/usr/bin/env node

/**
 * 3D Model Optimization Pipeline
 * Paolo Maria Scarlata (ZGr3Y) Portfolio
 *
 * Compresses raw 3D assets from 3dObj/ into lightweight, production-ready
 * WebGL assets in public/models/ using WebP texture compression, Meshopt geometry
 * compression (preserving normals and UV fidelity), and animation pruning.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { prune, dedup, resample, textureCompress, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const inputDir = path.join(rootDir, '3dObj');
const outputDir = path.join(rootDir, 'public', 'models');

const MODELS = [
  {
    name: 'the_hitchhikers_guide_to_the_galaxy.glb',
    quality: 88,
    resize: [1024, 1024],
    meshopt: true
  },
  {
    name: 'the_matrix_white_room.glb',
    quality: 85,
    resize: [1024, 1024],
    meshopt: true
  },
  {
    name: 'hand.glb',
    quality: 88,
    resize: [2048, 2048],
    meshopt: true
  },
  {
    name: 'robotic_hand.glb',
    quality: 88,
    resize: [1024, 1024],
    meshopt: true
  },
  {
    name: 'origami_unicorn_from_blade_runner.glb',
    quality: 88,
    resize: [2048, 2048],
    meshopt: true
  },
  {
    name: 'portal_2_wheatly_rig.glb',
    // Omit meshopt: out-of-range UVs and skeletal skinning cause meshopt to skip compression and bloat the GLB past 5 MB.
    quality: 88,
    resize: [1024, 1024],
    keepAnimations: [
      'core_personality_sphere_base_skeleton|core01_idle',
      'core_personality_sphere_base_skeleton|sphere_idle_front',
      'core_personality_sphere_base_skeleton|sphere_WideEye'
    ]
  },
  {
    name: 'ricks_ship_from_rick_and_morty.glb',
    quality: 88,
    resize: [1024, 1024],
    meshopt: true
  },
  {
    name: 'surveillance_room.glb',
    quality: 90,
    resize: [2048, 2048],
    materialResizes: {
      material: [4096, 4096]
    },
    quantizeTexcoord: 15,
    meshopt: true,
    skipWeld: true
  }
];

async function compressTexturesWithMaterialOverrides(doc, modelConfig) {
  if (!modelConfig.materialResizes) {
    await doc.transform(
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        quality: modelConfig.quality,
        resize: modelConfig.resize
      })
    );
    return;
  }

  const textureTargets = new Map();
  for (const mat of doc.getRoot().listMaterials()) {
    const override = modelConfig.materialResizes[mat.getName()];
    const size = override || modelConfig.resize;
    const slots = [
      mat.getBaseColorTexture(),
      mat.getNormalTexture(),
      mat.getMetallicRoughnessTexture(),
      mat.getEmissiveTexture(),
      mat.getOcclusionTexture()
    ];
    for (const tex of slots) {
      if (!tex) continue;
      const prev = textureTargets.get(tex);
      if (!prev || size[0] > prev[0] || size[1] > prev[1]) {
        textureTargets.set(tex, size);
      }
    }
  }

  for (const tex of doc.getRoot().listTextures()) {
    const [maxW, maxH] = textureTargets.get(tex) || modelConfig.resize;
    const rawImage = tex.getImage();
    if (!rawImage) continue;
    const encoded = await sharp(Buffer.from(rawImage))
      .resize(maxW, maxH, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: modelConfig.quality })
      .toBuffer();
    tex.setImage(new Uint8Array(encoded)).setMimeType('image/webp');
  }

  doc.createExtension(EXTTextureWebP).setRequired(true);
}

async function run() {
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Raw assets directory not found at ${inputDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder
    });

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

    const transforms = [dedup(), resample()];
    if (!modelConfig.skipWeld) {
      transforms.push(weld());
    }
    if (modelConfig.meshopt) {
      transforms.push(
        meshopt({
          encoder: MeshoptEncoder,
          level: 'medium',
          quantizePosition: 16,
          quantizeNormal: 12,
          quantizeTexcoord: modelConfig.quantizeTexcoord || 14
        })
      );
    }

    await doc.transform(...transforms);
    await compressTexturesWithMaterialOverrides(doc, modelConfig);
    await doc.transform(prune());

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
  console.log('='.repeat(70));
}

run().catch((err) => {
  console.error('Optimization script failed:', err);
  process.exit(1);
});
