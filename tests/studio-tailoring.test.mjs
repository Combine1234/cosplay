import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {tailoredGeometry} from '../studio-tailoring.js';
import {BODY_DEFAULTS} from '../studio-domain.js';
import {bodyPoint} from '../studio-fitting.js';

const catalog=JSON.parse(readFileSync(new URL('../studio-catalog.json',import.meta.url)));
async function fixture(style,current=BODY_DEFAULTS[style]){
 const file=readFileSync(new URL(`../studio-assets/models/body-${style}.glb`,import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
 const body=new THREE.Group();gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(node=>{
  if(!node.isMesh)return;
  const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld),mesh=new THREE.Mesh(geometry);
  mesh.userData.rest=geometry.attributes.position.array.slice();const a=geometry.attributes.position,r=mesh.userData.rest;
  for(let i=0;i<a.count;i++)a.setXYZ(i,...bodyPoint(r[i*3],r[i*3+1],r[i*3+2],current,style));
  geometry.computeVertexNormals();body.add(mesh);
 });return body;
}
for(const style of ['female','male'])test(`${style}: all six garments build from the real mannequin, with finite normals and no hands in trousers`,async()=>{
 const body=await fixture(style),before=JSON.stringify(catalog);
 for(const item of catalog.items.filter(i=>['top','bottom'].includes(i.attachmentSlot))){
  const geometry=tailoredGeometry(body,item,item.sizeVariants[1],BODY_DEFAULTS[style],style);
  const a=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
  assert.ok(a.count>1000,item.id);
  assert.ok(a.array.every(Number.isFinite));assert.ok(n.array.every(Number.isFinite));
  for(let i=0;i<uv.count;i++)if(item.attachmentSlot==='bottom')assert.ok(Math.abs(uv.getX(i))<=.23001,'trousers must not include hands');
  geometry.dispose();
 }
 assert.equal(JSON.stringify(catalog),before);
});
test('size changes preserve the connected neckline and hem while increasing garment ease',async()=>{
 const body=await fixture('female'),item=catalog.items[0];
 const a=tailoredGeometry(body,item,item.sizeVariants[0],BODY_DEFAULTS.female),b=tailoredGeometry(body,item,item.sizeVariants[2],BODY_DEFAULTS.female);
 const range=g=>{const uv=g.attributes.uv,ys=[];for(let i=0;i<uv.count;i++)if(Math.abs(uv.getX(i))<.1)ys.push(uv.getY(i));return[Math.min(...ys),Math.max(...ys)];};
 const small=range(a),large=range(b);assert.ok(Math.abs(small[0]-large[0])<1e-5);assert.ok(Math.abs(small[1]-large[1])<1e-5);
 a.computeBoundingBox();b.computeBoundingBox();assert.ok(b.boundingBox.getSize(new THREE.Vector3()).x>a.boundingBox.getSize(new THREE.Vector3()).x);
});
test('anatomical garment boundaries survive changed body proportions',async()=>{
 const current={height:195,chest:120,waist:105,hip:125,shoulder:52},body=await fixture('male',current),item=catalog.items[1];
 const geometry=tailoredGeometry(body,item,item.sizeVariants[1],current,'male');
 assert.ok(geometry.attributes.position.array.every(Number.isFinite));
 const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){assert.ok(Math.abs(uv.getX(i))<=.23001);assert.ok(uv.getY(i)>=.07999&&uv.getY(i)<=1.06501);}
});
