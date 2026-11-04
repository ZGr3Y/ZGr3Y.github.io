import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './prototype.css';

/**
 * Prototype 2.0: 3D Narrative Journey Aesthetic Explorer
 * A rapid-exploration prototype to visualize, light, frame, and stress-test
 * the 5 Acts of the Phase 2 Narrative Journey in Three.js across 3 distinct aesthetic directions.
 */
export class PrototypeJourneyApp {
  constructor() {
    this.container = null;
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.orbitControls = null;
    this.gltfLoader = new GLTFLoader();

    // Active state
    this.activeVariant = 'A'; // 'A' | 'B' | 'C'
    this.activeActIndex = 0;
    this.isFreeOrbit = false;
    this.isShattered = false;

    // Camera waypoint interpolation
    this.camCurrentPos = new THREE.Vector3(0, 0.4, 4.5);
    this.camTargetPos = new THREE.Vector3(0, 0.4, 4.5);
    this.lookCurrent = new THREE.Vector3(0, 0, 0);
    this.lookTarget = new THREE.Vector3(0, 0, 0);

    // Mouse / Raycaster
    this.pointer = new THREE.Vector2(-999, -999);
    this.raycaster = new THREE.Raycaster();
    this.hoveredInteractive = null;

    // Models & objects registry
    this.models = {};
    this.lights = {};
    this.environmentObjects = [];
    this.particles = null;
    this.shards = [];

    // Animation loop & timing
    this.clock = new THREE.Clock();
    this.animFrameId = null;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.currentFps = 60;

    // Act waypoints definitions
    this.acts = [
      {
        id: 'act0',
        tag: 'ACT 00 // NARRATIVE LOADER',
        title: "DON'T PANIC",
        desc: "The Hitchhiker's Guide 3D volume drifting in studio space, with the 42-glitch circular HUD and normalized scale.",
        camPos: new THREE.Vector3(0, 0.4, 4.5),
        lookAt: new THREE.Vector3(0, 0, 0)
      },
      {
        id: 'act1',
        tag: 'ACT 01 // THE ARCHITECTURAL HORIZON',
        title: 'Matrix White Room',
        desc: 'Infinite spatial gallery and clean architectural environment. Camera drifts gently forward with depth perception.',
        camPos: new THREE.Vector3(0, 1.2, -32),
        lookAt: new THREE.Vector3(0, 1.0, -48)
      },
      {
        id: 'act2',
        tag: 'ACT 02 // CREATION OF INTELLIGENCE',
        title: 'The Pill Choice',
        desc: 'Human Hand (Experiences / Blue) vs Robotic Hand (Harness / Red). Interactive hover lights up glowing capsules.',
        camPos: new THREE.Vector3(55, 1.4, 5.2),
        lookAt: new THREE.Vector3(55, 0.9, 0)
      },
      {
        id: 'act3a',
        tag: 'ACT 03-A // EXPERIENCES',
        title: 'Blade Runner Unicorns',
        desc: '3 Origami Unicorns hovering in an arc, representing distributed engineering artifacts with pearlescent finish.',
        camPos: new THREE.Vector3(110, 1.4, -18),
        lookAt: new THREE.Vector3(110, 0.9, -25)
      },
      {
        id: 'act3b',
        tag: 'ACT 03-B // HARNESS',
        title: 'Portal 2 Wheatley Core',
        desc: 'Wheatley Personality Core with dynamic pupil tracking your cursor, encircled by multi-speed orbital rings.',
        camPos: new THREE.Vector3(110, 1.6, 32),
        lookAt: new THREE.Vector3(110, 1.2, 25)
      },
      {
        id: 'act4',
        tag: 'ACT 04 // HORIZON CROSSING',
        title: "Rick's Ship & Shatter",
        desc: "Rick's Space Cruiser cutting through the spatial horizon with thruster plasma. Click 'Shatter Horizon' to trigger shards.",
        camPos: new THREE.Vector3(165, 1.2, 7.5),
        lookAt: new THREE.Vector3(165, 0.8, 0)
      }
    ];

    // Variant metadata
    this.variants = {
      A: {
        name: 'Dieter Rams / Apple Studio',
        bg: '#EAECEF',
        desc: 'High-key studio lighting, soft architectural shadows, and pure Swiss typography.'
      },
      B: {
        name: 'Cyber-Minimalist (Holo Grid)',
        bg: '#E2E5E9',
        desc: 'Precision holographic ground grid, high-contrast directional lighting, and cyan/red accents.'
      },
      C: {
        name: 'Cinematic Depth & Atmospheric Fog',
        bg: '#ECEEF1',
        desc: 'Warm/cool split studio rim lighting, atmospheric depth fog, and drifting micro-particles.'
      }
    };
  }

