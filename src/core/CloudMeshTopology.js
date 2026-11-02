import * as THREE from 'three';
import { AdaptiveLightingEngine } from './AdaptiveLightingEngine.js';

/**
 * Semantic Palette for Cloud System Topology
 */
export const TIER_CONFIG = {
  ingress: {
    color: '#00B4FF',
    name: 'Ingress Gateway'
  },
  defense: {
    color: '#00F03C',
    name: 'Mesh Defense'
  },
  telemetry: {
    color: '#FFB800',
    name: 'Worker Telemetry'
  },
  exploit: {
    color: '#FF1111',
    name: 'Payload Analysis'
  }
};

/**
 * CloudMeshTopology — Full-viewport 3D Constellation Graph (Vincent Garreau particles.js architecture)
 * Combines stratified full-screen particle distribution, organic drift, dynamic proximity links,
 * cursor "Grab" spiderweb lines, and inter-cluster Bezier packet conduits.
 */
export class CloudMeshTopology {
  /**
   * @param {Object} options
   * @param {THREE.Scene} options.scene - Target Three.js Scene
   * @param {number} [options.nodeCount=80] - Total procedural nodes (default 80 like particles.js)
   */
  constructor({ scene, nodeCount = 80 } = {}) {
    this.scene = scene;
    this.nodeCount = Math.max(8, nodeCount);

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'CloudMeshTopology';

    this.nodes = [];
    this.conduits = [];
    this.disposables = [];

    this._targetRotY = 0;
    this._targetRotX = 0;
    this._targetPointerWorldPos = null;
    this._pointerWorldPos = null;

    // Viewport frustum dimensions at z = 0 (camera z = 16, fov = 45 deg)
    this.halfHeight = 16 * Math.tan((45 * Math.PI) / 360); // ~6.627
    this.halfWidth = this.halfHeight * 1.6;
    this._updateViewportBounds();

    // Vincent Garreau (particles.js) Constellation, Grab & Ripple Engine
    this.lighting = new AdaptiveLightingEngine({
      ambientOpacity: 0.82,
      activeOpacity: 1.0,
      lightRadius: 6.2,
      scaleBoost: 0.45,
      pulseSpeed: 14.0,
      maxPulseRadius: 20.0,
      linkDistance: 4.8,
      linkOpacity: 0.28,
      grabDistance: 6.2,
      grabOpacity: 0.42,
      repulseRadius: 2.4,
      repulseStrength: 0.75
    });

    this._generateTopology();

    // Render initial constellation links immediately on frame 0
    if (this.lighting && this.constellationGeo) {
      this.lighting.updateConstellation(this.nodes, null, this.constellationGeo);
    }

    if (this.scene) {
      this.scene.add(this.rootGroup);
    }
  }

