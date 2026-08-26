import * as THREE from 'three';
import { getTerrainHeight } from './Noise.js';
import { CONFIG } from '../config.js';

export class TerrainChunk {
  constructor(chunkX, chunkZ, material) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.material = material;
    this.mesh = null;
    this.size = CONFIG.terrain.chunkSize;
    this.resolution = CONFIG.terrain.chunkResolution;
    
    // World coordinates of chunk center
    this.worldX = chunkX * this.size;
    this.worldZ = chunkZ * this.size;

    this.init();
  }

  init() {
    const geom = new THREE.PlaneGeometry(
      this.size,
      this.size,
      this.resolution,
      this.resolution
    );

    // Rotate plane to lie flat on XZ plane
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      vertex.fromBufferAttribute(pos, i);
      
      // Calculate global world space position
      const worldVertexX = vertex.x + this.worldX;
      const worldVertexZ = vertex.z + this.worldZ;

      // Sample analytical terrain height
      const height = getTerrainHeight(worldVertexX, worldVertexZ);
      pos.setY(i, height);
    }

    geom.computeVertexNormals();

    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.position.set(this.worldX, 0, this.worldZ);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false; // Terrain doesn't need to self-cast heavy shadows
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();
  }

  dispose() {
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      this.mesh = null;
    }
  }
}
