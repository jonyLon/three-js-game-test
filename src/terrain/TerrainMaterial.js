import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Generates procedural seamless noise textures on HTML5 Canvas
 */
function createProceduralTexture(type, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Simple seeded pseudo-noise helper
  const rand = (x, y) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return n - Math.floor(n);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      // Multi-scale noise
      const n1 = rand(x * 0.05, y * 0.05);
      const n2 = rand(x * 0.2, y * 0.2);
      const n3 = rand(x * 0.8, y * 0.8);
      const noiseVal = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;

      if (type === 'grass') {
        // Lush forest moss & grass
        const r = Math.floor(38 + noiseVal * 20);
        const g = Math.floor(72 + noiseVal * 38);
        const b = Math.floor(30 + noiseVal * 18);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      } else if (type === 'soil') {
        // Forest mulch, earth, fallen pine needles
        const r = Math.floor(66 + noiseVal * 28);
        const g = Math.floor(48 + noiseVal * 22);
        const b = Math.floor(32 + noiseVal * 14);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      } else if (type === 'rock') {
        // Rocky slate cliff
        const val = Math.floor(68 + noiseVal * 58);
        data[idx] = val;
        data[idx + 1] = val - 4;
        data[idx + 2] = val - 2;
        data[idx + 3] = 255;
      } else if (type === 'sand') {
        // Riverbed pebble & sand
        const r = Math.floor(150 + noiseVal * 34);
        const g = Math.floor(137 + noiseVal * 30);
        const b = Math.floor(105 + noiseVal * 24);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates the multi-splatting custom terrain material
 */
export function createTerrainMaterial() {
  const grassTex = createProceduralTexture('grass', 512);
  const soilTex = new THREE.TextureLoader().load('/textures/forest_ground_v2.png');
  soilTex.colorSpace = THREE.SRGBColorSpace;
  const rockTex = createProceduralTexture('rock', 512);
  const sandTex = createProceduralTexture('sand', 512);

  grassTex.repeat.set(12, 12);
  soilTex.repeat.set(12, 12);
  rockTex.repeat.set(12, 12);
  sandTex.repeat.set(12, 12);

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    metalness: 0.1,
    flatShading: false,
  });

  // Inject custom splatting shader code into MeshStandardMaterial
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassTex = { value: grassTex };
    shader.uniforms.uSoilTex = { value: soilTex };
    shader.uniforms.uRockTex = { value: rockTex };
    shader.uniforms.uSandTex = { value: sandTex };
    shader.uniforms.uWaterLevel = { value: CONFIG.terrain.waterLevel };

    shader.vertexShader = `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec2 vTerrainUV;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vTerrainUV = vWorldPosition.xz * 0.08;
      `
    );

    shader.fragmentShader = `
      uniform sampler2D uGrassTex;
      uniform sampler2D uSoilTex;
      uniform sampler2D uRockTex;
      uniform sampler2D uSandTex;
      uniform float uWaterLevel;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec2 vTerrainUV;

      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      // Sample procedural terrain textures
      vec3 grassCol = texture2D(uGrassTex, vTerrainUV * 1.5).rgb;
      vec3 soilCol = texture2D(uSoilTex, vTerrainUV * 1.8).rgb;
      vec3 rockCol = texture2D(uRockTex, vTerrainUV * 2.2).rgb;
      vec3 sandCol = texture2D(uSandTex, vTerrainUV * 2.0).rgb;

      // Slope factor: 1.0 for vertical cliff, 0.0 for flat plateau
      float slope = 1.0 - max(0.0, vWorldNormal.y);
      float cliffWeight = smoothstep(0.35, 0.65, slope);

      // Height factors
      float height = vWorldPosition.y;
      float waterDist = height - uWaterLevel;

      // Sand near river banks / underwater
      float sandWeight = 1.0 - smoothstep(-2.0, 1.2, waterDist);

      // Forest floor remains dominant; grass tint breaks up large exposed areas.
      float soilWeight = 0.84 + (1.0 - smoothstep(3.0, 16.0, height)) * 0.12;

      // Blend layers
      vec3 groundColor = mix(grassCol, soilCol, soilWeight);
      groundColor = mix(groundColor, sandCol, sandWeight);
      // Large scale modulation removes the synthetic uniformly-colored look.
      float macro = sin(vWorldPosition.x * 0.021) * cos(vWorldPosition.z * 0.018) * 0.5 + 0.5;
      vec3 finalDiffuse = mix(groundColor, rockCol, cliffWeight);
      finalDiffuse *= mix(0.82, 1.08, macro);

      // Wetness darkening near water
      if (waterDist < 0.8) {
        finalDiffuse *= 0.75 + max(0.0, waterDist) * 0.25;
      }

      diffuseColor = vec4(finalDiffuse, 1.0);
      `
    );
  };

  return material;
}
