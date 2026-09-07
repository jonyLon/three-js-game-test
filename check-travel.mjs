import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl','--ignore-gpu-blocklist']});
try{const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__silva?.frames>5);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#loading')).opacity==='0');
assert.equal(await page.locator('#inventory img').count(),3);assert.ok(await page.locator('#inventory img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)));
await page.locator('#walk-start').click();await page.waitForFunction(()=>__silva.walker.locked);
await page.evaluate(()=>{__silva.gathering.counts.wood=3;__silva.gathering.renderInventory();__silva.walker.resetPosition(-39.8);__silva.walker.rotation.set(0,0,0,'YXZ');});
await page.keyboard.down('w');await page.waitForFunction(()=>__silva.biome==='forest'&&!__silva.trail.busy,null,{timeout:30000});await page.keyboard.up('w');
assert.equal(await page.evaluate(()=>__silva.walker.locked),true);assert.equal(await page.evaluate(()=>__silva.gathering.counts.wood),3);assert.ok(await page.evaluate(()=>__silva.camera.position.z>16&&__silva.camera.position.z<22));
await page.screenshot({path:'inventory-trail-preview.png'});
await page.evaluate(()=>{__silva.trail.cooldown=0;__silva.walker.resetPosition(23.8);__silva.walker.rotation.set(0,Math.PI,0,'YXZ');});await page.keyboard.down('w');await page.waitForFunction(()=>__silva.biome==='jungle'&&!__silva.trail.busy,null,{timeout:30000});await page.keyboard.up('w');
assert.ok(await page.evaluate(()=>__silva.camera.position.z<-32&&__silva.camera.position.z>-39));assert.equal(await page.evaluate(()=>__silva.walker.locked),true);assert.equal(await page.evaluate(()=>__silva.gathering.counts.wood),3);assert.deepEqual(errors,[]);
await page.keyboard.press('Escape');await page.waitForFunction(()=>!__silva.walker.locked);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>__silva.trail.busy),false);
console.log('PASS: three loaded resource icons; north/south trail travel; pointer lock retained; inventory preserved; pause after travel.');
}finally{await browser.close();}
