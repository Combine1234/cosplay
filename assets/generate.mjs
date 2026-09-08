// Original vector garment study for Closet. Run with node assets/generate.mjs.
// Fronts share one body coordinate system and are also the try-on layer.
import {writeFileSync} from 'node:fs';
import {makeSeed} from '../seed.js';
const directory=new URL('./',import.meta.url);
const colors={ขาว:'#e8e6df',ครีม:'#d9c9ab',ฟ้า:'#83a7bb',ดำ:'#333436',เบจ:'#bfb095',เขียว:'#80866a',น้ำตาล:'#94715a',น้ำเงิน:'#3e596f'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const path=(d,extra='')=>`<path d="${d}" ${extra}/>`;
const seam=(d,extra='')=>path(d,`fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.15" ${extra}`);
const shade=d=>path(d,'fill="#171713" opacity=".08"');
const stitch=d=>path(d,'fill="none" stroke="#514532" stroke-opacity=".45" stroke-width=".8" stroke-dasharray="2 2"');
const button=(x,y)=>`<circle cx="${x}" cy="${y}" r="2.5" fill="#c2b39a" stroke="#514a41" stroke-width=".65"/><path d="M${x-.7} ${y}h1.4" stroke="#514a41" stroke-width=".6"/>`;
const buttons=(x,y,count,step=24)=>Array.from({length:count},(_,i)=>button(x,y+i*step)).join('');
const pocket=(x,y,w=33,h=36)=>`${path(`M${x} ${y}h${w}v${h-7}l${-w/2} 7-${w/2}-7Z`,'fill="url(#cloth)" stroke="#423e35" stroke-opacity=".3" stroke-width=".8"')}${stitch(`M${x+3} ${y+3}h${w-6}v${h-12}l${-(w-6)/2} 6-${(w-6)/2}-6Z`)}${seam(`M${x} ${y+4}h${w}`)}`;
function definitions(l){return `<defs>
 <linearGradient id="cloth" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="${colors[l.color]}"/><stop offset=".26" stop-color="${colors[l.color]}"/><stop offset=".49" stop-color="#fff" stop-opacity=".8"/><stop offset=".5" stop-color="${colors[l.color]}"/><stop offset="1" stop-color="${colors[l.color]}"/></linearGradient>
 <linearGradient id="volume"><stop stop-color="#000" stop-opacity=".11"/><stop offset=".26" stop-color="#fff" stop-opacity=".11"/><stop offset=".58" stop-color="#fff" stop-opacity=".02"/><stop offset=".84" stop-color="#000" stop-opacity=".13"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>
 <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".12"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".09"/></linearGradient>
 <pattern id="weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 1h4M1 0v4" stroke="#fff" stroke-opacity=".12" stroke-width=".45"/><path d="M0 3h4M3 0v4" stroke="#171717" stroke-opacity=".1" stroke-width=".5"/></pattern>
 <pattern id="rib" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M1 0v5" stroke="#fff" stroke-opacity=".25" stroke-width=".9"/><path d="M3 0v5" stroke="#111" stroke-opacity=".12" stroke-width=".75"/></pattern>
 <filter id="shadow" x="-25%" y="-15%" width="150%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#262019" flood-opacity=".16"/></filter>
 </defs>`;}
function shell(d,texture='weave'){return `<g filter="url(#shadow)">${path(d,'fill="url(#cloth)" stroke="#292821" stroke-opacity=".35" stroke-width="1"')}${path(d,'fill="url(#volume)"')}${path(d,`fill="url(#${texture})"`)}</g>`;}
function shirt(l,back=false){
 const blouse=l.subtype==='blouse';
 const d='M161 105Q144 106 125 116L84 159 111 190 133 170 127 278Q163 291 200 288Q237 291 273 278L267 170 289 190 316 159 275 116Q256 106 239 105Q219 115 200 114Q180 114 161 105Z';
 let s=shell(d);
 s+=shade('M133 170 149 151 143 266 131 278ZM267 170 251 151 257 266 269 278Z');
 s+=seam('M125 116Q129 140 133 170M275 116Q270 140 267 170M90 161 112 184M310 161 288 184M131 273Q200 286 269 273');
 s+=stitch('M92 162 112 181M308 162 288 181M132 276Q200 289 268 276');
 if(back){s+=seam('M145 133Q200 144 255 133');s+=stitch('M144 135Q200 146 256 135');s+=path('M161 106Q200 133 239 106','fill="none" stroke="#31302a" stroke-opacity=".4" stroke-width="4"');s+=seam('M196 142 194 254M204 142 206 254');}
 else if(blouse){s+=path('M165 106 200 157 235 106','fill="#4d5440" stroke="#656c50" stroke-width="4"');s+=seam('M160 111 198 163 239 112');s+=path('M198 161 198 281','fill="none" stroke="#1a2514" stroke-opacity=".18" stroke-width="3"');}
 else{
  s+=path('M175 108 200 141 225 108Z','fill="#242420" opacity=".2"');
  s+=path('M163 105 177 101 200 137 181 150 155 114ZM237 105 223 101 200 137 219 150 245 114Z','fill="url(#cloth)" stroke="#4a453b" stroke-opacity=".35" stroke-width="1"');
  s+=seam('M162 109 181 144 196 137M238 109 219 144 204 137');
  s+=path('M197 139h7v146h-7Z','fill="#fff" opacity=".07"');s+=stitch('M196 143v137M204 143v137');s+=buttons(200,160,5,24);
  if(['l01','l03','l06'].includes(l.id))s+=pocket(222,158,29,30);
 }
 s+=seam('M151 185Q155 217 148 250M250 182Q244 212 253 248');
 return s;
}
function pants(l,back=false){
 const denim=l.subtype==='denim';
 const d='M137 266Q199 273 263 266L276 334 273 514Q247 522 214 514L201 354 197 354 185 514Q153 522 127 514L124 334Z';
 let s=shell(d);s+=path('M138 266Q200 272 262 266L265 284Q200 291 135 284Z','fill="url(#cloth)" stroke="#312d25" stroke-opacity=".5" stroke-width="1"');
 s+=stitch('M137 270Q200 277 262 270M137 281Q200 288 263 281M130 507Q157 513 185 507M216 507Q244 513 271 507');
 s+=seam('M129 332 132 505M272 332 267 505M200 354 191 502M206 356 218 504');
 s+=shade('M198 293 194 352 172 498 180 514 199 354 216 514 223 494 207 349 208 294Z');
 for(const x of [147,181,218,251])s+=path(`M${x} 265v21h4v-21Z`,'fill="url(#cloth)" stroke="#655e4a" stroke-opacity=".45" stroke-width=".6"');
 if(back){s+=pocket(144,302,34,39)+pocket(223,302,34,39);s+=stitch('M129 301 198 317 271 301M198 289 198 351');s+=path('M234 269h21v12h-21Z','fill="#b89566" stroke="#594936" stroke-width=".6"');}
 else{
 s+=seam('M144 288Q148 315 130 325M257 288Q252 315 269 325');s+=stitch('M148 290Q153 316 132 329M253 290Q247 316 268 329');
 s+=path('M198 289v57q12 0 12-13v-44','fill="none" stroke="#373127" stroke-opacity=".45" stroke-width="1"');s+=button(201,277);
 if(denim){s+=pocket(238,290,15,19);s+=button(141,294)+button(260,294);s+=seam('M151 349 170 352M147 354 166 357M236 350 252 347');}
 else{s+=stitch('M158 291 153 497M243 291 248 497');s+=seam('M161 297 158 503M240 297 243 503');}
 }
 return s;
}
function skirt(l,back=false){
 const pleat=l.id==='l13';const d='M138 266Q200 274 262 266L292 475Q247 488 200 482Q153 488 108 475Z';
 let s=shell(d);s+=path('M138 266Q200 274 262 266L264 283Q200 291 136 283Z','fill="url(#cloth)" stroke="#383229" stroke-opacity=".4" stroke-width="1"');
 const n=pleat?10:4;for(let i=1;i<n;i++){const x=138+124*i/n;const end=108+184*i/n;s+=shade(`M${x} 287 ${end-3} 477 ${end+7} 479 ${x+3} 287Z`);s+=seam(`M${x+3} 287 ${end+7} 474`);}
 s+=stitch('M137 280Q200 288 263 280M114 473Q200 488 286 473');
 if(back)s+=stitch('M200 286v192');else s+=button(255,276);
 return s;
}
function outerwear(l,back=false){
 const cardigan=l.subtype==='cardigan';const blazer=l.subtype==='blazer';const denim=l.subtype==='denim-jacket';
 const d='M161 101 128 111 104 133 67 284 98 296 132 178 125 309Q155 318 187 311L199 168 213 311Q245 319 276 309L268 178 302 296 333 284 296 133 272 111 239 101Z';
 let s=shell(d,cardigan?'rib':'weave');
 s+=seam('M129 114Q136 145 132 178M271 114Q264 145 268 178M71 279 99 289M329 279 301 289M130 303 183 306M217 306 270 303');
 s+=shade('M131 175 145 158 136 298 127 305ZM269 175 255 158 264 298 273 305Z');
 if(back){
 s+=path('M159 102Q200 124 241 102L252 149 268 178 276 309Q200 323 125 309L132 178 148 149Z','fill="url(#cloth)"');s+=path('M159 102Q200 124 241 102L252 149 268 178 276 309Q200 323 125 309L132 178 148 149Z','fill="url(#weave)"');
 s+=stitch('M133 152Q200 164 267 152M200 121v188M129 304Q200 317 272 304');s+=seam('M155 173Q149 239 146 297M245 173Q251 239 254 297');
 }else{
 if(blazer){s+=path('M161 101 178 104 198 168 170 202 152 161 168 145 149 132ZM239 101 222 104 202 168 230 202 248 161 232 145 251 132Z','fill="url(#cloth)" stroke="#2b2823" stroke-opacity=".4" stroke-width=".85"');s+=seam('M155 132 173 145 158 162 171 195 194 170M245 132 227 145 242 162 229 195 206 170');s+=path('M145 242 177 246 174 254 144 250ZM224 246 255 242 256 250 227 254Z','fill="url(#cloth)" stroke="#332f28" stroke-opacity=".6" stroke-width="1"');s+=button(211,236)+button(213,266);}
 else if(cardigan){s+=path('M161 101 196 174 187 311M239 101 204 174 213 311','fill="none" stroke="#b19b78" stroke-width="10"');s+=buttons(208,194,5,24);s+=pocket(145,244,27,32)+pocket(229,244,27,32);}
 else{s+=path('M160 101 178 100 199 153 177 165 149 117ZM240 101 222 100 201 153 223 165 251 117Z','fill="url(#cloth)" stroke="#292d2c" stroke-opacity=".5" stroke-width="1"');s+=pocket(145,167,31,36)+pocket(224,167,31,36);s+=buttons(206,174,5,27);s+=stitch('M184 166 181 306M215 166 219 306');}
 if(denim){s+=stitch('M138 154 179 158M221 158 262 154M135 219 178 223M222 223 265 219');s+=path('M128 294 188 298 187 311 125 309ZM212 298 273 294 276 309 213 311Z','fill="url(#cloth)" stroke="#393c3c" stroke-opacity=".5" stroke-width="1"');}
 }
 return s;
}
function dress(l,back=false){
 const slip=l.subtype==='slip';const wrap=l.subtype==='wrap';const shirt=l.subtype==='shirt-dress';
 const d=slip?'M152 110 161 110 166 152Q200 170 234 152L239 110 248 110 254 179 245 265Q249 318 284 493Q200 512 116 493L155 265 146 179Z':'M161 105 135 115 110 166 135 182 149 161 155 261Q145 337 111 487Q153 506 200 500Q247 506 289 487L245 261 251 161 265 182 290 166 265 115 239 105 200 123Z';
 let s=shell(d,slip?'sheen':'weave');
 s+=shade('M159 264Q171 370 143 494L158 498Q183 374 176 264ZM225 264Q217 382 243 498L261 495Q233 370 241 264Z');
 s+=seam('M158 270Q151 379 125 487M242 270Q249 379 275 487M119 487Q200 505 281 487');
 s+=stitch(slip?'M153 111 162 156Q200 176 238 156L247 111':'M116 166 136 177M284 166 264 177');
 if(back){s+=seam('M161 109Q200 144 239 109M200 137v359');s+=stitch('M199 143v81');}
 else if(slip){s+=path('M161 155Q200 176 239 155','fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.5"');s+=seam('M153 185Q163 212 161 251M247 185Q237 212 239 251');}
 else if(wrap){s+=path('M163 106 218 185 159 266M236 107 196 167','fill="none" stroke="#414d39" stroke-opacity=".6" stroke-width="3"');s+=seam('M162 111 212 185 155 265');}
 else if(shirt){s+=path('M163 105 177 104 200 140 181 150 154 114ZM237 105 223 104 200 140 219 150 246 114Z','fill="url(#cloth)" stroke="#3e3027" stroke-opacity=".35" stroke-width="1"');s+=stitch('M198 145v345M205 145v345');s+=buttons(201,164,12,26);s+=pocket(220,162,27,31);}
 else{s+=path('M164 109 200 157 236 109','fill="none" stroke="#afa084" stroke-width="4"');s+=seam('M169 116 200 157 231 116');}
 if(!slip){s+=path('M154 258Q200 266 246 258L247 272Q200 280 153 272Z','fill="url(#cloth)" stroke="#463f31" stroke-opacity=".4" stroke-width=".8"');if(!back)s+=path('M220 264q-26-17-20 2 7 13 20-2 22-14 20 2-3 12-20-2l-9 46m9-46 15 39','fill="none" stroke="#bba789" stroke-width="3"');}
 return s;
}
function defect(l){
 if(l.id==='l08')return '<g fill="#69513a" opacity=".65"><ellipse cx="246" cy="263" rx="3.7" ry="2.3" transform="rotate(-21 246 263)"/><ellipse cx="239" cy="267" rx="1.3" ry="1.8"/></g>';
 if(l.id==='l17')return '<ellipse cx="157" cy="397" rx="18" ry="26" fill="#dbe4e4" opacity=".27"/><path d="M143 391 169 394M141 399 172 401M148 408l19 1" stroke="#dbe4e4" opacity=".4" stroke-width="1.3"/>';
 if(l.id==='l25')return '<path d="m140 465 4-3 2 4 3-6 2 4 4-2" fill="none" stroke="#76634b" stroke-width="1.4"/><path d="m146 464 2 6" stroke="#bcb09a" fill="none"/>';
 return '';
}
function garment(l,back){return (l.type==='top'?shirt(l,back):l.type==='bottom'?(l.subtype==='skirt'?skirt(l,back):pants(l,back)):l.type==='outerwear'?outerwear(l,back):dress(l,back))+(!back?defect(l):'');}
function label(l){return `<g transform="rotate(-4 200 260)" filter="url(#shadow)"><path d="M112 184Q201 178 288 184L288 347Q200 352 112 347Z" fill="#e9e0cc" stroke="#d3c5ad"/><path d="M119 190H281V341H119Z" stroke="#8c8069" stroke-width=".7" stroke-dasharray="2 3" fill="none"/><path d="M112 207h176M112 322h176" stroke="#cfc0a6"/><text x="200" y="235" text-anchor="middle" fill="#37372d" font-family="Georgia,serif" font-size="25" letter-spacing="3">CLOSET</text><text x="200" y="258" text-anchor="middle" fill="#706651" font-family="Arial,sans-serif" font-size="10" letter-spacing="3">DEMO ILLUSTRATION</text><text x="200" y="287" text-anchor="middle" fill="#37372d" font-family="Arial,sans-serif" font-size="17">${esc(l.size)} · ${esc(l.id.toUpperCase())}</text><text x="200" y="307" text-anchor="middle" fill="#706651" font-family="Arial,sans-serif" font-size="9">EXAMPLE LABEL / NOT VERIFIED</text><path d="m164 330 3 7h10l3-7m-12 0h8m14 0 5 8 5-8-5-1Zm18 0h10v8h-10Z" fill="none" stroke="#706651" stroke-width=".8"/></g>`;}
for(const l of makeSeed().listings){
 for(const p of l.photos){
 const zoom=l.id==='l08'?'213 235 65 65':l.id==='l17'?'119 356 80 95':'117 440 61 61';
 const box=p.tag==='defect'?zoom:'0 0 400 560';
 const body=p.tag==='label'?label(l):garment(l,p.tag==='back');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-labelledby="title desc"><title id="title">${esc(l.title)} · ${p.tag}</title><desc id="desc">Original Closet demo garment illustration. Not a photograph or verified condition. ${p.tag==='defect'?esc(l.defects[0].description):''}</desc>${definitions(l)}${body}</svg>`;
 writeFileSync(new URL(`${l.id}-${p.tag}.svg`,directory),svg);
 }
}
console.log('Created 87 original offline garment, back, label and defect illustrations.');
