# CLOSET 3D Cosplay Studio implementation report

Date: 9 September 2026

## Delivered behavior

- The default route is the 3D Studio. A persistent mannequin occupies the left side while the 15-piece catalog scrolls independently on the right. On a narrow screen, the mannequin remains sticky above the catalog.
- Users can switch between realistic-proportion female and male retail mannequins, orbit horizontally and vertically, zoom, or select front/left/back/right camera views.
- The catalog contains three tops, three bottoms, three wigs, and six accessories across Academy, Fantasy, and Gothic themes. Top, bottom, and wig each accept one item. Neck, waist, face, and hair accessories each have an independent slot.
- Each item has S, M, and L variants. Users can mix sellers, change a garment size, and change the position, depth, rotation, and visual scale of the currently selected item. Numeric fit remains calculated separately from visual transforms.
- Outfit and male/female body data are saved per demo account. Catalog migration adds stable studio items and refreshes bundled asset metadata without replacing edited titles, stock, accounts, orders, or prior Closet data.
- Product detail routes studio-ready pieces back into the 3D Studio with the selected variant. The existing atomic one-item simulated purchase remains available, with stock consumption and order snapshot in one IndexedDB transaction.

## Asset method

The female and male mannequin meshes come from [Blender Human Base Meshes v1.4.1](https://www.blender.org/download/demo-files/) under CC0. The original anatomy was retained, rescaled to 170 cm and 178 cm, smoothed, and given a warm ivory ceramic mannequin material. The browser renderer uses vendored [Three.js 0.180.0](https://threejs.org/) under the MIT License.

All 15 catalog images are photographs of physical objects selected from Wikimedia Commons. Each card and detail view keeps creator, source, license, and image-specific limitations. The exact list is in [STUDIO-ASSET-CREDITS.md](STUDIO-ASSET-CREDITS.md) and machine-readable metadata is in `studio-catalog.json`.

The clothing, wigs, and accessories are original approximate 3D reconstructions made for this prototype. They use modeled volume, cloth thickness, seams, fittings, fabric grain, hair strands, and separate materials. They are not photogrammetry, scans, or proof of exact product fit. This distinction is visible beside product details and fit results.

## Material evidence limits

Five photographs do not show a perfectly isolated full item: the academy wig appears in a display row, the belt photo contains two belts, the black jeans photo shows the waist area, the blazer is partly obscured while worn, and the hair bow is shown on a wearer. Those limits are included in their records. Replacing them with seller-owned multi-angle product photography would be the first step toward production fidelity.

The studio is still an MVP. It does not simulate fabric physics, collision, drape, stretch, lighting parity, or scanned body shape. Model transforms provide a visual composition tool. The fit labels use entered measurements and remain estimates. No payment, shipping, identity verification, or external notification is real.

## Reproduction

Run `npm start`, open `http://127.0.0.1:4173/#studio`, and use `npm test` for domain and asset-integrity checks. Blender source scripts are in `tools/prepare-bodies.py` and `tools/generate-studio-assets.py`; the catalog builder is `tools/build-studio-catalog.mjs`.
