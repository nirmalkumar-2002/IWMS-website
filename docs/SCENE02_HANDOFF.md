# Scene 02 → Scene 03 handoff

> **Phase 3.1 is now connected** (see `docs/SCENE03_HANDOFF.md`). The state below is no longer the end of the scroll: it is the timeline label `city:arrive`, where Phase 3.1 takes over. Scene 02 itself is unchanged; its part of the kinematics table is bit-identical.

Scene 02 (city entry) ends with the truck rolling slowly into the residential street. Phase 3 (household collection) must start from this state. Values come from `components/hero/scene/route.ts` (after the Phase 2.1 left-hand-traffic correction) and can be reproduced with `?debug` (`window.__iwmsHero`).

## Final state at the end of the scroll (timeline label `city:arrive`)

| Item | Value |
|---|---|
| Simulated drive time | `rig.driveSec = JOURNEY_END_SEC` ≈ 94.31 s |
| Route distance (front axle) | `JOURNEY_END` ≈ 697.67 m |
| Truck front axle (world) | ≈ (578.18, 0, 129.01) |
| Heading | +Z (route yaw = π/2; `drive.rotation.y = −π/2`) |
| Street | centre line x = `RESIDENTIAL.axisX` ≈ 576.68, 6 m concrete, runs +Z from `RESIDENTIAL.startZ` ≈ 28.93 |
| Truck lane | x − axisX = +1.50 (left lane for a +Z heading) |
| Speed | ≈ 2.4 m/s (8.6 km/h), easing toward 2.2 m/s |
| Steering | straight (curvature 0) |
| Wheel spin | `−distance / radius`, continuous with every earlier scene |
| Lamps | truck markers, tail and headlights on (1); fog beams scaled to 0.35 in daylight |
| Sky / dawn | `rig.dawn = 1`; **sunrise progress = 1** (`sunAt(697.67)`, early-morning sun) |
| Fog | FogExp2 colour `#9ea7b6` (morning haze), density `fogDensityAt(697.67) × 0.75` ≈ 0.0064 |
| Camera key `arrive` (truck-local: x fwd, y up, z = truck's right) | pos (−15, 5.6, 0.6), target (16, 1.2, 1.0), 28 mm |
| Camera (world) | ≈ (577.58, 5.6, 114.0), looking at ≈ (577.18, 1.2, 145.0) |
| Camera mode | Scene 02 truck-relative chase (`cityU = 1`), local offset damped (λ 3.2 / 4) |

Here the truck faces +Z, so truck-local +z (its right) is world −X. That side is the street centre.

### Route reference (Phase 2.1)

- Main road: the lane is `TRUCK_LANE_Z = −1.75` (in `rig.ts`) for the whole run, heading +X. `SCENE1_END_DISTANCE` is still 29.408.
- Right turn: starts at `TURN_START_X = 547.5`, radius 25.524. Front-axle samples are (559.96, −0.94) at 6°, (568.92, 3.75) at 28°, (575.38, 11.55) at 50° and (578.38, 21.23) at 73°. Steering is about 11° and speed about 16.5 km/h.
- `RESIDENTIAL.axisX = turnEnd.x − 1.5` ≈ 576.68 and `startZ` ≈ 28.93. Both are unchanged from Phase 2.
- Scene 01 shots (`SHOTS` in `rig.ts`) moved by Δz −3.5 together with the lane, and `SCENE1_FOLLOW` uses z = `TRUCK_LANE_Z + 6.45`. Framing relative to the truck is therefore unchanged, and the Scene 01 → 02 hand-over still matches exactly.
- City layout (`scene/city/layout.ts`):
  - The median occupies z 0..1.2, on the truck's right. It has two runs: x [490, 550], then a gap at the junction, then from ≈ axisX + 12 to the road end.
  - Painted black/yellow kerb on the −Z side of the approach.
  - Stop line at z −1.6.
  - Residential poles stand at axisX − 3.75, with arms reaching over the street.

## Sunrise (Phase 2.2)

- **Single source of truth.** `sunAt(distance)` in `scene/sun.ts` is a monotone cubic through these points:

  | Distance | ≤ 40 | 150 | 330 | 455 | 620 | `JOURNEY_END − 1` (≈ 696.7) |
  |---|---|---|---|---|---|---|
  | Progress | 0 | 0.15 | 0.40 | 0.62 | 0.90 | 1 |

  It is 0 for all of Scene 01 and in reduced motion, and identical forward and in reverse.
- **Who applies it.** `SunDirector.tsx` runs right after the Director and writes only uniform-level values (colours, intensities, light direction). Lights and shadow flags are fixed at mount, so nothing recompiles while scrolling.
- **What the end state looks like:**
  - The sky zenith is `#31548c`, and the horizon a warm grey `#cdc6b9`.
  - The sun sits at azimuth +12° (from +X toward +Z) and elevation +9°.
  - The sun's directional light is colour `#ffc78f`, intensity 1.4, aimed at 12° elevation. On the high tier it moves with the truck and casts shadows (2048 map, ±40 m ortho, snapped to texels).
  - The hemisphere light is `#a9bddb` / `#3a3530`.
  - The key light is 0.12 and the rim light 0.25.
  - Streetlights are off. Each pooled lamp switches off at its own point, like a photocell, between progress 0.55 and 0.66.
  - Lit windows are at 15%.
- **Tiers.**
  - **High:** sun shadows, cast by city buildings, walls and trees and by the truck.
  - **Medium (Intel integrated and mobile):** the same sunrise but no shadow map. The truck keeps its contact-shadow blob.
  - The sun reads as a glow painted into the sky shader, capped below bloom's threshold, so it looks the same without bloom.
- **For Scene 03:** read `refs.day.progress` (it stays 1), and don't add a second owner for daylight. Any new lit materials should register in `refs.day` with their night value as `base`.
- **Known gaps:**
  - Reflections still come from the environment baked at night; only its intensity is ramped.
  - City streetlight heads share a material with lit windows, so they dim to the window level (15%) rather than switching fully off.

## Visible sun disc (Phase 3.4)

- **Rendering.** The sky shader (`World.tsx`) draws a disc inside the existing sunrise branch, so Scene 01 is unchanged (`uSunAmt = 0` skips it).
  - It is about 0.85° across, roughly 1.6× the real sun so it reads at these focal lengths, with a soft limb.
  - Angular distance is computed as atan2(|d×s|, d·s).
  - The horizon line clips it.
  - Colour runs from deep orange while low (up to 4°) to warm white by about 9°.
  - Brightness comes from the `sunDisc` row in `SUN_KEYS`, written by `SunDirector` as `uSunDisc`. It is uniform-only, so scrolling never recompiles a shader.
- **Occlusion.** The dome draws first with no depth writes, so every opaque building, skyline block and the ground paints over the disc. Verified in renders: during the street-level city approach the sun (about 3–5° up) is always behind the city-entrance buildings or the distant skyline band, which covers the sky up to about 11° from the street.
- **Where it is seen.** In the aerial establishing shot (labels `city:rise` → `city:establish`, timeline t ≈ 17.0–18.3).
  - It emerges between the skyline towers at the right of the frame (t ≈ 17.2), then clears the skyline (t ≈ 17.7) before leaving frame.
  - It is not in frame during the residential street or Phase 3; the camera there faces away from the sun's azimuth.
- **Sky versus sunlight elevation.**
  - `skyElevationDeg` (−6, −5, 5.5, 6, 6.5, 9) is the sun as seen in the sky, driving the glow and the disc.
  - `elevationDeg` (−6, −5, −2.5, 0, 6.5, 9) is unchanged and still drives the sunlight direction and shadows (clamped ≥ 7° for the light).
  - The two agree from progress 0.9 on, so late Scene 02 and Phase 3 are identical.
  - The sky sun rises earlier than the light because at the street-level approach the disc can never clear the buildings. Approved as a sky-only change.

## Left-hand traffic conventions

Every new path or shot in Phase 3 should follow these rules:

- On the main road the truck uses lane z = −1.75 and heads +X. Oncoming traffic uses the +Z carriageway, on the far side of the median.
- Right turns start from the left lane and go through the median gap. The truck crosses the oncoming carriageway and enters the **left** lane of the target street.
- On a street heading +Z, the left lane is x = axisX + 1.5. As a general rule, the left lane sits 1.5 m to the left of the centre line on a 6 m street.
- Truck-local +z is the truck's right, which is the road-centre side. Kerbside work (bins, gates, workers) happens on truck-local −z.
- Recommendation: the licensed GLB should be **right-hand drive**, matching Indian vehicles. With RHD the cab sits on the centre side and the loading side faces the kerb. See `docs/TRUCK_ASSET_SPEC.md`.

## How to connect Scene 03

1. **Timeline.** Continue the same reveal timeline after `city:arrive` in `timeline.ts`, following the `addCityEntry` pattern. Keep a single ScrollTrigger, and grow `.hero--cinematic` in `hero.css` by about 50vh per scroll unit added.
2. **Motion.** Extend the existing kinematics table in `route.ts` rather than adding a second one:
   - Lengthen `RESIDENTIAL_LENGTH` and the street run.
   - Move `JOURNEY_END` to the collection stop.
   - Give `targetSpeed()` a final stop profile, braking at most 0.5 m/s² and respecting the jerk limit of 0.35 m/s³.

   `rig.driveSec` then continues past 94.31 s, and wheels, squat and lights follow automatically. Keep the truck at x = axisX + 1.5. Any pull-over to the kerb should move toward +X, never across the centre line.
3. **Camera.** Add keys to `CITY_SHOTS`, or create a `COLLECT_SHOTS` array with its own `cityU`-style parameter. The first new key must equal `arrive` exactly (pos (−15, 5.6, 0.6), target (16, 1.2, 1.0), 28 mm). The Director's hand-over then has no pop. All keys are truck-local, so they are independent of traffic side.
4. **Camera corridor.** The 6 m street sits between 1.5 m walls, so keep the camera over the carriageway: x within about axisX ± 1.5. The `arrive` pose sits at about axisX + 0.9. Keep that corridor clear of balconies and of the pole arms at axisX − 3.75 when choosing heights.
5. **Environment.** Plots on this street are generated in `scene/city/layout.ts`, zone D. Pick a gate plot on the **+X (kerbside) frontage** at z ≈ 150–170 for the pickup.
6. **Out of scope until Phase 3 is approved:** workers, bins, QR scanning and the pickup animation.

## Frame-hitch investigation (Phase 2.1)

**Finding:** the reported "first time the street end comes into view" hitch was not a first-use cost. On an Intel UHD (0x4628, ANGLE/D3D11) the **high** tier is GPU-bound at about 19–26 ms per frame late in the journey, against a 16.7 ms budget. Chrome keeps issuing frames until a WebGL `CommandBuffer::Flush` in the GPU process blocks for 0.3–4.5 s. This happens on cold passes, warm passes and static views alike.

**Evidence:**
- During each stall the renderer main thread is idle, and long-animation-frame script time is only about 14 ms.
- Geometry, texture and program counts stay constant (152 / 65 / 34). There are no `texImage`, `bufferData`, `generateMipmap`, `renderbufferStorage` or shader-compile calls in the stalled frames.
- The JS heap is flat.
- Post-processing costs about 10–14 ms of GPU time: bloom about 4–9 ms, SMAA about 3 ms, the rest about 3 ms.
- The medium tier measures 9–10 ms and never stalls.

**Fix:** `quality.ts` auto-detects Intel integrated GPUs (not Arc) as **medium**. Measured on the same machine, with three interleaved cold runs each in auto-detect mode:
- worst frame before: 450 ms – 2 s, plus one 39 s hang;
- worst frame after: 33–50 ms.

`?quality=high` still forces the high tier and still stalls on this GPU.

**Trade-off:** Intel-integrated desktops now render without bloom, vignette, grain or SMAA, at a lower DPR cap. Only one GPU was available for testing. AMD APUs ("Radeon(TM) Graphics") are likely similar but are unverified. An adaptive guard is a possible follow-up: drop bloom and SMAA when `EXT_disjoint_timer_query_webgl2` reports frames over budget.

## Known limitations carried into Phase 3

- **Development proxy truck.** The licensed GLB is still pending; see `docs/TRUCK_ASSET_SPEC.md`. The proxy's cab side is not meaningful.
- **Procedural city.** This is a stand-in environment: procedural buildings and props with CC0 textures (Poly Haven `painted_plaster_wall`, `concrete_pavers_03`; ambientCG `Concrete034`). It is not final photoreal art.
