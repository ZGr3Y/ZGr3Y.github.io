import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('renders minimalist floating HUD with 4 station buttons and handles direct tier navigation on click', async () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    const hud = container.querySelector('.hud-nav');
    expect(hud).not.toBeNull();
    expect(hud.getAttribute('aria-label')).toBe('Station Navigation');

    const buttons = hud.querySelectorAll('button');
    expect(buttons.length).toBe(4);

    // Initial state: first button active with aria-current="step"
    expect(buttons[0].getAttribute('aria-current')).toBe('step');
    expect(buttons[0].classList.contains('active')).toBe(true);
    expect(buttons[0].textContent).toContain('01');
    expect(buttons[0].textContent).toContain('GATEWAY');
    expect(buttons[0].querySelector('.hud-sep').getAttribute('aria-hidden')).toBe('true');

    // Click on Station 2 (Lab)
    buttons[1].click();

    expect(app.getActiveStationIndex()).toBe(1);
    expect(buttons[1].getAttribute('aria-current')).toBe('step');
    expect(buttons[0].getAttribute('aria-current')).toBeNull();
    expect(buttons[1].classList.contains('active')).toBe(true);
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(srAnnouncements.textContent).toContain('LAB');
  });

  it('interpolates 3D camera position smoothly toward active station coordinates upon navigation and maintains loop active until arrival', async () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    // Initial camera position at Station 0 (Gateway: 0, 0, 16)
    expect(app.camera.position.x).toBeCloseTo(0, 1);
    expect(app.camera.position.y).toBeCloseTo(0, 1);
    expect(app.camera.position.z).toBeCloseTo(16, 1);

    // Trigger navigation to Station 1 (Lab: x: 6, y: 3.5, z: 14.5)
    await app.navigateTo(1);

    // Immediately after navigation trigger, transition is in progress
    expect(app.isCameraTransitioning()).toBe(true);

    // Simulate 10 animation frames
    for (let frame = 0; frame < 10; frame++) {
      app._renderFrame(1000 + frame * 16);
    }

    // Camera should have moved towards target (x should have increased towards 6, z decreased towards 14.5)
    expect(app.camera.position.x).toBeGreaterThan(0);
    expect(app.camera.position.z).toBeLessThan(16);

    // Simulate remaining frames until transition settles
    for (let frame = 10; frame < 120; frame++) {
      app._renderFrame(1000 + frame * 16);
    }

    // Camera should have reached Station 1 waypoint and transition settled
    expect(app.camera.position.x).toBeCloseTo(6, 0.5);
    expect(app.camera.position.y).toBeCloseTo(3.5, 0.5);
    expect(app.camera.position.z).toBeCloseTo(14.5, 0.5);
    expect(app.isCameraTransitioning()).toBe(false);
  });

  it('navigates sequentially using keyboard arrows, mouse wheel, and touch swipes with debounce cooldown', () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    expect(app.getActiveStationIndex()).toBe(0);

    // 1. Keyboard Navigation (ArrowDown -> Station 1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(app.getActiveStationIndex()).toBe(1);

    // ArrowUp -> Station 0 (with cooldown reset)
    app._lastNavTime = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(app.getActiveStationIndex()).toBe(0);

    // Boundary clamp: ArrowUp at index 0 stays at 0
    app._lastNavTime = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(app.getActiveStationIndex()).toBe(0);

    // 2. Mouse Wheel Navigation with cooldown protection
    app._lastNavTime = 0;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    expect(app.getActiveStationIndex()).toBe(1);

    // Rapid second wheel tick within cooldown window is ignored
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    expect(app.getActiveStationIndex()).toBe(1);

    // 3. Touch Swipe Navigation
    // Reset cooldown to simulate user swiping
    app._lastNavTime = 0;
    const touchStart = new Event('touchstart');
    touchStart.touches = [{ clientX: 200, clientY: 400 }];
    window.dispatchEvent(touchStart);

    const touchEnd = new Event('touchend');
    touchEnd.changedTouches = [{ clientX: 200, clientY: 200 }]; // 200px swipe up -> next station
    window.dispatchEvent(touchEnd);
    expect(app.getActiveStationIndex()).toBe(2);
  });

  it('does not trigger sequential navigation on wheel, swipe, or keys if station-container can still scroll in that direction', () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    // Simulate an overflowing station panel (e.g. 500px content inside 300px viewport)
    Object.defineProperty(stationContainer, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(stationContainer, 'clientHeight', { configurable: true, value: 300 });
    Object.defineProperty(stationContainer, 'scrollTop', { configurable: true, writable: true, value: 50 });

    // 1. Keyboard PageDown / ArrowDown while station-container can still scroll down (scrollTop 50 < 200 - 5)
    app._lastNavTime = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
    expect(app.getActiveStationIndex()).toBe(0);

    app._lastNavTime = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(app.getActiveStationIndex()).toBe(0);

    // 2. Wheel scroll down while station-container can still scroll down
    app._lastNavTime = 0;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    // Navigation must NOT be hijacked
    expect(app.getActiveStationIndex()).toBe(0);

    // 3. Swipe up while station-container can still scroll down
    app._lastNavTime = 0;
    const touchStart = new Event('touchstart');
    touchStart.touches = [{ clientX: 200, clientY: 400 }];
    window.dispatchEvent(touchStart);

    const touchEnd = new Event('touchend');
    touchEnd.changedTouches = [{ clientX: 200, clientY: 200 }]; // 200px swipe up
    window.dispatchEvent(touchEnd);
    // Navigation must NOT be hijacked
    expect(app.getActiveStationIndex()).toBe(0);

    // 4. When scrolled to the bottom (boundary reached, scrollTop = 200), swipe up DOES trigger station navigation
    stationContainer.scrollTop = 200;
    app._lastNavTime = 0;
    window.dispatchEvent(touchStart);
    window.dispatchEvent(touchEnd);
    expect(app.getActiveStationIndex()).toBe(1);
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

  it('destroys cleanly and resets state via both destroy() and dispose()', () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    expect(() => app.dispose()).not.toThrow();
    expect(app.isDestroyed).toBe(true);
    expect(app.topology).toBeNull();
    expect(app.idleManager).toBeNull();
  });

  it('forwards DOM pointer and touch gestures to topology and triggers pulses at tap coordinates', () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    const setPointerSpy = vi.spyOn(app.topology, 'setPointer');
    const triggerPulseSpy = vi.spyOn(app.topology, 'triggerPulse');

    // Desktop pointermove
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, clientY: 300 }));
    expect(setPointerSpy).toHaveBeenCalled();

    // Tap / click pointerdown at specific coordinates
    window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 800, clientY: 150 }));
    expect(triggerPulseSpy).toHaveBeenCalledWith(null, 1.0);
    expect(app.topology._pointerWorldPos.x).toBeGreaterThan(0);

    // Mobile touchmove & touchend
    const touchMoveEvent = new Event('touchmove');
    touchMoveEvent.touches = [{ clientX: 100, clientY: 500 }];
    window.dispatchEvent(touchMoveEvent);
    expect(app.topology._pointerWorldPos.x).toBeLessThan(0);

    window.dispatchEvent(new Event('touchend'));
    expect(setPointerSpy).toHaveBeenLastCalledWith(null, null);
  });

  it('suspends requestAnimationFrame loop when idle scene settles (0% CPU/GPU)', () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    
    // Inject mock renderer to test render call throttling
    const renderSpy = vi.fn();
    app.renderer = {
      render: renderSpy,
      dispose: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn()
    };

    // Simulate tab hidden
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });

    // Run frame update
    app._renderFrame(1000);

    expect(renderSpy).not.toHaveBeenCalled();
    // Loop should be suspended (0% CPU scheduling)
    expect(app.isLoopRunning()).toBe(false);

    // Reset document.hidden and wake app
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    app._resumeLoop();
    expect(app.isLoopRunning()).toBe(true);
  });

  it('wakes suspended loop upon keyboard focusin and resolves srAnnouncer from DOM fallback', async () => {
    // Instantiate without explicit srAnnouncer option
    app = new PortfolioApp({ container, canvas });
    expect(app.srAnnouncer).toBe(srAnnouncements);

    // Suspend loop
    app._isLoopRunning = false;
    expect(app.isLoopRunning()).toBe(false);

    // Trigger focusin event (e.g. tabbing to HUD button)
    window.dispatchEvent(new Event('focusin'));
    expect(app.isLoopRunning()).toBe(true);

    // Verify fallback announcement works on navigation
    await app.navigateTo(1);
    expect(srAnnouncements.textContent).toContain('LAB');
  });
});
