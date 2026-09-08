import { DAY } from './rules.js';

// Entirely fictional, first-party demo catalog. No image or condition is independently verified.
const catalog = [
 ['เสื้อเชิ้ตผ้าฝ้าย สีขาว','COS','top','shirt','ขาว','minimal','M',750,'good','u1',21],
 ['เสื้อเชิ้ตปกเปิด สีครีม','COS','top','shirt','ครีม','minimal','M',300,'good','u2',2],
 ['เสื้อเชิ้ตผ้าป๊อปลิน สีฟ้า','COS','top','shirt','ฟ้า','minimal','M',350,'good','u3',3],
 ['เสื้อคอปกทรงสบาย สีดำ','COS','top','shirt','ดำ','minimal','M',400,'good','u2',4],
 ['เสื้อเชิ้ตคอตตอน สีเบจ','COS','top','shirt','เบจ','minimal','S',450,'good','u3',5],
 ['เสื้อเชิ้ตแขนสั้น สีเขียว','COS','top','shirt','เขียว','casual','L',500,'good','u2',6],
 ['เสื้อเชิ้ตทรงหลวม สีน้ำตาล','COS','top','shirt','น้ำตาล','smart','M',600,'good','u3',7],
 ['เสื้อลินินคอวี สีเขียว','MUJI','top','blouse','เขียว','casual','M',220,'defect','u2',8],
 ['กางเกงทรงตรง สีดำ','UNIQLO','bottom','trousers','ดำ','minimal','M',390,'good','u2',1],
 ['กางเกงจีบหน้า สีเบจ','UNIQLO','bottom','trousers','เบจ','minimal','M',420,'good','u3',2],
 ['กางเกงขากว้าง สีน้ำตาล','UNIQLO','bottom','trousers','น้ำตาล','minimal','M',450,'good','u2',3],
 ['กางเกงผ้าทวิล สีเขียว','UNIQLO','bottom','trousers','เขียว','casual','L',480,'good','u3',4],
 ['กระโปรงพลีตยาว สีครีม','UNIQLO','bottom','skirt','ครีม','minimal','M',510,'good','u2',5],
 ['กระโปรงทรงเอ สีดำ','UNIQLO','bottom','skirt','ดำ','smart','S',550,'good','u3',6],
 ['ยีนส์เอวสูงทรงตรง สีฟ้า',"Levi's",'bottom','denim','ฟ้า','casual','M',690,'like_new','u2',2],
 ['ยีนส์ขากว้าง สีน้ำเงิน',"Levi's",'bottom','denim','น้ำเงิน','street','L',590,'good','u3',3],
 ['ยีนส์วินเทจเฟด สีฟ้า',"Levi's",'bottom','denim','ฟ้า','street','M',320,'defect','u2',12],
 ['กระโปรงมิดี้ สีน้ำตาล','ZARA','bottom','skirt','น้ำตาล','minimal','M',390,'like_new','u3',3],
 ['เบลเซอร์ทรงตรง สีดำ','COS','outerwear','blazer','ดำ','minimal','M',890,'like_new','u2',2],
 ['แจ็กเก็ตผ้าทวิล สีเบจ','MUJI','outerwear','jacket','เบจ','casual','M',450,'good','u1',18],
 ['เบลเซอร์ผ้าลินิน สีน้ำตาล','ZARA','outerwear','blazer','น้ำตาล','smart','L',720,'good','u3',4],
 ['คาร์ดิแกนถัก สีครีม','UNIQLO','outerwear','cardigan','ครีม','minimal','M',480,'like_new','u2',5],
 ['แจ็กเก็ตยีนส์ สีน้ำเงิน',"Levi's",'outerwear','denim-jacket','น้ำเงิน','street','XL',790,'good','u3',6],
 ['เดรสสายเดี่ยวผ้าซาติน สีดำ','ZARA','dress','slip','ดำ','minimal','M',590,'like_new','u2',1],
 ['เดรสลินินผูกเอว สีครีม','MUJI','dress','linen-dress','ครีม','casual','M',350,'defect','u1',5],
 ['เดรสเชิ้ต สีน้ำตาล','COS','dress','shirt-dress','น้ำตาล','smart','L',650,'good','u3',4],
 ['เดรสคอวี สีเขียว','ZARA','dress','wrap','เขียว','casual','S',490,'good','u3',10],
 ['เดรสแขนสั้น สีขาว','COS','dress','shirt-dress','ขาว','minimal','M',690,'like_new','u2',8],
];

