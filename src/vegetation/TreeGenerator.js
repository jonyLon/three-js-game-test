import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyWindShader } from './WindShader.js';

function safeMerge(geoms) {
  const nonIndexed = geoms.map(g => (g.index ? g.toNonIndexed() : g));
  return BufferGeometryUtils.mergeGeometries(nonIndexed, false);
}

/**
 * Creates procedural tree prototypes with high aesthetic quality and merged geometries
 * for maximum performance.
 */
export class TreeGenerator {

  constructor() {
    this.materials = this.createMaterials();
    this.prototypes = this.createPrototypes();
  }

  createMaterials() {
    const loader = new THREE.TextureLoader();
    const barkMap = loader.load('/textures/procedural_bark.png');
    barkMap.wrapS = barkMap.wrapT = THREE.RepeatWrapping;
    barkMap.repeat.set(1.5, 3.5);
    barkMap.colorSpace = THREE.SRGBColorSpace;
    const makeLeafMap = (quadrant) => {
      const map = loader.load('/textures/procedural_leaf_atlas.png');
      map.repeat.set(0.5, 0.5);
      map.offset.set((quadrant % 2) * 0.5, quadrant < 2 ? 0.5 : 0);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    const pineMap = loader.load('/textures/procedural_pine_atlas.png');
    pineMap.repeat.set(0.5, 0.5);
    pineMap.offset.set(0, 0.5);
    pineMap.colorSpace = THREE.SRGBColorSpace;
    // Pine Bark
    const pineBark = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      map: barkMap,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
      shadowSide: THREE.DoubleSide,
    });

    // Pine Needles (Deep evergreen)
    const pineLeaves = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: pineMap,
      alphaTest: 0.34,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: true,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    applyWindShader(pineLeaves, { strength: 0.35, speed: 1.6, minHeight: 1.2 });

    // Birch Bark (White with subtle warmth)
    const birchBark = new THREE.MeshStandardMaterial({
      color: 0xe2ded4,
      roughness: 0.7,
      metalness: 0.0,
      flatShading: true,
      shadowSide: THREE.DoubleSide,
    });

    // Birch Foliage (Bright lime & emerald)
    const birchLeaves = new THREE.MeshStandardMaterial({
      color: 0xd8efc2,
      map: makeLeafMap(1),
      alphaTest: 0.32,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: true,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    applyWindShader(birchLeaves, { strength: 0.4, speed: 1.8, minHeight: 2.0 });

    // Oak Bark (Deep textured brown)
    const oakBark = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: barkMap,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
      shadowSide: THREE.DoubleSide,
    });

    // Oak Foliage (Rich forest green)
    const oakLeaves = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: makeLeafMap(0),
      alphaTest: 0.32,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: true,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    applyWindShader(oakLeaves, { strength: 0.35, speed: 1.4, minHeight: 1.8 });

    // Willow Leaves (Yellow-green drooping)
    const willowLeaves = new THREE.MeshStandardMaterial({
      color: 0xc4d99e,
      map: makeLeafMap(2),
      alphaTest: 0.32,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: true,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });
    applyWindShader(willowLeaves, { strength: 0.5, speed: 1.5, minHeight: 1.5 });

    // Mossy Stump & Deadwood
    const deadwood = new THREE.MeshStandardMaterial({
      color: 0x544332,
      map: barkMap,
      roughness: 0.95,
      flatShading: true,
      shadowSide: THREE.DoubleSide,
    });

