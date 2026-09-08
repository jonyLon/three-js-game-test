import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const{chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__silva?.frames>4,null,{timeout:90000});
for(const id of ['ez','terrain','simplex','fastnoise','seedthree','jungle','ez']){
 await page.selectOption('#biome',id);await page.waitForFunction(id=>window.__silva?.biome===id&&document.querySelector('#loading').classList.contains('done'),id,{timeout:90000});
 await page.waitForTimeout(700);
 console.log(id,await page.evaluate(()=>{const w=window.__silva;w.walker.resetPosition();return {y:w.camera.position.y,colliders:w.walker.colliders.length,geometries:w.renderer.info.memory.geometries,draws:w.renderer.info.render.calls};}));
 await page.screenshot({path:'test-biome-'+id+'.png'});
}
for(const expected of ['terrain','simplex','fastnoise','seedthree','jungle','forest','ez']){await page.evaluate(()=>__silva.trail.cross(true));const actual=await page.evaluate(()=>__silva.biome);if(actual!==expected)throw new Error('Route '+actual+' != '+expected);const valid=await page.evaluate(()=>{const h=__silva.walker.height;for(let z=-40;z<25;z+=2)if(!Number.isFinite(h(2+Math.sin(z*.13)*3.6+Math.sin(z*.045)*3,z)))return false;return true;});if(!valid)throw new Error('Invalid path height');}console.log('PASS: full trail circuit and finite path heights');console.log('ERRORS',errors);await browser.close();if(errors.length)process.exit(1);

