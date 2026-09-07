import * as THREE from 'three';

// A horizontal player capsule, resolved in small steps to prevent tunnelling.
export function movePlayer(position, dx, dz, colliders, radius = .32) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .15));
  for (let step = 0; step < steps; step++) {
    position.x += dx / steps; position.z += dz / steps;
    for (let pass = 0; pass < 3; pass++) {
      for (const c of colliders) {
        const x = position.x - c.x, z = position.z - c.z;
        const distance = Math.hypot(x, z), clearance = c.radius + radius;
        if (distance < clearance) {
          const nx = distance > .00001 ? x / distance : 1;
          const nz = distance > .00001 ? z / distance : 0;
          position.x += nx * (clearance - distance);
          position.z += nz * (clearance - distance);
        }
      }
      position.x = THREE.MathUtils.clamp(position.x, -35, 35);
      position.z = THREE.MathUtils.clamp(position.z, -43, 26);
    }
  }
  return position;
}

export class WalkController {
  constructor(camera, canvas, orbit, height, reducedMotion) {
    Object.assign(this, { camera, canvas, orbit, height, reducedMotion });
    this.active = false; this.locked = false; this.colliders = [];
    this.keys = new Set(); this.velocity = new THREE.Vector2();
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.jumpHeight = 0; this.verticalSpeed = 0; this.stepPhase = 0;
    this.button = document.querySelector('#walk-start');
    this.status = document.querySelector('#walk-status');
    this.button.onclick = () => this.start();
    document.querySelector('#walk-exit').onclick = () => this.exit();
    canvas.addEventListener('click', () => { if (this.active && !this.locked) this.start(); });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.clearInput();
      if (this.locked && !this.active) this.enter();
      document.body.classList.toggle('walking', this.locked);
      this.button.textContent = this.active ? 'Продовжити прогулянку' : 'Увійти в ліс';
      this.status.textContent = this.active ? 'Прогулянку призупинено · натисни, щоб повернутися' : 'WASD · миша · Shift — біг · Space — стрибок';
    });
    document.addEventListener('pointerlockerror', () => this.showLockError());
    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.rotation.y -= e.movementX * .002;
      this.rotation.x = THREE.MathUtils.clamp(this.rotation.x - e.movementY * .002, -Math.PI / 2 + .03, Math.PI / 2 - .03);
      camera.quaternion.setFromEuler(this.rotation);
    });
    const movementKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space']);
    document.addEventListener('keydown', e => {
      if (this.locked && e.code === 'Escape') { this.pause(); return; }
      if (!this.locked || !movementKeys.has(e.code)) return;
      e.preventDefault(); this.keys.add(e.code);
      if (e.code === 'Space' && !e.repeat && this.jumpHeight === 0) this.verticalSpeed = 4.6;
    });
    document.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
  }
  clearInput() { this.keys.clear(); this.velocity.set(0, 0); }
  pause() { this.clearInput(); if (document.pointerLockElement === this.canvas) document.exitPointerLock(); }
  showLockError() { this.status.textContent = 'Не вдалося захопити мишу. Натисни ще раз або відкрий сцену в окремому браузері.'; }
  async start() {
    try { await this.canvas.requestPointerLock(); } catch { this.showLockError(); }
  }
  enter() {
    this.active = true; this.orbit.enabled = false;
    this.rotation.setFromQuaternion(this.camera.quaternion, 'YXZ'); this.rotation.z = 0;
    this.resetPosition();
    document.body.classList.remove('ui-hidden');
    document.body.classList.add('walk-mode');
  }
  resetPosition(z = 20) {
    // The path is kept free of trees; the collision solver also clears stones.
    this.camera.position.set(2 + Math.sin(z * .13) * 3.6 + Math.sin(z * .045) * 3, 0, z);
    movePlayer(this.camera.position, 0, 0, this.colliders);
    this.jumpHeight = 0; this.verticalSpeed = 0; this.clearInput();
    this.camera.position.y = this.height(this.camera.position.x, this.camera.position.z) + 1.7;
  }
  exit() {
    this.pause(); this.active = false; this.orbit.enabled = true;
    const direction = new THREE.Vector3(); this.camera.getWorldDirection(direction);
    this.orbit.target.copy(this.camera.position).addScaledVector(direction, 10);
    document.body.classList.remove('walk-mode', 'walking');
    this.button.textContent = 'Увійти в ліс';
    this.status.textContent = 'WASD · миша · Shift — біг · Space — стрибок';
  }
  update(dt) {
    if (!this.active || !this.locked || this.traveling) return;
    // Preserve elapsed time on slow frames; integrate motion in stable small steps.
    const elapsed = Math.min(Math.max(dt, 0), .5);
    const steps = Math.max(1, Math.ceil(elapsed / (1 / 120)));
    // Broad phase once per frame; reuse the array during physics substeps.
    this.nearColliders ??= [];
    this.nearColliders.length = 0;
    const reach = 7.5 * elapsed + 1;
    for(const c of this.colliders){const dx=c.x-this.camera.position.x,dz=c.z-this.camera.position.z,r=c.radius+reach;if(dx*dx+dz*dz<r*r)this.nearColliders.push(c);}
    for (let i = 0; i < steps; i++) this.updateStep(elapsed / steps);
  }
  updateStep(dt) {
    const keys=this.keys;
    let side = Number((keys.has('KeyD')||keys.has('ArrowRight'))) - Number((keys.has('KeyA')||keys.has('ArrowLeft')));
    let forward = Number((keys.has('KeyW')||keys.has('ArrowUp'))) - Number((keys.has('KeyS')||keys.has('ArrowDown')));
    const length = Math.hypot(side, forward);
    if (length) { side /= length; forward /= length; }
    const speed = (keys.has('ShiftLeft')||keys.has('ShiftRight')) ? 6.2 : 3.5;
    const yaw = this.rotation.y;
    const desiredX = (side * Math.cos(yaw) - forward * Math.sin(yaw)) * speed;
    const desiredZ = (-side * Math.sin(yaw) - forward * Math.cos(yaw)) * speed;
    const blend = 1 - Math.exp(-22 * dt);
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, desiredX, blend);
    this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, desiredZ, blend);
    movePlayer(this.camera.position, this.velocity.x * dt, this.velocity.y * dt, this.nearColliders || this.colliders);
    this.verticalSpeed -= 13 * dt;
    this.jumpHeight = Math.max(0, this.jumpHeight + this.verticalSpeed * dt);
    if (this.jumpHeight === 0) this.verticalSpeed = 0;
    this.stepPhase += this.velocity.length() * dt * 2.5;
    const bob = this.reducedMotion || this.jumpHeight > 0 ? 0 : Math.sin(this.stepPhase) * .025 * Math.min(1, this.velocity.length());
    this.camera.position.y = this.height(this.camera.position.x, this.camera.position.z) + 1.7 + this.jumpHeight + bob;
    this.camera.quaternion.setFromEuler(this.rotation);
  }
}