export function makeSeed(now = Date.now()) {
  const listings = catalog.map((row,index) => {
    const [title,brand,type,subtype,color,style,size,price,condition,sellerId,age] = row;
    const id=`l${String(index+1).padStart(2,'0')}`;
    const photos = ['front','back','label',...(condition==='defect'?['defect']:[])].map(tag=>({id:`${id}-${tag}`,src:`assets/${id}-${tag}.svg`,tag,hash:`demo-v1-${id}-${tag}`}));
    const delta={S:-6,M:0,L:6,XL:12}[size];
    const measurements = type==='bottom'?{waist:70+delta,hip:96+delta,length:subtype==='skirt'?78:98}:type==='dress'?{chest:90+delta,waist:72+delta,hip:98+delta,length:112}:{chest:96+delta,length:type==='outerwear'?68:62};
    const defect = id==='l08'?{type:'stain',severity:'minor',description:'ภาพสาธิต: จุดสีเข้มเล็ก 2 จุดบริเวณชายเสื้อด้านขวา ยังไม่ยืนยันว่าซักออกได้',cleanable:false}:id==='l17'?{type:'fade',severity:'visible',description:'ภาพสาธิต: สีซีดเป็นปื้นบริเวณเข่าซ้าย ไม่มีรูขาด สีซีดถาวร',cleanable:false}:{type:'snag',severity:'minor',description:'ภาพสาธิต: ด้ายเกี่ยวเป็นเส้นสั้นบริเวณชายกระโปรงด้านซ้าย',cleanable:false};
    return {id,sellerId,title,description:`${title} · ทรง${subtype.includes('shirt')?'สบาย':'คลาสสิก'} ใส่ง่ายในชีวิตประจำวัน วัดขนาดเป็นเซนติเมตรตามข้อมูลตัวอย่าง ภาพทุกมุมเป็นภาพวาดสินค้าสาธิต ไม่ใช่ภาพถ่ายหรือการรับรองสภาพจริง`,brand,type,subtype,color,style,size,price,condition,measurements,fit:size==='L'||size==='XL'?'relaxed':'regular',photos,coverId:photos[0].id,defects:condition==='defect'?[{photoId:`${id}-defect`,...defect}]:[],tryOn:{src:photos[0].src},status:index===26?'sold':index===27?'reserved':'active',publishedAt:now-age*DAY,updatedAt:now-age*DAY,refreshedAt:null,...(index===27?{reservationOrderId:'order-demo-reserved'}:{})};
  });
  const sold=listings[26],reserved=listings[27];
  const makeOrder=(id,item,buyerId,status,createdAt,reservedUntil,history)=>({id,buyerId,sellerId:item.sellerId,items:[{listingId:item.id,price:item.price,snapshot:structuredClone(item)}],shippingFee:40,total:item.price+40,status,createdAt,reservedUntil,history});
  return {
    version:1,
    profiles:[{id:'u1',name:'Nicha',email:'nicha@example.test',shippingFee:40},{id:'u2',name:'Mali',email:'mali@example.test',shippingFee:40},{id:'u3',name:'June',email:'june@example.test',shippingFee:40}],
    listings,offers:[],
    orders:[makeOrder('order-demo-completed',sold,'u1','completed',now-9*DAY,now-9*DAY+15*60000,[{status:'pending_payment',at:now-9*DAY},{status:'paid',at:now-9*DAY+60000},{status:'shipped',at:now-8*DAY},{status:'completed',at:now-6*DAY}]),makeOrder('order-demo-reserved',reserved,'u3','pending_payment',now,now+15*60000,[{status:'pending_payment',at:now}])],
    advice:[],notifications:[{id:'welcome-u1',userId:'u1',text:'ยินดีต้อนรับสู่ Closet Demo — ภาพสินค้าและข้อมูลทั้งหมดเป็นตัวอย่าง ทดลองสลับบัญชีซื้อและขายได้',read:false,at:now}],reports:[],events:[],
    favorites:{u1:['l03','l15','l24'],u2:[],u3:[]},carts:{u1:[],u2:[],u3:[]},savedSearches:{u1:[],u2:[],u3:[]},
    outfits:{u1:{items:{},body:{chest:88,waist:70,hip:94,height:165},adjustments:{}},u2:{items:{},body:{chest:88,waist:70,hip:94,height:165},adjustments:{}},u3:{items:{},body:{chest:88,waist:70,hip:94,height:165},adjustments:{}}},
    settings:{currentUserId:'u1',clockOffsetDays:0},
  };
}
