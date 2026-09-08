import test from 'node:test';
import assert from 'node:assert/strict';
import { transition } from '../domain.js';

const DAY = 86400000;
const NOW = 1800000000000;
function listing(id = 'l1', sellerId = 'u2', price = 300) {
  return {id,sellerId,title:'เสื้อผ้าฝ้าย',description:'เสื้อผ้าฝ้ายพร้อมใช้',brand:'Demo',type:'top',subtype:'shirt',color:'ขาว',style:'minimal',size:'M',price,condition:'good',measurements:{chest:100,length:65},fit:'regular',photos:[{id:'p1',src:'assets/a.svg',tag:'front',hash:'a'},{id:'p2',src:'assets/b.svg',tag:'back',hash:'b'},{id:'p3',src:'assets/c.svg',tag:'label',hash:'c'}],coverId:'p1',defects:[],tryOn:null,status:'active',publishedAt:NOW-20*DAY,updatedAt:NOW-20*DAY,refreshedAt:null};
}
function state() {
  return {version:1,profiles:[{id:'u1',name:'Buyer',email:'b@test.com',shippingFee:40},{id:'u2',name:'Seller',email:'s@test.com',shippingFee:50},{id:'u3',name:'Other',email:'o@test.com',shippingFee:30}],listings:[listing(),listing('l2','u2',400),listing('l3','u3',500)],offers:[],orders:[],advice:[],notifications:[],reports:[],events:[],favorites:{},carts:{},outfits:{},settings:{currentUserId:'u1',clockOffsetDays:0}};
}
const act = (s,a,p={},at=NOW) => transition(s,a,p,at);
const switchTo = (s,id) => act(s,'profile.switch',{id});

