# Scene 02 → Scene 03 handoff

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
| Lamps | markers, tail, both headlights and beams at 1 |
| Sky / dawn | `rig.dawn = 1` |
| Fog | FogExp2 `#2a3650`, density `fogDensityAt(697.67)` = 0.0085 |
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

## Frame-hitch investigation

Pending — see Phase 2.1 report.

## Known limitations carried into Phase 3

- **Development proxy truck.** The licensed GLB is still pending; see `docs/TRUCK_ASSET_SPEC.md`. The proxy's cab side is not meaningful.
- **Procedural city.** This is a stand-in environment: procedural buildings and props with CC0 textures (Poly Haven `painted_plaster_wall`, `concrete_pavers_03`; ambientCG `Concrete034`). It is not final photoreal art.
