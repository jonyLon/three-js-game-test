import { CONFIG } from '../config.js';

export class UIOverlay {
  constructor(app) {
    this.app = app;
    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    const container = document.createElement('div');
    container.id = 'ui-root';
    container.innerHTML = `
      <!-- Crosshair -->
      <div class="crosshair" id="crosshair"></div>

      <!-- Top Compass -->
      <div class="glass-panel compass-container" id="compass">
        <span>НАПРЯМОК:</span>
        <span class="compass-heading" id="compass-heading">Пн 0°</span>
      </div>

      <!-- Top Right Time & Weather -->
      <div class="glass-panel top-right-badge">
        <span>☀️</span>
        <span class="time-clock" id="time-clock">10:30</span>
      </div>

      <!-- Bottom Left HUD Stats -->
      <div class="glass-panel bottom-left-hud">
        <div class="hud-title">Процедурний Архіпелаг</div>
        <div class="hud-stat-row">
          <span>Координати:</span>
          <span class="hud-stat-val" id="stat-coords">X: 0, Z: 0</span>
        </div>
        <div class="hud-stat-row">
          <span>Висота:</span>
          <span class="hud-stat-val" id="stat-altitude">12.4 м</span>
        </div>
        <div class="hud-stat-row">
          <span>Швидкість:</span>
          <span class="hud-stat-val" id="stat-speed">0.0 км/г</span>
        </div>
        <div class="stamina-bar-container">
          <div class="stamina-bar-fill" id="stamina-fill"></div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <button class="btn-icon" id="btn-audio" title="Звук (M)">🔊</button>
        <button class="btn-icon" id="btn-light" title="Ліхтарик (F)">🔦</button>
        <button class="btn-icon" id="btn-camera" title="Режим дрона (C)">📷</button>
        <button class="btn-icon" id="btn-photo" title="Зробити скріншот (P)">📸</button>
        <button class="btn-icon" id="btn-settings" title="Налаштування">⚙️</button>
      </div>

      <!-- Settings Drawer -->
      <div class="glass-panel settings-drawer" id="settings-drawer">
        <div class="drawer-header">
          <span class="drawer-title">Налаштування Світу</span>
          <button class="close-btn" id="btn-close-settings">✕</button>
        </div>

        <div class="setting-group">
          <div class="setting-label">
            <span>Час доби</span>
            <span id="label-time">10:30</span>
          </div>
          <input type="range" min="0" max="1" step="0.005" value="0.35" class="slider-input" id="slider-time">
        </div>

        <div class="time-presets">
          <button class="preset-btn" data-time="0.25">🌅 Світанок</button>
          <button class="preset-btn" data-time="0.5">☀️ День</button>
          <button class="preset-btn" data-time="0.75">🌇 Захід</button>
          <button class="preset-btn" data-time="0.0">🌌 Ніч</button>
        </div>

        <div class="setting-group">
          <div class="setting-label">
            <span>Сила вітру</span>
            <span id="label-wind">0.8</span>
          </div>
          <input type="range" min="0" max="2" step="0.1" value="0.8" class="slider-input" id="slider-wind">
        </div>

        <div class="setting-group">
          <div class="setting-label">
            <span>Гучність аудіо</span>
            <span id="label-volume">70%</span>
          </div>
          <input type="range" min="0" max="1" step="0.05" value="0.7" class="slider-input" id="slider-volume">
        </div>
      </div>

      <!-- Welcome / Start Overlay -->
      <div class="welcome-overlay" id="welcome-overlay">
        <div class="glass-panel welcome-card">
          <h1 class="welcome-title">Процедурний Архіпелаг</h1>
          <p class="welcome-desc">
            Досліджуйте нескінченні острови, узбережжя, гори й ліси, детерміновано згенеровані в реальному часі. Кожен біом реагує на висоту, вологість і крутизну схилу.
          </p>

          <div class="controls-grid">
            <div class="control-item"><span class="key-badge">W A S D</span> Рух</div>
            <div class="control-item"><span class="key-badge">Миша</span> Огляд</div>
            <div class="control-item"><span class="key-badge">Shift</span> Спринт</div>
            <div class="control-item"><span class="key-badge">Space</span> Стрибок</div>
            <div class="control-item"><span class="key-badge">F</span> Ліхтарик</div>
            <div class="control-item"><span class="key-badge">C</span> Режим Дрона</div>
          </div>

          <button class="start-btn" id="start-btn">Почати Прогулянку</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  bindEvents() {
    const startBtn = document.getElementById('start-btn');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const settingsDrawer = document.getElementById('settings-drawer');
    const btnAudio = document.getElementById('btn-audio');
    const btnLight = document.getElementById('btn-light');
    const btnCamera = document.getElementById('btn-camera');
    const btnPhoto = document.getElementById('btn-photo');

    const sliderTime = document.getElementById('slider-time');
    const sliderWind = document.getElementById('slider-wind');
    const sliderVolume = document.getElementById('slider-volume');

    // Start Walk Handler
    const startWalk = () => {
      if (!welcomeOverlay.classList.contains('hidden')) {
        welcomeOverlay.classList.add('hidden');
        this.app.audio.init();
        this.app.audio.resume();
        this.app.controls.domElement.requestPointerLock();
      }
    };

    startBtn.addEventListener('click', startWalk);
    welcomeOverlay.addEventListener('click', (e) => {
      if (e.target === welcomeOverlay || e.target.closest('.welcome-card')) {
        startWalk();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        startWalk();
      }
    }, { once: false });

    // Audio Mute Toggle
    btnAudio.addEventListener('click', () => {
      this.app.audio.init();
      this.app.audio.resume();
      const isMuted = this.app.audio.toggleMute();
      btnAudio.textContent = isMuted ? '🔇' : '🔊';
      btnAudio.classList.toggle('active', !isMuted);
    });

    // Flashlight Toggle
    btnLight.addEventListener('click', () => {
      const active = this.app.controls.toggleFlashlight();
      btnLight.classList.toggle('active', active);
    });

    // Camera Mode (Drone Fly)
    btnCamera.addEventListener('click', () => {
      const flyMode = this.app.controls.toggleFlyMode();
      btnCamera.classList.toggle('active', flyMode);
    });

    // Screenshot Photo Mode
    btnPhoto.addEventListener('click', () => {
      this.takeScreenshot();
    });

    // Settings Toggle
    btnSettings.addEventListener('click', () => {
      settingsDrawer.classList.toggle('open');
    });

    btnCloseSettings.addEventListener('click', () => {
      settingsDrawer.classList.remove('open');
    });

    // Time Slider
    sliderTime.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.app.sky.setTime(val);
      this.app.sky.isPaused = true;
      document.getElementById('label-time').textContent = this.app.sky.getTimeFormatted();
    });

    // Time Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const timeVal = parseFloat(btn.dataset.time);
        this.app.sky.setTime(timeVal);
        sliderTime.value = timeVal;
        document.getElementById('label-time').textContent = this.app.sky.getTimeFormatted();
      });
    });

    // Wind Slider
    sliderWind.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      CONFIG.vegetation.windStrength = val;
      if (this.app.grass?.materialShader) {
        this.app.grass.materialShader.uniforms.uWindStrength.value = val;
      }
      document.getElementById('label-wind').textContent = val.toFixed(1);
    });

    // Volume Slider
    sliderVolume.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      CONFIG.audio.masterVolume = val;
      if (this.app.audio.masterGain && this.app.audio.ctx) {
        this.app.audio.masterGain.gain.setValueAtTime(val, this.app.audio.ctx.currentTime);
      }
      document.getElementById('label-volume').textContent = `${Math.round(val * 100)}%`;
    });
  }

  update(playerPos, playerYaw, stamina, speed, timeFormatted) {
    // Compass
    const deg = Math.round(((playerYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * (180 / Math.PI));
    let dir = 'Пн';
    if (deg >= 45 && deg < 135) dir = 'Сх';
    else if (deg >= 135 && deg < 225) dir = 'Пд';
    else if (deg >= 225 && deg < 315) dir = 'Зх';
    document.getElementById('compass-heading').textContent = `${dir} ${deg}°`;

    // Time clock
    document.getElementById('time-clock').textContent = timeFormatted;

    // HUD Stats
    document.getElementById('stat-coords').textContent = `X: ${Math.round(playerPos.x)}, Z: ${Math.round(playerPos.z)}`;
    document.getElementById('stat-altitude').textContent = `${playerPos.y.toFixed(1)} м`;
    document.getElementById('stat-speed').textContent = `${(speed * 3.6).toFixed(1)} км/г`;

    // Stamina Bar
    const staminaPercent = (stamina / CONFIG.player.staminaMax) * 100;
    document.getElementById('stamina-fill').style.width = `${staminaPercent}%`;
  }

  takeScreenshot() {
    // Render high-res screenshot
    const uiRoot = document.getElementById('ui-root');
    uiRoot.style.display = 'none';

    this.app.renderer.render(this.app.scene, this.app.camera);
    const dataURL = this.app.renderer.domElement.toDataURL('image/png');

    uiRoot.style.display = 'block';

    const link = document.createElement('a');
    link.download = `forest-biome-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }
}
