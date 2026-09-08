import { h, money, photoUrl, cover } from './dom.js';
import { validateListing, priceAdvice } from './rules.js';

const TYPES = { top: 'เสื้อ', bottom: 'กางเกง / กระโปรง', outerwear: 'เสื้อคลุม', dress: 'เดรส' };
const CONDITIONS = { like_new: 'เหมือนใหม่', good: 'สภาพดี', defect: 'มีตำหนิ' };
const STATUS = { active: 'กำลังขาย', paused: 'พักการขาย', reserved: 'จองแล้ว', sold: 'ขายแล้ว', deleted: 'ลบแล้ว', pending_payment: 'รอชำระเงิน', paid: 'ชำระแล้ว', shipped: 'จัดส่งแล้ว', completed: 'สำเร็จ', cancelled: 'ยกเลิก', pending: 'รอตอบกลับ', accepted: 'ตกลงแล้ว', rejected: 'ปฏิเสธ', expired: 'หมดอายุ' };
const TAGS = { front: 'ด้านหน้า', back: 'ด้านหลัง', label: 'ป้ายสินค้า', defect: 'ตำหนิ' };
const me = ctx => ctx.state.settings.currentUserId;
const name = (ctx, id) => ctx.state.profiles.find(p => p.id === id)?.name || 'ผู้ใช้';
const dt = value => new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
const btn = (ctx, text, fn, className = 'btn', attrs = {}) => h('button', { type: 'button', className, ...attrs, onClick: () => ctx.task(fn) }, text);
const badge = text => h('span', { className: 'badge' }, text);
const note = text => h('p', { className: 'muted panel-note' }, text);
const empty = (text, action) => h('div', { className: 'panel-empty' }, h('span', { className: 'panel-empty-icon', 'aria-hidden': 'true' }, '◇'), h('p', {}, text), action);
const field = (label, input, hint) => h('label', { className: 'field' }, h('span', {}, label), input, hint && h('small', { className: 'muted' }, hint));
const input = (value, change, attrs = {}) => h('input', { ...attrs, value: value ?? '', onInput: e => change(e.target.value) });
const select = (value, options, change, attrs = {}) => h('select', { ...attrs, onChange: e => change(e.target.value) }, Object.entries(options).map(([id, text]) => h('option', { value: id, selected: id === value }, text)));
function requireAccount(ctx) { if (!me(ctx)) { openAccounts(ctx); return false; } return true; }
function listingLine(ctx, listing, actions = []) {
  return h('article', { className: 'panel-listing' }, h('img', { src: photoUrl(cover(listing)), alt: listing.title, className: 'panel-thumb' }), h('div', { className: 'panel-listing-copy' }, h('strong', {}, listing.title), h('p', { className: 'muted' }, `${listing.brand || 'ไม่ระบุแบรนด์'} · ${listing.size} · ${CONDITIONS[listing.condition] || listing.condition}`), h('span', { className: 'panel-price' }, money(listing.price))), h('div', { className: 'panel-actions' }, ...actions));
}

export function openAccounts(ctx) {
  let mode = 'login'; let fullName = ''; let email = ''; let error = '';
  const render = () => h('div', { className: 'stack account-panel' },
    note('บัญชีสาธิตบนเบราว์เซอร์นี้ ใช้ลองบทบาทผู้ซื้อและผู้ขาย ไม่มีรหัสผ่านหรือการยืนยันตัวตนจริง'),
    h('div', { className: 'panel-tabs', role: 'tablist', 'aria-label': 'บัญชี' }, ...[['login', 'เข้าสู่ระบบ / สลับบัญชี'], ['create', 'สร้างบัญชี']].map(([key, text]) => btn(ctx, text, () => { mode = key; refresh(); }, `panel-tab ${mode === key ? 'selected' : ''}`, { role: 'tab', 'aria-selected': mode === key }))),
    mode === 'login' ? h('div', { className: 'stack' }, ...ctx.state.profiles.map(p => h('div', { className: 'account-row card' }, h('span', { className: 'account-avatar' }, p.name.slice(0, 1)), h('div', { className: 'panel-grow' }, h('strong', {}, p.name), h('p', { className: 'muted' }, p.email)), me(ctx) === p.id ? badge('กำลังใช้งาน') : btn(ctx, 'ใช้บัญชีนี้', async () => { await ctx.run('profile.switch', { id: p.id }); ctx.toast(`เข้าสู่ระบบเป็น ${p.name}`); }, 'btn secondary'))), me(ctx) && btn(ctx, 'ออกจากระบบ', async () => { await ctx.run('profile.switch', { id: null }); ctx.toast('ออกจากระบบแล้ว'); }, 'btn secondary')) :
      h('form', { className: 'stack', onSubmit: e => { e.preventDefault(); ctx.task(async () => { error = ''; try { await ctx.run('profile.create', { name: fullName, email }); ctx.toast('สร้างบัญชีแล้ว'); ctx.close(); } catch (err) { error = err.message; refresh(); } }); } }, field('ชื่อที่แสดง', input(fullName, v => { fullName = v; }, { required: true, maxLength: 60, autoComplete: 'name' })), field('อีเมล', input(email, v => { email = v; }, { type: 'email', required: true, maxLength: 120, autoComplete: 'email' })), error && h('p', { className: 'panel-error', role: 'alert' }, error), h('button', { className: 'btn', type: 'submit' }, 'สร้างบัญชีและเริ่มใช้งาน')));
  const refresh = () => ctx.modal('พื้นที่ของคุณ', render);
  refresh();
}

