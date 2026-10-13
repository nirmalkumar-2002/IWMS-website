# Phase 3.1–3.2 → next phase handoff

Phase 3.1 (smart collection stop) and Phase 3.2 (household bin QR verification) continue Scene 02 on the same scroll timeline. The truck rolls on down the residential street, slows naturally and stops beside the plot‑12 household gate. As it stops, the camera leaves the truck and turns to the household, where two wheelie bins (wet = green, dry = blue) stand on the kerbside strip just left of the H‑12 gate. The camera closes in on the **wet bin's QR tag** while a phone running the "IWMS Collect" field app rises in front of it as a viewfinder; the app goes align → scanning → verified. The camera then settles on a medium household frame. A compact IWMS monitor logs three distinct household states:

**Vehicle at household (GPS) → Bin QR verified → Collection completed.**

> IWMS is the subject; the truck is a storytelling element. The end frame is centred on the household (gate, bins and house), not the vehicle. There is no elevated truck overview, no floating links and no person or hands: only the device is shown. Every operational value (ids, counts, times, vehicle position, bin ids) is **illustrative demo data** and is labelled on screen as such.

> **GPS proximity never marks a collection verified or completed.** The three states are separate beats on the timeline. The served count increments only on *completion*, which requires verification **and** `done ≥ 0.5`.

The next phase must start from the state below. Values come from `components/hero/scene/route.ts`, `collection.ts` and `timeline.ts`. Reproduce them with `?debug`: `window.__iwmsHero.collection()`, `.truck()`, `.sun()`.

## Final state at the end of the scroll (timeline label `collect:end`)

