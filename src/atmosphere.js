import * as THREE from 'three';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// Expensive light integration at half resolution; depth-aware upsampling keeps
// foreground trunks from leaking bright background light. FXAA stays full size.
export function optimizeAtmosphere(renderer, postMat, postScene, postCamera, camera, sun) {
 const lightTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
 const colorTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});
 const lightMat=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:postMat.uniforms,vertexShader:postMat.vertexShader,fragmentShader:`
 #include <packing>
 varying vec2 vUv;uniform sampler2D tDepth,tShadow;uniform mat4 inverseProjection,cameraWorld,shadowMatrix;uniform vec3 cameraPositionWorld;uniform float density;
 float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){float d=texture2D(tDepth,vUv).x;vec4 v=inverseProjection*vec4(vUv*2.-1.,d*2.-1.,1.);v/=v.w;vec3 ray=(cameraWorld*v).xyz-cameraPositionWorld;float dist=min(length(ray),85.);vec3 dir=normalize(ray);float stepSize=dist/24.;float sum=0.;float jitter=hash(gl_FragCoord.xy);
 for(int i=0;i<24;i++){float t=(float(i)+jitter)*stepSize;vec3 p=cameraPositionWorld+dir*t;vec4 sc=shadowMatrix*vec4(p,1.);vec3 uv=sc.xyz/sc.w;float lit=1.;if(uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.&&uv.z<1.)lit=step(uv.z-.0003,unpackRGBAToDepth(texture2D(tShadow,uv.xy)));sum+=lit*exp(-t*density)*stepSize*density*exp(-max(p.y,0.)*.055);}
 gl_FragColor=vec4(sum,dist/85.,0.,1.);}`});
 const lightScene=new THREE.Scene();lightScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),lightMat));
 postMat.uniforms.tLight={value:lightTarget.texture};postMat.uniforms.lightSize={value:new THREE.Vector2(1,1)};
 postMat.fragmentShader=postMat.fragmentShader.replace('varying vec2 vUv;','uniform sampler2D tLight;uniform vec2 lightSize;varying vec2 vUv;');
 const from=postMat.fragmentShader.indexOf('float accum=0.');
 const to=postMat.fragmentShader.indexOf('float facing=',from);
 postMat.fragmentShader=postMat.fragmentShader.slice(0,from)+`
 float accum=0.;float total=0.;vec2 pixel=vUv*lightSize-.5;vec2 base=floor(pixel);vec2 f=fract(pixel);
 for(int y=0;y<2;y++){for(int x=0;x<2;x++){vec2 off=vec2(float(x),float(y));vec2 uv=(base+off+.5)/lightSize;vec2 sampleLight=texture2D(tLight,uv).rg;vec2 bw=mix(1.-f,f,off);float weight=bw.x*bw.y*exp(-abs(sampleLight.g*85.-dist)*1.5)+.00001;accum+=sampleLight.r*weight;total+=weight;}}
 accum/=total;
 `+postMat.fragmentShader.slice(to);
 const fxaa=new THREE.ShaderMaterial({uniforms:THREE.UniformsUtils.clone(FXAAShader.uniforms),vertexShader:FXAAShader.vertexShader,fragmentShader:FXAAShader.fragmentShader,depthTest:false,depthWrite:false});
 fxaa.uniforms.tDiffuse.value=colorTarget.texture;
 const finalScene=new THREE.Scene();finalScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),fxaa));
 return {
 resize(w,h){const lw=Math.max(1,Math.round(w*.5)),lh=Math.max(1,Math.round(h*.5));lightTarget.setSize(lw,lh);colorTarget.setSize(w,h);postMat.uniforms.lightSize.value.set(lw,lh);fxaa.uniforms.resolution.value.set(1/w,1/h);},
 render(){postMat.uniforms.tShadow.value=sun.shadow.map.texture;renderer.setRenderTarget(lightTarget);renderer.render(lightScene,postCamera);renderer.setRenderTarget(colorTarget);renderer.render(postScene,postCamera);renderer.setRenderTarget(null);renderer.render(finalScene,postCamera);}
 };
}
