import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { getTerrainHeight } from '../terrain/Noise.js';

/**
 * Creates smooth radial glow circle texture to eliminate square point artifacts
 */
function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
  grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.circleTex = createCircleTexture();

    this.initFireflies();
    this.initPollen();
    this.initLeaves();
  }

  initFireflies() {
    const count = CONFIG.environment.firefliesCount;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 8 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.5 + Math.random() * 0.8;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

    this.fireflyMat = new THREE.PointsMaterial({
      color: 0xd4ff00,
      map: this.circleTex,
      size: 0.45,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.fireflies = new THREE.Points(geom, this.fireflyMat);
    this.scene.add(this.fireflies);
  }

  initPollen() {
    const count = CONFIG.environment.pollenCount;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 10 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.pollenMat = new THREE.PointsMaterial({
      color: 0xfffae0,
      map: this.circleTex,
      size: 0.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pollen = new THREE.Points(geom, this.pollenMat);
    this.scene.add(this.pollen);
  }

  initLeaves() {
    const count = 40;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = Math.random() * 12 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.leafMat = new THREE.PointsMaterial({
      color: 0xd97724,
      map: this.circleTex,
      size: 0.28,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.leaves = new THREE.Points(geom, this.leafMat);
    this.scene.add(this.leaves);
  }

  update(time, delta, playerPos, timeOfDay) {
    // 1. Update Fireflies
    const isNight = timeOfDay < 0.2 || timeOfDay > 0.8;
    const nightIntensity = isNight ? 1.0 : (timeOfDay < 0.25 || timeOfDay > 0.75 ? 0.5 : 0.0);
    this.fireflyMat.opacity = THREE.MathUtils.lerp(this.fireflyMat.opacity, nightIntensity * 0.9, 0.05);

    if (this.fireflyMat.opacity > 0.05) {
      const pos = this.fireflies.geometry.attributes.position;
      const phases = this.fireflies.geometry.attributes.phase;
      const speeds = this.fireflies.geometry.attributes.speed;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        const phase = phases.getX(i);
        const speed = speeds.getX(i);

        x += Math.sin(time * speed + phase) * 0.03;
        y += Math.cos(time * speed * 0.7 + phase) * 0.02;
        z += Math.sin(time * speed * 0.5 + phase * 1.5) * 0.03;

        if (Math.abs(x - playerPos.x) > 40) x = playerPos.x + (Math.random() - 0.5) * 60;
        if (Math.abs(z - playerPos.z) > 40) z = playerPos.z + (Math.random() - 0.5) * 60;

        const groundH = getTerrainHeight(x, z);
        if (y < groundH + 0.5) y = groundH + 0.8 + Math.random() * 2.0;
        if (y > groundH + 8.0) y = groundH + 3.0;

        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }

    // 2. Update Pollen
    const pPos = this.pollen.geometry.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      let x = pPos.getX(i);
      let y = pPos.getY(i);
      let z = pPos.getZ(i);

      x += Math.sin(time * 0.6 + i) * 0.02 + 0.01;
      y += Math.cos(time * 0.4 + i) * 0.015;
      z += Math.cos(time * 0.5 + i) * 0.02;

      if (Math.abs(x - playerPos.x) > 35) x = playerPos.x + (Math.random() - 0.5) * 60;
      if (Math.abs(z - playerPos.z) > 35) z = playerPos.z + (Math.random() - 0.5) * 60;
      
      const groundH = getTerrainHeight(x, z);
      if (y < groundH + 0.3) y = groundH + 0.5 + Math.random() * 6.0;

      pPos.setXYZ(i, x, y, z);
    }
    pPos.needsUpdate = true;

    // 3. Update Leaves
    const lPos = this.leaves.geometry.attributes.position;
    for (let i = 0; i < lPos.count; i++) {
      let x = lPos.getX(i);
      let y = lPos.getY(i);
      let z = lPos.getZ(i);

      y -= delta * (0.8 + (i % 3) * 0.3);
      x += Math.sin(time * 1.5 + i) * 0.05 + 0.03;
      z += Math.cos(time * 1.2 + i) * 0.04;

      const groundH = getTerrainHeight(x, z);
      if (y < groundH + 0.1 || Math.abs(x - playerPos.x) > 30 || Math.abs(z - playerPos.z) > 30) {
        x = playerPos.x + (Math.random() - 0.5) * 45;
        z = playerPos.z + (Math.random() - 0.5) * 45;
        y = getTerrainHeight(x, z) + 8 + Math.random() * 10;
      }

      lPos.setXYZ(i, x, y, z);
    }
    lPos.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.fireflies);
    this.scene.remove(this.pollen);
    this.scene.remove(this.leaves);
    if (this.circleTex) this.circleTex.dispose();
  }
}
