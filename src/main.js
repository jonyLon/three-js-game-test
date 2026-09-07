import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';
import { TrailTravel } from './travel.js';
import { Gathering } from './gathering.js';
import { createSky } from './sky.js';
import { createJungleGenerator } from './jungle.js';
import { optimizeAtmosphere } from './atmosphere.js';
import { WalkController } from './walk.js';

// Every visible natural asset is generated here: no models or texture downloads.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector('#scene').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(53, innerWidth / innerHeight, .1, 145);
camera.position.set(11, 3.6, 22);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-2, 4.6, -10);
controls.enableDamping = true; controls.dampingFactor = .045;
controls.minDistance = 5; controls.maxDistance = 42;
controls.minPolarAngle = .5; controls.maxPolarAngle = Math.PI / 2 + .065;
controls.enablePan = false;
const hemi = new THREE.HemisphereLight(0xc8dfdc, 0x44451d, 1.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2a5, 4.6);
sun.position.set(-16, 27, -25); sun.target.position.set(0, 0, -1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 100 });
sun.shadow.bias = -.00025; sun.shadow.normalBias = .05;
scene.add(sun, sun.target);
const sky=createSky(scene,camera,sun);
const bounce = new THREE.DirectionalLight(0x9bc8bc, .4); bounce.position.set(8, 7, 20); scene.add(bounce);
let random, seed = 2841;
let biome = 'jungle';
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const range = (a, b) => a + random() * (b - a);
function hash(x, z) { const n = Math.sin(x * 127.1 + z * 311.7 + seed * .13) * 43758.5453; return n - Math.floor(n); }
function noise(x, z) { const ix = Math.floor(x), iz = Math.floor(z); let fx = x - ix, fz = z - iz; fx *= fx * (3 - 2 * fx); fz *= fz * (3 - 2 * fz); return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), fx), THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), fx), fz); }
function terrain(x, z) { return (noise(x * .065, z * .065) - .5) * 3.2 + (noise(x * .22, z * .22) - .5) * .55 + Math.sin(z * .13) * .32; }
function pathX(z) { return 2 + Math.sin(z * .13) * 3.6 + Math.sin(z * .045) * 3; }
function pathDistance(x, z) { return Math.abs(x - pathX(z)); }
const dummy = new THREE.Object3D(), color = new THREE.Color();
const wind = { value: 0 };
function windy(mat, strength = .1) {
  mat.onBeforeCompile = shader => { shader.uniforms.uWindTime = wind; shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader; shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 wp = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;\ntransformed.x += sin(uWindTime * 1.1 + wp.x * .47 + wp.z * .31) * ${strength.toFixed(3)} * max(position.y, 0.0);\ntransformed.z += cos(uWindTime * .8 + wp.z * .43) * ${(.4 * strength).toFixed(3)} * max(position.y, 0.0);\n#endif`); };
  mat.customProgramCacheKey = () => 'wind' + strength;
  return mat;
}
function makeBark() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 512), r = rng(8432);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const striation = Math.sin(x * .28 + Math.sin(y * .021 + x * .1) * 2.2) * Math.sin(x * .13 + y * .003);
    const v = 58 + striation * 28 + r() * 30; const p = (y * 512 + x) * 4;
    pixels.data[p] = v * 1.12; pixels.data[p + 1] = v * .86; pixels.data[p + 2] = v * .64; pixels.data[p + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 4); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; return texture;
}
const barkMap = makeBark();
const barkMat = new THREE.MeshStandardMaterial({ map: barkMap, bumpMap: barkMap, bumpScale: .16, roughness: 1 });
const needleMat = windy(new THREE.MeshStandardMaterial({ color: 0x77964a, roughness: .91, side: THREE.DoubleSide }), .035);
const grassMat = windy(new THREE.MeshStandardMaterial({ color: 0x93a44c, roughness: .94, side: THREE.DoubleSide }), .25);
const fernMat = windy(new THREE.MeshStandardMaterial({ color: 0x5e8d35, roughness: .8, side: THREE.DoubleSide }), .12);
const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x9c7950, roughness: 1 });
const mushroomStem = new THREE.MeshStandardMaterial({ color: 0xc9b996, roughness: .9 });
const mushroomCap = new THREE.MeshStandardMaterial({ color: 0xb8793d, roughness: .6 });
function makeFloorTexture() {
  const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d'),r=rng(142);
  ctx.fillStyle='#999082';ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<85000;i++){const v=65+r()*110;ctx.fillStyle=`rgba(${v},${v*.96},${v*.8},${.15+r()*.4})`;const s=1+r()*3;ctx.fillRect(r()*1024,r()*1024,s,s);}
  for(let i=0;i<8500;i++){const x=r()*1024,y=r()*1024,a=r()*6.28;ctx.strokeStyle=r()>.5?'#777463':'#b3a68a';ctx.lineWidth=.5+r();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*(3+r()*13),y+Math.sin(a)*(3+r()*13));ctx.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(24,24);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
