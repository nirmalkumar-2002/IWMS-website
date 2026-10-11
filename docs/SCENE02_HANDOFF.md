# Scene 02 → Scene 03 handoff

Scene 02 (city entry) ends with the truck rolling slowly into the residential street. This is the state Phase 3 (household collection) must start from. All values come from `components/hero/scene/route.ts` and are reproducible with `?debug` (`window.__iwmsHero`).

## Final state at the end of the scroll (timeline label `city:arrive`)

| Item | Value |
|---|---|
| Simulated drive time | `rig.driveSec = JOURNEY_END_SEC` ≈ 93.15 s |
| Route distance (front axle) | `JOURNEY_END` ≈ 692.6 m |
| Truck front axle (world) | ≈ (575.18, 0, 128.95) |
| Heading | +Z (route yaw = π/2; `drive.rotation.y = −π/2`) |
| Street | centre line x = `RESIDENTIAL.axisX` ≈ 576.68, 6 m concrete, runs +Z from `RESIDENTIAL.startZ` ≈ 28.9 for 140 m |
| Truck lane | x ≈ 575.18, 1.5 m right of the street centre (right-hand traffic; see limitations) |
| Speed | ≈ 2.4 m/s (8.6 km/h), easing toward 2.2 m/s (accel ≈ −0.08 m/s²) |
| Steering | straight (curvature 0) |
| Wheel spin | `−distance / radius`, which is continuous with all earlier scenes |
| Lamps | markers, tail, both headlights and beams at 1 (`rig.marker/tail/headL/headR/beam`) |
| Sky / dawn | `rig.dawn = 1` |
| Fog | FogExp2 `#2a3650`, density `fogDensityAt(692.6)` = 0.0085 |
| Camera key `arrive` (truck-local x fwd, y up, z right) | pos (−15, 5.6, 0.6), target (16, 1.2, −1.2), 28 mm |
| Camera (world) | ≈ (574.6, 5.6, 114.0), looking down the street over the truck's roof |
| Camera mode | Scene 02 truck-relative chase (`cityU = 1`), local offset damped (λ 3.2 / 4) |

## How to connect Scene 03

1. **Timeline.** Append to the same reveal timeline after `city:arrive` in `timeline.ts`, following the `addCityEntry` pattern. Keep one ScrollTrigger, and grow `.hero--cinematic` height in `hero.css` by about 50vh per scroll unit added.
2. **Motion.** Extend the kinematics table in `route.ts`, don't add a second one. Lengthen `RESIDENTIAL_LENGTH` and the street run, and move `JOURNEY_END` to the collection stop. Give `targetSpeed()` a final stop profile with braking ≤ 0.5 m/s². `rig.driveSec` then simply continues past today's `JOURNEY_END_SEC`. Wheels, squat and lights all follow automatically.
3. **Camera.** Add keys to `CITY_SHOTS`, or a `COLLECT_SHOTS` array with its own `cityU`-style parameter. The first key must equal `arrive` exactly; the Director's hand-over logic already guarantees no pop when both poses match.
4. **Environment.** The street's plots are generated in `scene/city/layout.ts`, zone D. Choose a gate plot near z ≈ 150–170 for the pickup, and keep the camera's corridor (over the carriageway, at most 1.5 m to either side) clear of balconies.
5. **Out of scope until Phase 3 is approved:** workers, bins, QR scanning and the pickup animation.

## Known limitations carried into Phase 3

- **Traffic side.** The truck drives on the right (it inherits Scene 01's +Z lane). Indian traffic keeps left. Fixing this means mirroring the scene in Z (truck lane, Scene 01 shots, city layout). This is a deliberate, approval-gated change.
- **Development proxy truck.** The licensed GLB is still pending; see `docs/TRUCK_ASSET_SPEC.md`.
- **Procedural city.** It's a stand-in environment, made of procedural buildings and props with CC0 textures (Poly Haven `painted_plaster_wall`, `concrete_pavers_03`; ambientCG `Concrete034`). It is not final photoreal art.
