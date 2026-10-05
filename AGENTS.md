# IWMS agent working agreement

## Current user direction — 4 October 2026

Build a public marketing website using React 19 + strict TypeScript + Vite. Next.js has been removed at the user’s explicit request. Product dashboard/phone screens are labelled illustrations, not operational software. Foundation remains active until validated; the user reviews each subsequent implementation stage. These decisions supersede older Next.js/API references.

Read docs/PROMPT.md and this file fully before editing. Phase 0 is Foundation; Phase 1 is five independent worktrees. Do not start another agent's scope.

## Ownership

| Owner                             | Files                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation — locked after Phase 0 | src/styles/globals.css and design tokens; lib/animations/_; components/ui/_; package.json AND package-lock.json; project/tool configuration; src/App.tsx; components/layout/Header.tsx and Footer.tsx; content/config.ts, types.ts, shared.ts, navigation.ts; src/pages/Home.tsx; src/entry-server.tsx and src/main.tsx; lib/sections/_; tests/_; extracted public/brand/_; docs/source/_ |
| Agent A — Hero & Scene            | components/scene/* except locked contracts below; components/sections/Hero/_; content/hero.ts; public/scenes/_                                                                                                                                                                                                                                                                            |
| Agent B — Storytelling            | components/sections/Journey/* and Roadmap/*; content/journey.ts and roadmap.ts                                                                                                                                                                                                                                                                                                            |
| Agent C — Product                 | components/sections/Modules/*; src/pages/Module.tsx; content/modules.ts                                                                                                                                                                                                                                                                                                                   |
| Agent D — Showcase                | components/sections/Dashboard/_, Technologies/_, Citizen/*; content/dashboard.ts, technologies.ts, citizen.ts                                                                                                                                                                                                                                                                             |
| Agent E — Content & Conversion    | components/sections/{Problem,Compliance,Impact,Finance,Audience,FAQ,FinalCTA,Estimator}/_; lib/estimator/_; lib/forms/*; content/{problem,compliance,impact,finance,audience,faq,final-cta,estimator}.ts                                                                                                                                                                                  |
| Integrator — after Phase 1        | Shared-change resolution; global integration; metadata/schema; analytics/consent; src/pages/Privacy.tsx; sitemap/robots; final OG image                                                                                                                                                                                                                                                   |

Each agent may edit ONLY its own section's file in /content. All unlisted shared files are Foundation-owned until integration. Each agent owns docs/handoff/agent-X.md. SHARED_CHANGES.md and PLACEHOLDERS.md are append-only exceptions: append a uniquely labelled entry; never reorder or replace another agent's entries.

## Rules

- Edit ONLY files you own. Need a change elsewhere? Append a request to SHARED_CHANGES.md and use a local workaround.
- Never create a Lenis or GSAP instance yourself; use the shared hooks. useScrollTimeline supplies the timeline to its builder; add tweens to that timeline. No nested MotionProvider.
- Never change scene prop contracts in components/scene/types.ts without a SHARED_CHANGES request. components/scene/handoff.ts is also locked; Agent A and B consume the same initial/final pose.
- Every pinned or scroll-linked section uses useScrollTimeline() and cleans up on unmount. Only Hero and Journey may pin. Roadmap stays unpinned. Builder-created non-GSAP listeners/observers must return a cleanup function.
- All copy comes from /content; no hard-coded strings, including aria labels, errors, SVG captions and demo labels. Fix PDF typos; never invent product guarantees, clients or statistics.
- Every section must pass reduced-motion fallback, 360px layout, keyboard navigation and no console errors. SSR and JavaScript-disabled content must remain readable.
- Test via /dev/[your-section]. Available keys: hero, problem, journey, modules, dashboard, technologies, citizen, compliance, impact, finance, estimator, roadmap, audience, faq, final-cta. /dev/foundation is reserved for shared lifecycle tests.
- Small, descriptive commits on your own branch. Never edit or install dependencies in package.json/package-lock.json; request changes instead. Use npm.cmd ci on Windows.
- When finished, write /docs/handoff/agent-X.md: what you built, validation results, SHARED_CHANGES requests and known issues.

## Stable integration contracts

- Every section exports its existing default component from index.tsx and owns its existing id anchor. Do not edit src/pages/Home.tsx, section order or the registry.
- MotionProvider exists once in src/App.tsx, so both home and every dev route have the same motion lifecycle.
- useScrollTimeline(ref, builder, { sectionId, ...options }) accepts the anchor id, not the dev slug. Build with the supplied timeline; use scoped element.querySelector/querySelectorAll for DOM targets. onProgress is for derived UI state. Change rebuildKey when necessary; memoise a functional end option.
- Keep readable static markup until enhancement. The foundation does not hide SSR text or preload optional Rive assets. Agent A owns LCP-aware scene enhancement.
- Hero ends and Journey starts at heroJourneyHandoff in a 1200 × 600 scene. Truck progress does not position the outer SVG; the parent owns x/y/size. The Problem section remains between them.
- Truck load/progress and bin tip are normalised [0,1]; wheelRotation is degrees. All placeholder SVGs are decorative; verification evidence, toasts, counters and accessible descriptions belong in DOM.
- Shared data is typed English TS content with source pages. No barrel file: agents import owned files directly to avoid merge conflicts. Localisation can be added to the typed content later; translating the UI must not change contracts.
- The enquiry form is Agent E’s work. Submit to VITE_CONTACT_ENDPOINT, an externally hosted form service or Django/serverless endpoint. Never embed secret email credentials in the client bundle.
- Vite builds the browser bundle, then React renders each route to static HTML at build time. Deploy dist/ on a static host; no application server is required. Native links address prerendered routes. Keep src/metadata.ts and scripts/prerender.mjs Foundation-owned.
- FAQ placeholders are not publishable answers. Agent E must show the provided pending wording or omit unconfirmed claims from public FAQ/schema. Estimator coefficients are unapproved; do not invent savings.

## Integration and checks

Merge agent-e, agent-c, agent-d, agent-b, agent-a, preserving every agent's work. Resolve SHARED_CHANGES centrally. Run npm.cmd run lint, npm.cmd run typecheck, npm.cmd run build and npm.cmd run test:foundation. Broaden verification for each agent's implemented interactions.
