import * as THREE from 'three';

export class HeadBob {
  constructor(camera) {
    this.camera = camera;
    this.timer = 0;
    this.prevStep = 0;
    this.onFootstep = null;
  }

  update(delta, isMoving, isSprinting, isGrounded) {
    if (!isGrounded) return;

    if (isMoving) {
      const speedMultiplier = isSprinting ? 1.6 : 1.0;
      const stepFreq = 9.5 * speedMultiplier;
      this.timer += delta * stepFreq;

      const bobY = Math.sin(this.timer) * (isSprinting ? 0.09 : 0.05);
      const bobX = Math.cos(this.timer * 0.5) * (isSprinting ? 0.05 : 0.03);

      this.camera.position.y += bobY * 0.4;
      this.camera.position.x += bobX * 0.4;

      // Detect footstep event (when sine cycle passes bottom trough)
      const currentStep = Math.sin(this.timer);
      if (this.prevStep > -0.85 && currentStep <= -0.85) {
        if (this.onFootstep) this.onFootstep();
      }
      this.prevStep = currentStep;
    } else {
      // Idle breathing bob
      this.timer += delta * 1.5;
      const breath = Math.sin(this.timer) * 0.008;
      this.camera.position.y += breath * 0.2;
    }
  }
}
