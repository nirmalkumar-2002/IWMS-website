# Shared change requests

Append requests only. Integrator records decisions after Phase 1.

<!--
## REQUEST agent-X-001 — Short title
- Requested by:
- Owned section:
- Shared file(s):
- Reason and proposed exact change:
- Local workaround:
- Status: pending
- Integrator decision:
-->


## REQUEST agent-a-001 — Static site root metadata and favicon
- Requested by: Agent A
- Owned section: Hero mobile Lighthouse audit
- Shared file(s): index.html; public/robots.txt; public/favicon.ico or favicon.svg
- Reason and proposed exact change: index.html lacks a favicon and deployable crawler metadata. Preview returns index.html for /robots.txt, lowering Lighthouse SEO to 92 and Best Practices to 96 (missing /favicon.ico). Add a real favicon link to the existing public/favicon.svg and valid robots.txt for the confirmed VITE_SITE_URL; add canonical/OpenGraph metadata when the public origin is approved.
- Local workaround: none; integration owns robots/sitemap and Foundation owns the HTML shell. Lighthouse result records these outstanding root issues.
- Status: pending
- Integrator decision: pending


## REQUEST agent-a-002 — Correct logo background and LCP font preload
- Requested by: Agent A
- Owned section: Hero review screenshot and mobile Lighthouse target
- Shared file(s): public/brand/zigma.png; public/brand/blue-planet.png; index.html; emitted heading font asset
- Reason and proposed exact change: the extracted alpha-masked cover image appears black-backed in the sticky header. Replace it with crops rendered against the PDF’s white background or obtain transparent logo originals. Lighthouse mobile identifies the h1 as LCP at 2.63s; preload the local Montserrat 700 WOFF2 used by the H1 in the HTML shell and rerun the audit to work toward the <2.0s target.
- Local workaround: none; logo and HTML shell are Foundation-owned after Phase 0.
- Status: pending
- Integrator decision: pending


## REQUEST agent-a-005 — Unseen reference: guided exploration
- Requested by: Agent A, following user reference
- Owned section: Whole-page scroll narrative; section owners keep their existing files
- Shared file(s): none; cross-owner direction only
- Reason and proposed exact change: Unseen makes exploration itself part of the brand experience through a distinct visual world, simple entry/navigation cues, and interactive project discovery. For IWMS, adapt the guided discovery and clear chapter transitions to native scrolling: keep a visible “scroll to explore” cue and progress/chapter markers, transition one continuous waste journey between visual scenes, and let each section reveal evidence for the current stage. Preserve direct anchors, keyboard operation, reduced-motion/static fallbacks, and normal scroll. Do not add forced audio, click-and-hold, or drag-only navigation for municipal buyers.
- Local workaround: Hero now uses a focused dark scene stage and an existing scroll cue/step rail. Whole-page scene continuity remains a cross-owner integration request in agent-a-004.
- Status: pending
- Integrator decision: pending


## REQUEST agent-a-003 — Consistent scroll-to-explore storytelling
- Requested by: Agent A
- Owned section: Hero visual direction and Phase 1 cross-section experience
- Shared file(s): none; each section remains owned by its assigned agent
- Reason and proposed exact change: The user wants the public site to feel like one scroll-to-explore journey. Keep the product story readable and CTA visible at first paint; use restrained reveal/parallax transitions to connect section beats, with explicit progress cues where useful. Only Hero and Journey may pin. Other sections must remain normal-flow, use shared reveal/timeline hooks, and preserve keyboard, reduced-motion and no-JavaScript behavior. Keep scroll native and avoid hijacking.
- Local workaround: Hero retains its scroll hint and active four-step rail; Agent A uses the stronger dark visual stage for focus. This request gives the rest of Phase 1 a consistent direction.
- Status: pending
- Integrator decision: pending


## REQUEST agent-a-004 — Whole-page waste journey choreography
- Requested by: Agent A, following user direction
- Owned section: Hero, Journey, and global scroll experience integration
- Shared file(s): src/App.tsx or src/pages/Home.tsx; global scene/motion coordinator; section-owned Journey and supporting section visuals
- Reason and proposed exact change: The truck story should carry through the public site instead of ending at the hero. Build one readable, scroll-led narrative: household pickup and verification; visible route/accountability problem; weighbridge cross-check; processing; landfill oversight; city command centre. Reuse the same truck art and consistent lighting/route language at handoffs. Later product, compliance, impact and rollout sections should continue the chapter-based scroll experience with meaningful local visual reveals. Keep normal document scrolling, pin only Hero/Journey, and keep DOM copy static/readable. If a persistent WebGL canvas or new package is selected, Foundation must approve the dependency and integration before any package files change.
- Local workaround: Hero now has the Lusion-inspired dark visual stage and its own pickup sequence; Hero-to-Journey handoff contract remains available. This request records the site-wide scope without editing other owners' files.
- Status: pending
- Integrator decision: pending
