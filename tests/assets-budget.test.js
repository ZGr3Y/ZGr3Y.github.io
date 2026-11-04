import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Asset Budget & Optimization Pipeline (Ticket 01, Issue #28)', () => {
  const rootDir = process.cwd();
  const gitignorePath = path.join(rootDir, '.gitignore');
  const modelsDir = path.join(rootDir, 'public', 'models');
  const licensesPath = path.join(rootDir, 'docs', 'assets-licenses.md');

  const EXPECTED_MODELS = [
    'the_hitchhikers_guide_to_the_galaxy.glb',
    'the_matrix_white_room.glb',
    'hand.glb',
    'robotic_hand.glb',
    'origami_unicorn_from_blade_runner.glb',
    'portal_2_wheatly_rig.glb',
    'ricks_ship_from_rick_and_morty.glb'
  ];

  it('ignores the uncompressed raw assets directory 3dObj in .gitignore', () => {
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const lines = content.split('\n').map((l) => l.trim());
    const ignores3dObj = lines.some((l) => l === '3dObj' || l === '3dObj/' || l === '/3dObj' || l === '/3dObj/');
    expect(ignores3dObj).toBe(true);
  });

  it('ensures all required 3D production models exist in public/models/', () => {
    expect(fs.existsSync(modelsDir)).toBe(true);
    for (const modelName of EXPECTED_MODELS) {
      const modelPath = path.join(modelsDir, modelName);
      expect(fs.existsSync(modelPath), `Model ${modelName} must exist in public/models/`).toBe(true);
    }
  });

  it('strictly excludes disallowed non-commercial assets (Potato GLaDOS)', () => {
    if (!fs.existsSync(modelsDir)) return;
    const files = fs.readdirSync(modelsDir);
    const hasDisallowed = files.some((f) => /potato|glados/i.test(f));
    expect(hasDisallowed).toBe(false);
  });

  it('enforces asset budgets: <= 5MB per individual file and <= 15MB total bundle', () => {
    expect(fs.existsSync(modelsDir)).toBe(true);
    let totalBytes = 0;
    const maxSingleFileBytes = 5 * 1024 * 1024; // 5 MB
    const maxTotalBundleBytes = 15 * 1024 * 1024; // 15 MB

    for (const modelName of EXPECTED_MODELS) {
      const modelPath = path.join(modelsDir, modelName);
      expect(fs.existsSync(modelPath)).toBe(true);
      const stat = fs.statSync(modelPath);
      expect(
        stat.size,
        `File ${modelName} (${(stat.size / (1024 * 1024)).toFixed(2)} MB) exceeds 5 MB limit`
      ).toBeLessThanOrEqual(maxSingleFileBytes);
      totalBytes += stat.size;
    }

    expect(
      totalBytes,
      `Total models bundle size (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) exceeds 15 MB limit`
    ).toBeLessThanOrEqual(maxTotalBundleBytes);
  });

  it('verifies Wheatley model contains exactly 3 trimmed animation clips', () => {
    const wheatleyPath = path.join(modelsDir, 'portal_2_wheatly_rig.glb');
    expect(fs.existsSync(wheatleyPath)).toBe(true);

    const buffer = fs.readFileSync(wheatleyPath);
    // GLB binary magic: 0x46546C67 ('glTF')
    expect(buffer.readUInt32LE(0)).toBe(0x46546c67);

    // JSON chunk length at offset 12
    const jsonLength = buffer.readUInt32LE(12);
    const jsonBuffer = buffer.subarray(20, 20 + jsonLength);
    const gltf = JSON.parse(jsonBuffer.toString('utf8'));

    expect(Array.isArray(gltf.animations)).toBe(true);
    expect(gltf.animations.length).toBe(3);
  });

  it('documents model authors, sources, and CC-BY-4.0 licenses in docs/assets-licenses.md', () => {
    expect(fs.existsSync(licensesPath)).toBe(true);
    const content = fs.readFileSync(licensesPath, 'utf8');
    expect(content).toContain('CC-BY-4.0');
    expect(content).toContain('Sketchfab');
    for (const modelName of EXPECTED_MODELS) {
      expect(content).toContain(modelName);
    }
  });
});
