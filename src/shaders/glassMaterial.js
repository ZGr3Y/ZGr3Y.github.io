import * as THREE from 'three';

/**
 * High-End Physical Glass Material Factory
 * Creates physically based transmission glass with dispersion, Fresnel reflections, and specular sheen
 */
export function createPhysicalGlassMaterial({
  color = 0x0a1628,
  transmission = 0.94,
  roughness = 0.06,
  metalness = 0.02,
  ior = 1.54,
  thickness = 1.8,
  attenuationColor = 0x00f0ff,
  attenuationDistance = 2.5,
  specularColor = 0xffffff,
  wireframe = false
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness,
    roughness,
    transmission,
    ior,
    thickness,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(specularColor),
    attenuationColor: new THREE.Color(attenuationColor),
    attenuationDistance,
    transparent: true,
    opacity: 1.0,
    wireframe,
    side: THREE.DoubleSide
  });
}

/**
 * Holographic Edge Glow Material for Wireframes & Prismatic Rings
 */
export function createHolographicWireMaterial({ color = 0x00f0ff, opacity = 0.65 } = {}) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    wireframe: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending
  });
}

/**
 * Refractive Crystalline Anchor Mesh Factory
 * Generates an outer refractive glass shell with an inner floating energy core
 */
export function createRefractiveGlassSculpture({
  geometryType = 'dodecahedron', // 'dodecahedron' | 'icosahedron' | 'octahedron' | 'torusKnot'
  size = 2.5,
  accentColor = 0x00f0ff
} = {}) {
  const group = new THREE.Group();

  let outerGeo;
  let innerGeo;

  switch (geometryType) {
    case 'icosahedron':
      outerGeo = new THREE.IcosahedronGeometry(size, 0);
      innerGeo = new THREE.IcosahedronGeometry(size * 0.6, 1);
      break;
    case 'octahedron':
      outerGeo = new THREE.OctahedronGeometry(size, 0);
      innerGeo = new THREE.OctahedronGeometry(size * 0.65, 0);
      break;
    case 'torusKnot':
      outerGeo = new THREE.TorusKnotGeometry(size * 0.6, size * 0.22, 100, 16);
      innerGeo = new THREE.TorusKnotGeometry(size * 0.58, size * 0.08, 64, 8);
      break;
    case 'dodecahedron':
    default:
      outerGeo = new THREE.DodecahedronGeometry(size, 0);
      innerGeo = new THREE.DodecahedronGeometry(size * 0.6, 1);
      break;
  }

  // Outer Refractive Glass Shell
  const glassMat = createPhysicalGlassMaterial({
    color: 0x0a1c36,
    transmission: 0.95,
    roughness: 0.08,
    ior: 1.52,
    thickness: 2.0,
    attenuationColor: accentColor
  });
  const glassMesh = new THREE.Mesh(outerGeo, glassMat);
  glassMesh.castShadow = true;
  glassMesh.receiveShadow = true;
  glassMesh.renderOrder = 1;

  // Outer Wireframe Facet Highlighter
  const wireMat = new THREE.MeshBasicMaterial({
    color: accentColor,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });
  const wireMesh = new THREE.Mesh(outerGeo, wireMat);
  wireMesh.scale.setScalar(1.002);
  wireMesh.renderOrder = 2;

  // Inner Pulsing Core
  const innerMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: new THREE.Color(accentColor),
    emissiveIntensity: 0.8,
    roughness: 0.2,
    wireframe: true
  });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.renderOrder = 0;

  // Gyroscopic Orbital Ring
  const ringGeo = new THREE.TorusGeometry(size * 1.45, 0.03, 16, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 3;
  ringMesh.renderOrder = 2;

  const ringGeo2 = new THREE.TorusGeometry(size * 1.7, 0.02, 16, 64);
  const ringMat2 = new THREE.MeshBasicMaterial({
    color: 0x8b5cf6,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });
  const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
  ringMesh2.rotation.y = Math.PI / 4;
  ringMesh2.renderOrder = 2;

  // Dedicated point light to illuminate glass facets and cast specular glints
  const pointLight = new THREE.PointLight(accentColor, 2.5, size * 8);
  pointLight.position.set(size * 1.5, size * 1.5, size * 1.5);

  // Add in deterministic render hierarchy
  group.add(innerMesh);
  group.add(glassMesh);
  group.add(wireMesh);
  group.add(ringMesh);
  group.add(ringMesh2);
  group.add(pointLight);

  let speedMultiplier = 1.0;

  return {
    group,
    glassMesh,
    innerMesh,
    wireMesh,
    ringMesh,
    ringMesh2,
    pointLight,
    geometryType,
    setSpeedMultiplier(mult) {
      speedMultiplier = mult;
    },
    setWireframeMode(mode) {
      if (mode === 'wireframe') {
        glassMesh.visible = false;
        wireMesh.visible = true;
        wireMat.opacity = 0.8;
      } else if (mode === 'glass') {
        glassMesh.visible = true;
        wireMesh.visible = false;
      } else {
        // hybrid
        glassMesh.visible = true;
        wireMesh.visible = true;
        wireMat.opacity = 0.35;
      }
    },
    update(time, mouseDelta = { x: 0, y: 0 }) {
      const activeTime = time * speedMultiplier;
      // Rotation dynamics
      glassMesh.rotation.x = activeTime * 0.25 + mouseDelta.y * 0.5;
      glassMesh.rotation.y = activeTime * 0.35 + mouseDelta.x * 0.5;
      wireMesh.rotation.copy(glassMesh.rotation);

      // Inner core counter-rotation
      innerMesh.rotation.x = -activeTime * 0.4;
      innerMesh.rotation.y = activeTime * 0.5;

      // Inner core pulse
      const pulse = 1 + Math.sin(activeTime * 3) * 0.08;
      innerMesh.scale.setScalar(pulse);

      // Orbital rings rotation
      ringMesh.rotation.z = activeTime * 0.4;
      ringMesh2.rotation.x = activeTime * 0.3;
      ringMesh2.rotation.z = -activeTime * 0.25;

      // Point light orbit
      pointLight.position.x = Math.sin(activeTime * 1.5) * size * 2;
      pointLight.position.z = Math.cos(activeTime * 1.5) * size * 2;
    },
    destroy() {
      if (group.parent) group.parent.remove(group);
      outerGeo.dispose();
      innerGeo.dispose();
      ringGeo.dispose();
      ringGeo2.dispose();
      glassMat.dispose();
      wireMat.dispose();
      innerMat.dispose();
      ringMat.dispose();
      ringMat2.dispose();
    }
  };
}
