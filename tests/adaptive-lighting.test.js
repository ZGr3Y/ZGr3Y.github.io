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

  it('genera dinamicamente linee di costellazione (linkParticles) e ragnatela cursore (grabParticle) stile particles.js', () => {
    const nodeA = {
      position: new THREE.Vector3(0, 0, 0),
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.14),
        new THREE.MeshBasicMaterial({ color: 0x0066ff, transparent: true, opacity: 0.55 })
      )
    };
    const nodeB = {
      position: new THREE.Vector3(2.0, 0, 0), // entro linkDistance (4.8) da nodeA
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.14),
        new THREE.MeshBasicMaterial({ color: 0x00d084, transparent: true, opacity: 0.55 })
      )
    };
    const nodeFar = {
      position: new THREE.Vector3(20.0, 0, 0), // fuori linkDistance e grabDistance
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.14),
        new THREE.MeshBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.55 })
      )
    };

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(60 * 3), 3));

    const pointerPos = new THREE.Vector3(1.0, 0.5, 0);
    engine.update([nodeA, nodeB, nodeFar], [], pointerPos, 0.016, geo);

    // 1 link tra nodeA e nodeB + 2 grab links dal cursore verso nodeA e nodeB (almeno 6 vertici + eventuali impulsi laser)
    expect(engine.activeLinkCount).toBe(1);
    expect(engine.activeGrabCount).toBe(2);
    expect(geo.drawRange.count).toBeGreaterThanOrEqual(6);
  });

  it('propaga impulsi laser asincroni (linePackets) lungo le linee tra i pallini e dal puntatore', () => {
    const nodeA = {
      position: new THREE.Vector3(0, 0, 0),
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.14),
        new THREE.MeshBasicMaterial({ color: 0x00b4ff, transparent: true, opacity: 0.82 })
      )
    };
    const nodeB = {
      position: new THREE.Vector3(3.0, 0, 0),
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.14),
        new THREE.MeshBasicMaterial({ color: 0x00f03c, transparent: true, opacity: 0.82 })
      )
    };

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(120 * 3), 3));

    const pointerPos = new THREE.Vector3(0.5, 1.0, 0);

    // Emettiamo un impulso nodo->nodo e uno puntatore->nodo
    engine.spawnLinePacket(0, 1, { r: 0, g: 0.7, b: 1.0 }, false);
    engine.spawnLinePacket(-1, 0, { r: 0, g: 0.7, b: 1.0 }, true);
    expect(engine.linePackets.length).toBe(2);

    // Avanziamo di un frame: i 2 impulsi avanzano e aggiungono 4 vertici ciascuno (scia + testa) al buffer
    engine.updateConstellation([nodeA, nodeB], pointerPos, geo, 0.05);
    expect(engine.linePackets[0].progress).toBeGreaterThan(0);
    expect(geo.drawRange.count).toBeGreaterThanOrEqual(6 + 8);
  });
});
