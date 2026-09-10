import {BODY_DEFAULTS} from './studio-domain.js';

const bell=(y,c,w)=>Math.exp(-(((y-c)/w)**2));

// The same continuous deformation applies to skin and clothing. Wearing an
// item must never shrink the body or move the hands out of their sleeves.
export function bodyPoint(x,y,z,current,style){
 const base=BODY_DEFAULTS[style],t=y/(base.height/100);
 const c=bell(t,.73,.065),w=bell(t,.60,.06),hip=bell(t,.51,.065),sum=Math.max(1,c+w+hip);
 const weight=Math.exp(-((Math.abs(x)/(.27*base.height/100))**6));
 const girth=((current.chest/base.chest-1)*c+(current.waist/base.waist-1)*w+(current.hip/base.hip-1)*hip)/sum;
 const shoulder=(current.shoulder/base.shoulder-1)*bell(t,.79,.075);
 return [x*(1+girth*weight*.65+shoulder),y*current.height/base.height,z*(1+girth*weight)];
}

export function garmentPoint(x,y,z,item,variant,current,style){
 const slot=item.attachmentSlot,base=BODY_DEFAULTS[style],height=base.height/170;
 let px=x,pz=z,py=y;
 if(slot==='waist'){
  px*=base.waist/BODY_DEFAULTS.female.waist;
  pz=(z-.027)*.78+.045;
 }
 return bodyPoint(px,py*height,pz,current,style);
}
