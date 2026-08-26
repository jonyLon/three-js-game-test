import * as THREE from 'three';
import { TreeGenerator } from './TreeGenerator.js';
import { PlantGenerator } from './PlantGenerator.js';
import { createRealisticForest } from './RealisticForest.js';
import { updateWindTime } from './WindShader.js';
import { CONFIG } from '../config.js';
import { getTerrainHeight, getTerrainSlope, getMoisture, getBiome } from '../terrain/Noise.js';

export class FloraManager {
  constructor(scene) {
    this.scene = scene;
    this.treeGen = new TreeGenerator();
    this.plantGen = new PlantGenerator();
    this.floraChunks = new Map(); // key -> THREE.Group
    this.scannedForests = []; // loaded realistic scanned forests

    // Collect materials with wind shaders
    this.animatedMaterials = [
      ...Object.values(this.treeGen.materials),
      ...Object.values(this.plantGen.materials),
    ];
  }

  generateChunkFlora(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.floraChunks.has(key)) return;

    const group = new THREE.Group();
    const chunkSize = CONFIG.terrain.chunkSize;
    const worldCenterX = cx * chunkSize;
    const worldCenterZ = cz * chunkSize;

    let seed = Math.abs(cx * 49297 ^ cz * 9301);
    const rand = () => {
      seed = (seed * 16807 + 1013904223) % 2147483647;
      return (seed & 0x7fffffff) / 2147483647;
    };

    const transforms = new Map();
    const queueInstance = (name, proto, x, y, z, rotation, scale) => {
      if (!transforms.has(name)) transforms.set(name, { proto, matrices: [] });
      const dummy = new THREE.Object3D();
      dummy.position.set(x, y, z);
      dummy.rotation.y = rotation;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      transforms.get(name).matrices.push(dummy.matrix.clone());
    };

    // Trees are selected by biome and later batched into InstancedMesh objects.
    const treeCount = CONFIG.vegetation.treesPerChunk;
    for (let i = 0; i < treeCount; i++) {
      const rx = (rand() - 0.5) * chunkSize + worldCenterX;
      const rz = (rand() - 0.5) * chunkSize + worldCenterZ;
      const height = getTerrainHeight(rx, rz);
      const slope = getTerrainSlope(rx, rz);
      const biome = getBiome(rx, rz);

      // Trees need ground above water and not too steep cliffs
      if ((biome === 'forest' || biome === 'meadow') && slope < 0.36) {
        let treeType = 'pine';
        const moisture = getMoisture(rx, rz);
        if (height > 19.0) {
          treeType = 'pine';
        } else if (moisture > 0.72) {
          treeType = rand() > 0.35 ? 'willow' : 'birch';
        } else {
          const roll = rand();
          if (roll < 0.45) treeType = 'oak';
          else if (roll < 0.7) treeType = 'birch';
          else if (roll < 0.9) treeType = 'pine';
          else if (roll < 0.95) treeType = 'stump';
          else treeType = 'log';
        }

        const proto = this.treeGen.prototypes[treeType];
        if (proto) {
          const scale = 0.8 + rand() * 0.45;
          queueInstance(treeType, proto, rx, height, rz, rand() * Math.PI * 2, scale);
        }
      }
    }

    // 2. Spawn Undergrowth Plants (Ferns, Flowers, Mushrooms, Bushes, Rocks)
    const plantCount = CONFIG.vegetation.fernsPerChunk + 
                       CONFIG.vegetation.flowersPerChunk + 
                       CONFIG.vegetation.mushroomsPerChunk + 
                       CONFIG.vegetation.bushesPerChunk + 
                       CONFIG.vegetation.rocksPerChunk;