  /**
   * Mounts the prototype inside the target DOM container
   * @param {HTMLElement} mountEl
   */
  async mount(mountEl) {
    this.container = mountEl;
    this.container.innerHTML = '';

    // Initialize variant from URL search param if present
    const urlParams = new URLSearchParams(window.location.search);
    const initialVariant = urlParams.get('variant')?.toUpperCase();
    if (initialVariant && this.variants[initialVariant]) {
      this.activeVariant = initialVariant;
    }

    this._buildDOM();
    this._initThree();
    this._setupControls();
    this._setupEventListeners();

    // Apply initial lighting variant
    this.applyVariant(this.activeVariant);

    // Load all models asynchronously with loading screen
    await this._loadAllModels();

    // Start render loop
    this.clock.start();
    this._startLoop();

    // Hide loader screen
    const loaderScreen = this.container.querySelector('.proto-loader-screen');
    if (loaderScreen) {
      loaderScreen.classList.add('hidden');
      setTimeout(() => loaderScreen.remove(), 600);
    }
  }

  /**
   * Builds the interactive UI overlay
   * @private
   */
  _buildDOM() {
    this.root = document.createElement('div');
    this.root.id = 'prototype-root';

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'prototype-canvas';
    this.root.appendChild(this.canvas);

    // Top Telemetry HUD
    const hudTop = document.createElement('div');
    hudTop.className = 'proto-hud-top';
    hudTop.innerHTML = `
      <div class="proto-brand">
        <div class="proto-title">
          <span class="proto-status-dot"></span>
          <span>NARRATIVE 3D JOURNEY // PROTOTYPE 2.0</span>
        </div>
        <div class="proto-subtitle">ZGr3Y Spatial Architecture • Phase 2 Sprint</div>
      </div>
      <div class="proto-telemetry-badge">
        <span class="proto-fps">FPS: --</span>
        <span class="proto-cam-pos">CAM: [0, 0, 0]</span>
        <span class="proto-variant-badge">STYLE: ${this.activeVariant}</span>
      </div>
    `;
    this.root.appendChild(hudTop);

    // Center Narrative Overlay
    this.narrativeOverlay = document.createElement('div');
    this.narrativeOverlay.className = 'proto-narrative-overlay';
    this._updateNarrativeOverlay();
    this.root.appendChild(this.narrativeOverlay);

    // Interactive Pill Tooltip
    this.pillTooltip = document.createElement('div');
    this.pillTooltip.className = 'proto-interactive-pill';
    this.root.appendChild(this.pillTooltip);

    // Floating Bottom Dock
    const dock = document.createElement('div');
    dock.className = 'proto-dock';

    // 1. Acts Tabs Bar
    const actsBar = document.createElement('div');
    actsBar.className = 'proto-acts-bar';
    this.acts.forEach((act, idx) => {
      const btn = document.createElement('button');
      btn.className = `proto-act-btn ${idx === this.activeActIndex ? 'active' : ''}`;
      btn.dataset.actIndex = idx;
      btn.textContent = act.title;
      btn.addEventListener('click', () => this.goToAct(idx));
      actsBar.appendChild(btn);
    });
    dock.appendChild(actsBar);

    // 2. Secondary Controls Row (Variant Switcher + Cam Mode + Shatter)
    const controlsRow = document.createElement('div');
    controlsRow.className = 'proto-controls-row';

    // Variant Switcher Pill
    const variantSwitcher = document.createElement('div');
    variantSwitcher.className = 'proto-variant-switcher';
    variantSwitcher.innerHTML = `
      <button class="proto-arrow-btn prev-variant" title="Previous visual style (←)">←</button>
      <span class="proto-variant-label">${this.activeVariant} (${this.variants[this.activeVariant].name})</span>
      <button class="proto-arrow-btn next-variant" title="Next visual style (→)">→</button>
    `;
    variantSwitcher.querySelector('.prev-variant').addEventListener('click', () => this.cycleVariant(-1));
    variantSwitcher.querySelector('.next-variant').addEventListener('click', () => this.cycleVariant(1));
    controlsRow.appendChild(variantSwitcher);

    // Cam Mode Toggle
    const camBtn = document.createElement('button');
    camBtn.className = 'proto-tool-btn cam-toggle-btn';
    camBtn.innerHTML = `<span>🎥</span><span>Cinematic View</span>`;
    camBtn.addEventListener('click', () => this.toggleFreeOrbit());
    controlsRow.appendChild(camBtn);

    // Shatter Horizon Button
    const shatterBtn = document.createElement('button');
    shatterBtn.className = 'proto-tool-btn shatter-btn';
    shatterBtn.innerHTML = `<span>💥</span><span>Shatter Horizon</span>`;
    shatterBtn.addEventListener('click', () => this.triggerShatter());
    controlsRow.appendChild(shatterBtn);

    dock.appendChild(controlsRow);
    this.root.appendChild(dock);

    // Loading overlay
    const loaderScreen = document.createElement('div');
    loaderScreen.className = 'proto-loader-screen';
    loaderScreen.innerHTML = `
      <div class="proto-spinner"></div>
      <div class="proto-loader-text">PREPARING 3D NARRATIVE ASSETS...</div>
    `;
    this.root.appendChild(loaderScreen);

    this.container.appendChild(this.root);
  }

