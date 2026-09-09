import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.resolve(root,'../real-photo-research');
const records=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));
fs.mkdirSync(path.join(root,'studio-assets/photos'),{recursive:true});
const price={top:1290,bottom:990,wig:1190,accessory:490};
const slots={
 'academy-top':'top','academy-bottom':'bottom','academy-wig':'wig','academy-bowtie':'neck','academy-glasses':'face',
 'fantasy-top':'top','fantasy-bottom':'bottom','fantasy-wig':'wig','fantasy-belt':'waist','fantasy-pendant':'neck',
 'gothic-top':'top','gothic-bottom':'bottom','gothic-wig':'wig','gothic-necklace':'neck','gothic-hairbow':'hair'
};
const modelNames={
 'academy-top':'top-academy','academy-bottom':'bottom-academy','academy-wig':'wig-academy','academy-bowtie':'accessory-academy-neck','academy-glasses':'accessory-academy-face',
 'fantasy-top':'top-fantasy','fantasy-bottom':'bottom-fantasy','fantasy-wig':'wig-fantasy','fantasy-belt':'accessory-fantasy-waist','fantasy-pendant':'accessory-fantasy-neck',
 'gothic-top':'top-gothic','gothic-bottom':'bottom-gothic','gothic-wig':'wig-gothic','gothic-necklace':'accessory-gothic-neck','gothic-hairbow':'accessory-gothic-hair'
};
const sizes={S:{shoulder:38,chest:88,waist:70,hip:92},M:{shoulder:40,chest:94,waist:76,hip:98},L:{shoulder:42,chest:100,waist:82,hip:104}};
const lengths={top:58,bottom:101,wig:42,accessory:20};
const thai={academy:'Academy',fantasy:'Fantasy Adventurer',gothic:'Gothic Atelier'};
const items=records.map((record,index)=>{
 const ext=path.extname(record.file).toLowerCase();const photoName=`${record.id}${ext}`;
 fs.copyFileSync(path.join(source,record.file),path.join(root,'studio-assets/photos',photoName));
 const slot=slots[record.id],modelId=modelNames[record.id];
 const category=record.category,garment=category==='top'||category==='bottom';
 const variants=Object.entries(sizes).map(([size,m],i)=>({
  id:`${record.id}-${size.replace(' ','-').toLowerCase()}`,size,stock:1,price:price[category]+(garment?i*120:0)+(['fantasy','gothic'].includes(record.theme)?100:0),measurements:{...m,length:lengths[category]}
 }));
 return {id:`studio-${record.id}`,title:record.title,character:`${thai[record.theme]} Mix Piece`,series:'CLOSET Original Styling',description:`สินค้าตัวอย่างจากภาพถ่ายจริงสำหรับสาธิตการมิกซ์ชุด 3D: ${record.caveats}`,theme:record.theme,category,attachmentSlot:slot,sellerId:index%3===0?'u1':index%2===0?'u2':'u3',condition:'good',components:[record.title],photos:[{id:`${record.id}-front`,src:`studio-assets/photos/${photoName}`,tag:'front'}],coverId:`${record.id}-front`,defects:[],lengthTarget:category==='bottom'?'ankle':'waist',sizeVariants:variants,model:{url:`studio-assets/models/${modelId}.glb`,anchor:[0,0,0],referenceBody:{height:170,chest:90,waist:72,hip:96,shoulder:40},sourceUrl:record.sourceUrl,license:'3D reconstruction authored for this demo from credited photographic reference'},photoCredit:{sourceUrl:record.sourceUrl,creator:record.creator,license:record.license,licenseUrl:record.licenseUrl,caveats:record.caveats}};
});
const catalog={version:1,bodies:{female:{url:'studio-assets/models/body-female.glb',sourceUrl:'https://www.blender.org/download/demo-files/',license:'CC0 · Blender Human Base Meshes v1.4.1'},male:{url:'studio-assets/models/body-male.glb',sourceUrl:'https://www.blender.org/download/demo-files/',license:'CC0 · Blender Human Base Meshes v1.4.1'}},items};
fs.writeFileSync(path.join(root,'studio-catalog.json'),JSON.stringify(catalog,null,2)+'\n');
const credits=['# Studio asset credits','','These 15 files are photographs of physical items used as visual references. The 3D garments are original approximations authored for this prototype; they are not scans of the pictured items.','','| Item | Photograph | Creator | License |','|---|---|---|---|',...items.map(item=>`| ${item.title} | [Wikimedia Commons](${item.photoCredit.sourceUrl}) | ${item.photoCredit.creator.replaceAll('|','/')} | [${item.photoCredit.license}](${item.photoCredit.licenseUrl}) |`),'','## 3D runtime and mannequin','','- Female and male body meshes: [Blender Human Base Meshes v1.4.1](https://www.blender.org/download/demo-files/), CC0. The demo applies an ivory retail-mannequin material and exports the meshes as GLB.','- Web renderer: [Three.js](https://threejs.org/), MIT License, vendored at version 0.180.0.','- Each product record in `studio-catalog.json` retains its source URL, creator, license, caveat, and 3D model path.',''];
fs.writeFileSync(path.join(root,'docs/STUDIO-ASSET-CREDITS.md'),credits.join('\n'));
console.log(`Built ${items.length} items and copied ${items.length} photographs.`);
