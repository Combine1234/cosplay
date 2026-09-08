import { DAY, evaluateSellerAdvice, validateListing } from './rules.js';

const LISTING_FIELDS = ['title','description','brand','type','subtype','color','style','size','price','condition','measurements','fit','photos','coverId','defects','tryOn'];

const fail = message => { throw new Error(message); };
const copy = value => structuredClone(value);
const id = (prefix, now) => `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2,9)}`;
const currentUser = state => {
  const user = state.profiles.find(profile => profile.id === state.settings.currentUserId);
  if (!user) fail('กรุณาเลือกบัญชีก่อนทำรายการ');
  return user;
};
const findListing = (state, listingId) => {
  const item = state.listings.find(listing => listing.id === listingId);
  if (!item) fail('ไม่พบสินค้านี้');
  return item;
};
const findOrder = (state, orderId) => {
  const order = state.orders.find(item => item.id === orderId);
  if (!order) fail('ไม่พบคำสั่งซื้อ');
  return order;
};
const findOffer = (state, offerId) => {
  const offer = state.offers.find(item => item.id === offerId);
  if (!offer) fail('ไม่พบข้อเสนอราคา');
  return offer;
};
const addEvent = (state, type, now, fields = {}) => state.events.push({id:id('evt',now),type,at:now,...fields});
const notify = (state, userId, text, now) => state.notifications.push({id:id('note',now),userId,text,read:false,at:now});
const coverHash = listing => listing.photos?.find(photo => photo.id === listing.coverId)?.hash ?? null;

function expire(state, now) {
  for (const offer of state.offers) {
    if ((offer.status === 'pending' || offer.status === 'accepted') && now >= offer.expiresAt) {
      offer.status = 'expired';
      offer.history.push({action:'expired',by:null,amount:offer.amount,at:now});
    }
  }
  for (const order of state.orders) {
    if (order.status !== 'pending_payment' || now < order.reservedUntil) continue;
    order.status = 'cancelled'; order.history.push({status:'cancelled',at:now});
    for (const item of order.items) {
      const listing = state.listings.find(entry => entry.id === item.listingId);
      if (listing?.status === 'reserved' && listing.reservationOrderId === order.id) { listing.status = 'active'; delete listing.reservationOrderId; }
    }
    notify(state, order.buyerId, 'คำสั่งซื้อหมดเวลาชำระเงินแล้ว', now);
  }
}

function saveListing(state, payload, now) {
  const user = currentUser(state), input = payload?.listing;
  if (!input || typeof input !== 'object') fail('ข้อมูลสินค้าไม่ถูกต้อง');
  const existing = input.id ? state.listings.find(item => item.id === input.id) : null;
  if (input.id && !existing) fail('ไม่พบสินค้านี้');
  if (existing && existing.sellerId !== user.id) fail('แก้ไขได้เฉพาะสินค้าของคุณ');
  if (existing && !['active','paused'].includes(existing.status)) fail('สินค้านี้แก้ไขไม่ได้');
  const candidate = {};
  for (const field of LISTING_FIELDS) candidate[field] = copy(input[field]);
  const errors = validateListing(candidate); if (errors.length) fail(errors.join('\n'));
  if (!existing) {
    const made = {...candidate,id:id('listing',now),sellerId:user.id,status:'active',publishedAt:now,updatedAt:now,refreshedAt:null};
    state.listings.push(made); addEvent(state,'listing.created',now,{listingId:made.id,userId:user.id}); return {id:made.id};
  }
  const oldPrice = existing.price, oldCoverHash = coverHash(existing);
  Object.assign(existing,candidate,{updatedAt:now});
  const advice = payload.adviceId ? state.advice.find(item => item.id === payload.adviceId && item.listingId === existing.id && item.usedAt == null) : null;
  const followedPrice = advice?.kind === 'price' && oldPrice !== existing.price && existing.price <= advice.targetPrice;
  const followedCover = advice?.kind === 'cover' && oldCoverHash !== coverHash(existing);
  if (advice && (followedPrice || followedCover)) {
    advice.usedAt = now; existing.refreshedAt = now; addEvent(state,'listing.refreshed',now,{listingId:existing.id,adviceId:advice.id});
  } else addEvent(state,'listing.updated',now,{listingId:existing.id,userId:user.id});
  return {id:existing.id};
}

