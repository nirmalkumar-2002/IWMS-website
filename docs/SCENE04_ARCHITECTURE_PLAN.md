# Scene 04: Interactive IWMS Ecosystem (architecture and design plan)

**Status:** planning only; not implemented. Prepared 18 Oct 2026 against `feat/cinematic-hero` @ `c7c3598`. Revision 2 makes **lightweight architecture a core requirement**: one WebGL canvas, no additional render loop, measurable budgets and a fallback ladder. Nothing in Scenes 01–03, the 1780vh cinematic scroll or any business logic changes as part of this plan.

## 0. Inputs and how they were verified

- **Requested skills.** `awesome-design-md`, `taste-skill`, `impeccable` and `img2threejs` are **not installed**. They are not in the session's skill list, `~/.claude/skills` or the plugin marketplaces, and nothing was installed. Their concerns are covered here instead:
  - design-system documentation (§2, §9);
  - composition and art direction (§1);
  - UX, accessibility and responsive behaviour (§4, §8);
  - image-to-3D feasibility (§5.5).
- **Related skill.** A `Zigma ERP-design` skill is installed (light theme, Poppins). It describes a sibling Zigma product, not this site's dark cinematic system; see D8.
- **Product sources.** `docs/source/deck-text.txt`, `docs/source/original-next-spec.txt` and `public/brand/iwms-brochure.pdf` (25 pages). The deck text matches the PDF page for page.
- **Design reference.** `myblue.ai` was inspected through its public HTML/JS only; no assets were downloaded. **It is not real-time 3D.** It uses scroll-scrubbed pre-rendered MP4 films and, in its "agents" section, hotspots on pre-rendered aerial or floor-plan images with a single glass info card. "MyBlue.ai-inspired" therefore means its interaction model and restraint, not a WebGL technique. We copy none of its branding, palette or type.
- **Codebase facts relied on.**
  - `src/pages/Home.tsx` renders only `<CinematicHero/>`.
  - The hero `<section>` is 1780vh with a sticky 100vh stage; its R3F `<Canvas>` sits inside that stage with `frameloop="always"`, so it keeps rendering after the visitor scrolls past it.
  - There is a single ScrollTrigger scoped to the hero section.
  - Quality tiers come from `detectQuality()`: high, medium (Intel iGPU, touch, low memory) or poster.
  - The city is built procedurally (`GeoBuilder` + kit), merged per material bucket and precompiled with `gl.compileAsync`.
  - Measured on the Intel UHD reference machine (Phase 2.1): the hero runs at 9–10 ms per frame on medium and 19–26 ms on high.
  - Four Playwright specs measure scroll against the *document* end.

## 1. Visual concept and art direction

**Concept: "One city, one platform."** The camera lifts from the H‑12 household through the morning haze. Below, a calm **miniature of the city** resolves, with the seven IWMS modules as recognisable places connected to an ICCC‑integration hub.

- **Form.** A single rounded tile island (about 240 × 160 m) fading into the haze. It is low‑poly, built with the existing city kit and makes no attempt at photorealism. It reads as a miniature through a long lens.
- **Palette** (existing tokens only).
  - Buildings: slate and plaster greys.
  - Ground: warm concrete.
  - Accent: amber `#ffa526` for the selected module.
  - Data: signal mint `#a6dcc8` for connections and live states.
  - Text: `--text-light`.
  - One glowing accent at most; no neon.
- **Light.** The hero's own lights at their end‑of‑sunrise state, so continuity is automatic and nothing new is added. Contact shadows are baked into vertex colours, plus blob decals. No shadow maps; glow only via a sprite on the selected node.
- **Typography.**
  - Labels and cards are HTML: Inter 11–12px caps labels with a number prefix.
  - Cards reuse the IWMS monitor glass card, with titles in Montserrat 600.
- **Motion.** Camera eases of 0.8–1.2 s. The selected node's connections draw in once, then a slow dash flow plays on them only. No idle particles, no ambient animation.

**Avoid:**
- free orbit or zoom;
- minimaps and HUD meters;
- all cards or all connections at once;
- multiple glow colours;
- fictional statistics without the **illustrative** label.

## 2. Content model (verified against product sources)

Use the seven official module names, verbatim and in brochure order (p.4), plus one integration hub. Copy lives in `content/ecosystem.ts`, PROPOSED until approved.

| # | Node (official name) | Place in the diorama | Capabilities confirmed in the sources (brochure page) |
|---|---|---|---|
| 01 | **Collection & Verification** | Residential street, H‑12 household, wet and dry bins | QR on households, bins, apartments, institutions; pickup log with GPS, time, image and weighment; exceptions; citizen alert before arrival (p.4–6) |
| 02 | **D2D Collection & Logistics Management** | Arterial road, 2–3 trucks, depot | Live vehicle map, geo‑fencing, optimised routes, deviation alerts, diesel monitoring, load vs capacity (p.8) |
| 03 | **Resource Management** | Ward office / depot yard | Photo, QR or biometric attendance, crew‑to‑route assignment, performance and exception reports (p.10) |
| 04 | **Weighbridge Management** | Transfer station with weighbridge deck | IoT load cells, per‑stop vs gross reconciliation, discrepancy alerts, audit trail, calibration reminders (p.12) |
| 05 | **Waste Management (Processing)** | Compost windrows, MRF shed | Segregation logging (wet, dry, hazardous, sanitary, glass); composting, biomethanisation, MRF, pyrolysis; rejects (p.14) |
| 06 | **Landfill Management** | Engineered landfill cell at the island edge | Inflow tied to weighbridge, capacity and balance life (drone/GIS), thermal hotspot alerts, CCTV/AI (p.16) |
| 07 | **Grievance Redressal Management** | Citizen node at a home or street | Citizen app and portal, 1–5 star pickup rating, escalation matrix, complaint analytics (p.18, p.21) |
| ◎ | **ICCC Integration** (hub, not a module) | Central civic building | IWMS "connects with the Integrated Command and Control Centre (ICCC) for centralised oversight"; web and app monitoring (p.3) |

**Copy cautions**
- Never say "IWMS Command Centre".
- Hardware (body cameras, drones, thermal sensors) is shown as a capability, without claiming supply.
- Unverified numbers ("15 min", "₹5–₹1000", "12 months", "SWM Rules 2016") stay out of headlines.
- Pick one spelling for biomethanisation.
- Optional 9th node, **User Charges & Enforcement** (p.21–24), is deferred (D3).

