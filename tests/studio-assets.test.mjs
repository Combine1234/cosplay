import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'studio-catalog.json'),'utf8'));

test('studio catalog contains exactly 15 distinct photographed and modeled pieces',()=>{
 assert.equal(catalog.items.length,15);
 assert.equal(new Set(catalog.items.map(item=>item.id)).size,15);
 assert.equal(new Set(catalog.items.map(item=>item.model.url)).size,15);
 assert.deepEqual(Object.fromEntries(['top','bottom','wig','accessory'].map(category=>[category,catalog.items.filter(item=>item.category===category).length])),{top:3,bottom:3,wig:3,accessory:6});
 assert.deepEqual(Object.fromEntries(['academy','fantasy','gothic'].map(theme=>[theme,catalog.items.filter(item=>item.theme===theme).length])),{academy:5,fantasy:5,gothic:5});
});

test('all photo references have provenance and all local binary assets are valid and GitHub-sized',()=>{
 for(const item of catalog.items){
  assert.match(item.photoCredit.sourceUrl,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.ok(item.photoCredit.creator&&item.photoCredit.license&&item.photoCredit.licenseUrl);
  const photo=path.join(root,item.photos[0].src),model=path.join(root,item.model.url);
  assert.ok(fs.statSync(photo).size>10_000,`${item.id} photo is missing`);
  const fd=fs.openSync(model,'r'),magic=Buffer.alloc(4);fs.readSync(fd,magic);fs.closeSync(fd);
  assert.equal(magic.toString(),'glTF',`${item.id} is not a GLB`);
  assert.ok(fs.statSync(model).size<100_000_000,`${item.id} exceeds GitHub file limit`);
 }
 for(const body of Object.values(catalog.bodies)){
  const file=path.join(root,body.url),magic=fs.readFileSync(file).subarray(0,4).toString();assert.equal(magic,'glTF');assert.match(body.license,/CC0/);
 }
});

test('each variant is independently purchasable and every slot follows exclusivity rules',()=>{
 const allowed=new Set(['top','bottom','wig','neck','waist','face','hair']);
 for(const item of catalog.items){
  assert.ok(allowed.has(item.attachmentSlot));assert.equal(item.sizeVariants.length,3);
  assert.equal(new Set(item.sizeVariants.map(v=>v.id)).size,3);
  for(const variant of item.sizeVariants){assert.ok(['S','M','L'].includes(variant.size));assert.equal(variant.stock,1);assert.ok(variant.price>0);}
 }
});
