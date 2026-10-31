import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { STATIONS } from '../src/stations/stationsData.js';

describe('Static Assets Verification (Deterministic Standard)', () => {
  const publicDir = path.resolve(process.cwd(), 'public');

  it('ensures the public directory exists', () => {
    expect(fs.existsSync(publicDir)).toBe(true);
  });

  it('verifies resume PDF exists in public directory and is non-empty', () => {
    const resumePath = path.join(publicDir, 'resume_PaoloMariaScarlata.pdf');
    expect(fs.existsSync(resumePath)).toBe(true);
    const stats = fs.statSync(resumePath);
    expect(stats.size).toBeGreaterThan(1000); // At least 1KB
  });

  it('verifies all download URLs referenced in stationsData map to physical files in public/', () => {
    const downloadUrls = [];

    // Scan stations for downloadable assets
    for (const station of STATIONS) {
      if (station.hero?.actions) {
        for (const action of station.hero.actions) {
          if (action.isDownload && action.url) {
            downloadUrls.push(action.url);
          }
        }
      }
      if (station.channels) {
        for (const channel of station.channels) {
          if (channel.isDownload && channel.url) {
            downloadUrls.push(channel.url);
          }
        }
      }
    }

    expect(downloadUrls.length).toBeGreaterThan(0);

    for (const rawUrl of downloadUrls) {
      // Normalize './file.pdf' or '/file.pdf' to 'file.pdf'
      const filename = rawUrl.replace(/^\.?\//, '');
      const filePath = path.join(publicDir, filename);
      expect(
        fs.existsSync(filePath),
        `Asset referenced in stationsData does not exist in public/: ${filename}`
      ).toBe(true);
    }
  });
});
