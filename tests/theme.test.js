import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Ticket 02: Light Gray Theme, ADR 0003 & Legacy Architecture Purge', () => {
  const repoRoot = path.resolve(__dirname, '..');

  describe('ADR 0003 & Domain Glossary', () => {
    it('records ADR 0003 superseding ADR 0002 for Light Gray Narrative Journey', () => {
      const adrPath = path.join(repoRoot, 'docs/adr/0003-light-gray-narrative-journey.md');
      expect(fs.existsSync(adrPath), 'docs/adr/0003-light-gray-narrative-journey.md must exist').toBe(true);

      const content = fs.readFileSync(adrPath, 'utf8');
      expect(content).toMatch(/# 0003\./i);
      expect(content).toMatch(/supersedes\s+0002/i);
      expect(content).toMatch(/Light Gray/i);
      expect(content).toMatch(/Narrative/i);
    });

    it('updates GLOSSARY.md with Journey terminology and renamed stations', () => {
      const glossaryPath = path.join(repoRoot, 'GLOSSARY.md');
      expect(fs.existsSync(glossaryPath)).toBe(true);

      const content = fs.readFileSync(glossaryPath, 'utf8');
      // Must contain new narrative journey terms
      expect(content).toMatch(/\*\*Journey\*\*/);
      expect(content).toMatch(/\*\*Act\*\*/);
      expect(content).toMatch(/\*\*Pill Choice\*\*/);
      expect(content).toMatch(/\*\*Branch\*\*/);
      expect(content).toMatch(/\*\*Shatter\*\*/);

      // Must use renamed stations: Experiences and Harness
      expect(content).toMatch(/Experiences/);
      expect(content).toMatch(/Harness/);

      // Must not contain deprecated Phase 1 Cloud Mesh Topology
      expect(content).not.toMatch(/\*\*Cloud Mesh Topology\*\*/);
    });
  });

  describe('Light Gray Theme Tokens & HTML Head', () => {
    it('updates tokens.css to Light Gray canvas background (#EAECEF / #F0F2F5)', () => {
      const tokensPath = path.join(repoRoot, 'src/styles/tokens.css');
      const tokensCss = fs.readFileSync(tokensPath, 'utf8');

      expect(tokensCss).toMatch(/--bg-canvas:\s*#EAECEF/i);
      expect(tokensCss).toMatch(/#F0F2F5/i);
    });

    it('updates index.html meta theme-color to #EAECEF', () => {
      const indexPath = path.join(repoRoot, 'index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf8');

      expect(indexHtml).toMatch(/<meta\s+name=["']theme-color["']\s+content=["']#EAECEF["']/i);
    });
  });

  describe('Legacy Architecture Purge', () => {
    it('removes legacy 3D topology and adaptive lighting files from src and tests', () => {
      const legacyFiles = [
        'src/core/CloudMeshTopology.js',
        'src/core/AdaptiveLightingEngine.js',
        'tests/topology.test.js',
        'tests/adaptive-lighting.test.js',
      ];

      for (const relPath of legacyFiles) {
        const fullPath = path.join(repoRoot, relPath);
        expect(fs.existsSync(fullPath), `${relPath} should be purged`).toBe(false);
      }
    });

    it('contains zero imports of CloudMeshTopology or AdaptiveLightingEngine in src', () => {
      const srcDir = path.join(repoRoot, 'src');
      const checkDir = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (entry.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            expect(content).not.toMatch(/CloudMeshTopology/);
            expect(content).not.toMatch(/AdaptiveLightingEngine/);
          }
        }
      };
      checkDir(srcDir);
    });
  });
});
