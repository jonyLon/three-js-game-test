import * as THREE from 'three';
const names={jungle:'ДЖУНГЛІ',forest:'ХВОЙНИЙ ЛІС',ez:'ДУБОВИЙ ГАЙ',terrain:'ГІРСЬКА ДОЛИНА',simplex:'ХВИЛЯСТІ ЛУКИ',fastnoise:'СКЕЛЯСТІ ПАГОРБИ',seedthree:'ГІЛЛЯСТИЙ САД'};
const route=Object.keys(names);
function destination(biome,north){return route[(route.indexOf(biome)+(north?1:route.length-1))%route.length];}
export class TrailTravel {
 constructor(scene,camera,walker,{height,pathX,getBiome,isBusy,changeBiome}){
  Object.assign(this,{camera,walker,height,pathX,getBiome,isBusy,changeBiome});this.busy=false;this.cooldown=0;
  this.overlay=document.querySelector('#trail-transition');this.hint=document.querySelector('#trail-hint');this.signs=[];
  const wood=new THREE.MeshStandardMaterial({color:'#5b4530',roughness:1});
  for(const z of [-37,21]){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const group=new THREE.Group();const post=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,1.8,6),wood);post.position.y=.9;post.castShadow=true;group.add(post);
   const board=new THREE.Mesh(new THREE.BoxGeometry(2,.62,.08),wood);board.position.y=1.55;board.castShadow=true;group.add(board);
   const labelMat=new THREE.MeshBasicMaterial({map:texture});
   for(const side of [-1,1]){const face=new THREE.Mesh(new THREE.PlaneGeometry(1.94,.57),labelMat);face.position.set(0,1.55,side*.045);face.rotation.y=side===1?0:Math.PI;group.add(face);}
   scene.add(group);this.signs.push({group,canvas,texture,z});
  }
 }
 updateSigns(biome){for(const sign of this.signs){const x=this.pathX(sign.z)-2.5;sign.group.position.set(x,this.height(x,sign.z),sign.z);const ctx=sign.canvas.getContext('2d');ctx.fillStyle='#443c29';ctx.fillRect(0,0,512,160);ctx.strokeStyle='#b9bb87';ctx.lineWidth=2;ctx.strokeRect(8,8,496,144);ctx.fillStyle='#ece5bd';ctx.textAlign='center';ctx.font='bold 33px sans-serif';ctx.fillText(names[destination(biome,sign.z<0)],256,67);ctx.font='23px sans-serif';ctx.fillText('ДАЛІ СТЕЖКОЮ  ↑',256,116);sign.texture.needsUpdate=true;}}
 update(dt){
  this.cooldown=Math.max(0,this.cooldown-dt);
  if(!this.walker.active||!this.walker.locked||this.busy||this.isBusy()){this.hint.hidden=true;return;}
  const {x,z}=this.camera.position,onPath=Math.abs(x-this.pathX(z))<2.4;
  const near=onPath&&(z<-32||z>21.5);
  this.hint.hidden=!near;
  if(near){const text='Стежка веде у '+names[destination(this.getBiome(),z<0)].toLowerCase()+' · продовжуй іти';if(this.hint.textContent!==text)this.hint.textContent=text;}
  if(onPath&&this.cooldown===0&&(z<-40.5||z>24.5))void this.cross(z<0);
 }
 async cross(north){
  this.busy=true;this.walker.traveling=true;this.hint.hidden=true;const next=destination(this.getBiome(),north);
  this.overlay.querySelector('span').textContent=names[next];this.overlay.classList.add('visible');
  try{
   await new Promise(r=>setTimeout(r,280));
   await this.changeBiome(next,north?21:-37);
  }catch(error){console.error('Trail transition failed',error);this.overlay.querySelector('span').textContent='Не вдалося перейти. Спробуй ще раз.';}
  finally{this.cooldown=3;this.walker.traveling=false;this.busy=false;this.overlay.classList.remove('visible');}
 }
}
