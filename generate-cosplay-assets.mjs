import fs from 'node:fs';
fs.mkdirSync('cosplay-assets',{recursive:true});
const designs=[
 ['luna','Luna Astralis','Moonlit Archive','#243657','#e6c986','#b9c9ec','gown'],
 ['ember','Ember Vale','Crimson Guild','#872e36','#e4ac63','#bf6145','coat'],
 ['flora','Flora Sylven','Verdant Court','#3e6954','#d5c58a','#dbc697','gown'],
 ['celeste','Celeste Aria','Starfall Academy','#64749c','#e2d9b7','#dad9e7','uniform'],
 ['raven','Raven Noctis','Midnight Masquerade','#34323f','#b6a0ca','#37303a','gown'],
 ['aurora','Aurora Frost','Crystal Dominion','#83b7c7','#f4eee2','#e8e3dc','gown'],
 ['scarlet','Scarlet Finch','Skybound Corsairs','#663e46','#d4b079','#a84632','coat'],
 ['mika','Mika Hanami','Sakura Reverie','#d48e9e','#f3d5a2','#433345','robe'],
 ['sol','Sol Aurelius','Sunforge Order','#d7b269','#f4e6bf','#b69260','armor'],
 ['iris','Iris Spellweaver','Violet Atelier','#685981','#ddc292','#ada0c9','robe'],
 ['aqua','Aqua Marina','Pearl Odyssey','#467e89','#d7ceb0','#84a5b5','uniform'],
 ['nova','Nova Flux','Neon Horizon','#414a63','#94d7d4','#747191','coat']
];
const wrap=body=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="fabric" x2="1" y2="1"><stop stop-color="white" stop-opacity=".15"/><stop offset=".5" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity=".23"/></linearGradient></defs>${body}</svg>`;
const catalog=[];
for(let i=0;i<designs.length;i++){
 const [id,character,series,c,g,h,kind]=designs[i],long=['gown','robe','coat'].includes(kind),hem=long?525:380;
 const base=`<g stroke="#292632" stroke-width="1.5" stroke-linejoin="round"><path fill="${c}" d="M174 126 L153 135 130 180 141 240 142 266 111 ${hem} Q200 ${hem+25} 289 ${hem} L258 266 259 240 270 180 247 135 226 126 217 153 183 153Z"/><path fill="url(#fabric)" d="M174 126L153 135 130 180 141 240 142 266 111 ${hem}Q200 ${hem+25} 289 ${hem}L258 266 259 240 270 180 247 135 226 126 217 153 183 153Z"/><path d="M151 278L140 ${hem-6}M178 281L173 ${hem+5}M222 281L227 ${hem+5}M249 278L260 ${hem-6}" stroke="${g}" opacity=".55" fill="none"/><path fill="${g}" d="M141 251 Q200 265 259 251 L258 270 Q200 281 142 270Z"/><path d="M183 155L200 229 217 155M164 181L236 181M162 193L238 193" stroke="${g}" fill="none"/><path fill="${g}" d="M193 252L207 252 211 267 200 277 189 267Z"/></g>`;
 const sleeves=kind==='robe'?`M154 133L127 139 74 301 119 321 166 206Z M246 133L273 139 326 301 281 321 234 206Z`:`M154 133L128 145 94 265 116 274 164 195Z M246 133L272 145 306 265 284 274 236 195Z`;
 const outer=`<g stroke="${g}" stroke-width="3" stroke-linejoin="round"><path fill="${c}" d="${sleeves}"/><path fill="${kind==='armor'?g:c}" d="M172 127L147 133 132 157 171 180 183 153 200 174 217 153 229 180 268 157 253 133 228 127 215 142 185 142Z"/><path fill="none" d="M153 144L170 161M247 144L230 161M105 250L123 257M295 250L277 257"/></g>`;
 const wig=`<g stroke="#39313a" stroke-width="1.5"><path fill="${h}" d="M157 80Q142 25 180 23Q222 4 241 39Q257 65 242 99L251 150 227 136 225 82 175 81 172 139 148 152Z"/><path fill="${h}" d="M157 69Q156 25 197 27Q238 22 244 65L226 55 215 79 204 47 184 76 175 49Z"/><path d="M164 89L161 134M237 88L241 134M186 32Q174 41 174 54" fill="none" stroke="white" opacity=".35"/></g>`;
 const accessory=`<g fill="${g}" stroke="#786444" stroke-width="1"><path d="M165 40L172 20 188 35 200 12 213 35 230 20 235 40Z"/><path d="M200 157L210 173 200 188 190 173Z"/><circle cx="200" cy="172" r="5" fill="${h}"/><path d="M151 275Q160 321 200 310Q241 321 249 275" fill="none" stroke-width="3"/><circle cx="200" cy="310" r="6"/>${Array.from({length:5},(_,n)=>`<path d="M${150+n*25} ${hem-16}l4 -7 4 7 -4 7Z"/>`).join('')}</g>`;
 const shoes=`<g fill="${c}" stroke="${g}" stroke-width="2"><path d="M158 495L185 495 184 552 166 568 145 568 147 556 158 548Z M215 495L242 495 242 548 253 556 255 568 234 568 216 552Z"/><path d="M162 508L182 508M218 508L238 508"/></g>`;
 const body=`<g fill="#e7d6c8"><ellipse cx="200" cy="74" rx="32" ry="43"/><path d="M185 108H215V141H185Z M141 148L120 148 88 275 100 288 117 280 154 179Z M259 148L280 148 312 275 300 288 283 280 246 179Z M153 338L188 338 184 553 157 553Z M212 338L247 338 243 553 216 553Z"/></g>`;
 const layers={shoes,base,outer,wig,accessory};for(const [slot,art] of Object.entries(layers))fs.writeFileSync(`cosplay-assets/${id}-${slot}.svg`,wrap(art));
 const art=body+shoes+base+outer+wig+accessory;
 const bg=`<rect width="400" height="600" fill="#eee9e2"/><path d="M0 460L400 385V600H0Z" fill="#e5ddd3"/><ellipse cx="200" cy="573" rx="115" ry="12" fill="#c8bdb1" opacity=".5"/>`;
 fs.writeFileSync(`cosplay-assets/${id}-front.svg`,wrap(bg+art));
 const back=body+shoes+base+outer+`<path d="M194 138H206V${hem}" stroke="${g}" stroke-width="3"/><path fill="${h}" stroke="#39313a" d="M158 69Q154 21 200 23Q246 21 242 69L250 174Q200 196 150 174Z"/><path d="M171 74L165 169M193 63L190 181M215 64L220 179M234 74L240 169" stroke="#fff" opacity=".25" fill="none"/>`;
 fs.writeFileSync(`cosplay-assets/${id}-back.svg`,wrap(bg+back));
 if(i===2||i===7)fs.writeFileSync(`cosplay-assets/${id}-defect.svg`,wrap(`<rect width="400" height="600" fill="#e9e1d6"/><path fill="${c}" d="M15 70L385 105 370 525 25 550Z"/><path d="M20 450L375 430" stroke="${g}" stroke-width="10"/><path d="M154 444L167 436 178 448 190 435 201 444" stroke="#e9e1d6" stroke-width="3" fill="none"/><circle cx="178" cy="443" r="47" stroke="#b96b52" stroke-width="2" fill="none"/><text x="35" y="40" font-size="14" font-family="sans-serif" fill="#554a43">DETAIL / LOOSE HEM THREAD</text>`));
 catalog.push({id,character,series,kind,defect:i===2||i===7});
}
fs.writeFileSync('cosplay-assets/catalog.json',JSON.stringify(catalog,null,2));