test('cart add validates whole batch and deduplicates scoped items',()=>{
  const s=state(); act(s,'cart.add',{ids:['l1','l1']}); assert.deepEqual(s.carts.u1,['l1']);
  assert.throws(()=>act(s,'cart.add',{ids:['l2','missing']})); assert.deepEqual(s.carts.u1,['l1']);
  switchTo(s,'u2'); assert.throws(()=>act(s,'cart.add',{ids:['l1']}));
  act(s,'cart.add',{ids:['l3']}); assert.deepEqual(s.carts.u2,['l3']); assert.deepEqual(s.carts.u1,['l1']);
  act(s,'cart.remove',{id:'l3'}); assert.deepEqual(s.carts.u2,[]);
});
test('checkout splits seller orders, snapshots, charges one fee and reserves atomically',()=>{
  const s=state(); act(s,'cart.add',{ids:['l1','l2','l3']});
  const result=act(s,'checkout.create'); assert.equal(result.orderIds.length,2);
  assert.deepEqual(s.orders.map(o=>o.total),[750,530]); assert.deepEqual(s.orders.map(o=>o.shippingFee),[50,30]);
  assert.equal(s.orders[0].reservedUntil,NOW+15*60000); assert.equal(s.listings[0].status,'reserved');
  s.listings[0].photos[0].hash='changed'; assert.equal(s.orders[0].items[0].snapshot.photos[0].hash,'a');
  assert.deepEqual(s.carts.u1,[]);
});
test('checkout stale item leaves all reservations and orders unchanged',()=>{
  const s=state(); act(s,'cart.add',{ids:['l1','l2']}); s.listings[1].status='sold';
  assert.throws(()=>act(s,'checkout.create')); assert.equal(s.orders.length,0); assert.equal(s.listings[0].status,'active');
});
test('order progression authorizes each role and excludes edits on reserved and sold items',()=>{
  const s=state(); act(s,'cart.add',{ids:['l1']}); const {orderIds:[id]}=act(s,'checkout.create');
  switchTo(s,'u2'); assert.throws(()=>act(s,'order.pay',{id}));
  assert.throws(()=>act(s,'listing.status',{id:'l1',status:'paused'}));
  assert.throws(()=>act(s,'listing.save',{listing:{...s.listings[0],price:1}}));
  switchTo(s,'u1'); act(s,'order.pay',{id}); assert.equal(s.listings[0].status,'sold');
  assert.throws(()=>act(s,'order.ship',{id})); switchTo(s,'u2'); act(s,'order.ship',{id});
  assert.throws(()=>act(s,'order.complete',{id})); switchTo(s,'u1'); act(s,'order.complete',{id});
  assert.equal(s.orders[0].status,'completed'); assert.deepEqual(s.orders[0].history.map(h=>h.status),['pending_payment','paid','shipped','completed']);
});
test('expired reservations release inventory at exact expiry and cannot be paid',()=>{
  const s=state(); act(s,'cart.add',{ids:['l1']}); const {orderIds:[id]}=act(s,'checkout.create');
  assert.throws(()=>act(s,'order.pay',{id},NOW+15*60000));
  act(s,'maintenance',{},NOW+15*60000); assert.equal(s.orders[0].status,'cancelled'); assert.equal(s.listings[0].status,'active');
});
test('buyer cancellation releases reservation; strangers cannot cancel',()=>{
  const s=state(); act(s,'cart.add',{ids:['l1']}); const {orderIds:[id]}=act(s,'checkout.create');
  switchTo(s,'u3'); assert.throws(()=>act(s,'order.cancel',{id})); switchTo(s,'u1'); act(s,'order.cancel',{id});
  assert.equal(s.orders[0].status,'cancelled'); assert.equal(s.listings[0].status,'active');
});
test('offer counter flips responder and accepted price applies only to its buyer',()=>{
  const s=state(); act(s,'offer.create',{listingId:'l1',amount:200}); const id=s.offers[0].id;
  assert.throws(()=>act(s,'offer.respond',{id,response:'accept'})); switchTo(s,'u2'); act(s,'offer.respond',{id,response:'counter',amount:250});
  assert.equal(s.offers[0].responderId,'u1'); switchTo(s,'u1'); act(s,'offer.respond',{id,response:'accept'});
  assert.equal(s.listings[0].status,'active'); act(s,'cart.add',{ids:['l1']}); act(s,'checkout.create');
  assert.equal(s.orders[0].items[0].price,250); assert.equal(s.offers[0].history.length,3);
});
test('expired offers cannot respond or discount checkout',()=>{
  const s=state(); act(s,'offer.create',{listingId:'l1',amount:200}); const id=s.offers[0].id;
  switchTo(s,'u2'); act(s,'offer.respond',{id,response:'accept'}); switchTo(s,'u1');
  act(s,'cart.add',{ids:['l1']},NOW+DAY); act(s,'checkout.create',{},NOW+DAY);
  assert.equal(s.offers[0].status,'expired'); assert.equal(s.orders[0].items[0].price,300);
});
test('listing save protects ownership, lifecycle and publication time',()=>{
  const s=state(); switchTo(s,'u2');
  act(s,'listing.save',{listing:{...s.listings[0],title:'แก้ไขเสื้อ',sellerId:'u1',status:'sold',publishedAt:NOW,refreshedAt:NOW,price:280}});
  assert.equal(s.listings[0].sellerId,'u2'); assert.equal(s.listings[0].status,'active'); assert.equal(s.listings[0].publishedAt,NOW-20*DAY); assert.equal(s.listings[0].refreshedAt,null);
  switchTo(s,'u1'); assert.throws(()=>act(s,'listing.save',{listing:{...s.listings[0],price:1}}));
});
test('new listing validates dimensions/photos and sets current owner',()=>{
  const s=state(); const draft=listing(); delete draft.id;
  assert.throws(()=>act(s,'listing.save',{listing:{...draft,photos:[]}})); assert.equal(s.listings.length,3);
  act(s,'listing.save',{listing:draft}); const made=s.listings.at(-1); assert.equal(made.sellerId,'u1'); assert.equal(made.status,'active'); assert.equal(made.publishedAt,NOW);
});
test('advice refresh requires matching recommendation and cannot repeat or rewrite publish time',()=>{
  const s=state(); s.listings[0].price=900;
  for(let i=4;i<10;i++)s.listings.push(listing(`l${i}`,'u3',300));
  act(s,'maintenance'); const advice=s.advice.find(a=>a.listingId==='l1'); assert.equal(advice.kind,'price');
  switchTo(s,'u2'); act(s,'listing.save',{listing:{...s.listings[0]},adviceId:advice.id}); assert.equal(s.listings[0].refreshedAt,null);
  act(s,'listing.save',{listing:{...s.listings[0],price:advice.targetPrice},adviceId:advice.id});
  assert.equal(s.listings[0].refreshedAt,NOW); assert.equal(s.listings[0].publishedAt,NOW-20*DAY); assert.equal(s.advice.find(a=>a.id===advice.id).usedAt,NOW);
  act(s,'listing.save',{listing:{...s.listings[0],price:200},adviceId:advice.id},NOW+DAY); assert.equal(s.listings[0].refreshedAt,NOW);
});
test('cover advice compares actual content hash and survives repeated maintenance',()=>{
  const s=state(); act(s,'maintenance'); const advice=s.advice.find(a=>a.listingId==='l1'); assert.equal(advice.kind,'cover');
  act(s,'maintenance'); assert.equal(s.advice.filter(a=>a.listingId==='l1'&&!a.usedAt).length,1);
  switchTo(s,'u2'); act(s,'listing.save',{listing:{...s.listings[0],coverId:'p2',photos:s.listings[0].photos.map(p=>({...p,hash:p.id==='p1'?'old-front':p.id==='p2'?'a':p.hash}))},adviceId:advice.id}); assert.equal(s.listings[0].refreshedAt,null);
  act(s,'listing.save',{listing:{...s.listings[0],coverId:'p3',photos:s.listings[0].photos.map(p=>({...p,hash:p.id==='p3'?'fresh':p.hash}))},adviceId:advice.id}); assert.equal(s.listings[0].refreshedAt,NOW);
});
test('profiles, favorites, outfit, notifications and reports remain scoped',()=>{
  const s=state(); act(s,'favorite.toggle',{id:'l1'}); act(s,'outfit.save',{outfit:{items:{top:'l1'},body:{height:165},adjustments:{}}});
  act(s,'report.create',{listingId:'l1',target:'seller',reason:'รายละเอียดไม่ตรงสินค้า'}); assert.equal(s.reports[0].reporterId,'u1');
  act(s,'profile.create',{name:'New',email:'new@test.com'}); const newId=s.settings.currentUserId; assert.notEqual(newId,'u1');
  assert.deepEqual(s.favorites.u1,['l1']); assert.equal(s.outfits.u1.items.top,'l1');
  s.notifications.push({id:'n-test',userId:'u1',read:false},{id:'n-new',userId:newId,read:false}); act(s,'notification.read');
  assert.equal(s.notifications.find(n=>n.id==='n-test').read,false); assert.equal(s.notifications.find(n=>n.id==='n-new').read,true);
  switchTo(s,null); assert.throws(()=>act(s,'cart.add',{ids:['l1']}));
});

