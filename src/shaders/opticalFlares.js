import * as THREE from 'three';

/**
 * Procedural Optical Lens Flare Generator
 * Generates anamorphic streaks, starbursts, chromatic rings, and glare discs
 */

// Generate procedural textures via HTML5 Canvas
function createCoreGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.15, 'rgba(0, 240, 255, 0.85)');
  gradient.addColorStop(0.4, 'rgba(139, 92, 246, 0.4)');
  gradient.addColorStop(0.7, 'rgba(0, 160, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function createAnamorphicStreakTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Intense horizontal optical streak
  const gradient = ctx.createLinearGradient(0, 32, 512, 32);
  gradient.addColorStop(0, 'rgba(0, 240, 255, 0)');
  gradient.addColorStop(0.3, 'rgba(0, 240, 255, 0.25)');
  gradient.addColorStop(0.48, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.52, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.7, 'rgba(139, 92, 246, 0.25)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 28, 512, 8);

  // Soft vertical blur
  const vGradient = ctx.createLinearGradient(256, 0, 256, 64);
  vGradient.addColorStop(0, 'rgba(0,0,0,0)');
  vGradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.8)');
  vGradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = vGradient;
  ctx.fillRect(0, 0, 512, 64);

  return new THREE.CanvasTexture(canvas);
}

function createChromaticRingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.lineWidth = 12;
  const ringGrad = ctx.createRadialGradient(128, 128, 90, 128, 128, 120);
  ringGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  ringGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.5)');
  ringGrad.addColorStop(0.6, 'rgba(139, 92, 246, 0.6)');
  ringGrad.addColorStop(0.85, 'rgba(245, 158, 11, 0.4)');
  ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.strokeStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(128, 128, 105, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

export function createOpticalFlareSystem({ scene, lightPosition = new THREE.Vector3(0, 0, -5) }) {
  const group = new THREE.Group();
  group.position.copy(lightPosition);

  // 1. Core Flare Sprite
  const coreTex = createCoreGlowTexture();
  const coreMat = new THREE.SpriteMaterial({
    map: coreTex,
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreSprite = new THREE.Sprite(coreMat);
  coreSprite.scale.set(16, 16, 1);
  group.add(coreSprite);

  // 2. Anamorphic Horizontal Streak
  const streakTex = createAnamorphicStreakTexture();
  const streakMat = new THREE.SpriteMaterial({
    map: streakTex,
    color: 0x90e0ef,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const streakSprite = new THREE.Sprite(streakMat);
  streakSprite.scale.set(45, 6, 1);
  group.add(streakSprite);

  // 3. Chromatic Ring
  const ringTex = createChromaticRingTexture();
  const ringMat = new THREE.SpriteMaterial({
    map: ringTex,
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ringSprite = new THREE.Sprite(ringMat);
  ringSprite.scale.set(22, 22, 1);
  group.add(ringSprite);

  // 4. Secondary Glare Discs along optical vector
  const secondaryDiscs = [];
  const discOffsets = [0.25, 0.55, 0.85, -0.3];
  const discScales = [4, 7, 3, 5];
  const discColors = [0x00f0ff, 0x8b5cf6, 0x38bdf8, 0xf59e0b];

  discOffsets.forEach((ratio, idx) => {
    const baseOpacity = 0.45;
    const baseScale = discScales[idx];
    const discMat = new THREE.SpriteMaterial({
      map: coreTex,
      color: discColors[idx],
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const disc = new THREE.Sprite(discMat);
    disc.scale.set(baseScale, baseScale, 1);
    group.add(disc);
    secondaryDiscs.push({ sprite: disc, ratio, baseScale, baseOpacity });
  });

  if (scene) {
    scene.add(group);
  }

  return {
    group,
    setLightPosition(pos) {
      group.position.copy(pos);
    },
    update(camera, time) {
      // Modulate intensity based on angle to camera
      const flareWorldPos = new THREE.Vector3();
      group.getWorldPosition(flareWorldPos);
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);

      const toFlare = new THREE.Vector3().subVectors(flareWorldPos, camera.position).normalize();
      const dot = camDir.dot(toFlare);

      // Fade out if flare is outside camera FOV or behind the lens
      if (dot <= 0.1) {
        coreSprite.material.opacity = 0;
        streakSprite.material.opacity = 0;
        ringSprite.material.opacity = 0;
        secondaryDiscs.forEach(({ sprite }) => {
          sprite.material.opacity = 0;
        });
        return;
      }

      // Smooth falloff factor
      const intensity = Math.min(1, Math.max(0, (dot - 0.1) / 0.7));

      // Subtle breathing flare pulsation
      const pulse = 1 + Math.sin(time * 2.5) * 0.08;
      coreSprite.scale.set(16 * pulse, 16 * pulse, 1);
      streakSprite.scale.set(45 * pulse, 6 * pulse, 1);
      ringSprite.scale.set(22 * pulse, 22 * pulse, 1);

      coreSprite.material.opacity = intensity;
      streakSprite.material.opacity = intensity * 0.95;
      ringSprite.material.opacity = intensity * 0.7;

      // Project flare to camera screen space for secondary optical reflections
      const screenPos = flareWorldPos.clone().project(camera);
      // Secondary reflections disperse along the optical line connecting the light source to screen center
      secondaryDiscs.forEach(({ sprite, ratio, baseScale, baseOpacity }) => {
        sprite.material.opacity = intensity * baseOpacity;
        sprite.scale.set(baseScale * pulse, baseScale * pulse, 1);
        sprite.position.x = -screenPos.x * ratio * 6 + Math.sin(time * 1.5 + ratio) * 0.25;
        sprite.position.y = -screenPos.y * ratio * 6 + Math.cos(time * 1.5 + ratio) * 0.25;
      });
    },
    destroy() {
      if (group.parent) {
        group.parent.remove(group);
      }
      coreTex.dispose();
      streakTex.dispose();
      ringTex.dispose();
    }
  };
}