  /**
   * Generates full-viewport stratified nodes across semantic tiers, dynamic constellation
   * LineSegments buffer, and inter-cluster Bezier packet routes.
   * @private
   */
  _generateTopology() {
    const tierKeys = Object.keys(TIER_CONFIG);
    const sphereGeo = new THREE.SphereGeometry(0.13, 14, 14);
    this.disposables.push(sphereGeo);

    // 1. Stratified Full-Viewport Grid Distribution (particles.js full-canvas coverage)
    const cols = Math.ceil(Math.sqrt(this.nodeCount * 1.6));
    const rows = Math.ceil(this.nodeCount / cols);
    const spanX = 24.0; // [-12.0, +12.0] covers wide 16:9 viewports
    const spanY = 13.6; // [-6.8, +6.8] covers full vertical frustum
    const cellW = spanX / cols;
    const cellH = spanY / rows;

    for (let i = 0; i < this.nodeCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Assign semantic tier by spatial quadrant with organic mixing
      const normX = (col + 0.5) / cols - 0.5;
      const normY = (row + 0.5) / rows - 0.5;
      let tierKey;
      if (i < tierKeys.length) {
        // Guarantee all 4 tiers are always represented regardless of nodeCount
        tierKey = tierKeys[i];
      } else if (normX <= 0 && normY >= 0) {
        tierKey = 'ingress';
      } else if (normX > 0 && normY >= 0) {
        tierKey = 'defense';
      } else if (normX <= 0 && normY < 0) {
        tierKey = 'telemetry';
      } else {
        tierKey = 'exploit';
      }

      const config = TIER_CONFIG[tierKey];

      const posX = -spanX * 0.5 + (col + 0.15 + Math.random() * 0.7) * cellW;
      const posY = -spanY * 0.5 + (row + 0.15 + Math.random() * 0.7) * cellH;
      const posZ = (Math.random() - 0.5) * 2.2;

      const pos = new THREE.Vector3(posX, posY, posZ);

      // particles.js size.random variation: subtle mix of micro-nodes and hub nodes
      const baseScale = 0.7 + Math.random() * 0.6;

      // particles.js move velocity vector (vx, vy)
      const angle = Math.random() * Math.PI * 2;
      const driftSpeed = 0.25 + Math.random() * 0.35;
      const driftVelocity = new THREE.Vector3(
        Math.cos(angle) * driftSpeed,
        Math.sin(angle) * driftSpeed,
        0
      );

      const nodeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.color),
        transparent: true,
        opacity: this.lighting ? this.lighting.ambientOpacity : 0.55
      });
      this.disposables.push(nodeMat);

      const nodeMesh = new THREE.Mesh(sphereGeo, nodeMat);
      nodeMesh.position.copy(pos);
      nodeMesh.scale.set(baseScale, baseScale, baseScale);
      this.rootGroup.add(nodeMesh);

      this.nodes.push({
        id: `${tierKey}-${i}`,
        tier: tierKey,
        position: pos,
        basePosition: pos.clone(),
        baseScale,
        driftVelocity,
        mesh: nodeMesh
      });
    }

    // 2. Dynamic Constellation & Cursor "Grab" LineSegments (particles.js linkParticles + grabParticle)
    const maxLines = 2400;
    const maxVertices = maxLines * 2;
    const linePositions = new Float32Array(maxVertices * 3);
    const lineColors = new Float32Array(maxVertices * 3);

    this.constellationGeo = new THREE.BufferGeometry();
    this.constellationGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.constellationGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    this.constellationGeo.setDrawRange(0, 0);

    this.constellationMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.98
    });
    this.disposables.push(this.constellationGeo, this.constellationMat);

    this.constellationLines = new THREE.LineSegments(this.constellationGeo, this.constellationMat);
    this.constellationLines.name = 'ConstellationLinks';
    this.constellationLines.frustumCulled = false;
    this.rootGroup.add(this.constellationLines);

    // 3. Build Inter-cluster Backbone Conduits (Logical routes preserved; visual traffic runs on constellation)
    const conduitConnections = [
      ['ingress', 'defense'],
      ['defense', 'telemetry'],
      ['telemetry', 'exploit'],
      ['exploit', 'ingress'],
      ['ingress', 'telemetry'],
      ['defense', 'exploit']
    ];

    const packetGeo = new THREE.SphereGeometry(0.07, 8, 8);
    this.disposables.push(packetGeo);

    conduitConnections.forEach(([fromTier, toTier], idx) => {
      const fromNodes = this.nodes.filter(n => n.tier === fromTier);
      const toNodes = this.nodes.filter(n => n.tier === toTier);

      if (fromNodes.length === 0 || toNodes.length === 0) return;

      const start = fromNodes[idx % fromNodes.length].basePosition.clone();
      const end = toNodes[idx % toNodes.length].basePosition.clone();

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const cp1 = new THREE.Vector3(
        mid.x + (Math.sin(idx) * 2.0),
        mid.y + (Math.cos(idx) * 1.5),
        mid.z + 0.8
      );
      const cp2 = new THREE.Vector3(
        mid.x - (Math.cos(idx) * 1.5),
        mid.y - (Math.sin(idx) * 2.0),
        mid.z - 0.8
      );

      const curve = new THREE.CubicBezierCurve3(start, cp1, cp2, end);

      const points = curve.getPoints(24);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(TIER_CONFIG[fromTier].color),
        transparent: true,
        opacity: 0.14
      });
      this.disposables.push(lineGeo, lineMat);

      const lineMesh = new THREE.Line(lineGeo, lineMat);
      lineMesh.visible = false;
      this.rootGroup.add(lineMesh);

      const packetMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(TIER_CONFIG[fromTier].color)
      });
      this.disposables.push(packetMat);

      const packets = [];
      const numPackets = 2;

      for (let p = 0; p < numPackets; p++) {
        const pMesh = new THREE.Mesh(packetGeo, packetMat);
        pMesh.visible = false;
        this.rootGroup.add(pMesh);

        const initialProgress = (p / numPackets) + (Math.random() * 0.1);
        const pt = curve.getPoint(initialProgress % 1.0);
        pMesh.position.copy(pt);

        packets.push({
          progress: initialProgress % 1.0,
          speed: 0.15 + (Math.random() * 0.08),
          mesh: pMesh
        });
      }

      this.conduits.push({
        id: `conduit-${fromTier}-${toTier}-${idx}`,
        curve,
        packets,
        line: lineMesh
      });
    });
  }

  /**
   * Updates viewport horizontal frustum half-width from current window aspect ratio
   * @private
   */
  _updateViewportBounds() {
    const aspect = (typeof window !== 'undefined' && window.innerWidth && window.innerHeight)
      ? (window.innerWidth / window.innerHeight)
      : 1.6;
    this.halfWidth = this.halfHeight * aspect;
  }

  /**
   * Sets normalized pointer coordinates [-1.0 to 1.0] for cursor "Grab" constellation links and repulse
   * @param {number|null} x - Normalized horizontal pointer [-1.0 to 1.0] (or null to clear)
   * @param {number|null} y - Normalized vertical pointer [-1.0 to 1.0] (or null to clear)
   */
  setPointer(x, y) {
    if (x === null || y === null || typeof x !== 'number' || typeof y !== 'number') {
      this._targetPointerWorldPos = null;
      this._targetRotY = 0;
      this._targetRotX = 0;
      return;
    }

    // Subtle 3D parallax tilt so cursor stays pixel-accurately aligned with z=0 plane
    this._targetRotY = x * 0.06;
    this._targetRotX = -y * 0.04;

    this._updateViewportBounds();

    // Project normalized pointer accurately onto the z = 0 constellation plane
    if (!this._targetPointerWorldPos) {
      this._targetPointerWorldPos = new THREE.Vector3();
    }
    this._targetPointerWorldPos.set(x * this.halfWidth, y * this.halfHeight, 0);

    if (!this._pointerWorldPos) {
      this._pointerWorldPos = this._targetPointerWorldPos.clone();
    } else {
      // High responsiveness cursor tracking so "Grab" spiderweb stays locked to pointer tip
      this._pointerWorldPos.lerp(this._targetPointerWorldPos, 0.65);
    }
  }

  /**
   * Emits an expanding ripple / push wave from a 3D origin or current pointer
   * @param {THREE.Vector3|null} [origin=null]
   * @param {number} [intensity=1.0]
   */
  triggerPulse(origin = null, intensity = 1.0) {
    if (!this.lighting) return;
    const pulseOrigin = origin || this._pointerWorldPos || new THREE.Vector3(0, 0, 0);
    this.lighting.triggerPulse(pulseOrigin, intensity);

    // Also inject a burst of desynchronized laser pulses from the pointer into grabbed nodes
    if (this._pointerWorldPos) {
      const grabDistSq = this.lighting.grabDistance * this.lighting.grabDistance;
      for (let i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].position.distanceToSquared(this._pointerWorldPos) <= grabDistSq) {
          this.lighting.spawnLinePacket(-1, i, { r: 0, g: 180 / 255, b: 1.0 }, true);
        }
      }
    }
  }

  /**
   * Updates particle drift, dynamic constellation links, cursor grab lines, and packet progress
   * @param {number} [delta=0.016] - Elapsed time in seconds
   * @param {number} [speedFactor=1.0] - Multiplier from IdleManager [0.0 - 1.0]
   */
  update(delta = 0.016, speedFactor = 1.0) {
    // 1. Track pointer world position with minimal latency
    if (this._targetPointerWorldPos) {
      if (!this._pointerWorldPos) {
        this._pointerWorldPos = this._targetPointerWorldPos.clone();
      } else {
        this._pointerWorldPos.lerp(this._targetPointerWorldPos, 0.5);
      }
    } else {
      this._pointerWorldPos = null;
    }

    // 2. Organic particle drift (particles.js: pJS.fn.particlesUpdate move & out_mode='out')
    if (speedFactor > 0.0001) {
      const boundX = 12.6;
      const boundY = 7.2;

      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        if (!node.driftVelocity || !node.basePosition) continue;

        const driftX = node.driftVelocity.x * delta * speedFactor;
        const driftY = node.driftVelocity.y * delta * speedFactor;
        node.basePosition.x += driftX;
        node.basePosition.y += driftY;
        node.position.x += driftX;
        node.position.y += driftY;

        // Smooth boundary wrap-around (particles.js out_mode: 'out')
        if (node.basePosition.x > boundX) {
          node.basePosition.x = -boundX;
          node.position.x = node.basePosition.x;
        } else if (node.basePosition.x < -boundX) {
          node.basePosition.x = boundX;
          node.position.x = node.basePosition.x;
        }

        if (node.basePosition.y > boundY) {
          node.basePosition.y = -boundY;
          node.position.y = node.basePosition.y;
        } else if (node.basePosition.y < -boundY) {
          node.basePosition.y = boundY;
          node.position.y = node.basePosition.y;
        }
      }
    }

    // 3. Advance constellation links, cursor grab spiderweb, bubble scale & repulse
    if (this.lighting) {
      const activePointer = (speedFactor > 0.0001) ? this._pointerWorldPos : null;
      this.lighting.update(
        this.nodes,
        this.conduits,
        activePointer,
        delta * Math.max(0.15, speedFactor),
        this.constellationGeo
      );
    }

    // 4. Advance packets along conduits
    this.conduits.forEach(conduit => {
      conduit.packets.forEach(packet => {
        if (speedFactor > 0.0001) {
          packet.progress = (packet.progress + (delta * packet.speed * speedFactor)) % 1.0;
        }

        if (packet.mesh) {
          const pt = conduit.curve.getPoint(packet.progress);
          packet.mesh.position.copy(pt);
        }
      });
    });

    // 5. Smooth parallax tilt interpolation
    const lerpFactor = 0.08;
    this.rootGroup.rotation.y += (this._targetRotY - this.rootGroup.rotation.y) * lerpFactor;
    this.rootGroup.rotation.x += (this._targetRotX - this.rootGroup.rotation.x) * lerpFactor;
  }

  /**
   * Returns list of generated semantic nodes
   * @returns {Array<Object>}
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Returns list of conduits and their traveling packets
   * @returns {Array<Object>}
   */
  getConduits() {
    return this.conduits;
  }

  /**
   * Returns Three.js root group containing the 3D meshes
   * @returns {THREE.Group}
   */
  getRootGroup() {
    return this.rootGroup;
  }

  /**
   * Returns whether the topology rotation and lighting have settled into resting equilibrium
   * @returns {boolean}
   */
  isResting() {
    const isRotResting = Math.abs(this.rootGroup.rotation.y - this._targetRotY) < 0.0005 &&
      Math.abs(this.rootGroup.rotation.x - this._targetRotX) < 0.0005;
    const isLightingResting = this.lighting ? this.lighting.isResting(this.nodes) : true;
    return isRotResting && isLightingResting;
  }

  /**
   * Disposes all geometries, materials, lighting, and detaches root group
   */
  dispose() {
    if (this.lighting) {
      this.lighting.dispose();
      this.lighting = null;
    }

    this.disposables.forEach(item => {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    });
    this.disposables = [];

    if (this.rootGroup && this.scene) {
      this.scene.remove(this.rootGroup);
    }
  }

  /**
   * Alias for dispose() to preserve backwards compatibility
   */
  destroy() {
    this.dispose();
  }
}
