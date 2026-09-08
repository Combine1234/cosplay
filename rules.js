export const DAY = 86400000;
const norm = value => String(value ?? '').trim().toLocaleLowerCase('th');
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const given = value => value !== '' && value !== undefined && value !== null && value !== 'all';

export function filterListings(listings, filters = {}) {
  const words = norm(filters.q).split(/\s+/).filter(Boolean);
  const result = listings.filter(item => {
    if (item.status !== 'active') return false;
    for (const key of ['type', 'size', 'color', 'brand', 'condition', 'style']) {
      if (given(filters[key]) && norm(item[key]) !== norm(filters[key])) return false;
    }
    if (given(filters.minPrice) && item.price < Number(filters.minPrice)) return false;
    if (given(filters.maxPrice) && item.price > Number(filters.maxPrice)) return false;
    const haystack = norm([item.title, item.description, item.brand, item.subtype, item.color, item.style].join(' '));
    return words.every(word => haystack.includes(word));
  });
  if (filters.sort === 'price_asc') result.sort((a,b) => a.price-b.price);
  else if (filters.sort === 'price_desc') result.sort((a,b) => b.price-a.price);
  else result.sort((a,b) => Math.max(b.publishedAt,b.refreshedAt??0)-Math.max(a.publishedAt,a.refreshedAt??0));
  return result;
}

