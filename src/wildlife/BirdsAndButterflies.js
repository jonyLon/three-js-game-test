import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { getTerrainHeight } from '../terrain/Noise.js';

export class WildlifeSystem {
  constructor(scene) {
    this.scene = scene;
    this.birds = [];
    this.butterflies = [];

    this.initBirds();
    this.initButterflies();
  }

  initBirds() {
    const birdCount = CONFIG.environment.birdsCount;
    const birdMat = new THREE.MeshStandardMaterial({
      color: 0x222831,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < birdCount; i++) {
      const bird = new THREE.Group();

      // Body
      const bodyGeom = new THREE.ConeGeometry(0.15, 0.6, 5);
      bodyGeom.rotateX(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeom, birdMat);
      bird.add(body);

      // Left Wing
      const leftWingGeom = new THREE.PlaneGeometry(0.6, 0.25);
      leftWingGeom.translate(-0.3, 0, 0);
      const leftWing = new THREE.Mesh(leftWingGeom, birdMat);
      leftWing.position.set(-0.05, 0.05, 0);
      bird.add(leftWing);

      // Right Wing
      const rightWingGeom = new THREE.PlaneGeometry(0.6, 0.25);
      rightWingGeom.translate(0.3, 0, 0);
      const rightWing = new THREE.Mesh(rightWingGeom, birdMat);
      rightWing.position.set(0.05, 0.05, 0);
      bird.add(rightWing);

      bird.position.set(
        (Math.random() - 0.5) * 120,
        15 + Math.random() * 12,
        (Math.random() - 0.5) * 120
      );

      this.scene.add(bird);

      this.birds.push({
        group: bird,
        leftWing,
        rightWing,
        speed: 6.0 + Math.random() * 3.5,
        targetAngle: Math.random() * Math.PI * 2,
        currentAngle: Math.random() * Math.PI * 2,
        flapSpeed: 8.0 + Math.random() * 4.0,
        altitude: 16 + Math.random() * 10,
      });
    }
  }

  initButterflies() {
    const bCount = CONFIG.environment.butterfliesCount;
    const colors = [0x3a86ff, 0xfb5607, 0xff006e, 0xffbe0b];

    for (let i = 0; i < bCount; i++) {
      const group = new THREE.Group();
      const color = colors[i % colors.length];

      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        side: THREE.DoubleSide,
      });

      const wingGeomL = new THREE.PlaneGeometry(0.18, 0.18);
      wingGeomL.translate(-0.09, 0, 0);
      const wingL = new THREE.Mesh(wingGeomL, mat);
      group.add(wingL);

      const wingGeomR = new THREE.PlaneGeometry(0.18, 0.18);
      wingGeomR.translate(0.09, 0, 0);
      const wingR = new THREE.Mesh(wingGeomR, mat);
      group.add(wingR);

      group.position.set(
        (Math.random() - 0.5) * 50,
        3.0,
        (Math.random() - 0.5) * 50
      );

      this.scene.add(group);

      this.butterflies.push({
        group,
        wingL,
        wingR,
        speed: 1.2 + Math.random() * 1.0,
        angle: Math.random() * Math.PI * 2,
        flapSpeed: 14.0 + Math.random() * 6.0,
        centerPos: group.position.clone(),
      });
    }
  }

  update(time, delta, playerPos, timeOfDay) {
    // 1. Update Birds
    const isDay = timeOfDay > 0.22 && timeOfDay < 0.78;
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      
      // Birds flock circle around the player
      const dx = b.group.position.x - playerPos.x;
      const dz = b.group.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 90) {
        // Steer back towards player
        b.targetAngle = Math.atan2(-dz, -dx) + (Math.random() - 0.5) * 0.5;
      } else if (Math.random() < 0.02) {
        b.targetAngle += (Math.random() - 0.5) * 1.2;
      }

      b.currentAngle = THREE.MathUtils.lerp(b.currentAngle, b.targetAngle, 0.03);
      b.group.rotation.y = b.currentAngle;

      // Move forward
      b.group.position.x += Math.sin(b.currentAngle) * b.speed * delta;
      b.group.position.z += Math.cos(b.currentAngle) * b.speed * delta;

      const groundH = getTerrainHeight(b.group.position.x, b.group.position.z);
      const targetY = isDay ? (groundH + b.altitude) : (groundH + 4.0); // Roost lower at night
      b.group.position.y = THREE.MathUtils.lerp(b.group.position.y, targetY, 0.04);

      // Flap wings
      const flap = Math.sin(time * b.flapSpeed) * 0.7;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
      b.group.rotation.z = -Math.sin(time * b.flapSpeed * 0.5) * 0.15;
    }

    // 2. Update Butterflies
    for (let i = 0; i < this.butterflies.length; i++) {
      const bf = this.butterflies[i];

      // Keep near player
      if (bf.group.position.distanceTo(playerPos) > 40) {
        bf.group.position.x = playerPos.x + (Math.random() - 0.5) * 30;
        bf.group.position.z = playerPos.z + (Math.random() - 0.5) * 30;
        bf.centerPos.copy(bf.group.position);
      }

      bf.angle += (Math.random() - 0.5) * 0.3;
      bf.group.position.x += Math.cos(bf.angle) * bf.speed * delta;
      bf.group.position.z += Math.sin(bf.angle) * bf.speed * delta;

      const groundH = getTerrainHeight(bf.group.position.x, bf.group.position.z);
      const bob = Math.sin(time * 3.0 + i) * 0.4;
      bf.group.position.y = groundH + 0.8 + bob;

      // Quick fluttering wings
      const wingFlap = Math.sin(time * bf.flapSpeed) * 1.1;
      bf.wingL.rotation.y = wingFlap;
      bf.wingR.rotation.y = -wingFlap;
      bf.group.rotation.y = bf.angle;
    }
  }

  dispose() {
    this.birds.forEach(b => this.scene.remove(b.group));
    this.butterflies.forEach(bf => this.scene.remove(bf.group));
  }
}
