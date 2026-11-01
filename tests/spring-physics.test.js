import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { SpringPhysicsEngine } from '../src/core/SpringPhysicsEngine.js';

describe('SpringPhysicsEngine (Elastic Spring-Damper & Pointer Influence)', () => {
  let engine;

  beforeEach(() => {
    // Inizializza l'engine con i parametri specificati nel Ticket 03 (Issue #4)
    engine = new SpringPhysicsEngine({
      stiffness: 0.12,
      damping: 0.85,
      repulsionRadius: 3.5,
      repulsionForce: 2.0
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

  it('riporta un nodo spostato alla sua basePosition tramite oscillazione smorzata (Legge di Hooke)', () => {
    const nodes = [
      {
        position: new THREE.Vector3(3, 0, 0), // Spostato di +2 unità lungo l'asse X
        basePosition: new THREE.Vector3(1, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      }
    ];

    // Primo frame: la molla deve generare una forza di richiamo verso sinistra (-X)
    engine.update(nodes, null, 0.016);
    expect(nodes[0].velocity.x).toBeLessThan(0);

    // Simuliamo 120 frame di assestamento fisico (circa 2 secondi a 60fps)
    for (let i = 0; i < 120; i++) {
      engine.update(nodes, null, 0.016);
    }

    // Il nodo deve essere tornato vicino alla basePosition (1, 0, 0) con velocità azzerata
    expect(nodes[0].position.x).toBeCloseTo(1, 1);
    expect(nodes[0].velocity.length()).toBeCloseTo(0, 1);
    expect(engine.isResting(nodes)).toBe(true);
  });

  it('applica una forza elastica di repulsione solo ai nodi vicini al puntatore', () => {
    const nodeNear = {
      position: new THREE.Vector3(0.5, 0, 0),
      basePosition: new THREE.Vector3(0.5, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0)
    };
    const nodeFar = {
      position: new THREE.Vector3(15, 0, 0), // Ben oltre repulsionRadius = 3.5
      basePosition: new THREE.Vector3(15, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0)
    };
    const nodes = [nodeNear, nodeFar];

    // Puntatore posizionato sull'origine (0, 0, 0)
    const pointerPos = new THREE.Vector3(0, 0, 0);

    engine.update(nodes, pointerPos, 0.016);

    // Il nodo vicino (a distanza 0.5) deve essere respinto verso l'esterno (+X)
    expect(nodeNear.velocity.x).toBeGreaterThan(0);
    expect(nodeNear.position.x).toBeGreaterThan(0.5);

    // Il nodo lontano non deve subire alcuna alterazione
    expect(nodeFar.velocity.length()).toBe(0);
    expect(nodeFar.position.x).toBe(15);
  });

  it('consente il recupero elastico una volta che il puntatore si allontana', () => {
    const node = {
      position: new THREE.Vector3(0.5, 0, 0),
      basePosition: new THREE.Vector3(0.5, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0)
    };
    const nodes = [node];
    const pointerPos = new THREE.Vector3(0, 0, 0);

    // Il puntatore deforma il nodo per 10 frame
    for (let i = 0; i < 10; i++) {
      engine.update(nodes, pointerPos, 0.016);
    }
    expect(node.position.x).toBeGreaterThan(0.5);
    expect(engine.isResting(nodes)).toBe(false);

    // Il puntatore se ne va (null)
    for (let i = 0; i < 150; i++) {
      engine.update(nodes, null, 0.016);
    }

    // Il nodo deve essere tornato alla sua posizione di riposo originaria
    expect(node.position.x).toBeCloseTo(0.5, 1);
    expect(engine.isResting(nodes)).toBe(true);
  });
});
