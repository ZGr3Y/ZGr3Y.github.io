import * as THREE from 'three';
import { disposeThreeObject } from '../utils/threeUtils.js';

const HAND_NORMALIZED_SIZE = 1.25;

/**
 * PillChoiceAct — Act 02 Scene Coordinator (Creation of Intelligence & Pill Choice)
 * Renders human hand holding a procedural glowing blue pill (left) and robotic hand
 * holding a procedural glowing red pill (right). Both palms face open toward the camera
 * with gentle organic hover/floating physics. Raycasting registers pointer hover and selection clicks.
 */
export class PillChoiceAct {
  /**
   * @param {Object} options
   * @param {THREE.Scene} options.scene
   * @param {THREE.PerspectiveCamera} options.camera
   * @param {THREE.Vector3} [options.roomPosition] - Spatial center anchor
   * @param {Function} [options.onSelect] - Callback when pill is selected (receives 'blue' | 'red')
   * @param {HTMLCanvasElement} [options.canvas] - Canvas for cursor styling
   */
  constructor({
    scene,
    camera,
    roomPosition = new THREE.Vector3(25, -0.5, 0),
    onSelect = null,
    canvas = null
  } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.roomPosition = roomPosition;
    this.onSelect = onSelect;
    this.canvas = canvas;

    this.isDisposed = false;
    this.elapsedTime = 0;
    this.hoveredPill = null;
    this.selectedBranch = null;

    this.raycaster = new THREE.Raycaster();
    this.raycastTargets = [];
    this.lights = [];

    // Root act container in world space
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'PillChoiceActGroup';
    this.rootGroup.visible = false; // Hidden until Gateway descent starts

    // 1. Procedural Blue Pill (Left / Human Palm)
    this.bluePill = this._createProceduralPill({
      colorHex: 0x1d4ed8,
      glowColorHex: 0x38bdf8,
      pillId: 'blue'
    });

    // 2. Procedural Red Pill (Right / Robotic Palm)
    this.redPill = this._createProceduralPill({
      colorHex: 0xb91c1c,
      glowColorHex: 0xef4444,
      pillId: 'red'
    });

    this.raycastTargets = [
      this.bluePill.mesh,
      this.bluePill.haloMesh,
      this.redPill.mesh,
      this.redPill.haloMesh
    ].filter(Boolean);

    // Left and Right Hand containers
    this.leftGroup = new THREE.Group();
    this.leftGroup.name = 'HumanHandPillGroup';
    this.leftGroup.add(this.bluePill.group);

    this.rightGroup = new THREE.Group();
    this.rightGroup.name = 'RoboticHandPillGroup';
    this.rightGroup.add(this.redPill.group);

    // Anchor coordinates relative to Matrix White Room TV center line (roomPosition.x - 0.2)
    // Symmetrically grounded in lower corners for First-Person POV perspective (fingertips in lower ~38-40% of viewport)
    const centerX = this.roomPosition.x - 0.2;
    this.baseLeftPos = new THREE.Vector3(centerX - 0.68, this.roomPosition.y + 0.81, this.roomPosition.z + 3.96);
    this.baseRightPos = new THREE.Vector3(centerX + 0.65, this.roomPosition.y + 0.86, this.roomPosition.z + 3.96);

    this.leftGroup.position.copy(this.baseLeftPos);
    this.rightGroup.position.copy(this.baseRightPos);

    this.rootGroup.add(this.leftGroup);
    this.rootGroup.add(this.rightGroup);

    this._setupLighting();
    this._createFloorGlowPools();

    if (this.scene) {
      this.scene.add(this.rootGroup);
    }
  }

