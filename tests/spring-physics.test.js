import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { SpringPhysicsEngine } from '../src/core/SpringPhysicsEngine.js';

describe('SpringPhysicsEngine (Gravitational Well & Fluid Orbital Swirl)', () => {
  let engine;

  beforeEach(() => {
    // Inizializza l'engine gravitazionale con parametri fluidi
    engine = new SpringPhysicsEngine({
      stiffness: 12.0,
      damping: 0.88,
      attractionRadius: 6.0,
      attractionForce: 15.0,
      orbitalSwirl: 2.5,
      coreRadius: 0.75
    });
  });

  it('mantiene i nodi in perfetto equilibrio a riposo in assenza di forze esterne', () => {
    const nodes = [
      {
        position: new THREE.Vector3(1, 2, 3),
        basePosition: new THREE.Vector3(1, 2, 3),
        velocity: new THREE.Vector3(0, 0, 0)
      }
    ];

    engine.update(nodes, null, 0.016);

    expect(nodes[0].position.x).toBe(1);
    expect(nodes[0].position.y).toBe(2);
    expect(nodes[0].position.z).toBe(3);
    expect(nodes[0].velocity.length()).toBe(0);
    expect(engine.isResting(nodes)).toBe(true);
  });

  it('riporta un nodo spostato alla sua basePosition con scorrimento fluido e smorzato', () => {
    const nodes = [
      {
        position: new THREE.Vector3(3, 0, 0), // Spostato di +1 unità rispetto a base
        basePosition: new THREE.Vector3(2, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      }
    ];

    // Primo frame: la molla morbida inizia a tirare verso sinistra (-X)
    engine.update(nodes, null, 0.016);
    expect(nodes[0].velocity.x).toBeLessThan(0);

    // Simuliamo 150 frame di scorrimento cinematografico fluido
    for (let i = 0; i < 150; i++) {
      engine.update(nodes, null, 0.016);
    }

    // Il nodo deve essere tornato vicino alla basePosition (2, 0, 0)
    expect(nodes[0].position.x).toBeCloseTo(2, 1);
    expect(nodes[0].velocity.length()).toBeCloseTo(0, 1);
    expect(engine.isResting(nodes)).toBe(true);
  });

  it('esercita un attrazione gravitazionale fluida sui nodi nel suo raggio di influenza', () => {
    // Nodo a x = 2.0 (entro attractionRadius = 6.0)
    const nodeNear = {
      position: new THREE.Vector3(2.0, 0, 0),
      basePosition: new THREE.Vector3(2.0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0)
    };
    // Nodo a x = 20.0 (fuori dal raggio gravitazionale)
    const nodeFar = {
      position: new THREE.Vector3(20, 0, 0),
      basePosition: new THREE.Vector3(20, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0)
    };
    const nodes = [nodeNear, nodeFar];

    // Centro gravitazionale all'origine (0, 0, 0)
    const pointerPos = new THREE.Vector3(0, 0, 0);

    engine.update(nodes, pointerPos, 0.016);

    // Il nodo vicino viene attratto verso il cursore (verso -X)
    expect(nodeNear.velocity.x).toBeLessThan(0);
    expect(nodeNear.position.x).toBeLessThan(2.0);

    // Il nodo lontano non subisce alcuna alterazione
    expect(nodeFar.velocity.length()).toBe(0);
    expect(nodeFar.position.x).toBe(20);
  });

  it('consente il recupero elastico setoso una volta che il cursore si allontana', () => {
    const node = {
      position: new THREE.Vector3(2.0, 0, 0),
      basePosition: new THREE.Vector3(2.0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0)
    };
    const nodes = [node];
    const pointerPos = new THREE.Vector3(0, 0, 0);

    // Gravità attiva per 15 frame
    for (let i = 0; i < 15; i++) {
      engine.update(nodes, pointerPos, 0.016);
    }
    expect(node.position.x).toBeLessThan(2.0);
    expect(engine.isResting(nodes)).toBe(false);

    // Cursore allontanato (null)
    for (let i = 0; i < 150; i++) {
      engine.update(nodes, null, 0.016);
    }

    // Il nodo deve essere tornato alla sua orbita base
    expect(node.position.x).toBeCloseTo(2.0, 1);
    expect(engine.isResting(nodes)).toBe(true);
  });
});
