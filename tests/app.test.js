import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PortfolioApp } from '../src/core/PortfolioApp.js';

describe('PortfolioApp (Application Root Seam)', () => {
  let container;
  let canvas;
  let srAnnouncements;
  let app;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';

    canvas = document.createElement('canvas');
    canvas.id = 'cloud-canvas';
    container.appendChild(canvas);

    srAnnouncements = document.createElement('div');
    srAnnouncements.id = 'sr-announcements';
    container.appendChild(srAnnouncements);

    document.body.appendChild(container);
  });

  afterEach(() => {
    if (app) {
      app.destroy();
      app = null;
    }
    document.body.innerHTML = '';
  });

  it('initializes cleanly and defaults to Station 0 (Gateway)', () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    expect(app.getActiveStationIndex()).toBe(0);
    const station = app.getActiveStation();
    expect(station.id).toBe('gateway');
    expect(station.name).toBe('GATEWAY');
  });

  it('navigates to a specific station index and updates accessibility live region', async () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    
    await app.navigateTo(1);

    expect(app.getActiveStationIndex()).toBe(1);
    const station = app.getActiveStation();
    expect(station.id).toBe('lab');
    expect(station.name).toBe('LAB');
    expect(srAnnouncements.textContent).toContain('LAB');
  });

  it('bounds station navigation within available stations', async () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    // Out-of-bounds lower
    await app.navigateTo(-1);
    expect(app.getActiveStationIndex()).toBe(0);

    // Out-of-bounds upper
    await app.navigateTo(999);
    expect(app.getActiveStationIndex()).toBe(0);
  });

  it('destroys cleanly and resets state', () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    expect(() => app.destroy()).not.toThrow();
    expect(app.isDestroyed).toBe(true);
  });
});
