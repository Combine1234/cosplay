# 3D Cosplay Studio — accepted implementation plan

User decisions: free tools/assets only; authentic photographs, 15 separate items; approximate 3D reconstruction from those photographs accepted; three themes (academy, fantasy, gothic); mix cross-seller items and adjust wigs/accessories. Realistic male/female mannequins, upright, orbit 360 degrees, persistent left-hand viewport, right catalog scroll. Previous accounts/orders/listings remain intact. Push current codex/closet-interactive branch when GitHub write credentials permit. Connected account Mindiee currently has pull=true/push=false.

## Task 1 — Models and photographed catalog
Prepare realistic male/female base meshes using official free assets; 15 photographic references (3 tops, 3 pants, 3 wigs, 6 accessories) with actual permission/attribution records. Model real 3D volumes, folds and material features referenced by each picture. Generated renderings must never be presented as photographs. Deliver model files and studio-catalog.json. Disclose any gaps; no fake assets merely to fill count.

## Task 2 — Persistent renderer and UI
Three.js GLTFLoader + OrbitControls. Fixed-height left scene/right scrolling catalog; mobile sticky compact scene above list. Maintain scene, camera and scroll during filter/detail changes. One top, bottom, wig; accessories exclusive by neck, waist, face, hair anchor. Independent male/female body measurements; garment size separate from body; numeric fit remains an estimate. Readiness/loading errors visible. Keep original per-item purchase and seller flow.

## Task 3 — Repository and outfit
Add model metadata and per-profile outfit refs with transforms; preserve old cosplay-v1 state/history. Migrate by merging stable-ID studio listings without replacing user records or sold stock. Reject deleted/paused/sold purchase with atomic existing transaction. Restrict saved transforms and references; never mutate variant measurements when visual adjusting an accessory.

## Task 4 — QA, documentation, delivery
Test anatomy/slots/ownership/persistence and existing purchase behavior, browser orbit and actual 3D rendering, all 15 references/meshes, both body styles, desktop/mobile layout, quick selection loading races, resource cleanup. Commit stable stages and attempt authorized push; report verified remote result. Package exact final commit and source/asset credits.

## Interface contract
Root owns public models/photos and studio-catalog.json. UI implementer owns renderer, UI, domain/migration integration. No shared file edits.
Catalog JSON {version:1, bodies:{female:{url,sourceUrl,license},male:{url,sourceUrl,license}}, items:[...]}. Item: {id,title,character,series,description,theme,category:'top'|'bottom'|'wig'|'accessory',attachmentSlot:'top'|'bottom'|'wig'|'neck'|'waist'|'face'|'hair',sellerId,condition:'good',components:[title],photos:[{id,src,tag:'front'}],coverId,defects:[],lengthTarget:'waist'|'ankle',sizeVariants:[{id,size:'S'|'M'|'L',stock:1,price,measurements:{shoulder,chest,waist,hip,length}}],model:{url,anchor:[x,y,z],referenceBody:{height:170,chest:90,waist:72,hip:96,shoulder:40},sourceUrl,license},photoCredit:{sourceUrl,creator,license,licenseUrl}}. URL paths under studio-assets/. GLBs Y-up, meters, world origin at feet and X center, front +Z, upright all models same space. Female body baseline 170cm and male 178cm; load normalized world-space full meshes. Garment position built at female 170cm baseline; renderer adjusts localized scale/body clearance by category, not arbitrary whole-body scaling. Root will communicate exact body baseline/asset readiness before integration.
