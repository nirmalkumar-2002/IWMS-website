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
  - An `IntersectionObserver` on the hero section, with a half‑viewport margin, switches R3F's frame loop to `never` when the hero is entirely off‑screen and back to `always` before it re‑enters.
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
- No render loop: selection is a React state change plus CSS. The hero's render loop pauses once the visitor is half a viewport into the section (M1).

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
