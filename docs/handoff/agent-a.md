# Agent A handoff — Hero and scene

## Built

- Replaced all scene placeholders with detailed palette-matched SVGs: truck, house, bin, worker, weighbridge, skyline, street, tree, processing plant and landfill.
- Built the hero as a server-at-build-time rendered marketing story. It includes the selected H1, product summary, demo and brochure actions, trust strip, QR-tagged pickup scene, DOM notification, pickup verification card, illustrative household counter and SR description.
- Added a reversible six-stage GSAP timeline through the shared hook. It animates arrival, notification, worker scan, bin tipping and truck load, departure, background pan, and weighbridge reveal. No React state updates per scroll frame.
- Added a fixed, keyboard-accessible skip link while the hero is active. It removes the pin, scrolls to the next section and moves focus there.
- Added a reduced-motion version with no pin, no GSAP/Lenis request, final verified frame and the four-step caption. Mobile has a shorter pin and centred truck. Poster, headings and CTA remain static in the HTML.
- Shared handoff remains unchanged in components/scene/handoff.ts. Verified the hero sets data-handoff="ready" at the final timeline position.

## Validation

- npm.cmd run lint — passed with zero warnings.
- npm.cmd run typecheck — passed.
- npm.cmd run build — passed; 25 marketing/preview HTML routes prerendered.
- Browser verification at 360, 768, 1024, 1440 and 1920px — no horizontal overflow; headline/demo CTA fit the initial viewport; skip removes pin and focuses #hero-end; no page errors.
- Reduced motion — zero pin spacers, verified card present, no runtime chunk requested, skip control hidden.
- JavaScript disabled — H1 and verified pickup content present in static HTML.
- Desktop final-scroll check — handoff state reaches `ready`, one pin spacer, no console errors.
- Lighthouse mobile report for `/`: Performance 94, Accessibility 100, Best Practices 96, SEO 92; LCP 2.63s, CLS 0.00014, TBT 17ms. The report is for the current whole site while all other sections are stubs. H1 is the LCP element. Lighthouse also reports missing `/favicon.ico` and a malformed/missing `/robots.txt`; these shared integration items are recorded in SHARED_CHANGES.md. LCP remains above the <2.0s goal; request a local Montserrat 700 font preload and retest.
- Bundle output: initial JavaScript 86.48 KB gzip; separate deferred animation runtime 49.70 KB gzip. The animation runtime is not fetched under reduced motion.
- Screenshots and machine-readable checks are under components/sections/Hero/reports/. `lighthouse-mobile.report.html` and `.json` capture the Lighthouse run.

## Shared-change requests

- agent-a-001: root favicon/crawler metadata and valid robots file.
- agent-a-002: replace black-backed logo crops with PDF-rendered/transparent assets and preload the local H1 font to reduce LCP.

## Known issues

- The extracted logos have black matte backgrounds at header size. The PDF source is raster; vector/transparent originals would improve the brand lockup. A rendered PDF crop is also an option, subject to Foundation replacing the shared assets.
- Lighthouse scores reflect a localhost preview and the full foundation site. Performance/LCP and SEO/BP targets are not fully met. Reports should be rerun after root metadata/favicon, font preload, final sections and production hosting are in place.
- Hero confirmation card values Ward 12, 07:42 AM and 8.4 kg are specification demo values and remain labelled illustrative. Household counts are demo labels, not a real metric.
- No Git repository exists in the provided workspace, so there is no Agent A branch to commit.

## Hero refinement — 4 October 2026

- Reworked the truck illustration with a shaded compactor body, reflective cab glass, chassis, detailed wheels and a non-branded civic-service mark. SVG gradient IDs are instance-safe; the public scene props and handoff contract are unchanged.
- Improved scroll motion with suspension settling on arrival and wheel rotation proportional to the longer drive-in/departure beats.
- Rechecked responsive and reduced-motion behavior; `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` pass. Foundation Playwright tests report all four cases passed, though the runner remained alive after its report and had to be stopped.
- Inspiration review: myblue.ai leads with a concise, animated system diagram; Samsara pairs a short value proposition and CTA with strong visual product proof. IWMS should follow that clarity while keeping its municipal pickup workflow as the signature visual.
- Lusion direction from the user: the dark, focused visual stage is now reflected in Hero. Its signature site-wide feel depends on one coherent real-time visual narrative and seamless scene transitions, not simply adding more hero effects. The home-page truck journey should continue through weighbridge, processing, landfill and command centre; other marketing sections should reveal supporting product proof as the same native scroll continues. See SHARED_CHANGES agent-a-003/004 for cross-owner integration.
