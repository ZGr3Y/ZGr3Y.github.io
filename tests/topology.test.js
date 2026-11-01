import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { CloudMeshTopology } from '../src/core/CloudMeshTopology.js';

describe('CloudMeshTopology (3D Semantic Node Graph & Packet Conduits)', () => {
  let scene;
  let topology;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  afterEach(() => {
    if (topology) {
      topology.destroy();
      topology = null;
    }
  });

  it('genera proceduralmente nodi distribuiti sui 4 livelli semantici', () => {
    topology = new CloudMeshTopology({ scene, nodeCount: 40 });

    const nodes = topology.getNodes();
    expect(nodes.length).toBe(40);

    // Verifichiamo che i 4 tier semantici siano tutti popolati
    const tiers = nodes.map(n => n.tier);
    expect(tiers).toContain('ingress');   // Blu
    expect(tiers).toContain('defense');   // Verde
    expect(tiers).toContain('telemetry'); // Giallo
    expect(tiers).toContain('exploit');   // Rosso

    // Ogni nodo deve possedere coordinate 3D valide
    nodes.forEach(node => {
      expect(node.position).toBeInstanceOf(THREE.Vector3);
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
      expect(Number.isFinite(node.position.z)).toBe(true);
    });

    // Il gruppo visuale deve essere aggiunto alla scena Three.js
    expect(scene.children).toContain(topology.getRootGroup());
  });

  it('costruisce curve di Bézier per i pacchetti di dati tra i cluster', () => {
    topology = new CloudMeshTopology({ scene, nodeCount: 40 });

    const conduits = topology.getConduits();
    expect(conduits.length).toBeGreaterThan(0);

    // Ogni condotto deve avere una curva 3D valida e un set di pacchetti
    conduits.forEach(conduit => {
      expect(conduit.curve).toBeDefined();
      expect(conduit.packets.length).toBeGreaterThan(0);
      conduit.packets.forEach(packet => {
        expect(packet.progress).toBeGreaterThanOrEqual(0);
        expect(packet.progress).toBeLessThanOrEqual(1);
      });
    });
  });

  it('modula la velocità di propagazione dei pacchetti in base allo speedFactor', () => {
    topology = new CloudMeshTopology({ scene, nodeCount: 40 });
    const conduits = topology.getConduits();
    const packet = conduits[0].packets[0];

    const initialProgress = packet.progress;

    // Aggiornamento a pieno regime (speedFactor = 1.0)
    topology.update(0.016, 1.0);
    const progressActive = packet.progress;
    expect(progressActive).toBeGreaterThan(initialProgress);

    // Aggiornamento in stato idle / congelato (speedFactor = 0.0)
    topology.update(0.016, 0.0);
    const progressIdle = packet.progress;
    // Il progresso deve rimanere esattamente identico (nessun avanzamento)
    expect(progressIdle).toBe(progressActive);
  });

  it('reagisce elasticamente alle coordinate normalizzate del puntatore', () => {
    topology = new CloudMeshTopology({ scene, nodeCount: 40 });
    const root = topology.getRootGroup();

    expect(root.rotation.x).toBe(0);
    expect(root.rotation.y).toBe(0);

    // Simuliamo il puntatore spostato in alto a destra
    topology.setPointer(0.8, -0.6);
    topology.update(0.016, 1.0);

    // La rotazione del gruppo deve essersi mossa verso la direzione elastica
    expect(root.rotation.y).not.toBe(0);
    expect(root.rotation.x).not.toBe(0);
  });

  it('smaltisce geometrie, materiali e rimuove il gruppo Three.js alla distruzione (destroy)', () => {
    topology = new CloudMeshTopology({ scene, nodeCount: 40 });
    const root = topology.getRootGroup();

    expect(scene.children.includes(root)).toBe(true);

    topology.destroy();

    // Il gruppo Three.js deve essere stato rimosso dalla scena
    expect(scene.children.includes(root)).toBe(false);
  });
});