const floorTexture=makeFloorTexture();groundMat.map=floorTexture;groundMat.bumpMap=floorTexture;groundMat.bumpScale=.075;
const growJungle = createJungleGenerator(windy,barkMat);
const walker = new WalkController(camera, renderer.domElement, controls, terrain, reducedMotion);
const gathering=new Gathering(scene,camera,walker,renderer);
let warmGeometry = true;
let forest = new THREE.Group(); scene.add(forest);
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; forest.add(m); return m; }
function instance(geo, mat, transforms, colors, cast = true, partition = true) {
  // Spatial batches let Three.js cull plants behind the camera independently.
  if(partition && transforms.length > 1000){
    const cells=new Map();
    transforms.forEach((t,i)=>{const key=Math.floor(t.p.x/12)+','+Math.floor(t.p.z/12);if(!cells.has(key))cells.set(key,{transforms:[],colors:[]});const cell=cells.get(key);cell.transforms.push(t);if(colors)cell.colors.push(colors[i]);});
    for(const cell of cells.values())instance(geo,mat,cell.transforms,colors?cell.colors:null,cast,false);
    return;
  }
  const m = new THREE.InstancedMesh(geo, mat, transforms.length); transforms.forEach((t, i) => { dummy.position.copy(t.p); dummy.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0); dummy.scale.copy(t.s || new THREE.Vector3(1, 1, 1)); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (colors) m.setColorAt(i, colors[i]); }); m.castShadow = cast; m.receiveShadow = true; m.computeBoundingSphere(); forest.add(m); return m;
}
function branch(a, b, r1, r2, dest, sides = 6) { const g = new THREE.CylinderGeometry(r2, r1, a.distanceTo(b), sides, 1); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.applyQuaternion(q); g.translate(...a.clone().add(b).multiplyScalar(.5).toArray()); dest.push(g); }
function merged(parts, material) { if (!parts.length) return; const g = mergeGeometries(parts); parts.forEach(p => p.dispose()); return mesh(g, material); }
function tuftGeometry() {
  const pos = [], normals = [];
  for (let j = 0; j < 11; j++) { const a = j * 2.399; const x = Math.cos(a), z = Math.sin(a), y = j * .038; pos.push(-z * .07, y, x * .07, x * .57, y + .18, z * .57, z * .07, y, -x * .07); for (let k = 0; k < 3; k++) normals.push(x * .25, .9, z * .25); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); return g;
}
function fernGeometry() {
  const pos = [];
  const tri = (a,b,c) => pos.push(...a,...b,...c);
  for (let f = 0; f < 9; f++) {
    const angle = f * Math.PI * 2 / 9;
    const point = (t, side = 0, back = 0) => { const d = t * 1.25 - back; return [Math.cos(angle) * d + Math.sin(angle) * side, Math.sin(t * 2.15) * .75 - Math.abs(side) * .2, Math.sin(angle) * d - Math.cos(angle) * side]; };
    for (let k = 1; k < 15; k++) {
      const t = k / 16, w = Math.sin(t * Math.PI) * .24;
      for (const s of [-1, 1]) { const a = point(t), b = point(t + .055, s * w, .04), c = point(t + .035, s * w * .32, .005); tri(a,b,c); const d = point(t + .083); tri(c,b,d); }
      tri(point(t,-.009), point(t,.009), point(t + .09));
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
function growForest() {
  scene.remove(forest);
  forest.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
  forest = new THREE.Group(); scene.add(forest); random = rng(seed); walker.colliders = [];gathering.beginWorld(biome,seed);
  const ground = new THREE.PlaneGeometry(130, 130, 240, 240); ground.rotateX(-Math.PI / 2);
  const gp = ground.attributes.position, gc = [];
  const moss = new THREE.Color(biome==='jungle'?'#344d28':'#455126'), soil = new THREE.Color(biome==='jungle'?'#615039':'#64543c');
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, terrain(x,z)); const pd = pathDistance(x,z); const trail = 1 - THREE.MathUtils.smoothstep(pd + (noise(x*2,z*2)-.5)*.7, .65, 2.2); color.copy(moss).lerp(soil, trail).multiplyScalar(.65 + noise(x * .65,z * .65) * .65 + random() * .12); gc.push(color.r, color.g, color.b); }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(gc,3)); ground.computeVertexNormals(); mesh(ground, groundMat, false);
  const trunks = [], branches = [], needles = [], needleColors = [];
  const trees = [];
  for (let i=0; i<155; i++) {
    const x=range(-43,43), z=range(-51,28);
    if (pathDistance(x,z)<3.1 || (x-11)**2+(z-22)**2<16 || trees.some(t => (t.x-x)**2+(t.z-z)**2<10)) continue;
    trees.push({x,z,h:range(14,25),r:range(.3,.62)});
  }
  trees.push({x:-8,z:10,h:25,r:.8},{x:12,z:5,h:24,r:.68},{x:-14,z:-7,h:23,r:.65});
  if(biome==='jungle'){growJungle({trees,range,terrain,pathDistance,branch,merged,instance,mesh,colliders:walker.colliders});}else{
  for (const t of trees) {
    const {x,z,h,r}=t, y=terrain(x,z), lean=range(-.5,.5); walker.colliders.push({x,z,radius:r*1.6});
    const tg=new THREE.CylinderGeometry(r*.18,r,h,10,10); const p=tg.attributes.position;
    for(let i=0;i<p.count;i++){ const yy=p.getY(i)+h/2; const a=Math.atan2(p.getZ(i),p.getX(i)); const flare=1+Math.exp(-yy*1.7)*.8; p.setXYZ(i,p.getX(i)*flare+Math.sin(yy*.18)*.1+lean*yy/h,p.getY(i),p.getZ(i)*flare+Math.cos(a*5+yy)*.028); }
    tg.computeVertexNormals();tg.translate(x,y+h/2,z);trunks.push(tg);
    for(let j=0;j<6;j++){const a=j*Math.PI/3+range(-.2,.2);branch(new THREE.Vector3(x+Math.cos(a)*r*.7,y+.7,z+Math.sin(a)*r*.7),new THREE.Vector3(x+Math.cos(a)*r*2.8,y+.04,z+Math.sin(a)*r*2.8),r*.26,.025,trunks);}
    for(let level=0;level<13;level++){
      const f=level/13, by=y+h*(.39+f*.58), length=(1-f)*range(2.6,4.4)+.3;
      for(let j=0;j<5;j++){
        const a=j*Math.PI*2/5+level*2.1+range(-.3,.3), start=new THREE.Vector3(x+lean*(by-y)/h,by,z);
        const end=new THREE.Vector3(x+Math.cos(a)*length,by+.25+f*.5,z+Math.sin(a)*length);
        branch(start,end,r*(1-f)*.16,.014,branches,5);
        for(let k=0;k<12;k++){
          const u=(k+.5)/12, center=start.clone().lerp(end,u);
          for(const side of [-1,1]){
            const spread=(1-u)*length*.37;
            for(let n=0;n<2;n++){
              const v=(n+.55)/2; const px=center.x+Math.cos(a+side*.9)*spread*v, pz=center.z+Math.sin(a+side*.9)*spread*v;
              needles.push({p:new THREE.Vector3(px,center.y+range(-.17,.2),pz),ry:a+side*.7,rx:range(-.2,.2),s:new THREE.Vector3(range(.65,1.1),range(.6,1),range(.65,1.1))});
              needleColors.push(new THREE.Color().setHSL(range(.22,.29),range(.25,.48),range(.18,.35)));
            }
          }
        }
      }
    }
    for(let j=0;j<5;j++){const a=range(0,Math.PI*2), yy=y+range(3,h*.4);branch(new THREE.Vector3(x,yy,z),new THREE.Vector3(x+Math.cos(a)*range(.5,1.8),yy+range(-.4,.3),z+Math.sin(a)*range(.5,1.8)),.065,.007,branches);}
  }
  merged(trunks,barkMat);merged(branches,barkMat);instance(tuftGeometry(),needleMat,needles,needleColors);
  }
  const grass=[], grassColors=[];
  for(let i=0;i<(biome==='jungle'?85000:155000);i++){
    const x=range(-39,39), z=range(-43,33), pd=pathDistance(x,z);
    if(pd<range(.8,2.2) || random()> .45+noise(x*.24,z*.24)*.65)continue;
    const s=range(.18,.52)*(pd<2.5?.55:1);
    grass.push({p:new THREE.Vector3(x,terrain(x,z)-.025,z),ry:range(0,Math.PI*2),s:new THREE.Vector3(range(.65,1.4),s,range(.7,1.3))});
    grassColors.push(new THREE.Color().setHSL(range(.19,.27),range(.3,.6),range(.24,.46)));
  }
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.025,0,0,.025,0,0,-.021,.52,.025,.021,.52,.025,.06,1,.11],3));blade.setIndex([0,1,2,1,3,2,2,3,4]);blade.computeVertexNormals();instance(blade,grassMat,grass,grassColors,false);
  const ferns=[], fernColors=[];
  for(let i=0;i<440;i++){const x=range(-30,30),z=range(-35,29);if(pathDistance(x,z)<2.1)continue;const s=range(.4,1.1);ferns.push({p:new THREE.Vector3(x,terrain(x,z),z),ry:range(0,6.28),s:new THREE.Vector3(s,s,s)});fernColors.push(new THREE.Color().setHSL(range(.22,.3),.47,range(.3,.5)));}
  instance(fernGeometry(),fernMat,ferns,fernColors);
  const rockGeo=new THREE.IcosahedronGeometry(1,3), rp=rockGeo.attributes.position, rc=[];
  for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i);const n=1+.15*Math.sin(x*13+z*7)*Math.cos(y*12);rp.setXYZ(i,x*n,y*n,z*n);color.set(y>.1?'#667044':'#656459').multiplyScalar(.75+hash(x*9,y*8)*.4);rc.push(color.r,color.g,color.b);}
  rockGeo.setAttribute('color',new THREE.Float32BufferAttribute(rc,3));rockGeo.computeVertexNormals();const rocks=[];
  for(let i=0;i<150;i++){const x=range(-33,33),z=range(-40,28),s=range(.12,.85);if(pathDistance(x,z)<1.4&&s>.35)continue;rocks.push({p:new THREE.Vector3(x,terrain(x,z)-.15*s,z),ry:range(0,6.28),s:new THREE.Vector3(s*1.4,s*.65,s)});}
  rocks.push({p:new THREE.Vector3(-2,terrain(-2,11),11),s:new THREE.Vector3(1.8,.95,1.3)});for (const rock of rocks) { if (rock.s.y > .22) walker.colliders.push({x:rock.p.x,z:rock.p.z,radius:Math.max(rock.s.x,rock.s.z)*.9}); } const smoothRock=mergeVertices(rockGeo);smoothRock.computeVertexNormals();rockGeo.dispose();const rockInstances=instance(smoothRock,rockMat,rocks);rocks.forEach((r,i)=>{if(r.s.y<=.22)gathering.register('stone',i,r.p,[{mesh:rockInstances,index:i}]);});
  // Fallen timber with visible end grain and small ochre mushrooms.
  const logA=new THREE.Vector3(-5,terrain(-5,8)+.34,8),logB=new THREE.Vector3(-10,terrain(-10,4)+.48,4),logs=[];branch(logA,logB,.38,.3,logs,12);merged(logs,barkMat);
  const end=mesh(new THREE.CircleGeometry(.3,24),woodMat);end.position.copy(logB);end.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),logB.clone().sub(logA).normalize());
  const twigs=[];
  for(let i=0;i<85;i++){const z=range(-35,24),x=pathX(z)+range(-2.2,2.2);twigs.push({p:new THREE.Vector3(x,terrain(x,z)+.07,z),ry:range(0,6.28),rz:Math.PI/2,s:new THREE.Vector3(1,range(.65,1.4),1)});}
  const twigInstances=instance(new THREE.CylinderGeometry(.035,.055,.65,6),barkMat,twigs,null);
  twigs.forEach((t,i)=>gathering.register('wood',i,t.p,[{mesh:twigInstances,index:i}]));
  const caps=[],stems=[];
  for(let i=0;i<70;i++){const x=range(-17,18),z=range(0,25);if(pathDistance(x,z)<1.5)continue;const s=range(.65,1.4),y=terrain(x,z);stems.push({p:new THREE.Vector3(x,y+.12*s,z),s:new THREE.Vector3(s,s,s)});caps.push({p:new THREE.Vector3(x,y+.24*s,z),s:new THREE.Vector3(s,s*.65,s)});}
  for(let i=0;i<12;i++){const z=18-i*2.7,x=pathX(z)+(i%2?1.35:-1.35),y=terrain(x,z);stems.push({p:new THREE.Vector3(x,y+.12,z)});caps.push({p:new THREE.Vector3(x,y+.24,z),s:new THREE.Vector3(1,.65,1)});}
  const stemInstances=instance(new THREE.CylinderGeometry(.025,.035,.24,5),mushroomStem,stems);
  const capInstances=instance(new THREE.SphereGeometry(.13,9,6,0,Math.PI*2,0,Math.PI/2),mushroomCap,caps);
  caps.forEach((cap,i)=>gathering.register('mushroom',i,cap.p,[{mesh:stemInstances,index:i},{mesh:capInstances,index:i}]));
  document.querySelector('#seed-label').textContent='SEED '+String(seed).padStart(5,'0');
  for(let i=0;i<=16;i++){const t=i/16;walker.colliders.push({x:-5-5*t,z:8-4*t,radius:.4});}
  if(walker.active) walker.resetPosition();
  forest.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});warmGeometry=true;
  renderer.shadowMap.needsUpdate=true;
}