function createCheckout(state, now) {
  const buyer = currentUser(state), cart = state.carts[buyer.id] ?? [];
  if (!cart.length) fail('ตะกร้ายังว่าง');
  const listings = cart.map(listingId => findListing(state,listingId));
  if (listings.some(item => item.status !== 'active')) fail('มีสินค้าในตะกร้าที่ไม่พร้อมขาย');
  if (listings.some(item => item.sellerId === buyer.id)) fail('ไม่สามารถซื้อสินค้าของตัวเองได้');
  const grouped = new Map();
  for (const listing of listings) { if (!grouped.has(listing.sellerId)) grouped.set(listing.sellerId,[]); grouped.get(listing.sellerId).push(listing); }
  const orderIds = [];
  for (const [sellerId, sellerListings] of grouped) {
    const seller = state.profiles.find(profile => profile.id === sellerId); if (!seller) fail('ไม่พบบัญชีผู้ขาย');
    const orderId = id('order',now);
    const items = sellerListings.map(listing => {
      const accepted = [...state.offers].reverse().find(offer => offer.listingId === listing.id && offer.buyerId === buyer.id && offer.status === 'accepted' && now < offer.expiresAt);
      return {listingId:listing.id,price:accepted?.amount ?? listing.price,snapshot:copy(listing)};
    });
    const shippingFee = Number.isFinite(seller.shippingFee) ? seller.shippingFee : 40;
    const order = {id:orderId,buyerId:buyer.id,sellerId,items,shippingFee,total:items.reduce((sum,item)=>sum+item.price,shippingFee),status:'pending_payment',createdAt:now,reservedUntil:now+15*60000,history:[{status:'pending_payment',at:now}]};
    state.orders.push(order);
    for (const listing of sellerListings) { listing.status='reserved'; listing.reservationOrderId=orderId; listing.updatedAt=now; }
    notify(state,sellerId,'มีคำสั่งซื้อใหม่รอการชำระเงิน',now); orderIds.push(orderId);
  }
  state.carts[buyer.id]=[]; addEvent(state,'checkout.created',now,{buyerId:buyer.id,orderIds:[...orderIds]}); return {orderIds};
}

