# Closet — MVP Prototype Handoff

> เอกสารนี้รวมโจทย์ธุรกิจ, แนวคิด UX, สิ่งที่ทำแล้ว, ข้อจำกัด และวิธีเปิดใช้งาน เพื่อส่งต่อให้ Codex/ทีมพัฒนาต่อยอดได้ทันที

## 1) ภาพรวมผลิตภัณฑ์

**Closet** คือ fashion marketplace สำหรับเสื้อผ้ามือสองในประเทศไทย ผู้ใช้คนเดียวซื้อและขายได้ภายในบัญชีเดียว ไม่ต้องมีร้านค้าแยก

ภาพลักษณ์ที่ต้องรักษา:

- Minimal, modern, premium fashion marketplace — ไม่ใช่หน้าตา mass marketplace แบบ Shopee/Lazada
- โทน cream / off-white / black / light brown, ใช้ whitespace และภาพสินค้าใหญ่
- ภาษาไทยเป็นหลัก พร้อมคำอังกฤษสั้น ๆ สำหรับ mood ของแบรนด์
- Mobile-first แต่ใช้ได้ดีบน desktop

**หลักคิดสำคัญ:** MVP ต้องพิสูจน์ความน่าเชื่อถือ, listing ที่เร็ว และการซื้อขายที่ส่งมอบได้ก่อน ไม่ควรลงทุนกับ AI หรือ Virtual Try-On ที่ซับซ้อนก่อนมี transaction จริง

## 2) ขอบเขตที่ตกลงไว้

### ฟีเจอร์ MVP หลัก

1. **Discover** — สินค้า, ค้นหา, filter ตามประเภท, กดบันทึกสินค้า และ saved-search notification
2. **Product detail** — รูปใหญ่, สภาพสินค้า, ขนาดวัดจริง, seller verification, ซื้อทันที, เสนอราคา และบันทึกไว้
3. **Quick Listing** — อัปโหลดรูป, AI ร่างข้อมูล, ผู้ขายตรวจ/แก้ข้อมูล, บังคับเก็บ condition, defect และ garment measurement
4. **Offers** — ผู้ซื้อส่งราคา, ข้อเสนอหมดอายุ, ผู้ขายตอบรับ/ปฏิเสธ/เสนอใหม่ได้ในเวอร์ชันเชื่อม backend
5. **My Closet** — สินค้ากำลังขาย, รายการซื้อ, บันทึก, ข้อเสนอ, ยอดที่พร้อมถอน และสถานะยืนยันบัญชี
6. **Order** — flow สถานะ `Draft → Active → Reserved → Sold → Shipped → Completed / Disputed`
7. **Virtual Try-On prototype** — mannequin 2D สำหรับดู silhouette ตอนซื้อเท่านั้น พร้อมข้อความว่าไม่รับประกัน fit จริง

### สิ่งที่ตั้งใจ “ไม่ทำจริง” ใน prototype นี้

- ไม่รับเงินจริง, ไม่ทำ escrow, ไม่เปิด wallet หรือ payout จริง
- ไม่มี KYC, shipping API, tracking API หรือ PSP integration จริง
- ไม่มี AI model จริง: ปุ่ม AI เติมข้อมูลและแนะนำราคาเป็น rule/demo UI
- ไม่มีบัญชีผู้ใช้หรือฐานข้อมูล
- ไม่มี admin console, moderation queue, chat, notification service หรือ analytics event backend

## 3) สิ่งที่ต้องทำก่อนเปิดใช้งานจริง

### Trust & safety (P0)

- Verify เบอร์โทรก่อนลงขาย; verify ตัวตนและบัญชีรับเงินก่อนถอนหรือขายเกิน threshold
- บังคับใช้ condition taxonomy, defect photo, รูปสินค้าจริง, ป้าย/แบรนด์ถ้ามี และขนาดวัดจริงเป็นเซนติเมตร
- กำหนด prohibited-items/counterfeit policy; ช่วงเริ่มต้นควรงด luxury/high-counterfeit-risk หรือ review ก่อนเผยแพร่
- ทำ report, moderation queue, suspend/hide listing, audit log, reason code และเครื่องมือ refund/dispute สำหรับ admin
- ทำ in-app chat พร้อมป้องกันการชวนโอนเงินนอกระบบ, เก็บหลักฐานใน chat และมี notice & takedown flow

