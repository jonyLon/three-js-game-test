import * as THREE from 'three';
const labels={mushroom:'Гриби',stone:'Каміння',wood:'Гілки'};
const single={mushroom:'Гриб',stone:'Камінь',wood:'Гілка'};
const STORAGE='silva-gathering-v1';
export class Gathering {
 constructor(scene,camera,walker,renderer){
  Object.assign(this,{camera,walker,renderer});this.nodes=[];this.target=null;this.world='';this.look=new THREE.Vector3();this.scanTime=0;this.lastPrompt='';this.counts={mushroom:0,stone:0,wood:0};this.collected=new Set();
  try{const data=JSON.parse(localStorage.getItem(STORAGE));if(data){for(const type of Object.keys(labels))this.counts[type]=Number.isSafeInteger(data.counts?.[type])&&data.counts[type]>=0?data.counts[type]:0;this.collected=new Set(Array.isArray(data.collected)?data.collected.filter(k=>typeof k==='string'):[]);}}catch{}
  this.panel=document.querySelector('#inventory');this.prompt=document.querySelector('#gather-prompt');this.toast=document.querySelector('#gather-toast');
  const ringGeo=new THREE.RingGeometry(.22,.26,40);ringGeo.rotateX(-Math.PI/2);
  this.ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:'#e9dfa2',transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));this.ring.visible=false;scene.add(this.ring);
  document.addEventListener('keydown',e=>{if(!walker.active||walker.traveling||e.repeat||e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;if(e.code==='KeyI'){e.preventDefault();this.panel.hidden=!this.panel.hidden;}if(e.code==='KeyE'&&walker.locked){e.preventDefault();this.update();this.collect();}});
  this.renderInventory();
 }
 beginWorld(biome,seed){this.nodes=[];this.target=null;this.ring.visible=false;this.world=biome+':'+seed;this.prompt.hidden=true;}
 register(type,index,position,parts){
  const node={type,id:this.world+':'+type+':'+index,position:position.clone(),parts,taken:false};this.nodes.push(node);
  if(this.collected.has(node.id)){node.taken=true;this.hideNode(node);}
 }
 hideNode(node){const matrix=new THREE.Matrix4().makeScale(0,0,0);for(const part of node.parts){part.mesh.setMatrixAt(part.index,matrix);part.mesh.instanceMatrix.needsUpdate=true;}this.renderer.shadowMap.needsUpdate=true;}
 renderInventory(){for(const type of Object.keys(labels))document.querySelector('[data-resource="'+type+'"]').textContent=this.counts[type];}
 reachable(node){
  const a=this.camera.position,b=node.position,dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
  if(len2>2.5*2.5||Math.abs(a.y-b.y)>2.8)return false;
  // Reject resources on the other side of solid trunks and large rocks.
  for(const c of this.walker.colliders){const t=THREE.MathUtils.clamp(((c.x-a.x)*dx+(c.z-a.z)*dz)/(len2||1),0,1);if(t>.05&&t<.95&&Math.hypot(a.x+dx*t-c.x,a.z+dz*t-c.z)<c.radius)return false;}
  const look=this.look;this.camera.getWorldDirection(look);look.y=0;look.normalize();return len2<.36||(dx*look.x+dz*look.z)/Math.sqrt(len2)>.35;
 }
 update(dt=1){
  this.scanTime+=dt;if(this.walker.locked&&this.scanTime<.075)return;this.scanTime=0;
  this.target=null;
  if(this.walker.active&&this.walker.locked&&!this.walker.traveling){let closest=Infinity;for(const node of this.nodes){if(node.taken)continue;const distance=node.position.distanceToSquared(this.camera.position);if(distance<closest&&this.reachable(node)){closest=distance;this.target=node;}}}
  this.ring.visible=Boolean(this.target);this.prompt.hidden=!this.target;
  if(this.target){this.ring.position.copy(this.target.position);this.ring.position.y+=.04;const text='E — зібрати: '+single[this.target.type];if(text!==this.lastPrompt){this.prompt.textContent=text;this.lastPrompt=text;}}
 }
 collect(){
  const node=this.target;if(!node||node.taken||!this.walker.locked||!this.reachable(node))return false;
  node.taken=true;this.collected.add(node.id);this.counts[node.type]++;this.hideNode(node);this.renderInventory();
  try{localStorage.setItem(STORAGE,JSON.stringify({counts:this.counts,collected:[...this.collected]}));}catch{}
  this.toast.textContent='+1 · '+single[node.type];this.toast.classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.classList.remove('visible'),1600);this.update();return true;
 }
}



