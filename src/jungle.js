import * as THREE from 'three';
function leafGeometry(segments=10){const p=[],c=[],uv=[],ix=[];for(let i=0;i<=segments;i++){const t=i/segments,w=Math.pow(Math.sin(t*Math.PI),.8)*.34;for(let j=0;j<3;j++){p.push((j-1)*w,t*1.8,Math.sin(t*Math.PI)*.26-Math.abs(j-1)*w*.26);uv.push(j/2,t);const col=new THREE.Color(j===1?'#b5d478':'#779f58');c.push(col.r,col.g,col.b);}}for(let i=0;i<segments;i++)for(let j=0;j<2;j++){const a=i*3+j;ix.push(a,a+1,a+3,a+1,a+4,a+3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
function palmGeometry(){const p=[];const tri=(a,b,c)=>p.push(...a,...b,...c);const point=(t,s=0)=>[s,t*.8-t*t*1.4,t*3.8-Math.abs(s)*.25];for(let i=0;i<24;i++){const t=i/24,w=Math.sin((t*.88+.08)*Math.PI)*.82;tri(point(t,-.016),point(t,.016),point(t+1/24));for(const side of [-1,1]){tri(point(t),point(t+.045,side*w),point(t+.065,side*w*.15));tri(point(t+.065,side*w*.15),point(t+.045,side*w),point(t+.09,side*w*.77));}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;}
function leafTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');
 const gradient=ctx.createLinearGradient(0,0,512,0);gradient.addColorStop(0,'#879879');gradient.addColorStop(.5,'#c4d5ad');gradient.addColorStop(1,'#95a883');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
 ctx.strokeStyle='#c8d7b2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(256,0);ctx.lineTo(256,512);ctx.stroke();
 for(let y=30;y<500;y+=25){for(const side of [-1,1]){ctx.strokeStyle='#adc397';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(256,y);ctx.quadraticCurveTo(256+side*80,y-10,256+side*245,y-70);ctx.stroke();}}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
export function createJungleGenerator(windy,barkMat){
 const veinTexture=leafTexture();
 const leafMat=windy(new THREE.MeshStandardMaterial({color:0xffffff,map:veinTexture,bumpMap:veinTexture,bumpScale:.035,vertexColors:true,roughness:.63,side:THREE.DoubleSide}),.045);
 const canopyMat=windy(new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.7,side:THREE.DoubleSide}),.045);
 const palmMat=windy(new THREE.MeshStandardMaterial({color:'#71a653',roughness:.66,side:THREE.DoubleSide}),.045);
 const vineMat=new THREE.MeshStandardMaterial({color:'#506339',roughness:.95});
 const flowerMat=new THREE.MeshStandardMaterial({color:'#e47a37',roughness:.65});
 return function growJungle({trees,range,terrain,pathDistance,branch,merged,instance,mesh,colliders}){
  const vines=[],wood=[],canopy=[],canopyColors=[],palms=[],palmColors=[],understory=[],underColors=[],flowers=[];
  const addLeaf=(list,colors,p,s,rx,ry,rz=0)=>{list.push({p,s:new THREE.Vector3(s,s,s),rx,ry,rz});colors.push(new THREE.Color().setHSL(range(.25,.34),range(.38,.64),range(.27,.48)));};
  for(const tree of trees){
   const {x,z}=tree,y=terrain(x,z),h=tree.h*.73,r=tree.r*1.25;colliders.push({x,z,radius:r*1.6});
   const base=new THREE.Vector3(x,y,z),top=new THREE.Vector3(x+range(-.7,.7),y+h,z+range(-.7,.7));branch(base,top,r,r*.36,wood,10);
   for(let k=0;k<6;k++){const a=k*Math.PI/3;branch(new THREE.Vector3(x,y+1.4,z),new THREE.Vector3(x+Math.cos(a)*r*3.7,y+.04,z+Math.sin(a)*r*3.7),r*.38,.06,wood,5);}
   for(let b=0;b<6;b++){
    const angle=b*2.399+range(-.3,.3),length=range(2.3,4.8);const tip=new THREE.Vector3(top.x+Math.cos(angle)*length,top.y+range(-1.3,2),top.z+Math.sin(angle)*length);branch(new THREE.Vector3(x,y+h*.67,z),tip,r*.32,.055,wood,6);
    for(let k=0;k<95;k++){const a=range(0,Math.PI*2),rad=Math.sqrt(range(0,1))*2.6;addLeaf(canopy,canopyColors,new THREE.Vector3(tip.x+Math.cos(a)*rad,tip.y+range(-.5,.7),tip.z+Math.sin(a)*rad),range(.65,1.3),range(.75,1.8),range(0,6.28),range(-.4,.4));}
    if(b<2&&Math.abs(x)<28){const points=[],drop=range(3,8);for(let k=0;k<=12;k++){const t=k/12;points.push(new THREE.Vector3(tip.x+Math.sin(t*5+b)*.3,tip.y-t*drop,tip.z+Math.sin(t*4)*.25));}vines.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.028,4,false));for(let k=1;k<9;k++)addLeaf(canopy,canopyColors,points[k].clone(),range(.14,.27),range(.5,2),range(0,6.28));}
   }
  }
  for(let i=0;i<48;i++){const x=range(-31,31),z=range(-38,24);if(pathDistance(x,z)<3.2)continue;const y=terrain(x,z),h=range(4.8,10),lean=range(-.8,.8),crown=new THREE.Vector3(x+lean,y+h,z);branch(new THREE.Vector3(x,y,z),crown,.17,.1,wood,7);colliders.push({x,z,radius:.24});for(let f=0;f<11;f++){const s=range(.75,1.2);palms.push({p:crown.clone(),ry:f*6.28/11,rx:range(-.22,.25),s:new THREE.Vector3(s,s,s)});palmColors.push(new THREE.Color().setHSL(range(.24,.3),.45,range(.4,.65)));}}
  for(let i=0;i<620;i++){const x=range(-32,32),z=range(-40,28);if(pathDistance(x,z)<2.35)continue;const y=terrain(x,z),size=range(.55,1.45);for(let k=0;k<7;k++)addLeaf(understory,underColors,new THREE.Vector3(x,y+.06,z),size*range(.7,1.15),range(.45,1.2),k*6.28/7,range(-.15,.15));if(i%7===0)for(let k=0;k<4;k++)flowers.push({p:new THREE.Vector3(x+Math.sin(k)*.13,y+.7+k*.14,z),rz:(k%2?1:-1)*.85,ry:k*2.4,s:new THREE.Vector3(.12,.38,.1)});}
  const vineMesh=merged(vines,vineMat);if(vineMesh)vineMesh.castShadow=false;merged(wood,barkMat);instance(leafGeometry(4),canopyMat,canopy,canopyColors);instance(leafGeometry(),leafMat,understory,underColors);instance(palmGeometry(),palmMat,palms,palmColors);instance(new THREE.ConeGeometry(1,1,5),flowerMat,flowers,null,false);
 };
}