// Deliberately transparent local parsing: unmatched terms remain searchable and are disclosed.
export function parseSearch(text = '') {
  let rest = norm(text).replace(/[,，](?=\d)/g, '');
  const filters = {};
  const understood = [];
  const take = (pattern, fn) => {
    const match = rest.match(pattern);
    if (!match) return;
    fn(match); understood.push(match[0].trim()); rest = rest.replace(match[0], ' ');
  };
  take(/(?:ราคา|งบ)?\s*(?:ไม่เกิน|ไม่เกินงบ|สูงสุด|ต่ำกว่า|under|below|up to)\s*(\d+)\s*(?:บาท|฿)?/i,m=>filters.maxPrice=Number(m[1]));
  take(/(?:งบ|budget)\s*(\d+)\s*(?:บาท|฿)?/i,m=>filters.maxPrice=Number(m[1]));
  take(/(?:ตั้งแต่|อย่างน้อย|ขั้นต่ำ|มากกว่า|over)\s*(\d+)\s*(?:บาท|฿)?/i,m=>filters.minPrice=Number(m[1]));
  take(/(?:ไซ[สซ]์?|ขนาด|size)\s*(xl|s|m|l)(?![a-z])/i,m=>filters.size=m[1].toUpperCase());
  take(/\b(xl|s|m|l)\b/i,m=>filters.size=m[1].toUpperCase());
  for (const [type, pattern] of [['outerwear',/เสื้อคลุม|แจ็คเก็ต|แจ็กเก็ต|เบลเซอร์|คาร์ดิแกน|outerwear|jacket|blazer/],['dress',/เดรส|ชุดกระโปรง|dress/],['bottom',/กางเกงยีนส์|กางเกง|กระโปรง|ยีนส์|pants|jeans|skirt|bottom/],['top',/เสื้อเชิ้ต|เสื้อยืด|เสื้อ|shirt|blouse|top/]]) {
    if (pattern.test(rest)) { take(pattern,()=>filters.type=type); break; }
  }
  for (const [color, pattern] of [['ขาว',/(?:สี)?ขาว|white/],['ดำ',/(?:สี)?ดำ|black/],['น้ำตาล',/(?:สี)?น้ำตาล|brown/],['ฟ้า',/(?:สี)?ฟ้า|light blue/],['น้ำเงิน',/(?:สี)?น้ำเงิน|blue|navy/],['เขียว',/(?:สี)?เขียว|green/],['ครีม',/(?:สี)?ครีม|cream/],['เบจ',/(?:สี)?เบจ|beige/],['เทา',/(?:สี)?เทา|grey|gray/],['ชมพู',/(?:สี)?ชมพู|pink/]]) {
    if (pattern.test(rest)) { take(pattern,()=>filters.color=color); break; }
  }
  for (const [style, pattern] of [['minimal',/มินิมอล|minimal/],['casual',/ลำลอง|แคชชวล|casual/],['smart',/ทางการ|ทำงาน|smart/],['street',/สตรีท|street/]]) take(pattern,()=>filters.style=style);
  for (const [condition, pattern] of [['like_new',/เหมือนใหม่|like new/],['defect',/มีตำหนิ|defect/],['good',/สภาพดี|good/]]) take(pattern,()=>filters.condition=condition);
  take(/\b(cos|uniqlo|zara|h&m|muji|levi['’]?s)\b/i,m=>filters.brand=m[1].toUpperCase());
  rest = rest.replace(/อยากได้|ขอหา|ช่วยหา|หาให้หน่อย|ต้องการ|แนะนำ|หน่อย|ให้หน่อย|สักตัว|แบบ|งบ|ราคา|บาท|please|find|looking for/g,' ').replace(/(^|\s)หา(?=\s|$)/g,' ').replace(/\s+/g,' ').trim();
  if (rest) filters.q = rest;
  return {filters, understood, unrecognized: Boolean(rest)};
}

function quantile(sorted, q) {
  const position = (sorted.length-1)*q;
  const low = Math.floor(position), high = Math.ceil(position);
  return sorted[low] + (sorted[high]-sorted[low])*(position-low);
}

export function priceAdvice(listing, listings, strategy = 'fast') {
  const knownBrand = norm(listing.brand) && !['ไม่ระบุ','ไม่มีแบรนด์','unknown','no brand'].includes(norm(listing.brand));
  const rows = listings.filter(item => item.id !== listing.id && item.status === 'active' && item.type === listing.type && item.condition === listing.condition && (!knownBrand || norm(item.brand) === norm(listing.brand)) && positive(item.price));
  const base = {enough:rows.length>=5,count:rows.length,ids:rows.map(item=>item.id),median:null,low:null,high:null,percentAbove:null,source:'asking'};
  if (!base.enough) return {...base,reason:`พบประกาศเทียบเคียง ${rows.length} ชิ้น ต้องมีอย่างน้อย 5 ชิ้น จึงยังประเมินราคาไม่ได้`};
  const prices = rows.map(item=>item.price).sort((a,b)=>a-b);
  const median = quantile(prices,.5);
  return {...base,median,low:Math.round(quantile(prices,strategy==='high'?.5:.25)),high:Math.round(quantile(prices,strategy==='high'?.75:.5)),percentAbove:Math.round((listing.price/median-1)*10000)/100,reason:`อิงราคาตั้งขาย ${rows.length} ประกาศ ประเภทและสภาพเดียวกัน${knownBrand?' แบรนด์เดียวกัน':''} ค่ากลาง ${median.toLocaleString('th-TH')} บาท ไม่ใช่ราคาที่ขายสำเร็จ`};
}

export function suggestOutfits(anchorId, listings, {userId,budget,size,style} = {}) {
  const available = listings.filter(item => item.status==='active' && item.sellerId!==userId && (!given(size)||item.size===size) && (!given(style)||item.style===style));
  const anchor = available.find(item=>item.id===anchorId);
  const ceiling = given(budget)?Number(budget):Infinity;
  if (!anchor || ceiling < anchor.price) return [];
  const group = type => available.filter(item=>item.type===type && item.id!==anchorId).sort((a,b)=>(Number(b.style===anchor.style)-Number(a.style===anchor.style)) || a.price-b.price);
  const combos = [];
  const add = items => {
    const total=items.reduce((sum,item)=>sum+item.price,0);
    if (total<=ceiling) combos.push({items,total});
  };
  if (anchor.type==='dress') {
    for (const outer of group('outerwear')) add([anchor,outer]);
    add([anchor]);
  } else if (anchor.type==='outerwear') {
    for (const dress of group('dress')) add([dress,anchor]);
    for (const top of group('top')) for (const bottom of group('bottom')) add([top,bottom,anchor]);
  } else {
    for (const complement of group(anchor.type==='top'?'bottom':'top')) {
      add([anchor,complement]);
      for (const outer of group('outerwear')) add([anchor,complement,outer]);
    }
  }
  const seen = new Set();
  return combos.sort((a,b)=>{
    const score=c=>c.items.filter(item=>item.style===anchor.style).length/c.items.length;
    return score(b)-score(a) || a.items.length-b.items.length || a.total-b.total;
  }).filter(combo=>{
    const key=combo.items.map(item=>item.id).sort().join('|');if(seen.has(key))return false;seen.add(key);return true;
  }).slice(0,3).map(({items,total})=>({ids:items.map(item=>item.id),total,reason:`จับคู่จากสินค้าที่ยังขายอยู่ ${items.length} ชิ้น${items.every(item=>item.style===anchor.style)?' ในสไตล์เดียวกัน':''}${given(size)?` ไซส์ ${size}`:''} รวม ${total.toLocaleString('th-TH')} บาท${given(budget)?' ภายในงบที่กำหนด':''} (ไม่รวมค่าส่ง)`}));
}

export function evaluateSellerAdvice(listing, listings, now) {
  if (listing.status!=='active' || now-listing.publishedAt<=14*DAY || (listing.refreshedAt!=null && now-listing.refreshedAt<7*DAY)) return null;
  const comparison = priceAdvice(listing,listings);
  if (comparison.enough && listing.price >= comparison.median*1.15) return {kind:'price',targetPrice:Math.round(comparison.median),reason:`ประกาศเกิน 14 วัน และราคาสูงกว่าค่ากลางอย่างน้อย 15% ลองปรับเป็น ${Math.round(comparison.median)} บาท · ${comparison.reason}`,comparableIds:comparison.ids};
  return {kind:'cover',reason:`ประกาศเกิน 14 วัน ลองเลือกภาพปกใหม่ที่เห็นทรงชัดและแสงสม่ำเสมอ${comparison.enough?'':` · ${comparison.reason}`}`,comparableIds:comparison.ids};
}

export function validateListing(listing = {}) {
  const errors=[];
  if (!norm(listing.title)) errors.push('กรุณาระบุชื่อสินค้า');
  if (!norm(listing.description)) errors.push('กรุณาระบุรายละเอียดสินค้า');
  if (!['top','bottom','outerwear','dress'].includes(listing.type)) errors.push('กรุณาเลือกประเภทสินค้า');
  if (!['S','M','L','XL'].includes(listing.size)) errors.push('กรุณาเลือกไซส์');
  if (!norm(listing.color)) errors.push('กรุณาระบุสี');
  if (!['minimal','casual','smart','street'].includes(listing.style)) errors.push('กรุณาเลือกสไตล์');
  if (!['regular','relaxed','slim'].includes(listing.fit)) errors.push('กรุณาเลือกทรง');
  if (!['like_new','good','defect'].includes(listing.condition)) errors.push('กรุณาเลือกสภาพสินค้า');
  if (!positive(listing.price) || !Number.isInteger(listing.price)) errors.push('ราคาต้องเป็นจำนวนเต็มมากกว่า 0 บาท');
  const fields={top:['chest','length'],outerwear:['chest','length'],bottom:['waist','hip','length'],dress:['chest','waist','hip','length']};
  const labels={chest:'รอบอก',waist:'รอบเอว',hip:'รอบสะโพก',length:'ความยาว'};
  for (const field of fields[listing.type]??[]) if(!positive(listing.measurements?.[field]))errors.push(`กรุณาระบุ${labels[field]}จริงเป็นเซนติเมตร มากกว่า 0`);
  const photos=Array.isArray(listing.photos)?listing.photos:[];
  const usable=photos.filter(p=>p && p.id && p.hash && (typeof p.src==='string'&&p.src.trim() || typeof Blob!=='undefined'&&p.src instanceof Blob&&p.src.size>0));
  if (usable.length<3 || new Set(usable.map(p=>p.id)).size!==photos.length || new Set(usable.map(p=>p.hash)).size<3) errors.push('ต้องมีรูปที่แตกต่างกันอย่างน้อย 3 รูป');
  if (!usable.some(p=>p.tag==='front')) errors.push('ต้องมีรูปด้านหน้า');
  if (!usable.some(p=>p.id===listing.coverId)) errors.push('กรุณาเลือกภาพปกที่มีอยู่จริง');
  const defects=Array.isArray(listing.defects)?listing.defects:[];
  if (listing.condition==='defect' && !defects.length) errors.push('สินค้ามีตำหนิต้องระบุตำหนิพร้อมรูปและรายละเอียด');
  if (listing.condition!=='defect' && (defects.length || photos.some(p=>p.tag==='defect'))) errors.push('มีข้อมูลตำหนิ กรุณาเลือกสภาพมีตำหนิ');
  for (const defect of defects) {
    if (!usable.some(p=>p.id===defect.photoId && p.tag==='defect')) errors.push('แต่ละตำหนิต้องเชื่อมกับรูปตำหนิ');
    if (!norm(defect.description)) errors.push('กรุณาอธิบายตำหนิ');
    if (!['stain','snag','fade','tear','other'].includes(defect.type) || !['minor','visible','functional'].includes(defect.severity) || typeof defect.cleanable!=='boolean') errors.push('กรุณาระบุประเภท ระดับ และข้อมูลการทำความสะอาดตำหนิ');
  }
  for (const photo of photos.filter(p=>p.tag==='defect')) if(!defects.some(d=>d.photoId===photo.id))errors.push('รูปตำหนิทุกรูปต้องมีรายละเอียดกำกับ');
  return [...new Set(errors)];
}
