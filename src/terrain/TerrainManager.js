import * as THREE from 'three';
import { TerrainChunk } from './TerrainChunk.js';
import { createTerrainMaterial } from './TerrainMaterial.js';
import { CONFIG } from '../config.js';

export class TerrainManager {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map(); // key: `${cx},${cz}` -> { chunk, floraGroup }
    this.material = createTerrainMaterial();
    this.currentChunkCoord = { x: null, z: null };
    this.onChunkCreated = null; // Callback for flora generation
    this.onChunkRemoved = null; // Callback for flora cleanup
    this.pending = [];
    this.neededKeys = new Set();
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  update(playerPos) {
    const chunkSize = CONFIG.terrain.chunkSize;
    const playerChunkX = Math.floor((playerPos.x + chunkSize / 2) / chunkSize);
    const playerChunkZ = Math.floor((playerPos.z + chunkSize / 2) / chunkSize);

    const changed = !(
      this.currentChunkCoord.x === playerChunkX &&
      this.currentChunkCoord.z === playerChunkZ
    );

    if (changed) {
      this.currentChunkCoord.x = playerChunkX;
      this.currentChunkCoord.z = playerChunkZ;
      const renderDist = CONFIG.terrain.renderDistance;
      this.neededKeys = new Set();
      this.pending = [];

      for (let dx = -renderDist; dx <= renderDist; dx++) {
        for (let dz = -renderDist; dz <= renderDist; dz++) {
        // Circular render distance check for smoother radius
        if (dx * dx + dz * dz <= renderDist * renderDist + 1) {
          const cx = playerChunkX + dx;
          const cz = playerChunkZ + dz;
          const key = this.getChunkKey(cx, cz);
          this.neededKeys.add(key);

          if (!this.chunks.has(key)) {
            this.pending.push({ cx, cz, key, distance: dx * dx + dz * dz });
          }
        }
      }
      }
      this.pending.sort((a, b) => a.distance - b.distance);

      for (const [key, chunkData] of this.chunks.entries()) {
        if (!this.neededKeys.has(key)) {
        if (this.onChunkRemoved) {
          this.onChunkRemoved(chunkData.cx, chunkData.cz);
        }
        this.scene.remove(chunkData.chunk.mesh);
        chunkData.chunk.dispose();
        this.chunks.delete(key);
        }
      }
    }

    let budget = CONFIG.terrain.chunksPerFrame;
    while (budget-- > 0 && this.pending.length) {
      const { cx, cz, key } = this.pending.shift();
      if (!this.neededKeys.has(key) || this.chunks.has(key)) continue;
      const chunk = new TerrainChunk(cx, cz, this.material);
      this.scene.add(chunk.mesh);
      this.chunks.set(key, { chunk, cx, cz });
      if (this.onChunkCreated) this.onChunkCreated(cx, cz);
    }
  }

  dispose() {
    for (const [, chunkData] of this.chunks.entries()) {
      this.scene.remove(chunkData.chunk.mesh);
      chunkData.chunk.dispose();
    }
    this.chunks.clear();
    if (this.material) this.material.dispose();
  }
}
