import * as THREE from 'three';
import { createRefractiveGlassSculpture } from '../shaders/glassMaterial.js';

/**
 * Variant B: Procedural 3D Refractive Glass Sculptures
 * Physical 3D geometric anchors at each station reflecting dynamic light and reacting to cursor
 */
export class VariantB_Sculptures {
  constructor(scene) {
    this.name = 'Variant B: 3D Glass Sculptures';
    this.description = 'Procedural refractive glass polyhedra, inner energy cores & cursor-reactive dynamics';
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.sculptures = [];
    this.init();
  }

  init() {
    // 1. Station 01 (Gateway): Giant Dodecahedron Glass Core (framed right of cockpit)
    const gatewaySculpture = createRefractiveGlassSculpture({
      geometryType: 'dodecahedron',
      size: 3.4,
      accentColor: 0x00f0ff
    });
    gatewaySculpture.group.position.set(4.2, 0.2, 0);
    this.group.add(gatewaySculpture.group);
    this.sculptures.push(gatewaySculpture);

    // 2. Station 02 (Lab): Dual Refractive Crystalline Anchors
    const labSculptureLeft = createRefractiveGlassSculpture({
      geometryType: 'icosahedron',
      size: 2.3,
      accentColor: 0x8b5cf6
    });
    labSculptureLeft.group.position.set(28, 0.5, -23);
    this.group.add(labSculptureLeft.group);
    this.sculptures.push(labSculptureLeft);

    const labSculptureRight = createRefractiveGlassSculpture({
      geometryType: 'octahedron',
      size: 2.1,
      accentColor: 0x38bdf8
    });
    labSculptureRight.group.position.set(33, 2.5, -24);
    this.group.add(labSculptureRight.group);
    this.sculptures.push(labSculptureRight);

    // 3. Station 03 (Arsenal): Gyroscopic Security Torus Knot
    const arsenalSculpture = createRefractiveGlassSculpture({
      geometryType: 'torusKnot',
      size: 3.0,
      accentColor: 0x00f0ff
    });
    arsenalSculpture.group.position.set(-17.5, -12, -63);
    this.group.add(arsenalSculpture.group);
    this.sculptures.push(arsenalSculpture);

    // 4. Station 04 (Transmission): Octahedral Quantum Beacon
    const transmissionSculpture = createRefractiveGlassSculpture({
      geometryType: 'octahedron',
      size: 3.2,
      accentColor: 0x10b981
    });
    transmissionSculpture.group.position.set(10.5, 22, -103);
    this.group.add(transmissionSculpture.group);
    this.sculptures.push(transmissionSculpture);

    // Add extra directional specular light for crystal reflections
    const specularLight = new THREE.DirectionalLight(0xffffff, 2.5);
    specularLight.position.set(10, 20, 15);
    this.group.add(specularLight);
    this.specularLight = specularLight;
  }

  setSpeedMultiplier(mult) {
    this.sculptures.forEach((sculpture) => {
      if (sculpture.setSpeedMultiplier) sculpture.setSpeedMultiplier(mult);
    });
  }

  setWireframeMode(mode) {
    this.sculptures.forEach((sculpture) => {
      if (sculpture.setWireframeMode) sculpture.setWireframeMode(mode);
    });
  }

  update(time, camera, mouseDelta) {
    this.sculptures.forEach((sculpture) => {
      sculpture.update(time, mouseDelta);
    });

    if (this.specularLight) {
      // Subtle light sweep across facets
      this.specularLight.position.x = 10 + mouseDelta.x * 12;
      this.specularLight.position.y = 20 + mouseDelta.y * 12;
    }
  }

  destroy() {
    this.sculptures.forEach((sculpture) => sculpture.destroy());
    this.sculptures = [];
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
