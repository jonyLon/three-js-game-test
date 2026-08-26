import * as THREE from 'three';
import { CONFIG } from './config.js';
import { TerrainManager } from './terrain/TerrainManager.js';
import { GrassSystem } from './vegetation/GrassSystem.js';
import { FloraManager } from './vegetation/FloraManager.js';
import { SkyAtmosphere } from './environment/SkyAtmosphere.js';
import { WaterSystem } from './environment/Water.js';
import { ParticleSystem } from './environment/Particles.js';
import { WildlifeSystem } from './wildlife/BirdsAndButterflies.js';
import { ProceduralAudio } from './audio/ProceduralAudio.js';
import { FirstPersonControls } from './player/FirstPersonControls.js';
import { UIOverlay } from './ui/UIOverlay.js';

class ForestApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    this.initRenderer();
    this.initScene();
    this.initSystems();
    this.initEvents();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(CONFIG.graphics.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = CONFIG.graphics.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      CONFIG.graphics.drawDistance
    );
  }

  initSystems() {
    // 1. Audio Engine
    this.audio = new ProceduralAudio();

    // 2. Sky & Atmosphere
    this.sky = new SkyAtmosphere(this.scene, this.renderer);

    // 3. Water Plane
    this.water = new WaterSystem(this.scene);

    // 4. Terrain & Chunks
    this.terrain = new TerrainManager(this.scene);

    // 5. Flora Manager for Scanned Trees
    this.flora = new FloraManager(this.scene);
    this.grass = new GrassSystem(this.scene);
    this.terrain.onChunkCreated = (cx, cz) => {
      this.flora.generateChunkFlora(cx, cz);
      this.grass.generateChunkGrass(cx, cz);
    };
    this.terrain.onChunkRemoved = (cx, cz) => {
      this.flora.removeChunkFlora(cx, cz);
      this.grass.removeChunkGrass(cx, cz);
    };

    // 6. Player Controls
    this.controls = new FirstPersonControls(this.camera, this.renderer.domElement, this.scene);

    // Hook footstep audio to head bob step event
    this.controls.headBob.onFootstep = () => {
      const isInWater = this.controls.position.y <= CONFIG.terrain.waterLevel + 0.3;
      this.audio.playFootstep(isInWater);
    };

    // 7. Initial Terrain Population
    this.terrain.update(this.controls.position);

    this.particles = new ParticleSystem(this.scene);
    this.wildlife = new WildlifeSystem(this.scene);

    // 9. UI HUD
    this.ui = new UIOverlay(this);
  }

  initEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Keyboard Shortcuts (M: Mute, F: Flashlight, C: Camera drone)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        const btnAudio = document.getElementById('btn-audio');
        if (btnAudio) btnAudio.click();
      } else if (e.code === 'KeyP') {
        this.ui.takeScreenshot();
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update Player Controls
    this.controls.update(delta);
    const playerPos = this.controls.position;

    // 2. Update Terrain Chunks
    this.terrain.update(playerPos);

    // 3. Update Sky (Daylight)
    this.sky.update(delta, playerPos);

    // 4. Update Water
    this.water.update(elapsedTime, playerPos);

    // 5. Update Flora Wind
    this.flora.update(elapsedTime);
    this.grass.update(elapsedTime, playerPos);
    this.particles.update(elapsedTime, delta, playerPos, this.sky.timeOfDay);
    this.wildlife.update(elapsedTime, delta, playerPos, this.sky.timeOfDay);

    // 6. Update Audio
    this.audio.update(playerPos, this.sky.timeOfDay);

    // 9. Update UI HUD
    const speed = this.controls.velocity.length();
    this.ui.update(
      playerPos,
      this.controls.yaw,
      this.controls.stamina,
      speed,
      this.sky.getTimeFormatted()
    );

    // 10. Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Start Application when DOM is ready or immediately
function bootstrap() {
  if (!window.app) {
    window.app = new ForestApp();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
