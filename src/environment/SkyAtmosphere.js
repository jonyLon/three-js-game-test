import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class SkyAtmosphere {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.timeOfDay = 0.35; // Bright sunny daytime
    this.timeSpeed = 0; // Disabled day-night cycling (Day only)
    this.isPaused = true;

    this.initLights();
    this.initSky();
    this.initFog();
  }

  initLights() {
    // Ambient / Hemisphere Light (Sky & Ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x334422, 0.6);
    this.scene.add(this.hemiLight);

    // Sun Directional Light
    this.sunLight = new THREE.DirectionalLight(0xfff3d6, CONFIG.environment.sunIntensityMax);
    this.sunLight.castShadow = CONFIG.graphics.shadows;
    this.sunLight.shadow.mapSize.width = CONFIG.graphics.shadowMapSize;
    this.sunLight.shadow.mapSize.height = CONFIG.graphics.shadowMapSize;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Moon Light
    this.moonLight = new THREE.DirectionalLight(0x7799cc, CONFIG.environment.moonIntensityMax);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);

    // Sun Visual Mesh (Glowing Billboard)
    const sunGeom = new THREE.SphereGeometry(6, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.scene.add(this.sunMesh);

    // Moon Visual Mesh
    const moonGeom = new THREE.SphereGeometry(4, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xdde8fa });
    this.moonMesh = new THREE.Mesh(moonGeom, moonMat);
    this.scene.add(this.moonMesh);
  }

  initSky() {
    // Starfield for night sky
    const starCount = 1200;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 240.0;

      // Only top hemisphere
      const y = Math.abs(r * Math.cos(phi)) + 10.0;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const z = r * Math.sin(phi) * Math.sin(theta);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
    }

    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: false,
    });
    this.stars = new THREE.Points(starGeom, this.starMaterial);
    this.scene.add(this.stars);
  }

  initFog() {
    this.scene.fog = new THREE.FogExp2(0x99c2d6, CONFIG.environment.fogDensityDay);
  }

  update(delta, playerPos) {
    if (!this.isPaused) {
      this.timeOfDay = (this.timeOfDay + delta * this.timeSpeed) % 1.0;
    }

    // Celestial angle (0 to 2PI)
    const angle = this.timeOfDay * Math.PI * 2;
    const sunElevation = Math.sin(angle);
    const sunAzimuth = Math.cos(angle);

    const orbitRadius = 150;
    const sunX = playerPos.x + sunAzimuth * orbitRadius;
    const sunY = playerPos.y + sunElevation * orbitRadius;
    const sunZ = playerPos.z + Math.sin(angle * 0.5) * 40;

    const moonX = playerPos.x - sunAzimuth * orbitRadius;
    const moonY = playerPos.y - sunElevation * orbitRadius;
    const moonZ = playerPos.z - Math.sin(angle * 0.5) * 40;

    // Position sun & moon
    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.moonMesh.position.set(moonX, moonY, moonZ);

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();

    this.moonLight.position.set(moonX, moonY, moonZ);
    this.moonLight.target.position.copy(playerPos);
    this.moonLight.target.updateMatrixWorld();

    // Move starfield with player
    this.stars.position.copy(playerPos);

    // Color Transitions based on sun height
    const isDay = sunElevation > 0;
    const sunHeight = Math.max(0, sunElevation);
    const sunsetFactor = Math.max(0, 1.0 - Math.abs(sunElevation) * 3.5);

    let skyColor, fogColor, hemiSkyColor, hemiGroundColor;
    let sunIntensity = 0;
    let moonIntensity = 0;

    if (sunElevation > 0.1) {
      // Crisp Daytime
      const t = Math.min(1.0, (sunElevation - 0.1) / 0.5);
      skyColor = new THREE.Color(0x6aaed6).lerp(new THREE.Color(0x4299e1), t);
      fogColor = new THREE.Color(0xb0d4ec).lerp(new THREE.Color(0x8bc3eb), t);
      hemiSkyColor = new THREE.Color(0xdceeff);
      hemiGroundColor = new THREE.Color(0x3a5328);
      sunIntensity = THREE.MathUtils.lerp(0.8, CONFIG.environment.sunIntensityMax, t);
      this.sunLight.color.setHex(0xfffae8);
      this.starMaterial.opacity = 0.0;
    } else if (sunElevation > -0.15) {
      // Golden Hour / Dawn / Dusk
      const t = (sunElevation + 0.15) / 0.25;
      skyColor = new THREE.Color(0x1a1c3d).lerp(new THREE.Color(0xe07a5f), t);
      fogColor = new THREE.Color(0x342a45).lerp(new THREE.Color(0xf2a65a), t);
      hemiSkyColor = new THREE.Color(0xf48c06);
      hemiGroundColor = new THREE.Color(0x281912);
      sunIntensity = THREE.MathUtils.lerp(0.0, 0.9, t);
      this.sunLight.color.setHex(0xff7733);
      this.starMaterial.opacity = (1.0 - t) * 0.7;
    } else {
      // Night / Midnight
      const t = Math.min(1.0, (-sunElevation - 0.15) / 0.4);
      skyColor = new THREE.Color(0x060814);
      fogColor = new THREE.Color(0x0a0f1d);
      hemiSkyColor = new THREE.Color(0x131a2e);
      hemiGroundColor = new THREE.Color(0x080c14);
      moonIntensity = THREE.MathUtils.lerp(0.1, CONFIG.environment.moonIntensityMax, t);
      this.starMaterial.opacity = 0.95;
    }

    this.scene.background = skyColor;
    this.scene.fog.color.copy(fogColor);
    this.renderer.setClearColor(skyColor);

    this.hemiLight.color.copy(hemiSkyColor);
    this.hemiLight.groundColor.copy(hemiGroundColor);

    this.sunLight.intensity = sunIntensity;
    this.moonLight.intensity = moonIntensity;
  }

  setTime(fraction) {
    this.timeOfDay = Math.max(0, Math.min(1, fraction));
  }

  getTimeFormatted() {
    const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
