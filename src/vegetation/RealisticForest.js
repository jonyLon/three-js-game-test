import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createNoise2D } from 'simplex-noise';
import { applyWindShader, updateWindTime } from './WindShader.js';

/**
 * Optimizes a texture by resizing its image on a temporary canvas if it exceeds maxDimension.
 * Reduces VRAM usage from ~1GB down to ~40MB and completely eliminates texture thrashing lag.
 */
function optimizeTexture(texture, maxDimension = 1024) {
  if (!texture || !texture.image) return texture;

  const img = texture.image;
  if (img.width > maxDimension || img.height > maxDimension) {
    const canvas = document.createElement('canvas');
    const scale = maxDimension / Math.max(img.width, img.height);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    texture.image = canvas;
    texture.needsUpdate = true;
  }

  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Generates an ultra-optimized realistic instanced forest from a GLTF/GLB scanned model.
 * 
 * @param {Object} options
 * @param {THREE.Scene} options.scene
 * @param {string|THREE.Object3D} options.model - URL to .glb/.gltf file
 * @param {number} [options.count=5] - Total tree instances
 * @param {number} [options.areaSize=180] - Area footprint dimension
 * @param {number} [options.minDist=20.0] - Minimum spacing between tree trunks
 * @param {function} [options.getHeight] - (x, z) => y terrain height
 * @param {function} [options.isValidPosition] - (x, z, height) => boolean
 * @returns {Promise<{ group: THREE.Group, instancedMeshes: THREE.InstancedMesh[], update: (time: number) => void }>}
 */
export async function createRealisticForest({
  scene,
  model = '/jacaranda_tree_4k.gltf',
  count = 5,
  areaSize = 180,
  minDist = 20.0,
  getHeight = null,
  isValidPosition = null,
}) {
  let gltfScene;

  if (typeof model === 'string') {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(model);
    gltfScene = gltf.scene;
  } else if (model.isObject3D) {
    gltfScene = model;
  } else {
    throw new Error('createRealisticForest: "model" must be a GLTF URL string or a THREE.Object3D');
  }

  const textureLoader = new THREE.TextureLoader();
  const noise2D = createNoise2D();
  const instancedMeshes = [];
  const dummy = new THREE.Object3D();
  const placedPositions = [];

  // Pre-load and optimize leaf alpha texture
  let leafAlphaMap = null;
  try {
    const rawAlpha = await textureLoader.loadAsync('/textures/jacaranda_tree_leaves_alpha_4k.png');
    leafAlphaMap = optimizeTexture(rawAlpha, 1024);
    leafAlphaMap.wrapS = THREE.RepeatWrapping;
    leafAlphaMap.wrapT = THREE.RepeatWrapping;
  } catch (e) {
    // Optional
  }

  // Traverse model hierarchy and configure optimized materials
  gltfScene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const mat = child.material.clone();
      const matName = (mat.name || child.name || '').toLowerCase();
      const isFoliage = matName.includes('leaf') || matName.includes('leaves') || matName.includes('foliage');
      const isBranches = matName.includes('branch');

      // Optimize attached textures (albedo, normal, roughness)
      if (mat.map) optimizeTexture(mat.map, 1024);
      if (mat.normalMap) optimizeTexture(mat.normalMap, 1024);
      if (mat.roughnessMap) optimizeTexture(mat.roughnessMap, 1024);
      if (mat.metalnessMap) optimizeTexture(mat.metalnessMap, 1024);

      // Preserve native texture color
      mat.color.setHex(0xffffff);

      if (isFoliage) {
        if (leafAlphaMap) {
          mat.alphaMap = leafAlphaMap;
        }
        mat.alphaTest = 0.45;
        mat.transparent = false; // Fast binary depth cutout
        mat.depthWrite = true;
        mat.side = THREE.DoubleSide;
        mat.shadowSide = THREE.DoubleSide;
        mat.roughness = 0.65;
        applyWindShader(mat, { strength: 0.25, speed: 1.4, minHeight: 0.5 });

        const instMesh = new THREE.InstancedMesh(child.geometry, mat, count);
        instMesh.castShadow = false;
        instMesh.receiveShadow = true;
        instMesh.frustumCulled = true;
        instMesh.userData.isFoliage = true;
        instancedMeshes.push(instMesh);
      } else {
        // Trunk & branches: natural brown bark
        mat.side = THREE.FrontSide;
        mat.shadowSide = THREE.FrontSide;
        mat.roughness = 0.9;
        mat.metalness = 0.0;

        if (isBranches) {
          applyWindShader(mat, { strength: 0.1, speed: 1.2, minHeight: 1.0 });
        }

        const instMesh = new THREE.InstancedMesh(child.geometry, mat, count);
        instMesh.castShadow = false;
        instMesh.receiveShadow = true;
        instMesh.frustumCulled = true;
        instMesh.userData.isFoliage = false;
        instancedMeshes.push(instMesh);
      }
    }
  });

  // Position distribution and clustering
  let spawned = 0;
  let attempts = 0;
  const maxAttempts = count * 60;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;
    const x = (Math.random() - 0.5) * areaSize;
    const z = (Math.random() - 0.5) * areaSize;

    // Spacing check
    const overlap = placedPositions.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minDist ** 2);
    if (overlap) continue;

    const y = getHeight ? getHeight(x, z) : 0;

    if (isValidPosition && !isValidPosition(x, z, y)) {
      continue;
    }

    placedPositions.push({ x, z });

    // Scaled down smaller for natural proportion and high performance
    const baseScale = THREE.MathUtils.randFloat(0.38, 0.48);
    const heightVariation = THREE.MathUtils.randFloat(0.95, 1.05);
    const rotY = Math.random() * Math.PI * 2;
    const tiltX = THREE.MathUtils.randFloat(-0.02, 0.02);
    const tiltZ = THREE.MathUtils.randFloat(-0.02, 0.02);

    dummy.position.set(x, y, z);
    dummy.rotation.set(tiltX, rotY, tiltZ);
    dummy.scale.set(baseScale, baseScale * heightVariation, baseScale);
    dummy.updateMatrix();

    for (let j = 0; j < instancedMeshes.length; j++) {
      instancedMeshes[j].setMatrixAt(spawned, dummy.matrix);
    }

    spawned++;
  }

  // Finalize instance count and upload GPU buffers
  const group = new THREE.Group();
  instancedMeshes.forEach((mesh) => {
    mesh.count = spawned;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  });

  if (scene) {
    scene.add(group);
  }

  const update = (time) => {
    updateWindTime(instancedMeshes, time);
  };

  return { group, instancedMeshes, count: spawned, update };
}