| Item | Value |
|---|---|
| Simulated drive time | `rig.driveSec = COLLECT_END_SEC` = 117.3125 s. The truck came to rest at `STOP_SEC` = 113.3125 s; the 4 s standstill (`STOP_HOLD`) follows |
| Route distance (front axle) | `STOP_DISTANCE` ≈ 720.542 m |
| Truck front axle (world) | ≈ (578.181, 0, 151.880): `RESIDENTIAL.axisX + 1.5` (axisX ≈ 576.6807), and exactly `COLLECTION_GATE.z + 9.5` |
| Heading | +Z (route yaw = π/2) |
| Lane | left lane, x = axisX + 1.5 (kerbside is +X). No pull-over |
| Speed / accel | 0 / 0 |
| Wheels | `rotation.z = −STOP_DISTANCE / radius`, continuous with every earlier scene; steering 0 |
| Lamps | unchanged from Scene 02 (head, marker and tail on) |
| Sunrise | `sunAt(720.5) = 1`: early morning, same as Scene 02's end. `SunDirector` still owns all daylight |
| Fog | unchanged from Scene 02's end (morning haze) |
| Camera key `confirm` (truck-local: x fwd, y up, z = truck's right) | pos (−15.4, 1.45, 1.9), target (−11.0, 0.95, −2.6), 30 mm |
| Camera (world) | ≈ (576.281, 1.45, 136.480), looking at ≈ (580.781, 0.95, 140.880): across the street at the H‑12 gate's near pillar, the two bins and the house front |
| Camera mode | Scene 02 truck-relative chase frame; `cityU = 1`, `collectU = 1`, local offset damped (λ 3.2 / 4), handheld float on top |
| Digital layer | `pin = net = gps = route = scan = done = 1`. The H‑12 marker is visible (mint, completed). The phone and the scan brackets are hidden (they show only around the close-up). The monitor shows all three states done, served 12 / 24 and the next point H‑13 · 11 m |

With the truck at rest, truck-local → world is: world x = 578.181 − local z, world z = 151.880 + local x. Kerbside (the household) is local −z.

## Collection point and waste bins

- **Gate.** `COLLECTION_GATE` = (axisX + 4, 142.38) ≈ (580.681, 142.380). This is the east (+X, kerbside) compound-wall gate of zone‑D residential plot 12; x is the wall face. The opening is 3 m wide.
- **Truck position.** The front axle stops 9.5 m past the gate centre, so the rear hopper sits just beyond the opening. The truck's rear end is at about local x −8.3 (world z ≈ 143.58).
- **Validation.** The gate coordinate comes from the seeded layout, `buildCity(q).gates`, and is identical on the high and medium tiers. `tests/collection.spec.ts` keeps `COLLECTION_POINTS` in sync with the layout.
  - Gates are recorded without extra RNG draws, so the generated street is unchanged.
  - `StreetGate` (`city/layout.ts`) now also records the plot frontage `from` / `to` along z, again without extra RNG draws.
- **Frontage.** Plot 12's frontage runs from z ≈ 136.008 to ≈ 147.861. The gate opening is z 140.88–143.88. `kit.ts gate()` puts a 0.35 m pillar on each side of the opening (2.05 m tall, 0.1 m proud of the wall face); the near (−z) pillar spans z 140.53–140.88.
- **Why there.** The bins stand on the ~1 m kerbside strip between the carriageway edge (x ≈ 579.68) and the wall (580.681), on the −z side of the near pillar: away from the parked truck (rear ≈ z 143.58) and in clear view of a camera in the lane behind it.

### `BIN` / `BINS` (`collection.ts`)

| Item | Value |
|---|---|
| `BIN` | stands on the verge's drain-cover slabs, `baseY` 0.07 (all heights below are above that base); body footprint `depth` 0.52 (x) × `width` 0.46 (z), `bodyY0` 0.04, `bodyH` 0.84 (body top y 0.88), `taper` 1.06 (body widens 6 % to the top), `lidH` 0.05 (lid top y 0.93); `label` 0.30 × 0.40 centred at y 0.55; `qrSize` 0.22 |
| Base centre x (both bins) | `gate.x − 0.06 − (BIN.depth / 2) · BIN.taper` ≈ **580.345**: the body's back at the top (≈ 580.621) stands 6 cm off the wall |
| `BIN-0712-W` (wet, green) | z = **140.02**; body z 139.790–140.250 at the base, 139.776–140.264 at the top (lid to 140.274); wheels 139.735–140.305, 0.22 m short of the near pillar (140.53) |
| `BIN-0712-D` (dry, blue) | z = **139.40**; body z 139.170–139.630 at the base, 139.156–139.644 at the top (lid 139.146–139.654); wheels 139.115–139.685, 5 cm clear of the wet bin's wheel |
| Front face | faces −X (the street). `binFrontX(bin, y)` gives the face x at height y: ≈ 580.085 at the base, ≈ 580.070 at the body top |
| Wheels and handle | at the back (toward the wall). Wheels r 0.10, 0.05 thick, just outside the body sides: centred at z = ±(`width`/2 + 0.03) = ±0.26 from the bin centre (outer face ±0.285), axle at x ≈ 580.555, y 0.10 above the base, 0.54 m long (`width` + 0.08). Handle bar centre x ≈ 580.656 |

### `QR_TAG` (the tag that is scanned; `SCAN_BIN = BINS[0]`, the wet bin)

| Item | Value |
|---|---|
| Centre | x = `binFrontX(SCAN_BIN, 0.55) − 0.006` ≈ **580.070**, y = `baseY + 0.55` = **0.62**, z = **140.02** |
| Size | 0.22 m square (y 0.51–0.73, z 139.91–140.13), centred on the label |
| Facing | −X, leaning outward with the body taper (≈ 1.06°) |

### `WasteBins.tsx` (rendering)

- **Draw calls: 6.** Per bin: one merged plastic shell (flat-shaded square-frustum body + overhanging lid + front lid lip), one merged dark part (two wheels, axle, back handle bar, two small front foot pads) and one label quad. The shell, dark and label geometries are each built once and shared by both bins.
- **Materials.** `MeshStandardMaterial` throughout: body per bin (wet `#2c7a3f`, dry `#1f5fae`, roughness 0.5); one shared dark material (`#1d2023`, roughness 0.7); label per bin (roughness 0.6) with its own 300 × 400 px `CanvasTexture` (sRGB, anisotropy 4). Shell and dark parts cast shadows; the shell also receives them.
- **Label.** A colour band with "WET WASTE / Biodegradable" or "DRY WASTE / Recyclable" and "IWMS"; a 25 × 25 module grid with three finder patterns (220 px square at canvas y 90–310, centred, i.e. on `QR_TAG`); the bin id; "Household H‑12 · IWMS tagged bin".
- **The QR pattern is illustrative.** It is a seeded QR-style module grid (a fixed LCG seed per bin kind, so every load is identical), not an encoded or scannable code.
- **Fonts.** The labels are drawn immediately and redrawn once `document.fonts.load('600 18px Montserrat', '400 13px Inter')` resolves (texture `needsUpdate`), so a fallback face is never baked in.
- **Mounting.** `<WasteBins />` mounts inside `CityMount`'s city group in `Stage.tsx`, next to `<City>`. Its programs and textures therefore compile with the city at load time, never mid-scroll. Like the city, it is not mounted in the reduced-motion still mode.

### Demo points (`COLLECTION_POINTS`)

They appear only on the monitor map; no world markers are drawn for them.

| ID | Plot | Side | Status | Gate z |
|---|---|---|---|---|
| H‑11 | 11 | +X | collected | 127.693 |
| H‑12 | 12 | +X | **current** | 142.380 |
| H‑13 | 13 | +X | scheduled | 153.446 |
| H‑14 | 14 | +X | scheduled | 162.805 |
| H‑31 | 10 | −X | scheduled (return run) | 150.147 |
| H‑32 | 11 | −X | scheduled (return run) | 163.259 |

## Motion (Phase 3.1 part of the one kinematics table)

- **Single table.** `simulate()` in `route.ts` integrates the whole journey. Every step up to `JOURNEY_END` (≈ 697.668 m) evaluates exactly the same expressions as before Phase 3.1, so Scene 01 and Scene 02 are **bit-identical**.
  - Verified against commit `244bd52`: 0 difference over 9,432 `driveAt` samples up to `JOURNEY_END_SEC`.
  - The Phase 3.2 redesign did not touch `route.ts`.
- **The stop.** The stop is appended after Scene 02's end:
  - Target speed is `min(ARRIVE_SPEED, √(2·0.25·(stopTarget − d)))`.
  - Braking floor is −0.4 m/s² (peak deceleration measured: 0.40 m/s²). Jerk is limited to 0.35 m/s³ per step. The only exception is a 0.009 m/s² step at the instant of standstill, when v ≤ 0.02 m/s is clamped to 0.
  - The truck enters at 2.38 m/s (Scene 02's end speed) and stops 19 simulated seconds later (`STOP_SEC` = 113.3125 s). The 4 s hold ends at `COLLECT_END_SEC` = 117.3125 s.
  - `kin` corrects the stop target 4 times at module load, so the stop lands within 1 cm of gate + 9.5 m.
- **Exports.**
  - `SCENE2_END_SEC` (= `JOURNEY_END_SEC`, unchanged at 94.3125)
  - `STOP_SEC`, `COLLECT_END_SEC`, `STOP_DISTANCE`, `COLLECTION_GATE`, `STOP_HOLD`
  - `driveAt`, `samplePath`, `WHEELBASE` (used by the monitor's live speed and map dot)

## Timeline

There is one ScrollTrigger and one timeline. Scene 01 and Scene 02 are unchanged in timeline units; Scene 02 ends at **25.70**. `addCollection` adds `COLLECT_UNITS` = 7.6 units, and `buildReveal` adds a 0.4-unit tail pad. The total is 25.70 + 7.6 + 0.4 = **33.70 units**. The bin redesign did not change any timeline position.

`.hero--cinematic` is **1780vh** (it was 1850vh in the first Phase 3.1 design). The scrollable distance is 1780vh − 100vh (the pinned stage) = 1680vh over 33.70 units ≈ 49.9vh per unit, the same density as Scenes 01–02 (1300vh / 26.1 units). Scene 01 and Scene 02 occupy the first 25.70 / 33.70 ≈ 76% of the scroll.

The rate is Scene 02's end rate, 85.3125 / 14 ≈ 6.094 simulated seconds per unit (`cityEase'(1) = 1`). So `COLLECT_STOP` = 19 s / rate ≈ 3.118 units and `COLLECT_DRIVE` = 23 s / rate ≈ 3.774 units. The table uses absolute units; `start` = 25.70.

| Label / tween | Units | What happens |
|---|---|---|
| `city:arrive` = `collect` | 25.70 | Scene 02's last key; `collectU = 0` equals `arrive` exactly |
| driveSec tween | 25.70 → 29.474 | `JOURNEY_END_SEC → COLLECT_END_SEC`, ease `none`, at Scene 02's end rate, so on-screen speed is continuous |
| camera `arrive → household` | 25.70 → 29.10 | `collectU` 0 → 0.5 (through `turn` at 0.25), focal 28 → 30 mm, `sine.inOut`. The camera turns off the truck to the kerbside homes as it rolls to a stop |
| `pin` | 27.70 → 28.50 | H‑12 marker and scene copy fade in (copy opacity = `pin × 1.4`) |
| `net` | 28.00 → 28.70 | IWMS monitor rises in. The vehicle row reads live km/h while the truck still creeps in |
| `collect:stop` | ≈ 28.818 | truck at rest (`STOP_SEC`); vehicle row reads "Stationary" |
| `gps` | ≈ 28.748 → 29.148 | the "Vehicle at household (GPS)" state is logged at `gps ≥ 0.5` (≈ 28.95), after the truck is stationary. The verification row switches to *Awaiting scan* |
| `collect:household` | 29.10 | household frame: gate and bins |
| `route` | 29.10 → 30.00 | monitor map: planned route draws, nearby points light up |
| camera `household → qr` | 29.80 → 30.80 | `collectU` 0.5 → 0.75, focal 30 → 40 mm, `power2.inOut`. Push-in to the wet bin's QR tag; the phone rises over ≈ 30.26 → 30.49 |
| `collect:qr` / `scan` | 30.80 → 31.70 | phone "Scanning bin QR…" as soon as `scan > 0`; sweep across the tag; verified at `scan ≥ 0.95` (≈ 31.56): phone "Bin QR verified", brackets mint, check mark |
| `collect:verified` | 31.70 | "Bin QR verified · 07:42" on the monitor |
| camera `qr → confirm` | 31.90 → 32.90 | `collectU` 0.75 → 1, focal 40 → 30 mm, `power2.inOut`. Pull back to the household; the phone drops away over ≈ 32.24 → 32.38 |
| `done` | 32.20 → 32.70 | "Collection completed" at `done ≥ 0.5` (≈ 32.45): served 11 → 12, next point fades in (`done` 0.5 → 1) |
| `collect:completed` | 32.70 | |
| `collect:end` | 33.30 | finished frame holds (a 0.01-unit empty tween at 33.29 pins the label inside the timeline) |
| tail pad | 33.30 → 33.70 | |

Every position, opacity and state is a pure function of scroll; nothing is time-based (the portrait step-aside for the phone is an instant CSS state, not a transition). The `≈` scroll positions for thresholds assume the tween eases above. The overlay evaluates thresholds on rig values, which are not damped. The camera itself trails slightly (λ 3.2 / 4).

## Camera keys (`COLLECT_SHOTS`, truck-local, sampled by `rig.collectU` at i / 4)

World values assume the truck at rest (front axle (578.181, 151.880)).

| Key | `SHOT_U` | pos (local) | target (local) | focal | pos (world) | target (world) |
|---|---|---|---|---|---|---|
| arrive (= Scene 02 `arrive`) | 0 | (−15, 5.6, 0.6) | (16, 1.2, 1.0) | 28 | (577.581, 5.6, 136.880) | (577.181, 1.2, 167.880) |
| turn | 0.25 | (−15, 3.2, 2.2) | (−6, 1.6, −3.0) | 30 | (575.981, 3.2, 136.880) | (581.181, 1.6, 145.880) |
| household | 0.5 | (−16, 1.65, 2.6) | (−11.4, 0.9, −2.4) | 30 | (575.581, 1.65, 135.880) | (580.581, 0.9, 140.480) |
| qr | 0.75 | (−12.05, 1.0, 0.0) | (−11.86, 0.62, −1.89) | 40 | (578.181, 1.0, 139.830) | (580.071, 0.62, 140.020) |
| confirm | 1 | (−15.4, 1.45, 1.9) | (−11.0, 0.95, −2.6) | 30 | (576.281, 1.45, 136.480) | (580.781, 0.95, 140.880) |

- **Note on `arrive`.** Its world values are given at rest for comparison only. At `collectU = 0` the truck is still at Scene 02's end position (see `SCENE02_HANDOFF.md`).
- **Corridor.**
  - All camera *positions* have local z ∈ [0.0, 2.6], i.e. world x 575.58–578.18. That is inside the 6 m carriageway (573.68–579.68), never over the verge or the wall.
  - All positions sit behind the parked truck's rear end (local x ≤ −12.05 vs ≈ −8.3).
  - The `qr` key stands in the truck's own lane line (local z 0), ≈ **1.94 m** from the tag centre and ≈ **3.75 m** behind the truck's rear (z 139.83 vs ≈ 143.58), at hand-held phone height (1.0 m), looking slightly down. Its target is the tag centre (within 2 mm), almost face-on (the tag is 1.89 m across in x and 0.19 m along z).
  - Camera heights descend from 5.6 m to eye level (1.45–1.65 m), and to 1.0 m for the phone close-up.
- **Hand-over.** The Director switches from the city spline to the collection spline as soon as `collectU > 0`. At 0 they share the `arrive` key, so there is no pop.
- **Separate spline.** Adding keys to `CITY_SHOTS` would have changed the centripetal Catmull–Rom tangents near `arrive`. That is why the collection keys have their own spline (`createCollectCurves`).

## Digital layer (`scene/CollectionOverlay.tsx`)

### Architecture

- `CollectionHudView` (DOM, outside the Canvas) renders once.
- `CollectionDirector` (inside the Canvas, mounted after the Director and SunDirector) runs in `useFrame`:
  - It refreshes the camera matrices and projects the world anchors with the camera of the frame being drawn.
  - It writes `transform`, `opacity`, SVG attributes, `data-*` attributes and text imperatively, only when a value changes.
  - It makes no React updates while scrolling and adds no WebGL work. The bins are separate meshes in the city group.
- **Inactive state.** The layer is fully inactive (`visibility: hidden`, `data-live="false"`) until any of `pin / net / gps / route / scan / done` is > 0. It becomes inactive again when scrubbed back.
- **Ambient loop.** The only clock-driven loop is the monitor map's vehicle-dot pulse. It runs only while `data-live="true"` and is disabled under `prefers-reduced-motion`.
- **Rig values** (`rig.ts`, all 0..1, owned by the scroll timeline). They are distinct business states:

  | Value | Drives |
  |---|---|
  | `pin` | H‑12 marker, copy |
  | `net` | monitor panel |
  | `gps` | arrived state (GPS proximity only) |
  | `route` | monitor map route and points |
  | `scan` | bin QR scan; verified at ≥ 0.95 |
  | `done` | collection completed |

- **Modes.** Reduced motion (still) and static/poster modes never mount the layer (or the bins).

### World-anchored elements (only two; QA anchor ids `H-12` and `qr`)

- **H‑12 collection-point marker** (anchor `H-12`, the label head).
  - A ground ring at the gate (y 0.05) and a label head at y 2.7 (`MARKER_HEAD_Y`, above the 1.8 m wall), joined by a stem. The label reads "Collection point" / "H‑12".
  - Colour follows the household state: amber while *pending* (also during GPS arrival); mint once QR *verified* and when *completed*.
  - The marker steps aside for the close-up. It fades out over `collectU` 0.53–0.60 (≈ 30.11–30.26 units) and returns over 0.88–0.95 (≈ 32.41–32.53).
- **QR scan brackets** (anchor `qr`, the `QR_TAG` centre), inside the phone viewfinder:
  - corner brackets on the tag corners, padded ×1.22 (0.268 m square)
  - a sweep line top → bottom while `scan` > 0 and not yet verified (`t = scan / 0.92`)
  - a check mark at the tag centre, shown only once verified (fades in over `scan` 0.95 → 1)
  - brackets turn mint once verified (`data-verified`)

  `frameK = clamp((u − 0.68) / 0.06) · (1 − clamp((u − 0.79) / 0.05))`: in over `collectU` 0.68–0.74 (≈ 30.39–30.59), out over 0.79–0.84 (≈ 32.24–32.35). Hidden in the final frame. There is no world caption.

### Phone viewfinder ("IWMS Collect" field app)

- **What it is.** A DOM device frame (`.hero__phone`) centred on the stage: 9 : 19, 74vh tall (portrait 62vh; uncapped so the viewfinder scales with the scene and the tag's brackets always fit), max 82vw, 11 px dark bezel, 40 px radius. Its screen is transparent, so the live 3D scene is the viewfinder image and the tag sits at frame centre in the `qr` shot. No hands or person.
- **Screen.** A top bar ("IWMS Collect" · "H‑12") and a bottom status sheet, switched by `data-state`:
  - `align` (before `scan > 0`): "Align the bin QR in the frame"
  - `scanning` (`scan > 0`): "Scanning bin QR…"
  - `verified` (`scan ≥ 0.95`): **"Bin QR verified"** with "BIN-0712-W · Wet waste · Household H‑12"
- **Motion.** `phoneK = clamp((u − 0.6) / 0.12) · (1 − clamp((u − 0.79) / 0.07))`. Opacity `min(1, phoneK × 1.6)`; it rises from `(1 − phoneK) × 0.55 × stage height` below centre. In over `collectU` 0.60–0.72 (≈ 30.26–30.49), out over 0.79–0.86 (≈ 32.24–32.38), so it is fully up for the whole scan (30.80–31.70).
- **`data-phone`.** The layer root carries `data-phone="true"` while `phoneK > 0.3` (`collectU` 0.636–0.839, ≈ 30.32–32.35). On portrait (`max-aspect-ratio: 4/5`) the monitor and the copy step aside while it is set: opacity 0 in CSS, applied instantly (no transition), and `aria-hidden="true"` from the Director (`asideForPhone`, the same query via `matchMedia`). The phone carries the scan state; the monitor returns before completion is logged (≈ 32.45).

### IWMS collection monitor (one compact panel)

- **Placement.** Top-right on desktop; across the bottom in portrait, where the map is hidden for space (and hidden while the phone is up; see above).
- **Header.** "IWMS · Collection monitor", with a dashed amber **"Illustrative demo data"** tag.
- **Route map.** A top-down schematic in metres:
  - map x = world z (driving direction to the right); map y = −(world x − axisX), so kerbside is up.
  - viewBox x 116, y −17, 68 × 23 (`MAP`).
  - It shows the street and the cross lane, the driven route (dotted, dim) and the planned route ahead (drawn by `stroke-dashoffset` = 1 − `route`). The ahead route continues along the left lane, then turns left into the cross lane.
  - Demo points light up as the route reaches them (`revealAt`).
  - The vehicle dot is placed from the kinematics table each frame (front axle via `samplePath` + `WHEELBASE`).
- **Rows.**
  - Vehicle: `IWMS-07 · <km/h>` live from `driveAt(rig.driveSec).speed`, or "Stationary" below 0.05 m/s.
  - Route: `R-14 · Ward 7`.
  - Households served: `11 / 24` with a bar, which becomes `12 / 24` **only** when the collection is completed (`scan ≥ 0.95` **and** `done ≥ 0.5`).
- **Household H‑12 states.** Each state's time shows only once it is done.

  | Row text | Done when | Time (illustrative) | Notes |
  |---|---|---|---|
  | Vehicle at household (GPS) | `gps ≥ 0.5` | 07:41 | |
  | "Bin QR verification" → **"Bin QR verified"** | `scan ≥ 0.95` | 07:42 | between arrival and verification the row is amber with *Awaiting scan* under it |
  | Collection completed | verified **and** `done ≥ 0.5` | 07:43 | |

- **Next point.** `H-13 · 11 m` fades in with `done` 0.5 → 1.
- **Data and copy.**
  - All values are in `DEMO` (`collection.ts`): vehicle, route, served / households, next, times. The bin ids live in `BINS`.
  - Copy is in `content/hero.ts → collect` (including `phone` and `monitor`), marked **PROPOSED, not yet approved**: eyebrow "Smart collection", title "Every household collection, verified."

### Removed from earlier designs, and why

These were redundant with the monitor, put the truck rather than IWMS at the centre, or (Phase 3.2) did not read as a real field workflow:

| Removed | Why |
|---|---|
| Elevated `network` camera key and the `kerb` key | an overview of the truck made the vehicle the subject; the end frame is now the household |
| World-anchored GPS tag over the truck | duplicated the monitor's vehicle row; GPS is now one logged state, not a badge on the truck |
| Floating vehicle → IWMS and H‑12 → IWMS links (and their dash-flow loop) | decorative; the monitor itself is the IWMS surface |
| World-drawn route ahead/behind and the other points' world markers | the route lives on the monitor map |
| Story steps (`.hero__collect-steps`) | repeated what the three logged states now show |
| QR plate on the H‑12 gate pillar (`QR_PLATE`, `scene/QrPlate.tsx`) | IWMS verification is done on the household's tagged bin, so the tag now lives on the bin; a pillar plate verified the address, not the waste stream |
| Floating "Scanning household QR" / "QR verified" world caption | the phone app's status sheet now carries the scan state; a caption in the world duplicated it |

## Phase 3.3 refinements (UX and visual; no timing changes)

Scroll length (1780vh), every timeline label and tween, the camera keys, the dwell times, the truck kinematics and the Scene 01/02 sunrise are all unchanged. The only change to `timeline.ts` is that `startExperience` now returns `{ dispose, goTo }`.

### Site header (`components/site/SiteHeader.tsx`)

- **Position and markup.** The header is fixed and sits outside the hero `<section>`, so it adds no page height. It is in the prerendered HTML, so it works without JS.
- **Brand.** Zigma logo plus "IWMS"; it links to `/`.
- **Skip intro.** Shown only in cinematic mode, once the experience has started. It calls `goTo('collect:end', immediate)`: the intro completes first, then the page jumps instead of scrubbing. Focus then moves to the IWMS monitor.
- **Explore platform.**
  - In cinematic mode it calls `goTo('collect:household')`.
  - Otherwise (no JS, reduced motion, static) it is a real link to `/brand/iwms-brochure.pdf`.
- **Request demo.** `demoRequestLink()` in `content/config.ts` decides the target:
  - It becomes a mailto as soon as a real contact email replaces `{{CONTACT_EMAIL}}`.
  - Until then it opens https://www.zigma.in in a new tab.
- **Deferred.** Other navigation items (Modules, Solutions, Case studies, Contact) wait until those sections exist. There are no placeholder links.

### Hero copy

`heroContent.positioning` (PROPOSED) adds a one-line product statement under the title. It is part of the SSR markup, joins the intro stagger after the title words (the title keeps its 6.2 s cue) and fades with the title.

### Proxy badge

The "Development proxy vehicle" badge shows only in internal mode: `npm run dev` or `?debug`. The assets are still development proxies; see `docs/TRUCK_ASSET_SPEC.md`.

### Household grade (`householdGrade(collectU)` in `scene/sun.ts`, applied last in `SunDirector`)

- **Shape.** A smoothstep over `collectU` 0 → 0.5, the arrive → household camera move.
- **Scope.** It is exactly 0 and makes no writes while `collectU = 0`, which covers all of Scene 01/02. It is also 0 in still mode.
- **What it changes at full grade (`HOUSEHOLD_GRADE`):**
  - The street-facing key light rises by 1.15, and its colour moves to `#efe7dc`.
  - Hemisphere intensity is multiplied by 1.5, with the ground colour moving to `#5e5446`.
  - `environmentIntensity` rises by 0.45.
- **Untouched:** the sun light, `refs.day.progress`, fog, rim, fill and exposure.
- **Cost.** Uniform-only, so no shader recompiles. The program count stays at 29 from Scene 02 through every Phase 3 beat.

### Bins and QR

- **Bins.** Slightly lighter bodies (wet `#2f8a46`, dry `#2466b8`) with satin roughness. Labels are matte, with the label texture as its own emissive map at 0.22, set at creation. QR contrast holds in shade.
- **Phone.**
  - A metallic bezel ring and dark outline separate the phone from the green bin.
  - A focus dim (0.42) covers everything outside the viewfinder; it is part of the phone, so it fades with it.
  - Scan brackets are 3 px with a dark halo.
  - A target line (`.hero__phone-target`, "Wet waste · BIN-0712-W") shows during align and scanning.
- **Headline.** It steps aside while the phone is up, on every viewport.

### Layout

- **Desktop.** The monitor and scene copy sit at `top: max(12vh, 5.5rem)`, below the header.
- **Portrait.** A compact monitor: the map and Route row are hidden, rows are inline, and type is smaller. The household bins and gate stay visible above it.
- **Stale state.** The `data-phone` attribute is reset whenever the layer hides.

## How to connect the next phase

1. **Timeline.** Continue after `collect:end` (33.30) in `timeline.ts`, following the `addCollection` pattern.
   - Move or replace the 0.01-unit pin tween so new tweens start after it.
   - Keep the single ScrollTrigger.
   - Grow `.hero--cinematic` at the same density (≈ 50vh per unit of scrollable distance).
2. **Camera.** The first new key must equal `confirm` exactly. Either add keys to `COLLECT_SHOTS` after `confirm` and re-derive `SHOT_U` (the overlay's `collectU` thresholds for the marker, phone and brackets would then need re-mapping), or start a new spline whose first key is `confirm`.
3. **Truck.** The truck is at rest; `driveSec` can stay at `COLLECT_END_SEC`. If it should pull off to H‑13 (11 m ahead), extend `simulate()` after the hold rather than adding a second table, and keep the Scene 02 prefix bit-identical.
4. **3D props.** Add any new 3D props inside the city group in `CityMount` (as `WasteBins` is), so their programs and textures compile at load and not mid-scroll. Bins are positioned from `BIN` / `BINS`; any pickup animation should start from those values.
5. **Digital layer.**
   - Keep the three states distinct. GPS arrival is not verification, and verification is not completion.
   - Only completion changes the served count.
   - Add new world anchors to `CollectionDirector` (and to `anchors()` for QA) rather than a second projection loop.
   - Put new operational data in the monitor, labelled as illustrative.
6. **Out of scope until approved:** workers, bin pickup or emptying, waste loading, and any human animation.

## Changes outside scope (for review)

- **Proxy badge stretched on portrait** (previous commit). `hero.css` had the portrait override for `.hero__proxy-note` *before* the base rule, so the base `bottom: 1rem` won. On every portrait phone the "Development proxy vehicle" badge stretched over the full stage height. The override now follows the base rule. This was a pre-existing bug that would have covered the collection layer on mobile.
- **`StreetGate` gained `from` / `to`** (`city/layout.ts`). This records plot frontage only; there are no extra RNG draws, so the generated city is unchanged.

## Known limitations

- **Proxy truck and procedural city.** Both carry over from Scene 02 (see `docs/SCENE02_HANDOFF.md`).
- **Bins are simple proxies.** Flat-shaded square-frustum body, box lid, cylinder wheels; no lid hinge or any other animation.
- **QR tags illustrative.** The bin labels carry seeded QR-style module grids, not encoded codes; they are not scannable.
- **No pickup or emptying animation.** "Collection completed" is a logged state on the monitor only; the bins never move and nothing is loaded into the truck.
- **No occlusion for the HTML/SVG layer.** The marker, brackets and phone draw over 3D geometry, as a HUD would.
- **Shaded street lighting.** The household and QR shots look at the kerbside compound walls in shade, so they read darker than the sunlit facades of the `arrive` shot. The sunrise is unchanged; `sunAt` = 1 throughout.
- **Lamp heads.** City streetlight heads still dim only to about 15% (window level), a known Phase 2.2 gap.
- **Copy and data.** `content/hero.ts → collect` is PROPOSED, not approved. Every monitor and phone value is illustrative.
- **QA.** `__iwmsHero.collection()` returns every rig value (including `scan` and `done`), the stop constants, the gate, the wheel spin, and each anchor's expected (re-projected) vs rendered screen position: `H-12` (marker head) and `qr` (`QR_TAG` centre). This guards against stale or lagging writes. It is not a pixel comparison against the WebGL image.
