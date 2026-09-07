import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WalkController } from './src/walk.js';
function simulate(fps, sprint=false) {
 const w=Object.create(WalkController.prototype);
 Object.assign(w,{active:true,locked:true,keys:new Set(sprint?['KeyW','ShiftLeft']:['KeyW']),velocity:new THREE.Vector2(),rotation:new THREE.Euler(0,0,0,'YXZ'),camera:new THREE.PerspectiveCamera(),colliders:[],height:()=>0,reducedMotion:true,jumpHeight:0,verticalSpeed:0,stepPhase:0});
 for(let i=0;i<fps*2;i++)w.update(1/fps);
 return -w.camera.position.z;
}
const fast=simulate(60),slow=simulate(10),verySlow=simulate(2),sprint=simulate(60,true);
assert.ok(Math.abs(fast-slow)<.02);assert.ok(Math.abs(fast-verySlow)<.02);assert.ok(fast>6.7&&fast<7.1);assert.ok(sprint>fast*1.7);
console.log('PASS: same walking distance at 2, 10 and 60 FPS; faster walking and sprint.',{fast,slow,verySlow,sprint});

