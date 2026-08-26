import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Creates procedural water normal/noise canvas texture for smooth liquid ripples
 */
function createWaterNormalMap(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = (x / size) * Math.PI * 4;
      const v = (y / size) * Math.PI * 4;

      // Smooth multi-frequency wave normal
      const nx = Math.sin(u * 1.5 + v * 0.8) * 0.5 + Math.cos(u * 3.0 - v * 2.0) * 0.25;
      const ny = Math.cos(u * 0.8 + v * 1.5) * 0.5 + Math.sin(u * 2.0 + v * 3.0) * 0.25;

      // Normal map encoding: RGB in [0, 255] where (128, 128, 255) is flat up
      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export class WaterSystem {
  constructor(scene) {
    this.scene = scene;
    this.normalMap = createWaterNormalMap(256);
    this.normalMap.repeat.set(16, 16);
    this.mesh = this.createWater();
    this.scene.add(this.mesh);
  }

  createWater() {
    const size = CONFIG.terrain.chunkSize * (CONFIG.terrain.renderDistance * 2 + 4);
    const geom = new THREE.PlaneGeometry(size, size, 32, 32);
    geom.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x187a8e,
      roughness: 0.12,
      metalness: 0.85,
      normalMap: this.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      transparent: true,
      opacity: 0.88,
      flatShading: false,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWaterColorShallow = { value: new THREE.Color(0x2899ad) };
      shader.uniforms.uWaterColorDeep = { value: new THREE.Color(0x0c3748) };

      shader.vertexShader = `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec2 vWaterUV;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec4 wPos = modelMatrix * vec4(transformed, 1.0);
        vWorldPos = wPos.xyz;
        vWaterUV = wPos.xz * 0.06;

        // Smooth natural wave displacement
        float w1 = sin(wPos.x * 0.18 + uTime * 1.6) * 0.12;
        float w2 = cos(wPos.z * 0.22 + uTime * 1.3) * 0.10;
        float w3 = sin((wPos.x + wPos.z) * 0.12 + uTime * 0.9) * 0.06;
        transformed.y += w1 + w2 + w3;
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        uniform vec3 uWaterColorShallow;
        uniform vec3 uWaterColorDeep;
        varying vec3 vWorldPos;
        varying vec2 vWaterUV;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>

        // Moving organic caustics and liquid color variation
        vec2 uvAnim1 = vWaterUV + vec2(uTime * 0.02, uTime * 0.015);
        vec2 uvAnim2 = vWaterUV * 1.5 - vec2(uTime * 0.015, uTime * 0.02);

        float n1 = sin(uvAnim1.x * 6.0 + sin(uvAnim1.y * 5.0)) * 0.5 + 0.5;
        float n2 = cos(uvAnim2.x * 5.0 + cos(uvAnim2.y * 6.0)) * 0.5 + 0.5;
        float caustics = (n1 * n2);

        // Water depth color gradation
        vec3 waterBase = mix(uWaterColorDeep, uWaterColorShallow, caustics * 0.35 + 0.3);
        
        // Gentle sun glint on waves
        diffuseColor.rgb = waterBase + vec3(caustics * 0.12);
        `
      );

      this.shader = shader;
    };

    const mesh = new THREE.Mesh(geom, material);
    mesh.position.y = CONFIG.terrain.waterLevel;
    mesh.receiveShadow = true;
    return mesh;
  }

  update(time, playerPos) {
    if (this.shader) {
      this.shader.uniforms.uTime.value = time;
    }

    // Scroll normal map texture for continuous flowing current
    if (this.normalMap) {
      this.normalMap.offset.x = (time * 0.025) % 1.0;
      this.normalMap.offset.y = (time * 0.02) % 1.0;
    }

    // Center water plane around player
    this.mesh.position.x = Math.floor(playerPos.x / 16) * 16;
    this.mesh.position.z = Math.floor(playerPos.z / 16) * 16;
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    if (this.normalMap) this.normalMap.dispose();
  }
}
