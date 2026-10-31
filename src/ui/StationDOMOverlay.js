import { STATIONS } from '../stations/stationsData.js';

/**
 * Spatial Station DOM Overlay Manager
 * Manages radically different UI layouts for:
 * - Variant A: Centered panoramic layout with anamorphic flare strips & holographic card grids
 * - Variant B: Asymmetric spatial cockpit framing 3D refractive glass sculptures with interactive 3D inspector HUD
 */
export class StationDOMOverlay {
  constructor({
    container,
    variant = 'A',
    onStationJump = () => {},
    onProjectInspect = () => {},
    onAudioHover = () => {},
    onSculptureControl = () => {}
  }) {
    this.container = container;
    this.variant = variant;
    this.onStationJump = onStationJump;
    this.onProjectInspect = onProjectInspect;
    this.onAudioHover = onAudioHover;
    this.onSculptureControl = onSculptureControl;

    this.currentStationIndex = 0;
    this.selectedLabProjectIndex = 0;
    this.sculptureSpeed = 1.0;
    this.sculptureMode = 'hybrid'; // 'glass' | 'wireframe' | 'hybrid'

    this.sculptureData = [
      { name: 'Dodecahedron Refractive Core', facets: '12 Pentagonal Facets', ior: '1.52', trans: '95%' },
      { name: 'Dual Crystalline Prisms', facets: 'Icosahedron & Octahedron', ior: '1.54', trans: '94%' },
      { name: 'Gyroscopic Torus Knot', facets: 'Continuous Topological Ring', ior: '1.52', trans: '96%' },
      { name: 'Quantum Beacon Octahedron', facets: '8 Equilateral Facets', ior: '1.56', trans: '93%' }
    ];

    this.render();
  }

  setVariant(newVariant) {
    if (this.variant === newVariant) return;
    this.variant = newVariant;
    this.render();
  }

  setStation(index) {
    if (index < 0 || index >= STATIONS.length) return;
    this.currentStationIndex = index;

    const sections = this.container.querySelectorAll('.station-section');
    sections.forEach((sec, i) => {
      sec.classList.toggle('active', i === index);
    });

    // Update Variant B Sculpture Inspector HUD telemetry if present
    const sculpName = this.container.querySelector('#sculpture-hud-name');
    const sculpFacets = this.container.querySelector('#sculpture-hud-facets');
    if (sculpName && this.sculptureData[index]) {
      sculpName.textContent = this.sculptureData[index].name;
      if (sculpFacets) sculpFacets.textContent = `${this.sculptureData[index].facets} // IOR ${this.sculptureData[index].ior}`;
    }

    // Screen reader announcement
    const srAnnouncer = document.getElementById('sr-announcements');
    if (srAnnouncer && STATIONS[index]) {
      srAnnouncer.textContent = `Navigated to station ${STATIONS[index].name}: ${STATIONS[index].subtitle}`;
    }
  }

  render() {
    this.container.setAttribute('data-variant', this.variant);
    document.body.setAttribute('data-variant', this.variant);

    if (this.variant === 'A') {
      this.renderVariantA();
    } else {
      this.renderVariantB();
    }

    this.bindDOMEvents();
    this.initCardTiltEffects();
    this.setStation(this.currentStationIndex);
  }

