import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {BODY_DEFAULTS} from './studio-domain.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};

// Clip at the neckline, hem and cuffs instead of dropping whole triangles.
// This preserves the mannequin's connected shoulder/arm and crotch topology.
function clip(polygon,distance){
 const result=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);
  if(da>=0)result.push(a);
  if((da>=0)!==(db>=0)){
   const t=da/(da-db);result.push(a.map((v,k)=>v+(b[k]-v)*t));
  }
 }
 return result;
}

export function tailoredGeometry(body,item,variant,current,style='female'){
 const top=item.attachmentSlot==='top',corset=top&&item.theme==='gothic';
 const middle=item.sizeVariants.find(v=>v.size==='M')||item.sizeVariants[0];
 const size=variant.measurements[top?'chest':'hip']/middle.measurements[top?'chest':'hip'];
 const length=variant.measurements.length/middle.measurements.length;
 const height=current.height/170;
 const hem=top?.93+(1-length)*.45:.08+(1-length)*.9;
 const lower=v=>v[7]-(top&&!corset?hem-(hem-.85)*smooth(.18,.28,Math.abs(v[6])):hem);
 const upper=v=>(top?(corset?1.325:1.445):1.065)-v[7];
 const sides=v=>top?(corset?(style==='male'?.205:.18)-Math.abs(v[6]):1):.23-Math.abs(v[6]);
 const positions=[],normals=[],uvs=[];
 const clearance=(top?(corset?.010:.022):.016)+clamp(size-1,-.1,.2)*.025;
 const smoothNormals=new Map();
 const vertexKey=(x,y,z)=>`${Math.round(x*1e5)},${Math.round(y*1e5)},${Math.round(z*1e5)}`;
 body.traverse(mesh=>{
  if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  for(let i=0;i<a.count;i++){
   const x=a.getX(i),y=a.getY(i),z=a.getZ(i),key=vertexKey(x,y,z),sum=smoothNormals.get(key)||new THREE.Vector3();
   sum.add(new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)));smoothNormals.set(key,sum);
  }
 });
 for(const n of smoothNormals.values())n.normalize();
 function emit(v){
  const [x,y,z,nx,ny,nz]=v,yn=y/height;
  // Offset in the surface normal, not the global depth axis. Skin stays
  // enclosed at side views and sleeves keep their anatomical orientation.
  const sleeveEase=top&&item.theme==='fantasy'?.018*smooth(.16,.24,Math.abs(v[6]))*Math.sin(Math.PI*clamp((v[7]-.85)/.55,0,1)):0;
  let px=x+nx*(clearance+sleeveEase),py=y+ny*clearance,pz=z+nz*(clearance+sleeveEase);
  if(top&&Math.abs(x)<.18&&yn<1.34){
   // Bridge the bust/abdomen gently, so fabric does not trace skin creases.
   const centerWeight=1-smooth(.07,.18,Math.abs(x));
   const chest=smooth(1.02,1.15,yn)*(1-smooth(1.27,1.36,yn));
   if(nz>.2)pz=Math.max(pz,z+(corset?.010:.018)*centerWeight*chest);
  }
  if(!top){const ease=(item.theme==='gothic'?.004:.012)*(1-smooth(.55,.80,yn));px+=nx*ease;pz+=nz*ease;}
  positions.push(px,py,pz);normals.push(nx,ny,nz);uvs.push(v[6],v[7]);
 }
 body.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry,a=geometry.attributes.position,index=geometry.index,rest=mesh.userData.rest||a.array;
  for(let i=0;i<(index?.count??a.count);i+=3){
   let poly=[0,1,2].map(k=>{const j=index?index.getX(i+k):i+k,x=a.getX(j),y=a.getY(j),z=a.getZ(j),normal=smoothNormals.get(vertexKey(x,y,z));return[x,y,z,normal.x,normal.y,normal.z,rest[j*3],rest[j*3+1]*170/BODY_DEFAULTS[style].height];});
   poly=clip(poly,lower);poly=clip(poly,upper);poly=clip(poly,sides);
   for(let k=1;k<poly.length-1;k++){emit(poly[0]);emit(poly[k]);emit(poly[k+1]);}
  }
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.deleteAttribute('normal');
 const welded=mergeVertices(geometry,1e-5);geometry.dispose();welded.computeVertexNormals();
 welded.computeBoundingBox();welded.computeBoundingSphere();
 return welded;
}

function fabric(item){
 const top=item.attachmentSlot==='top',academy=top&&item.theme==='academy';
 const color=top?(academy?0x182336:item.theme==='gothic'?0xd7c39f:0xe5dfcd):({academy:0x786044,fantasy:0x424932,gothic:0x24262b}[item.theme]);
 const material=new THREE.MeshStandardMaterial({color,roughness:.86,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 clothPosition;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nclothPosition=vec3(uv.x,uv.y,position.z);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 clothPosition;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float x=abs(clothPosition.x), y=clothPosition.y;
   float weave=sin(clothPosition.x*1800.0)*sin(y*1800.0)*0.018;
   diffuseColor.rgb*=1.0+weave;
   ${academy?`if(clothPosition.z>0.055){
    float opening=mix(0.027,0.083,smoothstep(1.06,1.40,y));
    if(x<opening)diffuseColor.rgb=vec3(0.79,0.76,0.67)*(1.0+weave);
    else if(x<opening+0.024&&y>1.12)diffuseColor.rgb*=1.32;
    if(y>1.015&&y<1.02&&x>0.08&&x<0.135)diffuseColor.rgb*=0.5;
   }`:top&&item.theme==='gothic'?`if(clothPosition.z>0.04){float seam=abs(fract(clothPosition.x*22.0+0.5)-0.5);if(seam<0.018)diffuseColor.rgb*=0.83;}`:!top?`if(abs(clothPosition.x)<0.006&&y>0.90&&clothPosition.z>0.08)diffuseColor.rgb*=0.72; if(y>1.04)diffuseColor.rgb*=0.90;`:''}
  `);
 };
 material.customProgramCacheKey=()=>`tailored-${item.attachmentSlot}-${item.theme}`;
 return material;
}

export function createTailoredGarment(body,item,variant,current,style='female'){
 const group=new THREE.Group(),mesh=new THREE.Mesh(tailoredGeometry(body,item,variant,current,style),fabric(item));
 mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 if(item.attachmentSlot==='top'&&item.theme==='academy'){
  const ray=new THREE.Raycaster(),gold=new THREE.MeshStandardMaterial({color:0xbfa267,metalness:.65,roughness:.35});
  for(const y of [1.06,1.14,1.22]){
   const height=y*current.height/170;
   ray.set(new THREE.Vector3(.015,height,1),new THREE.Vector3(0,0,-1));
   const hit=ray.intersectObject(mesh)[0];if(!hit)continue;
   const button=new THREE.Mesh(new THREE.SphereGeometry(.0045,12,8),gold);
   button.position.copy(hit.point);button.position.z+=.003;button.scale.z=.45;group.add(button);
  }
 }
 return group;
}
