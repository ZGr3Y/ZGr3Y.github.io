import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

const surfaceMocks = vi.hoisted(() => ({
  referenceFoilMaps: vi.fn(),
  metalSheetMaps: vi.fn(),
  paperGrain: vi.fn(),
}));

const variantMocks = vi.hoisted(() => ({
  createUnicornOpening: vi.fn(),
  createUnicornOpeningTemplate: vi.fn(),
}));

vi.mock('../src/acts/UnicornSurface.js', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    referenceFoilMaps: surfaceMocks.referenceFoilMaps,
    metalSheetMaps: surfaceMocks.metalSheetMaps,
    paperGrain: surfaceMocks.paperGrain,
  };
});

vi.mock('../src/acts/UnicornOpening.js', () => ({
  createUnicornOpening: variantMocks.createUnicornOpening,
  createUnicornOpeningTemplate: variantMocks.createUnicornOpeningTemplate,
}));

import { ExperiencesAct } from '../src/acts/ExperiencesAct.js';
import { disposeTree, foilStudio } from '../src/acts/UnicornSurface.js';
import { PortfolioApp } from '../src/core/PortfolioApp.js';
import { STATIONS } from '../src/stations/stationsData.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createFakeRig(frontMaterial, paperMaterial) {
  const root = new THREE.Group();
  const frontMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    frontMaterial ?? new THREE.MeshStandardMaterial({ side: THREE.FrontSide })
  );
  const backMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    paperMaterial ?? new THREE.MeshStandardMaterial({ side: THREE.BackSide })
  );
  root.add(frontMesh, backMesh);

  return {
    root,
    setMode: vi.fn(),
    pose: vi.fn(),
    dispose: vi.fn(),
  };
}

function createMockRenderer() {
  return {
    capabilities: { getMaxAnisotropy: () => 8 },
    compile: vi.fn(),
    compileAsync: vi.fn().mockResolvedValue(undefined),
  };
}

function createExperiencesHarness({ projects, withRenderer = true } = {}) {
  const container = document.createElement('div');
  const canvas = document.createElement('canvas');
  container.append(canvas);
  document.body.append(container);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 200);
  const wake = vi.fn();
  const renderer = withRenderer ? createMockRenderer() : null;
  const sourceProjects = projects ?? STATIONS.find(s => s.id === 'lab').projects;

  const act = new ExperiencesAct({
    container,
    projects: sourceProjects,
    wake,
    scene,
    camera,
    renderer,
    canvas,
  });

  return {
    act,
    scene,
    camera,
    container,
    canvas,
    wake,
    renderer,
    host: () => container.querySelector('.experiences-scene'),
    status: () => container.querySelector('.experiences-status'),
    projectButton: title => container.querySelector(`[aria-label="Open origami: ${title}"]`),
    closeButton: () => container.querySelector('.experiences-close'),
    sheets: () => [...container.querySelectorAll('.project-sheet')],
  };
}