### Payment & logistics (P0)

- เลือก PSP ที่รองรับ marketplace และปรึกษากฎหมายก่อนรับ/พัก/จ่ายเงินแทนผู้ขาย
- นิยามสถานะและ deadline ที่แน่นอน: buyer ชำระ → seller ส่งภายใน SLA → tracking → buyer ยืนยัน/พ้น protection window → release payout
- ระบุให้ชัดเจนว่าใครจ่ายค่าส่ง, platform fee, กฎ cancellation, refund, dispute และ payout schedule ก่อนผู้ใช้กดทำรายการ
- แยก shipping address และข้อมูลส่วนบุคคลตาม role; มี retention/deletion policy และ PDPA review

### AI (ทำภายหลัง แต่ต้องมี guardrail)

- AI listing: ให้ร่าง title, description, brand, size, condition เท่านั้น; ผู้ใช้ต้องยืนยันทุก field ก่อน publish
- AI shopping assistant: query ได้เฉพาะ inventory จริงที่ Active, จ่ายได้ และยังไม่ถูก reserve
- Smart pricing: เริ่ม rule-based ตาม category/brand/condition/ราคาที่ขายจริง, แสดงช่วงราคา + เหตุผล + confidence; ห้ามแต่งราคาตลาดเมื่อข้อมูลไม่พอ
- AI negotiation: แนะนำข้อความได้ แต่ห้ามส่งหรือยอมรับ offer เอง

## 4) โครงสร้างไฟล์ที่ส่งต่อ

```text
new-chat/
├── index.html     # HTML structure และ content ของทุกหน้า/overlay
├── styles.css     # visual design, responsive layout, mannequin prototype
├── app.js         # mock data + interaction/state ของ prototype
└── outputs/
    └── Closet-handoff.md  # เอกสารฉบับนี้
```

### Source code ที่ต้องใช้

- [`index.html`](../index.html) — หน้า Discover, listing panel, product detail, offer, try-on และ My Closet
- [`styles.css`](../styles.css) — tokens สี/typography, desktop/mobile CSS และ UI states
- [`app.js`](../app.js) — product mock data, filter/search, modal, saved item, offer, listing AI demo และ notifications

> ก่อนแก้ไข ให้รักษาแนวคิด “one account, both buyer and seller” และอย่าสร้าง switch mode ที่พาผู้ใช้ไปคนละแอป

## 5) วิธีเปิดใช้งาน prototype

### วิธีเร็วที่สุด

เปิดไฟล์ `index.html` ใน browser ได้ทันที เพราะไม่มี dependency, build step หรือ server requirement

### วิธีใช้ local web server (แนะนำระหว่างพัฒนา)

โปรเจกต์นี้เป็น static HTML/CSS/JavaScript และยังไม่มี `package.json` หรือ dependency ให้ใช้ server ที่ไม่ต้องติดตั้ง package:

```powershell
cd C:\Users\Attitaya\Documents\Codex\2026-09-05\new-chat
python -m http.server 8000
```

จากนั้นเปิด `http://localhost:8000`

> ถ้าเครื่องไม่มี Python ให้เปิด `index.html` โดยตรง หรือสร้าง dev server ใน framework ที่เลือกในขั้นต่อไป

### ตรวจ syntax ของ JavaScript

```powershell
node --check app.js
```

## 6) พฤติกรรมที่มีใน prototype ปัจจุบัน

| จุดใช้งาน | ผลลัพธ์ปัจจุบัน |
| --- | --- |
| Search/filter | filter product mock data ใน browser ทันที |
| Product card | เปิด detail modal ของสินค้านั้น |
| Save | toggle หัวใจและแสดง toast |
| ซื้อเลย | สร้าง toast ว่าเป็น simulated order |
| เสนอราคา | เปิด form ราคา, ส่ง offer และแสดง toast |
| ลงขาย | เปิด Quick Listing; ปุ่ม AI เติมชื่อ/แบรนด์/condition และช่วงราคา demo |
| Try-on | เลือก petite/regular/tall แล้วปรับ label ขนาด mannequin |
| My Closet | แสดงสถานะ order/payout แบบ mock |

