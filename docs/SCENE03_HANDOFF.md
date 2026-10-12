# Phase 3.1 → Phase 3.2 handoff

Phase 3.1 (smart collection & digital connectivity) continues Scene 02 on the same scroll timeline. The truck rolls on down the residential street, slows naturally, and stops at the plot‑12 household gate. A world‑anchored digital layer then reveals the IWMS story:

**Physical collection → GPS tracking → connected collection points → IWMS monitoring.**

Phase 3.2 must start from the state below. Values come from `components/hero/scene/route.ts`, `collection.ts` and `timeline.ts`. Reproduce them with `?debug`: `window.__iwmsHero.collection()`, `.truck()`, `.sun()`.

> IWMS is the subject; the truck is a storytelling element. Everything in the digital layer is **illustrative demo data** and is labelled on screen as such.

## Final state at the end of the scroll (timeline label `collect:end`)

| Item | Value |
|---|---|
| Simulated drive time | `rig.driveSec = COLLECT_END_SEC` = 117.3125 s. The truck stopped at `STOP_SEC` = 113.3125 s; the 4 s hold (`STOP_HOLD`) follows |
| Route distance (front axle) | `STOP_DISTANCE` ≈ 720.542 m |
| Truck front axle (world) | ≈ (578.181, 0, 151.880): exactly `COLLECTION_GATE.z + 9.5` |
| Heading | +Z (route yaw = π/2) |
| Lane | x = `RESIDENTIAL.axisX + 1.5` (left lane, kerbside +X). There is no pull-over: the kerbside body face is ≈ 1.25 m from the carriageway edge |
| Speed / accel | 0 / 0 |
| Wheels | `rotation.z = −STOP_DISTANCE / radius`, continuous with every earlier scene; steering 0 |
| Lamps | unchanged from Scene 02 (head, marker and tail on) |
| Sunrise | `sunAt(720.5) = 1`: early morning, same as Scene 02's end. `SunDirector` still owns all daylight |
| Fog | morning haze, `fogDensityAt` clamped at its city value |
| Camera key `network` (truck‑local: x fwd, y up, z = truck's right) | pos (−30, 17, 2.5), target (10, 0, −1.5), 24 mm |
| Camera (world) | ≈ (575.68, 17, 121.88), looking at ≈ (579.68, 0, 161.88) |
| Camera mode | Scene 02 truck-relative chase; `cityU = 1`, `collectU = 1`, local offset damped (λ 3.2 / 4) |
| Digital layer | `pin = gps = route = net = 1`: every element visible (see below) |

## Collection point

- **Gate.** The current collection point is `COLLECTION_GATE` = (axisX + 4, 142.38) ≈ (580.681, 142.380). It is the east (+X, kerbside) compound-wall gate of zone‑D residential plot 12. The gate opening is 3 m wide.
- **Truck position.** The front axle stops 9.5 m past the gate centre, so the rear hopper sits just beyond the opening.
- **Validation.** The coordinate is taken from the seeded layout, `buildCity(q).gates`. It is identical on the high and medium tiers. `tests/collection.spec.ts` asserts that it matches the layout, and so do the other demo points in `COLLECTION_POINTS`.
  - The layout records gates without extra RNG draws, so the generated street is unchanged.
- **Demo points** (`COLLECTION_POINTS` in `scene/collection.ts`):

  | ID | Plot | Side | Status | Gate z |
  |---|---|---|---|---|
  | H‑11 | 11 | +X | collected | 127.693 |
  | H‑12 | 12 | +X | **current** | 142.380 |
  | H‑13 | 13 | +X | scheduled | 153.446 |
  | H‑14 | 14 | +X | scheduled | 162.805 |
  | H‑31 | 10 | −X | scheduled (return run) | 150.147 |
  | H‑32 | 11 | −X | scheduled (return run) | 163.259 |

## Motion (Phase 3.1 part of the one kinematics table)

- **Single table.** `simulate()` in `route.ts` integrates the whole journey. Every step up to `JOURNEY_END` evaluates exactly the same expressions as before Phase 3.1, so Scene 01 and Scene 02 are **bit-identical**.
  - Verified against commit `244bd52`: 0 difference over 9,432 `driveAt` samples up to `JOURNEY_END_SEC`.
- **The stop.** The stop is appended after Scene 02's end:
  - Target speed is `min(ARRIVE_SPEED, √(2·0.25·(stopTarget − d)))`.
  - Braking floor is −0.4 m/s² (peak deceleration measured: 0.40 m/s²). Jerk is limited to 0.35 m/s³ per step. The only exception is a 0.009 m/s² step at the instant of standstill, when v ≤ 0.02 m/s is clamped to 0.
  - The truck enters at 2.38 m/s (Scene 02's end speed) and stops 19 simulated seconds later.
  - `kin` corrects the stop target 4 times at module load, so the stop lands within 1 cm of the gate + 9.5 m.
- **Exports.**
  - `SCENE2_END_SEC` (= `JOURNEY_END_SEC`, unchanged at 94.3125)
  - `STOP_SEC`, `COLLECT_END_SEC`, `STOP_DISTANCE`, `COLLECTION_GATE`, `STOP_HOLD`

## Timeline

There is one ScrollTrigger and one timeline. `.hero--cinematic` grew from 1400vh to **1850vh**, so a unit is still about 50vh. Scene 01 and Scene 02 are unchanged in timeline units. As a fraction of total scroll they now occupy the first 25.7 / 35.1 ≈ 73%.

| Label / beat | Timeline units | What happens |
|---|---|---|
| `city:arrive` = `collect` | 25.70 | Scene 02's last key (`collectU = 0` equals `arrive` exactly) |
| driveSec tween | 25.70 → 29.47 | `JOURNEY_END_SEC → COLLECT_END_SEC`, ease `none`, at Scene 02's end rate (85.3125 / 14 ≈ 6.094 s per unit, since `cityEase'(1) = 1`), so on-screen speed is continuous |
| camera `arrive → kerb` | 25.70 → 29.00 | `collectU` 0 → 0.5, focal 28 → 32 mm, `sine.inOut` |
| `pin` | 27.32 → 28.22 | collection-point marker H‑12 appears as the truck creeps up to the gate |
| `gps` | 28.12 → 28.92 | vehicle GPS tag: live km/h read-out from the table, then "Stopped at collection point" at `collect:stop` (28.82, truck at rest) |
| `collect:network`: camera `kerb → network` | 30.10 → 32.50 | `collectU` 0.5 → 1, focal 32 → 24 mm. The GPS fix/speed lines fold away; the tag keeps its chip |
| `route` | 31.30 → 33.10 | planned route drawn to a fraction of its **world** length; nearby points light as the route reaches them |
| `net` | 32.90 → 34.10 | links vehicle → IWMS and H‑12 → IWMS; the monitor panel rises in |
| `collect:end` | 34.70 | finished frame holds |
| tail pad | 34.70 → 35.10 | |

Story steps (`.hero__collect-steps`) are derived from these values: a step becomes active at ≥ 0.5 of its reveal; its colour change uses a 0.4 s CSS transition. Every position, opacity and state is a pure function of scroll. Two ambient CSS loops run on the clock, the GPS "live" dot and the dash flow on the IWMS links, and both are paused (`data-live`) except while the layer is showing.

## Camera keys (`COLLECT_SHOTS`, truck-local, sampled by `rig.collectU` at i / 2)

| Key | pos | target | focal |
|---|---|---|---|
| arrive (= Scene 02 `arrive`) | (−15, 5.6, 0.6) | (16, 1.2, 1.0) | 28 |
| kerb | (−22, 3.4, 2.4) | (−5, 1.4, −1.6) | 32 |
| network | (−30, 17, 2.5) | (10, 0, −1.5) | 24 |

- **Corridor.** All camera *positions* stay inside local z ∈ [0, 3], i.e. world x within axisX ± 1.5. The `kerb` and `network` targets look slightly toward the kerb (z ≈ −1.5).
- **Hand-over.** The Director switches from the city spline to the collection spline as soon as `collectU > 0`. At 0 they share the `arrive` key, so there is no pop.
- **Scene 02 spline.** Adding keys to `CITY_SHOTS` would have changed the centripetal Catmull–Rom tangents near `arrive`. That is why Phase 3.1 has its own spline.

## Digital layer (`scene/CollectionOverlay.tsx`)

- **Architecture.**
  - `CollectionHudView` (DOM, outside the Canvas) renders once.
  - `CollectionDirector` (inside the Canvas, mounted after the Director and SunDirector) runs in `useFrame`. It refreshes the camera matrices, projects every world anchor, and writes `transform`, `opacity` and SVG attributes imperatively, only when they change.
  - It makes no React updates while scrolling, adds no WebGL draw calls, programs or textures, and is fully inactive (`visibility: hidden`) until `pin > 0`.
- **Anchors (world).**
  - Collection points: ground ring at the gate (y 0.05), and a label head at y 2.7 (current) or 2.2 (others), joined by a stem.
  - GPS tag: front axle + 1.6 m back along the heading, y 4.1. It follows the truck during the deceleration.
  - Route ahead: the left lane from z 154.5 to the street end, then a 4 m-radius left (kerbside) turn into the cross lane at z = RES_END + 2.5, about 14 m along it.
  - Route behind: driven route z 118–143, dimmed.
- **Accuracy.** Anchors are projected each frame after the Director has placed the camera, using the camera's freshly refreshed matrices. They are never a frame behind.
  - `__iwmsHero.collection()` re-projects every anchor with the camera as last rendered. On GPU the rendered and re-projected positions agree within 0.07 px, during the camera rise and at rest. `tests/collection.spec.ts` asserts ≤ 2 px.
  - This guards against stale or lagging writes. It is not a pixel comparison against the WebGL image; the screenshots reviewed during development show the markers sitting on the gates.
- **Monitor panel.** It is right-aligned on desktop and across the bottom in portrait. A dashed amber tag reads **"Illustrative demo data"**. The demo values (vehicle IWMS‑07, route R‑14 · Ward 7, 11 / 24 households, next H‑13 · 11 m, GPS fix) live in `DEMO` in `collection.ts`.
- **Copy.** In `content/hero.ts → collect`, marked **PROPOSED, not yet approved**.
- **Modes.** Reduced motion (still) and static/poster modes never mount the layer.

## How to connect Phase 3.2

1. **Timeline.** Continue after `collect:end` in `timeline.ts`, following the `addCollection` pattern. Keep the single ScrollTrigger, and grow `.hero--cinematic` by about 50vh per unit added.
2. **Camera.** The first new key must equal `network` exactly. Add keys to `COLLECT_SHOTS` only **after** `network` and re-space `collectU`. Alternatively, start a new spline whose first key is `network`.
3. **Truck.** The truck is at rest; `driveSec` can stay at `COLLECT_END_SEC`. If it should pull off to H‑13 (11 m ahead), extend `simulate()` after the hold rather than adding a second table, and keep the Scene 02 prefix bit-identical.
4. **Kerbside work.** Workers, bins and QR happen on truck-local −z (world +X), at the H‑12 gate (580.68, 142.38). The rear hopper is just past the opening.
5. **Digital layer.** Fade or reuse it through the `pin`, `gps`, `route` and `net` rig values. Don't add a second projection loop; add anchors to `CollectionDirector`.
6. **Out of scope until approved:** worker animation, waste loading and QR verification.

## Changes outside Phase 3.1 scope (for review)

- **Proxy badge stretched on portrait.** `hero.css` had the portrait override for `.hero__proxy-note` *before* the base rule, so the base `bottom: 1rem` won. On every portrait phone the "Development proxy vehicle" badge stretched over the full stage height. The override now follows the base rule. This is a pre-existing bug that would have covered the Phase 3.1 layer on mobile.

## Known limitations

- **Proxy truck and procedural city.** Both carry over from Scene 02 (see `docs/SCENE02_HANDOFF.md`).
- **No occlusion for the HTML/SVG layer.** The overlay draws over 3D geometry, as a HUD would. Route sections behind buildings (the cross-lane run) and the route's start over the truck cab are therefore drawn on top.
- **Medium tier.** No new GPU work, so the Intel UHD medium-tier budget is unchanged. During Phase 3.1 only, the overlay costs about 60 small DOM/SVG attribute writes per frame: the handheld camera float moves every anchor slightly each frame. Before Phase 3.1 it returns immediately.
- **Lighting in the street.** The kerb shot looks along shaded compound walls, so it reads darker than the sunlit facades of the `arrive` shot. The sunrise is unchanged; `sunAt` = 1 throughout Phase 3.1.
- **Lamp heads.** City streetlight heads still dim only to the window level (known Phase 2.2 gap).
