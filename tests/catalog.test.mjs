import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {makeSeed} from '../seed.js';
import {validateListing,evaluateSellerAdvice} from '../rules.js';
const now=1770000000000;
test('demo catalog is valid, diverse, and every gallery and try-on asset exists offline',()=>{
 const state=makeSeed(now);
 assert.ok(state.listings.length>=24);
 for(const type of ['top','bottom','outerwear','dress'])assert.ok(state.listings.some(l=>l.type===type));
 assert.ok(state.listings.filter(l=>l.status==='active'&&l.sellerId!=='u1').length>state.listings.length/2);
 for(const listing of state.listings){
   assert.deepEqual(validateListing(listing),[],listing.id);
   const front=listing.photos.find(p=>p.tag==='front');assert.equal(front.src,listing.tryOn.src);
   for(const photo of listing.photos){
     assert.match(photo.src,/^assets\//);assert.ok(existsSync(new URL('../'+photo.src,import.meta.url)),photo.src);
     const svg=readFileSync(new URL('../'+photo.src,import.meta.url),'utf8');assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<image[^>]+https?:/);
   }
 }
});
test('seed exercises both seller-advice routes and sold/reserved inventory has coherent order history',()=>{
 const state=makeSeed(now);
 const own=state.listings.filter(l=>l.sellerId==='u1');
 assert.ok(own.some(l=>evaluateSellerAdvice(l,state.listings,now)?.kind==='price'));
 assert.ok(own.some(l=>evaluateSellerAdvice(l,state.listings,now)?.kind==='cover'));
 for(const listing of state.listings.filter(l=>['sold','reserved'].includes(l.status))){
   const order=state.orders.find(o=>o.items.some(i=>i.listingId===listing.id));assert.ok(order,listing.id);
   assert.equal(order.sellerId,listing.sellerId);
   if(listing.status==='reserved'){assert.equal(order.id,listing.reservationOrderId);assert.equal(order.status,'pending_payment');assert.ok(order.reservedUntil>now);}
   else assert.ok(['paid','shipped','completed'].includes(order.status));
 }
 const again=makeSeed(now);state.listings[0].title='changed';assert.notEqual(again.listings[0].title,'changed');
});