    return {
      pineBark,
      pineLeaves,
      birchBark,
      birchLeaves,
      oakBark,
      oakLeaves,
      willowLeaves,
      deadwood,
    };
  }

  createPrototypes() {
    return {
      pine: this.buildPineTree(),
      birch: this.buildBirchTree(),
      oak: this.buildOakTree(),
      willow: this.buildWillowTree(),
      stump: this.buildStump(),
      log: this.buildFallenLog(),
    };
  }

  createLeafCrown(material, clusters, width = 2.4, height = 2.0) {
    const cards = [];
    clusters.forEach(([x, y, z, scale = 1]) => {
      for (let side = 0; side < 4; side++) {
        const card = new THREE.PlaneGeometry(width * scale, height * scale);
        card.rotateY((side / 4) * Math.PI);
        card.rotateX((side - 1.5) * 0.08);
        card.translate(x, y, z);
        cards.push(card);
      }
    });
    const mesh = new THREE.Mesh(safeMerge(cards), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  createBranches(material, height, count, reach) {
    const branches = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.3;
      const start = new THREE.Vector3(0, height + (i % 4) * 0.48, 0);
      const length = reach * (0.72 + (i % 3) * 0.1);
      const end = new THREE.Vector3(
        Math.cos(angle) * length,
        start.y + length * (0.35 + (i % 2) * 0.12),
        Math.sin(angle) * length
      );
      const direction = end.clone().sub(start);
      const midpoint = start.clone().add(end).multiplyScalar(0.5);
      const branch = new THREE.CylinderGeometry(0.045, 0.14, direction.length(), 8);
      branch.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()));
      branch.translate(midpoint.x, midpoint.y, midpoint.z);
      branches.push(branch);
    }
    const mesh = new THREE.Mesh(safeMerge(branches), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  buildPineTree() {
    const group = new THREE.Group();

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.18, 0.42, 7.0, 12);
    trunkGeom.translate(0, 3.5, 0);
    const trunkMesh = new THREE.Mesh(trunkGeom, this.materials.pineBark);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    group.add(this.createBranches(this.materials.pineBark, 2.7, 13, 2.5));
    group.add(this.createLeafCrown(this.materials.pineLeaves, [
      [-1.7, 3.2, 0.2, 1], [1.5, 3.3, 0.5, 1], [0.2, 3.5, -1.5, 0.95],
      [-1.3, 4.2, 0.8, 0.9], [1.2, 4.4, -0.7, 0.88], [0, 4.7, 1.1, 0.85],
      [-0.9, 5.3, -0.5, 0.78], [0.9, 5.5, 0.4, 0.75], [0, 6.2, 0, 0.68],
      [-0.35, 6.8, 0.1, 0.55], [0.2, 7.25, -0.1, 0.42],
    ], 2.55, 1.65));

    return group;
  }

  buildBirchTree() {
    const group = new THREE.Group();

    // Slender curving trunk
    const trunkGeom = new THREE.CylinderGeometry(0.14, 0.3, 8.5, 14);
    trunkGeom.translate(0, 4.25, 0);
    const trunkMesh = new THREE.Mesh(trunkGeom, this.materials.birchBark);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    group.add(this.createBranches(this.materials.birchBark, 4.6, 7, 2.2));
    group.add(this.createLeafCrown(this.materials.birchLeaves, [
      [-1.2, 5.2, 0.1, 0.95], [1.0, 5.4, 0.6, 1], [0.2, 5.8, -1.0, 0.95],
      [-0.8, 6.2, 0.8, 0.9], [0.9, 6.5, 0.1, 0.88], [0, 7.0, -0.4, 0.82],
      [-0.4, 7.6, 0.25, 0.72], [0.55, 7.8, -0.15, 0.65],
    ], 2.35, 2.05));

    return group;
  }

  buildOakTree() {
    const group = new THREE.Group();

    // Broad sturdy trunk with slight taper
    const trunkGeom = new THREE.CylinderGeometry(0.34, 0.78, 5.5, 14);
    trunkGeom.translate(0, 2.75, 0);
    const trunkMesh = new THREE.Mesh(trunkGeom, this.materials.oakBark);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    group.add(this.createBranches(this.materials.oakBark, 3.4, 9, 3.2));
    group.add(this.createLeafCrown(this.materials.oakLeaves, [
      [-2.2, 4.8, 0.2, 1.05], [-1.1, 5.7, 1.3, 1.1], [0.3, 5.9, 1.8, 1.0],
      [1.8, 5.1, 0.8, 1.08], [2.1, 5.5, -0.9, 1.0], [0.7, 6.3, -1.5, 1.12],
      [-1.1, 6.4, -1.3, 1.0], [0, 7.0, 0, 1.15], [-2, 5.5, -0.8, 0.92],
    ], 2.7, 2.25));

    return group;
  }

  buildWillowTree() {
    const group = new THREE.Group();

    // Twisted trunk
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.66, 6.0, 14);
    trunkGeom.translate(0, 3.0, 0);
    const trunkMesh = new THREE.Mesh(trunkGeom, this.materials.oakBark);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    group.add(this.createBranches(this.materials.oakBark, 3.5, 10, 3.1));
    group.add(this.createLeafCrown(this.materials.willowLeaves, [
      [-2.2, 5.2, 0, 1], [-1.5, 4.1, 1.4, 1.15], [0, 5.8, 1.8, 1.1],
      [1.7, 4.4, 1, 1.15], [2.2, 5.1, -0.5, 1], [1.1, 4.0, -1.8, 1.2],
      [-0.7, 5.8, -1.8, 1.05], [-1.8, 4.2, -1, 1.15], [0, 6.5, 0, 1.1],
    ], 2.3, 3.0));

    return group;
  }

  buildStump() {
    const group = new THREE.Group();
    const stumpGeom = new THREE.CylinderGeometry(0.5, 0.7, 0.9, 8);
    stumpGeom.translate(0, 0.45, 0);
    const stumpMesh = new THREE.Mesh(stumpGeom, this.materials.deadwood);
    stumpMesh.castShadow = true;
    stumpMesh.receiveShadow = true;
    group.add(stumpMesh);
    return group;
  }

  buildFallenLog() {
    const group = new THREE.Group();
    const logGeom = new THREE.CylinderGeometry(0.3, 0.4, 4.2, 7);
    logGeom.rotateZ(Math.PI / 2);
    logGeom.translate(0, 0.35, 0);
    const logMesh = new THREE.Mesh(logGeom, this.materials.deadwood);
    logMesh.castShadow = true;
    logMesh.receiveShadow = true;
    group.add(logMesh);
    return group;
  }
}
