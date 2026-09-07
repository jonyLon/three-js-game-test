import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { movePlayer } from './src/walk.js';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const p={x:-3,z:0};movePlayer(p,6,0,[{x:0,z:0,radius:1}]);assert.ok(p.x<=-1.319,'Cannot tunnel through a trunk');
const edge={x:34,z:25};movePlayer(edge,10,10,[]);assert.equal(edge.x,35);assert.equal(edge.z,26);
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__silva?.frames>4);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#loading')).opacity==='0');
await page.locator('#walk-start').click();await page.waitForFunction(()=>__silva.walker.locked);
const before=await page.evaluate(()=>__silva.camera.position.toArray());
await page.keyboard.down('w');await page.waitForTimeout(600);await page.keyboard.up('w');
const after=await page.evaluate(()=>__silva.camera.position.toArray());assert.ok(Math.hypot(after[0]-before[0],after[2]-before[2])>.4,'W moves player');
await page.keyboard.press('Space');await page.waitForTimeout(120);assert.ok(await page.evaluate(()=>__silva.walker.jumpHeight>0),'Jump lifts player');
await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>__silva.walker.jumpHeight),0,'Player lands');
const rotation=await page.evaluate(()=>__silva.camera.rotation.y);await page.mouse.move(800,400);await page.mouse.move(900,400,{steps:5});assert.notEqual(await page.evaluate(()=>__silva.camera.rotation.y),rotation,'Mouse look');
await page.keyboard.press('Escape');await page.waitForFunction(()=>!__silva.walker.locked);
const paused=await page.evaluate(()=>__silva.camera.position.toArray());await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');assert.deepEqual(await page.evaluate(()=>__silva.camera.position.toArray()),paused,'Paused movement blocked');
await page.locator('#walk-start').click();await page.waitForFunction(()=>__silva.walker.locked);const resumed=await page.evaluate(()=>__silva.camera.position.toArray());assert.ok(resumed.every((v,i)=>Math.abs(v-paused[i])<.001),'Resume keeps position');
await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>!__silva.walker.locked);assert.equal(await page.evaluate(()=>__silva.walker.keys.size),0);
await page.locator('#regenerate').click();await page.waitForFunction(()=>__silva.seed===10760);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#loading')).opacity==='0');assert.ok(await page.evaluate(()=>__silva.walker.colliders.length>50));
await page.locator('#walk-exit').click();assert.equal(await page.evaluate(()=>__silva.walker.active),false);assert.equal(await page.evaluate(()=>__silva.controls.enabled),true);
assert.deepEqual(errors,[]);console.log('PASS: collision, boundaries, pointer lock, WASD, jump/landing, mouse look, pause, resume, blur, regeneration, orbit return.');
}finally{await browser.close();}