async function originalPhoto(file, tag = 'front') {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('รองรับเฉพาะ JPEG, PNG และ WebP');
  if (file.size > 10 * 1024 * 1024) throw new Error('รูปแต่ละใบต้องมีขนาดไม่เกิน 10 MB');
  if (!file.size) throw new Error('ไฟล์รูปว่างเปล่า');
  const bitmap = await createImageBitmap(file);
  bitmap.close();
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return { id: crypto.randomUUID(), src: file, tag, hash: [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('') };
}
async function transparentCutout(file) {
  if (file.type !== 'image/png') throw new Error('รูปสำหรับลองชุดต้องเป็น PNG พื้นหลังโปร่งใส');
  await originalPhoto(file);
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
  const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let transparent = false; let visible = false;
  for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] < 255) transparent = true; if (pixels[i] > 0) visible = true; if (transparent && visible) break; }
  if (!transparent || !visible) throw new Error('PNG ต้องมีทั้งตัวเสื้อผ้าและพื้นที่โปร่งใส กรุณาตรวจไฟล์');
  return { src: file };
}

export function openListing(ctx, id = null, adviceId = null) {
  if (!requireAccount(ctx)) return;
  const existing = id && ctx.state.listings.find(l => l.id === id);
  if (id && (!existing || existing.sellerId !== me(ctx))) { ctx.toast('แก้ไขได้เฉพาะสินค้าของคุณ'); return; }
  if (existing && ['sold', 'reserved', 'deleted'].includes(existing.status)) { ctx.toast('สถานะนี้ไม่สามารถแก้ไขสินค้าได้'); return; }
  const owner = me(ctx);
  const draft = existing ? structuredClone(existing) : { title: '', description: '', brand: '', type: 'top', subtype: '', color: '', style: 'minimal', size: 'M', price: '', condition: 'good', measurements: { chest: '', waist: '', hip: '', length: '' }, fit: 'regular', photos: [], coverId: null, defects: [], tryOn: null };
  let step = 1; let errors = []; let busy = false; let generated = false;
  const advice = adviceId && ctx.state.advice.find(a => a.id === adviceId && a.listingId === id && !a.usedAt);
  const dimensions = () => draft.type === 'bottom' ? ['waist', 'hip', 'length'] : draft.type === 'dress' ? ['chest', 'waist', 'hip', 'length'] : ['chest', 'length'];
  const dimensionLabels = { chest: 'รอบอก', waist: 'รอบเอว', hip: 'สะโพก', length: 'ความยาว' };
  const refresh = () => ctx.modal(existing ? 'แก้ไขสินค้า' : 'Quick Listing', render, { wide: true });
  const fail = err => { errors = [err.message]; busy = false; refresh(); };
  const addPhotos = files => ctx.task(async () => {
    busy = true; errors = []; refresh();
    try {
      const added = [];
      for (const file of files) { const p = await originalPhoto(file, ['front', 'back', 'label'][draft.photos.length + added.length] || 'front'); if ([...draft.photos, ...added].some(q => q.hash === p.hash)) throw new Error('รูปนี้ซ้ำกับรูปที่เพิ่มแล้ว กรุณาใช้ภาพคนละมุม'); added.push(p); }
      draft.photos.push(...added); draft.coverId ||= draft.photos[0]?.id; busy = false; refresh();
    } catch (err) { fail(err); }
  });
  const defectForm = defect => h('div', { className: 'panel-defect card stack' },
    h('div', { className: 'row' }, h('strong', {}, 'รายละเอียดตำหนิ'), btn(ctx, 'ลบตำหนิ', () => { draft.defects = draft.defects.filter(d => d !== defect); refresh(); }, 'btn ghost')),
    h('div', { className: 'panel-form-grid' }, field('รูปตำหนิ', select(defect.photoId, { '': 'เลือกรูป', ...Object.fromEntries(draft.photos.filter(p => p.tag === 'defect').map((p, i) => [p.id, `รูปตำหนิ ${i + 1}`])) }, v => { defect.photoId = v; })), field('ประเภท', select(defect.type, { stain: 'คราบ', snag: 'ด้ายรัน / ขุย', fade: 'สีซีด', tear: 'รอยขาด', other: 'อื่น ๆ' }, v => { defect.type = v; })), field('ระดับ', select(defect.severity, { minor: 'เล็กน้อย', visible: 'มองเห็นชัด', functional: 'กระทบการใช้งาน' }, v => { defect.severity = v; }))),
    field('อธิบายตำแหน่งและลักษณะ', input(defect.description, v => { defect.description = v; }, { maxLength: 500, placeholder: 'เช่น คราบจางขนาด 1 ซม. บริเวณชายเสื้อ' })), h('label', { className: 'panel-check' }, h('input', { type: 'checkbox', checked: defect.cleanable, onChange: e => { defect.cleanable = e.target.checked; } }), 'ผู้ขายประเมินว่าอาจทำความสะอาดได้ (ไม่รับประกันผล)'));
  const renderPhotos = () => h('div', { className: 'stack' },
    h('div', {}, h('h3', {}, 'รูปจริงช่วยให้ตัดสินใจง่าย'), note('อย่างน้อย 3 ภาพ แนะนำด้านหน้า ด้านหลัง ป้าย และตำหนิถ้ามี เก็บไฟล์ต้นฉบับโดยไม่ปรับแต่งสีหรือซ่อนตำหนิ')),
    h('label', { className: `panel-upload ${busy ? 'is-busy' : ''}` }, h('span', { className: 'panel-upload-icon', 'aria-hidden': 'true' }, '+'), h('strong', {}, busy ? 'กำลังตรวจสอบรูป…' : 'เพิ่มรูปสินค้า'), h('span', { className: 'muted' }, 'JPEG / PNG / WebP · ไม่เกิน 10 MB ต่อรูป'), h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, disabled: busy, 'aria-label': 'เพิ่มรูปสินค้า', onChange: e => addPhotos([...e.target.files]) })),
    h('div', { className: 'panel-photo-grid' }, ...draft.photos.map((p, i) => h('article', { className: 'panel-photo-card' }, h('img', { src: photoUrl(p), alt: `รูปสินค้า ${i + 1} ${TAGS[p.tag]}` }), field(`รูป ${i + 1}`, select(p.tag, TAGS, v => { p.tag = v; refresh(); })), h('div', { className: 'panel-photo-actions' }, btn(ctx, draft.coverId === p.id ? '✓ ภาพปก' : 'ใช้เป็นปก', () => { draft.coverId = p.id; refresh(); }, `btn ${draft.coverId === p.id ? '' : 'secondary'}`), btn(ctx, 'ลบ', () => { draft.photos = draft.photos.filter(q => q.id !== p.id); draft.defects = draft.defects.filter(d => d.photoId !== p.id); if (draft.coverId === p.id) draft.coverId = draft.photos[0]?.id || null; refresh(); }, 'btn ghost', { 'aria-label': `ลบรูป ${i + 1}` }))))),
    note(`เพิ่มแล้ว ${draft.photos.length} รูป · ภาพปกจะแสดงในหน้าร้าน`));
  const renderDetails = () => h('div', { className: 'stack' },
    h('div', { className: 'panel-form-grid' }, field('ประเภทสินค้า', select(draft.type, TYPES, v => { draft.type = v; refresh(); })), field('ชนิดย่อย', input(draft.subtype, v => { draft.subtype = v; }, { placeholder: 'เช่น เสื้อเชิ้ต', maxLength: 80 })), field('แบรนด์', input(draft.brand, v => { draft.brand = v; }, { placeholder: 'เว้นว่างหากไม่ทราบ', maxLength: 80 })), field('สี', input(draft.color, v => { draft.color = v; }, { placeholder: 'เช่น ครีม', maxLength: 50 })), field('ไซซ์บนป้าย', select(draft.size, { S: 'S', M: 'M', L: 'L', XL: 'XL' }, v => { draft.size = v; })), field('สไตล์', select(draft.style, { minimal: 'มินิมอล', casual: 'ลำลอง', smart: 'สมาร์ต', street: 'สตรีต' }, v => { draft.style = v; })), field('ทรงที่ผู้ขายระบุ', select(draft.fit, { regular: 'พอดีตัว', relaxed: 'หลวม', slim: 'เข้ารูป' }, v => { draft.fit = v; })), field('ราคา (บาท)', input(draft.price, v => { draft.price = v === '' ? '' : Number(v); }, { type: 'number', min: 1, step: 1 }))),
    h('div', { className: 'panel-section stack' }, h('h3', {}, 'ขนาดที่วัดจริง'), note('วัดรอบตัวเป็นเซนติเมตร ไม่ใช่ความกว้างครึ่งตัว ใช้ประกอบการประเมินไซซ์เท่านั้น'), h('div', { className: 'panel-form-grid' }, ...dimensions().map(key => field(`${dimensionLabels[key]} (ซม.)`, input(draft.measurements[key], v => { draft.measurements[key] = v === '' ? '' : Number(v); }, { type: 'number', min: 0.1, max: 300, step: 0.1 }))))),
    h('div', { className: 'panel-section stack' }, field('สภาพสินค้า', select(draft.condition, CONDITIONS, v => { draft.condition = v; refresh(); })), draft.condition === 'defect' && h('div', { className: 'stack' }, note('เลือกแท็กรูปเป็น “ตำหนิ” ในขั้นตอนแรก แล้วเชื่อมกับรายละเอียดแต่ละจุด'), ...draft.defects.map(defectForm), btn(ctx, '+ เพิ่มตำหนิ', () => { draft.defects.push({ photoId: draft.photos.find(p => p.tag === 'defect')?.id || '', type: 'stain', severity: 'minor', description: '', cleanable: false }); refresh(); }, 'btn secondary')), draft.condition !== 'defect' && draft.defects.length > 0 && note('ยังมีข้อมูลตำหนิอยู่ กรุณาเปลี่ยนสภาพกลับเป็น “มีตำหนิ” หรือลบรายละเอียดตำหนิให้ตรงกับสินค้าจริง')),
    h('div', { className: 'panel-section stack' }, h('h3', {}, 'รูปสำหรับลองชุด (ไม่บังคับ)'), note('เพิ่ม PNG ตัวสินค้าพื้นหลังโปร่งใสเพื่อใช้วางซ้อนในห้องลองชุด รูปนี้แยกจากแกลเลอรีรูปจริง'), draft.tryOn && h('div', { className: 'panel-cutout-row' }, h('img', { src: photoUrl(draft.tryOn), alt: 'รูปโปร่งใสสำหรับลองชุด', className: 'panel-cutout' }), btn(ctx, 'นำรูปลองชุดออก', () => { draft.tryOn = null; refresh(); }, 'btn ghost')), field('อัปโหลด PNG โปร่งใส', h('input', { type: 'file', accept: 'image/png', onChange: e => { const file = e.target.files[0]; if (file) ctx.task(async () => { try { draft.tryOn = await transparentCutout(file); errors = []; refresh(); } catch (err) { fail(err); } }); } }))),
    h('div', { className: 'panel-section stack' }, h('div', { className: 'row' }, h('h3', {}, 'ชื่อและคำอธิบาย'), btn(ctx, 'ช่วยร่างจากข้อมูลที่กรอก', () => {
      const specs = dimensions().filter(k => Number(draft.measurements[k]) > 0).map(k => `${dimensionLabels[k]} ${draft.measurements[k]} ซม.`).join(' · ');
      draft.title = [draft.brand.trim(), draft.subtype.trim() || TYPES[draft.type], draft.color.trim() && `สี${draft.color.trim()}`, `ไซซ์ ${draft.size}`].filter(Boolean).join(' ');
      draft.description = [`${draft.title} สภาพ${CONDITIONS[draft.condition]}`, specs && `ขนาดที่วัดจริง: ${specs}`, ...draft.defects.filter(d => d.description.trim()).map(d => `ตำหนิ: ${d.description.trim()}`)].filter(Boolean).join('\n'); generated = true; refresh();
    }, 'btn secondary')), note('ร่างตามกฎจากข้อมูลที่คุณกรอกเท่านั้น กรุณาตรวจทานก่อนเผยแพร่'), generated && badge('สร้างร่างแล้ว · แก้ไขต่อได้'), field('ชื่อสินค้า', input(draft.title, v => { draft.title = v; }, { maxLength: 160, required: true })), field('คำอธิบาย', h('textarea', { rows: 5, maxLength: 3000, value: draft.description, onInput: e => { draft.description = e.target.value; } }))));
  const renderReview = () => {
    const pricing = priceAdvice(draft, ctx.state.listings);
    return h('div', { className: 'stack' }, h('h3', {}, 'ตรวจข้อมูลก่อนเผยแพร่'), draft.photos.length > 0 && listingLine(ctx, draft), h('p', { className: 'panel-description' }, draft.description), h('div', { className: 'panel-review-specs' }, ...dimensions().map(k => h('div', {}, h('span', { className: 'muted' }, dimensionLabels[k]), h('strong', {}, `${draft.measurements[k] || '—'} ซม.`)))), badge(CONDITIONS[draft.condition]), ...draft.defects.map(d => h('p', { className: 'panel-defect-summary' }, `ตำหนิ: ${d.description}`)), h('div', { className: 'panel-insight' }, h('strong', {}, 'ข้อมูลราคาเพื่อประกอบการตัดสินใจ'), note(pricing.enough ? `ราคาตั้งขายเทียบเคียง ${pricing.count} ชิ้น · ช่วงขายไว ${money(pricing.low)}–${money(pricing.high)} · ไม่ใช่ราคาซื้อขายสำเร็จ` : pricing.reason || 'ยังมีสินค้าเทียบเคียงไม่เพียงพอ')), note('เมื่อเผยแพร่ สินค้าจะปรากฏในหน้าร้านของเบราว์เซอร์นี้ รูปต้นฉบับยังคงเหมือนที่อัปโหลด'));
  };
  const render = () => h('div', { className: 'stack listing-panel' },
    h('ol', { className: 'listing-steps' }, ...['รูปสินค้า', 'รายละเอียด', 'ตรวจและเผยแพร่'].map((text, i) => h('li', { className: step === i + 1 ? 'current' : step > i + 1 ? 'done' : '', 'aria-current': step === i + 1 ? 'step' : undefined }, h('span', {}, step > i + 1 ? '✓' : i + 1), text))),
    advice && h('div', { className: 'panel-insight' }, h('strong', {}, 'คำแนะนำสำหรับสินค้าชิ้นนี้'), h('p', {}, advice.reason), advice.kind === 'price' && btn(ctx, `ใช้ราคาแนะนำ ${money(advice.targetPrice)}`, () => { draft.price = advice.targetPrice; refresh(); }, 'btn secondary'), note('รีเฟรชตำแหน่งได้เมื่อบันทึกราคาเข้าเกณฑ์หรือเปลี่ยนภาพปกตามคำแนะนำจริง')),
    errors.length > 0 && h('div', { className: 'panel-error', role: 'alert' }, h('strong', {}, 'กรุณาตรวจสอบ'), h('ul', {}, ...errors.map(err => h('li', {}, err)))),
    step === 1 ? renderPhotos() : step === 2 ? renderDetails() : renderReview(),
    h('div', { className: 'panel-footer' }, step > 1 ? btn(ctx, 'ย้อนกลับ', () => { step--; errors = []; refresh(); }, 'btn secondary') : note('3 ขั้นตอนสั้น ๆ เพื่อส่งต่อชิ้นโปรด'), step < 3 ? btn(ctx, 'ถัดไป', () => { errors = []; if (step === 1 && (draft.photos.length < 3 || !draft.photos.some(p => p.tag === 'front'))) { errors = ['เพิ่มอย่างน้อย 3 รูป และระบุรูปด้านหน้าอย่างน้อย 1 รูป']; refresh(); return; } if (step === 2) { errors = validateListing(draft); if (errors.length) { refresh(); return; } } step++; refresh(); }, 'btn', { disabled: busy }) : btn(ctx, existing ? 'บันทึกการแก้ไข' : 'เผยแพร่สินค้า', async () => { if (me(ctx) !== owner) throw new Error('บัญชีเปลี่ยนแล้ว กรุณาเปิดรายการใหม่'); errors = validateListing(draft); if (errors.length) { refresh(); return; } await ctx.run('listing.save', { listing: draft, ...(adviceId ? { adviceId } : {}) }); ctx.toast(existing ? 'บันทึกสินค้าแล้ว' : 'เผยแพร่สินค้าแล้ว'); openCloset(ctx, 'selling'); })));
  refresh();
}

