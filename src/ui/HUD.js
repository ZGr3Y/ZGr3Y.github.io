import { STATIONS } from '../stations/stationsData.js';

/**
 * Persistent Futuristic HUD & Telemetry Component
 */
export class HUD {
  constructor({
    container,
    dockContainer,
    onStationSelect = () => {},
    onAudioToggle = () => {}
  }) {
    this.container = container;
    this.dockContainer = dockContainer;
    this.onStationSelect = onStationSelect;
    this.onAudioToggle = onAudioToggle;

    this.currentIndex = 0;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <!-- Brand Identity -->
      <a class="hud-brand" href="#gateway" aria-label="Go to Gateway">
        <div class="brand-glyph">Z</div>
        <div class="brand-meta">
          <span class="brand-name">ZGr3Y // SEC-SYS</span>
          <span class="brand-sub">SPATIAL PROTOCOL 3.0</span>
        </div>
      </a>

      <!-- Station Navigation Links -->
      <nav class="hud-center" aria-label="Station Navigation">
        <ul class="station-nav-list">
          ${STATIONS.map((st, i) => `
            <li>
              <button class="station-nav-btn ${i === 0 ? 'active' : ''}" data-station-index="${i}">
                <span class="btn-idx">${st.index}</span>
                <span>${st.name}</span>
              </button>
            </li>
          `).join('')}
        </ul>
      </nav>

      <!-- Right Telemetry & Controls -->
      <div class="hud-telemetry">
        <div class="telemetry-coords" aria-label="Camera 3D Coordinates">
          <span class="coord-label">POS</span>
          <span id="hud-coord-text">X:00.0 Y:00.0 Z:15.0</span>
        </div>

        <div class="hud-status-badge" id="hud-idle-badge" title="GPU Rendering Status">
          <span class="status-dot"></span>
          <span id="hud-status-text">ACTIVE</span>
        </div>

        <button class="hud-audio-btn muted" id="hud-audio-toggle" aria-label="Toggle Audio Ambience" title="Toggle Synthesized Audio [M]">
          <span id="audio-icon">🔇</span>
        </button>
      </div>
    `;

    // Right Edge Vertical Spatial Dock
    this.dockContainer.innerHTML = STATIONS.map((st, i) => `
      <button class="dock-item ${i === 0 ? 'active' : ''}" data-station-index="${i}" aria-label="Go to station ${st.name}">
        <span class="dock-tooltip">${st.index} // ${st.name}</span>
      </button>
    `).join('');

    this.coordTextEl = document.getElementById('hud-coord-text');
    this.idleBadgeEl = document.getElementById('hud-idle-badge');
    this.statusTextEl = document.getElementById('hud-status-text');
    this.audioBtnEl = document.getElementById('hud-audio-toggle');
    this.audioIconEl = document.getElementById('audio-icon');

    this.bindEvents();
  }

  bindEvents() {
    // Top nav buttons
    this.container.querySelectorAll('.station-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.stationIndex, 10);
        this.onStationSelect(idx);
      });
    });

    // Brand click -> Gateway
    const brand = this.container.querySelector('.hud-brand');
    brand.addEventListener('click', (e) => {
      e.preventDefault();
      this.onStationSelect(0);
    });

    // Right edge dock items
    this.dockContainer.querySelectorAll('.dock-item').forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.stationIndex, 10);
        this.onStationSelect(idx);
      });
    });

    // Audio button toggle
    this.audioBtnEl.addEventListener('click', () => {
      const isMuted = this.onAudioToggle();
      this.setAudioMuted(isMuted);
    });

    // Keyboard shortcut [M] for audio
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        if (!e.target.closest('input') && !e.target.closest('textarea')) {
          const isMuted = this.onAudioToggle();
          this.setAudioMuted(isMuted);
        }
      }
    });
  }

  setStation(index) {
    this.currentIndex = index;

    // Update Top Nav active states
    this.container.querySelectorAll('.station-nav-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });

    // Update Dock active states
    this.dockContainer.querySelectorAll('.dock-item').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  updateCoordinates(camPos) {
    if (this.coordTextEl) {
      const x = (camPos.x >= 0 ? '+' : '') + camPos.x.toFixed(1);
      const y = (camPos.y >= 0 ? '+' : '') + camPos.y.toFixed(1);
      const z = (camPos.z >= 0 ? '+' : '') + camPos.z.toFixed(1);
      this.coordTextEl.textContent = `X:${x} Y:${y} Z:${z}`;
    }
  }

  setIdleState(isIdle) {
    if (!this.idleBadgeEl || !this.statusTextEl) return;
    if (isIdle) {
      this.idleBadgeEl.classList.add('idle');
      this.statusTextEl.textContent = 'IDLE DAMPED';
    } else {
      this.idleBadgeEl.classList.remove('idle');
      this.statusTextEl.textContent = 'ACTIVE';
    }
  }

  setAudioMuted(isMuted) {
    if (!this.audioBtnEl || !this.audioIconEl) return;
    this.audioBtnEl.classList.toggle('muted', isMuted);
    this.audioIconEl.textContent = isMuted ? '🔇' : '🔊';
  }
}
