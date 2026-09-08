import * as THREE from 'three';
import {createNoise2D} from 'simplex-noise';
import FastNoiseLite from 'fastnoise-lite';
import Terrain,{TerrainNS,createSeededRandom} from 'three.terrain.js';
import {generateSkeleton} from './vendor/seedthree/weber-penn.js';
import {Rng} from './vendor/seedthree/rng.js';
let height=()=>0, TreeClass;
export async function load(id){if(id==='ez')TreeClass=(await import('@dgreenheck/ez-tree')).Tree;}
export function prepare(id,seed){
 const n=createNoise2D(createSeededRandom(seed));
 height=(x,z)=>n(x*.025,z*.025)*1.8+n(x*.1,z*.1)*.18;
 if(id==='terrain'){
  const generated=Terrain({xSize:130,ySize:130,xSegments:128,ySegments:128,minHeight:-2,maxHeight:9,frequency:2,heightmap:TerrainNS.PerlinDiamond,random:createSeededRandom(seed)});
  const mesh=generated.children[0],p=mesh.geometry.attributes.position,values=Float32Array.from({length:p.count},(_,i)=>p.getZ(i));mesh.geometry.dispose();mesh.material.dispose();
  height=(x,z)=>{const u=THREE.MathUtils.clamp((x+65)/130*128,0,127.999),v=THREE.MathUtils.clamp((z+65)/130*128,0,127.999),a=Math.floor(u),b=Math.floor(v),f=u-a,g=v-b;return THREE.MathUtils.lerp(THREE.MathUtils.lerp(values[b*129+a],values[b*129+a+1],f),THREE.MathUtils.lerp(values[(b+1)*129+a],values[(b+1)*129+a+1],f),g);};
 }
 if(id==='fastnoise'){const f=new FastNoiseLite(seed);f.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2);f.SetFractalType(FastNoiseLite.FractalType.Ridged);f.SetFractalOctaves(3);f.SetFrequency(.022);height=(x,z)=>f.GetNoise(x,z)*4;}
}
export function sample(x,z){return height(x,z);}
export function populate(id,{trees,terrain,range,branch,merged,mesh,colliders,barkMat}){
 if(id!=='ez'&&id!=='seedthree')return false;
 if(id==='ez'){
  // Three variants share geometry/materials across all copies; no per-tree generation during movement.
  for(let variant=0;variant<3;variant++){
   const tree=new TreeClass();tree.loadPreset(['Oak Small','Ash Medium','Aspen Small'][variant]);tree.options.seed=Math.floor(range(1,100000));tree.generate();
   for(let i=variant;i<Math.min(trees.length,39);i+=3){const t=trees[i],scale=range(.85,1.25);for(const source of [tree.branchesMesh,tree.leavesMesh]){const m=mesh(source.geometry,source.material);m.position.set(t.x,terrain(t.x,t.z),t.z);m.scale.setScalar(scale);m.rotation.y=i*2.4;m.userData.experimentalMaterial=true;}colliders.push({x:t.x,z:t.z,radius:.65*scale});}
  }
 }else{
  const wood=[],leaves=[];const leafGeo=new THREE.IcosahedronGeometry(1,0);
  const leafMat=new THREE.MeshStandardMaterial({color:'#638941',roughness:.9});
  for(const t of trees.slice(0,24)){
   const skeleton=generateSkeleton({scale:10,scaleV:2,levels:3,branches:[1,14,7,0],curveRes:[8,5,3,2]},new Rng(Math.floor(range(1,100000))));const offset=new THREE.Vector3(t.x,terrain(t.x,t.z),t.z);
   for(const s of skeleton.stems)for(let j=1;j<s.points.length;j++)branch(s.points[j-1].clone().add(offset),s.points[j].clone().add(offset),Math.max(.008,s.radii[j-1]),Math.max(.004,s.radii[j]),wood,5);
   for(const tip of skeleton.tips)for(let k=0;k<9;k++){const g=leafGeo.clone();g.scale(range(.12,.22),.025,range(.24,.4));g.rotateZ(range(-.8,.8));g.rotateY(range(0,Math.PI*2));const pos=tip.position.clone().add(offset).add(new THREE.Vector3(range(-.6,.6),range(-.25,.25),range(-.6,.6)));g.translate(pos.x,pos.y,pos.z);leaves.push(g);}
   colliders.push({x:t.x,z:t.z,radius:.6});
  }
  leafGeo.dispose();merged(wood,barkMat);const m=merged(leaves,leafMat);if(m)m.userData.experimentalMaterial=true;
 }
 return true;
}