const CLOSET_TABS = { selling: 'สินค้าของฉัน', favorites: 'ที่ถูกใจ', searches: 'คำค้นที่บันทึก', offers: 'ข้อเสนอ', orders: 'คำสั่งซื้อ', advice: 'คำแนะนำ', reports: 'รายงาน', revenue: 'รายรับ' };
export function openCloset(ctx, tab = 'selling') {
  if (!requireAccount(ctx)) return;
  const render = () => h('div', { className: 'stack closet-panel' },
    h('div', { className: 'panel-heading' }, h('div', {}, h('p', { className: 'panel-eyebrow' }, 'MY CLOSET'), h('h3', {}, `ตู้เสื้อผ้าของ ${name(ctx, me(ctx))}`)), btn(ctx, '+ ลงขายสินค้า', () => openListing(ctx))),
    h('div', { className: 'panel-tabs', role: 'tablist', 'aria-label': 'ตู้เสื้อผ้าของฉัน' }, ...Object.entries(CLOSET_TABS).map(([key, title]) => btn(ctx, title, () => { tab = key; refresh(); }, `panel-tab ${tab === key ? 'selected' : ''}`, { role: 'tab', 'aria-selected': tab === key }))),
    closetContent(ctx, tab));
  const refresh = () => ctx.modal('My Closet', render, { wide: true }); refresh();
}
function closetContent(ctx, tab) {
  const own = ctx.state.listings.filter(l => l.sellerId === me(ctx) && l.status !== 'deleted');
  if (tab === 'selling') return own.length ? h('div', { className: 'stack' }, ...own.map(l => listingLine(ctx, l, [badge(STATUS[l.status]), btn(ctx, 'ดูสินค้า', () => ctx.openProduct(l.id), 'btn ghost'), ...(!['sold', 'reserved'].includes(l.status) ? [btn(ctx, 'แก้ไข', () => openListing(ctx, l.id), 'btn secondary'), btn(ctx, l.status === 'paused' ? 'เปิดขาย' : 'พักขาย', () => ctx.run('listing.status', { id: l.id, status: l.status === 'paused' ? 'active' : 'paused' }), 'btn ghost'), btn(ctx, 'ลบ', () => confirmDelete(ctx, l), 'btn ghost')] : [])]))) : empty('ยังไม่มีสินค้าในตู้ เริ่มส่งต่อชิ้นแรกกัน', btn(ctx, 'ลงขายสินค้า', () => openListing(ctx)));
  if (tab === 'favorites') { const favorites = ctx.state.listings.filter(l => (ctx.state.favorites[me(ctx)] || []).includes(l.id) && l.status !== 'deleted'); return favorites.length ? h('div', { className: 'stack' }, ...favorites.map(l => listingLine(ctx, l, [badge(STATUS[l.status]), btn(ctx, 'ดูสินค้า', () => ctx.openProduct(l.id), 'btn secondary'), btn(ctx, 'เลิกถูกใจ', () => ctx.run('favorite.toggle', { id: l.id }), 'btn ghost')]))) : empty('เก็บชิ้นที่ชอบไว้ แล้วกลับมาดูเมื่อพร้อม'); }
  if (tab === 'searches') { const rows = ctx.state.savedSearches?.[me(ctx)] || []; const names={q:'คำค้น',type:'ประเภท',size:'ไซซ์',color:'สี',brand:'แบรนด์',minPrice:'ราคาตั้งแต่',maxPrice:'ราคาไม่เกิน',condition:'สภาพ',sort:'เรียง'}; return rows.length ? h('div',{className:'stack'},note('บันทึกไว้ในเบราว์เซอร์นี้เพื่อย้อนดูเงื่อนไข การแจ้งเตือนสินค้าใหม่เป็นงานต่อยอด'),...rows.map(row=>h('article',{className:'card stack'},h('strong',{},Object.entries(row.filters).map(([k,v])=>`${names[k]||k}: ${v}`).join(' · ')),note(dt(row.createdAt))))) : empty('ยังไม่มีคำค้นที่บันทึก'); }
  if (tab === 'offers') return offersContent(ctx);
  if (tab === 'orders') return ordersContent(ctx);
  if (tab === 'advice') { const items = ctx.state.advice.filter(a => !a.usedAt && own.some(l => l.id === a.listingId && l.status === 'active')); return h('div', { className: 'stack' }, note('คำแนะนำสำหรับสินค้าที่เปิดขายเกิน 14 วัน เปลี่ยนตามเกณฑ์แล้วจึงรีเฟรชได้ และเว้นระยะ 7 วัน'), items.length ? items.map(a => { const l = own.find(x => x.id === a.listingId); return h('article', { className: 'card panel-advice stack' }, listingLine(ctx, l), badge(a.kind === 'price' ? 'ลองปรับราคา' : 'ลองเปลี่ยนภาพปก'), h('p', {}, a.reason), a.targetPrice != null && h('strong', {}, `ราคาแนะนำ ${money(a.targetPrice)}`), btn(ctx, 'ปรับตามคำแนะนำ', () => openListing(ctx, l.id, a.id), 'btn secondary')); }) : empty('ยังไม่มีคำแนะนำใหม่สำหรับสินค้าของคุณ')); }
  if (tab === 'reports') { const reports = ctx.state.reports.filter(r => r.reporterId === me(ctx)); return reports.length ? h('div', { className: 'stack' }, note('รายงานถูกบันทึกในเครื่องเพื่อสาธิต ไม่มีทีมงานภายนอกตรวจสอบ'), ...reports.map(r => h('article', { className: 'card stack' }, badge('รับรายงานแล้ว'), h('strong', {}, ctx.state.listings.find(l => l.id === r.listingId)?.title || 'สินค้า'), h('p', {}, `${r.target === 'seller' ? 'รายงานผู้ขาย' : 'รายงานสินค้า'} · ${r.reason}`), note(dt(r.at))))) : empty('ยังไม่มีรายงานที่คุณส่ง'); }
  if (tab === 'revenue') { const orders = ctx.state.orders.filter(o => o.sellerId === me(ctx)); const complete = orders.filter(o => o.status === 'completed'); const pending = orders.filter(o => ['paid', 'shipped'].includes(o.status)); const itemsTotal = list => list.reduce((s, o) => s + o.items.reduce((t, i) => t + i.price, 0), 0); return h('div', { className: 'stack' }, h('div', { className: 'panel-stats' }, h('div', { className: 'card' }, note('ยอดสินค้าสำเร็จ'), h('strong', {}, money(itemsTotal(complete)))), h('div', { className: 'card' }, note('รอส่ง / รอผู้ซื้อรับ'), h('strong', {}, money(itemsTotal(pending)))), h('div', { className: 'card' }, note('คำสั่งซื้อสำเร็จ'), h('strong', {}, complete.length))), note('ยอดสินค้าไม่รวมค่าจัดส่ง เป็นข้อมูลจำลองจากคำสั่งซื้อของบัญชีนี้ ไม่มีการรับเงินจริง'), ...complete.map(o => h('div', { className: 'card row' }, h('span', {}, `คำสั่งซื้อ ${o.id.slice(-8)}`), h('strong', {}, money(itemsTotal([o])))))); }
  return empty('ไม่พบหมวดนี้');
}
function confirmDelete(ctx, listing) {
  ctx.modal('ลบสินค้านี้', () => h('div', { className: 'stack' }, h('p', {}, `นำ “${listing.title}” ออกจากหน้าร้านและตู้เสื้อผ้าของคุณ?`), h('div', { className: 'row' }, btn(ctx, 'กลับ', () => openCloset(ctx), 'btn secondary'), btn(ctx, 'ยืนยันลบสินค้า', async () => { await ctx.run('listing.status', { id: listing.id, status: 'deleted' }); openCloset(ctx); }))));
}

