import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'tools-runtime/human-base/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend'
OUT=ROOT/'studio-assets/models';OUT.mkdir(parents=True,exist_ok=True)
for gender,height in [('female',1.70),('male',1.78)]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 with bpy.data.libraries.load(str(SOURCE),link=False) as (src,dst):dst.objects=['GEO-body_'+gender+'_realistic']
 o=dst.objects[0];bpy.context.scene.collection.objects.link(o);o.location=(0,0,0);o.hide_set(False);o.hide_viewport=False;o.hide_render=False
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 for m in o.modifiers:
  if m.type=='MULTIRES':m.levels=1;m.render_levels=1;m.show_viewport=True;m.show_render=True
 bpy.ops.object.convert(target='MESH')
 zmin=min(v.co.z for v in o.data.vertices);zmax=max(v.co.z for v in o.data.vertices);factor=height/(zmax-zmin)
 for v in o.data.vertices:v.co.x*=factor;v.co.y*=factor;v.co.z=(v.co.z-zmin)*factor
 # Retail mannequin ceramic finish preserves the anatomical base.
 mat=bpy.data.materials.new('Warm ivory ceramic');mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.69,.60,.47,1);p.inputs['Roughness'].default_value=.3;p.inputs['Metallic'].default_value=.04
 o.data.materials.clear();o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 o.name='Mannequin '+gender
 print('BODY',gender,'verts',len(o.data.vertices),flush=True)
 for z in [.15,.5,.85,1.05,1.2,1.3,1.4,1.5,1.6]:
  vs=[v.co for v in o.data.vertices if abs(v.co.z-z)<.007 and abs(v.co.x)<.22]
  if vs:print('SLICE',z,[round(min(v[i] for v in vs),3) for i in range(2)],[round(max(v[i] for v in vs),3) for i in range(2)],flush=True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/('body-'+gender+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT.parent/('body-'+gender+'.blend')))