// Depth-aware volumetric light: integrate sunlight through the actual shadow map.
const target = new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType, minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const settings={fog:new THREE.Color('#aeb99a'), density:.024, exposure:1.05, shaft:.7};
const postMat=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tColor:{value:target.texture},tDepth:{value:target.depthTexture},tShadow:{value:null},inverseProjection:{value:camera.projectionMatrixInverse},cameraWorld:{value:camera.matrixWorld},shadowMatrix:{value:sun.shadow.matrix},cameraPositionWorld:{value:camera.position},fogColor:{value:settings.fog},sunColor:{value:new THREE.Color('#ffe1a0')},sunDirection:{value:sun.position.clone().normalize()},density:{value:settings.density},exposure:{value:settings.exposure},shaftStrength:{value:settings.shaft},resolution:{value:new THREE.Vector2()},time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
#include <packing>
varying vec2 vUv;uniform sampler2D tColor,tDepth,tShadow;uniform mat4 inverseProjection,cameraWorld,shadowMatrix;uniform vec3 cameraPositionWorld,fogColor,sunColor,sunDirection;uniform float density,exposure,shaftStrength,time;uniform vec2 resolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
vec3 original=texture2D(tColor,vUv).rgb;float depth=texture2D(tDepth,vUv).x;
vec4 view=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);view/=view.w;vec3 world=(cameraWorld*view).xyz;
vec3 ray=world-cameraPositionWorld;float dist=min(length(ray),85.);vec3 dir=normalize(ray);
float isSky=step(.999999,depth);float fog=(1.-exp(-max(dist-14.,0.)*density))*(1.-isSky);vec3 result=mix(original,fogColor*.67,fog);
float accum=0.;float jitter=hash(gl_FragCoord.xy);float stepSize=dist/40.;
for(int i=0;i<40;i++){float t=(float(i)+jitter)*stepSize;vec3 p=cameraPositionWorld+dir*t;vec4 sc=shadowMatrix*vec4(p,1.);vec3 suv=sc.xyz/sc.w;float lit=1.;if(suv.x>0.&&suv.x<1.&&suv.y>0.&&suv.y<1.&&suv.z<1.){float sd=unpackRGBAToDepth(texture2D(tShadow,suv.xy));lit=step(suv.z-.0003,sd);}float heightFog=exp(-max(p.y,0.)*.055);accum+=lit*exp(-t*density)*stepSize*density*heightFog;}
float facing=pow(max(dot(dir,sunDirection),0.),5.);result+=sunColor*accum*shaftStrength*(.22+facing*1.9)*mix(1.,.2,isSky);
vec2 q=vUv*(1.-vUv.yx);float vignette=pow(clamp(q.x*q.y*19.,0.,1.),.16);result*=mix(.75,1.,vignette);
result=aces(result*exposure);result=pow(result,vec3(1./2.2));result+=(hash(gl_FragCoord.xy+fract(time))-.5)/255.;gl_FragColor=vec4(result,1.);
}`});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMat));
const atmosphere=optimizeAtmosphere(renderer,postMat,postScene,postCamera,camera,sun);
// Floating pollen, rendered as soft points in world space.
const particles=900, particleGeo=new THREE.BufferGeometry(),particlePositions=new Float32Array(particles*3);const pr=rng(719);
for(let i=0;i<particles;i++){particlePositions[i*3]=(pr()-.5)*60;particlePositions[i*3+1]=pr()*15;particlePositions[i*3+2]=(pr()-.5)*60;}
particleGeo.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
const particleMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:wind},vertexShader:`uniform float time;varying float alpha;void main(){vec3 p=position;p.x+=sin(time*.16+position.z)*.5;p.y+=sin(time*.23+position.x)*.3;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(24./-v.z,1.,3.);alpha=.25+.35*sin(position.x*17.);}`,fragmentShader:`varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.87,.52,smoothstep(.5,.08,d)*alpha);}`});scene.add(new THREE.Points(particleGeo,particleMat));
const moods={morning:{fog:'#aeb99a',sky:'#a6b99e',density:.0035,exposure:1.05,shaft:.28,sun:4.6,hemi:1.8,sunColor:'#fff3de',title:'ЛІСОВИЙ РАНОК',description:'Чисте повітря · природне світло'},mist:{fog:'#9eafad',sky:'#96aaa8',density:.018,exposure:1.05,shaft:.14,sun:1.2,hemi:2.2,sunColor:'#dce6df',title:'У СЕРЦІ ТУМАНУ',description:'Прохолодне повітря · м’яке світло'},dusk:{fog:'#667582',sky:'#596774',density:.005,exposure:.85,shaft:.24,sun:2.4,hemi:.9,sunColor:'#ffaa6a',title:'ОСТАННЄ СВІТЛО',description:'Теплий обрій · вечірня прохолода'}};
let currentMood='morning';
function setMood(name){currentMood=name;const m={...moods[name]};if(biome==='jungle'){m.fog=name==='dusk'?'#52716c':'#94b699';m.sky=name==='dusk'?'#41645d':'#9fbea9';m.density*=1;m.hemi*=1.15;m.title=name==='morning'?'ТРОПІЧНИЙ РАНОК':name==='mist'?'ВОЛОГИЙ ПОЛОГ':'СУТІНКИ В ДЖУНГЛЯХ';m.description='Широке листя · ліани · чисте повітря';}scene.background=new THREE.Color(m.sky);settings.fog.set(m.fog);postMat.uniforms.density.value=m.density;postMat.uniforms.exposure.value=m.exposure;postMat.uniforms.shaftStrength.value=m.shaft;postMat.uniforms.sunColor.value.set(m.sunColor);sun.color.set(m.sunColor);sun.intensity=m.sun;hemi.intensity=m.hemi;sky.setMood(name);postMat.uniforms.sunDirection.value.copy(sky.uniforms.sunDirection.value);renderer.shadowMap.needsUpdate=true;document.querySelectorAll('[data-mood]').forEach(b=>{b.classList.toggle('active',b.dataset.mood===name);b.setAttribute('aria-pressed',String(b.dataset.mood===name));});document.querySelector('#mood-title').textContent=m.title;document.querySelector('#scene-description').textContent=m.description;}
document.querySelectorAll('[data-mood]').forEach(b=>b.addEventListener('click',()=>setMood(b.dataset.mood)));
let regenerating=false;
const trail=new TrailTravel(scene,camera,walker,{
 height:terrain,pathX,getBiome:()=>biome,isBusy:()=>regenerating,
 async changeBiome(next,entryZ){
  regenerating=true;
  try{
   const heldKeys=[...walker.keys];biome=next;growForest();walker.resetPosition(entryZ);heldKeys.forEach(key=>walker.keys.add(key));
   setMood(currentMood);updateBiomeUI();await renderer.compileAsync(scene,camera);
  }finally{regenerating=false;}
 }
});
function updateBiomeUI(){
 document.querySelector('#biome').value=biome;trail.updateSigns(biome);
 document.querySelector('h1').innerHTML=biome==='jungle'?'У серці<br/><em>джунглів.</em>':'Там, де<br/>дихає <em>ліс.</em>';
 document.querySelector('.intro p').innerHTML=biome==='jungle'?'Під зеленим пологом.<br/>Назустріч невідомому.':'Трохи світла. Трохи тиші.<br/>Світ, що народжується з математики.';
 document.querySelector('.coordinates').innerHTML=biome==='jungle'?'03° 07′ S &nbsp; / &nbsp; 60° 01′ W <span>УЯВНА АМАЗОНІЯ</span>':'48° 16′ N &nbsp; / &nbsp; 24° 31′ E <span>УЯВНІ КАРПАТИ</span>';
 document.querySelector('#scene').setAttribute('aria-label',biome==='jungle'?'Інтерактивні процедурні джунглі':'Інтерактивний процедурний ліс');
}
document.querySelector('#biome').addEventListener('change',e=>{
 if(regenerating){e.target.value=biome;return;}
 biome=e.target.value;regenerating=true;walker.pause();document.querySelector('#loading').classList.remove('done');
 setTimeout(()=>{growForest();setMood(currentMood);updateBiomeUI();regenerating=false;setTimeout(()=>document.querySelector('#loading').classList.add('done'),100);},60);
});
document.querySelector('#regenerate').addEventListener('click',()=>{if(regenerating)return;regenerating=true;const b=document.querySelector('#regenerate');b.disabled=true;document.querySelector('#loading').classList.remove('done');setTimeout(()=>{seed=(seed+7919)%100000;growForest();trail.updateSigns(biome);b.disabled=false;regenerating=false;setTimeout(()=>document.querySelector('#loading').classList.add('done'),100);},60);});
function toggleUI(){document.body.classList.toggle('ui-hidden');}document.querySelector('#hide-ui').onclick=toggleUI;document.querySelector('#restore-ui').onclick=toggleUI;window.addEventListener('keydown',e=>{if(e.code==='KeyH'&&!e.repeat)toggleUI();});
// Optional synthesized ambience: filtered wind and distant birds, no audio assets.
let audioContext, audioGain, birdTimer;
function bird(){if(!audioContext||audioContext.state!=='running')return;const t=audioContext.currentTime;for(let i=0;i<3;i++){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.setValueAtTime(2200+Math.random()*900,t+i*.17);o.frequency.exponentialRampToValueAtTime(3600+Math.random()*600,t+i*.17+.07);o.frequency.exponentialRampToValueAtTime(2300,t+i*.17+.14);g.gain.setValueAtTime(0,t+i*.17);g.gain.linearRampToValueAtTime(.035,t+i*.17+.02);g.gain.exponentialRampToValueAtTime(.001,t+i*.17+.15);o.connect(g);g.connect(audioGain);o.start(t+i*.17);o.stop(t+i*.17+.17);}}
document.querySelector('#sound').addEventListener('click',async()=>{const button=document.querySelector('#sound');if(!audioContext){audioContext=new AudioContext();audioGain=audioContext.createGain();audioGain.gain.value=.4;audioGain.connect(audioContext.destination);const buffer=audioContext.createBuffer(1,audioContext.sampleRate*4,audioContext.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*3;}const src=audioContext.createBufferSource();src.buffer=buffer;src.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;src.connect(filter);filter.connect(audioGain);src.start();}if(button.getAttribute('aria-pressed')==='true'){await audioContext.suspend();clearInterval(birdTimer);button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Увімкнути звуки лісу');}else{await audioContext.resume();bird();birdTimer=setInterval(bird,4800);button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Вимкнути звуки лісу');}});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);const size=renderer.getDrawingBufferSize(new THREE.Vector2());target.setSize(size.x,size.y);atmosphere.resize(size.x,size.y);postMat.uniforms.resolution.value.copy(size);}addEventListener('resize',resize);
let quality='auto', renderScale=1, perfTime=0, perfFrames=0, warmup=3;
const qualitySelect=document.querySelector('#quality');
function applyQuality(){const cap=quality==='high'?1.65:quality==='fast'?1:1.4;renderer.setPixelRatio(Math.min(devicePixelRatio,cap)*renderScale);resize();}
qualitySelect.addEventListener('change',()=>{quality=qualitySelect.value;renderScale=quality==='fast'?.85:1;warmup=3;perfTime=0;perfFrames=0;applyQuality();});
function updatePerformance(dt){
 if(document.hidden||dt>.5){perfTime=0;perfFrames=0;return;}
 if(warmup>0){warmup-=dt;return;}
 perfTime+=dt;perfFrames++;
 if(perfTime>=2){const fps=perfFrames/perfTime;document.querySelector('#fps').textContent=Math.round(fps)+' FPS';
 if(quality==='auto'&&!walker.locked){const old=renderScale;if(fps<42)renderScale=Math.max(.7,renderScale-.1);else if(fps>58)renderScale=Math.min(1,renderScale+.05);if(old!==renderScale)applyQuality();}
 perfTime=0;perfFrames=0;}
}
updateBiomeUI();setMood('morning');growForest();applyQuality();
let frames=0;const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=clock.getDelta();const elapsed=clock.elapsedTime;wind.value=reducedMotion?0:elapsed;postMat.uniforms.time.value=elapsed;if(walker.active){walker.update(dt);}else{controls.update();camera.position.y=Math.max(camera.position.y,terrain(camera.position.x,camera.position.z)+1.1);}trail.update(dt);gathering.update(dt);sky.update(reducedMotion?0:elapsed);renderer.setRenderTarget(target);renderer.render(scene,camera);if(warmGeometry){forest.traverse(o=>{if(o.isMesh)o.frustumCulled=true;});warmGeometry=false;}atmosphere.render();updatePerformance(dt);if(++frames===3){document.querySelector('#loading').classList.add('done');renderer.shadowMap.autoUpdate=false;}}
renderer.compileAsync(scene,camera).then(()=>{clock.start();animate();}).catch(()=>{clock.start();animate();});
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();const loading=document.querySelector('#loading');loading.classList.remove('done');loading.querySelector('p').textContent='Графічний контекст втрачено. Онови сторінку.';});
// Compact diagnostics for development and browser validation.
window.__silva={get biome(){return biome;},get seed(){return seed;},get mood(){return currentMood;},get frames(){return frames;},renderer,scene,camera,controls,walker,sky,gathering,trail};