export function openCart(ctx) {
  if (!requireAccount(ctx)) return;
  const render = () => {
    const listings = (ctx.state.carts[me(ctx)] || []).map(id => ctx.state.listings.find(l => l.id === id)).filter(Boolean);
    if (!listings.length) return empty('ตะกร้ายังว่าง เลือกชิ้นที่ใช่สำหรับคุณ', btn(ctx, 'ไปเลือกสินค้า', () => { ctx.close(); ctx.goShop(); }));
    const groups = Map.groupBy ? Map.groupBy(listings, l => l.sellerId) : listings.reduce((map, l) => map.set(l.sellerId, [...(map.get(l.sellerId) || []), l]), new Map());
    const now = Date.now() + ctx.state.settings.clockOffsetDays * 86400000;
    const price = l => [...ctx.state.offers].reverse().find(o => o.listingId === l.id && o.buyerId === me(ctx) && o.status === 'accepted' && o.expiresAt > now)?.amount ?? l.price;
    let total = 0;
    const blocks = [...groups].map(([sellerId, items]) => {
      const shipping = ctx.state.profiles.find(p => p.id === sellerId)?.shippingFee ?? 40;
      const subtotal = items.reduce((s, l) => s + price(l), 0); total += subtotal + shipping;
      return h('section', { className: 'card stack cart-group' }, h('div', { className: 'row' }, h('h3', {}, `ร้าน ${name(ctx, sellerId)}`), badge(`${items.length} ชิ้น`)), ...items.map(l => listingLine(ctx, { ...l, price: price(l) }, [l.status !== 'active' && badge('ไม่พร้อมขาย'), price(l) !== l.price && badge('ราคาที่ตกลง'), btn(ctx, 'นำออก', () => ctx.run('cart.remove', { id: l.id }), 'btn ghost')])), h('div', { className: 'panel-summary-line' }, h('span', {}, 'ค่าส่งร้านนี้ (ครั้งเดียว)'), h('strong', {}, money(shipping))), h('div', { className: 'panel-summary-line' }, h('span', {}, 'รวมร้านนี้'), h('strong', {}, money(subtotal + shipping))));
    });
    return h('div', { className: 'stack cart-panel' }, note('แยกคำสั่งซื้อตามผู้ขาย คิดค่าส่งหนึ่งครั้งต่อร้าน และใช้ข้อเสนอที่ตกลงแล้วหากยังไม่หมดอายุ'), ...blocks, h('div', { className: 'panel-total' }, h('span', {}, 'ยอดรวมทั้งหมด'), h('strong', {}, money(total))), note('ยืนยันแล้วสินค้าจะถูกจอง 15 นาที ชำระเงินแต่ละคำสั่งซื้อในหน้าถัดไป'), btn(ctx, `ยืนยันสั่งซื้อ ${groups.size} ร้าน`, async () => { await ctx.run('checkout.create', {}); ctx.toast('สร้างคำสั่งซื้อและจองสินค้าแล้ว'); openOrders(ctx); }));
  };
  ctx.modal('ตะกร้าของคุณ', render, { wide: true });
}

