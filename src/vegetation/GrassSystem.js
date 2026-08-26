import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../config.js';
import { getTerrainHeight, getTerrainSlope } from '../terrain/Noise.js';

export class GrassSystem {
  constructor(scene) {
    this.scene = scene;
    this.grassChunks = new Map(); // key -> InstancedMesh
    this.bladeGeometry = this.createBladeGeometry();
    this.material = this.createGrassMaterial();
  }

  createBladeGeometry() {
    // Two alpha-tested cards form a dense clump with volume from every angle.
    const front = new THREE.PlaneGeometry(0.62, 0.78, 1, 3);
    front.translate(0, 0.39, 0);
    const side = front.clone();
    side.rotateY(Math.PI / 2);
    const geom = BufferGeometryUtils.mergeGeometries([
      front.toNonIndexed(), side.toNonIndexed()
    ], false);
    geom.computeVertexNormals();
    return geom;
  }

  createGrassMaterial() {
    const map = new THREE.TextureLoader().load('/textures/grass_clump_atlas.png');
    map.colorSpace = THREE.SRGBColorSpace;
    map.repeat.set(0.5, 0.5);
    map.offset.set(0, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      alphaTest: 0.38,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWindStrength = { value: CONFIG.vegetation.windStrength };
      shader.uniforms.uWindSpeed = { value: CONFIG.vegetation.windSpeed };
      shader.uniforms.uPlayerPos = { value: new THREE.Vector3() };

      shader.vertexShader = `
        uniform float uTime;
        uniform float uWindStrength;
        uniform float uWindSpeed;
        uniform vec3 uPlayerPos;

        varying float vBladeHeight;
        varying vec3 vWorldPos;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        
        // Height factor: 0 at base, 1 at tip
        float hFactor = max(0.0, position.y / 0.78);
        vBladeHeight = hFactor;

        // Instance world position
        vec4 worldInstancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vWorldPos = (modelMatrix * (instanceMatrix * vec4(transformed, 1.0))).xyz;

        // Wind wave formula
        float windWave1 = sin(uTime * uWindSpeed * 2.0 + worldInstancePos.x * 0.35 + worldInstancePos.z * 0.25);
        float windWave2 = cos(uTime * uWindSpeed * 1.3 + worldInstancePos.x * 0.2 - worldInstancePos.z * 0.3);
        float wind = (windWave1 + windWave2 * 0.5) * uWindStrength * 0.35;

        // Push grass away from player when stepping nearby
        vec3 toPlayer = vWorldPos - uPlayerPos;
        float distToPlayer = length(toPlayer.xz);
        float playerPush = smoothstep(1.5, 0.0, distToPlayer) * 0.6;
        vec2 pushDir = normalize(toPlayer.xz + vec2(0.001));

        // Apply wind and displacement to upper parts of blade
        transformed.x += (wind + pushDir.x * playerPush) * hFactor;
        transformed.z += (wind * 0.7 + pushDir.y * playerPush) * hFactor;
        transformed.y -= (abs(wind) * 0.15 + playerPush * 0.2) * hFactor;
        `
      );

      shader.fragmentShader = `
        varying float vBladeHeight;
        varying vec3 vWorldPos;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        // Color gradient from deep forest root to bright sunlit tip
        vec3 rootTint = vec3(0.62, 0.66, 0.55);
        vec3 tipTint = vec3(1.03, 1.02, 0.94);
        diffuseColor.rgb *= mix(rootTint, tipTint, vBladeHeight);
        `
      );

      this.materialShader = shader;
    };

    return material;
  }

  generateChunkGrass(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.grassChunks.has(key)) return;

    const chunkSize = CONFIG.terrain.chunkSize;
    const worldCenterX = cx * chunkSize;
    const worldCenterZ = cz * chunkSize;
    const grassCount = CONFIG.vegetation.grassPerChunk;

    const instancedMesh = new THREE.InstancedMesh(
      this.bladeGeometry,
      this.material,
      grassCount
    );
    instancedMesh.receiveShadow = true;
    instancedMesh.castShadow = false;

    const dummy = new THREE.Object3D();
    const halfSize = chunkSize / 2;
    let validCount = 0;

    // Seeded random helper per chunk
    let seed = Math.abs(cx * 73856093 ^ cz * 19349663);
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < grassCount; i++) {
      const rx = (rand() - 0.5) * chunkSize + worldCenterX;
      const rz = (rand() - 0.5) * chunkSize + worldCenterZ;
      const height = getTerrainHeight(rx, rz);
      const slope = getTerrainSlope(rx, rz);

      // Don't spawn grass underwater or on steep cliff rocks
      if (height > CONFIG.terrain.waterLevel + 0.15 && slope < 0.45) {
        dummy.position.set(rx, height, rz);
        dummy.rotation.y = rand() * Math.PI * 2;
        dummy.rotation.x = (rand() - 0.5) * 0.2;
        dummy.rotation.z = (rand() - 0.5) * 0.2;

        const scaleY = 0.7 + rand() * 0.7;
        const scaleXZ = 0.8 + rand() * 0.5;
        dummy.scale.set(scaleXZ, scaleY, scaleXZ);

        dummy.updateMatrix();
        instancedMesh.setMatrixAt(validCount, dummy.matrix);
        validCount++;
      }
    }

    instancedMesh.count = validCount;
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(instancedMesh);
    this.grassChunks.set(key, instancedMesh);
  }

  removeChunkGrass(cx, cz) {
    const key = `${cx},${cz}`;
    const mesh = this.grassChunks.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      this.grassChunks.delete(key);
    }
  }

  update(time, playerPos) {
    if (this.materialShader) {
      this.materialShader.uniforms.uTime.value = time;
      this.materialShader.uniforms.uPlayerPos.value.copy(playerPos);
    }
  }

  dispose() {
    for (const [, mesh] of this.grassChunks.entries()) {
      this.scene.remove(mesh);
    }
    this.grassChunks.clear();
    if (this.material) this.material.dispose();
    if (this.bladeGeometry) this.bladeGeometry.dispose();
  }
}