**Connections**
- 01 → 02 → 04 → 05 → 06;
- 03 → 01/02;
- 07 → 01/02;
- every node → ◎.

Only the selected node's links are shown.

## 3. User journey

1. **Hand‑off from Scene 03, a continuous camera move.** The hero ends on the H‑12 household. As the visitor scrolls into the ecosystem section, the *same* camera rises out of the street into the morning haze. At peak haze the hero city is hidden and the diorama is revealed. The camera then settles on the overview. One canvas, one camera, no cut. The hero timeline is untouched: this movement belongs to the ecosystem section's own ScrollTrigger.
2. **City overview** (resting, nothing selected).
   - Fixed camera pitched about 38°, long lens.
   - Eight quiet labels.
   - Heading top‑left: "Every operation, one platform." (PROPOSED).
   - Chip rail of the eight nodes.
3. **Select a node** by clicking or tapping its marker or chip, or with the keyboard.
   - The camera eases in about 20% and recentres.
   - Other nodes dim.
   - The node's connections draw in.
   - **One card** opens beside it, containing:
     - an eyebrow (number and place) and the title;
     - 3–4 sourced capability chips;
     - one event line labelled *illustrative*;
     - "Connected to" links to the related nodes.
4. **Follow a connection** through the "Connected to" links or the chip rail, which gives a guided path through the collection flow.
5. **Close or reset** with Esc, ✕, or a click on empty ground.
6. **Exit.** "See IWMS in action": until a software showcase (Scene 05) exists, this is **Request demo** (`demoRequestLink()`) plus the **brochure PDF**. The section then unpins and the page continues.

Exploration never blocks scrolling, and there is no scroll‑jacking beyond the section's own pin.

## 4. Desktop and mobile UX

- **Desktop ≥ 1024px.**
  - Diorama fills the stage.
  - Heading top‑left at `top: max(12vh, 5.5rem)`.
  - Chip rail bottom‑left.
  - Card anchored beside the node, flipping side near edges.
  - Hover reveals the full label.
- **Tablet.** The card docks to the right edge.
- **Portrait phones.**
  - A dedicated portrait overview key.
  - No floating labels; markers ≥ 44px.
  - Horizontal chip rail.
  - Card as a **bottom sheet** (≈ 45% height).
  - The camera key keeps the selected node above the sheet.
- **Header.** Once built, "Explore platform" may target `#ecosystem` (D6).

## 5. Three.js architecture

### 5.1 Options compared

| Option | Description | GPU / CPU / memory | Risk to Scenes 01–03 |
|---|---|---|---|
| A. Extend the hero timeline | Scene 04 as more hero scroll | Lightest (one context) | **Prohibited**: changes 1780vh / timeline |
| B. Second canvas | New section with its own `<Canvas>` | **Two WebGL contexts**: duplicated renderer state, programs, textures, post‑processing; the hero would keep rendering unless paused | None, but violates the "no duplicate canvas" requirement |
| C. drei `<View>` (one canvas, scissored views) | One page canvas, hero and Scene 04 as tracked views | One context, but views render per frame and the high‑tier post‑processing composer doesn't compose per view | Large refactor of `Stage.tsx`; post‑processing conflict |
| **D. Shared canvas + world switch** (recommended) | Hero canvas moves to a page‑level fixed layer; Scene 04 is a second world group in the **same** scene, toggled by visibility; camera handed to an `EcosystemDirector`; all UI in DOM | **One context, one loop, shared lights, materials, programs, fog and city kit**; demand rendering when idle | Structural only (canvas container and a Director gate); no timing, visual or logic change |

### 5.2 Recommendation: **D, a shared canvas and world switch with an HTML/CSS overlay**

Why it is the lightest viable option:
- **No second WebGL context.** Renderer, programs, shadow maps and post‑processing are shared.
- **No second render loop.** The existing R3F loop draws whichever world is active.
- **Reuse.** Hero lights at their morning state, fog, the city kit (`GeoBuilder`, buildings, props), the precompile and warm‑up path (`CityMount`), quality tiers, testcam steady mode, and the `CollectionOverlay` projection pattern.
- **All text and UI in the DOM.** No WebGL text, no extra shaders for UI.

### 5.3 Required (approval D5) structural changes to the hero, all behaviour‑neutral

1. **Canvas container.** Move the `<Canvas>` element from the hero's sticky stage to a page‑level fixed layer behind the page content (same size and DPR). While the hero is on screen this is pixel‑identical to today, because the hero stage is a full‑viewport sticky. Hero DOM overlays stay in the hero section.
2. **Frame loop policy.**
   - While the hero is the active world: `always`, exactly as today.
   - When the ecosystem is active: `demand`, rendering only on camera tweens, selection changes, scroll intro progress and resize.
   - When neither is in view (page content below): stop.
   
   This also removes today's waste of the hero rendering forever after it scrolls away.
3. **Director gate.** `Director` and `CollectionDirector` skip their writes when `rig.world === 'ecosystem'`. `SunDirector` keeps the end‑of‑sunrise state. The hero `rig` values and timeline stay untouched.
4. **World visibility.** The hero city chunks, truck and household are hidden (`visible = false`) while the ecosystem world is shown, and vice versa. Visibility toggles never recompile programs.

### 5.4 Ecosystem world

- **Geometry.**
  - Procedural from the existing city kit, merged per material bucket (≈ 8–10 buckets).
  - Repeated items (houses, trees, trucks, bins) are `InstancedMesh`.
  - Generated once from a fixed seed when the section approaches (idle callback), not at page load.
- **Materials.**
  - Reuse the city's material buckets where possible: same programs, **zero new programs** for buildings.
  - New ones are limited to the island ground, the connection sprite and the selection glow sprite (≤ 4 programs, precompiled with the city warm‑up path).
- **Lighting.** The hero's existing lights and environment. **No new lights**: adding lights would recompile every material.
- **Camera.** Deterministic keys in `cameraKeys.ts`: `rise` (from the hero end frame), `overview`, one `focus[i]` per node, plus portrait variants. GSAP tweens on plain numbers, no OrbitControls, testcam steady mode supported.
- **Overlay.** DOM/SVG. Projected node anchors are written imperatively only on frames that render. Connections are SVG Bézier paths; labels, cards and chips are HTML.
- **Placement.** The diorama sits in a remote corner of the same world (e.g. 3 km from the city), beyond fog range of the hero's cameras. While the hero is active its group is also `visible = false`, so it never costs a draw call during Scenes 01–03.

### 5.5 Image‑to‑Three.js (img2threejs) feasibility