export function openOffers(ctx) { if (requireAccount(ctx)) ctx.modal('ข้อเสนอของคุณ', () => offersContent(ctx), { wide: true }); }
function offersContent(ctx) {
  const offers = ctx.state.offers.filter(o => o.buyerId === me(ctx) || o.sellerId === me(ctx)).slice().sort((a, b) => b.history[0].at - a.history[0].at);
  if (!offers.length) return empty('ยังไม่มีข้อเสนอ เลือก “เสนอราคา” ในหน้าสินค้า');
  return h('div', { className: 'stack' }, note('ข้อเสนอมีอายุ 24 ชั่วโมง การตอบรับยังไม่จองสินค้า ผู้ซื้อต้องเพิ่มลงตะกร้าและยืนยันสั่งซื้อ'), ...offers.map(o => {
    const l = ctx.state.listings.find(x => x.id === o.listingId); const isBuyer = o.buyerId === me(ctx); const actionable = o.status === 'pending' && o.responderId === me(ctx);
    return h('article', { className: 'card stack offer-card' }, h('div', { className: 'row' }, badge(isBuyer ? `ซื้อจาก ${name(ctx, o.sellerId)}` : `เสนอโดย ${name(ctx, o.buyerId)}`), badge(STATUS[o.status])), h('strong', {}, l?.title || 'สินค้า'), h('div', { className: 'panel-summary-line' }, h('span', {}, 'ข้อเสนอล่าสุด'), h('strong', { className: 'panel-price' }, money(o.amount))), note(`หมดอายุ ${dt(o.expiresAt)}`), h('details', {}, h('summary', {}, 'ประวัติการเสนอราคา'), h('ul', { className: 'panel-history' }, ...o.history.map(v => h('li', {}, `${name(ctx, v.by)} · ${{ create: 'เสนอราคา', counter: 'เสนอราคากลับ', accept: 'ตอบรับ', reject: 'ปฏิเสธ', expire: 'หมดอายุ' }[v.action] || v.action}${v.amount != null ? ` ${money(v.amount)}` : ''} · ${dt(v.at)}`)))), actionable ? h('div', { className: 'panel-actions' }, btn(ctx, 'ยอมรับราคา', () => ctx.run('offer.respond', { id: o.id, response: 'accept' })), btn(ctx, 'เสนอราคากลับ', () => counterOffer(ctx, o), 'btn secondary'), btn(ctx, 'ปฏิเสธ', () => ctx.run('offer.respond', { id: o.id, response: 'reject' }), 'btn ghost')) : o.status === 'pending' ? note('รออีกฝ่ายตอบกลับ') : o.status === 'accepted' && isBuyer && l?.status === 'active' ? btn(ctx, 'เพิ่มลงตะกร้า', async () => { await ctx.run('cart.add', { ids: [o.listingId] }); openCart(ctx); }) : null);
  }));
}
function counterOffer(ctx, offer) {
  let amount = offer.amount;
  ctx.modal('เสนอราคากลับ', () => h('form', { className: 'stack', onSubmit: e => { e.preventDefault(); ctx.task(async () => { await ctx.run('offer.respond', { id: offer.id, response: 'counter', amount: Number(amount) }); openOffers(ctx); }); } }, note(`ราคาล่าสุด ${money(offer.amount)}`), field('ราคาที่ต้องการเสนอ (บาท)', input(amount, v => { amount = v; }, { type: 'number', min: 1, step: 1, required: true })), h('button', { type: 'submit', className: 'btn' }, 'ส่งราคากลับ')));
}