describe('ExperiencesAct (Origami Project Sheets & Lifecycle)', () => {
  let foilMaps;
  let sheetMapsList;
  let grainTexture;
  let envRenderTarget;
  let fromSceneSpy;
  let pmremDisposeSpy;

  beforeEach(() => {
    document.body.innerHTML = '';

    foilMaps = { normal: new THREE.Texture(), roughness: new THREE.Texture() };
    sheetMapsList = [0, 1, 2].map(() => ({
      normal: new THREE.Texture(),
      roughness: new THREE.Texture(),
    }));
    grainTexture = new THREE.Texture();
    envRenderTarget = { texture: new THREE.Texture(), dispose: vi.fn() };

    const sharedTemplate = { records: [], groups: new Map() };
    surfaceMocks.referenceFoilMaps.mockImplementation(async () => foilMaps);
    surfaceMocks.metalSheetMaps.mockImplementation(async index => sheetMapsList[index]);
    surfaceMocks.paperGrain.mockImplementation(() => grainTexture);
    variantMocks.createUnicornOpeningTemplate.mockReturnValue(sharedTemplate);
    variantMocks.createUnicornOpening.mockImplementation((front, paper) => createFakeRig(front, paper));

    fromSceneSpy = vi
      .spyOn(THREE.PMREMGenerator.prototype, 'fromScene')
      .mockImplementation(() => envRenderTarget);
    pmremDisposeSpy = vi
      .spyOn(THREE.PMREMGenerator.prototype, 'dispose')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    foilMaps.normal.dispose();
    foilMaps.roughness.dispose();
    sheetMapsList.forEach(maps => {
      maps.normal.dispose();
      maps.roughness.dispose();
    });
    grainTexture.dispose();
    envRenderTarget.texture.dispose();
    document.body.innerHTML = '';
  });

  describe('Semantic DOM & Scene Mounting', () => {
    it('mounts the constellation root and renders hidden semantic placeholders for up to 3 projects', () => {
      const extraProjects = [
        ...STATIONS.find(s => s.id === 'lab').projects,
        { id: 'extra', title: 'Should Be Truncated', badge: 'Extra', fullDesc: 'Ignored', tags: [] },
      ];
      const h = createExperiencesHarness({ projects: extraProjects, withRenderer: false });

      expect(h.scene.getObjectByName('ExperiencesConstellation')).toBe(h.act.root);
      expect(h.host().hidden).toBe(true);
      expect(h.host().getAttribute('aria-label')).toBe('Projects');

      const buttons = h.host().querySelectorAll('.experiences-picks button');
      expect(buttons).toHaveLength(3);
      expect(h.sheets()).toHaveLength(3);

      for (const project of extraProjects.slice(0, 3)) {
        const button = h.projectButton(project.title);
        expect(button).not.toBeNull();
        expect(button.getAttribute('aria-expanded')).toBe('false');
      }
      expect(h.projectButton('Should Be Truncated')).toBeNull();

      h.sheets().forEach(sheet => {
        expect(sheet.hidden).toBe(true);
        expect(sheet.getAttribute('role')).toBe('dialog');
        expect(sheet.getAttribute('aria-modal')).toBe('true');
        expect(sheet.getAttribute('aria-hidden')).toBe('true');
      });

      h.act.dispose();
    });

    it('renders WIP stamp, numbered highlights, at most 6 stack tags, and safe GitHub link', () => {
      const h = createExperiencesHarness({
        withRenderer: false,
        projects: [
          {
            id: 'wip-item',
            title: 'WIP Origami',
            badge: 'Prototype',
            status: 'wip',
            shortDesc: 'Short',
            fullDesc: 'Full description',
            tags: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
            github: 'https://github.com/ZGr3Y/example',
            sheet: {
              eyebrow: 'WIP · TEST',
              summary: 'Summary text',
              highlights: ['First highlight', 'Second highlight'],
            },
          },
        ],
      });

      const sheet = h.sheets()[0];
      expect(sheet.querySelector('.project-sheet__stamp')?.textContent).toBe('WORK IN PROGRESS');
      expect([...sheet.querySelectorAll('.project-sheet__number')].map(n => n.textContent)).toEqual(['01', '02']);
      expect([...sheet.querySelectorAll('.project-sheet__stack li')].map(li => li.textContent)).toEqual([
        'A', 'B', 'C', 'D', 'E', 'F',
      ]);

      const link = sheet.querySelector('.project-sheet__source');
      expect(link.getAttribute('href')).toBe('https://github.com/ZGr3Y/example');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');

      h.act.dispose();
    });
  });

  describe('Activation, Selection & Focus Lifecycle', () => {
    it('ignores open() until active and ready, then opens, focuses close, and restores trigger focus after close animation', async () => {
      let nowMs = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

      const h = createExperiencesHarness();
      const firstTitle = h.act.projects[0].title;
      const triggerButton = h.projectButton(firstTitle);

      // Inactive and unready: open() is a no-op
      h.act.open(0);
      expect(h.act.selected).toBe(-1);

      // Activate and wait for async scene preparation
      h.act.setActive(true);
      expect(h.host().hidden).toBe(false);
      expect(h.wake).toHaveBeenCalled();

      await h.act.prepare();
      expect(h.act.ready).toBe(true);
      expect(h.status().textContent).toBe('Choose an origami');
      expect(variantMocks.createUnicornOpeningTemplate).toHaveBeenCalledTimes(1);
      expect(variantMocks.createUnicornOpening).toHaveBeenCalledTimes(3);
      expect(fromSceneSpy).toHaveBeenCalledTimes(1);
      expect(pmremDisposeSpy).toHaveBeenCalledTimes(1);

      // Click project trigger -> opens sheet and focuses close button
      triggerButton.click();
      expect(h.act.selected).toBe(0);
      expect(triggerButton.getAttribute('aria-expanded')).toBe('true');
      expect(h.closeButton().hidden).toBe(false);
      expect(document.activeElement).toBe(h.closeButton());

      // Second open() while one is already selected must be ignored
      h.act.open(1);
      expect(h.act.selected).toBe(0);

      // Advance time until full opening (duration ~ 4/3 s)
      for (let i = 0; i < 4; i++) {
        nowMs += 450;
        h.act.update(0.016);
      }
      expect(h.act.progress).toBe(1);

      // Escape closes and returns focus to trigger once animation returns to 0
      h.host().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(h.act.target).toBe(0);

      for (let i = 0; i < 4; i++) {
        nowMs += 450;
        h.act.update(0.016);
      }

      expect(h.act.progress).toBe(0);
      expect(h.act.selected).toBe(-1);
      expect(triggerButton.getAttribute('aria-expanded')).toBe('false');
      expect(h.closeButton().hidden).toBe(true);
      expect(document.activeElement).toBe(triggerButton);

      // Deactivating resets state and hides host
      h.act.setActive(false);
      expect(h.host().hidden).toBe(true);

      h.act.dispose();
    });
  });

  describe('Sheet Projection & Zero-CPU Idle Loop', () => {
    it('reveals the active sheet aria state only near full unfold and reports isResting() once settled', async () => {
      let nowMs = 2000;
      vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

      const h = createExperiencesHarness();
      h.act.setActive(true);
      await h.act.prepare();

      // At rest initially
      expect(h.act.isResting()).toBe(true);

      h.act.open(1);
      expect(h.act.isResting()).toBe(false);

      // Mid-transition (< 0.86): sheet DOM is unhidden for layout, but still visually & ARIA hidden
      nowMs += 400;
      h.act.update(0.016);
      const activeSheet = h.sheets()[1];
      expect(activeSheet.hidden).toBe(false);
      expect(activeSheet.getAttribute('aria-hidden')).toBe('true');
      expect(h.sheets()[0].hidden).toBe(true);

      // Complete transition (>= 0.98) and let springs settle
      for (let i = 0; i < 10; i++) {
        nowMs += 250;
        h.act.update(0.016);
      }
      expect(h.act.progress).toBe(1);
      expect(activeSheet.style.opacity).toBe('1');
      expect(activeSheet.style.visibility).toBe('visible');
      expect(activeSheet.getAttribute('aria-hidden')).toBe('false');
      expect(h.act.isResting()).toBe(true);

      h.act.dispose();
    });
  });

  describe('Gesture Isolation Inside Project Sheets', () => {
    it('blocks wheel, touch, and non-Escape keys from bubbling while allowing Escape to close', async () => {
      const h = createExperiencesHarness();
      h.act.setActive(true);
      await h.act.prepare();
      expect(h.act.ready).toBe(true);
      h.act.open(0);
      expect(h.act.selected).toBe(0);

      const sheet = h.sheets()[0];
      const parentSpy = vi.fn();
      h.container.addEventListener('wheel', parentSpy);
      h.container.addEventListener('touchstart', parentSpy);
      h.container.addEventListener('touchmove', parentSpy);
      h.container.addEventListener('keydown', parentSpy);

      sheet.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
      sheet.dispatchEvent(new Event('touchstart', { bubbles: true }));
      sheet.dispatchEvent(new Event('touchmove', { bubbles: true }));
      sheet.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(parentSpy).not.toHaveBeenCalled();

      // Escape is allowed out of sheet.addEventListener so host.keydown closes the sheet,
      // and host.keydown stops propagation above the act.
      const closeSpy = vi.spyOn(h.act, 'close');
      sheet.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(parentSpy).not.toHaveBeenCalled();

      h.act.dispose();
    });
  });

  describe('Initialization Error Handling', () => {
    it('surfaces fallback status text instead of throwing when foil map loading fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      surfaceMocks.referenceFoilMaps.mockRejectedValueOnce(new Error('decode failed'));

      const h = createExperiencesHarness();
      await expect(h.act.prepare()).resolves.toBeUndefined();

      expect(h.act.ready).toBe(false);
      expect(h.status().textContent).toBe('3D preview unavailable.');
      expect(consoleErrorSpy).toHaveBeenCalled();

      h.act.dispose();
    });
  });

  describe('Teardown & Zero Memory Leak', () => {
    it('disposes scene objects, textures, rigs, environment, and aborts listeners', async () => {
      const h = createExperiencesHarness();
      h.act.setActive(true);
      await h.act.prepare();

      const sheetNormalDisposeSpies = sheetMapsList.map(m => vi.spyOn(m.normal, 'dispose'));
      const sheetRoughnessDisposeSpies = sheetMapsList.map(m => vi.spyOn(m.roughness, 'dispose'));
      const paperDisposeSpies = h.act.papers.map(p => vi.spyOn(p, 'dispose'));
      const rearDisposeSpies = h.act.rearSurfaces.map(r => vi.spyOn(r.material, 'dispose'));
      const frontDisposeSpies = h.act.frontSurfaces.map(f => vi.spyOn(f, 'dispose'));
      const rigDisposeSpies = h.act.rigs.map(r => vi.spyOn(r, 'dispose'));
      const grainDisposeSpy = vi.spyOn(grainTexture, 'dispose');

      h.act.dispose();

      expect(h.act.disposed).toBe(true);
      // happy-dom@15 does not detach listeners on AbortSignal; verify signal abortion directly.
      expect(h.act.events.signal.aborted).toBe(true);
      expect(h.scene.getObjectByName('ExperiencesConstellation')).toBeUndefined();
      expect(h.host()).toBeNull();
      expect(envRenderTarget.dispose).toHaveBeenCalledTimes(1);

      sheetNormalDisposeSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
      sheetRoughnessDisposeSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
      paperDisposeSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
      rearDisposeSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
      frontDisposeSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
      rigDisposeSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
      expect(grainDisposeSpy).toHaveBeenCalledTimes(1);
    });

    it('disposes async foil and sheet textures immediately if disposed mid-initialization', async () => {
      const pendingFoil = deferred();
      const pendingSheets = [deferred(), deferred(), deferred()];

      surfaceMocks.referenceFoilMaps.mockImplementationOnce(() => pendingFoil.promise);
      surfaceMocks.metalSheetMaps.mockImplementation(index => pendingSheets[index].promise);

      const h = createExperiencesHarness();
      const prepPromise = h.act.prepare();

      // Case 1: disposed while awaiting referenceFoilMaps
      h.act.dispose();
      const lateFoil = { normal: new THREE.Texture(), roughness: new THREE.Texture() };
      const lateNormalSpy = vi.spyOn(lateFoil.normal, 'dispose');
      const lateRoughSpy = vi.spyOn(lateFoil.roughness, 'dispose');
      pendingFoil.resolve(lateFoil);
      await prepPromise;

      expect(lateNormalSpy).toHaveBeenCalledTimes(1);
      expect(lateRoughSpy).toHaveBeenCalledTimes(1);
      lateFoil.normal.dispose();
      lateFoil.roughness.dispose();

      // Case 2: disposed while awaiting metalSheetMaps
      const h2 = createExperiencesHarness();
      const foil2 = { normal: new THREE.Texture(), roughness: new THREE.Texture() };
      const foil2NormalSpy = vi.spyOn(foil2.normal, 'dispose');
      const foil2RoughSpy = vi.spyOn(foil2.roughness, 'dispose');
      surfaceMocks.referenceFoilMaps.mockResolvedValueOnce(foil2);

      const prep2 = h2.act.prepare();
      await Promise.resolve();
      await Promise.resolve();
      h2.act.dispose();

      const lateSheets = [0, 1, 2].map(() => ({
        normal: new THREE.Texture(),
        roughness: new THREE.Texture(),
      }));
      const lateSheetSpies = lateSheets.flatMap(s => [
        vi.spyOn(s.normal, 'dispose'),
        vi.spyOn(s.roughness, 'dispose'),
      ]);
      pendingSheets.forEach((d, idx) => d.resolve(lateSheets[idx]));
      await prep2;

      expect(foil2NormalSpy).toHaveBeenCalledTimes(1);
      expect(foil2RoughSpy).toHaveBeenCalledTimes(1);
      lateSheetSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    });

    it('disposeTree frees all geometries and materials created by foilStudio', () => {
      const room = foilStudio({ cinematic: true });
      const geometrySpies = [];
      const materialSpies = [];

      room.traverse(obj => {
        if (obj.geometry) geometrySpies.push(vi.spyOn(obj.geometry, 'dispose'));
        if (obj.material) materialSpies.push(vi.spyOn(obj.material, 'dispose'));
      });

      expect(geometrySpies.length).toBeGreaterThan(0);
      expect(materialSpies.length).toBeGreaterThan(0);

      disposeTree(room);

      geometrySpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
      materialSpies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    });
  });

  describe('Canvas Pointer Picking & Reduced Motion', () => {
    it('opens hit origami on short canvas tap, ignores drags > 8px, and closes on canvas click when open', async () => {
      const h = createExperiencesHarness();
      h.act.setActive(true);
      await h.act.prepare();

      const targetMesh = h.act.interactiveMeshes.find(m => m.userData.projectIndex === 2);
      expect(targetMesh).toBeDefined();
      vi.spyOn(h.act.raycaster, 'intersectObjects').mockImplementation(() => [{ object: targetMesh }]);

      const pointerEvent = (type, x, y) =>
        Object.assign(new Event(type, { bubbles: true }), { isPrimary: true, clientX: x, clientY: y });

      // Drag > 8px must not open any sheet
      h.canvas.dispatchEvent(pointerEvent('pointerdown', 100, 100));
      h.canvas.dispatchEvent(pointerEvent('pointerup', 120, 100));
      expect(h.act.selected).toBe(-1);

      // Short tap <= 8px opens the raycast-hit project
      h.canvas.dispatchEvent(pointerEvent('pointerdown', 100, 100));
      h.canvas.dispatchEvent(pointerEvent('pointerup', 103, 104));
      expect(h.act.selected).toBe(2);
      expect(h.act.target).toBe(1);

      // Clicking the canvas while a sheet is already open triggers close()
      h.canvas.dispatchEvent(pointerEvent('pointerdown', 100, 100));
      h.canvas.dispatchEvent(pointerEvent('pointerup', 100, 100));
      expect(h.act.target).toBe(0);

      h.act.dispose();
    });

    it('uses 0.8s duration and suppresses idle bobbing when prefers-reduced-motion is enabled', async () => {
      let nowMs = 3000;
      vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
      vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const h = createExperiencesHarness();
      h.act.setActive(true);
      await h.act.prepare();

      // Hover/idle bobbing must remain zero across elapsed ticks
      const baseY0 = h.act.rigs[0].root.position.y;
      nowMs += 500;
      h.act.update(0.5);
      expect(h.act.rigs[0].root.position.y).toBeCloseTo(baseY0, 6);

      // Opening finishes within 0.8s (faster than the default 4/3s)
      h.act.open(0);
      nowMs += 450;
      h.act.update(0.016);
      nowMs += 450;
      h.act.update(0.016);
      expect(h.act.progress).toBe(1);

      h.act.dispose();
    });
  });

  describe('PortfolioApp Red-Branch & Teardown Integration', () => {
    it('activates ExperiencesAct on Gateway red branch [0.6, 0.8), reverses out of range, and disposes on destroy', () => {
      const container = document.createElement('div');
      container.id = 'app';
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      canvas.id = 'cloud-canvas';
      const srAnnouncer = document.createElement('div');
      container.append(canvas, srAnnouncer);
      document.body.append(container);

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true,
        enableJourney: true,
      });

      const disposeSpy = vi.spyOn(app.experiencesAct, 'dispose');

      // Enter red branch in [0.6, 0.8) on Gateway
      app.journeyState.selectBranch('red');
      app.scrollEngine.scrollTo(0.65);
      app.scrollEngine.currentProgress = 0.65;
      app.journeyState.setProgress(0.65);

      for (let frame = 0; frame < 110; frame++) {
        app._renderFrame(1000 + frame * 16);
      }

      expect(container.getAttribute('data-experiences-active')).toBe('true');
      expect(app.experiencesAct.active).toBe(true);
      expect(app.pillChoiceAct.rootGroup.visible).toBe(false);
      expect(app.camera.position.distanceTo(app.experiencesAct.getCameraPose().position)).toBeLessThan(0.1);

      // Retreat before 0.6 -> deactivates ExperiencesAct and returns camera toward interior
      app.scrollEngine.scrollTo(0.45);
      app.scrollEngine.currentProgress = 0.45;
      app.journeyState.setProgress(0.45);

      for (let frame = 0; frame < 110; frame++) {
        app._renderFrame(3000 + frame * 16);
      }

      expect(container.getAttribute('data-experiences-active')).toBe('false');
      expect(app.experiencesAct.active).toBe(false);
      expect(app.camera.position.distanceTo(app.gatewayAct.act1InteriorCamPos)).toBeLessThan(0.5);

      app.destroy();
      expect(disposeSpy).toHaveBeenCalledTimes(1);
      expect(container.querySelector('.experiences-scene')).toBeNull();
    });

    it('keeps Blue Pill inactive on Gateway [0.6, 0.8), runs a single camera flight on navigateTo(1), and isolates focus & gestures while a sheet is open', async () => {
      let nowMs = 5000;
      vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

      const container = document.createElement('div');
      container.id = 'app';
      container.innerHTML = '<div class="station-container"></div>';
      const canvas = document.createElement('canvas');
      canvas.id = 'cloud-canvas';
      const srAnnouncer = document.createElement('div');
      container.append(canvas, srAnnouncer);
      document.body.append(container);

      const app = new PortfolioApp({
        container,
        canvas,
        srAnnouncer,
        enableLoader: true,
        enableJourney: true,
      });
      app.loaderController.complete();

      // Blue Pill must not trigger ExperiencesAct on Gateway
      app.journeyState.selectBranch('blue');
      app.scrollEngine.scrollTo(0.65);
      app.scrollEngine.currentProgress = 0.65;
      app.journeyState.setProgress(0.65);

      for (let frame = 0; frame < 40; frame++) {
        app._renderFrame(1000 + frame * 16);
      }
      expect(container.getAttribute('data-experiences-active')).toBe('false');
      expect(app.experiencesAct.active).toBe(false);

      // Navigating directly to Lab starts _startCameraFlight exactly once (no duplicate restart on next frame)
      const flightSpy = vi.spyOn(app, '_startCameraFlight');
      await app.navigateTo(1);
      app._renderFrame(2000);
      expect(flightSpy).toHaveBeenCalledTimes(1);

      for (let frame = 0; frame < 110; frame++) {
        app._renderFrame(2016 + frame * 16);
      }
      expect(app.experiencesAct.active).toBe(true);

      // Prepare ExperiencesAct with fake renderer for sheet interaction
      app.experiencesAct.renderer = createMockRenderer();
      app.experiencesAct.preparation = null;
      await app.experiencesAct.prepare();
      expect(app.experiencesAct.ready).toBe(true);

      app.experiencesAct.open(0);
      for (let i = 0; i < 4; i++) {
        nowMs += 450;
        app.experiencesAct.update(0.016);
      }
      expect(app.experiencesAct.hasOpenSelection()).toBe(true);

      // Focus trap wraps between close button (first) and active sheet source link (last)
      const closeBtn = container.querySelector('.experiences-close');
      const sourceLink = container.querySelectorAll('.project-sheet')[0].querySelector('.project-sheet__source');
      expect(document.activeElement).toBe(closeBtn);

      sourceLink.focus();
      expect(document.activeElement).toBe(sourceLink);

      sourceLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      expect(document.activeElement).toBe(closeBtn);

      closeBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
      expect(document.activeElement).toBe(sourceLink);

      // Background navigation (wheel, ArrowDown on closeButton/window) is suppressed while sheet is open
      const navSpy = vi.spyOn(app, 'navigateNext');
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120 }));
      closeBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
      expect(navSpy).not.toHaveBeenCalled();
      expect(app.getActiveStationIndex()).toBe(1);

      // Escape from window closes sheet cleanly
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(app.experiencesAct.target).toBe(0);

      app.destroy();
    });
  });
});