There is no skill and none is needed: all geometry is procedural from the existing kit. Reference illustrations, if supplied, inform art direction only. Mesh conversion would add an asset pipeline and download weight.

## 6. Scroll integration

- **New section.** `src/pages/Home.tsx` gains `<EcosystemSection/>` after `<CinematicHero/>`. The hero section, its height, its single ScrollTrigger and its timeline are unchanged. The hero trigger is scoped to its own section, so the mapping is unaffected.
- **Ecosystem section.** About 200vh with a sticky 100vh DOM stage (the canvas is the shared fixed layer behind it).
  - The first ≈ 100vh scrubs the **rise** (street → haze → overview) through **one** ScrollTrigger scoped to this section.
  - The second ≈ 100vh is the exploration hold.
  - The page then continues.
- **Lenis.** The existing instance covers the page. No wheel or touch `preventDefault`.
- **Test maintenance first (M1).** Four specs compute positions from the document end. Switch them to a hero‑relative helper before any content is added after the hero.

## 7. Performance budget (measurable, acceptance criteria)

Measured with the existing `?debug` hook (`info()`: calls, triangles, programs, geometries, textures), a 3‑second rAF frame‑time sample, Chrome performance traces and Lighthouse. References: the Intel UHD 0x4628 machine (medium tier by detection) and a mid‑range Android in portrait.

| Metric | High | Medium (Intel iGPU, mobile) | How measured |
|---|---|---|---|
| WebGL contexts on page | **1** | **1** | `document.querySelectorAll('canvas').length`; test |
| Render loops | **1** (shared) | **1** | code review; test (no second `requestAnimationFrame` render) |
| Frame time, ecosystem interacting (p95) | ≤ 10 ms | ≤ 8 ms (DPR 1.25) | rAF sample during focus tween |
| Frames rendered while idle (5 s, nothing changing) | **0** | **0** | render counter in debug hook |
| Draw calls, ecosystem world | ≤ 45 | ≤ 30 | `info().calls` |
| Triangles, ecosystem world | ≤ 120k | ≤ 60k | `info().triangles` |
| New shader programs | ≤ 4, all at warm‑up; **0 after reveal** | same | `info().programs` delta, test |
| New lights | **0** | **0** | code review |
| New textures | ≤ 1 label/decal atlas, ≤ 512² (≤ 1 MB GPU) | same | `info().textures` |
| GPU memory added | ≤ 20 MB | ≤ 12 MB | Chrome GPU memory / estimate from buffers |
| JS added (gzip, lazy chunk) | ≤ 35 KB | ≤ 35 KB | build output |
| Network added before the section approaches | **0 bytes** | **0 bytes** | network panel / test (chunk requested only on approach) |
| Poster image (static fallback) | ≤ 120 KB WebP (desktop), ≤ 60 KB (portrait) | same | build output |
| Main‑thread work per rendered frame (overlay + director) | ≤ 2 ms | ≤ 3 ms | performance trace |
| Diorama build (idle callback, one time) | ≤ 40 ms | ≤ 80 ms | performance mark |
| Interaction to next paint (select a node) | ≤ 100 ms | ≤ 200 ms | Lighthouse / trace |
| Layout shift | 0 | 0 | Lighthouse CLS |
| New dependencies | **0** | **0** | `package.json` diff |

## 8. Fallback ladder (graceful degradation)

| Level | When | Ecosystem behaviour |
|---|---|---|
| **L0 High** | `quality = high` | Full 3D, existing post‑processing, demand rendering |
| **L1 Medium** | Intel iGPU, touch, ≤ 4 GB memory, ≤ 4 cores (existing detection) | 3D without post‑processing, DPR 1.25, instanced counts reduced about 40%, no glow sprite |
| **L2 Static** | poster tier, `prefers-reduced-motion`, Save‑Data, WebGL context loss, or the **runtime guard** | Poster image of the overview with **the same** HTML chips, cards, connections list and CTA. No 3D chunk is downloaded. |
| **L3 No JS** | JavaScript unavailable | SSR semantic section: heading, ordered list of nodes with capabilities and connections, CTA |

**Runtime guard.** In the ecosystem world, if the p90 frame time stays above 14 ms (medium) or 18 ms (high) for 2 s of active rendering, step down one level (high → medium → static). Remember the choice for the session (`sessionStorage`, wrapped in try/catch). The guard never runs while the hero world is active, so Scenes 01–03 behaviour is untouched.

## 9. Accessibility and progressive enhancement

- **Baseline first.** L3 is the source of truth: the content and CTA must make sense with no 3D.
- **Keyboard.**
  - The chip rail is `role="tablist"` with roving tabindex. Arrows move, Enter/Space selects.
  - The camera follows focus.
  - The card is a labelled region that receives focus; Esc closes it and returns focus to its chip.
  - Visible focus rings throughout.
- **Screen readers.**
  - 3D markers and the canvas are `aria-hidden`, with a text alternative for the diorama.
  - The chip rail and cards carry all semantics.
  - The event line is in a polite `aria-live` region.
- **Contrast** is WCAG AA on the glass background. Targets are ≥ 44px. No hover‑only content.
- **Motion.** Camera moves ≤ 1.2 s; reduced motion goes to L2.

## 10. Proposed components and files

```
components/ecosystem/
  EcosystemSection.tsx         SSR section (L3 content), chip rail + cards (L2), IO approach detection,
                               lazy-loads the 3D module on approach (never on L2/L3)
  ecosystem.css                section, rail, card/bottom sheet, labels — existing tokens
  scene/diorama.ts             seeded procedural layout using the city kit; node anchors
  scene/EcosystemWorld.tsx     merged + instanced meshes; reuses city material buckets; visibility gate
  scene/cameraKeys.ts          rise / overview / focus[i] (+ portrait)
  scene/EcosystemDirector.tsx  camera from section scroll + selection; invalidate-on-change; testcam steady
  scene/frameGuard.ts          runtime frame-time guard → fallback level
  overlay/EcosystemOverlay.tsx projected markers, labels, SVG connections (CollectionOverlay pattern)
  NodeCard.tsx, NodeRail.tsx   card/bottom sheet, chip rail (keyboard model)
content/ecosystem.ts           verified node copy, connections, illustrative events (PROPOSED)
src/pages/Home.tsx             (edit) mount <EcosystemSection/> after the hero
components/hero/Stage.tsx      (edit, D5) page-level fixed canvas layer; frame-loop policy; world switch host
components/hero/scene/Director.tsx, CollectionOverlay.tsx  (edit, D5) skip writes when ecosystem world is active
tests/ecosystem.spec.ts        single canvas; 0 idle frames; budgets via info(); keyboard; states; fallbacks
tests/*.spec.ts                (edit, M1) hero-relative scroll helpers
docs/SCENE04_HANDOFF.md        at the end of implementation
```