  /**
   * Creates a soft radial glow texture for particles and atmospheric floor light pools
   * @private
   * @param {string} innerColor
   * @param {string} midColor
   * @returns {THREE.CanvasTexture|null}
   */
  _createRadialGlowTexture(innerColor, midColor) {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx || typeof ctx.createRadialGradient !== 'function') return null;
      const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(0.4, midColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(canvas);
    } catch {
      return null;
    }
  }

  /**
   * Creates a horizontally and vertically feathered smoke ribbon texture so wisps have zero hard wire edges
   * @private
   * @param {boolean} [isCoreFilament=false]
   * @returns {THREE.CanvasTexture|null}
   */
  _createWispRibbonTexture(isCoreFilament = false) {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 128;
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx || typeof ctx.createLinearGradient !== 'function') return null;

      const hGrad = ctx.createLinearGradient(0, 0, 64, 0);
      hGrad.addColorStop(0.0, 'rgba(14, 165, 233, 0)');
      hGrad.addColorStop(0.25, isCoreFilament ? 'rgba(56, 189, 248, 0.08)' : 'rgba(14, 165, 233, 0.12)');
      hGrad.addColorStop(0.5, isCoreFilament ? 'rgba(224, 242, 254, 0.56)' : 'rgba(56, 189, 248, 0.32)');
      hGrad.addColorStop(0.75, isCoreFilament ? 'rgba(56, 189, 248, 0.08)' : 'rgba(14, 165, 233, 0.12)');
      hGrad.addColorStop(1.0, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, 0, 64, 128);

      ctx.globalCompositeOperation = 'destination-in';
      const vGrad = ctx.createLinearGradient(0, 0, 0, 128);
      vGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
      vGrad.addColorStop(0.12, 'rgba(255, 255, 255, 0.92)');
      vGrad.addColorStop(0.58, 'rgba(255, 255, 255, 0.52)');
      vGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, 64, 128);

      return new THREE.CanvasTexture(canvas);
    } catch {
      return null;
    }
  }

  /**
   * Builds a camera-facing feathered ribbon strip along a 3D curve with UV coordinates for soft smoke shading
   * @private
   * @param {THREE.Curve<THREE.Vector3>} curve
   * @param {number} maxWidth
   * @param {number} [segments=48]
   * @param {number} [twistAngle=0]
   * @returns {THREE.BufferGeometry}
   */
  _createTaperedWispGeometry(curve, maxWidth, segments = 48, twistAngle = 0) {
    const vertexCount = (segments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = [];

    const tangent = new THREE.Vector3();
    const viewDir = new THREE.Vector3(Math.sin(twistAngle) * 0.45, 0.15, Math.cos(twistAngle));
    const side = new THREE.Vector3();

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const pt = curve.getPointAt(u);
      curve.getTangentAt(u, tangent);

      side.crossVectors(tangent, viewDir);
      if (side.lengthSq() < 0.0001) {
        side.set(1, 0, 0);
      } else {
        side.normalize();
      }

      // Smooth organic width envelope: pinches at base, swells in S-curve belly, tapers wispy at top
      const taper = Math.sin(u * Math.PI) * (0.65 + 0.55 * Math.sin(u * Math.PI * 0.85));
      const halfW = maxWidth * taper * 0.5;

      const idxL = i * 2;
      const idxR = i * 2 + 1;

      positions[idxL * 3] = pt.x - side.x * halfW;
      positions[idxL * 3 + 1] = pt.y - side.y * halfW;
      positions[idxL * 3 + 2] = pt.z - side.z * halfW;
      uvs[idxL * 2] = 0;
      uvs[idxL * 2 + 1] = 1 - u;

      positions[idxR * 3] = pt.x + side.x * halfW;
      positions[idxR * 3 + 1] = pt.y + side.y * halfW;
      positions[idxR * 3 + 2] = pt.z + side.z * halfW;
      uvs[idxR * 2] = 1;
      uvs[idxR * 2 + 1] = 1 - u;
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Creates a procedural glowing pill capsule with localized point lighting and signature aura effects
   * @private
   * @param {Object} config
   * @param {number} config.colorHex
   * @param {number} config.glowColorHex
   * @param {string} config.pillId
   * @returns {{ group: THREE.Group, mesh: THREE.Mesh, haloMesh: THREE.Mesh, light: THREE.PointLight, baseScale: THREE.Vector3, baseRotZ: number, baseLightIntensity: number, baseEmissiveIntensity: number }}
   */
  _createProceduralPill({ colorHex, glowColorHex, pillId }) {
    const group = new THREE.Group();
    group.name = `Pill_${pillId}`;

    const baseEmissiveIntensity = pillId === 'blue' ? 1.92 : 1.85;
    // Calibrated point lights illuminate each palm locally while preserving dark creases & armor contrast
    const baseLightIntensity = pillId === 'blue' ? 1.45 : 3.25;

    // Realistic sleek capsule dimensions matching palm proportions in reference image
    const geometry = new THREE.CapsuleGeometry(0.022, 0.058, 24, 32);
    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: glowColorHex,
      emissiveIntensity: baseEmissiveIntensity,
      roughness: 0.16,
      metalness: 0.12,
      toneMapped: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `PillMesh_${pillId}`;
    mesh.userData = { pill: pillId };
    const baseRotZ = pillId === 'blue' ? -Math.PI / 5.5 : Math.PI / 5.5;
    mesh.rotation.z = baseRotZ;
    mesh.rotation.x = Math.PI / 14;
    group.add(mesh);

    // Subtle outer halo shell for raycast hit comfort without creating a hard double-edge border
    const haloGeo = new THREE.CapsuleGeometry(0.032, 0.068, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: glowColorHex,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.name = `PillHalo_${pillId}`;
    haloMesh.userData = { pill: pillId };
    haloMesh.rotation.copy(mesh.rotation);
    group.add(haloMesh);

    // Strictly localized point light illuminating ONLY its own palm (distance < 0.95 prevents cross-hand bleed)
    const light = new THREE.PointLight(
      pillId === 'blue' ? 0x22d3ee : 0xff3b30,
      baseLightIntensity,
      0.92,
      pillId === 'blue' ? 1.45 : 1.75
    );
    light.position.set(
      pillId === 'blue' ? -0.03 : 0.04,
      pillId === 'blue' ? 0.01 : -0.05,
      pillId === 'blue' ? 0.18 : 0.12
    );
    group.add(light);

    if (pillId === 'blue') {
      this._addBluePillWisps(group);
    } else if (pillId === 'red') {
      this._addRedPillGlitchSparks(group);
    }

    return {
      group,
      mesh,
      haloMesh,
      light,
      baseScale: new THREE.Vector3(1, 1, 1),
      baseRotZ,
      baseLightIntensity,
      baseEmissiveIntensity
    };
  }

  /**
   * Adds ethereal misty cyan S-curve smoke ribbons and multi-scale stardust particles rising above the Blue Pill
   * @private
   * @param {THREE.Group} pillGroup
   */
  _addBluePillWisps(pillGroup) {
    const wispGroup = new THREE.Group();
    wispGroup.name = 'BluePillWisps';

    // Cohesive, intertwined S-curve smoke tendrils emerging from the pill top, sweeping right toward the fingers,
    // curving left into the open upper thumb-index gap, and curling delicately at the top
    const wispCurves = [
      // Primary broad S-curve mist veil
      {
        pts: [
          new THREE.Vector3(0.012, 0.025, 0.015),
          new THREE.Vector3(0.092, 0.175, 0.026),
          new THREE.Vector3(0.018, 0.295, 0.018),
          new THREE.Vector3(0.068, 0.415, 0.010)
        ],
        layers: [
          { w: 0.095, opacity: 0.28, color: 0x0ea5e9, core: false, twist: -0.25 },
          { w: 0.046, opacity: 0.36, color: 0x38bdf8, core: false, twist: 0.15 },
          { w: 0.016, opacity: 0.46, color: 0xe0f2fe, core: true, twist: 0.0 }
        ]
      },
      // Intertwining inner filament that crosses over the primary S-curve belly
      {
        pts: [
          new THREE.Vector3(-0.004, 0.032, 0.018),
          new THREE.Vector3(0.064, 0.155, 0.028),
          new THREE.Vector3(0.042, 0.268, 0.020),
          new THREE.Vector3(0.012, 0.375, 0.012)
        ],
        layers: [
          { w: 0.068, opacity: 0.24, color: 0x0284c7, core: false, twist: 0.30 },
          { w: 0.028, opacity: 0.32, color: 0x38bdf8, core: false, twist: -0.18 },
          { w: 0.012, opacity: 0.38, color: 0xbae6fd, core: true, twist: 0.05 }
        ]
      },
      // Lower-right curl hugging the inner fingers before sweeping up-left
      {
        pts: [
          new THREE.Vector3(0.024, 0.018, 0.014),
          new THREE.Vector3(0.112, 0.145, 0.024),
          new THREE.Vector3(0.052, 0.255, 0.016),
          new THREE.Vector3(0.082, 0.355, 0.010)
        ],
        layers: [
          { w: 0.062, opacity: 0.22, color: 0x0ea5e9, core: false, twist: -0.15 },
          { w: 0.014, opacity: 0.34, color: 0x7dd3fc, core: true, twist: 0.12 }
        ]
      }
    ];

    const softSmokeTex = this._createWispRibbonTexture(false);
    const filamentTex = this._createWispRibbonTexture(true);

    for (const def of wispCurves) {
      const curve = new THREE.CatmullRomCurve3(def.pts);
      for (const layer of def.layers) {
        const tex = layer.core ? filamentTex : softSmokeTex;
        const wispGeo = this._createTaperedWispGeometry(curve, layer.w, 48, layer.twist);
        const wispMat = new THREE.MeshBasicMaterial({
          map: tex,
          color: layer.color,
          transparent: true,
          opacity: tex ? layer.opacity : layer.opacity * 0.15,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        wispGroup.add(new THREE.Mesh(wispGeo, wispMat));
      }
    }

    // Soft cyan atmospheric mist clouds enveloping the pill top and rising S-curve column
    const mistTex = this._createRadialGlowTexture('rgba(56, 189, 248, 0.28)', 'rgba(14, 165, 233, 0.07)');
    const mistMainCurve = new THREE.CatmullRomCurve3(wispCurves[0].pts);
    for (let m = 0; m < 8; m++) {
      const u = 0.02 + (m / 7) * 0.82;
      const pt = mistMainCurve.getPointAt(u);
      const mistSize = 0.115 + (1 - u) * 0.065;
      const mistGeo = new THREE.PlaneGeometry(mistSize, mistSize);
      const mistMat = new THREE.MeshBasicMaterial({
        map: mistTex,
        color: 0x38bdf8,
        transparent: true,
        opacity: mistTex ? 0.36 * (1 - u * 0.42) : 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mistMesh = new THREE.Mesh(mistGeo, mistMat);
      mistMesh.position.copy(pt);
      wispGroup.add(mistMesh);
    }

    // Multi-scale stardust particle layers (fine dust motes, glowing cyan stars, and bright pinprick sparkles)
    const glowTex = this._createRadialGlowTexture('rgba(240, 249, 255, 1)', 'rgba(56, 189, 248, 0.68)');
    const particleLayers = [
      { count: 64, size: 0.011, opacity: 0.72, color: 0x7dd3fc, seedOffset: 0 },
      { count: 32, size: 0.018, opacity: 0.92, color: 0xbae6fd, seedOffset: 100 },
      { count: 16, size: 0.026, opacity: 1.0, color: 0xf0f9ff, seedOffset: 200 }
    ];

    for (const pLayer of particleLayers) {
      const positions = new Float32Array(pLayer.count * 3);
      for (let i = 0; i < pLayer.count; i++) {
        const idx = i + pLayer.seedOffset;
        const t = Math.pow(i / pLayer.count, 0.88);
        const spread = 0.032 + t * 0.125;
        const seed1 = Math.sin(idx * 12.9898) * 43758.5453;
        const seed2 = Math.sin(idx * 78.233) * 43758.5453;
        const rx = (seed1 - Math.floor(seed1)) - 0.5;
        const rz = (seed2 - Math.floor(seed2)) - 0.5;
        const curvePt = mistMainCurve.getPointAt(Math.min(0.98, t));
        positions[i * 3] = curvePt.x + rx * spread * 1.55;
        positions[i * 3 + 1] = 0.018 + t * 0.44;
        positions[i * 3 + 2] = 0.02 + rz * spread;
      }

      const partGeo = new THREE.BufferGeometry();
      partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const partMat = new THREE.PointsMaterial({
        color: pLayer.color,
        map: glowTex,
        size: pLayer.size,
        transparent: true,
        opacity: pLayer.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      wispGroup.add(new THREE.Points(partGeo, partMat));
    }

    this.blueWispsGroup = wispGroup;
    pillGroup.add(wispGroup);
  }

  /**
   * Adds cybernetic red/orange digital glitch fragments and fiery sparks around (never occluding) the Red Pill
   * @private
   * @param {THREE.Group} pillGroup
   */
  _addRedPillGlitchSparks(pillGroup) {
    const glitchGroup = new THREE.Group();
    glitchGroup.name = 'RedPillGlitchSparks';

    // Warm crimson-orange aura behind the Red Pill (offset behind z=-0.03 so capsule core stays crisp coral-red)
    const coreTex = this._createRadialGlowTexture('rgba(239, 68, 68, 0.52)', 'rgba(185, 28, 28, 0.18)');
    const coreGeo = new THREE.PlaneGeometry(0.24, 0.24);
    const coreMat = new THREE.MeshBasicMaterial({
      map: coreTex,
      color: 0xef4444,
      transparent: true,
      opacity: coreTex ? 0.85 : 0.10,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0.01, 0.01, -0.03);
    glitchGroup.add(coreMesh);

    // Cybernetic horizontal glitch scanline bars & dark cutout artifacts clustered around the palm hollow
    const glitchPalette = [0xff3b30, 0xef4444, 0xf97316, 0xfb923c, 0xdc2626];
    const shardCount = 58;

    for (let i = 0; i < shardCount; i++) {
      const s1 = Math.sin(i * 19.13) * 10000;
      const s2 = Math.sin(i * 47.71) * 10000;
      const s3 = Math.sin(i * 91.37) * 10000;
      const r1 = s1 - Math.floor(s1);
      const r2 = s2 - Math.floor(s2);
      const r3 = s3 - Math.floor(s3);

      const angle = r1 * Math.PI * 2;
      const isDarkGlitch = i % 4 === 0;
      // Enforce clearance outside the Red Pill capsule silhouette so the pill is 100% unoccluded
      const minRadius = isDarkGlitch ? 0.056 : 0.045;
      const dist = minRadius + Math.pow(r2, 1.15) * 0.145;
      const w = isDarkGlitch ? (0.018 + r3 * 0.034) : (0.010 + r3 * 0.028);
      const h = isDarkGlitch ? (0.004 + r1 * 0.006) : (0.0025 + r1 * 0.0045);

      const shardGeo = new THREE.PlaneGeometry(w, h);
      const shardMat = new THREE.MeshBasicMaterial({
        color: isDarkGlitch ? 0x07080c : glitchPalette[i % glitchPalette.length],
        transparent: true,
        opacity: isDarkGlitch ? 0.88 : (0.62 + r3 * 0.32),
        blending: isDarkGlitch ? THREE.NormalBlending : THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.set(
        Math.cos(angle) * dist * 1.12,
        Math.sin(angle) * dist * 0.92 + 0.015,
        isDarkGlitch ? -0.015 : (0.004 + (r3 - 0.4) * 0.03)
      );
      // Horizontal scanline glitch bars with occasional angled ember streaks
      shard.rotation.z = (i % 5 !== 0 || isDarkGlitch) ? 0 : (0.45 + r2 * 0.35);
      glitchGroup.add(shard);
    }

    // Softly feathered fiery orange-gold flame/ember bursts across the splayed fingers and right edge
    const emberTex = this._createRadialGlowTexture('rgba(254, 240, 138, 0.95)', 'rgba(234, 88, 12, 0.42)');
    const emberCoords = [
      [0.02, 0.11, 0.01, 0.062, 0.024, 0.78],
      [0.07, 0.09, 0.01, 0.072, 0.028, 0.62],
      [0.14, 0.05, 0.01, 0.082, 0.030, 0.45],
      [0.16, 0.11, 0.0, 0.068, 0.025, 0.52],
      [-0.02, 0.14, -0.01, 0.054, 0.022, 1.05],
      [0.09, -0.03, 0.01, 0.064, 0.024, -0.35],
      [-0.06, -0.05, 0.01, 0.058, 0.022, 0.55],
      [-0.07, 0.04, -0.01, 0.052, 0.020, 0.15]
    ];
    for (const [ex, ey, ez, ew, eh, erot] of emberCoords) {
      const eGeo = new THREE.PlaneGeometry(ew, eh);
      const eMat = new THREE.MeshBasicMaterial({
        map: emberTex,
        color: 0xfb923c,
        transparent: true,
        opacity: emberTex ? 0.88 : 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const eMesh = new THREE.Mesh(eGeo, eMat);
      eMesh.position.set(ex, ey, ez);
      eMesh.rotation.z = erot;
      glitchGroup.add(eMesh);
    }

    // Multi-scale fiery orange/red/gold spark particles radiating outward across palm and splayed fingers
    const sparkTex = this._createRadialGlowTexture('rgba(254, 240, 138, 1)', 'rgba(239, 68, 68, 0.78)');
    const sparkLayers = [
      { count: 60, size: 0.014, opacity: 0.88, color: 0xef4444, seed: 0 },
      { count: 34, size: 0.022, opacity: 0.96, color: 0xfb923c, seed: 100 },
      { count: 16, size: 0.030, opacity: 1.0, color: 0xfef08a, seed: 200 }
    ];

    for (const sLayer of sparkLayers) {
      const sparkPos = new Float32Array(sLayer.count * 3);
      for (let i = 0; i < sLayer.count; i++) {
        const idx = i + sLayer.seed;
        const s1 = Math.sin(idx * 31.17) * 43758.5453;
        const s2 = Math.sin(idx * 67.89) * 43758.5453;
        const r1 = s1 - Math.floor(s1);
        const r2 = s2 - Math.floor(s2);
        const angle = r1 * Math.PI * 2;
        const radius = 0.040 + Math.pow(r2, 1.05) * 0.21;
        sparkPos[i * 3] = Math.cos(angle) * radius * 1.15 + 0.015;
        sparkPos[i * 3 + 1] = Math.sin(angle) * radius + 0.035;
        sparkPos[i * 3 + 2] = 0.01 + (r1 - 0.4) * 0.04;
      }

      const sparkGeo = new THREE.BufferGeometry();
      sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
      const sparkMat = new THREE.PointsMaterial({
        color: sLayer.color,
        map: sparkTex,
        size: sLayer.size,
        transparent: true,
        opacity: sLayer.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      glitchGroup.add(new THREE.Points(sparkGeo, sparkMat));
    }

    this.redGlitchGroup = glitchGroup;
    pillGroup.add(glitchGroup);
  }

  /**
   * Creates broad cyan and red atmospheric floor glow pools extending to the lower viewport edge behind the hands
   * @private
   */
  _createFloorGlowPools() {
    const centerX = this.roomPosition.x - 0.2;
    const cyanTex = this._createRadialGlowTexture('rgba(34, 211, 238, 0.56)', 'rgba(14, 165, 233, 0.20)');
    const redTex = this._createRadialGlowTexture('rgba(239, 68, 68, 0.42)', 'rgba(185, 28, 28, 0.14)');

    const cyanGeo = new THREE.PlaneGeometry(1.85, 1.65);
    const cyanMat = new THREE.MeshBasicMaterial({
      map: cyanTex,
      color: 0x22d3ee,
      transparent: true,
      opacity: cyanTex ? 0.92 : 0.10,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const cyanPool = new THREE.Mesh(cyanGeo, cyanMat);
    cyanPool.position.set(centerX - 0.28, this.roomPosition.y + 0.30, this.roomPosition.z + 3.65);
    cyanPool.rotation.x = -Math.PI / 7;
    this.cyanFloorPool = cyanPool;
    this.rootGroup.add(cyanPool);

    const redGeo = new THREE.PlaneGeometry(1.55, 1.35);
    const redMat = new THREE.MeshBasicMaterial({
      map: redTex,
      color: 0xef4444,
      transparent: true,
      opacity: redTex ? 0.86 : 0.10,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const redPool = new THREE.Mesh(redGeo, redMat);
    redPool.position.set(centerX + 0.22, this.roomPosition.y + 0.24, this.roomPosition.z + 3.68);
    redPool.rotation.x = -Math.PI / 7;
    this.redFloorPool = redPool;
    this.rootGroup.add(redPool);
  }

  /**
   * Configures localized short-range rim lights for both hands so the background room stays dark
   * @private
   */
  _setupLighting() {
    const centerX = this.roomPosition.x - 0.2;

    // Subtle fill light from outer-left so curled right fingers of human hand keep natural dark shading
    const leftRimLight = new THREE.PointLight(0xdbeafe, 0.16, 1.4, 1.8);
    leftRimLight.position.set(centerX - 0.96, this.roomPosition.y + 1.05, this.roomPosition.z + 4.35);
    this.rootGroup.add(leftRimLight);
    this.lights.push(leftRimLight);

    // Cool metallic rim light for right (robotic) hand
    const rightRimLight = new THREE.PointLight(0xe2e8f0, 1.25, 1.6, 1.6);
    rightRimLight.position.set(centerX + 0.45, this.roomPosition.y + 1.22, this.roomPosition.z + 4.35);
    this.rootGroup.add(rightRimLight);
    this.lights.push(rightRimLight);
  }

  /**
   * Sets and normalizes the human hand model in the left group holding the blue pill
   * @param {THREE.Object3D} model
   */
  setHumanHandModel(model) {
    if (this.isDisposed || !model) return;

    if (this.humanHandModel) {
      this.leftGroup.remove(this.humanHandModel);
      disposeThreeObject(this.humanHandModel);
    }

    const clone = model.clone(true);
    // Deepen skin albedo & roughness on cloned hand so cyan pill light sculpts palm creases without blowing out
    clone.traverse((child) => {
      if (child.isMesh && child.material && typeof child.material.clone === 'function') {
        child.material = child.material.clone();
        if (child.material.color) {
          child.material.color.multiplyScalar(0.56);
        }
        if (typeof child.material.roughness === 'number') {
          child.material.roughness = Math.max(child.material.roughness, 0.72);
        }
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const scale = Number.isFinite(maxDim) && maxDim > 0 ? HAND_NORMALIZED_SIZE / maxDim : 0.04;

    // Center clone on the hollow of the palm so (0, 0, 0) is the palm bed
    // Analyzed hollow center for hand.glb: (4.28, 8.91, 14.35)
    const palmHollow = new THREE.Vector3(4.28, 8.91, 14.35);

    const inner = new THREE.Group();
    inner.position.copy(palmHollow).negate();
    inner.add(clone);

    const pivot = new THREE.Group();
    pivot.add(inner);
    // Orient human left hand in First-Person POV: forearm enters from bottom left corner, palm cupped upward facing viewer
    pivot.rotation.set(-Math.PI / 2.35, Math.PI / 8.5, -Math.PI / 15);

    const container = new THREE.Group();
    container.name = 'HumanHandContainer';
    container.scale.set(scale, scale, scale);
    container.add(pivot);

    this.humanHandModel = container;
    this.leftGroup.add(this.humanHandModel);

    // Position Blue Pill directly in the lower hollow of the human palm next to curled fingertips
    this.bluePill.group.position.set(0.08, 0.14, 0.02);
  }

  /**
   * Sets and normalizes the robotic hand model in the right group holding the red pill
   * @param {THREE.Object3D} model
   */
  setRoboticHandModel(model) {
    if (this.isDisposed || !model) return;

    if (this.roboticHandModel) {
      this.rightGroup.remove(this.roboticHandModel);
      disposeThreeObject(this.roboticHandModel);
    }

    const clone = model.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const scale = Number.isFinite(maxDim) && maxDim > 0 ? HAND_NORMALIZED_SIZE / maxDim : 6.0;

    // Center clone on the hollow of the palm so (0, 0, 0) is the palm bed
    // Analyzed hollow center for robotic_hand.glb: (-0.0127, 0.0495, -0.0004)
    const palmHollow = new THREE.Vector3(-0.0127, 0.0495, -0.0004);

    // Configure open-palm splay for the 4 mechanical fingers around their knuckle pivots (in RootNode cm space)
    const fingerSplayConfigs = {
      // Pinky (1st/leftmost finger + knuckle joint)
      pCube24: { pivot: new THREE.Vector3(0.5, 7.5, -2.4), euler: new THREE.Euler(0.04, 0, 0.02, 'XYZ') },
      pCube34: { pivot: new THREE.Vector3(0.5, 7.5, -2.4), euler: new THREE.Euler(0.04, 0, 0.02, 'XYZ') },
      pPipe12: { pivot: new THREE.Vector3(0.5, 7.5, -2.4), euler: new THREE.Euler(0.04, 0, 0.02, 'XYZ') },
      // Ring (2nd finger + knuckle joint)
      pCube22: { pivot: new THREE.Vector3(0.5, 7.8, -1.0), euler: new THREE.Euler(0.16, 0, 0.04, 'XYZ') },
      pCube35: { pivot: new THREE.Vector3(0.5, 7.8, -1.0), euler: new THREE.Euler(0.16, 0, 0.04, 'XYZ') },
      pPipe11: { pivot: new THREE.Vector3(0.5, 7.8, -1.0), euler: new THREE.Euler(0.16, 0, 0.04, 'XYZ') },
      // Middle (3rd finger + knuckle joint)
      pCube21: { pivot: new THREE.Vector3(0.5, 8.0, 0.6), euler: new THREE.Euler(0.28, 0, 0.06, 'XYZ') },
      pCube36: { pivot: new THREE.Vector3(0.5, 8.0, 0.6), euler: new THREE.Euler(0.28, 0, 0.06, 'XYZ') },
      pPipe10: { pivot: new THREE.Vector3(0.5, 8.0, 0.6), euler: new THREE.Euler(0.28, 0, 0.06, 'XYZ') },
      // Index (4th/rightmost top finger + knuckle joint)
      pCube19: { pivot: new THREE.Vector3(0.5, 7.7, 2.1), euler: new THREE.Euler(0.42, 0, 0.09, 'XYZ') },
      pCube37: { pivot: new THREE.Vector3(0.5, 7.7, 2.1), euler: new THREE.Euler(0.42, 0, 0.09, 'XYZ') },
      pPipe9: { pivot: new THREE.Vector3(0.5, 7.7, 2.1), euler: new THREE.Euler(0.42, 0, 0.09, 'XYZ') },
      // Rounded carbon-fiber thumb dome sitting directly below the Red Pill
      pCube41: {
        pivot: new THREE.Vector3(-1.2, 4.0, 0.0),
        euler: new THREE.Euler(0.08, 0.05, 0.18, 'XYZ'),
        offset: new THREE.Vector3(-0.95, -1.42, 0.08)
      },
      // Flared carbon-fiber lower-right base extending from pCube41 to the bottom-right corner
      pCube42: {
        pivot: new THREE.Vector3(-1.2, 4.0, 0.0),
        euler: new THREE.Euler(0.12, 0.05, 0.18, 'XYZ'),
        offset: new THREE.Vector3(-0.95, -3.65, 0.25)
      }
    };

    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        const cloneMat = (m) => {
          if (!m || typeof m.clone !== 'function') return m;
          const cm = m.clone();
          cm.side = THREE.DoubleSide;
          const meshName = child.name || '';
          if (
            meshName.includes('pSphere5') ||
            meshName.includes('polySurface3_') ||
            meshName.includes('pSphere2')
          ) {
            // Dark recessed mechanical palm hollow behind the Red Pill
            if (cm.color) cm.color.multiplyScalar(0.12);
            if (typeof cm.roughness === 'number') cm.roughness = 0.60;
            if (typeof cm.metalness === 'number') cm.metalness = 0.65;
          } else if (
            meshName.includes('pCube26') ||
            meshName.includes('pCube27') ||
            meshName.includes('polySurface39') ||
            meshName.includes('pPipe2') ||
            meshName.includes('pPipe8') ||
            meshName.includes('pPipe13') ||
            meshName.includes('pPipe14')
          ) {
            // Deep matte black side-armor plate on the left side of the robotic hand
            if (cm.color) cm.color.multiplyScalar(0.18);
            if (typeof cm.roughness === 'number') cm.roughness = 0.62;
            if (typeof cm.metalness === 'number') cm.metalness = 0.45;
          } else if (meshName.includes('pCube42') || meshName.includes('pCube41')) {
            // Dark charcoal woven carbon-fiber thumb/palm pad with glossy specular curve under the Red Pill
            if (cm.color) cm.color.multiplyScalar(0.32);
            if (typeof cm.roughness === 'number') cm.roughness = 0.26;
            if (typeof cm.metalness === 'number') cm.metalness = 0.44;
          } else {
            // Dark gunmetal splayed fingers catching warm orange-red inner edge highlights
            if (cm.color) cm.color.multiplyScalar(0.34);
            if (typeof cm.roughness === 'number') cm.roughness = 0.42;
            if (typeof cm.metalness === 'number') cm.metalness = 0.68;
          }
          return cm;
        };

        child.material = Array.isArray(child.material)
          ? child.material.map(cloneMat)
          : cloneMat(child.material);
      }

      // Tuck the outer thumb cable loop inside polySurface39 so only the left armor ribbed seam is visible
      if (child.isMesh && child.name === 'polySurface39_covers_0' && child.geometry) {
        child.geometry = child.geometry.clone();
        const posAttr = child.geometry.attributes && child.geometry.attributes.position;
        if (posAttr && typeof posAttr.getZ === 'function') {
          for (let i = 0; i < posAttr.count; i++) {
            const vx = posAttr.getX(i);
            const vz = posAttr.getZ(i);
            if (vz > 2.3 && vx < 0.25) {
              posAttr.setXYZ(i, 0.35, posAttr.getY(i), 1.4);
            }
          }
          posAttr.needsUpdate = true;
        }
      }

      // Hide redundant outer thumb (polySurface1) so pCube41+pCube42 forms the bottom-right carbon-fiber thumb pad
      if (child.name === 'polySurface1') {
        child.visible = false;
      } else if (fingerSplayConfigs[child.name]) {
        const { pivot: p, euler, offset } = fingerSplayConfigs[child.name];
        child.rotation.copy(euler);
        child.position.copy(p).sub(p.clone().applyEuler(euler));
        if (offset) {
          child.position.add(offset);
        }
      }
    });

    const inner = new THREE.Group();
    inner.position.copy(palmHollow).negate();
    inner.add(clone);

    // Open-palm orientation matching reference image:
    // Places the dark side-armor plate on the left, 4 mechanical fingers splayed open across the top,
    // carbon-fiber thumb pad (pCube41+pCube42) at the bottom-right, and dark mechanical palm hollow in the center.
    const alignGroup = new THREE.Group();
    alignGroup.scale.set(-1, 1, 1);
    alignGroup.add(inner);
    alignGroup.rotation.set(0, Math.PI, 0);

    const pivot = new THREE.Group();
    pivot.add(alignGroup);
    pivot.rotation.set(-Math.PI / 2.22, Math.PI / 2.68, -0.05);

    const container = new THREE.Group();
    container.name = 'RoboticHandContainer';
    container.scale.set(-scale, scale, scale);
    container.add(pivot);

    this.roboticHandModel = container;
    this.rightGroup.add(this.roboticHandModel);

    // Position Red Pill cleanly in front of the open dark mechanical hollow above the carbon-fiber thumb dome
    this.redPill.group.position.set(-0.09, 0.28, 0.17);
  }

  /**
   * Updates organic hover physics, subtle pill breathing, raycasting, and visibility transitions
   * @param {Object} state
   * @param {number} state.progress - Continuous narrative progress [0.0 - 1.0]
   * @param {Object} [state.pointer] - Normalized pointer coordinates { x, y }
   * @param {number} [state.delta=0.016] - Time delta in seconds
   * @param {number} [state.speedFactor=1.0] - Idle speed factor
   */
  update({ progress = 0, pointer = null, delta = 0.016, speedFactor = 1.0 } = {}) {
    if (this.isDisposed) return;

    if (speedFactor > 0.0001) {
      this.elapsedTime += delta * speedFactor;
    }

    // Visibility window: Hands emerge as progress advances past Matrix White Room entrance (0.22)
    const isVisibleWindow = progress >= 0.22 && progress <= 0.65;
    this.rootGroup.visible = isVisibleWindow;
    if (!isVisibleWindow) {
      if (this.hoveredPill) {
        this.hoveredPill = null;
        this._applyHoverStates();
      }
      return;
    }

    // Smooth emergence rise: from 0.22 to 0.35, hands rise up into cinematic view
    let entranceT = Math.max(0, Math.min((progress - 0.22) / 0.13, 1.0));
    // Easing cubic out
    entranceT = 1 - Math.pow(1 - entranceT, 3);
    const yRiseOffset = (1 - entranceT) * -0.9;

    // Organic hover breathing floating physics
    let floatL = 0;
    let floatR = 0;
    if (speedFactor > 0.0001) {
      floatL = Math.sin(this.elapsedTime * 1.6) * 0.018 * speedFactor;
      floatR = Math.cos(this.elapsedTime * 1.6) * 0.018 * speedFactor;
    }

    // Responsive horizontal framing so both narrow portrait and wide desktop viewports anchor hands in the lower corners
    const centerX = this.roomPosition.x - 0.2;
    const aspect = (this.camera && typeof this.camera.aspect === 'number' && this.camera.aspect > 0)
      ? this.camera.aspect
      : 1.2;
    const xAspectScale = aspect < 1.12
      ? Math.max(0.34, (aspect / 1.12) * 0.90)
      : Math.min(1.38, aspect / 1.20);
    const handScale = aspect < 0.85 ? Math.max(0.68, aspect / 0.85) : 1.0;

    this.leftGroup.scale.set(handScale, handScale, handScale);
    this.rightGroup.scale.set(handScale, handScale, handScale);

    // Scale localized pill PointLight radius proportionally when hands move closer on narrow screens
    const lightDist = 0.92 * Math.min(1.0, xAspectScale);
    if (this.bluePill && this.bluePill.light) {
      this.bluePill.light.distance = lightDist;
    }
    if (this.redPill && this.redPill.light) {
      this.redPill.light.distance = lightDist;
    }

    const leftX = centerX + (this.baseLeftPos.x - centerX) * xAspectScale;
    const rightX = centerX + (this.baseRightPos.x - centerX) * xAspectScale;

    this.leftGroup.position.set(
      leftX,
      this.baseLeftPos.y + yRiseOffset + floatL,
      this.baseLeftPos.z
    );
    this.rightGroup.position.set(
      rightX,
      this.baseRightPos.y + yRiseOffset + floatR,
      this.baseRightPos.z
    );

    // Subtle capsule breathing tilt keeping signature diagonal angle (/ for blue, \ for red)
    if (speedFactor > 0.0001) {
      if (this.bluePill && this.bluePill.mesh) {
        const rotZ = this.bluePill.baseRotZ + Math.sin(this.elapsedTime * 2.0) * 0.04 * speedFactor;
        this.bluePill.mesh.rotation.z = rotZ;
        if (this.bluePill.haloMesh) this.bluePill.haloMesh.rotation.z = rotZ;
      }
      if (this.redPill && this.redPill.mesh) {
        const rotZ = this.redPill.baseRotZ + Math.cos(this.elapsedTime * 2.0) * 0.04 * speedFactor;
        this.redPill.mesh.rotation.z = rotZ;
        if (this.redPill.haloMesh) this.redPill.haloMesh.rotation.z = rotZ;
      }
    }

    // Interactive pointer raycasting
    if (pointer && this.camera && progress >= 0.30) {
      this.handlePointerMove(pointer);
    }
  }

  /**
   * Raycasts against the pills on pointer move to trigger interactive pulse and glow
   * @param {{ x: number, y: number }} pointer - Normalized pointer coords [-1, 1]
   */
  handlePointerMove(pointer) {
    if (this.isDisposed || !this.camera || !pointer || !this.rootGroup || !this.rootGroup.visible) return;

    this.raycaster.setFromCamera(pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.raycastTargets, true);

    let nextHovered = null;
    if (intersects.length > 0) {
      const topHit = intersects[0].object;
      nextHovered = topHit.userData && topHit.userData.pill ? topHit.userData.pill : null;
    }

    if (this.hoveredPill !== nextHovered) {
      this.hoveredPill = nextHovered;
      this._applyHoverStates();
    }
  }

  /**
   * Updates pill scale and emissive intensity based on hover state
   * @private
   */
  _applyHoverStates() {
    if (this.isDisposed) return;

    const isBlueHover = this.hoveredPill === 'blue';
    const isRedHover = this.hoveredPill === 'red';

    if (this.bluePill) {
      const targetScale = isBlueHover ? 1.18 : 1.0;
      this.bluePill.mesh.scale.set(targetScale, targetScale, targetScale);
      if (this.bluePill.haloMesh) {
        this.bluePill.haloMesh.scale.set(targetScale, targetScale, targetScale);
      }
      if (this.bluePill.mesh.material) {
        this.bluePill.mesh.material.emissiveIntensity = isBlueHover
          ? 3.5
          : (this.bluePill.baseEmissiveIntensity || 2.4);
      }
      if (this.bluePill.light) {
        const baseLight = this.bluePill.baseLightIntensity || 2.15;
        this.bluePill.light.intensity = isBlueHover ? baseLight * 1.45 : baseLight;
      }
    }

    if (this.redPill) {
      const targetScale = isRedHover ? 1.18 : 1.0;
      this.redPill.mesh.scale.set(targetScale, targetScale, targetScale);
      if (this.redPill.haloMesh) {
        this.redPill.haloMesh.scale.set(targetScale, targetScale, targetScale);
      }
      if (this.redPill.mesh.material) {
        this.redPill.mesh.material.emissiveIntensity = isRedHover
          ? 3.5
          : (this.redPill.baseEmissiveIntensity || 2.4);
      }
      if (this.redPill.light) {
        const baseLight = this.redPill.baseLightIntensity || 4.2;
        this.redPill.light.intensity = isRedHover ? baseLight * 1.45 : baseLight;
      }
    }

    if (this.canvas) {
      this.canvas.style.cursor = this.hoveredPill ? 'pointer' : 'default';
    }
  }

  /**
   * Handles pointer click/tap to register pill selection
   * @param {{ x: number, y: number }} pointer - Normalized pointer coords [-1, 1]
   * @returns {'blue' | 'red' | null} Selected branch, or null if no hit
   */
  handlePointerClick(pointer) {
    if (this.isDisposed || !this.camera || !pointer || !this.rootGroup || !this.rootGroup.visible) return null;

    this.raycaster.setFromCamera(pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.raycastTargets, true);

    if (intersects.length > 0) {
      const topHit = intersects[0].object;
      const pill = topHit.userData && topHit.userData.pill ? topHit.userData.pill : null;
      if (pill === 'blue' || pill === 'red') {
        this.selectBranch(pill);
        return pill;
      }
    }

    return null;
  }

  /**
   * Selects a narrative branch ('blue' or 'red') with selection animation
   * @param {'blue' | 'red'} branch
   */
  selectBranch(branch) {
    if (this.isDisposed || (branch !== 'blue' && branch !== 'red')) return;
    if (this.selectedBranch === branch) return;

    this.selectedBranch = branch;

    // Trigger visual selection pulse
    const selectedPill = branch === 'blue' ? this.bluePill : this.redPill;
    const otherPill = branch === 'blue' ? this.redPill : this.bluePill;

    if (selectedPill && selectedPill.mesh) {
      selectedPill.mesh.scale.set(1.3, 1.3, 1.3);
      if (selectedPill.haloMesh) {
        selectedPill.haloMesh.scale.set(1.3, 1.3, 1.3);
      }
      if (selectedPill.mesh.material) {
        selectedPill.mesh.material.emissiveIntensity = 5.0;
      }
      if (selectedPill.light) {
        selectedPill.light.intensity = (selectedPill.baseLightIntensity || 3.0) * 1.8;
      }
    }

    if (otherPill && otherPill.mesh) {
      otherPill.mesh.scale.set(0.8, 0.8, 0.8);
      if (otherPill.haloMesh) {
        otherPill.haloMesh.scale.set(0.8, 0.8, 0.8);
      }
      if (otherPill.mesh.material) {
        otherPill.mesh.material.emissiveIntensity = 1.0;
      }
      if (otherPill.light) {
        otherPill.light.intensity = (otherPill.baseLightIntensity || 2.0) * 0.5;
      }
    }

    if (typeof this.onSelect === 'function') {
      this.onSelect(branch);
    }
  }

  /**
   * Resets selection when scrolling back up per issue specification
   */
  resetSelection() {
    this.selectedBranch = null;
    this.hoveredPill = null;
    this._applyHoverStates();
  }

  /**
   * Reports whether animations and physics are currently at rest
   * @returns {boolean}
   */
  isResting() {
    if (this.isDisposed || !this.rootGroup.visible) return true;
    return this.hoveredPill === null;
  }

  /**
   * Full teardown of Three.js objects, lights, and materials
   */
  dispose() {
    this.isDisposed = true;

    if (this.canvas) {
      this.canvas.style.cursor = 'default';
      this.canvas = null;
    }

    if (this.humanHandModel) {
      disposeThreeObject(this.humanHandModel);
      this.humanHandModel = null;
    }

    if (this.roboticHandModel) {
      disposeThreeObject(this.roboticHandModel);
      this.roboticHandModel = null;
    }

    if (this.bluePill) {
      disposeThreeObject(this.bluePill.group);
      this.bluePill = null;
    }

    if (this.redPill) {
      disposeThreeObject(this.redPill.group);
      this.redPill = null;
    }

    if (this.lights && this.lights.length > 0) {
      this.lights.forEach((l) => {
        if (typeof l.dispose === 'function') l.dispose();
      });
      this.lights = [];
    }

    if (this.rootGroup) {
      disposeThreeObject(this.rootGroup);
      if (this.scene) {
        this.scene.remove(this.rootGroup);
      }
      this.rootGroup = null;
    }

    this.scene = null;
    this.camera = null;
    this.raycastTargets = [];
  }
}
