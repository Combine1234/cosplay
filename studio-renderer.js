import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {BODY_DEFAULTS} from './studio-domain.js';

const bell=(y,center,width)=>Math.exp(-(((y-center)/width)**2));
function disposeObject(object){object?.traverse(node=>{if(!node.isMesh)return;node.geometry.dispose();for(const material of [].concat(node.material)){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}});}
// Bake authored GLB hierarchy into meter-space geometry so deformation is independent of exporter transforms.
function bake(scene){const group=new THREE.Group();scene.updateMatrixWorld(true);scene.traverse(node=>{if(!node.isMesh)return;const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld),materials=[].concat(node.material).map(m=>{const copy=m.clone();copy.side=THREE.DoubleSide;return copy});const mesh=new THREE.Mesh(geometry,Array.isArray(node.material)?materials:materials[0]);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.rest=geometry.attributes.position.array.slice();group.add(mesh);});return group;}

export function createStudioRenderer(host,onStatus=()=>{}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#e9e5db');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','หุ่นสามมิติ ลากเพื่อหมุนรอบ 360 องศา ใช้ปุ่มมุมมองเพื่อหมุนด้วยแป้นพิมพ์');renderer.domElement.tabIndex=0;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,1,.05,30);camera.position.set(0,1.12,3.65);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.91,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=1.65;controls.maxDistance=5;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.68;
 scene.add(new THREE.HemisphereLight(0xffffff,0x827566,2.6));const key=new THREE.DirectionalLight(0xfff6e9,3.6);key.position.set(2.5,4,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-1.5,right:1.5,top:2.5,bottom:-1.5});scene.add(key);const rim=new THREE.DirectionalLight(0xffffff,2);rim.position.set(-2,2,-3);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(1.2,80),new THREE.MeshStandardMaterial({color:0xd7d3ca,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.008;floor.receiveShadow=true;scene.add(floor);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.62,.627,96),new THREE.MeshBasicMaterial({color:0xb4ada0,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.004;scene.add(ring);
 const loader=new GLTFLoader(),slots=new Map(),pending=new Map();let body=null,bodyUrl='',bodyTicket=0,disposed=false,modelState=null,frame;
 const status=new Map();const report=(key,value)=>{status.set(key,value);onStatus([...status.values()].filter(Boolean));};
 function resize(){if(disposed)return;const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function animate(){if(disposed)return;frame=requestAnimationFrame(animate);if(!host.isConnected)return;controls.update();renderer.render(scene,camera);}animate();
 function deformBody(){if(!body||!modelState)return;const current=modelState.body,base=BODY_DEFAULTS[modelState.style],height=base.height/100;
 body.traverse(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position,r=mesh.userData.rest;
   for(let i=0;i<a.count;i++){const x=r[i*3],y=r[i*3+1],z=r[i*3+2],t=y/height;
    const c=bell(t,.73,.065),w=bell(t,.60,.06),hip=bell(t,.51,.065),sum=Math.max(1,c+w+hip),torso=Math.exp(-((Math.abs(x)/(.27*height))**6));
    const girth=((current.chest/base.chest-1)*c+(current.waist/base.waist-1)*w+(current.hip/base.hip-1)*hip)/sum;
    const shoulder=(current.shoulder/base.shoulder-1)*bell(t,.79,.075);
    const wornTop=!!modelState.outfit.top&&t>.49&&t<.87,wornBottom=!!modelState.outfit.bottom&&t>.04&&t<.64;
    const underGarment=(wornTop||wornBottom) ? .74 : 1;
    a.setXYZ(i,x*(1+girth*torso*.65+shoulder)*underGarment,y*current.height/base.height,z*(1+girth*torso)*underGarment);
   }a.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  });
 }
 function fitItem(object,item,ref){const current=modelState.body,base=item.model.referenceBody||BODY_DEFAULTS.female,variant=item.sizeVariants.find(v=>v.id===ref.variantId),medium=item.sizeVariants.find(v=>v.size==='M')||item.sizeVariants[0],t=ref.transform;
  const accessory=!['top','bottom'].includes(item.attachmentSlot),anchor=item.model.anchor||[0,item.attachmentSlot==='top'?1.1:.9,0],ratio=current.height/base.height;
  const m=variant.measurements,baseline=medium.measurements,sx=accessory?1:(item.attachmentSlot==='top'?m.chest/baseline.chest:m.hip/baseline.hip),sy=accessory?1:m.length/baseline.length;
  const depth=accessory?1:1.14,clearance=accessory?1:1.035;
  object.traverse(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position,r=mesh.userData.rest;for(let i=0;i<a.count;i++)a.setXYZ(i,(r[i*3]-anchor[0])*sx*clearance,r[i*3+1]-anchor[1],(r[i*3+2]-anchor[2])*depth);a.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();});
  object.position.set(anchor[0]+t.x,anchor[1]*ratio+t.y,anchor[2]+t.z);object.scale.set(t.scale,sy*t.scale,t.scale);object.rotation.y=THREE.MathUtils.degToRad(t.rotation);
 }
 async function setBody(url){const ticket=++bodyTicket;bodyUrl=url;if(body){scene.remove(body);disposeObject(body);body=null;}if(!url){report('body','ไม่มีไฟล์หุ่นสามมิติ');return;}report('body','กำลังโหลดหุ่น 3D…');try{const gltf=await loader.loadAsync(url);if(disposed||ticket!==bodyTicket){disposeObject(gltf.scene);return;}body=bake(gltf.scene);scene.add(body);deformBody();report('body','');}catch{if(ticket===bodyTicket)report('body','โหลดหุ่นไม่สำเร็จ ตรวจสอบไฟล์ GLB หรือกดโหลดใหม่');}}
 async function setItem(slot,item,ref){const token={url:item.model.url};pending.set(slot,token);report(slot,`กำลังโหลด ${item.title}…`);try{const gltf=await loader.loadAsync(item.model.url);if(disposed||pending.get(slot)!==token){disposeObject(gltf.scene);return;}const object=bake(gltf.scene);slots.set(slot,{object,id:item.id,url:item.model.url});pending.delete(slot);scene.add(object);const latest=modelState.outfit[slot];if(latest?.listingId===item.id)fitItem(object,item,latest);report(slot,'');}catch{if(pending.get(slot)===token){pending.delete(slot);report(slot,`ไม่มีภาพ 3D ของ ${item.title} — ดูภาพถ่ายด้านขวา`);}}}
 function update(next){modelState=next;const url=next.bodies?.[next.style]?.url;if(url!==bodyUrl)setBody(url);else deformBody();
  for(const slot of new Set([...slots.keys(),...pending.keys(),...Object.keys(next.outfit)])){const ref=next.outfit[slot],item=next.listings.find(l=>l.id===ref?.listingId&&l.status!=='deleted'),previous=slots.get(slot);
   if(!item||previous?.id!==item.id){if(previous){scene.remove(previous.object);disposeObject(previous.object);slots.delete(slot);}if(!item){pending.delete(slot);report(slot,'');continue;}}
   if(previous?.id===item.id)fitItem(previous.object,item,ref);else if(pending.get(slot)?.url!==item.model.url)setItem(slot,item,ref);
  }
 }
 return {update,retry(){bodyUrl='';for(const {object}of slots.values()){scene.remove(object);disposeObject(object);}slots.clear();pending.clear();update(modelState);},view(angle=0){const radius=camera.position.distanceTo(controls.target);camera.position.set(Math.sin(angle)*radius,controls.target.y+.16,Math.cos(angle)*radius);controls.update();},zoom(delta){const offset=camera.position.clone().sub(controls.target).multiplyScalar(delta);offset.clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();},dispose(){disposed=true;bodyTicket++;pending.clear();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();disposeObject(scene);renderer.dispose();renderer.domElement.remove();}};
}