No new dependencies.

## 11. Implementation milestones

| # | Milestone | Exit criteria |
|---|---|---|
| M0 | Approvals D1–D9, copy direction | Signed off |
| M1 | **Behaviour‑neutral groundwork**: hero‑relative test helpers; canvas moved to a page‑level fixed layer; frame‑loop policy (hero `always`, otherwise stopped) | Full suite green; hero frames visually identical (frame comparison at fixed testcam positions); 0 frames rendered when no world is in view |
| M2 | Ecosystem section L3/L2: SSR content, chips, cards, CTA, poster slot | No‑JS and keyboard complete; Lighthouse accessibility ≥ 95; 0 KB 3D downloaded |
| M3 | Ecosystem world: diorama, material reuse, visibility switch, Director gate, demand rendering | Budget table met on Intel medium; 0 programs after reveal; 1 canvas |
| M4 | Interaction: markers, selection, focus keys, connections, card anchoring, portrait sheet, runtime guard | Deterministic forward and back; INP targets; guard steps down under a forced slow GPU |
| M5 | Rise hand‑off (own ScrollTrigger), exit CTA, "Explore platform" → `#ecosystem` | Seamless desktop and portrait; hero timeline guard passes |
| M6 | QA and docs: focused specs plus one full suite; captures high and medium, desktop and portrait; `SCENE04_HANDOFF.md` | All budgets recorded in the handoff doc |

Each milestone is a separate commit behind its own checkpoint branch.

## M1 status: hero render lifecycle (implemented)

**Approved direction (provisional).**
- 7 official modules + ICCC Integration hub.
- Lightweight miniature city.
- Existing site design system.
- HTML/CSS module interfaces.
- No new skills or dependencies.
- About 200vh section (subject to review).
- User Charges & Enforcement deferred.
- *Separate, lazy‑loaded canvas if performance‑safe*, versus §5.2's shared‑canvas recommendation: decided at M3 by measurement (see below).

**Render lifecycle now:**
- `Stage.tsx` → `OffscreenPause` (mounted once the scene is ready; not in still or reduced‑motion mode).
  - An `IntersectionObserver` on the hero section switches R3F's frame loop to `never` when the hero is entirely off‑screen and back to `always` as soon as any part of it re‑enters. *M3 change:* the margin was originally half a viewport; it is now zero, because the gate measured the hero still rendering about 60 fps through the first half‑viewport of Scene 04.
- **Nothing is recreated.**
  - The WebGL context, canvas element, geometry, textures, compiled programs, post‑processing and the GSAP timeline all stay alive.
  - Lenis/ScrollTrigger keep driving the rig while paused (a few plain-number writes per scroll event), so on return the first frame is the exact state for the current scroll position.
- **Large time step on resume.** The first frame after a long pause has a large delta. Only the Director consumes the delta, and it already clamps it to 1/30 s; everything else is a function of the rig or the clock.
- **Still mode** keeps `frameloop="demand"` and is unaffected.
- **Debug hook:** `__iwmsHero.loop()` returns `{ frames, frameloop }` (frames counted only with `?debug`).

**Measured** (`tests/lifecycle.spec.ts`, Intel UHD, high and medium):
- **0 frames rendered** while the hero is off‑screen (1.5 s sample).
- Rendering resumes on return.
- Rig and camera state after resume are identical to before (≤ 1e‑6, testcam).
- Reverse navigation to mid‑journey is identical.
- Same single canvas element, and **0 new shader programs** from pause/resume.

**Test hardening.** `maxScroll` in the collection, scene02, sunrise and traffic specs, the hero spec's "end of hero" scroll and the site spec's Skip target are now **hero‑relative**. Content after the hero cannot shift their sample points. This is equivalent today, because the hero is still the last section.

**Limitations.**
- While the hero is visible it still renders every frame (`always`), which the hand‑held camera float and post‑processing need. That is unchanged by design.
- The pause only takes effect once content exists after the hero (Scene 04). Today the hero is the final section, so in production it never fully leaves the viewport.
- **Implication for the canvas decision.** With the pause, a separate Scene 04 canvas would never render at the same time as the hero (one active loop). But both WebGL contexts and their GPU memory would stay resident. M3 must measure GPU memory and context count on the Intel/medium reference before choosing a separate canvas over the shared‑canvas design (§5.2).

## M2 status: HTML/CSS interface (implemented)

**What exists now.** `<EcosystemSection/>` is mounted after the hero in `src/pages/Home.tsx`. There is no 3D yet.

- **Content.** `content/ecosystem.ts` is a typed single source with these entries:
  - the 7 official modules, verbatim and in brochure order;
  - `ICCC Integration` as `kind: 'integration'`.
  
  Each entry has a summary, 2–4 capabilities paraphrased from the cited brochure page, one benefit line (PROPOSED), the brochure page (linked as `iwms-brochure.pdf#page=N`), its connections and a schematic map position. There are no statistics and no live or simulated events.
- **Interface.**
  - WAI‑ARIA tabs with automatic activation and roving tabindex. Arrow keys work on both axes; Home and End jump to the ends.
  - One `tabpanel` is visible at a time. "Connected to" buttons select the related module and move focus to its tab.
  - ICCC sits after an "Integration" divider and carries the note "not a separate IWMS module".
  - Actions: Request a demo (`demoRequestLink()`, so mailto once a real email is configured, www.zigma.in until then) and Download brochure (PDF).
- **Placeholder.** `EcosystemMap` is a static, CSS‑styled SVG schematic (`data-slot="ecosystem-3d"`, `aria-hidden`). It mirrors the selection through data attributes and marks the slot the M3 city replaces. It doubles as the future static fallback.
- **Layout.**
  - ≥ 1280 × 700 with JS: a 200vh section with a sticky 100vh stage in three columns (intro and rail · map · panel). The extra 100vh is reserved for M3.
  - Smaller screens: normal flow. The chip rail scrolls horizontally, the map sits above the panel, and targets are ≥ 44px.
  - A soft gradient blends the hero's final frame into the section, as a non‑interactive overlay.
