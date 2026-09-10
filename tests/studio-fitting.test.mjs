import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bodyPoint,garmentPoint} from '../studio-fitting.js';
import {BODY_DEFAULTS} from '../studio-domain.js';
const catalog=JSON.parse(readFileSync(new URL('../studio-catalog.json',import.meta.url)));
test('default body retains original anatomy and deformation is independent of clothing',()=>{
 for(const style of ['male','female'])for(const point of [[.2,1.3,.13],[.37,.85,.06],[.1,.5,0]])assert.ok(bodyPoint(...point,BODY_DEFAULTS[style],style).every((value,i)=>Math.abs(value-point[i])<1e-12));
});
test('all wearable slots follow a height change, including wigs and glasses',()=>{
 for(const item of catalog.items){
  const variant=item.sizeVariants[1];
  const a=garmentPoint(.1,1.2,.1,item,variant,BODY_DEFAULTS.female,'female');
  const b=garmentPoint(.1,1.2,.1,item,variant,{...BODY_DEFAULTS.female,height:204},'female');
  assert.ok(Math.abs(b[1]-a[1]*1.2)<1e-8,item.id);
 }
});
test('accessory fitting remains finite at supported body limits and preserves catalog measurements',()=>{
 const before=JSON.stringify(catalog);
 for(const item of catalog.items.filter(i=>!['top','bottom'].includes(i.attachmentSlot)))for(const variant of item.sizeVariants)for(const style of ['female','male'])for(const body of [BODY_DEFAULTS[style],{height:220,chest:180,waist:160,hip:190,shoulder:65}]){
  for(const point of [[.2,1.4,.1],[.373,.945,.061],[0,1.07,-.1]])assert.ok(garmentPoint(...point,item,variant,body,style).every(Number.isFinite));
 }
 assert.equal(JSON.stringify(catalog),before);
});
