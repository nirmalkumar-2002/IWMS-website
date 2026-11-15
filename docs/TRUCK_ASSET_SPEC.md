# Garbage truck asset spec (GLB handoff)

This is the brief for the 3D artist preparing the licensed photoreal garbage truck for the IWMS hero. The loader is `components/hero/scene/ModelTruck.tsx`. Everything below matches what that file and the Director (`scene/Director.tsx`) expect. If a rule here is broken, the truck either renders incorrectly or does not animate.

## 1. Delivery

| Item | Requirement |
| --- | --- |
| Path | `public/models/garbage-truck.glb` (single binary glTF 2.0) |
| Size | **≤ 8 MB** after compression |
| Geometry compression | Draco. The decoder is self-hosted in `public/draco/` and passed to `useGLTF(url, '/draco/')`. |
| Textures | WebP or JPEG/PNG. **KTX2/Basis is not wired up and will fail to load.** |

`vite.config.ts` checks whether this file exists when Vite starts. If it does, `__TRUCK_MODEL__` is `true`: `ModelTruck` replaces the development `ProxyTruck`, and the "Development proxy vehicle" label in the corner of the hero disappears (since Phase 3.3 that label is shown only in internal/debug mode — `?debug` or `npm run dev` — so check there). No code change is needed. Restart `npm run dev` after adding or removing the file, because the flag is evaluated only once.

## 2. Units, axes, origin

- **Metres**, **Y up**, truck **faces +X**. Apply/freeze all transforms. The root node must have no scale or rotation.
- **Origin = centre of the front axle, at ground level** (y = 0 is the tyre contact patch). The Director translates this point along +X when the truck drives off.
- Target envelope: **9.5–10 m long, 2.5 m wide (body, excluding mirrors), ~3.6 m high**. Rear-loader, cab-over, tandem rear axle. With this origin, the front bumper sits at x ≈ +1.6 and the rear (hopper and lift arms) at x ≈ −8.2.
- glTF is right-handed. If you face +X with +Y up, **+Z is the vehicle's right-hand side** (the driver's right), which is the **left of the image in a front elevation**. The hero cameras sit on the +Z side, so +Z is the hero side of the truck.

## 3. Node hierarchy and naming

Names are matched by case-sensitive regex against **every** node in the scene, including child meshes. Only the nodes listed below may use these prefixes. Name sub-meshes and **glTF mesh data** in lowercase (for example `tyre_fl_geo`) so they do not match by accident. Three.js names multi-primitive child meshes after the glTF mesh name, so this applies to mesh names too.

```
Scene
├── Body                 ^Body$     all sprung geometry: cab, compactor, hopper, chassis, glass, mirrors, lamps
│   ├── Headlight_L      ^Headlight_L$   lens mesh, +Z side
│   ├── Headlight_R      ^Headlight_R$   lens mesh, −Z side
│   ├── Marker_*         ^Marker_        amber roof bar, side markers, front indicators (any number)
│   └── Taillight_*      ^Taillight_     red rear lamps (any number)
├── Wheel_FL             ^Wheel_    one empty pivot per wheel (or dual-wheel pair), sibling of Body
│   └── tyre_fl, rim_fl …          visual meshes (lowercase, no prefix)
├── Wheel_FR
├── Wheel_RL1, Wheel_RR1, Wheel_RL2, Wheel_RR2 …
```

### `Body`
- Exactly one node named `Body`. It holds **everything except the wheels**. At runtime it is re-parented under a pivot at the rear axle, and it is pitched about Z (acceleration squat) and offset a few millimetres in Y (idle shimmer).
- Wheels must **not** be children of `Body`. Any geometry outside both `Body` and the `Wheel_*` nodes stays rigid and does not squat.
- Put lamp nodes inside `Body` so they move with it.

### `Wheel_*`
- Each pivot's origin is at the **hub centre**, and it **spins about its local Z axis** (the axle runs along world Z). The Director assigns `rotation.z = -distance / radius` directly. **The pivot's own rotation must therefore be identity.** For far-side wheels, apply the 180° flip to a child node, never to the pivot. (`ProxyTruck.tsx` shows the pattern.)
- The rolling radius is measured as **half the height of the pivot's world bounding box**. Only tyre and rim may be inside the pivot. Do not include brake drums, mudguards or anything else that extends beyond the tyre. A typical radius is ≈ 0.52 m.
- Rear tandem pivots must sit at **x < −1**. Their mean x becomes the squat pivot. If no pivot meets this condition, the code falls back to x = −5.
- Dual rear wheels can share one pivot per side per axle.

