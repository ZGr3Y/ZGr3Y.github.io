import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { AdaptiveLightingEngine } from '../src/core/AdaptiveLightingEngine.js';

describe('AdaptiveLightingEngine (Adaptive Illumination & Network Ping Waves)', () => {
  let engine;

  beforeEach(() => {
    engine = new AdaptiveLightingEngine({
      ambientOpacity: 0.25,
      activeOpacity: 0.95,
      lightRadius: 7.0,
      scaleBoost: 0.35
    });
  });

  it('mantiene i nodi in stato ambient a riposo in assenza di puntatore', () => {
    const node = {
      position: new THREE.Vector3(1, 2, 3),
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.18),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 })
      )
    };
    const nodes = [node];

    engine.update(nodes, [], null, 0.016);

    expect(node.mesh.material.opacity).toBeCloseTo(0.25, 2);
    expect(node.mesh.scale.x).toBeCloseTo(1.0, 2);
    expect(engine.isResting(nodes)).toBe(true);
  });

  it('illumina e ingrandisce dolcemente i nodi vicini al raggio di luce del puntatore', () => {
    const nodeNear = {
      position: new THREE.Vector3(1, 0, 0),
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.18),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 })
      )
    };
    const nodeFar = {
      position: new THREE.Vector3(25, 0, 0),
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.18),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 })
      )
    };
    const nodes = [nodeNear, nodeFar];
    const pointerPos = new THREE.Vector3(0, 0, 0);

    // Aggiorniamo per 10 frame per consentire l'accensione fluida
    for (let i = 0; i < 10; i++) {
      engine.update(nodes, [], pointerPos, 0.016);
    }

    // Il nodo vicino (a distanza 1) deve essersi illuminato e ingrandito
    expect(nodeNear.mesh.material.opacity).toBeGreaterThan(0.5);
    expect(nodeNear.mesh.scale.x).toBeGreaterThan(1.1);

    // Il nodo lontano non subisce alcuna alterazione
    expect(nodeFar.mesh.material.opacity).toBeCloseTo(0.25, 2);
    expect(nodeFar.mesh.scale.x).toBeCloseTo(1.0, 2);
    expect(engine.isResting(nodes)).toBe(false);
  });

  it('propaga un onda concentrica di luce (Ping Wave) che accende i nodi in sequenza', () => {
    const nodeMid = {
      position: new THREE.Vector3(4, 0, 0),
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.18),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 })
      )
    };
    const nodes = [nodeMid];

    // Lanciamo un impulso/ping dall'origine
    engine.triggerPulse(new THREE.Vector3(0, 0, 0));

    // Facciamo avanzare l'onda finché non raggiunge il nodo a distanza 4
    for (let i = 0; i < 15; i++) {
      engine.update(nodes, [], null, 0.016);
    }

    // L'onda deve aver fatto brillare temporaneamente il nodo
    expect(nodeMid.mesh.material.opacity).toBeGreaterThan(0.25);
  });

  it('dissolve dolcemente la luce tornando allo stato ambient e a riposo quando il cursore esce', () => {
    const node = {
      position: new THREE.Vector3(1, 0, 0),
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.18),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 })
      )
    };
    const nodes = [node];
    const pointerPos = new THREE.Vector3(0, 0, 0);

    // Accendiamo il nodo
    for (let i = 0; i < 10; i++) {
      engine.update(nodes, [], pointerPos, 0.016);
    }
    expect(node.mesh.material.opacity).toBeGreaterThan(0.5);

    // Cursore allontanato (null)
    for (let i = 0; i < 60; i++) {
      engine.update(nodes, [], null, 0.016);
    }

    // La luce deve essere tornata all'ambient (0.25) e la scala a 1.0
    expect(node.mesh.material.opacity).toBeCloseTo(0.25, 2);
    expect(node.mesh.scale.x).toBeCloseTo(1.0, 2);
    expect(engine.isResting(nodes)).toBe(true);
  });
});
