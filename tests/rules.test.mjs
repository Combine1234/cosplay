import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, filterListings, parseSearch, priceAdvice, suggestOutfits, evaluateSellerAdvice, validateListing } from '../rules.js';
const now = 1770000000000;
const listing = (id, overrides={}) => ({id,sellerId:'u2',title:'เสื้อเชิ้ตผ้าฝ้าย',description:'ผ้าฝ้ายเนื้อนุ่ม',brand:'COS',type:'top',subtype:'shirt',color:'ขาว',style:'minimal',size:'M',price:400,condition:'good',measurements:{chest:96,length:62},fit:'regular',photos:[{id:'f',src:'f.svg',tag:'front',hash:'f'},{id:'b',src:'b.svg',tag:'back',hash:'b'},{id:'l',src:'l.svg',tag:'label',hash:'l'}],coverId:'f',defects:[],tryOn:{src:'f.svg'},status:'active',publishedAt:now-15*DAY,updatedAt:now-15*DAY,refreshedAt:null,...overrides});
const comparables = [200,300,400,500,600].map((price,i)=>listing(`c${i}`,{price}));

test('filter removes inactive and combines dimensions, free text, and inclusive price bounds',()=>{
 const rows=[listing('a'),listing('b',{status:'reserved'}),listing('c',{color:'ดำ'}),listing('d',{size:'S'}),listing('e',{price:500})];
 assert.deepEqual(filterListings(rows,{q:'COS ฝ้าย',color:'ขาว',size:'M',minPrice:400,maxPrice:400}).map(x=>x.id),['a']);
 assert.deepEqual(filterListings(rows,{sort:'price_desc'}).map(x=>x.id),['e','a','c','d']);
 assert.equal(rows[0].id,'a');
});
test('Thai natural query parses category, color, size and comma budget without hiding unknown words',()=>{
 const p=parseSearch('อยากได้ เสื้อ สีขาว ไซส์ M งบไม่เกิน 1,000 บาท');
 assert.equal(p.filters.type,'top'); assert.equal(p.filters.color,'ขาว'); assert.equal(p.filters.size,'M'); assert.equal(p.filters.maxPrice,1000); assert.equal(p.unrecognized,false);
 const unknown=parseSearch('เสื้อ ลายกาแล็กซี'); assert.equal(unknown.unrecognized,true); assert.match(unknown.filters.q,/กาแล็กซี/);
 const concise=parseSearch('หาเสื้อสีขาว ไซซ์ M งบไม่เกิน 500'); assert.equal(concise.filters.q,undefined); assert.equal(concise.unrecognized,false);
});
test('price advice requires five actual matching active listings and reports asking median',()=>{
 const a=listing('a',{price:1000});
 assert.equal(priceAdvice(a,comparables.slice(0,4)).enough,false);
 const p=priceAdvice(a,[a,...comparables,listing('wrong-brand',{brand:'ZARA',price:2}),listing('sold',{status:'sold',price:1})]);
 assert.equal(p.count,5); assert.equal(p.median,400); assert.equal(p.low,300); assert.equal(p.high,400); assert.equal(p.percentAbove,150); assert.equal(p.source,'asking');
 const high=priceAdvice(a,comparables,'high'); assert.equal(high.low,400); assert.equal(high.high,500);
});
test('seller advice is strict beyond 14 days and seven-day cooldown has exact boundary',()=>{
 assert.equal(evaluateSellerAdvice(listing('a',{publishedAt:now-14*DAY}),comparables,now),null);
 assert.equal(evaluateSellerAdvice(listing('a',{price:460,publishedAt:now-14*DAY-1}),comparables,now)?.kind,'price');
 assert.equal(evaluateSellerAdvice(listing('a',{price:459}),comparables,now)?.kind,'cover');
 assert.equal(evaluateSellerAdvice(listing('a',{refreshedAt:now-7*DAY+1}),comparables,now),null);
 assert.equal(evaluateSellerAdvice(listing('a',{refreshedAt:now-7*DAY}),comparables,now)?.kind,'cover');
 assert.equal(evaluateSellerAdvice(listing('a',{status:'paused'}),comparables,now),null);
});
test('outfits retain anchor and enforce availability, ownership, slots, budget, size and style',()=>{
 const rows=[listing('anchor'),...['a','b','c','d'].map(id=>listing(id,{type:'bottom',price:200,measurements:{waist:70,hip:96,length:90}})),listing('sold',{type:'bottom',status:'sold'}),listing('own',{type:'bottom',sellerId:'u1'}),listing('small',{type:'bottom',size:'S'}),listing('street',{type:'bottom',style:'street'}),listing('coat',{type:'outerwear',price:200})];
 const outfits=suggestOutfits('anchor',rows,{userId:'u1',budget:600,size:'M',style:'minimal'});
 assert.equal(outfits.length,3);
 for(const o of outfits){assert.ok(o.ids.includes('anchor'));assert.equal(o.total,600);assert.equal(o.ids.length,2);assert.ok(o.ids.every(id=>!['sold','own','small','street','coat'].includes(id)));assert.ok(o.reason);}
 assert.deepEqual(suggestOutfits('own',rows,{userId:'u1'}),[]);
 assert.deepEqual(suggestOutfits('anchor',rows,{userId:'u1',budget:599}),[]);
 assert.deepEqual(suggestOutfits('anchor',rows,{userId:'u1',size:'S'}),[]);
});
test('dress outfits do not contain top or bottom, and outerwear anchor gets a complete base outfit',()=>{
 const rows=[listing('dress',{type:'dress'}),listing('coat',{type:'outerwear'}),listing('top'),listing('pants',{type:'bottom'})];
 assert.ok(suggestOutfits('dress',rows,{userId:'u1'}).length);
 assert.ok(suggestOutfits('coat',rows,{userId:'u1'}).length);
 for(const o of suggestOutfits('dress',rows,{userId:'u1'})){assert.ok(!o.ids.includes('top'));assert.ok(!o.ids.includes('pants'));}
 for(const o of suggestOutfits('coat',rows,{userId:'u1'})){assert.ok(o.ids.includes('dress')||(o.ids.includes('top')&&o.ids.includes('pants')));}
});
test('listing validation requires type-specific actual dimensions and three usable unique photos',()=>{
 assert.deepEqual(validateListing(listing('a')),[]);
 assert.ok(validateListing(listing('a',{type:'bottom'})).some(e=>/เอว|สะโพก/.test(e)));
 assert.ok(validateListing(listing('a',{type:'dress',measurements:{chest:92,waist:70,length:90}})).some(e=>/สะโพก/.test(e)));
 assert.ok(validateListing(listing('a',{photos:[]})).length);
 assert.ok(validateListing(listing('a',{price:0})).length);
 assert.ok(validateListing(listing('a',{measurements:{chest:Infinity,length:62}})).length);
});
test('defects cannot be hidden, unreferenced, or described without a defect illustration',()=>{
 const d={photoId:'d',type:'stain',severity:'minor',description:'จุดเล็กที่ชายเสื้อ',cleanable:false};
 assert.ok(validateListing(listing('a',{condition:'defect'})).length);
 assert.ok(validateListing(listing('a',{defects:[d]})).length);
 assert.ok(validateListing(listing('a',{condition:'defect',defects:[d]})).length);
 const good=listing('a',{condition:'defect',defects:[d]});good.photos.push({id:'d',src:'d.svg',tag:'defect',hash:'d'});
 assert.deepEqual(validateListing(good),[]);
});
