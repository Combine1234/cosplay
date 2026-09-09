"""Author the reconstructed sample garments; run with Blender 4.5 --background.
Meshes are approximations of the credited photo references, not product scans.
All geometry uses meters, Blender Z up, front -Y; glTF exports Y up/front +Z.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
from math import sin,cos,pi
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'studio-assets/models';OUT.mkdir(parents=True,exist_ok=True)
random.seed(29)

def material(name,color,rough=.55,metal=0,fabric=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if fabric:
  size=256; im=bpy.data.images.new(name+' woven textile',width=size,height=size)
  pixels=[]
  for y in range(size):
   for x in range(size):
    n=.88+.07*sin(x*pi/2)*cos(y*pi/2)+random.uniform(-.025,.025)
    pixels.extend([min(1,c*n) for c in color]+[1])
  im.pixels=pixels;im.pack()
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 return m

def mesh(name,verts,faces,mat,solid=0):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 for f in d.polygons:f.use_smooth=True
 if solid:
  s=o.modifiers.new('Fabric thickness','SOLIDIFY');s.thickness=solid
 return o

def curve(name,points,mat,r=.002,cyclic=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=10;c.bevel_depth=r;c.bevel_resolution=2
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for b,p in zip(s.bezier_points,points):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 s.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(mat);return o

def ellipsoid(name,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o

def loft(name,levels,mat,fold=.002,phase=0,openfront=0,n=64):
 # levels: z, radiusX, radiusY, centerX, centerY
 vs=[];fs=[]
 for j,(z,rx,ry,cx,cy) in enumerate(levels):
  for i in range(n):
   a=2*pi*i/n;wave=fold*(sin(a*13+z*30+phase)+.45*sin(a*23-z*20))
   vs.append((cx+(rx+wave)*sin(a),cy-(ry+wave)*cos(a),z+.001*sin(a*11+phase)))
 for j in range(len(levels)-1):
  for i in range(n):
   a=2*pi*(i+.5)/n
   if openfront and min(a,2*pi-a)<openfront:continue
   fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 o=mesh(name,vs,fs,mat,.002)
 # UV fabric follows circumference and height.
 uv=o.data.uv_layers.new(name='Textile UV')
 for p in o.data.polygons:
  for li in p.loop_indices:
   v=o.data.loops[li].vertex_index;uv.data[li].uv=((v%n)/n*4,(v//n)/max(1,len(levels)-1)*5)
 return o

def interp_levels(controls,steps=5):
 levels=[]
 for a,b in zip(controls,controls[1:]):
  for j in range(steps):
   t=j/steps;levels.append(tuple(x*(1-t)+y*t for x,y in zip(a,b)))
 levels.append(controls[-1]);return levels

def tube(name,centers,radii,mat,fold=.001,n=32):
 vs=[];fs=[]
 for j,(point,(rx,ry)) in enumerate(zip(centers,radii)):
  p=Vector(point);prev=Vector(centers[max(0,j-1)]);nxt=Vector(centers[min(len(centers)-1,j+1)]);axis=(nxt-prev).normalized();u=axis.cross(Vector((0,1,0))).normalized();v=axis.cross(u).normalized()
  for k in range(n):
   a=2*pi*k/n;w=fold*sin(a*9+j*.7);vs.append(p+u*((rx+w)*cos(a))+v*((ry+w)*sin(a)))
 for j in range(len(centers)-1):
  for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 return mesh(name,vs,fs,mat,.002)

def patch(name,points,mat):
 o=mesh(name,points,[tuple(range(len(points)))],mat,.003);b=o.modifiers.new('Soft edges','BEVEL');b.width=.003;b.segments=2;return o

def front_panel(name,rows,mat,segments=8):
 # rows are z,left x,right x,front depth; curve each row around the chest.
 vs=[];faces=[]
 for z,left,right,depth in rows:
  for i in range(segments):
   t=i/(segments-1);x=left*(1-t)+right*t;center=(left+right)/2;half=max(.001,(right-left)/2)
   y=-depth-.011*(1-((x-center)/half)**2);vs.append((x,y,z))
 for j in range(len(rows)-1):
  for i in range(segments-1):faces.append((j*segments+i,j*segments+i+1,(j+1)*segments+i+1,(j+1)*segments+i))
 o=mesh(name,vs,faces,mat,.003);b=o.modifiers.new('Tailored soft edge','BEVEL');b.width=.002;b.segments=2;return o

def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def export(name):
 for o in bpy.context.scene.objects:
  if o.type in ('MESH','CURVE'):
   o.location.y-=.052 if name.startswith('wig') or name.endswith('face') or name.endswith('hair') else .027
 # Apply garment thickness and merge by material to keep mobile draw calls small.
 for o in list(bpy.context.scene.objects):
  if o.type not in ('MESH','CURVE'):continue
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.convert(target='MESH')
 bpy.ops.object.select_all(action='SELECT')
 bpy.context.view_layer.objects.active=next(o for o in bpy.context.selected_objects if o.type=='MESH')
 bpy.ops.object.join()
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
 print('EXPORTED',name,flush=True)

def arms(mat,puffy=False):
 for side in [-1,1]:
  controls=[(1.43,.07,.075,.20*side,0),(1.35,.073,.078,.235*side,0),(1.22,.065 if not puffy else .10,.07 if not puffy else .105,.29*side,-.005),(1.10,.055 if not puffy else .092,.06 if not puffy else .096,.33*side,-.015),(.98,.045,.044,.365*side,-.028),(.945,.043,.042,.373*side,-.034)]
  lv=interp_levels(controls,4);tube('Gathered sleeve' if puffy else 'Tailored sleeve',[(v[3],v[4],v[0]) for v in lv],[(v[1],v[2]) for v in lv],mat,.004 if puffy else .0015)
  loft('Cuff',[(.942,.046,.046,.373*side,-.034),(.978,.047,.047,.365*side,-.027)],mat,0)

def blazer():
 clear();navy=material('Navy wool',(.025,.035,.065),.82,fabric=True);lining=material('Ivory shirt',(.85,.81,.72),.8,fabric=True);gold=material('Brass buttons',(.65,.39,.11),.26,.8)
 loft('Blazer body',interp_levels([(.88,.188,.13,0,.013),(1.03,.16,.12,0,0),(1.14,.155,.122,0,0),(1.29,.185,.153,0,0),(1.41,.207,.11,0,0),(1.45,.16,.086,0,0)]),navy,.0018,openfront=.105)
 arms(navy)
 front_panel('Buttoned shirt front',[(.94,-.065,.065,.205),(1.08,-.06,.06,.205),(1.27,-.072,.072,.205),(1.43,-.082,.082,.195)],lining)
 front_panel('Blazer left front',[(.91,-.195,-.067,.19),(1.08,-.17,-.061,.20),(1.28,-.192,-.075,.205),(1.39,-.182,-.097,.19)],navy)
 front_panel('Blazer right front',[(.91,.067,.195,.19),(1.08,.061,.17,.20),(1.28,.075,.192,.205),(1.39,.097,.182,.19)],navy)
 curve('Shirt placket',[(0,-.172,.91),(0,-.195,1.34)],lining,.004)
 for s in [-1,1]:
  patch('Notched lapel',[(s*.069,-.225,1.455),(s*.18,-.222,1.405),(s*.102,-.238,1.30),(s*.139,-.232,1.32),(s*.027,-.229,1.155)],navy)
  curve('Pocket welt',[(s*.07,-.224,1.055),(s*.155,-.213,1.055)],gold,.003)
 for z in [1.16,1.075,.99]:ellipsoid('Button',(.021,-.238,z),(.008,.003,.008),gold)
 export('top-academy')

def blouse():
 clear();ivory=material('Cotton poplin',(.91,.88,.79),.86,fabric=True);cord=material('Cotton tie',(.69,.63,.48),.8)
 loft('Poet shirt',interp_levels([(.92,.191,.143,0,.014),(1.07,.165,.135,0,0),(1.22,.193,.156,0,0),(1.36,.21,.142,0,0),(1.445,.177,.085,0,0)]),ivory,.006)
 arms(ivory,True)
 for s in [-1,1]:patch('Open collar',[(s*.065,-.078,1.50),(s*.11,-.1,1.435),(s*.05,-.171,1.35),(s*.015,-.139,1.43)],ivory)
 for z in [1.39,1.365,1.34]:curve('Neck lacing',[(-.021,-.163,z+.012),(.021,-.164,z-.013)],cord,.002)
 curve('Tie tail',[(-.009,-.17,1.34),(-.017,-.177,1.29),(-.039,-.179,1.24)],cord,.002)
 export('top-fantasy')

def corset():
 clear();ivory=material('Ivory satin',(.91,.87,.78),.36,fabric=True);bone=material('Satin boning',(.77,.72,.62),.4);silver=material('Corset eyelets',(.66,.65,.59),.22,.8)
 loft('Basque corset',interp_levels([(.94,.173,.137,0,0),(1.07,.147,.116,0,0),(1.18,.16,.135,0,-.004),(1.30,.182,.162,0,0),(1.35,.175,.142,0,0)]),ivory,.0006)
 for s in [-1,1]:
  # Contoured seams follow bust and waist, no separate spherical bra cups.
  for x in [.048,.12]:curve('Stitched boning',[(s*x*1.12,-.126,.95),(s*x*.85,-.112,1.07),(s*x,-.153,1.29),(s*x,-.137,1.345)],bone,.002)
  curve('Garter strap',[(s*.11,-.115,.955),(s*.12,-.125,.88),(s*.12,-.12,.85)],ivory,.006)
 rose=material('Peach rose',(.62,.29,.20),.54)
 for j in range(8):ellipsoid('Rose petal',(.011*cos(j*pi/4),-.153-.006*sin(j*pi/4),1.327+.011*sin(j*pi/4)),(.011,.004,.007),rose)
 for z in [1+.025*i for i in range(12)]:
  for s in [-1,1]:ellipsoid('Front clasp',(s*.012,-.151,z),(.003,.002,.003),silver)
  curve('Front lacing',[(-.014,-.156,z),(.014,-.156,z+.019)],bone,.001)
 export('top-gothic')

def pants(theme):
 clear();colors={'academy':(.45,.35,.23),'fantasy':(.13,.17,.085),'gothic':(.022,.023,.026)};cloth=material(theme+' twill',colors[theme],.88,fabric=True);seam=material('Topstitch',tuple(c*.6 for c in colors[theme]),.85);metal=material('Metal zip',(.4,.42,.43),.24,.85)
 for s in [-1,1]:
  ctrl=[(.08,.069,.08,.10*s,.016),(.18,.073,.074,.105*s,.014),(.37,.082,.076,.105*s,.009),(.51,.077,.082,.106*s,.012),(.64,.085,.10,.10*s,.015),(.80,.10,.125,.095*s,.005),(.90,.112,.148,.087*s,.005),(.99,.116,.155,.077*s,.004),(1.055,.112,.143,.071*s,.003)]
  if theme=='gothic':ctrl=[(z,rx*.87,ry*.9,x,y) for z,rx,ry,x,y in ctrl]
  loft('Trouser leg',interp_levels(ctrl),cloth,.0025)
  curve('Outside seam',[(s*(abs(x)+rx),y,z) for z,rx,ry,x,y in ctrl],seam,.0012)
  curve('Slant pocket',[(s*.08,-.134,1.04),(s*.165,-.085,.94)],metal if theme=='gothic' else seam,.002)
 loft('Waistband',[(1.035,.157,.127,0,0),(1.074,.154,.125,0,0)],cloth,.0004)
 curve('Fly',[(.008,-.132,1.055),(.008,-.147,.96),(.002,-.145,.91)],seam,.0012)
 for a in [0,.9,2,pi,4.2,5.3]:
  x=.157*sin(a);y=-.127*cos(a);curve('Belt loop',[(x,y,1.032),(x*1.025,y*1.025,1.057),(x,y,1.079)],cloth,.005)
 export('bottom-'+theme)

def hair(theme):
 clear();col={'academy':(.63,.12,.29),'fantasy':(.68,.53,.30),'gothic':(.065,.019,.031)}[theme]
 mats=[material('Hair strand '+str(i),tuple(c*(.72+i*.1) for c in col),.28) for i in range(5)]
 # Scalp shell and locks with individual round strands: a full 3D volume.
 lv=[]
 for j in range(22):
  phi=.035+j/21*1.85;z=1.595+.118*cos(phi);lv.append((z,.085*sin(phi),.097*sin(phi),0,.002))
 loft('Wig cap',list(reversed(lv)),mats[1],0)
 for i in range(160):
  a=random.uniform(.40,2*pi-.40);length={'academy':.24,'fantasy':.37,'gothic':.32}[theme]*random.uniform(.91,1.07);phase=random.random()*pi
  pts=[]
  count=28 if theme=='gothic' else 9
  for j in range(count):
   t=j/(count-1);rad=.04+(.10 if theme=='gothic' else .058)*sin(t*pi/2);wave=(.013 if theme=='gothic' else .004)*sin(t*(38 if theme=='gothic' else 11)+phase)*t
   x=(rad+wave)*sin(a);y=.002-(rad*1.07+wave)*cos(a);z=1.707-length*t
   # Keep long locks behind shoulders, clear forehead.
   if theme!='academy':y+=.055*t*t
   pts.append((x,y,z))
  curve('Sculpted hair lock',pts,mats[i%5],.0015 if i%4 else .0025)
 # Swept fringe at front avoids a bald front under the dome.
 for i in range(36):
  x=-.073+i/35*.146;pts=[(x*.45,-.025,1.705),(x*.9,-.075,1.675),(x,-.099,1.63+random.uniform(-.018,.012))];curve('Fringe',pts,mats[i%5],.0019)
 if theme=='fantasy':
  for side in [-1,1]:
   for strand in range(3):
    pts=[]
    for j in range(48):
     t=j/47;ang=t*11*pi+strand*2*pi/3;pts.append((side*(.071+.011*sin(ang)),.095+.011*cos(ang),1.62-.29*t))
    curve('Braided plait',pts,mats[2+strand%3],.0055)
 export('wig-'+theme)

def ring_points(cx,cy,z,rx,ry,n=48):return [(cx+rx*sin(i*2*pi/n),cy-ry*cos(i*2*pi/n),z) for i in range(n)]

def bowtie():
 clear();silk=material('Striped navy silk',(.018,.036,.07),.36,fabric=True);stripe=material('Gold woven stripe',(.76,.7,.32),.5)
 for s in [-1,1]:
  patch('Bow wing',[(0,-.101,1.451),(s*.067,-.112,1.48),(s*.06,-.12,1.413),(0,-.107,1.438)],silk)
  for t in [.35,.65]:curve('Diagonal stripe',[(s*.063*t,-.119,1.46+.02*t),(s*.065*t,-.126,1.44-.022*t)],stripe,.002)
 ellipsoid('Bow knot',(0,-.117,1.445),(.014,.01,.019),silk);export('accessory-academy-neck')

def glasses():
 clear();metal=material('Aged gilt steel',(.39,.29,.10),.25,.8);lens=material('Clear lenses',(.65,.76,.79),.09)
 lens.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=.85
 for s in [-1,1]:
  pts=[(s*.039+.029*sin(i*2*pi/48),-.101,1.612+.027*cos(i*2*pi/48)) for i in range(48)];curve('Lens rim',pts,metal,.0015,True)
  ellipsoid('Lens',(s*.039,-.1,1.612),(.028,.001,.02),lens)
  curve('Temple',[(s*.072,-.10,1.624),(s*.08,-.02,1.625),(s*.077,.04,1.613)],metal,.0023)
 curve('Bridge',[(-.012,-.104,1.616),(0,-.112,1.622),(.012,-.104,1.616)],metal,.0024);export('accessory-academy-face')

def belt():
 clear();leather=material('Brown leather',(.10,.045,.016),.52);brass=material('Belt hardware',(.18,.19,.20),.2,.9)
 loft('Leather belt',[(1.043,.167,.134,0,0),(1.08,.163,.13,0,0)],leather,0)
 curve('Buckle',[(-.026,-.142,1.041),(.026,-.142,1.041),(.026,-.142,1.083),(-.026,-.142,1.083)],brass,.003,True)
 curve('Buckle pin',[(0,-.147,1.043),(0,-.148,1.079)],brass,.0018);export('accessory-fantasy-waist')

def necklace(theme):
 clear();metal=material('Antique silver',(.47,.46,.43),.25,.9);leather=material('Dark leather cord',(.043,.022,.013),.75);stone=material('Purple gemstone',(.29,.025,.55),.14)
 if theme=='gothic':
  red=material('Red coral',(.49,.015,.008),.29)
  curve('Leather and silver necklace',[(.072*sin(i*2*pi/80),-.082*cos(i*2*pi/80),1.453-.11*max(0,cos(i*2*pi/80))) for i in range(80)],leather,.002,True)
  for j in range(9):
   a=(j-4)*.19;ellipsoid('Coral bead',(.072*sin(a),-.085*cos(a),1.453-.112*cos(a)),(.005,.005,.006),red)
  ellipsoid('Coral fish charm',(0,-.096,1.326),(.012,.004,.021),red)
  patch('Fish tail',[(-.01,-.10,1.30),(.01,-.10,1.30),(0,-.10,1.314)],red)
 else:
  pts=[(.062*sin(i*2*pi/80),-.09*cos(i*2*pi/80),1.455-.17*max(0,cos(i*2*pi/80))) for i in range(80)]
  curve('Necklace cord',pts,leather,.0018,True)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(0,-.113,1.268));o=bpy.context.object;o.name='Faceted amethyst';o.scale=(.022,.007,.022);o.data.materials.append(stone)
  gold=material('Gold pendant frame',(.62,.39,.08),.22,.8)
  curve('Diamond setting',[(0,-.117,1.294),(.025,-.117,1.268),(0,-.117,1.242),(-.025,-.117,1.268)],gold,.0016,True)
 export('accessory-'+theme+'-neck')

def hairbow():
 clear();silk=material('Gold satin',(.66,.45,.14),.36,fabric=True);gold=material('Gold sequins',(.73,.55,.22),.2,.8)
 for s in [-1,1]:
  patch('Hair ribbon',[(.05,.075,1.66),(.05+s*.052,.09,1.70),(.05+s*.063,.09,1.64),(.05,.073,1.65)],silk)
  patch('Ribbon tail',[(.05+s*.006,.078,1.654),(.05+s*.04,.105,1.57),(.05+s*.016,.105,1.58)],silk)
 ellipsoid('Ribbon knot',(.05,.067,1.658),(.014,.013,.016),silk)
 for i in range(65):
  x=.05+random.uniform(-.05,.05);z=1.66+random.uniform(-.015,.025);ellipsoid('Sequin',(x,.065,z),(.003,.001,.003),gold)
 export('accessory-gothic-hair')

if __name__=='__main__':
 blazer();blouse();corset()
 for theme in ['academy','fantasy','gothic']:pants(theme);hair(theme)
 bowtie();glasses();belt();necklace('fantasy');necklace('gothic');hairbow()
