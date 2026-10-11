# IWMS marketing website

Public website for **IWMS (Integrated Waste Management Suite)**.

**Phase 1 is a single cinematic hero, and nothing else is on the page yet.** A green municipal refuse truck sits on a quiet road before dawn. It switches on its markers, tail lamps and headlights. The visitor then scrolls through camera shots of the truck, and it pulls away. The copy ("INTEGRATED WASTE MANAGEMENT SUITE" plus subtitle) is prerendered static HTML and stays readable without JavaScript or WebGL.

The previous multi-section site (module pages, section previews, enquiry form scaffolding) is archived on the git branch **`archive/pre-cinematic`**.

## Stack

React 19, strict TypeScript, Vite 8 (static build with build-time prerender, no server runtime), Tailwind CSS v4, three.js 0.186 with @react-three/fiber 9, drei and postprocessing, GSAP ScrollTrigger, Lenis smooth scroll, Playwright. Fonts (Inter, Montserrat) are self-hosted via Fontsource.

## Scripts

Requires Node.js 22.12+ or 24. On Windows PowerShell, use `npm.cmd`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server at http://127.0.0.1:5173 |
| `npm run build` | Typecheck, client build, SSR build, then prerender `/`, `/privacy` and `/404` into `dist/` |
| `npm run start` | Serve `dist/` at http://127.0.0.1:4173 (`vite preview`) |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:foundation` | Playwright hero tests against `dist/`. Run `build` first. |

## Architecture (`components/hero`)

| File | Responsibility |
| --- | --- |
| `CinematicHero.tsx` | Section markup and copy (SSR-identical). After hydration it picks the mode (cinematic / still / static poster) and lazy-loads `Stage`. An error boundary falls back to the poster. |
| `quality.ts` | `detectQuality()`: decides the render tier, including the `?quality=` override |
| `Stage.tsx` | R3F `<Canvas>` (DPR, tone mapping, context-loss handling), loading line, ready signal, starts the timelines. Shows the dev-proxy label. |
| `hero.css` | Hero layout, copy typography, poster backdrop, loader |
| `scene/rig.ts` | Mutable `Rig` state, camera shot list and spline, focal-length→FOV conversion, drive-off kinematics |
| `scene/timeline.ts` | GSAP intro (approach + lamp ignition + title reveal), scroll-scrubbed reveal (shots, drive-off), Lenis wiring, reduced-motion still pose |
| `scene/Director.tsx` | Per-frame `useFrame`: applies the rig to the camera, truck (translation, wheel spin, squat) and all lamp intensities |
| `scene/handles.ts` | `TruckHandles`/`SceneRefs` contracts and the `LAMPS` lamp coordinates |
| `scene/Truck.tsx` | Truck root in its lane. Picks `ModelTruck` or `ProxyTruck` via `__TRUCK_MODEL__`; contact shadow. |
| `scene/ModelTruck.tsx` | Loads the licensed GLB (Draco) and extracts handles by node name |
| `scene/ProxyTruck.tsx` | Dimensionally accurate procedural stand-in, used until the GLB arrives |
| `scene/TruckLights.tsx` | Headlight spot lights, additive fog-beam cones, marker/tail glow lights |
| `scene/World.tsx` | Fog, sky shader, generated environment reflections, road/kerbs, streetlights, treeline, buildings |
| `scene/Effects.tsx` | Post-processing (high tier only): bloom, ACES, vignette, grain, SMAA |

Hero copy lives in `content/hero.ts`. Pages are in `src/pages`, and `scripts/prerender.mjs` writes the static HTML.

## Quality tiers

| Tier | Chosen when | Rendering |
| --- | --- | --- |
| `high` | Desktop-class GPU and CPU | DPR up to 1.75, post-processing, two real streetlights |
| `medium` | Touch device, ≤ 4 GB memory or ≤ 4 cores | DPR up to 1.25, MSAA, no post-processing |
| `poster` | No WebGL2, Save-Data, or a software renderer | Static backdrop; no 3D code or assets are downloaded |

Append `?quality=high|medium|poster` to any URL to force a tier for QA. With `prefers-reduced-motion`, the scene renders one still frame (side profile, lamps on) and the scroll stays unpinned.

## Assets

| Asset | Path | Source / licence |
| --- | --- | --- |
| Asphalt025C 1K (colour, normalGL, roughness) | `public/textures/asphalt/` | [ambientCG](https://ambientcg.com/view?id=Asphalt025C), CC0 |
| Draco decoder | `public/draco/` | Google Draco (via three.js), Apache-2.0 |
| Brand files and brochure | `public/brand/` | IWMS / Zigma |

No HDRI is shipped. Reflections come from drei `<Environment>` rendering the scene's own blue-hour sky shader plus soft Lightformer panels.

## Outstanding: licensed truck model

The truck currently on screen is a **development proxy**, labelled as such in the corner of the hero. The production vehicle is a licensed photoreal GLB still to be purchased and prepared. To swap it in, drop it at `public/models/garbage-truck.glb`; the build detects the file and uses it automatically. Node naming, units, lamp positions, budgets and the compression command are in **[docs/TRUCK_ASSET_SPEC.md](docs/TRUCK_ASSET_SPEC.md)**.

## Deployment

Upload `dist/` to any static host. Serve `/path/index.html` for clean URLs and `404.html` with a 404 status for unknown paths; do not rewrite everything to `/`. Cache `/assets/*` immutably for a year, and revalidate HTML. `VITE_*` variables (see `.env.example`) are public, so never put secrets in them.
