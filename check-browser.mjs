import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({headless:true,channel:'msedge',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page = await browser.newPage({ viewport:{width:1440,height:960},deviceScaleFactor:1 });
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:5173/');
try { await page.waitForFunction(()=>window.__silva?.frames>5,null,{timeout:60000}); } catch(e) { console.log('WAIT',e.message,JSON.stringify(errors)); }
await page.waitForFunction(()=>getComputedStyle(document.querySelector('#loading')).opacity==='0');
await page.screenshot({path:'forest-preview.png'});
await page.getByRole('button',{name:'Туман',exact:true}).click();
await page.waitForFunction(()=>window.__silva.mood==='mist');
await page.getByRole('button',{name:'Сутінки',exact:true}).click();
await page.waitForFunction(()=>window.__silva.mood==='dusk');
await page.getByRole('button',{name:'Ранок',exact:true}).click();
await page.getByRole('button',{name:'Інший ліс',exact:true}).click();
await page.waitForFunction(()=>window.__silva.seed===10760);
await page.waitForFunction(()=>getComputedStyle(document.querySelector('#loading')).opacity==='0');
await page.keyboard.press('h');
if(!await page.locator('body').evaluate(e=>e.classList.contains('ui-hidden')))throw new Error('Hide UI failed');
await page.keyboard.press('h');
await page.getByRole('button',{name:'Увімкнути звуки лісу',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('#sound').getAttribute('aria-pressed')==='true');
await page.getByRole('button',{name:'Вимкнути звуки лісу',exact:true}).click();
const before=await page.evaluate(()=>__silva.camera.position.toArray());
await page.mouse.move(800,400);await page.mouse.down();await page.mouse.move(950,420,{steps:10});await page.mouse.up();
const after=await page.evaluate(()=>__silva.camera.position.toArray());
if(JSON.stringify(before)===JSON.stringify(after))throw new Error('Orbit failed');
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'forest-mobile.png'});
console.log('PASS: atmosphere, regeneration, UI toggle, sound toggle, orbit, mobile viewport');
console.log(JSON.stringify({errors,diagnostics:await page.evaluate(()=>({frames:window.__silva?.frames,geometries:window.__silva?.renderer.info.memory.geometries,seed:window.__silva?.seed}))}));
await browser.close();