- **Progressive enhancement.**
  - Server and no‑JS markup: all eight modules as readable articles, plus an in‑page link list.
  - After hydration: tabs. Static and poster tier: same interface (no WebGL involved).
  - Reduced motion: no pin and no CSS transitions or animations.

**Measured cost** (production build vs `445048f`):
- Main JS +3.4 KB gzip (231 → 242 KB raw).
- CSS +1.5 KB gzip.
- 0 images, fonts or canvases.
- No new dependencies.
- No render loop: selection is a React state change plus CSS. The hero's render loop pauses as soon as it has entirely left the viewport (M1, margin tightened in M3).

**Tests.**
- `tests/ecosystem.spec.ts`:
  - official names, order and integration kind;
  - no figures in the copy;
  - prerendered markup;
  - no‑JS list;
  - ARIA wiring, keyboard model and connections;
  - working actions, including the brochure HTTP 200;
  - exactly one canvas on the page;
  - hero ↔ section navigation, with the hero loop pausing and resuming and its state unchanged;
  - 200vh sticky layout on desktop;
  - phone: no horizontal overflow, 44px targets;
  - reduced motion;
  - poster tier.
- `hero.spec` reduced‑motion check: "no pin" now accounts for content after the hero. The document must equal the one‑viewport hero plus the following section.

**Limitations.**
- On wide screens the pinned second 100vh has no scroll‑driven content until M3.
- Header "Explore platform" still targets the hero's household scene. Retargeting it to `#ecosystem` remains decision D6.
- The schematic map is decorative. Selection is by tabs, links, or clicking map nodes with a mouse.

## M3 status: miniature 3D city (implemented)

### Step 1: GPU feasibility gate (measured, Intel UHD reference machine, Chromium ANGLE/D3D11)

A minimal second canvas (prototype scene) was measured before the city was built:
- high 1440×900;
- medium 1440×900;
- medium 390×844 viewport.

| Measured | Result |
|---|---|
| Scene 04 chunk fetched before approach | no (all three configurations) |
| Context losses, 10 hero ↔ Scene 04 round trips + 2 resizes | **0** (both canvases) |
| Scene 04 frames while idle (3 s) | **0** |
| Scene 04 frames for 4 selections | 4–5 (one per change) |
| Scene 04 frame cost, CPU+GPU via `gl.finish()` (40 frames) | p95 ≤ 0.3 ms |
| JS heap before → after | 37.1 → 41.1 MB (high), 38.0 → 37.9 MB (medium), 35.4 → 34.0 MB (390px) |
| Hero frame interval while Scene 04 loads | medium: max 16.8 ms; high: **one 83 ms frame** |
| Hero rendering inside Scene 04 (first half‑viewport) | **yes, about 60 fps**, because of M1's 50% margin |