  /**
   * Initializes Three.js Scene, Camera, and WebGLRenderer
   * @private
   */
  _initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.variants[this.activeVariant].bg);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    this.camera.position.copy(this.acts[0].camPos);
    this.camera.lookAt(this.acts[0].lookAt);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // OrbitControls for Free Inspection mode
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.enabled = false; // Disabled by default in Cinematic mode
  }

  /**
   * Builds the lights and environmental elements
   * @private
   */
  _setupControls() {
    // 1. Ambient Light
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(this.lights.ambient);

    // 2. Main Studio Directional Key Light with Soft Shadows
    this.lights.key = new THREE.DirectionalLight(0xffffff, 1.8);
    this.lights.key.position.set(20, 30, 25);
    this.lights.key.castShadow = true;
    this.lights.key.shadow.mapSize.width = 2048;
    this.lights.key.shadow.mapSize.height = 2048;
    this.lights.key.shadow.camera.near = 0.5;
    this.lights.key.shadow.camera.far = 150;
    this.lights.key.shadow.bias = -0.0005;
    this.scene.add(this.lights.key);

    // 3. Fill Light
    this.lights.fill = new THREE.DirectionalLight(0xdbeafe, 0.8);
    this.lights.fill.position.set(-20, 15, -15);
    this.scene.add(this.lights.fill);

    // 4. Accent Lights for Cyber-Minimalist Variant
    this.lights.cyan = new THREE.PointLight(0x00f0ff, 0, 25);
    this.lights.cyan.position.set(52, 2.5, 2);
    this.scene.add(this.lights.cyan);

    this.lights.red = new THREE.PointLight(0xff0055, 0, 25);
    this.lights.red.position.set(58, 2.5, 2);
    this.scene.add(this.lights.red);

    // 5. Holographic Ground Grid (for Variant B)
    this.gridHelper = new THREE.GridHelper(500, 100, 0x94a3b8, 0xcbd5e1);
    this.gridHelper.position.y = -0.5;
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);

    // 6. Ambient Floating Dust Particles (for Variant C)
    this._createDustParticles();
  }

  /**
   * Creates ambient micro-particles for atmospheric depth
   * @private
   */
  _createDustParticles() {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x64748b,
      size: 0.12,
      transparent: true,
      opacity: 0.35,
      blending: THREE.NormalBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.visible = false;
    this.scene.add(this.particles);
  }

  /**
   * Loads all 7 GLTF models asynchronously and positions them across the 5 Acts
   * @private
   */
  async _loadAllModels() {
    const loadGLTF = (path) =>
      new Promise((resolve) => {
        this.gltfLoader.load(
          path,
          (gltf) => resolve(gltf.scene),
          undefined,
          (err) => {
            console.warn(`Failed loading model: ${path}`, err);
            resolve(null);
          }
        );
      });

    // Load models in parallel
    const [book, whiteRoom, humanHand, roboticHand, unicorn, wheatley, ricksShip] =
      await Promise.all([
        loadGLTF('./models/the_hitchhikers_guide_to_the_galaxy.glb'),
        loadGLTF('./models/the_matrix_white_room.glb'),
        loadGLTF('./models/hand.glb'),
        loadGLTF('./models/robotic_hand.glb'),
        loadGLTF('./models/origami_unicorn_from_blade_runner.glb'),
        loadGLTF('./models/portal_2_wheatly_rig.glb'),
        loadGLTF('./models/ricks_ship_from_rick_and_morty.glb')
      ]);

    // Setup Act 0: Hitchhiker's Guide
    if (book) {
      this._normalizeAndCenter(book, 2.6);
      book.position.set(0, 0, 0);
      book.rotation.set(0.12, 0.2, 0);
      this._enableShadows(book);
      this.scene.add(book);
      this.models.book = book;
    }

    // Setup Act 1: Matrix White Room
    if (whiteRoom) {
      this._normalizeAndCenter(whiteRoom, 28);
      whiteRoom.position.set(0, -0.5, -45);
      this._enableShadows(whiteRoom);
      this.scene.add(whiteRoom);
      this.models.whiteRoom = whiteRoom;
    }

    // Setup Act 2: The Pill Choice (Hands of Creation)
    const pillChoiceGroup = new THREE.Group();
    pillChoiceGroup.position.set(55, 0, 0);

    if (humanHand) {
      this._normalizeAndCenter(humanHand, 2.8);
      humanHand.position.set(-2.5, 0.8, 0);
      humanHand.rotation.set(0.2, 0.4, -0.2);
      this._enableShadows(humanHand);
      pillChoiceGroup.add(humanHand);

      // Blue Pill capsule
      const bluePillGeo = new THREE.CapsuleGeometry(0.12, 0.35, 12, 24);
      const bluePillMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0077ff,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.8
      });
      const bluePill = new THREE.Mesh(bluePillGeo, bluePillMat);
      bluePill.name = 'BluePill';
      bluePill.position.set(-2.3, 1.25, 0.2);
      bluePill.rotation.set(0.4, 0.2, 0.8);
      pillChoiceGroup.add(bluePill);
      this.models.bluePill = bluePill;
    }

    if (roboticHand) {
      this._normalizeAndCenter(roboticHand, 2.8);
      roboticHand.position.set(2.5, 0.8, 0);
      roboticHand.rotation.set(0.2, -0.4, 0.2);
      this._enableShadows(roboticHand);
      pillChoiceGroup.add(roboticHand);

      // Red Pill capsule
      const redPillGeo = new THREE.CapsuleGeometry(0.12, 0.35, 12, 24);
      const redPillMat = new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        emissive: 0xff0033,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.8
      });
      const redPill = new THREE.Mesh(redPillGeo, redPillMat);
      redPill.name = 'RedPill';
      redPill.position.set(2.3, 1.25, 0.2);
      redPill.rotation.set(-0.4, -0.2, -0.8);
      pillChoiceGroup.add(redPill);
      this.models.redPill = redPill;
    }

    this.scene.add(pillChoiceGroup);
    this.models.pillChoice = pillChoiceGroup;

    // Setup Act 3A: 3 Blade Runner Origami Unicorns
    if (unicorn) {
      const unicornGroup = new THREE.Group();
      unicornGroup.position.set(110, 0, -25);

      const configs = [
        { x: -3.2, z: 0.4, rot: 0.3, label: 'CTF LAB & EXPLOITATION' },
        { x: 0, z: -0.6, rot: 0, label: 'SENTINEL CLOUD SIEM' },
        { x: 3.2, z: 0.4, rot: -0.3, label: 'AUTONOMOUS AGENT PLATFORM' }
      ];

      this.models.unicorns = [];

      configs.forEach((cfg) => {
        const u = unicorn.clone();
        this._normalizeAndCenter(u, 1.6);
        u.position.set(cfg.x, 0.8, cfg.z);
        u.rotation.y = cfg.rot;
        u.userData = { label: cfg.label, baseY: 0.8, phase: Math.random() * Math.PI * 2 };
        this._enableShadows(u);
        unicornGroup.add(u);
        this.models.unicorns.push(u);
      });

      this.scene.add(unicornGroup);
    }

    // Setup Act 3B: Portal 2 Wheatley & Orbital Rings
    if (wheatley) {
      const wheatleyGroup = new THREE.Group();
      wheatleyGroup.position.set(110, 0, 25);

      this._normalizeAndCenter(wheatley, 2.2);
      wheatley.position.set(0, 1.2, 0);
      this._enableShadows(wheatley);
      wheatleyGroup.add(wheatley);
      this.models.wheatley = wheatley;

      // 3 Tech Orbital Rings
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.9,
        wireframe: true
      });

      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.02, 8, 48), ringMat);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.02, 8, 48), ringMat);
      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.02, 8, 48), ringMat);

      ring1.rotation.x = Math.PI / 4;
      ring2.rotation.y = Math.PI / 3;
      ring3.rotation.z = Math.PI / 6;

      ring1.position.y = 1.2;
      ring2.position.y = 1.2;
      ring3.position.y = 1.2;

      wheatleyGroup.add(ring1);
      wheatleyGroup.add(ring2);
      wheatleyGroup.add(ring3);

      this.models.wheatleyRings = [ring1, ring2, ring3];
      this.scene.add(wheatleyGroup);
    }

    // Setup Act 4: Rick's Space Cruiser
    if (ricksShip) {
      this._normalizeAndCenter(ricksShip, 3.2);
      ricksShip.position.set(165, 0.8, 0);
      ricksShip.rotation.set(0.15, -0.4, 0.1);
      this._enableShadows(ricksShip);
      this.scene.add(ricksShip);
      this.models.ricksShip = ricksShip;
    }
  }

  /**
   * Normalizes geometry scale using bounding box
   * @private
   */
  _normalizeAndCenter(model, targetSize) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (Number.isFinite(maxDim) && maxDim > 0) {
      const scale = targetSize / maxDim;
      model.scale.set(scale, scale, scale);
    }
  }

  /**
   * Enables cast and receive shadows recursively
   * @private
   */
  _enableShadows(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Applies one of the 3 aesthetic directions
   * @param {'A' | 'B' | 'C'} variant
   */
  applyVariant(variant) {
    this.activeVariant = variant;
    const config = this.variants[variant];

    // Background color
    this.scene.background = new THREE.Color(config.bg);
    this.root.style.setProperty('--proto-bg', config.bg);

    if (variant === 'A') {
      // Variant A: Dieter Rams / Apple High-Key Studio
      this.scene.fog = new THREE.Fog(config.bg, 25, 120);
      this.lights.ambient.intensity = 1.35;
      this.lights.ambient.color.setHex(0xffffff);
      this.lights.key.intensity = 1.9;
      this.lights.key.color.setHex(0xffffff);
      this.lights.fill.intensity = 0.8;
      this.lights.cyan.intensity = 0;
      this.lights.red.intensity = 0;
      this.gridHelper.visible = false;
      if (this.particles) this.particles.visible = false;
      this.renderer.toneMappingExposure = 1.15;
    } else if (variant === 'B') {
      // Variant B: Cyber-Minimalist (Holo Grid & Accent Lights)
      this.scene.fog = new THREE.Fog(config.bg, 18, 90);
      this.lights.ambient.intensity = 0.9;
      this.lights.ambient.color.setHex(0xcad2d9);
      this.lights.key.intensity = 2.4;
      this.lights.key.color.setHex(0xffffff);
      this.lights.fill.intensity = 0.5;
      this.lights.cyan.intensity = 3.0;
      this.lights.red.intensity = 3.0;
      this.gridHelper.visible = true;
      if (this.particles) this.particles.visible = false;
      this.renderer.toneMappingExposure = 1.25;
    } else if (variant === 'C') {
      // Variant C: Cinematic Depth & Atmospheric Fog
      this.scene.fog = new THREE.FogExp2(config.bg, 0.022);
      this.lights.ambient.intensity = 1.1;
      this.lights.ambient.color.setHex(0xdde3ea);
      this.lights.key.intensity = 2.2;
      this.lights.key.color.setHex(0xfff1e0); // Warm studio key
      this.lights.fill.intensity = 1.2;
      this.lights.fill.color.setHex(0xc8d6e5); // Cool sky fill
      this.lights.cyan.intensity = 0.5;
      this.lights.red.intensity = 0.5;
      this.gridHelper.visible = false;
      if (this.particles) this.particles.visible = true;
      this.renderer.toneMappingExposure = 1.1;
    }

    // Update URL and HUD
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant);
    window.history.replaceState({}, '', url.toString());

    const label = this.root.querySelector('.proto-variant-label');
    if (label) {
      label.textContent = `${variant} (${config.name})`;
    }

    const badge = this.root.querySelector('.proto-variant-badge');
    if (badge) {
      badge.textContent = `STYLE: ${variant}`;
    }
  }

  /**
   * Cycles through variants A -> B -> C -> A
   * @param {number} dir
   */
  cycleVariant(dir = 1) {
    const keys = Object.keys(this.variants);
    const currIdx = keys.indexOf(this.activeVariant);
    const nextIdx = (currIdx + dir + keys.length) % keys.length;
    this.applyVariant(keys[nextIdx]);
  }

  /**
   * Flies the camera smoothly to the target Act waypoint
   * @param {number} index
   */
  goToAct(index) {
    if (index < 0 || index >= this.acts.length) return;
    this.activeActIndex = index;
    const act = this.acts[index];

    // If currently in free orbit, transition smoothly back to waypoint
    if (this.isFreeOrbit) {
      this.toggleFreeOrbit(false);
    }

    this.camTargetPos.copy(act.camPos);
    this.lookTarget.copy(act.lookAt);

    // Update active tab style
    const btns = this.root.querySelectorAll('.proto-act-btn');
    btns.forEach((btn, idx) => {
      btn.classList.toggle('active', idx === index);
    });

    this._updateNarrativeOverlay();
  }

  /**
   * Updates center narrative text
   * @private
   */
  _updateNarrativeOverlay() {
    const act = this.acts[this.activeActIndex];
    if (!this.narrativeOverlay) return;

    this.narrativeOverlay.style.opacity = '0';
    this.narrativeOverlay.style.transform = 'translateY(10px)';

    setTimeout(() => {
      this.narrativeOverlay.innerHTML = `
        <div class="proto-act-tag">${act.tag}</div>
        <h1 class="proto-act-heading">${act.title}</h1>
        <p class="proto-act-desc">${act.desc}</p>
      `;
      this.narrativeOverlay.style.opacity = '1';
      this.narrativeOverlay.style.transform = 'translateY(0)';
    }, 200);
  }

  /**
   * Toggles between cinematic locked waypoints and free orbit inspection
   * @param {boolean} [forced]
   */
  toggleFreeOrbit(forced) {
    this.isFreeOrbit = typeof forced === 'boolean' ? forced : !this.isFreeOrbit;
    this.orbitControls.enabled = this.isFreeOrbit;

    const camBtn = this.root.querySelector('.cam-toggle-btn');
    if (camBtn) {
      camBtn.classList.toggle('active', this.isFreeOrbit);
      camBtn.innerHTML = this.isFreeOrbit
        ? `<span>🔍</span><span>Free Orbit (Active)</span>`
        : `<span>🎥</span><span>Cinematic View</span>`;
    }

    if (this.isFreeOrbit) {
      this.orbitControls.target.copy(this.lookCurrent);
      this.orbitControls.update();
    }
  }

  /**
   * Procedural Screen Shatter effect (Act 4 transition)
   */
  triggerShatter() {
    // Jump to Act 4 first
    this.goToAct(5);

    // Clean up any existing shards
    this.shards.forEach((s) => this.scene.remove(s));
    this.shards = [];

    const shardCount = 60;
    const shardMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
      thickness: 0.2
    });

    for (let i = 0; i < shardCount; i++) {
      const geo = new THREE.ConeGeometry(0.3 + Math.random() * 0.4, 0.8 + Math.random() * 0.5, 3);
      const shard = new THREE.Mesh(geo, shardMat);

      // Spawn in front of camera
      shard.position.set(
        this.camera.position.x + (Math.random() - 0.5) * 5,
        this.camera.position.y + (Math.random() - 0.5) * 3,
        this.camera.position.z - 2 + (Math.random() - 0.5) * 2
      );

      shard.userData = {
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15 - 0.05,
        vz: Math.random() * 0.1 + 0.05,
        rotX: (Math.random() - 0.5) * 0.2,
        rotY: (Math.random() - 0.5) * 0.2
      };

      this.scene.add(shard);
      this.shards.push(shard);
    }
  }

  /**
   * DOM and pointer event listeners
   * @private
   */
  _setupEventListeners() {
    window.addEventListener('resize', () => this._onResize());

    // Keyboard cycling (Arrow Left / Right) per prototype guidelines
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        this.cycleVariant(1);
      } else if (e.key === 'ArrowLeft') {
        this.cycleVariant(-1);
      } else if (e.key >= '0' && e.key <= '5') {
        this.goToAct(parseInt(e.key, 10));
      }
    });

    // Pointer move for Raycasting & Wheatley Eye tracking
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Update interactive pill tooltip position
      if (this.pillTooltip) {
        this.pillTooltip.style.left = `${e.clientX}px`;
        this.pillTooltip.style.top = `${e.clientY - 12}px`;
      }
    });

    // Pill click interaction
    this.canvas.addEventListener('click', () => {
      if (this.hoveredInteractive === 'BluePill') {
        this.goToAct(3); // Jump to Act 3A (Unicorns)
      } else if (this.hoveredInteractive === 'RedPill') {
        this.goToAct(4); // Jump to Act 3B (Wheatley)
      }
    });
  }

  _onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Main animation loop
   * @private
   */
  _startLoop() {
    const render = () => {
      this.animFrameId = requestAnimationFrame(render);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // FPS Calculation
      this.frameCount++;
      if (elapsed - this.lastFpsUpdate >= 0.5) {
        this.currentFps = Math.round((this.frameCount / (elapsed - this.lastFpsUpdate)));
        this.frameCount = 0;
        this.lastFpsUpdate = elapsed;
        const fpsEl = this.root.querySelector('.proto-fps');
        if (fpsEl) fpsEl.textContent = `FPS: ${this.currentFps}`;
      }

      // Camera Waypoint Interpolation (when not in free orbit)
      if (!this.isFreeOrbit) {
        this.camCurrentPos.lerp(this.camTargetPos, 0.05);
        this.lookCurrent.lerp(this.lookTarget, 0.05);
        this.camera.position.copy(this.camCurrentPos);
        this.camera.lookAt(this.lookCurrent);
      } else {
        this.orbitControls.update();
      }

      // Update Camera Telemetry in HUD
      const camPosEl = this.root.querySelector('.proto-cam-pos');
      if (camPosEl) {
        const p = this.camera.position;
        camPosEl.textContent = `CAM: [${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}]`;
      }

      // Model Animations
      // 1. Hitchhiker Book: slow floating and continuous subtle spin
      if (this.models.book) {
        this.models.book.rotation.y += delta * 0.35;
        this.models.book.position.y = Math.sin(elapsed * 1.5) * 0.08;
      }

      // 2. Pill capsules subtle floating
      if (this.models.bluePill) {
        this.models.bluePill.position.y = 1.25 + Math.sin(elapsed * 2) * 0.04;
      }
      if (this.models.redPill) {
        this.models.redPill.position.y = 1.25 + Math.sin(elapsed * 2 + 1) * 0.04;
      }

      // 3. Origami Unicorns bobbing
      if (this.models.unicorns) {
        this.models.unicorns.forEach((u) => {
          u.position.y = u.userData.baseY + Math.sin(elapsed * 1.8 + u.userData.phase) * 0.06;
          u.rotation.y += delta * 0.15;
        });
      }

      // 4. Wheatley Eye tracking & Orbital rings rotation
      if (this.models.wheatley) {
        // Wheatley body slight tilt towards pointer
        this.models.wheatley.rotation.y = this.pointer.x * 0.4;
        this.models.wheatley.rotation.x = -this.pointer.y * 0.25;
      }
      if (this.models.wheatleyRings) {
        this.models.wheatleyRings[0].rotation.z += delta * 0.8;
        this.models.wheatleyRings[1].rotation.x += delta * 0.5;
        this.models.wheatleyRings[2].rotation.y += delta * 0.3;
      }

      // 5. Rick's Ship banking
      if (this.models.ricksShip) {
        this.models.ricksShip.position.y = 0.8 + Math.sin(elapsed * 2.2) * 0.08;
        this.models.ricksShip.rotation.z = Math.sin(elapsed * 1.5) * 0.08;
      }

      // 6. Shards physics update
      if (this.shards.length > 0) {
        this.shards.forEach((s) => {
          s.position.x += s.userData.vx;
          s.position.y += s.userData.vy;
          s.position.z += s.userData.vz;
          s.rotation.x += s.userData.rotX;
          s.rotation.y += s.userData.rotY;
        });
      }

      // 7. Raycasting for interactive Pills
      this._updateRaycaster();

      this.renderer.render(this.scene, this.camera);
    };

    render();
  }

  /**
   * Raycasts pointer against interactive pill capsules
   * @private
   */
  _updateRaycaster() {
    if (!this.models.bluePill || !this.models.redPill) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects([this.models.bluePill, this.models.redPill]);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      this.hoveredInteractive = hit.name;

      if (hit.name === 'BluePill') {
        this.pillTooltip.className = 'proto-interactive-pill visible blue';
        this.pillTooltip.textContent = 'CHOOSE BLUE PILL: EXPERIENCES (PROJECTS)';
        hit.scale.set(1.2, 1.2, 1.2);
        this.canvas.style.cursor = 'pointer';
      } else if (hit.name === 'RedPill') {
        this.pillTooltip.className = 'proto-interactive-pill visible red';
        this.pillTooltip.textContent = 'CHOOSE RED PILL: HARNESS (SYSTEM DEPTH)';
        hit.scale.set(1.2, 1.2, 1.2);
        this.canvas.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredInteractive) {
        if (this.models.bluePill) this.models.bluePill.scale.set(1, 1, 1);
        if (this.models.redPill) this.models.redPill.scale.set(1, 1, 1);
        this.canvas.style.cursor = 'default';
        this.pillTooltip.className = 'proto-interactive-pill';
      }
      this.hoveredInteractive = null;
    }
  }

  /**
   * Cleans up resources, event listeners, and WebGL allocations
   */
  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.orbitControls) {
      this.orbitControls.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
  }
}