## 7) แผนย้ายจาก prototype ไปเป็น production

### Phase 1 — Foundation

- เลือก stack และสร้าง auth, user/profile, product/listing, image upload และ search index
- เพิ่ม role/permission แต่ผู้ใช้คนเดียวมี buyer + seller capability
- model listing stock เป็น 1 ชิ้น; ใช้ transaction/locking ป้องกันซื้อชนกัน
- เพิ่ม event schema: listing_created, product_viewed, favorite_added, offer_created, checkout_started, order_completed, dispute_opened

### Phase 2 — Marketplace transaction

- เชื่อม PSP/marketplace payout ที่ผ่านการตรวจด้านกฎหมาย
- เชื่อม shipping label/tracking, order-state machine, cancellation/refund/dispute
- seller verification tiers, admin queue, moderation/audit logs และ policy enforcement

### Phase 3 — Retention และ AI แบบมีข้อมูลรองรับ

- saved search + notification delivery
- rule-based pricing ที่ใช้ sold comparable จริง
- inventory-grounded shopping assistant และ assisted negotiation draft
- ประเมิน Virtual Try-On จากการใช้งานจริง; รักษาให้เป็น decision aid ไม่ใช่ fit guarantee

## 8) Acceptance criteria สำหรับ Codex ตัวถัดไป

- รันได้บน mobile และ desktop โดยไม่มี horizontal overflow
- ทุก action ที่เปลี่ยนสถานะต้อง feedback ชัดเจน (toast/screen state) และกลับมาหน้าสินค้าจริงได้
- Product listing ต้องบังคับ: title, condition, defect disclosure, material/brand เมื่อมี, photo และ garment measurements
- Product ที่ถูก reserve/sold ห้าม checkout ซ้ำ
- AI ต้องมี explicit confirmation ก่อน publish, send offer, accept offer หรือ buy
- ทุก order มี timeline และหลักฐานสำหรับ support/admin
- ใส่ disclaimer Virtual Try-On ทุกจุดที่แสดงผล mannequin

## 9) Design tokens ที่ควรรักษา

```css
--ink: #1d1c19;
--paper: #f8f6f1;
--cream: #eae3d7;
--line: #d8d2c8;
--tan: #b58d6a;
--muted: #746e66;
--green: #345b4d;
```

Typography: `DM Sans` สำหรับ UI, `DM Mono` สำหรับ metadata/status, `Playfair Display` สำหรับ headline/editorial emphasis

## 10) ข้อกำกับที่ต้อง validate ก่อน launch ไทย

- ไม่ควรสร้างหรืออ้างว่าเป็น escrow/payment operator เองโดยไม่ตรวจโมเดลกับ PSP และผู้เชี่ยวชาญด้านกฎหมาย
- ตรวจข้อกำหนดของ ETDA Digital Platform Service, PDPA, consumer protection, payment services, tax/accounting และ prohibited goods ตามโมเดลธุรกิจจริง
- เมื่อระบบเข้าข่าย marketplace ที่กำกับ ต้องมีข้อมูลผู้ขาย/สินค้า, moderation และ notice-and-takedown ที่ปฏิบัติได้จริง ไม่ใช่แค่ UI

## 11) แหล่งอ้างอิงจากการวางแผน

- [ธนาคารแห่งประเทศไทย — Payment Systems Act oversight](https://www.bot.or.th/th/our-roles/payment-systems/payment-act-oversight.html)
- [ETDA — ข้อกำกับตลาดสินค้าออนไลน์ภายใต้กฎหมาย DPS](https://www.etda.or.th/th/pr-news/CheckListDPS.aspx)
- [Depop — Significantly not as described](https://depophelp.zendesk.com/hc/en-gb/articles/360038455993-What-does-Depop-consider-significantly-not-as-described)
- [Depop — Prohibited items](https://depophelp.zendesk.com/hc/en-gb/articles/360001792167-What-are-Depop-s-prohibited-items)