  /**
   * VARIANT A: Centered Panoramic Layout with Anamorphic Flares & Holographic Cards
   */
  renderVariantA() {
    this.container.innerHTML = `
      <!-- Station 01: GATEWAY (Variant A: Panoramic Hero) -->
      <section class="station-section active variant-a-layout" id="station-section-0" data-station="0">
        <div class="gateway-panoramic-content">
          <div class="optics-flare-strip" aria-hidden="true"></div>

          <div class="gateway-badge">
            <span class="badge-pulse"></span>
            <span>${STATIONS[0].hero.badge} // OPTICAL ATMOSPHERE</span>
          </div>

          <h1 class="hero-title">${STATIONS[0].hero.name}</h1>
          <div class="hero-subtitle">${STATIONS[0].hero.alias} // ${STATIONS[0].hero.role}</div>

          <p class="hero-bio">${STATIONS[0].hero.bio}</p>

          <div class="hero-cta-group">
            <button class="btn-glass btn-glass-primary" data-jump="1">
              <span>Explore Security Lab</span>
              <span>→</span>
            </button>
            <button class="btn-glass" data-jump="2">
              <span>Inspect Arsenal</span>
              <span>⚡</span>
            </button>
            <a href="./resume_PaoloMariaScarlata.pdf" download="resume_PaoloMariaScarlata.pdf" class="btn-glass" title="Download Curriculum Vitae (PDF)">
              <span>Download CV</span>
              <span>↓</span>
            </a>
          </div>
        </div>
      </section>

      <!-- Station 02: LAB (Variant A: 4-Card Holographic Grid) -->
      <section class="station-section variant-a-layout" id="station-section-1" data-station="1">
        <div class="section-header">
          <div class="section-tag">// STATION 02 // LAB // PANORAMIC TESTBEDS</div>
          <h2 class="section-title">Research & Vulnerability Labs</h2>
          <p class="section-desc">Interactive security testbeds simulating real-world exploitation vectors and production-grade defensive mitigations.</p>
        </div>

        <div class="cards-grid">
          ${STATIONS[1].projects.map((proj, pIdx) => `
            <article class="holographic-card" data-project-idx="${pIdx}">
              <div class="card-top">
                <span class="card-index">0${pIdx + 1} // ${proj.badge}</span>
                <span class="card-status ${proj.status === 'production' ? 'production' : ''}">${proj.status}</span>
              </div>

              <h3 class="card-title">${proj.title}</h3>
              <p class="card-desc">${proj.shortDesc}</p>

              <div class="card-tags">
                ${proj.tags.slice(0, 4).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
              </div>

              <div class="card-actions">
                <button class="card-btn inspect-btn" data-project-idx="${pIdx}">
                  <span>Inspect Architecture</span>
                  <span>↗</span>
                </button>
                ${proj.github ? `
                  <a href="${proj.github}" target="_blank" rel="noopener noreferrer" class="card-btn" style="margin-left: auto;">
                    <span>Code</span>
                    <span>🐙</span>
                  </a>
                ` : ''}
              </div>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- Station 03: ARSENAL (Variant A: 4-Quadrant Symmetric Grid) -->
      <section class="station-section variant-a-layout" id="station-section-2" data-station="2">
        <div class="section-header">
          <div class="section-tag">// STATION 03 // ARSENAL // CAPABILITIES</div>
          <h2 class="section-title">Tactical Capabilities & Stack</h2>
          <p class="section-desc">Disciplines cultivated through offensive red-teaming research, application hardening, and high-performance engineering.</p>
        </div>

        <div class="skills-grid">
          ${STATIONS[2].categories.map((cat) => `
            <div class="skill-category-panel">
              <div class="category-header">
                <span class="category-icon">${cat.icon}</span>
                <h3 class="category-title">${cat.title}</h3>
              </div>
              <div class="skill-chips">
                ${cat.skills.map(sk => `
                  <span class="skill-chip">
                    <span class="chip-dot"></span>
                    <span>${sk}</span>
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Station 04: TRANSMISSION (Variant A: Symmetrical Dual Column) -->
      <section class="station-section variant-a-layout" id="station-section-3" data-station="3">
        <div class="section-header">
          <div class="section-tag">// STATION 04 // TRANSMISSION // SECURE UPLINKS</div>
          <h2 class="section-title">Secure Communication & Uplinks</h2>
          <p class="section-desc">Connect directly for security research inquiries, technical collaboration, or engineering opportunities.</p>
        </div>

        <div class="transmission-layout">
          <!-- Terminal Emulation -->
          <div class="terminal-box">
            <div class="terminal-bar">
              <span class="term-dot red"></span>
              <span class="term-dot yellow"></span>
              <span class="term-dot green"></span>
              <span class="term-title">sec-node-01 // bash</span>
            </div>
            <div class="terminal-body">
              ${STATIONS[3].terminal.commands.map(item => `
                <div class="terminal-line">
                  <span class="term-prompt">user@zgr3y:~$</span> <strong>${item.cmd}</strong>
                  <div class="term-out">${item.output}</div>
                </div>
              `).join('')}
              <div class="terminal-line">
                <span class="term-prompt">user@zgr3y:~$</span> <span class="badge-pulse" style="display:inline-block; margin-left:4px;"></span>
              </div>
            </div>
          </div>

          <!-- Direct Channels -->
          <div class="transmission-channels">
            ${STATIONS[3].channels.map(ch => `
              <a href="${ch.url}" ${ch.isDownload ? 'download="resume_PaoloMariaScarlata.pdf"' : 'target="_blank" rel="noopener noreferrer"'} class="channel-card">
                <div class="channel-icon">${ch.icon}</div>
                <div class="channel-info">
                  <h4>${ch.title}</h4>
                  <p>${ch.desc}</p>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  /**
   * VARIANT B: Asymmetric Spatial Cockpit Framing 3D Refractive Glass Sculptures
   */
  renderVariantB() {
    const activeProject = STATIONS[1].projects[this.selectedLabProjectIndex] || STATIONS[1].projects[0];
    const sculp = this.sculptureData[this.currentStationIndex] || this.sculptureData[0];

    this.container.innerHTML = `
      <!-- Station 01: GATEWAY (Variant B: Left-Docked Spatial Cockpit) -->
      <section class="station-section active variant-b-layout" id="station-section-0" data-station="0">
        <div class="cockpit-split-container">
          <div class="cockpit-left-deck glass-panel">
            <div class="deck-tag">
              <span class="badge-pulse"></span>
              <span>STATION 01 // SPATIAL COCKPIT</span>
            </div>

            <h1 class="cockpit-hero-title">${STATIONS[0].hero.name}</h1>
            <div class="cockpit-hero-role">${STATIONS[0].hero.alias} // ${STATIONS[0].hero.role}</div>

            <p class="cockpit-hero-bio">${STATIONS[0].hero.bio}</p>

            <div class="cockpit-anchor-info">
              <span class="anchor-label">3D REFRACTIVE ANCHOR:</span>
              <span class="anchor-val">Dodecahedron Crystal Core (IOR 1.52 // Pentagonal Geometry)</span>
            </div>

            <div class="cockpit-cta-stack">
              <button class="btn-glass btn-glass-primary" data-jump="1">
                <span>Enter Security Lab [02]</span>
                <span>→</span>
              </button>
              <button class="btn-glass" data-jump="2">
                <span>Tactical Arsenal [03]</span>
                <span>⚡</span>
              </button>
              <a href="./resume_PaoloMariaScarlata.pdf" download="resume_PaoloMariaScarlata.pdf" class="btn-glass" title="Download Curriculum Vitae (PDF)">
                <span>Download CV (PDF)</span>
                <span>↓</span>
              </a>
            </div>
          </div>

          <!-- Unobstructed Right Viewport Area for 3D Dodecahedron Anchor -->
          <div class="cockpit-viewport-window" aria-hidden="true">
            <div class="sculpture-reticle">
              <span class="reticle-corner tl"></span>
              <span class="reticle-corner tr"></span>
              <span class="reticle-corner bl"></span>
              <span class="reticle-corner br"></span>
              <div class="reticle-label">3D REFRACTIVE FOCAL ANCHOR</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Station 02: LAB (Variant B: Project Inspector Cockpit) -->
      <section class="station-section variant-b-layout" id="station-section-1" data-station="1">
        <div class="cockpit-split-container">
          <!-- Left: Project Selector List & Live Architecture Inspector -->
          <div class="cockpit-left-deck glass-panel">
            <div class="deck-tag">
              <span class="badge-pulse"></span>
              <span>STATION 02 // RESEARCH LAB COCKPIT</span>
            </div>

            <h2 class="cockpit-deck-title">Security Testbeds & PoCs</h2>

            <div class="cockpit-project-tabs">
              ${STATIONS[1].projects.map((proj, pIdx) => `
                <button class="cockpit-tab-item ${pIdx === this.selectedLabProjectIndex ? 'active' : ''}" data-select-project="${pIdx}">
                  <span class="tab-idx">0${pIdx + 1}</span>
                  <span class="tab-name">${proj.title}</span>
                  <span class="tab-badge">${proj.badge}</span>
                </button>
              `).join('')}
            </div>

            <div class="cockpit-project-preview" id="cockpit-project-preview">
              <div class="preview-header">
                <h3 class="preview-title" id="preview-title">${activeProject.title}</h3>
                <span class="card-status ${activeProject.status === 'production' ? 'production' : ''}" id="preview-status">${activeProject.status}</span>
              </div>
              <p class="preview-desc" id="preview-desc">${activeProject.shortDesc}</p>
              <div class="preview-tags" id="preview-tags">
                ${activeProject.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}
              </div>
              <div class="preview-actions">
                <button class="btn-glass btn-glass-primary inspect-btn" id="preview-inspect-btn" data-project-idx="${this.selectedLabProjectIndex}">
                  <span>Inspect Full Architecture</span>
                  <span>↗</span>
                </button>
                ${activeProject.github ? `
                  <a href="${activeProject.github}" id="preview-github-link" target="_blank" rel="noopener noreferrer" class="btn-glass">
                    <span>GitHub</span>
                    <span>🐙</span>
                  </a>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Unobstructed Right Viewport Area for Dual Crystals -->
          <div class="cockpit-viewport-window" aria-hidden="true">
            <div class="sculpture-reticle">
              <span class="reticle-corner tl"></span>
              <span class="reticle-corner tr"></span>
              <span class="reticle-corner bl"></span>
              <span class="reticle-corner br"></span>
              <div class="reticle-label">DUAL REFRACTIVE CRYSTALLINE PRISMS</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Station 03: ARSENAL (Variant B: Tactical Capability Deck) -->
      <section class="station-section variant-b-layout" id="station-section-2" data-station="2">
        <div class="cockpit-split-container">
          <div class="cockpit-left-deck glass-panel">
            <div class="deck-tag">
              <span class="badge-pulse"></span>
              <span>STATION 03 // TACTICAL ARSENAL DECK</span>
            </div>

            <h2 class="cockpit-deck-title">Capabilities & Disciplines</h2>
            <p class="cockpit-deck-desc">Cultivated through offensive penetration testing, application hardening, and WebGL graphics.</p>

            <div class="cockpit-capability-stack">
              ${STATIONS[2].categories.map((cat) => `
                <div class="cockpit-category-row">
                  <div class="row-header">
                    <span class="row-icon">${cat.icon}</span>
                    <h4 class="row-title">${cat.title}</h4>
                  </div>
                  <div class="row-chips">
                    ${cat.skills.slice(0, 5).map(sk => `<span class="skill-chip"><span class="chip-dot"></span>${sk}</span>`).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Unobstructed Right Viewport Area for Torus Knot Anchor -->
          <div class="cockpit-viewport-window" aria-hidden="true">
            <div class="sculpture-reticle">
              <span class="reticle-corner tl"></span>
              <span class="reticle-corner tr"></span>
              <span class="reticle-corner bl"></span>
              <span class="reticle-corner br"></span>
              <div class="reticle-label">GYROSCOPIC TORUS KNOT // TOPOLOGY ANCHOR</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Station 04: TRANSMISSION (Variant B: Command Console & Uplinks) -->
      <section class="station-section variant-b-layout" id="station-section-3" data-station="3">
        <div class="cockpit-split-container">
          <div class="cockpit-left-deck glass-panel">
            <div class="deck-tag">
              <span class="badge-pulse"></span>
              <span>STATION 04 // TRANSMISSION CONSOLE</span>
            </div>

            <h2 class="cockpit-deck-title">Secure Node Uplinks</h2>

            <div class="terminal-box" style="margin-bottom: 20px;">
              <div class="terminal-bar">
                <span class="term-dot red"></span>
                <span class="term-dot yellow"></span>
                <span class="term-dot green"></span>
                <span class="term-title">sec-node-01 // bash</span>
              </div>
              <div class="terminal-body">
                ${STATIONS[3].terminal.commands.map(item => `
                  <div class="terminal-line">
                    <span class="term-prompt">zgr3y@sec:~$</span> <strong>${item.cmd}</strong>
                    <div class="term-out">${item.output}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="cockpit-uplinks-grid">
              ${STATIONS[3].channels.map(ch => `
                <a href="${ch.url}" ${ch.isDownload ? 'download="resume_PaoloMariaScarlata.pdf"' : 'target="_blank" rel="noopener noreferrer"'} class="channel-card">
                  <div class="channel-icon">${ch.icon}</div>
                  <div class="channel-info">
                    <h4>${ch.title}</h4>
                    <p>${ch.desc}</p>
                  </div>
                </a>
              `).join('')}
            </div>
          </div>

          <!-- Unobstructed Right Viewport Area for Quantum Beacon Octahedron -->
          <div class="cockpit-viewport-window" aria-hidden="true">
            <div class="sculpture-reticle">
              <span class="reticle-corner tl"></span>
              <span class="reticle-corner tr"></span>
              <span class="reticle-corner bl"></span>
              <span class="reticle-corner br"></span>
              <div class="reticle-label">QUANTUM BEACON // OCTAHEDRAL ANCHOR</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Dedicated 3D Sculpture Inspector HUD (Variant B Feature) -->
      <aside class="sculpture-inspector-hud" aria-label="3D Glass Sculpture Inspector">
        <div class="inspector-header">
          <span class="badge-pulse"></span>
          <span class="inspector-tag">3D ANCHOR INSPECTOR</span>
        </div>
        <div class="inspector-name" id="sculpture-hud-name">${sculp.name}</div>
        <div class="inspector-meta" id="sculpture-hud-facets">${sculp.facets} // IOR ${sculp.ior}</div>

        <div class="inspector-controls">
          <div class="control-row">
            <span class="control-lbl">Rotation:</span>
            <div class="control-btn-group" id="sculp-speed-group">
              <button class="ctrl-btn ${this.sculptureSpeed === 1 ? 'active' : ''}" data-speed="1">1x</button>
              <button class="ctrl-btn ${this.sculptureSpeed === 2 ? 'active' : ''}" data-speed="2">2x</button>
              <button class="ctrl-btn ${this.sculptureSpeed === 0 ? 'active' : ''}" data-speed="0">Pause</button>
            </div>
          </div>

          <div class="control-row">
            <span class="control-lbl">Mode:</span>
            <div class="control-btn-group" id="sculp-mode-group">
              <button class="ctrl-btn ${this.sculptureMode === 'glass' ? 'active' : ''}" data-mode="glass">Glass</button>
              <button class="ctrl-btn ${this.sculptureMode === 'wireframe' ? 'active' : ''}" data-mode="wireframe">Wire</button>
              <button class="ctrl-btn ${this.sculptureMode === 'hybrid' ? 'active' : ''}" data-mode="hybrid">Hybrid</button>
            </div>
          </div>
        </div>
      </aside>
    `;
  }

  bindDOMEvents() {
    // Jump buttons
    this.container.querySelectorAll('[data-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = parseInt(btn.dataset.jump, 10);
        this.onStationJump(target);
      });
    });

    // Inspect buttons
    this.container.querySelectorAll('.inspect-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pIdx = parseInt(btn.dataset.projectIdx, 10);
        const project = STATIONS[1].projects[pIdx];
        if (project) {
          this.onProjectInspect(project);
        }
      });
    });

    // Variant A Card Clicks
    this.container.querySelectorAll('.holographic-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const pIdx = parseInt(card.dataset.projectIdx, 10);
        const project = STATIONS[1].projects[pIdx];
        if (project) {
          this.onProjectInspect(project);
        }
      });

      card.addEventListener('mouseenter', () => {
        this.onAudioHover();
      });
    });

    // Variant B Project Tab Switching
    this.container.querySelectorAll('[data-select-project]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pIdx = parseInt(btn.dataset.selectProject, 10);
        this.selectedLabProjectIndex = pIdx;
        this.updateVariantBProjectPreview(pIdx);
        this.onAudioHover();
      });
    });

    // Variant B Sculpture Speed Controls
    this.container.querySelectorAll('[data-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.sculptureSpeed = speed;
        this.container.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.onSculptureControl({ type: 'speed', value: speed });
      });
    });

    // Variant B Sculpture Wireframe Controls
    this.container.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.sculptureMode = mode;
        this.container.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.onSculptureControl({ type: 'mode', value: mode });
      });
    });
  }

  updateVariantBProjectPreview(projectIdx) {
    const project = STATIONS[1].projects[projectIdx];
    if (!project) return;

    // Update active tab button
    this.container.querySelectorAll('.cockpit-tab-item').forEach((tab, i) => {
      tab.classList.toggle('active', i === projectIdx);
    });

    const previewTitle = this.container.querySelector('#preview-title');
    const previewStatus = this.container.querySelector('#preview-status');
    const previewDesc = this.container.querySelector('#preview-desc');
    const previewTags = this.container.querySelector('#preview-tags');
    const previewInspect = this.container.querySelector('#preview-inspect-btn');
    const previewGithub = this.container.querySelector('#preview-github-link');

    if (previewTitle) previewTitle.textContent = project.title;
    if (previewStatus) {
      previewStatus.textContent = project.status;
      previewStatus.className = `card-status ${project.status === 'production' ? 'production' : ''}`;
    }
    if (previewDesc) previewDesc.textContent = project.shortDesc;
    if (previewTags) {
      previewTags.innerHTML = project.tags.map(t => `<span class="card-tag">${t}</span>`).join('');
    }
    if (previewInspect) {
      previewInspect.dataset.projectIdx = projectIdx;
    }
    if (previewGithub) {
      previewGithub.href = project.github || '#';
      previewGithub.style.display = project.github ? 'inline-flex' : 'none';
    }
  }

  initCardTiltEffects() {
    const cards = this.container.querySelectorAll('.holographic-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;
        card.style.setProperty('--mouse-x', `${pctX}%`);
        card.style.setProperty('--mouse-y', `${pctY}%`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '50%');
      });
    });
  }
}
