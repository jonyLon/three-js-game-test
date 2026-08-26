// Global Configuration and Biome Parameters

export const CONFIG = {
  // Terrain Settings
  terrain: {
    chunkSize: 72,
    chunkResolution: 32,
    renderDistance: 3,
    chunksPerFrame: 2,
    maxHeight: 34,
    scale: 0.007,
    riverDepth: 4.5,        // Depth of river valleys
    riverWidth: 18.0,       // Width of the river bed
    waterLevel: 0,
    islandScale: 420,
    seed: 1337.42,
  },

  // Player & Movement
  player: {
    height: 1.8,            // Eye height in meters
    walkSpeed: 6.0,
    runSpeed: 11.5,
    jumpForce: 8.5,
    gravity: 24.0,
    mouseSensitivity: 0.0022,
    staminaMax: 100,
    staminaDrain: 20,       // Per second while sprinting
    staminaRecover: 15,     // Per second while resting
  },

  // Vegetation Density (instances per chunk)
  vegetation: {
    grassPerChunk: 1400,
    flowersPerChunk: 0,
    treesPerChunk: 26,
    bushesPerChunk: 0,
    fernsPerChunk: 0,
    mushroomsPerChunk: 0,
    rocksPerChunk: 10,
    windStrength: 0.8,
    windSpeed: 1.2,
  },

  // Environment & Atmosphere
  environment: {
    dayDurationSeconds: 180, // 3 minutes for a full day-night cycle
    sunIntensityMax: 1.8,
    moonIntensityMax: 0.35,
    fogDensityDay: 0.012,
    fogDensityNight: 0.018,
    firefliesCount: 200,
    pollenCount: 300,
    birdsCount: 25,
    butterfliesCount: 30,
  },

  // Graphics Presets
  graphics: {
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1,
    drawDistance: 430,
  },

  // Audio Settings
  audio: {
    masterVolume: 0.7,
    ambientVolume: 0.6,
    footstepsVolume: 0.5,
    wildlifeVolume: 0.65,
  }
};