export function openOrders(ctx) { if (requireAccount(ctx)) ctx.modal('คำสั่งซื้อของคุณ', () => ordersContent(ctx), { wide: true }); }
function ordersContent(ctx) {
  const orders = ctx.state.orders.filter(o => o.buyerId === me(ctx) || o.sellerId === me(ctx)).slice().sort((a, b) => b.createdAt - a.createdAt);
  if (!orders.length) return empty('ยังไม่มีคำสั่งซื้อ');
  return h('div', { className: 'stack' }, note('ระบบสาธิต ไม่มีการตัดเงินจริงหรือจัดส่งพัสดุจริง'), ...orders.map(o => {
    const buyer = o.buyerId === me(ctx);
    return h('article', { className: 'card stack order-card' }, h('div', { className: 'row' }, h('strong', {}, `#${o.id.slice(-8)}`), badge(STATUS[o.status])), note(`${buyer ? `ซื้อจาก ${name(ctx, o.sellerId)}` : `ขายให้ ${name(ctx, o.buyerId)}`} · ${dt(o.createdAt)}`), ...o.items.map(i => listingLine(ctx, { ...i.snapshot, price: i.price })), h('div', { className: 'panel-summary-line' }, h('span', {}, 'ค่าส่ง'), h('span', {}, money(o.shippingFee))), h('div', { className: 'panel-total' }, h('span', {}, 'รวม'), h('strong', {}, money(o.total))), o.status === 'pending_payment' && note(`จองถึง ${dt(o.reservedUntil)} จากนั้นคืนสินค้าสู่หน้าร้านอัตโนมัติเมื่อระบบตรวจสอบ`), h('div', { className: 'panel-actions' }, buyer && o.status === 'pending_payment' && btn(ctx, 'ชำระเงินจำลอง', async () => { await ctx.run('order.pay', { id: o.id }); ctx.toast('บันทึกการชำระเงินจำลองแล้ว'); }), buyer && o.status === 'pending_payment' && btn(ctx, 'ยกเลิกคำสั่งซื้อ', () => ctx.run('order.cancel', { id: o.id }), 'btn secondary'), !buyer && o.status === 'paid' && btn(ctx, 'ยืนยันจัดส่งจำลอง', () => ctx.run('order.ship', { id: o.id })), buyer && o.status === 'shipped' && btn(ctx, 'ยืนยันรับสินค้า', () => ctx.run('order.complete', { id: o.id }))), h('details', {}, h('summary', {}, 'ประวัติคำสั่งซื้อ'), h('ul', { className: 'panel-history' }, ...o.history.map(v => h('li', {}, `${STATUS[v.status] || v.status} · ${dt(v.at)}`)))));
  }));
}

