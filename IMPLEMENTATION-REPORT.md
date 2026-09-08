# Cosplay Marketplace MVP — Implementation Report

## ขอบเขตที่ส่งมอบ

เว็บเดิมถูกเปลี่ยนเป็น **CLOSET — Cosplay Marketplace** โดยยังใช้ HTML, CSS และ JavaScript modules และคงข้อมูลแบบ local-first ใน IndexedDB ระบบใหม่แยก state ด้วยคีย์ `cosplay-v1` ในฐานข้อมูลเดิม ส่วนคีย์ Closet เก่า `main` ไม่ถูกลบหรือแก้รูปแบบ

หน้าและเส้นทางหลักที่ใช้งานได้:

- Marketplace: สินค้าสาธิตออริจินัล 12 ชุด ค้นหาตัวละคร/ชื่อชุด กรองไซซ์ ราคา สภาพ และบันทึกรายการโปรด
- Product Detail: แกลเลอรีตรงกับสินค้า เลือกไซซ์ ดูขนาดจริง ภาพตำหนิ ซูม เลื่อน Try On และ Buy Now
- My Mannequin: preset Slim/Regular/Curvy ปรับส่วนสูง อก เอว สะโพก ไหล่ แสดงผลทันที บันทึกแยกบัญชี
- Virtual Try-On: เลเยอร์วิก ชุดหลัก เสื้อคลุม รองเท้า และเครื่องประดับ ปรับตามขนาดของ variant พร้อม Fit Summary
- Direct Purchase: ตรวจสต็อกล่าสุด ตัด variant ที่เลือก เก็บ snapshot แล้วแสดง Order Confirmed
- Seller: ลงขาย 4 ขั้น หลายไซซ์ ภาพต้นฉบับ ตำหนิ PNG โปร่งใส พรีวิวหุ่นมาตรฐาน ราคา และเผยแพร่
- My Closet: My Listings, Sold, Purchases, Saved, My Mannequin และ Earnings

## โครงสร้างสำคัญ

- `cosplay-domain.js`: validation และ state transition ทั้งหมด รวมสิทธิ์บัญชีและกฎซื้อ
- `cosplay-seed.js`: seed state และรายการสาธิต 12 ชุด
- `repository.js`: IndexedDB repository ใหม่ การอ่าน-เขียนหนึ่ง transaction และ BroadcastChannel ระหว่างแท็บ
- `mannequin.js`: กฎ fit, validation, geometry และ SVG renderer
- `cosplay-seller.js`: workflow ลงขายและแก้ไขประกาศ
- `app.js`: routing และ UI buyer/seller
- `cosplay-assets/`: แกลเลอรีและเลเยอร์ SVG ที่สร้างในโปรเจกต์ ไม่มีภาพบุคคลหรือ asset ภายนอก

## กฎ Fit ที่ใช้

อก เอว และสะโพกเปรียบเทียบ `ขนาดชุด - ขนาดร่างกาย`: ต่ำกว่า 0 = Tight, 0–6 = Good, มากกว่า 6–12 = Slightly Loose และมากกว่า 12 = Loose ไหล่ใช้ช่วง 0–2 และ 2–4 ซม. ความยาวใช้จุดปลายชุดเอว/เข่า/ข้อเท้าเทียบกับสัดส่วนความสูง และยอมรับคลาดเคลื่อน ±5 ซม. ข้อมูลที่ขาดคืนค่า “ยังประเมินไม่ได้”

ข้อความ `Virtual preview is an estimation and does not guarantee actual fit.` แสดงติดกับผลประเมินทุกครั้ง

SVG เหมาะกับต้นแบบนี้เพราะ path และองค์ประกอบภายในปรับ geometry ได้โดยตรงตามสัดส่วนแต่ละจุด [MDN: SVG path](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/path) ส่วนการซื้อใช้ transaction เดียวตามรูปแบบการทำงานของ IndexedDB [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

## หลักฐานการตรวจ

- `npm test`: 39/39 ผ่าน
- JavaScript syntax: `app.js`, `repository.js`, `cosplay-domain.js`, `cosplay-seller.js`, `mannequin.js` ผ่าน
- Browser desktop 1440×1000 และ mobile 390×844: ไม่มี console/page error และไม่มี horizontal overflow
- Buyer flow ผ่าน: ค้นหา → รายละเอียด → Try On → แก้สัดส่วน → Save → Buy Now → Order Confirmed → Purchases → reload
- Seller flow ผ่าน: สลับบัญชี → ลงประกาศหลายไซซ์ → อัปโหลดภาพ → ตั้งราคา → Publish → Marketplace → fallback ไม่มีภาพซ้อน
- Seller accounting ผ่าน: คำสั่งซื้อปรากฏใน Sold และยอด Earnings ตรงกับ snapshot
- Browser concurrency ผ่าน: เปิดสองแท็บยืนยันซื้อ variant เดียวกันพร้อมกัน ระบบสร้างคำสั่งซื้อได้หนึ่งรายการและตัดสต็อกครั้งเดียว

## ข้อจำกัดที่ยังต้องมี backend ก่อนใช้งานจริง

การเข้าสู่ระบบ การจ่ายเงินจริง การจัดส่ง การยืนยันเจ้าของสินค้า การ moderation การซิงก์หลายเครื่อง การจัดเก็บไฟล์ถาวร และการล็อกสินค้าระหว่างผู้ใช้หลายอุปกรณ์ยังเป็นข้อมูลจำลองในเบราว์เซอร์ ภาพลองชุดยังเป็น 2D layer และไม่จำลองผ้า แสง ท่าทาง หรือความยืดหยุ่น
