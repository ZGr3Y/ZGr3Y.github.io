import * as THREE from 'three';
import { AdaptiveLightingEngine } from './AdaptiveLightingEngine.js';

/**
 * Semantic Palette for Cloud System Topology
 */
export const TIER_CONFIG = {
  ingress: {
    color: '#0066FF',
    name: 'Ingress Gateway',
    center: new THREE.Vector3(-6, 2, 1)
  },
  defense: {
    color: '#00D084',
    name: 'Mesh Defense',
    center: new THREE.Vector3(5, 3, -3)
  },
  telemetry: {
    color: '#FFB800',
    name: 'Worker Telemetry',
    center: new THREE.Vector3(-4, -3, -2)
  },
  exploit: {
    color: '#FF3366',
    name: 'Payload Analysis',
    center: new THREE.Vector3(6, -2, 2)
  }
};

/**
 * CloudMeshTopology - 3D procedural semantic node graph with Bezier packet conduits.
 */
export class CloudMeshTopology {
  /**
   * @param {Object} options
   * @param {THREE.Scene} options.scene - Target Three.js Scene
   * @param {number} [options.nodeCount=40] - Total procedural nodes
   */
  constructor({ scene, nodeCount = 40 } = {}) {
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
    this._lastPulseTime = 0;

    // Adaptive Photon Lighting & Network Ping Wave System
    this.lighting = new AdaptiveLightingEngine({
      ambientOpacity: 0.25,
      activeOpacity: 0.95,
      lightRadius: 7.0,
      scaleBoost: 0.35,
      pulseSpeed: 14.0,
      maxPulseRadius: 18.0
    });

    this._generateTopology();

    if (this.scene) {
      this.scene.add(this.rootGroup);
    }
  }

