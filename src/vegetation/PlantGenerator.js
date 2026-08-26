import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyWindShader } from './WindShader.js';

function safeMerge(geoms) {
  const nonIndexed = geoms.map(g => (g.index ? g.toNonIndexed() : g));
  return BufferGeometryUtils.mergeGeometries(nonIndexed, false);
}

export class PlantGenerator {
  constructor() {
    this.materials = this.createMaterials();
    this.prototypes = this.createPrototypes();
  }

  createMaterials() {
    const fernMat = new THREE.MeshStandardMaterial({
      color: 0x2d8a39,
      roughness: 0.7,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      flatShading: true,
    });
    applyWindShader(fernMat, { strength: 0.45, speed: 2.0, minHeight: 0.1 });

    const flowerRedMat = new THREE.MeshStandardMaterial({
      color: 0xe63946, // Forest Poppy
      roughness: 0.6,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    applyWindShader(flowerRedMat, { strength: 0.4, speed: 2.2, minHeight: 0.2 });

    const flowerBlueMat = new THREE.MeshStandardMaterial({
      color: 0x4361ee, // Forest Bluebell
      roughness: 0.6,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    applyWindShader(flowerBlueMat, { strength: 0.4, speed: 2.2, minHeight: 0.2 });

    const flowerYellowMat = new THREE.MeshStandardMaterial({
      color: 0xffb703, // Forest Daisy / Buttercup
      roughness: 0.6,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    applyWindShader(flowerYellowMat, { strength: 0.4, speed: 2.2, minHeight: 0.2 });

    const flowerStemMat = new THREE.MeshStandardMaterial({
      color: 0x386641,
      roughness: 0.8,
    });
    applyWindShader(flowerStemMat, { strength: 0.35, speed: 2.2, minHeight: 0.1 });

    const mushroomCapMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.5,
      emissive: 0x330005,
    });

    const mushroomStemMat = new THREE.MeshStandardMaterial({
      color: 0xfdf0d5,
      roughness: 0.8,
    });

    const chanterelleMat = new THREE.MeshStandardMaterial({
      color: 0xf4a261,
      roughness: 0.6,
    });

    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x2b6329,
      roughness: 0.8,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      flatShading: true,
    });
    applyWindShader(bushMat, { strength: 0.3, speed: 1.8, minHeight: 0.2 });

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6c757d,
      roughness: 0.9,
      flatShading: true,
    });

    const mossyRockMat = new THREE.MeshStandardMaterial({
      color: 0x4a6b4a,
      roughness: 0.85,
      flatShading: true,
    });

    return {
      fernMat,
      flowerRedMat,
      flowerBlueMat,
      flowerYellowMat,
      flowerStemMat,
      mushroomCapMat,
      mushroomStemMat,
      chanterelleMat,
      bushMat,
      rockMat,
      mossyRockMat,
    };
  }

  createPrototypes() {
    return {
      fern: this.buildFern(),
      flowerRed: this.buildFlower(this.materials.flowerRedMat),
      flowerBlue: this.buildFlower(this.materials.flowerBlueMat),
      flowerYellow: this.buildFlower(this.materials.flowerYellowMat),
      mushroom: this.buildMushroom(),
      chanterelle: this.buildChanterelle(),
      bush: this.buildBush(),
      rock: this.buildRock(false),
      mossyRock: this.buildRock(true),
    };
  }

  buildFern() {
    const group = new THREE.Group();
    const fronds = 7;
    const frondGeoms = [];

    for (let i = 0; i < fronds; i++) {
      const angle = (i / fronds) * Math.PI * 2;
      const geom = new THREE.PlaneGeometry(0.35, 1.4, 2, 4);
      // Curve frond downward
      const pos = geom.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const y = pos.getY(j);
        const bend = Math.pow(Math.max(0, y + 0.7) / 1.4, 2) * 0.4;
        pos.setZ(j, bend);
      }
      geom.rotateX(-Math.PI * 0.25);
      geom.rotateY(angle);
      geom.translate(0, 0.5, 0);
      frondGeoms.push(geom);
    }

    const merged = safeMerge(frondGeoms);
    const mesh = new THREE.Mesh(merged, this.materials.fernMat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  buildFlower(petalMat) {
    const group = new THREE.Group();

    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.02, 0.03, 0.7, 5);
    stemGeom.translate(0, 0.35, 0);
    const stemMesh = new THREE.Mesh(stemGeom, this.materials.flowerStemMat);
    group.add(stemMesh);

    // Petals (star-burst or disc)
    const petalCount = 5;
    const petalGeoms = [];
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petal = new THREE.PlaneGeometry(0.12, 0.25);
      petal.rotateX(Math.PI * 0.35);
      petal.rotateY(angle);
      petal.translate(0, 0.7, 0);
      petalGeoms.push(petal);
    }
    const center = new THREE.SphereGeometry(0.07, 5, 5);
    center.translate(0, 0.72, 0);
    petalGeoms.push(center);

    const mergedPetals = safeMerge(petalGeoms);
    const petalMesh = new THREE.Mesh(mergedPetals, petalMat);
    group.add(petalMesh);

    return group;
  }

  buildMushroom() {
    const group = new THREE.Group();
    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.06, 0.09, 0.35, 6);
    stemGeom.translate(0, 0.175, 0);
    const stemMesh = new THREE.Mesh(stemGeom, this.materials.mushroomStemMat);
    group.add(stemMesh);

    // Red Cap
    const capGeom = new THREE.SphereGeometry(0.22, 7, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    capGeom.translate(0, 0.35, 0);
    const capMesh = new THREE.Mesh(capGeom, this.materials.mushroomCapMat);
    group.add(capMesh);

    return group;
  }

  buildChanterelle() {
    const group = new THREE.Group();
    const geom = new THREE.ConeGeometry(0.25, 0.4, 6);
    geom.rotateX(Math.PI);
    geom.translate(0, 0.25, 0);
    const mesh = new THREE.Mesh(geom, this.materials.chanterelleMat);
    group.add(mesh);
    return group;
  }

  buildBush() {
    const group = new THREE.Group();
    const geoms = [];
    for (let i = 0; i < 4; i++) {
      const rad = 0.5 + Math.random() * 0.3;
      const g = new THREE.DodecahedronGeometry(rad, 1);
      g.translate(
        (Math.random() - 0.5) * 0.6,
        rad * 0.8,
        (Math.random() - 0.5) * 0.6
      );
      geoms.push(g);
    }
    const merged = safeMerge(geoms);
    const mesh = new THREE.Mesh(merged, this.materials.bushMat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  buildRock(isMossy = false) {
    const group = new THREE.Group();
    const rad = 0.6 + Math.random() * 0.8;
    const geom = new THREE.DodecahedronGeometry(rad, 1);
    
    // Deform vertices for natural rock shape
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const scale = 0.8 + Math.sin(x * 3 + y * 2 + z * 4) * 0.25;
      pos.setXYZ(i, x * scale, y * scale * 0.65, z * scale);
    }
    geom.computeVertexNormals();

    const mat = isMossy ? this.materials.mossyRockMat : this.materials.rockMat;
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }
}
