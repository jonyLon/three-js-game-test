import { createNoise2D } from 'simplex-noise';
import { CONFIG } from '../config.js';
import * as THREE from 'three';

// Deterministic linear congruential generator for seeded noise
function createPRNG(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Create deterministic noise instances for different terrain features
const noiseElevation = createNoise2D(createPRNG(CONFIG.terrain.seed));
const noiseWarpX = createNoise2D(createPRNG(98765));
const noiseWarpZ = createNoise2D(createPRNG(54321));
const noiseRiver = createNoise2D(createPRNG(42857));
const noiseDetail = createNoise2D(createPRNG(81234));
const noiseMoisture = createNoise2D(createPRNG(19827));
const noiseIslands = createNoise2D(createPRNG(77123));
const noiseErosion = createNoise2D(createPRNG(63017));

/**
 * Fractal Brownian Motion (fBm) elevation
 */
export function fbm(x, z, octaves = 5, lacunarity = 2.0, persistence = 0.5) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noiseElevation(x * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

/**
 * Domain Warping for organic, natural geological landforms
 */
export function domainWarp(x, z, strength = 25.0) {
  const qx = noiseWarpX(x * 0.003, z * 0.003) * strength;
  const qz = noiseWarpZ(x * 0.003 + 5.2, z * 0.003 + 1.3) * strength;
  return { x: x + qx, z: z + qz };
}

/**
 * Procedural River distance and depth calculation
 * River meanders across the landscape
 */
export function getRiverFactor(x, z) {
  // Meandering river formula with noise
  const riverFrequency = 0.004;
  const meander = noiseRiver(x * riverFrequency, z * riverFrequency * 0.5) * 45;
  const riverCenterX = Math.sin(z * 0.006) * 60 + meander;
  
  const distToRiver = Math.abs(x - riverCenterX);
  const riverWidth = CONFIG.terrain.riverWidth;
  
  if (distToRiver < riverWidth) {
    // Inside river channel
    const t = distToRiver / riverWidth;
    // Smooth valley curve
    const depthFactor = 1.0 - Math.cos(t * Math.PI * 0.5);
    return {
      inRiver: true,
      depthFactor: 1.0 - depthFactor, // 1 at center, 0 at bank
      distance: distToRiver,
    };
  } else if (distToRiver < riverWidth * 2.5) {
    // River valley banks
    const t = (distToRiver - riverWidth) / (riverWidth * 1.5);
    return {
      inRiver: false,
      depthFactor: (1.0 - t) * 0.3,
      distance: distToRiver,
    };
  }

  return { inRiver: false, depthFactor: 0, distance: distToRiver };
}

/**
 * Returns exact terrain elevation at world coordinate (x, z)
 */
export function getTerrainHeight(x, z) {
  const warped = domainWarp(x, z, 28.0);
  const scale = CONFIG.terrain.scale;

  // A warped continental field creates an endless chain of islands rather
  // than one circular height-map. The threshold is the coastline.
  const continental = noiseIslands(warped.x / CONFIG.terrain.islandScale, warped.z / CONFIG.terrain.islandScale);
  const archipelago = continental * 0.72
    + noiseWarpX(warped.x * 0.004, warped.z * 0.004) * 0.2
    + noiseWarpZ(warped.x * 0.011, warped.z * 0.011) * 0.08;
  const landMask = THREE.MathUtils.smoothstep(archipelago, -0.16, 0.26);
  const ridges = 1.0 - Math.abs(fbm(warped.x * scale, warped.z * scale, 6, 2.08, 0.48));
  const hills = (fbm(warped.x * scale * 0.55, warped.z * scale * 0.55, 5, 2.0, 0.5) + 1) * 0.5;
  const drainage = Math.abs(noiseErosion(warped.x * 0.013, warped.z * 0.013));
  const erodedRidges = Math.pow(ridges, 2.7) * (0.58 + drainage * 0.42);
  const coastShelf = Math.pow(landMask, 1.65);
  let height = -8.5 + coastShelf * (7.0 + hills * 17 + erodedRidges * CONFIG.terrain.maxHeight * 0.62);

  // Fine surface roughness (micro bumps)
  const detail = noiseDetail(x * 0.045, z * 0.045) * 0.42
    + noiseDetail(x * 0.14, z * 0.14) * 0.1;
  height += detail * THREE.MathUtils.smoothstep(height, 0.8, 9.0);

  return height;
}

export function getBiome(x, z) {
  const height = getTerrainHeight(x, z);
  const moisture = getMoisture(x, z);
  const slope = getTerrainSlope(x, z);
  if (height < CONFIG.terrain.waterLevel - 1.5) return 'ocean';
  if (height < CONFIG.terrain.waterLevel + 1.6) return 'beach';
  if (slope > 0.42 || height > 25) return 'rock';
  if (moisture > 0.58) return 'forest';
  return 'meadow';
}

/**
 * Analytical normal calculation using central differences
 */
export function getTerrainNormal(x, z, epsilon = 0.5) {
  const hL = getTerrainHeight(x - epsilon, z);
  const hR = getTerrainHeight(x + epsilon, z);
  const hD = getTerrainHeight(x, z - epsilon);
  const hU = getTerrainHeight(x, z + epsilon);

  const normal = new THREE.Vector3(hL - hR, 2.0 * epsilon, hD - hU);
  return normal.normalize();
}

/**
 * Slope factor (0 for flat ground, 1 for vertical cliffs)
 */
export function getTerrainSlope(x, z) {
  const normal = getTerrainNormal(x, z);
  return 1.0 - Math.max(0, normal.y);
}

/**
 * Moisture map for flora distribution
 */
export function getMoisture(x, z) {
  const base = (noiseMoisture(x * 0.005, z * 0.005) + 1.0) * 0.5;
  const river = getRiverFactor(x, z);
  const riverMoisture = Math.max(0, 1.0 - river.distance / 40.0);
  return Math.min(1.0, base * 0.6 + riverMoisture * 0.6);
}