  /**
   * Generates nodes across semantic tiers and builds Bezier packet routes
   * @private
   */
  _generateTopology() {
    const tierKeys = Object.keys(TIER_CONFIG);
    const nodesPerTier = Math.floor(this.nodeCount / tierKeys.length);

    const sphereGeo = new THREE.SphereGeometry(0.18, 12, 12);
    this.disposables.push(sphereGeo);

    // 1. Generate Nodes per Tier
    tierKeys.forEach((tierKey, tierIdx) => {
      const config = TIER_CONFIG[tierKey];

      for (let i = 0; i < nodesPerTier; i++) {
        const spread = 2.4;
        const jitterX = (Math.random() - 0.5) * spread;
        const jitterY = (Math.random() - 0.5) * spread;
        const jitterZ = (Math.random() - 0.5) * spread;

        const pos = new THREE.Vector3(
          config.center.x + jitterX,
          config.center.y + jitterY,
          config.center.z + jitterZ
        );

        const nodeMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(config.color),
          transparent: true,
          opacity: 0.25
        });
        this.disposables.push(nodeMat);

        const nodeMesh = new THREE.Mesh(sphereGeo, nodeMat);
        nodeMesh.position.copy(pos);
        this.rootGroup.add(nodeMesh);

        this.nodes.push({
          id: `${tierKey}-${i}`,
          tier: tierKey,
          position: pos,
          basePosition: pos.clone(),
          velocity: new THREE.Vector3(0, 0, 0),
          mesh: nodeMesh
        });
      }
    });

    // Handle any remainder nodes ensuring every node has a physical mesh
    const remainder = this.nodeCount - this.nodes.length;
    for (let r = 0; r < remainder; r++) {
      const tierKey = tierKeys[r % tierKeys.length];
      const config = TIER_CONFIG[tierKey];

      const remainderMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.color),
        transparent: true,
        opacity: 0.25
      });
      this.disposables.push(remainderMat);

      const pos = config.center.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)
      );

      const remainderMesh = new THREE.Mesh(sphereGeo, remainderMat);
      remainderMesh.position.copy(pos);
      this.rootGroup.add(remainderMesh);

      this.nodes.push({
        id: `${tierKey}-extra-${r}`,
        tier: tierKey,
        position: pos,
        basePosition: pos.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        mesh: remainderMesh
      });
    }

    // 2. Build Inter-cluster Conduits (Cubic Bezier Curves)
    const conduitConnections = [
      ['ingress', 'defense'],
      ['defense', 'telemetry'],
      ['telemetry', 'exploit'],
      ['exploit', 'ingress'],
      ['ingress', 'telemetry'],
      ['defense', 'exploit']
    ];

    const packetGeo = new THREE.SphereGeometry(0.08, 8, 8);
    this.disposables.push(packetGeo);

    conduitConnections.forEach(([fromTier, toTier], idx) => {
      const fromNodes = this.nodes.filter(n => n.tier === fromTier);
      const toNodes = this.nodes.filter(n => n.tier === toTier);

      if (fromNodes.length === 0 || toNodes.length === 0) return;

      const start = fromNodes[idx % fromNodes.length].position;
      const end = toNodes[idx % toNodes.length].position;

      // Calculate Bezier control points that curve gracefully in 3D
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const cp1 = new THREE.Vector3(
        mid.x + (Math.sin(idx) * 2.0),
        mid.y + (Math.cos(idx) * 1.5),
        mid.z + 1.0
      );
      const cp2 = new THREE.Vector3(
        mid.x - (Math.cos(idx) * 1.5),
        mid.y - (Math.sin(idx) * 2.0),
        mid.z - 1.0
      );

      const curve = new THREE.CubicBezierCurve3(start, cp1, cp2, end);

      // Visual line conduit
      const points = curve.getPoints(24);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(TIER_CONFIG[fromTier].color),
        transparent: true,
        opacity: 0.18
      });
      this.disposables.push(lineGeo, lineMat);

      const lineMesh = new THREE.Line(lineGeo, lineMat);
      this.rootGroup.add(lineMesh);

      // Packets traveling on this conduit
      const packetMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(TIER_CONFIG[fromTier].color)
      });
      this.disposables.push(packetMat);

      const packets = [];
      const numPackets = 2;

      for (let p = 0; p < numPackets; p++) {
        const pMesh = new THREE.Mesh(packetGeo, packetMat);
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
   * Sets normalized pointer coordinates for adaptive spotlight and ripples
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

    this._targetRotY = x * 0.35;
    this._targetRotX = -y * 0.25;

    // Project pointer into 3D node space
    if (!this._targetPointerWorldPos) {
      this._targetPointerWorldPos = new THREE.Vector3();
    }
    this._targetPointerWorldPos.set(x * 8.0, y * 5.0, 0.5);

    if (!this._pointerWorldPos) {
      this._pointerWorldPos = this._targetPointerWorldPos.clone();
    }

    // Trigger subtle water ripple waves as the cursor moves through space
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!this._lastPulseTime || (now - this._lastPulseTime > 650)) {
      if (this.lighting && this._targetPointerWorldPos) {
        this.lighting.triggerPulse(this._targetPointerWorldPos, 0.5);
        this._lastPulseTime = now;
      }
    }
  }

  /**
   * Emits an expanding water ripple / ping wave from a 3D origin or current pointer
   * @param {THREE.Vector3|null} [origin=null]
   * @param {number} [intensity=1.0]
   */
  triggerPulse(origin = null, intensity = 1.0) {
    if (!this.lighting) return;
    const pulseOrigin = origin || this._pointerWorldPos || new THREE.Vector3(0, 0, 0);
    this.lighting.triggerPulse(pulseOrigin, intensity);
  }

  /**
   * Updates adaptive lighting, water ripples, packet progress and elastic rotation
   * @param {number} [delta=0.016] - Elapsed time in seconds
   * @param {number} [speedFactor=1.0] - Multiplier from IdleManager [0.0 - 1.0]
   */
  update(delta = 0.016, speedFactor = 1.0) {
    // 1. Inertial trail smoothing for pointer spotlight center
    if (this._targetPointerWorldPos) {
      if (!this._pointerWorldPos) {
        this._pointerWorldPos = this._targetPointerWorldPos.clone();
      } else {
        this._pointerWorldPos.lerp(this._targetPointerWorldPos, 0.12);
      }
    } else {
      this._pointerWorldPos = null;
    }

    // 2. Advance adaptive photon lighting & water ripple waves
    if (this.lighting) {
      const activePointer = (speedFactor > 0.0001) ? this._pointerWorldPos : null;
      this.lighting.update(this.nodes, this.conduits, activePointer, delta * Math.max(0.1, speedFactor));

      // Keep node positions firmly anchored to preserve architectural clarity
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        if (node.mesh && node.basePosition) {
          node.mesh.position.copy(node.basePosition);
        }
      }
    }

    // 3. Advance packets along conduits
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

    // 4. Elastic tilt interpolation for pointer reaction
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