export function transition(state, action, payload = {}, now = Date.now()) {
  if (!state || typeof state !== 'object') fail('ไม่พบข้อมูลระบบ');
  expire(state,now);
  switch (action) {
    case 'profile.create': {
      const name=String(payload.name??'').trim(), email=String(payload.email??'').trim();
      if (!name || !email || !email.includes('@')) fail('กรอกชื่อและอีเมลให้ถูกต้อง');
      if (state.profiles.some(profile=>profile.email.toLowerCase()===email.toLowerCase())) fail('อีเมลนี้มีบัญชีแล้ว');
      const profile={id:id('user',now),name,email,shippingFee:40}; state.profiles.push(profile); state.settings.currentUserId=profile.id; state.favorites[profile.id]=[]; state.carts[profile.id]=[]; (state.savedSearches??={})[profile.id]=[];
      addEvent(state,'profile.created',now,{userId:profile.id}); return {id:profile.id};
    }
    case 'profile.switch':
      if (payload.id !== null && !state.profiles.some(profile=>profile.id===payload.id)) fail('ไม่พบบัญชีนี้');
      state.settings.currentUserId=payload.id; if(payload.id!==null)(state.savedSearches??={})[payload.id]??=[]; return {id:payload.id};
    case 'favorite.toggle': {
      const user=currentUser(state), listing=findListing(state,payload.id); if (listing.status==='deleted') fail('ไม่พบสินค้านี้');
      const favorites=state.favorites[user.id] ??= [], index=favorites.indexOf(listing.id); if(index>=0) favorites.splice(index,1); else favorites.push(listing.id); return {favorite:index<0};
    }
    case 'search.save': {
      const user=currentUser(state), source=payload.filters&&typeof payload.filters==='object'?payload.filters:{}; const filters={};
      for(const [key,value] of Object.entries(source)){if(value==null||String(value).trim()==='')continue;filters[key]=['minPrice','maxPrice'].includes(key)?Number(value):String(value).trim();}
      if(!Object.keys(filters).length) fail('เลือกเงื่อนไขค้นหาอย่างน้อยหนึ่งรายการ');
      const rows=state.savedSearches??={}; const userRows=rows[user.id]??=[]; const saved={id:id('search',now),userId:user.id,filters,createdAt:now}; userRows.unshift(saved); addEvent(state,'search.saved',now,{userId:user.id,searchId:saved.id}); return {id:saved.id};
    }
    case 'cart.add': {
      const user=currentUser(state), ids=[...new Set(Array.isArray(payload.ids)?payload.ids:[])]; if(!ids.length) fail('ไม่ได้เลือกสินค้า');
      const items=ids.map(listingId=>findListing(state,listingId)); if(items.some(item=>item.status!=='active')) fail('สินค้าบางรายการไม่พร้อมขาย'); if(items.some(item=>item.sellerId===user.id)) fail('ไม่สามารถซื้อสินค้าของตัวเองได้');
      const cart=state.carts[user.id] ??= []; for(const listingId of ids) if(!cart.includes(listingId)) cart.push(listingId); return {ids:[...cart]};
    }
    case 'cart.remove': { const user=currentUser(state), cart=state.carts[user.id] ??= [], index=cart.indexOf(payload.id); if(index>=0) cart.splice(index,1); return {ids:[...cart]}; }
    case 'outfit.save': {
      const user=currentUser(state); if(!payload.outfit || typeof payload.outfit!=='object') fail('ข้อมูลชุดไม่ถูกต้อง'); state.outfits[user.id]=copy(payload.outfit); addEvent(state,'outfit.saved',now,{userId:user.id}); return state.outfits[user.id];
    }
    case 'listing.save': return saveListing(state,payload,now);
    case 'listing.status': {
      const user=currentUser(state), listing=findListing(state,payload.id); if(listing.sellerId!==user.id) fail('จัดการได้เฉพาะสินค้าของคุณ'); if(!['active','paused'].includes(listing.status)) fail('สินค้านี้เปลี่ยนสถานะไม่ได้'); if(!['active','paused','deleted'].includes(payload.status)) fail('สถานะสินค้าไม่ถูกต้อง');
      listing.status=payload.status; listing.updatedAt=now; addEvent(state,'listing.status',now,{listingId:listing.id,status:payload.status}); return {id:listing.id,status:listing.status};
    }
    case 'offer.create': {
      const buyer=currentUser(state), listing=findListing(state,payload.listingId), amount=Number(payload.amount); if(listing.status!=='active') fail('สินค้านี้ไม่พร้อมรับข้อเสนอ'); if(listing.sellerId===buyer.id) fail('ต่อราคาสินค้าของตัวเองไม่ได้'); if(!Number.isInteger(amount)||amount<=0) fail('ระบุราคาที่เสนอให้ถูกต้อง');
      const offer={id:id('offer',now),listingId:listing.id,buyerId:buyer.id,sellerId:listing.sellerId,amount,status:'pending',responderId:listing.sellerId,expiresAt:now+DAY,history:[{action:'create',by:buyer.id,amount,at:now}]}; state.offers.push(offer); notify(state,listing.sellerId,'มีข้อเสนอราคาใหม่',now); addEvent(state,'offer.created',now,{offerId:offer.id}); return {id:offer.id};
    }
    case 'offer.respond': {
      const user=currentUser(state), offer=findOffer(state,payload.id); if(offer.status!=='pending' || now>=offer.expiresAt) fail('ข้อเสนอนี้หมดอายุหรือดำเนินการแล้ว'); if(offer.responderId!==user.id) fail('ยังไม่ถึงคิวตอบข้อเสนอของคุณ'); if(!['accept','reject','counter'].includes(payload.response)) fail('คำตอบข้อเสนอไม่ถูกต้อง');
      if(payload.response==='counter') { const amount=Number(payload.amount); if(!Number.isInteger(amount)||amount<=0) fail('ระบุราคาตอบกลับให้ถูกต้อง'); offer.amount=amount; offer.responderId=user.id===offer.buyerId?offer.sellerId:offer.buyerId; offer.history.push({action:'counter',by:user.id,amount,at:now}); }
      else { offer.status=payload.response==='accept'?'accepted':'rejected'; offer.history.push({action:payload.response,by:user.id,amount:offer.amount,at:now}); }
      notify(state,user.id===offer.buyerId?offer.sellerId:offer.buyerId,payload.response==='accept'?'ข้อเสนอราคาได้รับการยอมรับ':'มีการตอบกลับข้อเสนอราคา',now); addEvent(state,'offer.responded',now,{offerId:offer.id,response:payload.response}); return {id:offer.id,status:offer.status};
    }
    case 'checkout.create': return createCheckout(state,now);
    case 'order.pay': {
      const user=currentUser(state), order=findOrder(state,payload.id); if(order.buyerId!==user.id) fail('เฉพาะผู้ซื้อเท่านั้นที่ชำระเงินได้'); if(order.status!=='pending_payment'||now>=order.reservedUntil) fail('คำสั่งซื้อนี้ชำระเงินไม่ได้');
      for(const item of order.items){const listing=findListing(state,item.listingId); if(listing.status!=='reserved'||listing.reservationOrderId!==order.id) fail('สถานะสินค้าไม่ตรงกับคำสั่งซื้อ');}
      order.status='paid'; order.history.push({status:'paid',at:now}); for(const item of order.items){const listing=findListing(state,item.listingId); listing.status='sold'; listing.updatedAt=now;}
      notify(state,order.sellerId,'ผู้ซื้อชำระเงินแล้ว กรุณาจัดส่งสินค้า',now); addEvent(state,'order.paid',now,{orderId:order.id}); return {id:order.id};
    }
    case 'order.cancel': {
      const user=currentUser(state), order=findOrder(state,payload.id); if(order.buyerId!==user.id) fail('เฉพาะผู้ซื้อเท่านั้นที่ยกเลิกได้'); if(order.status!=='pending_payment') fail('ยกเลิกคำสั่งซื้อนี้ไม่ได้');
      order.status='cancelled'; order.history.push({status:'cancelled',at:now}); for(const item of order.items){const listing=findListing(state,item.listingId); if(listing.status==='reserved'&&listing.reservationOrderId===order.id){listing.status='active';delete listing.reservationOrderId;}}
      notify(state,order.sellerId,'ผู้ซื้อยกเลิกคำสั่งซื้อแล้ว',now); addEvent(state,'order.cancelled',now,{orderId:order.id}); return {id:order.id};
    }
    case 'order.ship': {
      const user=currentUser(state), order=findOrder(state,payload.id); if(order.sellerId!==user.id) fail('เฉพาะผู้ขายเท่านั้นที่ยืนยันการจัดส่งได้'); if(order.status!=='paid') fail('คำสั่งซื้อนี้ยังจัดส่งไม่ได้'); order.status='shipped'; order.history.push({status:'shipped',at:now}); notify(state,order.buyerId,'ผู้ขายจัดส่งสินค้าแล้ว',now); addEvent(state,'order.shipped',now,{orderId:order.id}); return {id:order.id};
    }
    case 'order.complete': {
      const user=currentUser(state), order=findOrder(state,payload.id); if(order.buyerId!==user.id) fail('เฉพาะผู้ซื้อเท่านั้นที่ยืนยันรับสินค้าได้'); if(order.status!=='shipped') fail('คำสั่งซื้อนี้ยังยืนยันรับไม่ได้'); order.status='completed'; order.history.push({status:'completed',at:now}); notify(state,order.sellerId,'ผู้ซื้อยืนยันรับสินค้าแล้ว',now); addEvent(state,'order.completed',now,{orderId:order.id}); return {id:order.id};
    }
    case 'report.create': {
      const user=currentUser(state), listing=findListing(state,payload.listingId), reason=String(payload.reason??'').trim(); if(!['listing','seller'].includes(payload.target)||!reason) fail('กรอกเหตุผลการรายงาน'); const report={id:id('report',now),reporterId:user.id,listingId:listing.id,target:payload.target,reason,status:'received',at:now}; state.reports.push(report); addEvent(state,'report.created',now,{reportId:report.id}); return {id:report.id};
    }
    case 'notification.read': { const user=currentUser(state); for(const note of state.notifications) if(note.userId===user.id) note.read=true; return {}; }
    case 'clock.set': { const days=Number(payload.days); if(!Number.isFinite(days)) fail('จำนวนวันไม่ถูกต้อง'); state.settings.clockOffsetDays=days; addEvent(state,'clock.set',now,{days}); return {days}; }
    case 'maintenance': {
      for(const listing of state.listings) { if(state.advice.some(advice=>advice.listingId===listing.id&&advice.usedAt==null)) continue; const recommendation=evaluateSellerAdvice(listing,state.listings,now); if(!recommendation) continue; const advice={id:id('advice',now),listingId:listing.id,...recommendation,createdAt:now,usedAt:null,baselinePrice:listing.price,baselineCoverHash:coverHash(listing)}; state.advice.push(advice); notify(state,listing.sellerId,'มีคำแนะนำใหม่สำหรับสินค้าของคุณ',now); }
      addEvent(state,'maintenance',now); return {};
    }
    default: fail('ไม่รู้จักรายการที่ต้องการทำ');
  }
}