test('listing lifecycle changes require the owner and reject unsupported transitions',()=>{
  const s=state();
  assert.throws(()=>act(s,'listing.status',{id:'l1',status:'paused'}));
  switchTo(s,'u2'); act(s,'listing.status',{id:'l1',status:'paused'}); assert.equal(s.listings[0].status,'paused');
  act(s,'listing.status',{id:'l1',status:'active'}); assert.equal(s.listings[0].status,'active');
  assert.throws(()=>act(s,'listing.status',{id:'l1',status:'sold'}));
});

test('offers reject self-purchases, invalid amounts and responses from the wrong participant',()=>{
  const s=state();
  assert.throws(()=>act(s,'offer.create',{listingId:'l1',amount:0}));
  switchTo(s,'u2'); assert.throws(()=>act(s,'offer.create',{listingId:'l1',amount:200}));
  switchTo(s,'u1'); act(s,'offer.create',{listingId:'l1',amount:200}); const id=s.offers[0].id;
  switchTo(s,'u3'); assert.throws(()=>act(s,'offer.respond',{id,response:'reject'}));
});

test('paid orders cannot be cancelled and clock offset must be finite',()=>{
  const s=state(); act(s,'cart.add',{ids:['l1']}); const {orderIds:[id]}=act(s,'checkout.create');
  act(s,'order.pay',{id}); assert.throws(()=>act(s,'order.cancel',{id}));
  assert.throws(()=>act(s,'clock.set',{days:Infinity})); act(s,'clock.set',{days:3}); assert.equal(s.settings.clockOffsetDays,3);
});

test('saved searches are scoped, normalized and auditable',()=>{
  const s=state();
  act(s,'search.save',{filters:{q:'  เสื้อขาว  ',type:'top',maxPrice:'500',empty:''}});
  assert.deepEqual(s.savedSearches.u1[0].filters,{q:'เสื้อขาว',type:'top',maxPrice:500});
  assert.equal(s.events.at(-1).type,'search.saved');
  switchTo(s,'u2'); assert.deepEqual(s.savedSearches.u2,[]);
});
