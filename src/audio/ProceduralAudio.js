import { CONFIG } from '../config.js';

export class ProceduralAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;

    this.masterGain = null;
    this.windGain = null;
    this.waterGain = null;
    this.cricketGain = null;

    this.nextBirdTime = 0;
    this.nextCricketTime = 0;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(CONFIG.audio.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initWind();
      this.initWater();
      this.initCrickets();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio could not be initialized:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  initWind() {
    const noiseBuffer = this.createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter for deep forest wind rustle
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    // LFO to modulate wind gusts
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(160, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.35 * CONFIG.audio.ambientVolume, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    noiseSource.start();
    lfo.start();
  }

  initWater() {
    const noiseBuffer = this.createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, this.ctx.currentTime);

    this.waterGain = this.ctx.createGain();
    this.waterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(this.waterGain);
    this.waterGain.connect(this.masterGain);

    noiseSource.start();
  }

  initCrickets() {
    this.cricketGain = this.ctx.createGain();
    this.cricketGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.cricketGain.connect(this.masterGain);
  }

  playBirdChirp() {
    if (!this.initialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 2200 + Math.random() * 1200;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq + 600 + Math.random() * 400, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, now + 0.16);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.12 * CONFIG.audio.wildlifeVolume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCricketChirp() {
    if (!this.initialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(4600 + (Math.random() - 0.5) * 400, now);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.05 * CONFIG.audio.wildlifeVolume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playFootstep(isWater = false) {
    if (!this.initialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isWater ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(isWater ? 900 : 380, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22 * CONFIG.audio.footstepsVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.13);
  }

  update(playerPos, timeOfDay) {
    if (!this.initialized) return;

    const now = this.ctx.currentTime;
    const isDay = timeOfDay > 0.22 && timeOfDay < 0.78;

    // 1. Bird chirps during day
    if (isDay && now > this.nextBirdTime) {
      this.playBirdChirp();
      this.nextBirdTime = now + 1.2 + Math.random() * 3.5;
    }

    // 2. Cricket chirps at night
    if (!isDay && now > this.nextCricketTime) {
      this.playCricketChirp();
      this.nextCricketTime = now + 0.25 + Math.random() * 0.6;
    }

    // 3. Water proximity volume
    const waterDist = Math.abs(playerPos.y - CONFIG.terrain.waterLevel);
    const waterVol = Math.max(0, 1.0 - waterDist / 8.0) * 0.4 * CONFIG.audio.ambientVolume;
    this.waterGain.gain.linearRampToValueAtTime(waterVol, now + 0.1);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : CONFIG.audio.masterVolume,
        this.ctx.currentTime
      );
    }
    return this.isMuted;
  }
}
