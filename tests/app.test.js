import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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

  it('renders Station 01 Gateway card with identity, telemetry badge, and validated CV download and GitHub links', () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    // 1. Verify identity and role elements exist in Gateway card
    const gatewayCard = container.querySelector('.gateway-card') || container.querySelector('[data-station="gateway"]');
    expect(gatewayCard).not.toBeNull();
    expect(gatewayCard.textContent).toContain('PAOLO MARIA SCARLATA');
    expect(gatewayCard.textContent).toContain('ZGr3Y');
    expect(gatewayCard.textContent).toContain('Cloud Systems & Security');
    expect(gatewayCard.textContent).toContain('SYSTEM ONLINE');

    // 2. Redundant in-card navigation buttons are absent (relying on persistent HUD and gesture navigation)
    expect(gatewayCard.querySelector('[data-nav-station]')).toBeNull();

    // 3. Verify CV download link attributes
    const cvLink = gatewayCard.querySelector('.btn-cv');
    expect(cvLink).not.toBeNull();
    expect(cvLink.getAttribute('href')).toBe('./resume_PaoloMariaScarlata.pdf');
    expect(cvLink.getAttribute('download')).toBe('resume_PaoloMariaScarlata.pdf');

    // 4. Verify external GitHub link attributes
    const ghLink = gatewayCard.querySelector('.btn-github');
    expect(ghLink).not.toBeNull();
    expect(ghLink.getAttribute('href')).toBe('https://github.com/ZGr3Y');
    expect(ghLink.getAttribute('target')).toBe('_blank');
    expect(ghLink.getAttribute('rel')).toContain('noopener');
    expect(ghLink.getAttribute('rel')).toContain('noreferrer');
  });

  it('renders Station 02 Lab with 3 Cloud Cards (CTF, Sentinel SIEM, and Work In Progress)', () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    const labCard = container.querySelector('.lab-card') || container.querySelector('[data-station="lab"]');
    expect(labCard).not.toBeNull();
    expect(labCard.getAttribute('aria-label')).toContain('Station 02: LAB');

    const projectCards = labCard.querySelectorAll('.project-card');
    expect(projectCards.length).toBe(3);

    // Card 1: CTF Vulnerability Lab
    const ctfCard = projectCards[0];
    expect(ctfCard.textContent).toContain('CTF Vulnerability Lab');
    expect(ctfCard.textContent).toContain("Bachelor's Thesis");
    const ctfGh = ctfCard.querySelector('a[href="https://github.com/ZGr3Y/CTF"]');
    expect(ctfGh).not.toBeNull();
    expect(ctfGh.getAttribute('target')).toBe('_blank');
    expect(ctfGh.getAttribute('rel')).toContain('noopener');
    expect(ctfGh.getAttribute('rel')).toContain('noreferrer');
    expect(ctfCard.querySelector('.btn-inspect')).not.toBeNull();

    // Card 2: Sentinel Distributed SIEM
    const siemCard = projectCards[1];
    expect(siemCard.textContent).toContain('Sentinel Distributed SIEM');
    const siemGh = siemCard.querySelector('a[href="https://github.com/ZGr3Y/sentinel-distributed-siem"]');
    expect(siemGh).not.toBeNull();
    expect(siemGh.getAttribute('target')).toBe('_blank');
    expect(siemGh.getAttribute('rel')).toContain('noopener');
    expect(siemGh.getAttribute('rel')).toContain('noreferrer');
    expect(siemCard.querySelector('.btn-inspect')).not.toBeNull();

    // Card 3: Work in Progress
    const wipCard = projectCards[2];
    expect(wipCard.textContent).toMatch(/Work in Progress/i);
  });

  it('renders Station 03 Arsenal with 4 tactical discipline panels and semantic skill chips', () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    const arsenalCard = container.querySelector('.arsenal-card') || container.querySelector('[data-station="arsenal"]');
    expect(arsenalCard).not.toBeNull();
    expect(arsenalCard.getAttribute('aria-label')).toContain('Station 03: ARSENAL');

    const disciplinePanels = arsenalCard.querySelectorAll('.discipline-card');
    expect(disciplinePanels.length).toBe(4);

    // Pillar 1: Cloud & Infrastructure
    expect(disciplinePanels[0].textContent).toContain('Cloud & Infrastructure');
    expect(disciplinePanels[0].textContent).toContain('☁️');

    // Pillar 2: Offensive Security
    expect(disciplinePanels[1].textContent).toContain('Offensive Security');
    expect(disciplinePanels[1].textContent).toContain('⚔️');

    // Pillar 3: Defensive & Hardening
    expect(disciplinePanels[2].textContent).toContain('Defensive & Hardening');
    expect(disciplinePanels[2].textContent).toContain('🛡️');

    // Pillar 4: Systems & Engineering
    expect(disciplinePanels[3].textContent).toContain('Systems & Engineering');
    expect(disciplinePanels[3].textContent).toContain('⚡');

    // Skill chips
    const chips = arsenalCard.querySelectorAll('.skill-chip');
    expect(chips.length).toBe(25);
    expect(chips[0].textContent).toContain('Docker & Compose');
    expect(chips[0].querySelector('.skill-dot')).not.toBeNull();
  });

  it('renders Station 04 Transmission with simulated bash terminal and secure channel uplinks', () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    const transmissionCard = container.querySelector('.transmission-card') || container.querySelector('[data-station="transmission"]');
    expect(transmissionCard).not.toBeNull();
    expect(transmissionCard.getAttribute('aria-label')).toContain('Station 04: TRANSMISSION');

    // 1. Simulated Bash Terminal
    const terminalBox = transmissionCard.querySelector('.terminal-box');
    expect(terminalBox).not.toBeNull();
    expect(terminalBox.textContent).toContain('zgr3y@cloud-node-01');
    expect(terminalBox.textContent).toContain('whoami');
    expect(terminalBox.textContent).toContain('Paolo Maria Scarlata');
    expect(terminalBox.textContent).toContain('kubectl get nodes');
    expect(terminalBox.textContent).toContain('CLUSTER STATUS: READY');
    expect(terminalBox.textContent).toContain('gpg --fingerprint');
    expect(terminalBox.textContent).toContain('B9A4 81CF 30E2 721A D5E9 443B 90C1 88FA 78B2 4E19');

    // 2. Channel Cards
    const channelCards = transmissionCard.querySelectorAll('.channel-card');
    expect(channelCards.length).toBe(3);

    // Channel 1: GitHub
    const ghChannel = transmissionCard.querySelector('a[href="https://github.com/ZGr3Y"]');
    expect(ghChannel).not.toBeNull();
    expect(ghChannel.getAttribute('target')).toBe('_blank');
    expect(ghChannel.getAttribute('rel')).toContain('noopener');

    // Channel 2: CV PDF Download
    const cvChannel = transmissionCard.querySelector('a[href="./resume_PaoloMariaScarlata.pdf"]');
    expect(cvChannel).not.toBeNull();
    expect(cvChannel.getAttribute('download')).toBe('resume_PaoloMariaScarlata.pdf');

    // Channel 3: Email Uplink
    const mailChannel = transmissionCard.querySelector('a[href="mailto:contact.zgr3y@gmail.com"]');
    expect(mailChannel).not.toBeNull();
    expect(mailChannel.textContent).toContain('Direct Communication');
  });

  it('opens accessible architecture modal with fullDesc on Inspect Architecture click and closes on Escape', () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    const ctfCard = container.querySelector('.project-card[data-project="ctf-lab"]');
    expect(ctfCard).not.toBeNull();

    const inspectBtn = ctfCard.querySelector('.btn-inspect');
    expect(inspectBtn).not.toBeNull();

    // Modal should not be open initially
    expect(container.querySelector('.architecture-modal')).toBeNull();

    // Click inspect button
    inspectBtn.click();

    // Modal should now be open
    const modal = container.querySelector('.architecture-modal');
    expect(modal).not.toBeNull();
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(modal.textContent).toContain('CTF Vulnerability Lab');
    expect(modal.textContent).toContain('Developed three isolated microservices simulating real-world vulnerabilities');

    // Press Escape to close modal
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(container.querySelector('.architecture-modal')).toBeNull();
  });

  it('locks background scroll and configures aria-labelledby on modal open, and restores scroll on close', () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    const ctfCard = container.querySelector('.project-card[data-project="ctf-lab"]');
    const inspectBtn = ctfCard.querySelector('.btn-inspect');

    // Before open: stationContainer overflow is not hidden
    expect(stationContainer.style.overflow).not.toBe('hidden');

    // Open modal
    inspectBtn.click();
    const modal = container.querySelector('.architecture-modal');
    expect(modal).not.toBeNull();

    // 1. Check aria-labelledby links to modal title element
    const labelledById = modal.getAttribute('aria-labelledby');
    expect(labelledById).toBe('modal-title-ctf-lab');
    const titleEl = modal.querySelector(`#${labelledById}`);
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe('CTF Vulnerability Lab');

    // 2. Check background scroll is locked
    expect(stationContainer.style.overflow).toBe('hidden');

    // 3. Close modal via Escape and check scroll is restored
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(stationContainer.style.overflow).not.toBe('hidden');
  });

  it('moves initial focus into modal on open and traps Tab focus sequence within dialog', () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    const ctfCard = container.querySelector('.project-card[data-project="ctf-lab"]');
    const inspectBtn = ctfCard.querySelector('.btn-inspect');
    inspectBtn.focus();
    expect(document.activeElement).toBe(inspectBtn);

    // Open modal
    inspectBtn.click();
    const modal = container.querySelector('.architecture-modal');
    expect(modal).not.toBeNull();

    const closeBtn = modal.querySelector('.modal-close-btn');
    const ghLink = modal.querySelector('.modal-actions a');
    expect(closeBtn).not.toBeNull();
    expect(ghLink).not.toBeNull();

    // 1. Initial focus handoff: activeElement must be within modal (e.g. closeBtn)
    expect(document.activeElement).toBe(closeBtn);

    // Focus last element (ghLink)
    ghLink.focus();
    expect(document.activeElement).toBe(ghLink);

    // 2. Tab on last element wraps focus back to first element (closeBtn)
    const wrapTabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    window.dispatchEvent(wrapTabEvent);
    expect(document.activeElement).toBe(closeBtn);

    // 3. Shift+Tab on first element wraps focus back to last element (ghLink)
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    window.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(ghLink);

    // 4. Closing modal restores focus to trigger element (inspectBtn)
    closeBtn.click();
    expect(document.activeElement).toBe(inspectBtn);
  });

  it('suppresses sequential station navigation when architecture modal is active', async () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    // Navigate to Station 1 (Lab)
    await app.navigateTo(1);
    expect(app.getActiveStationIndex()).toBe(1);

    // Open architecture modal
    const ctfCard = container.querySelector('.project-card[data-project="ctf-lab"]');
    const inspectBtn = ctfCard.querySelector('.btn-inspect');
    inspectBtn.click();
    expect(container.querySelector('.architecture-modal')).not.toBeNull();

    // Trigger ArrowDown while modal is open
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    // Should NOT navigate to Station 2 (Arsenal); must remain at Station 1 (Lab)
    expect(app.getActiveStationIndex()).toBe(1);
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

  it('maintains active, visible station content across all stations when navigating', async () => {
    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    for (let i = 0; i < app.stations.length; i++) {
      await app.navigateTo(i);
      const activeStation = app.getActiveStation();
      const activeCard = stationContainer.querySelector(`.station-card[data-station="${activeStation.id}"]`);
      expect(activeCard).not.toBeNull();
      expect(activeCard.classList.contains('active')).toBe(true);
      expect(activeCard.hasAttribute('hidden')).toBe(false);
    }
  });

  it('ensures inactive station cards with hidden attribute have display none computed style', () => {
    const cssPath = path.resolve(process.cwd(), 'src/styles/main.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const stationContainer = document.createElement('main');
    stationContainer.id = 'station-container';
    stationContainer.className = 'station-container';
    container.appendChild(stationContainer);

    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });

    const hiddenCard = stationContainer.querySelector('.station-card[hidden]');
    expect(hiddenCard).not.toBeNull();
    const computed = window.getComputedStyle(hiddenCard);
    try {
      expect(computed.display).toBe('none');
    } finally {
      styleEl.remove();
    }
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
    // Ignore zoom-modified wheel events (Ctrl+wheel / Cmd+wheel pinch-to-zoom)
    app._lastNavTime = 0;
    const ctrlWheel = new WheelEvent('wheel', { deltaY: 100 });
    Object.defineProperty(ctrlWheel, 'ctrlKey', { value: true });
    window.dispatchEvent(ctrlWheel);
    expect(app.getActiveStationIndex()).toBe(0);

    app._lastNavTime = 0;
    const metaWheel = new WheelEvent('wheel', { deltaY: 100 });
    Object.defineProperty(metaWheel, 'metaKey', { value: true });
    window.dispatchEvent(metaWheel);
    expect(app.getActiveStationIndex()).toBe(0);

    // Regular wheel event navigates to next station
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

  it('supports horizontal touch swipe deck gestures (swipe left for next, swipe right for previous)', () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    expect(app.getActiveStationIndex()).toBe(0);

    const dispatchSwipe = (diffX, diffY = 0) => {
      app._lastNavTime = 0;
      const startX = 200;
      const startY = 300;
      const touchStart = new Event('touchstart');
      touchStart.touches = [{ clientX: startX, clientY: startY }];
      window.dispatchEvent(touchStart);

      const touchEnd = new Event('touchend');
      touchEnd.changedTouches = [{ clientX: startX + diffX, clientY: startY + diffY }];
      window.dispatchEvent(touchEnd);
    };

    // 1. Horizontal swipe left (diffX = -120px) -> triggers next station
    dispatchSwipe(-120, 5);
    expect(app.getActiveStationIndex()).toBe(1);

    // 2. Horizontal swipe right (diffX = +120px) -> triggers previous station
    dispatchSwipe(120, 5);
    expect(app.getActiveStationIndex()).toBe(0);

    // 3. Multi-touch gesture (e.g. pinch-to-zoom with 2 fingers) is ignored
    app._lastNavTime = 0;
    const multiTouchStart = new Event('touchstart');
    multiTouchStart.touches = [{ clientX: 200, clientY: 300 }, { clientX: 250, clientY: 350 }];
    window.dispatchEvent(multiTouchStart);

    const multiTouchEnd = new Event('touchend');
    multiTouchEnd.changedTouches = [{ clientX: 80, clientY: 300 }];
    window.dispatchEvent(multiTouchEnd);

    // Must stay at 0, no station transition triggered
    expect(app.getActiveStationIndex()).toBe(0);
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

    // 3. Swipe up that starts with remaining scroll room and reaches the bottom during the swipe
    // (e.g. starts at scrollTop = 50, and native scrolling advances panel to 200 before touchend)
    app._lastNavTime = 0;
    stationContainer.scrollTop = 50;
    const touchStart = new Event('touchstart');
    touchStart.touches = [{ clientX: 200, clientY: 400 }];
    window.dispatchEvent(touchStart);

    // Simulate browser native scrolling advancing panel to boundary during gesture
    stationContainer.scrollTop = 200;

    const touchEnd = new Event('touchend');
    touchEnd.changedTouches = [{ clientX: 200, clientY: 200 }]; // 200px swipe up
    window.dispatchEvent(touchEnd);
    // Boundary-reaching swipe must NOT hijack station navigation on this gesture
    expect(app.getActiveStationIndex()).toBe(0);

    // 4. A subsequent swipe that STARTS while already at the boundary (scrollTop = 200) triggers station navigation
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

  it('handles DOM pointer and touch gestures gracefully, recording activity and waking loop', () => {
    app = new PortfolioApp({ container, canvas, srAnnouncer: srAnnouncements });
    const activitySpy = vi.spyOn(app.idleManager, 'recordActivity');

    // 1. Desktop pointermove wakes loop and records activity
    app._isLoopRunning = false;
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, clientY: 300 }));
    expect(activitySpy).toHaveBeenCalled();
    expect(app.isLoopRunning()).toBe(true);

    // 2. Pointerdown wakes loop and records activity
    activitySpy.mockClear();
    app._isLoopRunning = false;
    window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 800, clientY: 150 }));
    expect(activitySpy).toHaveBeenCalled();
    expect(app.isLoopRunning()).toBe(true);

    // 3. Mobile touchmove wakes loop and records activity
    activitySpy.mockClear();
    app._isLoopRunning = false;
    const touchMoveEvent = new Event('touchmove');
    touchMoveEvent.touches = [{ clientX: 100, clientY: 500 }];
    window.dispatchEvent(touchMoveEvent);
    expect(activitySpy).toHaveBeenCalled();
    expect(app.isLoopRunning()).toBe(true);

    window.dispatchEvent(new Event('touchend'));
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

    // 1. Simulate tab hidden
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    app._renderFrame(1000);
    expect(renderSpy).not.toHaveBeenCalled();
    expect(app.isLoopRunning()).toBe(false);

    // 2. Reset document.hidden and wake app
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    app._resumeLoop();
    expect(app.isLoopRunning()).toBe(true);

    // 3. Simulate idle settling (speedFactor <= 0.0001 with resting topology)
    vi.spyOn(app.idleManager, 'getSpeedFactor').mockReturnValue(0.0);
    app._renderFrame(2000);
    expect(app.isLoopRunning()).toBe(false);

    // 4. Pointer activity wakes suspended loop and records activity
    const activitySpy = vi.spyOn(app.idleManager, 'recordActivity');
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 300, clientY: 200 }));
    expect(activitySpy).toHaveBeenCalled();
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