export function openNotifications(ctx) {
  if (!requireAccount(ctx)) return;
  ctx.modal('การแจ้งเตือน', () => {
    const items = ctx.state.notifications.filter(n => n.userId === me(ctx)).slice().sort((a, b) => b.at - a.at);
    return h('div', { className: 'stack' }, items.some(n => !n.read) && btn(ctx, 'อ่านทั้งหมดแล้ว', () => ctx.run('notification.read', {}), 'btn secondary'), items.length ? items.map(n => h('article', { className: `card notification-row ${n.read ? '' : 'unread'}` }, !n.read && h('span', { className: 'notification-dot', 'aria-label': 'ยังไม่อ่าน' }), h('div', {}, h('p', {}, n.text), note(dt(n.at))))) : empty('ยังไม่มีการแจ้งเตือน'));
  });
}
export function openReport(ctx, listingId) {
  if (!requireAccount(ctx)) return;
  const listing = ctx.state.listings.find(l => l.id === listingId); if (!listing) return;
  let target = 'listing'; let reason = '';
  ctx.modal('รายงานปัญหา', () => h('form', { className: 'stack', onSubmit: e => { e.preventDefault(); ctx.task(async () => { await ctx.run('report.create', { listingId, target, reason }); ctx.toast('บันทึกรายงานแล้ว'); openCloset(ctx, 'reports'); }); } }, h('strong', {}, listing.title), field('ต้องการรายงาน', select(target, { listing: 'สินค้า', seller: 'ผู้ขาย' }, v => { target = v; })), field('รายละเอียดปัญหา', h('textarea', { rows: 5, maxLength: 2000, minLength: 5, required: true, value: reason, placeholder: 'อธิบายปัญหาที่พบ', onInput: e => { reason = e.target.value; } })), note('รายงานถูกเก็บในเบราว์เซอร์นี้เพื่อสาธิต ไม่ได้ส่งไปยังทีมตรวจสอบภายนอก'), h('button', { className: 'btn', type: 'submit' }, 'ส่งรายงาน')));
}
