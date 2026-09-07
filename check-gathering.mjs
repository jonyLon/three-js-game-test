import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl','--ignore-gpu-blocklist']});
try{
const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__silva?.frames>5);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#loading')).opacity==='0');
await page.locator('#walk-start').click();await page.waitForFunction(()=>__silva.walker.locked);
const ids=[];
for(const type of ['mushroom','stone','wood']){
 const id=await page.evaluate(type=>{const {gathering:g,walker:w,camera:c}=__silva;for(const n of g.nodes.filter(n=>n.type===type&&!n.taken)){c.position.copy(n.position);c.position.z+=.7;w.rotation.set(-.55,0,0,'YXZ');w.update(.016);g.update();if(g.target?.type===type)return g.target.id;}return null;},type);
 assert.ok(id,'Reachable '+type);ids.push(id);
 await page.keyboard.press('e');await page.waitForFunction(type=>__silva.gathering.counts[type]===1,type);
 assert.equal(await page.evaluate(id=>__silva.gathering.nodes.find(n=>n.id===id).taken,id),true);
 assert.ok(await page.evaluate(id=>{const n=__silva.gathering.nodes.find(n=>n.id===id);return n.parts.every(p=>p.mesh.instanceMatrix.array[p.index*16]===0);},id));
}
await page.keyboard.press('i');assert.equal(await page.locator('#inventory').isVisible(),false);await page.keyboard.press('i');assert.equal(await page.locator('#inventory').isVisible(),true);
await page.keyboard.press('Escape');await page.waitForFunction(()=>!__silva.walker.locked);
const counts=await page.evaluate(()=>({...__silva.gathering.counts}));await page.keyboard.press('e');assert.deepEqual(await page.evaluate(()=>__silva.gathering.counts),counts);
await page.reload();await page.waitForFunction(()=>window.__silva?.frames>5);assert.deepEqual(await page.evaluate(()=>__silva.gathering.counts),counts);assert.ok(await page.evaluate(ids=>ids.every(id=>__silva.gathering.nodes.find(n=>n.id===id)?.taken),ids));
for(const biome of ['forest','jungle']){await page.selectOption('#biome',biome);await page.waitForFunction(()=>document.querySelector('#loading').classList.contains('done')&&getComputedStyle(document.querySelector('#loading')).opacity==='0');}
assert.ok(await page.evaluate(ids=>ids.every(id=>__silva.gathering.nodes.find(n=>n.id===id)?.taken),ids));assert.deepEqual(errors,[]);
console.log('PASS: E collects all resource types, instances disappear, inventory, pause, reload persistence, biome round trip.');
}finally{await browser.close();}