    for (let i = 0; i < plantCount; i++) {
      const rx = (rand() - 0.5) * chunkSize + worldCenterX;
      const rz = (rand() - 0.5) * chunkSize + worldCenterZ;
      const height = getTerrainHeight(rx, rz);
      const slope = getTerrainSlope(rx, rz);

      const biome = getBiome(rx, rz);
      if ((biome === 'forest' || biome === 'meadow' || biome === 'rock') && slope < 0.55) {
        const roll = rand();
        let proto = null;
        let scale = 1.0;

        if (roll < 0.35) {
          // Ferns
          proto = this.plantGen.prototypes.fern;
          scale = 0.7 + rand() * 0.6;
        } else if (roll < 0.6) {
          // Wildflowers (Red, Blue, Yellow)
          const fRoll = rand();
          if (fRoll < 0.35) proto = this.plantGen.prototypes.flowerRed;
          else if (fRoll < 0.7) proto = this.plantGen.prototypes.flowerBlue;
          else proto = this.plantGen.prototypes.flowerYellow;
          scale = 0.8 + rand() * 0.5;
        } else if (roll < 0.75) {
          // Mushrooms
          proto = rand() > 0.5 ? this.plantGen.prototypes.mushroom : this.plantGen.prototypes.chanterelle;
          scale = 0.7 + rand() * 0.6;
        } else if (roll < 0.88) {
          // Bushes
          proto = this.plantGen.prototypes.bush;
          scale = 0.8 + rand() * 0.5;
        } else {
          // Rocks & Boulders
          proto = rand() > 0.4 ? this.plantGen.prototypes.mossyRock : this.plantGen.prototypes.rock;
          scale = 0.6 + rand() * 0.9;
        }

        if (proto) {
          const protoName = Object.keys(this.plantGen.prototypes).find((name) => this.plantGen.prototypes[name] === proto) || 'plant';
          queueInstance(`plant-${protoName}`, proto, rx, height, rz, rand() * Math.PI * 2, scale);
        }
      }
    }

    for (const { proto, matrices } of transforms.values()) {
      proto.children.forEach((source) => {
        if (!source.isMesh || matrices.length === 0) return;
        const mesh = new THREE.InstancedMesh(source.geometry, source.material, matrices.length);
        matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = source.castShadow;
        mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        group.add(mesh);
      });
    }

    this.scene.add(group);
    this.floraChunks.set(key, group);
  }

  removeChunkFlora(cx, cz) {
    const key = `${cx},${cz}`;
    const group = this.floraChunks.get(key);
    if (group) {
      this.scene.remove(group);
      this.floraChunks.delete(key);
    }
  }

  /**
   * Load scanned GLTF/GLB tree model (Poly Haven, Megascans, etc.) into the environment
   * with InstancedMesh and wind shaders.
   */
  async loadScannedModelForest(modelUrl, count = 1000, areaSize = 300) {
    const forest = await createRealisticForest({
      scene: this.scene,
      model: modelUrl,
      count,
      areaSize,
      minDist: 6.0,
      getHeight: (x, z) => getTerrainHeight(x, z),
      isValidPosition: (x, z, y) => {
        const slope = getTerrainSlope(x, z);
        return y > CONFIG.terrain.waterLevel + 0.8 && slope < 0.4;
      }
    });

    this.scannedForests.push(forest);
    return forest;
  }

  /**
   * Updates wind animation across all tree, plant, and scanned model materials
   */
  update(elapsedTime) {
    // 1. Update procedural trees and plant materials
    for (let i = 0; i < this.animatedMaterials.length; i++) {
      const mat = this.animatedMaterials[i];
      if (mat.userData && mat.userData.shader && mat.userData.shader.uniforms.uTime) {
        mat.userData.shader.uniforms.uTime.value = elapsedTime;
      }
    }

    // 2. Update scanned model forest instances
    for (let i = 0; i < this.scannedForests.length; i++) {
      this.scannedForests[i].update(elapsedTime);
    }
  }

  dispose() {
    for (const [, group] of this.floraChunks.entries()) {
      this.scene.remove(group);
    }
    this.floraChunks.clear();

    for (const forest of this.scannedForests) {
      if (forest.group) this.scene.remove(forest.group);
    }
    this.scannedForests = [];
  }
}