### Lamps
| Name | Count | Emissive colour (suggested) | Driven peak (`emissiveIntensity`) |
| --- | --- | --- | --- |
| `Headlight_L` (**+Z**) | 1 | `#fff3e6` (5600 K) | 7 × `rig.headL` |
| `Headlight_R` (**−Z**) | 1 | `#fff3e6` | 7 × `rig.headR` |
| `Marker_*` | any | `#ffa526` amber | 5 × `rig.marker` |
| `Taillight_*` | any | `#c4161c` red | 3.2 × `rig.tail` |

- "L" and "R" follow the code, not anatomical convention: `Headlight_L` must be on the **+Z** side. The Director maps `headlightLenses[0]` to `rig.headL` and to `headSpots[0]`/`beams[0]`. Spot/beam side 0 sits at +`LAMPS.head.z`, and the proxy's `headL` lens is at +Z. The +Z lamp ignites first (t = 4.30 s, the right lamp at 4.34 s) and is the one shown in the 70 mm headlight close-up.
- Each lamp node's lens is a mesh with a **MeshStandard-compatible PBR material** (glTF metal/rough) with a **non-black emissive colour** (`emissiveFactor`, plus an optional `emissiveTexture`). At load time the material is cloned per mesh and `emissiveIntensity` is reset to 0. The Director then animates it, so `KHR_materials_emissive_strength` is overridden and not needed. In the unlit state the lens should read as clear glass or chrome reflector, from base colour and roughness alone.
- For headlights, only the **first mesh** under `Headlight_L`/`Headlight_R` is animated. Keep exactly one lens mesh in each node and put the housing/reflector in `Body`.

### Lamp positions must match `LAMPS`
The real spot lights, volumetric beams and glow point lights are not part of the model. They are placed from `LAMPS` in `components/hero/scene/handles.ts` (truck-local metres):

| Constant | Value | Meaning |
| --- | --- | --- |
| `LAMPS.head` | x 1.53, y 1.05, z ±0.86 | headlight lens centres (beam origin is x + 0.02) |
| `LAMPS.tail` | x −8.12, y 1.05, z ±1.08 | tail lamp centres (red glow at x − 0.4, z 0) |
| `LAMPS.markerRoofY` | 3.08 | amber roof marker bar height (glow at y + 0.25) |

Model the lamps at these coordinates (within about 2 cm). If the purchased truck's lamps sit elsewhere, keep the model and have a developer update the three values in `LAMPS` to the measured lens centres. Measure the lenses in the final GLB (glTF viewer or Blender with Y-up export), in front-axle-origin metres. `TruckLights.tsx` picks up the change automatically. Also check the `headlight` shot in `scene/rig.ts` (`target: [1.3, 1.15, 2.2]` world, where truck z = local z + 1.75) so the close-up still frames the +Z lens.

## 4. Materials and budget

| Budget | Limit |
| --- | --- |
| Triangles | 80k–200k total |
| Materials | ≤ 10, not counting the per-mesh lamp clones made at runtime |
| Draw calls | ≤ 30 (meshes × primitives) |
| Textures | ≤ 2048², sRGB for base colour/emissive, linear for normal/ORM |

