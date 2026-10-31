import * as THREE from 'three';
import { createOpticalFlareSystem } from '../shaders/opticalFlares.js';
import { STATIONS } from '../stations/stationsData.js';

/**
 * Variant A: Deep Space Optics & Anamorphic Lens Flare Atmosphere
 * Emphasizes optical physics, anamorphic streaks, chromatic halos, and luminous beacons
 */
export class VariantA_Optics {
  constructor(scene) {
    this.name = 'Variant A: Optics & Flares';
    this.description = 'Procedural optical flares, anamorphic streaks, chromatic halos & caustic atmosphere';
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.flares = [];
    this.beaconRings = [];
    this.lightSources = [];

    this.init();
  }

  init() {
    // 1. Primary Optical Flare centered at Gateway
    const primaryFlare = createOpticalFlareSystem({
      scene: this.group,
      lightPosition: new THREE.Vector3(0, 2, -12)
    });
    this.flares.push(primaryFlare);

    // 2. Optical Flares at other stations
    const stationFlarePositions = [
      new THREE.Vector3(24, 8, -35),   // Lab
      new THREE.Vector3(-22, -10, -75), // Arsenal
      new THREE.Vector3(6, 24, -115)    // Transmission
    ];

    stationFlarePositions.forEach((pos) => {
      const flare = createOpticalFlareSystem({
        scene: this.group,
        lightPosition: pos
      });
      this.flares.push(flare);
    });

    // 3. Volumetric Caustic Beacon Rings at each station
    STATIONS.forEach((station) => {
      const center = station.camera.target;
      const ringGroup = new THREE.Group();
      ringGroup.position.set(center.x, center.y, center.z - 3);

      for (let r = 0; r < 3; r++) {
        const radius = 4 + r * 2.5;
        const ringGeo = new THREE.TorusGeometry(radius, 0.04, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: r === 0 ? 0x00f0ff : (r === 1 ? 0x8b5cf6 : 0x38bdf8),
          transparent: true,
          opacity: 0.35 - r * 0.08,
          blending: THREE.AdditiveBlending
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2 + (r * 0.2);
        ringMesh.rotation.y = r * 0.3;
        ringGroup.add(ringMesh);

        this.beaconRings.push({
          mesh: ringMesh,
          speed: 0.2 + r * 0.15,
          axis: r % 2 === 0 ? 'z' : 'y'
        });
      }

      this.group.add(ringGroup);
    });

    // 4. Colored Ambient Light Anchors
    const cyanLight = new THREE.PointLight(0x00f0ff, 3, 40);
    cyanLight.position.set(0, 4, -8);
    this.group.add(cyanLight);
    this.lightSources.push(cyanLight);

    const violetLight = new THREE.PointLight(0x8b5cf6, 2.5, 50);
    violetLight.position.set(24, 10, -25);
    this.group.add(violetLight);
    this.lightSources.push(violetLight);
  }

  update(time, camera, mouseDelta) {
    // Update optical flares with camera relation
    this.flares.forEach((flare) => flare.update(camera, time));

    // Rotate beacon rings
    this.beaconRings.forEach(({ mesh, speed, axis }) => {
      mesh.rotation[axis] += speed * 0.015;
    });

    // Flare position breathing
    if (this.lightSources[0]) {
      this.lightSources[0].position.x = Math.sin(time * 0.8) * 3;
      this.lightSources[0].position.y = 2 + Math.cos(time * 0.6) * 1.5;
    }
  }

  destroy() {
    this.flares.forEach((flare) => flare.destroy());
    this.flares = [];
    this.beaconRings = [];
    this.lightSources = [];
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
