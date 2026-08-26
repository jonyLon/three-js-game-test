import * as THREE from 'three';

/**
 * Applies a dynamic GPU wind sway vertex shader to a Three.js material using onBeforeCompile.
 * Works seamlessly with both single Mesh and InstancedMesh geometries without CPU overhead.
 * 
 * @param {THREE.Material} material - The material to modify (MeshStandardMaterial, MeshPhysicalMaterial, etc.)
 * @param {Object} options - Wind customization options
 * @param {number} options.strength - Wind strength multiplier (default: 0.35)
 * @param {number} options.speed - Wind animation frequency (default: 1.5)
 * @param {number} options.minHeight - Y height threshold below which sway is 0 (default: 0.8)
 */
export function applyWindShader(material, options = {}) {
  const defaultStrength = options.strength !== undefined ? options.strength : 0.35;
  const defaultSpeed = options.speed !== undefined ? options.speed : 1.5;
  const minHeight = options.minHeight !== undefined ? options.minHeight : 0.8;

  // Initialize shader userData storage if not present
  if (!material.userData) {
    material.userData = {};
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWindStrength = { value: defaultStrength };
    shader.uniforms.uWindSpeed = { value: defaultSpeed };

    // Store reference to shader uniforms for requestAnimationFrame updates
    material.userData.shader = shader;

    // 1. Inject uniforms
    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uWindSpeed;
    ` + shader.vertexShader;

    // 2. Inject vertex displacement logic into <begin_vertex>
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // Calculate wind influence based on vertex height (Y position relative to trunk base)
      float heightFactor = max(0.0, transformed.y - ${minHeight.toFixed(2)});
      
      #ifdef USE_INSTANCING
        // Get instance world position for spatial wave phase offset
        vec4 instanceWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float wave = sin(uTime * uWindSpeed * 1.8 + instanceWorldPos.x * 0.15 + instanceWorldPos.z * 0.15);
        float waveSecondary = cos(uTime * uWindSpeed * 1.2 + instanceWorldPos.z * 0.1);
      #else
        // Fallback for non-instanced meshes
        vec4 meshWorldPos = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float wave = sin(uTime * uWindSpeed * 1.8 + meshWorldPos.x * 0.15 + meshWorldPos.z * 0.15);
        float waveSecondary = cos(uTime * uWindSpeed * 1.2 + meshWorldPos.z * 0.1);
      #endif
      
      // Apply primary and cross-wind sway
      transformed.x += wave * heightFactor * uWindStrength * 0.12;
      transformed.z += waveSecondary * heightFactor * uWindStrength * 0.08;
      
      // Slight downward compression during heavy gusts
      transformed.y -= abs(wave) * heightFactor * uWindStrength * 0.02;
      `
    );
  };

  // Ensure material gets recompiled if needed
  material.needsUpdate = true;
}

/**
 * Updates time uniform across an array or group of materials/instanced meshes.
 * 
 * @param {Array<THREE.Material|THREE.InstancedMesh|THREE.Mesh>|THREE.Group} targets
 * @param {number} time - Elapsed time in seconds
 */
export function updateWindTime(targets, time) {
  if (!targets) return;

  if (targets.isGroup || targets.isObject3D) {
    targets.traverse((child) => {
      if (child.isMesh && child.material) {
        updateSingleMaterialWind(child.material, time);
      }
    });
    return;
  }

  if (Array.isArray(targets)) {
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      if (item.material) {
        updateSingleMaterialWind(item.material, time);
      } else if (item.userData && item.userData.shader) {
        item.userData.shader.uniforms.uTime.value = time;
      }
    }
  }
}

function updateSingleMaterialWind(material, time) {
  if (Array.isArray(material)) {
    for (let m of material) {
      if (m.userData && m.userData.shader && m.userData.shader.uniforms.uTime) {
        m.userData.shader.uniforms.uTime.value = time;
      }
    }
  } else if (material.userData && material.userData.shader && material.userData.shader.uniforms.uTime) {
    material.userData.shader.uniforms.uTime.value = time;
  }
}