- PBR **metal/roughness** only. No spec/gloss, no `KHR_materials_transmission`/`volume` (transmission is too expensive here; use dark, low-roughness glass).
- **Paint:** municipal green ≈ `#1f5a3a` base colour, roughness ~0.4, metalness 0, with **`KHR_materials_clearcoat`** (clearcoat 1, clearcoat roughness ~0.1). Three.js loads this as `MeshPhysicalMaterial`.
- **Glass** (near-black, roughness ≤ 0.05), **rubber** (roughness ~0.9), **chrome/alloy** (metalness 1, roughness 0.2–0.35), plus a dark chassis/plastic.
- Light dirt and wear on lower panels is welcome. Avoid baked lighting or AO in base colour; an AO channel in ORM is fine. Reflections come from a generated blue-hour environment (the scene's sky shader plus soft warm streetlight panels), not an HDRI with a sun, so paint should not rely on a hot specular highlight. The scene is also lit by a cool rim light and the truck's own lamps at pre-dawn.
- No embedded cameras, lights, animations or logos/branding of real operators.

## 5. Compression pipeline

Verified against `@gltf-transform/cli` 4.5.1. The `optimize` defaults **flatten the hierarchy, join meshes, instance wheels and merge materials into palettes**, and each of these breaks the node contract above. Turn them off explicitly:

```bash
npx @gltf-transform/cli@4.5.1 optimize truck-source.glb public/models/garbage-truck.glb \
  --compress draco \
  --texture-compress webp --texture-size 2048 \
  --flatten false --join false --instance false --palette false \
  --simplify false
```

- Do the decimation in the DCC tool so you control silhouettes. Leave `--simplify false`.
- Then inspect the result: `npx @gltf-transform/cli@4.5.1 inspect public/models/garbage-truck.glb`. Confirm the node names survived, check the triangle/material counts, and confirm the file is ≤ 8 MB.

## 6. Sourcing candidates

Evaluate these before buying. Confirm the polycount, topology and licence on the listing at purchase time.

| Source | Listing | Notes |
| --- | --- | --- |
| Sketchfab | "Industrial garbage truck" by FLED | ~75k tris. Closest to budget; needs splitting into Body/Wheel/lamp nodes. |
| CGTrader | "Realistic rear-loader garbage truck" | ~US$77. Rear-loader matches the proxy layout. |
| TurboSquid | #778437 | ~586k tris. Needs heavy decimation (target ≤ 200k). |

**Licensing:** the licence must be royalty-free and must **explicitly allow real-time embedding on a public website**. The GLB is downloadable by anyone, so standard "editorial" or "no redistribution in real-time engines" licences are not sufficient. Keep the licence PDF/receipt with the project records. Remove any third-party brand marks or livery.

## 7. Acceptance checklist

- [ ] `public/models/garbage-truck.glb`, ≤ 8 MB, Draco geometry, WebP/JPEG textures (no KTX2)
- [ ] Metres, Y up, faces +X, origin at front-axle centre on the ground, root transform identity
- [ ] ~9.5–10 m × 2.5 m × ~3.6 m; tyres touch y = 0
- [ ] One `Body` node with all sprung geometry; wheels are not inside it
- [ ] One `Wheel_*` pivot per wheel/dual pair at the hub centre, identity rotation, containing only tyre and rim; rear pivots at x < −1
- [ ] `Headlight_L` on +Z and `Headlight_R` on −Z, each with exactly one lens mesh
- [ ] `Marker_*` and `Taillight_*` lens meshes with emissive colour set
- [ ] No sub-mesh or glTF mesh name accidentally starts with `Body`, `Wheel_`, `Headlight_`, `Marker_` or `Taillight_`
- [ ] Lens centres within ~2 cm of `LAMPS` (or `LAMPS` updated, see §3)
- [ ] 80k–200k tris, ≤ 10 materials, ≤ 30 draw calls, textures ≤ 2K
- [ ] Clearcoat green paint, glass, rubber, chrome read correctly in the blue-hour environment
- [ ] Licence permits public real-time web embedding; receipt filed

## 8. Verify locally

```bash
npm run build && npm run start      # serves dist/ at http://127.0.0.1:4173
```

Open `http://127.0.0.1:4173/?quality=high` (full post-processing) and `?quality=medium`, and check:

1. The "Development proxy vehicle" label is gone, including in debug mode (`?debug`).
2. During the intro, the amber markers light first, then the tails, then the +Z headlight, then the −Z headlight. The beams and road pools originate exactly at the lenses.
3. Scroll through the shots: the headlight close-up frames the +Z lens, and the wheel close-up shows clean rotation with no wobble (a wobble means the pivot is off-centre).
4. At the drive-off, the wheels roll without sliding (correct radius), and the body squats slightly about the rear axle while the wheels stay planted.
5. The browser console shows no errors, and the Network tab shows `garbage-truck.glb` and `/draco/` decoder files loaded.

Then run `npm run test:foundation` (Playwright) to confirm the hero still passes its regression tests.