**Not measurable from a page.** Absolute GPU/VRAM use is not exposed to web pages (no API, and the GPU process isn't inspectable from tests). The estimate below is derived from real buffer sizes, not measured:
- Scene 04 canvas: drawing buffer of slot size (e.g. 932×538 at 1440×900) × (colour + depth) × MSAA ≈ 4–9 MB, plus 0.31 MB of geometry buffers.
- The hero context stays resident while Scene 04 is shown. It is unchanged from before, and is not freed, by design: freeing it would mean a recompile hitch on return.

**Verdict: pass, with two fixes applied before building.**
1. The hero pause margin was reduced to 0, so only one canvas renders at a time.
2. The Scene 04 mount was deferred to `requestIdleCallback`, so parsing and compiling don't compete with a hero frame.

The two‑canvas design (the approved "separate canvas if performance‑safe") is therefore used. The shared‑canvas design (§5.2) remains the fallback if a later device shows memory pressure.

### Step 2–4: the city

**Rendering.**
- `EcosystemStage` is a lazy chunk (**3.9 KB gzip**, plus the shared 2.1 KB city builder; three.js and R3F are already loaded by the hero).
- `frameloop="demand"` with `resize={{ scroll: false }}`, so page scrolling never queues frames.
- MSAA, no post‑processing, no shadow maps, no textures, `flat` (no tone mapping).
- DPR: high 1–1.5, medium 1–1.25.
- One `MeshLambertMaterial` with vertex colours: **one merged geometry (one draw call)** plus one transparent highlight plate.
- Lights: a hemisphere light (soft morning sky) and one warm directional sun. Contact shading is baked with the builder's grime.

**City** (`scene/diorama.ts`, seeded, built once, about 3.2k triangles):
- A raised concrete island with a bevelled rim, an arterial road, two streets and a residential lane.
- 01 Collection: a house lane with compound walls and wet and dry bins at every gate.
- 02 D2D Logistics: a depot yard with an open shed and green collection trucks.
- 03 Resource Management: a ward office with crew vans.
- 04 Weighbridge: a transfer station with a truck on the weighbridge deck, a cabin and a canopy.
- 05 Processing: an MRF shed with skylights and compost windrows.
- 06 Landfill: a four‑tier engineered cell with an access ramp and a site cabin.
- 07 Grievances: an apartment block and a small plaza.
- ICCC: a civic podium with a glazed tower and a mast.
- Filler: seeded low‑rise blocks and low‑poly trees.

**Camera.** One fixed overview, pitched 38° and yawed −26°, fov 28. The distance is solved by projecting the island's corners to fill about 92% of the slot, recomputed only on resize (portrait aware).

**Labels and selection.**
- Labels are HTML, positioned from projected anchors and computed only on layout changes, never per frame.
- They are mouse‑clickable buttons, kept out of the tab order and hidden from assistive technology; the tabs remain the accessible control.
- Selection moves the single amber plate and re‑styles the labels (one frame).

**Layout (≥ 1280 × 820, pinned).**
- The intro and module list sit in the left column.
- The city fills the main area, with the information panel as a fixed‑height three‑part row beneath it (overview · capabilities · benefit and connections). Because the row height is fixed, switching modules never resizes the 3D view.
- Smaller or shorter screens use the M2 natural‑flow layout.

**Fallbacks.**
- The SVG schematic stays until the first compiled frame and returns on:
  - WebGL context loss;
  - a stage error, via an error boundary (chunk load, renderer creation);
  - a compile failure.
- Never loaded (the schematic is shown) on the poster tier, under reduced motion, or without JS.
- Tier detection runs only when the visitor approaches Scene 04.

**Observed** (production build, Intel UHD):
- 2 draw calls, 3,190 triangles, 0 textures, 2 programs, 0.31 MB of buffers.
- Frame cost p95 ≤ 0.2 ms at 1440×900 (932×538 drawing buffer) and at 1920×1080 (1400×712).
- 0 idle frames, 0 frames while the page scrolls.
- The hero is `never` inside Scene 04.
- No context loss and no new programs on interaction.

### Code review fixes applied (independent reviewer)
- **Reduced motion on desktop:** the schematic slot no longer collapses to 0 px; it keeps its aspect ratio.
- **Error boundary:** added around the lazy stage.
- **Stable city size:** the fixed‑height panel row keeps the city from re‑fitting on selection.
- **Map click:** clicking a zone label selects it again.
- **Compile failure:** `compileAsync` failure falls back to the schematic.
- **Canvas accessibility:** the canvas is hidden from assistive technology.
- **Tier detection:** deferred until approach.

### Limitations and M4 work
- No camera motion yet. Focus moves, animated connections between zones and portrait camera keys are M4, as planned.
- The pinned second 100vh is still unused by 3D. The M4/M5 rise hand‑off from Scene 03 will use it.
- With `KHR_parallel_shader_compile`, three's `compileAsync` keeps polling after a context loss during compile (reviewer finding 5). Harmless; the stage falls back.
- Real mobile GPUs were not available. The 390×844 checks used this desktop GPU with a medium tier.
- Label overlap at narrow widths (Resources / D2D Logistics / Grievances are close together) should be handled in M4 with the portrait camera key.

## M4 status: premium layout and city interactions (implemented)

### Layout (replaces the M3 pinned two‑column layout)
- **Natural flow.** The provisional ~200vh pinned section is retired. Scene 04 is now a normal section after the hero; nothing is sticky. The 1780vh hero is unchanged.
- **Order:**
  1. a centred eyebrow, title and lead;
  2. one row of horizontal pills (01–07, then an "Integration" divider and ICCC);
  3. one large framed city view;
  4. a one‑line note ("Illustrative city view…");
  5. four compact capability cards (brochure pages 6, 8, 12, 18);
  6. the two actions.
- **Info card.** There is one contextual card (`.eco__card`, the WAI‑ARIA tabpanel).
  - At ≥ 1100 px it overlays the right of the city view (22 rem). The city is framed in the remaining area with a camera view offset, so it never sits under the card.
  - Below 1100 px the card sits under the city.
- **Removed.** No permanent sidebar, no left tabs, no three‑column dashboard.
- **Responsive sizes.**
  - City view height: `clamp(420px, 62vh, 700px)` on desktop, `56vw` on tablet, `max(300px, 78vw)` on phones.
  - The pills scroll horizontally below 768 px, and the selected pill is scrolled into view.
- **No JS.** Without JavaScript every module is an in‑page‑linked list of cards, with the schematic in the slot.

### City interactions
- **Hotspots.** Eight HTML hotspot pills (a dot plus the number and label) are positioned from projected anchors inside the render callback, so they move only on frames that render.
  - They are mouse and touch buttons, out of the tab order, inside an `aria-hidden` overlay. The pills remain the accessible control.
  - On phones, unselected modules show their number only.
  - Hotspots are hidden outside the visible area: under the overlaid card, or within 24 px of an edge.
- **Selection sync.** A pill, a hotspot or a "Connected to" button all set the same state. The pill, card, hotspot, zone highlight and camera always agree.
- **Zone highlight.** Every zone has a thin mint outline (one merged mesh). The selected zone gets an amber frame plus the existing translucent plate.
- **Camera focus.** Selecting a module eases the camera to that zone: 0.95 s `power2.inOut`, same pitch and yaw, no orbit and no rotation. The focus distance is 0.48 × the overview distance, or 0.68 × on narrow aspects (< 1.4), so the neighbouring zones keep their context on phones.
- **Rapid selection.** The move is a single GSAP tween with `overwrite: true`, so a new selection replaces any running move from the current pose and nothing fights. A tween whose target equals the current pose is skipped. That case covers the first mount, and fixed an early bug where the mount rendered about 30 frames of a "move" to the same pose.
- **Return to overview.** A "Return to overview" button (keyboard reachable) eases back to the exact overview pose and returns focus to the selected pill.
- **Connections.** Dashed arcs from the focused module to its `connects` targets are drawn only while a module is focused, and only between visible hotspots. They are an SVG overlay with no 3D lines.
- **Resize.** A resize re‑solves the overview fit and snaps to the current pose (no animation).

### Rendering budget (production build, Intel UHD, 1440×900, high tier)
| Measured | M3 | M4 |
|---|---|---|
| Draw calls | 2 | **4** (city, outlines, plate, selected frame) |
| Triangles | 3,190 | 3,550 |
| Textures / post‑processing / shadows | 0 / none / none | 0 / none / none |
| Shader programs | 2 | 4, unchanged by any interaction |
| Geometry buffers | 0.31 MB | 0.36 MB (frames for every zone are built once) |
| Frames when idle | 0 | **0** (2 frames from mount to ready, then none) |
| Frames per selection | 1 | one camera move, about 29 frames over 0.95 s, then 0 |
| Frame cost, CPU+GPU, `gl.finish()` ×60 | p95 ≤ 0.2 ms | median 0.4 ms, p95 1.8 ms (larger 1198×556 drawing buffer) |
| JS heap in Scene 04 | 37–41 MB | 37.8 MB |
| Stage chunk | 3.9 KB gzip | 5.3 KB JS + 0.7 KB CSS gzip |

No new dependencies, canvases or render loops were added. The stage is still `frameloop="demand"`, and the hero is still `never` while Scene 04 is shown. Under reduced motion, on the poster tier and without JS, the 3D stage is never loaded.

### Tests (tests/ecosystem.spec.ts)
- **Updated for the M4 DOM:**
  - `.eco__card` / `.eco__card-tag` / `.eco__card-note`;
  - `.eco__tabs--static`;
  - `.eco__hotspot` inside the `aria-hidden` `.eco__overlay`.
- **New layout test:** centred header, one pill row, a city view over 70% of the viewport width and at least 420 px tall, the card overlaying it at under 40% of its width, four capability cards, and nothing sticky.
- **New interaction test:**
  - a hotspot click syncs the pill, card and camera;
  - arcs appear only when focused and never exceed the module's connections;
  - no visible hotspot overlaps the info card;
  - Return to overview restores the overview pose to within 1e‑3 and focuses the pill;
  - five rapid selections end exactly where a calm selection does;
  - at most 4 draw calls, no new programs, and 0 idle frames after every interaction.
- **New phone test (390×844):** the card sits under the city, the focused hotspot stays visible inside the view, and there is no horizontal overflow.
- **No‑JS test:** also checks for no overflow and a non‑collapsed slot.
- **Poster test:** also checks for four cards and no overview control.
- **M3 frame‑count race: resolved.**
  - The test now waits for the camera move to end (`camera().tweening === false`) and for the frame counter to settle before reading it.
  - Frames are bounded by the time the camera was moving (at most 120 Hz plus 4).
  - It then asserts strictly 0 frames for 1.5 s, both in Scene 04 and after returning to the hero (at most one late frame, then 0).
  - The city and interaction tests passed 3 out of 3 repeated runs.
  - No assertion was weakened to a timeout.

### Known limitations
- At 1440 a focused zone near the island edge (for example Weighbridge) has some connection targets off‑screen. Their arcs are omitted rather than drawn to a hidden hotspot; the card still lists every connection.
- The pillar copy and the stage note are marked PROPOSED in `content/ecosystem.ts` pending content sign‑off.
- Real mobile GPUs were still not available. The phone checks used the desktop GPU on the medium tier.

## M4.1 status: visual polish and progressive disclosure (implemented)

**Problems found in review** (screenshots at about 1860×830 and 1920×1080):
1. The permanent right‑hand card hid a third of the city.
2. The card scrolled internally, which clipped "Connected to".
3. "Return to overview" collided with a hotspot.
4. The heading sat under the fixed site header.
5. Labels clipped at the city edges.
6. Focused zones were sometimes heavily cropped.

### Information: progressive disclosure
- **Overview.** The city is unobstructed. Only a small hint chip ("Select a module or a zone on the map") sits in the bottom‑left corner. The selected module's compact summary sits *below* the city in normal flow, so the tabs ↔ tabpanel ARIA pairing stays valid.
- **Module selected, ≥ 768 px.** The summary floats in the city's bottom‑left corner: at most 21.5 rem wide, no internal scrolling, covering under 20% of the view. It holds:
  - the tag;
  - the name;
  - the short description;
  - two key highlights, which are hidden at 768–1099 px to keep the card short;
  - "View details" (`aria-expanded` / `aria-controls`) and "Return to overview".
- **Module selected, < 768 px.** The summary stays below the city; there is no bottom sheet.
- **View details.** The complete brochure content opens *below* the city in page flow: every capability, the benefit, the "Connected to" buttons and the brochure source. It has a Close control, which returns focus to View details.
  - The open state carries across module switches.
  - Opening scrolls just enough to reveal the details, never pushing them under the header.
  - Selecting a module never scrolls the page.
- **No JS.** Every module is fully expanded (2 columns from 900 px), and in‑page links land below the fixed header via `scroll-margin-top`.
- **Header clearance.** `.eco__inner` top padding is the header height plus 1–2 rem. At 1440×900 the header, pills and the full city (about 580 px) fit one viewport.

### Stage contract: `obstacles` replaces `insetRight`
The section measures every element it overlays on the slot (`[data-eco-overlay]`: the hint chip and the floating summary). It uses ResizeObserver plus focus/selection changes, clipped to the slot, and updates by value only. It passes the result as `obstacles: Rect[]` in slot CSS px.

**Camera.**
- Overview: fits the whole island to 95% of the slot.
- Focus: fits the selected zone plus a 12‑unit margin (including its building height) into the *free area* beside the large overlays, then tweens a view offset so the zone sits at that area's centre. Small chips are ignored for framing.
- The focus distance is clamped to 0.40–0.78 × the overview distance. The view offset is part of the tweened pose, so focus, return and rapid selection remain one GSAP tween with `overwrite: true`, and no‑op moves are skipped.

**Hotspots.**
- Hotspots are placed by priority each rendered frame: selected first, then its connections (when focused), then the rest.
- A hotspot is shown only if its dot is inside the slot (14 px edge margin, clear of the corner brackets) and clear of overlays and of already‑placed labels.
- Labels slide horizontally to stay inside the slot, and flip below the dot when there is no room above.
- Lower‑priority hotspots that would collide are hidden; the selected one is always labelled.
- Label sizes are measured in one batched read, only after a change.
- Connection arcs are drawn only while focused, and only between visible hotspots.

### Measured (production build, Intel UHD, 1440×900, high tier)
| Measured | M4 | M4.1 |
|---|---|---|
| Draw calls / triangles / textures | 4 / 3,550 / 0 | 4 / 3,550 / 0 |
| Shader programs | 4 | 4, unchanged by interactions |
| Frames: mount → idle | 2 | 3 (an extra frame when the measured obstacles arrive) |
| Frames per selection | about 29 | about 26, then **0** while idle |
| Frame cost, `gl.finish()` ×60 | p95 1.8 ms | median 0.1 ms, p95 0.5 ms |
| JS heap in Scene 04 | 37.8 MB | 40.1 MB |
| Stage chunk (gzip) | 5.3 KB + 0.7 KB | 6.2 KB + 0.8 KB |

No new dependencies, canvases or loops were added; `frameloop="demand"` and the hero pause are unchanged.

### Tests
- **New:**
  - header clearance and a one‑viewport check (desktop);
  - overview card below the city;
  - floating summary inside the city, under 20% of it, with no nested scrolling;
  - visible hotspots stay inside the view, off overlays and non‑overlapping (overview, focused and phone);
  - details disclosure: every capability, connection and source; below the city; no nested scrolling; no page scroll on module switch; Close returns focus;
  - no‑JS anchors land clear of the header with details expanded.
- **Results:**
  - ecosystem 16 out of 16;
  - the city frame‑count and interaction tests 2 out of 2 on repeat;
  - lifecycle, hero and site 19 out of 19.

### Limitations
- The new lead line and the UI labels are PROPOSED copy in `content/ecosystem.ts`; the module content is unchanged.
- At 390 px, unselected hotspots show numbers only, and the overview city is small (stage at least 300 px tall). The full content is in the summary and the details below.
- Playwright's own auto‑scroll (when it clicks an off‑screen pill) is a test artefact, not page behaviour. The no‑scroll test uses a dispatched click.

## M4.2 status: contextual floating popup (implemented)

The M4.1 summary card, anchored bottom‑left, is replaced by a MyBlue.ai‑style popup that floats *next to the selected operation*.

### Behaviour
- **Overview:** the whole city, no popup, only the small hint chip. "Return to overview" is a compact pill in the city's top‑left corner. It is shown whenever a module is in focus, and hotspots avoid it.
- **Selecting** (pill, city hotspot or "Connected to") opens the popup beside the zone. It holds:
  - the tag;
  - the title;
  - the ICCC note (ICCC only);
  - the short description;
  - two capabilities;
  - **View details** (the M4.1 full details below the city);
  - a close (×) button.
- **Switching modules** keeps one popup on screen at every frame. It glides to the new position (0.4 s transform transition), with no stacking and no drifting.
- **× or Escape** dismisses the popup but keeps the selection and the focused camera. Focus goes to the selected pill. The camera then eases to re‑centre the zone, because the popup's column is no longer reserved. Selecting a module again reopens the popup.
- **Return to overview** restores the full city and dismisses the popup. Focus goes to the selected pill.
- **Look:** translucent dark surface (`backdrop-filter` with a solid fallback), 1 px border and a soft shadow. A small amber accent sits on the edge facing the zone (mint for ICCC). It is about 312 px wide on desktop and 272 px on tablet (where the capabilities are hidden), and never scrolls.
- **Motion:** about 200 ms opacity and translate on entry and exit; none under reduced motion.
- **Phones (< 768 px):** no floating popup. The compact summary stays below the city in normal flow, and the overview pill remains on the city.
- **Fallbacks:** without JS, on the poster tier, under reduced motion, or with the schematic fallback, the M4.1 in‑flow summary and details are used.

### Placement strategy (simple, deterministic, no library)
1. **Side.** Zones west of the island centre (Collection, Logistics, Resources, Grievances) put the popup on their **right**; eastern zones (Processing, Landfill, Weighbridge, ICCC) put it on their **left**. The popup therefore sits over the denser city, not off the island edge.
2. **Camera.** While a popup is wanted, the focus framing reserves a column of the popup's *width* plus clearance on that side, and centres the zone (with its margin) in the rest of the slot.
   - Only the width affects the camera, and it is stable per breakpoint.
   - The camera is the same one‑tween system as before: view offset in the pose, `overwrite: true`, no‑op moves skipped.
3. **Position.** The stage projects the selected zone's footprint with the camera's **target** pose and returns `{x, y, side}` through `onPopupPlace`:
   - beside that footprint with a 24 px gap, vertically centred on it;
   - clamped 16 px inside the slot;
   - stepped below the overview pill if it would cover it.
   Because it comes from the target pose, the placement is known as the move starts. Rapid selections resolve to the last selection's placement.
4. **Measuring.** The popup's size comes from a hidden twin that renders the selected module with the popup's CSS. It is measured in the same commit as the selection, so the stage has the new size before the popup opens.
   - It is recomputed only on selection, focus, popup size, overlay or viewport changes, never per frame.
   - Hotspots avoid the popup rectangle only while the popup is open.

### Measured (production build, Intel UHD, 1440×900, high tier)
| Measured | M4.1 | M4.2 |
|---|---|---|
| Draw calls / triangles / textures / programs | 4 / 3,550 / 0 / 4 | unchanged |
| Frames: mount → idle | 3 | 3 |
| One selection | about 26 frames | about 27 frames, then 0 |
| Closing the popup (camera re‑centres) | n/a | about 29 frames, then 0 |
| Frame cost, `gl.finish()` ×60 | p95 0.5 ms | p95 0.1 ms |
| JS heap in Scene 04 | 40.1 MB | 37.8 MB |
| Stage chunk (gzip) | 6.2 KB + 0.8 KB CSS | 6.7 KB + 0.8 KB CSS |

There are no new dependencies, canvases or loops, and the popup is plain HTML/CSS. The only additional runtime cost is the hidden twin (one small DOM subtree).

### Tests
**New: popup test.** It covers:
- no popup in the overview;
- opened by a city hotspot;
- for Collection, Processing, Logistics, Weighbridge and ICCC: inside the city, beside the selected zone and near it, never covering the selected hotspot, and hotspots clear of it;
- at most one popup on screen at any frame during a switch;
- western and eastern zones use different sides and positions;
- View details is wired;
- × keeps the selection and the focused camera, and returns focus to the pill;
- re‑selecting reopens the popup, and Escape closes it;
- Return to overview dismisses it;
- zero idle frames afterwards.

**Also new:**
- phones have no floating popup;
- the layout test waits for the popup to settle.

**Results:**
- ecosystem 17 out of 17;
- the city and interaction tests 2 out of 2 on repeat;
- lifecycle, hero and site 19 out of 19.

### Limitations
- The popup's element changes when the module changes, because each module's tabpanel owns its summary (this keeps the WAI‑ARIA tabs pattern). It renders first at the previous placement and then glides, so visitors see one popup moving.
- The side choice is per zone (west or east), not per viewport. Near‑central zones (ICCC, Weighbridge) always use the left side.
- The hidden twin duplicates the selected summary's DOM, hidden from assistive technology and inert.

## 12. Risks and unresolved decisions

**Risks**
1. **Canvas relocation (M1)** touches the hero's mounting. Mitigated by frame comparisons at fixed testcam positions and the full suite before anything else is built.
2. **Shared‑world state leaks.** Fog, environment and sun state must be identical when returning to the hero. The Director gate and world switch must restore exactly; tested by scrolling hero → ecosystem → hero and comparing `sun()` and frame captures.
3. **Medium‑tier headroom.** The hero already uses 9–10 ms on Intel medium. The ecosystem must stay ≤ 8 ms, and the hero world must be hidden (not just off‑camera) while the ecosystem is active.
4. **Test drift.** Specs that assume the page ends at the hero; fixed first in M1.
5. **Content accuracy and scope creep.** Every capability traces to a brochure page; one card, one illustrative event.

**Decisions needed (D1–D9)**
- **D1. Node set.** 7 official modules + "ICCC Integration" hub (recommended)?
- **D2. Names.** Official names on cards, short labels on markers?
- **D3. Optional 9th node.** "User Charges & Enforcement" now or later?
- **D4. Art direction.** Miniature diorama (recommended) vs a larger realistic continuation? The latter costs considerably more GPU.
- **D5. Hero structure changes (§5.3).** Approve the behaviour‑neutral changes: page‑level canvas layer, frame‑loop policy, Director gate. This is what makes "one canvas, one loop" possible.
- **D6. Section scroll.** About 200vh (100vh rise + 100vh hold), and "Explore platform" → `#ecosystem` once built?
- **D7. Exit.** Request demo + brochure until a software showcase exists?
- **D8. Design system.** This site's tokens, or align cards with the Zigma ERP design system?
- **D9. Skills.** Install any of the four requested skills (source/version needed), or proceed without them?
