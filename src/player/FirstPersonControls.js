import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { getTerrainHeight, getTerrainSlope } from '../terrain/Noise.js';
import { HeadBob } from './HeadBob.js';

export class FirstPersonControls {
  constructor(camera, domElement, scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    // Movement state
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.position = new THREE.Vector3(0, 10, 0);
    this.isGrounded = false;
    this.isSprinting = false;
    this.stamina = CONFIG.player.staminaMax;
    this.isFlyMode = false;

    // Orientation (Euler angles)
    this.pitch = 0;
    this.yaw = 0;
    this.isLocked = false;

    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
    };

    // Head bobbing & audio integration
    this.headBob = new HeadBob(this.camera);

    // Flashlight
    this.flashlight = this.createFlashlight();
    this.camera.add(this.flashlight);
    this.scene.add(this.camera);

    this.initListeners();
    this.snapToTerrain();
  }

  createFlashlight() {
    const light = new THREE.SpotLight(0xffeedd, 0, 45, Math.PI / 5, 0.4, 1.5);
    light.position.set(0.3, -0.2, -0.2);
    light.target.position.set(0, -0.2, -5);
    this.camera.add(light.target);
    return light;
  }

  toggleFlashlight() {
    if (this.flashlight.intensity > 0) {
      this.flashlight.intensity = 0;
      return false;
    } else {
      this.flashlight.intensity = 2.5;
      return true;
    }
  }

  toggleFlyMode() {
    this.isFlyMode = !this.isFlyMode;
    this.velocity.set(0, 0, 0);
    return this.isFlyMode;
  }

  snapToTerrain() {
    let h = getTerrainHeight(this.position.x, this.position.z);
    // Find a deterministic nearby dry spawn if the seed places origin at sea.
    if (h < CONFIG.terrain.waterLevel + 2) {
      outer: for (let radius = 20; radius <= 400; radius += 20) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const candidate = getTerrainHeight(x, z);
          if (candidate > CONFIG.terrain.waterLevel + 3 && getTerrainSlope(x, z) < 0.14) {
            this.position.set(x, candidate + CONFIG.player.height, z);
            h = candidate;
            break outer;
          }
        }
      }
    }
    this.position.y = Math.max(h, CONFIG.terrain.waterLevel) + CONFIG.player.height;
    this.camera.position.copy(this.position);
  }

  initListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    const requestLock = () => {
      if (!this.isLocked && this.domElement) {
        this.domElement.requestPointerLock();
      }
    };

    this.domElement.addEventListener('click', requestLock);
    window.addEventListener('click', (e) => {
      // If clicking outside interactive UI buttons/sliders
      if (!e.target.closest('.settings-drawer') && !e.target.closest('.action-bar') && !e.target.closest('.preset-btn')) {
        requestLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (!this.isLocked) this.resetKeys();
    });
    window.addEventListener('blur', () => this.resetKeys());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetKeys();
    });
  }

  resetKeys() {
    Object.keys(this.keys).forEach((key) => { this.keys[key] = false; });
  }

  onKeyDown(e) {
    if (e.repeat) return;
    const code = e.code;
    const k = e.key ? e.key.toLowerCase() : '';

    if (code === 'KeyW' || code === 'ArrowUp' || k === 'w' || k === 'ц') {
      this.keys.forward = true;
    } else if (code === 'KeyS' || code === 'ArrowDown' || k === 's' || k === 'і' || k === 'ы') {
      this.keys.backward = true;
    } else if (code === 'KeyA' || code === 'ArrowLeft' || k === 'a' || k === 'ф') {
      this.keys.left = true;
    } else if (code === 'KeyD' || code === 'ArrowRight' || k === 'd' || k === 'в') {
      this.keys.right = true;
    } else if (code === 'Space' || k === ' ') {
      this.keys.jump = true;
    } else if (code === 'ShiftLeft' || code === 'ShiftRight' || k === 'shift') {
      this.keys.sprint = true;
    } else if (code === 'KeyF' || k === 'f' || k === 'а') {
      this.toggleFlashlight();
    } else if (code === 'KeyC' || k === 'c' || k === 'с') {
      this.toggleFlyMode();
    }
  }

  onKeyUp(e) {
    const code = e.code;
    const k = e.key ? e.key.toLowerCase() : '';

    if (code === 'KeyW' || code === 'ArrowUp' || k === 'w' || k === 'ц') {
      this.keys.forward = false;
    } else if (code === 'KeyS' || code === 'ArrowDown' || k === 's' || k === 'і' || k === 'ы') {
      this.keys.backward = false;
    } else if (code === 'KeyA' || code === 'ArrowLeft' || k === 'a' || k === 'ф') {
      this.keys.left = false;
    } else if (code === 'KeyD' || code === 'ArrowRight' || k === 'd' || k === 'в') {
      this.keys.right = false;
    } else if (code === 'Space' || k === ' ') {
      this.keys.jump = false;
    } else if (code === 'ShiftLeft' || code === 'ShiftRight' || k === 'shift') {
      this.keys.sprint = false;
    }
  }

  onMouseMove(e) {
    if (!this.isLocked) return;

    const sens = CONFIG.player.mouseSensitivity;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;

    // Clamp pitch looking straight up/down
    this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  update(delta) {
    // Stamina calculation
    const isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;

    if (this.keys.sprint && isMoving && this.stamina > 5 && !this.isFlyMode) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - CONFIG.player.staminaDrain * delta);
    } else {
      this.isSprinting = false;
      this.stamina = Math.min(CONFIG.player.staminaMax, this.stamina + CONFIG.player.staminaRecover * delta);
    }

    const currentSpeed = this.isFlyMode
      ? CONFIG.player.runSpeed * 2.2
      : (this.isSprinting ? CONFIG.player.runSpeed : CONFIG.player.walkSpeed);

    // Calculate move direction relative to camera yaw
    this.direction.set(0, 0, 0);
    if (this.keys.forward) this.direction.z -= 1;
    if (this.keys.backward) this.direction.z += 1;
    if (this.keys.left) this.direction.x -= 1;
    if (this.keys.right) this.direction.x += 1;
    this.direction.normalize();

    // Build movement from the camera basis. W is therefore always the
    // horizontal direction visible through the crosshair.
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.camera.up).normalize();
    const moveX = (this.right.x * this.direction.x - this.forward.x * this.direction.z) * currentSpeed;
    const moveZ = (this.right.z * this.direction.x - this.forward.z * this.direction.z) * currentSpeed;

    if (this.isFlyMode) {
      // Free flight mode
      let moveY = 0;
      if (this.keys.jump) moveY += currentSpeed;
      if (this.keys.sprint) moveY -= currentSpeed;

      this.position.x += moveX * delta;
      this.position.y += moveY * delta;
      this.position.z += moveZ * delta;
      this.camera.position.copy(this.position);
      return;
    }

    // Horizontal acceleration & damping
    const damping = 1 - Math.exp(-12 * delta);
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, moveX, damping);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, moveZ, damping);

    // Jump
    if (this.keys.jump && this.isGrounded) {
      this.velocity.y = CONFIG.player.jumpForce;
      this.isGrounded = false;
    }

    // Apply gravity
    this.velocity.y -= CONFIG.player.gravity * delta;

    // Update position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // Terrain Collision & Ground Snapping
    const terrainHeight = getTerrainHeight(this.position.x, this.position.z);
    const minHeight = Math.max(terrainHeight, CONFIG.terrain.waterLevel - 0.5) + CONFIG.player.height;

    if (this.position.y <= minHeight) {
      this.position.y = minHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    this.camera.position.copy(this.position);

    // Head bobbing
    const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    this.headBob.update(delta, horizSpeed > 0.5, this.isSprinting, this.isGrounded);
  }
}
