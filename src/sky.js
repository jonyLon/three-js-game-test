import * as THREE from 'three';

const palettes={
 morning:{zenith:'#368bce',horizon:'#c3e0f4',cloud:'#ffffff',shade:'#a0b8cc',coverage:.32,stars:0,sun:[-16,27,-25]},
 mist:{zenith:'#81999f',horizon:'#c1ceca',cloud:'#dae1da',shade:'#7b9292',coverage:.78,stars:0,sun:[-16,27,-25]},
 dusk:{zenith:'#172443',horizon:'#e99873',cloud:'#de927f',shade:'#4f4967',coverage:.43,stars:.75,sun:[-25,7,-30]}
};
export function createSky(scene,camera,sun){
 const uniforms={zenith:{value:new THREE.Color()},horizon:{value:new THREE.Color()},cloudColor:{value:new THREE.Color()},cloudShade:{value:new THREE.Color()},coverage:{value:.5},stars:{value:0},sunDirection:{value:new THREE.Vector3()},sunTint:{value:new THREE.Color()},time:{value:0}};
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:true,uniforms,vertexShader:`varying vec3 vDirection;void main(){vDirection=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,fragmentShader:`
 varying vec3 vDirection;uniform vec3 zenith,horizon,cloudColor,cloudShade,sunDirection,sunTint;uniform float coverage,stars,time;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){float n=0.,a=.55;for(int i=0;i<4;i++){n+=noise(p)*a;p=mat2(1.6,-1.2,1.2,1.6)*p+17.3;a*=.47;}return n;}
 void main(){vec3 d=normalize(vDirection);float elevation=max(d.y,0.);float gradient=pow(smoothstep(-.08,.9,d.y),.55);vec3 sky=mix(horizon,zenith,gradient);
 float facing=max(dot(d,sunDirection),0.);float glow=pow(facing,12.)*.35+pow(facing,90.)*.5;sky+=sunTint*glow;
 float disc=smoothstep(cos(.009),cos(.006),dot(d,sunDirection));sky+=sunTint*disc*5.;
 vec2 uv=d.xz/(max(d.y,.08)+.17)*1.4+vec2(time*.007,time*.002);
 float n=fbm(uv);float clouds=smoothstep(1.-coverage-.13,1.-coverage+.15,n);clouds*=smoothstep(-.015,.12,d.y);
 float detail=fbm(uv*2.1+5.);vec3 cloud=mix(cloudShade,cloudColor,smoothstep(.2,.75,detail+facing*.2));cloud+=sunTint*pow(facing,18.)*(1.-clouds)*.6;
 sky=mix(sky,cloud,clouds*.92);
 vec2 starUv=vec2(atan(d.x,d.z)*.15915494+.5,asin(clamp(d.y,-1.,1.))*.31830989+.5)*vec2(1100.,550.);vec2 cell=floor(starUv);float chance=hash(cell);vec2 offset=vec2(hash(cell+31.),hash(cell+89.));float star=1.-smoothstep(.02,.2,length(fract(starUv)-offset));star*=step(.997,chance)*stars*smoothstep(.12,.65,d.y)*(1.-clouds);sky+=vec3(.8,.87,1.)*star*1.6;
 gl_FragColor=vec4(max(sky,vec3(0.)),1.);
 }`});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(100,32,16),material);dome.frustumCulled=false;dome.renderOrder=1000;dome.name='Procedural sky';scene.add(dome);
 return {
 setMood(name){const p=palettes[name];uniforms.zenith.value.set(p.zenith);uniforms.horizon.value.set(p.horizon);uniforms.cloudColor.value.set(p.cloud);uniforms.cloudShade.value.set(p.shade);uniforms.coverage.value=p.coverage;uniforms.stars.value=p.stars;sun.position.set(...p.sun);uniforms.sunDirection.value.copy(sun.position).sub(sun.target.position).normalize();uniforms.sunTint.value.copy(sun.color);scene.background=null;},
 update(t){dome.position.copy(camera.position);uniforms.time.value=t;},
 uniforms
 };
}
