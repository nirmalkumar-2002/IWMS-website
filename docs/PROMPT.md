# CURRENT USER OVERRIDE — 4 October 2026

This is a public marketing website, not operational software. Use React 19 + TypeScript + Vite. Next.js, App Router, next/font, next/image, Next metadata APIs and server routes are superseded. Preserve the content and interaction requirements below using framework-independent React components, local fonts, native images/links, Vite build-time HTML generation, and an external VITE_CONTACT_ENDPOINT for enquiries. The remaining Next.js references below are historical implementation suggestions, not active requirements. Use src/App.tsx, src/pages/* and src/styles/globals.css instead of /app. Stop for review after the foundation before beginning the full hero.

# ROLE
You are a senior React/TypeScript front-end engineer and B2G (business-to-government) product marketer. You build award-level corporate landing websites with smooth, Awwwards-style motion that are also extremely fast, accessible, and credible to government buyers. Performance is a hard requirement, not a nice-to-have.

# PROJECT
Build a modern, highly interactive, well-optimized corporate landing website for **IWMS – Integrated Waste Management Suite** by **Zigma Global Environ Solutions Pvt. Ltd.** (a Blue Planet Group company).
Tagline: "A unified digital platform for waste management."
Project folder: D:\Nirmal files\websites\iwms-website

Signature experience: a scroll-driven hero where a waste collection truck arrives, the household pickup is verified by IWMS (QR scan, weight, photo, timestamp, GPS), and the truck departs toward the weighbridge. This flows directly into a "Journey of Waste" story where the same truck continues through weighbridge, processing, landfill and the command centre.

# SOURCE MATERIAL (read before writing any code)
1. Product deck (single source of truth for content):
   D:\Nirmal files\websites\iwms-website\IWMS ZIGMA v2-D7MmQU0B.pdf
   - All copy comes from this deck: overview, 7 modules and sub-features, technologies, citizen interface, compliance, financial model, 12-month roadmap, contact info.
   - Extract the Zigma and Blue Planet logos to /public/brand (ask me for SVG/PNG versions if extraction quality is poor).
   - Do NOT reuse the deck's raster infographics. They contain typos ("Greieance", "unhahtorized", "Subsdicies", "Reporrts") and mislabeled/duplicate tiles. Rebuild every icon and illustration as clean, optimized SVG with corrected text.
2. Style reference: https://myblue.ai/ (Blue Planet group site) and the screenshots I attach. Study:
   - smooth scrolling feel, section transitions, scroll-triggered reveals
   - typography scale, whitespace, card styles, hover micro-interactions
   - how the hero communicates value in under 5 seconds
   Match its quality and smoothness, not its exact layout. IWMS must feel like a sibling product in the same group.
3. Secondary inspiration (motion and structure only, never copy content):
   - rubicon.com, amcsgroup.com, routeware.com: waste-tech positioning
   - samsara.com: IoT/fleet dashboards presented as marketing visuals
   - stripe.com, linear.app, vercel.com: polish, gradients, scroll storytelling
   - apple.com product pages: scroll-scrubbed storytelling

# TARGET AUDIENCE (write every line for them)
Primary: Municipal Commissioners, ULB/Corporation officials, Smart City SPV CEOs, State Urban Development / Municipal Administration departments.
Secondary: Project Management Consultants (PMCs) who write tenders, and private SWM concessionaires/operators.
What they care about:
- stopping waste leakage and fraud
- SWM Rules compliance and audit readiness
- citizen complaints and public visibility
- fitting into their ICCC (Integrated Command and Control Centre)
- cost recovery through user charges
- a clear, low-risk rollout
Tone: confident, factual, government-credible. No hype words like "revolutionary". Short sentences, outcome-first headlines, Indian English ("₹", "ULB", "ward", "D2D").

# TECH STACK (React + TypeScript, optimized)
- React 19 + TypeScript (strict mode), all components as .tsx
- Next.js 15 App Router with **static export** (output: 'export'): every page pre-rendered to HTML, deployable on any static host or our own server
- React Server Components by default; add "use client" ONLY to components that need interactivity or animation, and keep those client islands as small as possible
- Tailwind CSS v4, design tokens as CSS variables
- GSAP + ScrollTrigger (with @gsap/react useGSAP): hero truck timeline and pinned storytelling only. Load via dynamic import so it is not in the initial bundle.
- Lenis: smooth scrolling, synced with ScrollTrigger, loaded after first paint, disabled under prefers-reduced-motion
- Motion (motion/react) for micro-interactions, using LazyMotion + domAnimation + the m component to keep the bundle small
- lucide-react icons imported individually (no barrel imports)
- React Hook Form + Zod for the demo form (loaded only when the form section approaches the viewport)
- Form submission via a pluggable endpoint (env variable). Default: a serverless function or form service; must be swappable for our Django API later.
- next/font for self-hosted, subset fonts
- ESLint (strict, jsx-a11y), Prettier, @next/bundle-analyzer
- No jQuery, no heavy UI kits, no moment.js, no full lodash. Prefer native APIs.

# BRAND & DESIGN SYSTEM
- Colors (sample exact hex values from the logos; these are the starting tokens):
  --navy-900: #0B1B33   (deep backgrounds)
  --navy-700: #1B365D   (section panels)
  --brand-navy: #002060
  --green-600: #1E7B34  (headings green, primary CTA)
  --lime-400: #92D050   (accents, highlights, data glows)
  --orange-500: #F07A28 (Blue Planet accent, sparingly)
  --surface: #F8FAF9, --ink: #0F172A, --muted: #64748B
  Waste stream colors: wet = green, dry = blue, hazardous = red, sanitary = yellow. Use consistently in all visuals.
- Typography: Montserrat (headings, 600–800) + Inter (body), Latin subset only, font-display: swap. Fluid type scale using clamp().
- Visual language: clean light sections alternating with deep-navy "command centre" sections. Subtle grid/dot patterns (CSS, not images), soft green-lime gradients, glassmorphism only on dark sections, rounded-2xl cards.
- Illustration style: flat-isometric, consistent stroke and palette, friendly but professional (cleaner versions of the deck's cover and thank-you illustrations).
- Iconography: one consistent line-icon style (1.75px stroke).
- Logos: Zigma + Blue Planet in header and footer, with "Part of the Blue Planet Group".

# SITE STRUCTURE (single-page landing + module detail pages)

## 1. Sticky header
Logos, nav (Platform, Modules, How it works, Impact, Roadmap, FAQ), "Request a Demo" CTA. Transparent over the hero, then blurs and shrinks on scroll (CSS + a tiny scroll listener, no animation library). Accessible mobile drawer menu.

## 2. Hero with scroll-driven truck animation (signature section)

### Copy
- H1 (propose 3 options), e.g. "Every kilo of city waste. Tracked, verified, accounted for."
- Sub: "IWMS unifies QR verification, GPS fleets, IoT weighbridges, CCTV/AI and citizen apps on one platform for cleaner, accountable cities."
- CTAs: "Request a Demo" (primary), "Download Brochure" (secondary, PDF).
- Trust strip: "Aligned with SWM Rules" · "ICCC-ready" · "Web + Mobile + IoT" · "12-month rollout".

### Initial state (page load, no scroll needed)
- Headline, sub-headline and CTAs server-rendered and fully visible: left column on desktop, top on mobile. This text is the LCP element, so it must render without waiting for JS or fonts.
- Scene rendered as static inline SVG on the server: a house with a QR tag on the door, a green bin with its own QR at the gate, trees, street, city skyline, a streetlight with a CCTV camera and GPS signal rings.
- Idle micro-animations in pure CSS (clouds drift, signal rings pulse, leaves sway).
- Collection truck parked just off-screen left.
- Hint: "Scroll to see IWMS in action ↓" plus a "Skip animation" link.

### Scroll timeline (GSAP ScrollTrigger, pin hero, scrub: 1, ≈180vh desktop)
1. 0–20%: Truck drives in from the left. Wheels rotate in sync with distance. Slight suspension bounce. GPS pin follows above the truck. Dashed route line draws behind it (stroke-dashoffset).
2. 20–30%: Truck slows and stops at the house. Toast: "Vehicle arriving in 15 min — resident notified" (phone icon).
3. 30–50%: Worker steps out (body camera icon on uniform) and scans the bin/house QR with a handheld device. Scan beam animates. Verification card pops in:
   "✓ Pickup Verified · Ward 12 · 07:42 AM · 8.4 kg · Photo captured · GPS locked"
4. 50–65%: Bin lifts and tips into the truck. A few waste pieces drop in. Segmented load bar on the truck fills (wet/dry colors). Worker returns to the truck.
5. 65–85%: Truck drives off to the right; route line continues. Counter ticks: "Households covered today: 1,248 → 1,249" (placeholder).
6. 85–100%: Scene pans right to reveal a weighbridge in the distance. Unpin and hand off to Section 4, which starts at the weighbridge with the same truck.

### Implementation
- Scene components as typed React SVG components in /components/scene: Truck, House, Bin, Worker, Weighbridge, ProcessingPlant, Landfill, Skyline, Street. Define prop types in scene/types.ts, e.g.
  TruckProps { progress: number; loadLevel: number; direction: 'left' | 'right'; showGps: boolean }
  BinProps { tipProgress: number; showQr: boolean }
  WorkerProps { state: 'idle' | 'walking' | 'scanning' | 'returning' }
  WeighbridgeProps { reading: number; alert: boolean }
- Layered SVG (background, midground, foreground) with subtle parallax. Optimize all SVG (SVGO), reuse shapes with <use>, keep total scene markup lean.
- One master GSAP timeline mapped to scroll progress. Animate transform/opacity only. 60fps. Do not drive the animation through React state on every scroll frame; GSAP manipulates refs directly.
- The GSAP/Lenis client island hydrates after first paint (dynamic import + requestIdleCallback or first user scroll).
- Verification card, toasts and counters are real DOM elements (crisp, accessible, translatable).
- Scrolling backwards rewinds cleanly; fast scrolling must not break the sequence.
- "Skip animation" scrolls past the pinned section.

### Responsive & accessibility
- Mobile (<768px): shorter pin (~120vh), simplified scene (no parallax, fewer props); truck stays centered while the background moves.
- prefers-reduced-motion: no pin, no GSAP load at all. Static final frame with the verified card visible, plus a 4-step caption strip (Notify → Scan → Verify → Depart).
- Screen readers: visually hidden description: "A collection vehicle arrives, the resident is notified, the worker scans the household QR code, IWMS records weight, photo, time and location, and the vehicle departs to the weighbridge."

## 3. The problem
3–4 pain cards with counters: manual logs, fake trip entries, weight manipulation, missed pickups, unanswered complaints, no landfill visibility.
Framing line: "What cities can't see, they can't fix."
Statistics are clearly marked placeholders {{STAT_TO_VERIFY}}. Never invent numbers.

## 4. "Journey of Waste" scrollytelling (continues from the hero)
Pinned GSAP section. The same truck continues through each step; a progress rail on the left; content swaps on scroll:
1. Weighbridge cross-verification: per-stop weights vs gross weighment, discrepancy alert, calibration reminders
2. Processing routes: Organic → Composting/Biomethanation, Dry → MRF/Pyrolysis, Mixed → Segregation & Composting
3. Rejects handling: non-combustible, non-compostable, non-reusable, non-recyclable → scientifically managed landfill
4. Landfill: inflow tracking, balance life, thermal hotspot alert, drone/GIS survey, informal activity detection
5. Command centre: all data lands on the city's ICCC dashboard
All step text is server-rendered (SEO). Mobile: vertical stacked cards with CSS reveals instead of pinning.

## 5. 7 Functional Modules (interactive explorer)
Orbit/radial layout on desktop (inspired by the deck's ring diagram), accordion on mobile. Clicking a module opens a side panel with its PDF features and a "View module →" link. All module content is in the HTML (not fetched).
1. Collection & Verification
2. D2D Collection & Logistics Management
3. Resource Management
4. Weighbridge Management
5. Waste Management (Processing)
6. Landfill Management
7. Grievance Redressal Management

## 6. Command Centre preview (dark section)
Coded (not screenshot) mock dashboard in SVG/CSS:
- live vehicle map dots moving along routes
- today's collection % ring
- weighbridge discrepancy alert toast
- attendance summary
- complaint SLA bar
- landfill balance-life gauge
Animated, fake but realistic data, labeled "Illustrative dashboard". Animations pause when off-screen (IntersectionObserver). No chart library; hand-built SVG.
Copy: integrates with the city's ICCC.

## 7. Key Technologies
Bento grid, each tile with a CSS hover animation:
GPS Tracking · QR Codes · Smart Bin Sensors (fill-level, weight) · IoT Load Cells & Weighbridges · Thermal Cameras · CCTV + AI with Drone/GIS · Body Cameras for operators.

## 8. Citizen Interface & Governance
Phone mockup (CSS/SVG frame) auto-cycling screens:
- "Vehicle arriving in 15 min" alert
- 1–5 star pickup rating
- raise a complaint
- escalation status tracker
Cycle pauses on hover/focus and when off-screen. Supporting cards: Help Desk, Escalation Matrix, AI-based segregation ratings, Fines & Enforcement, Visitor Management System.

## 9. Compliance
Cards: SWM Rules alignment, segregation-at-source monitoring, user charges and fines for mixed waste, automated authority reports, tamper-proof digital audit trails, weighbridge calibration and certificate reminders.

## 10. Impact / Benefits
Accountability (live data on time, staff, fuel, costs) · Efficiency (end-to-end collection with checks and balances) · Transparency (prevents leakage, ensures compliance) · Reduce-Reuse-Recycle.
Animated counters (tiny custom hook, triggered once in view), placeholder values only.

## 11. Financial Sustainability
- User Charges (₹5–₹1,000/month, household to bulk users)
- Revenue from Fines (non-compliance and violations)
- Government Subsidies (upfront spend → later reimbursement)

## 12. "Leakage & Savings" estimator
Inputs (sliders + number fields): households, vehicles, tonnes/day, current user-charge collection %.
Outputs: indicative improvements (fuel, collection coverage, user-charge recovery).
Formula lives in one typed, commented config file (/lib/estimator/config.ts) so our team can tune it. Pure functions with unit tests. Disclaimer: "Indicative only."
Lead hook: "Get a detailed assessment for your city" scrolls to the demo form, pre-filled with the inputs.

## 13. 12-Month Roadmap
Horizontal scroll-linked timeline with a small truck icon as the progress marker (CSS scroll-driven animation where supported, lightweight fallback otherwise):
- Phase 1 (0–1 month): Weighbridge Monitoring System
- Phase 2 (Month 1–2): Processing System Setup
- Phase 3 (Month 2–3): Landfill Management Module
- Phase 4 (Month 3–6): GPS Tracking & Route Optimization; QR Code rollout for households, apartments, bulk waste generators and bins
- Phase 5 (Month 6–9): User Charge (integrated billing, online/offline payments)
- Phase 6 (Month 9–12): Grievance Redressal Mechanism (citizen app/portal, ticketing, escalation matrix)
Close with: "Full IWMS operational in 12 months, with scalability for faster rollout if manpower is available."

## 14. Who it's for
Accessible tabs: Municipal Corporations · Smart City SPVs · State Departments · Private Operators. Each tab: tailored 3-point value message + CTA.

## 15. FAQ
8–10 questions for officials, using native <details>/<summary> (zero JS) styled as an accordion, with FAQPage JSON-LD:
- integration with the existing ICCC
- data ownership and hosting
- offline mode for field staff
- Tamil/regional language support
- training and handholding
- tender/DPR documentation support
- starting with a pilot ward
- hardware vs software scope

## 16. Final CTA + Demo form
Closing illustration: the truck driving away down a clean street. Message: "We can turn this vision into reality through innovative thinking and collective action."
Fields: Name, Designation, Organisation/ULB, State, City, Email, Phone, Interest (Demo / Pilot / Tender documentation / Partnership), Message.
Accessible labels, inline Zod errors, loading and success states (small "✓ Request verified" animation echoing the hero), honeypot field for spam.
Also: WhatsApp click-to-chat (number from config), "Download Brochure" (PDF in /public/brand).

## 17. Footer
Logos, www.zigma.in, Chennai · Singapore, quick links, module links, privacy policy, "© Zigma Global Environ Solutions Pvt. Ltd. Part of the Blue Planet Group."

## Module detail pages: /modules/[slug]
One per module, statically generated (generateStaticParams): hero illustration, feature grid (from the PDF), mini workflow diagram as SVG, related modules, CTA, unique metadata. These pages also serve SEO.

# PERFORMANCE BUDGET (hard requirements, verify before finishing)
- Lighthouse mobile ≥ 95 Performance, ≥ 95 Accessibility, 100 Best Practices, 100 SEO on / and one /modules page.
- Core Web Vitals: LCP < 2.0s, CLS < 0.05, INP < 200ms (simulated mobile, 4G).
- Initial JS for the home page < 120 KB gzipped (excluding lazily loaded animation chunks). Report the actual number from the bundle analyzer.
- Total home page weight < 1 MB on first load.
- Techniques required:
  - Server Components by default; small client islands only
  - dynamic import for GSAP, Lenis, the dashboard animation, the estimator and the form
  - IntersectionObserver-based lazy hydration for below-the-fold interactive sections
  - CSS animations preferred over JS wherever possible; JS animation only transform/opacity
  - pause all off-screen animations
  - images: next/image with AVIF/WebP, explicit width/height, lazy below the fold; illustrations as inline/optimized SVG
  - fonts: next/font, subset, preload only the heading weight used above the fold
  - no layout shift from fonts, images, or late-loading components (reserve space)
  - memoize only where profiling shows a benefit; avoid unnecessary re-renders on scroll
  - tree-shakeable imports only; run the bundle analyzer and remove anything unused
  - long-term cache headers for static assets in deployment notes

# MOTION RULES
- Lenis smooth scroll with GSAP ScrollTrigger sync, initialized once in a single MotionProvider client component.
- Only two pinned sections: the hero truck and the Journey of Waste. No other scroll-jacking.
- Reveal pattern: fade + 24px rise, stagger 0.06s, ease "power3.out", 0.6–0.8s. Implement as one reusable Reveal component.
- Magnetic primary buttons, card tilt ≤ 6°, cursor-follow glow on dark sections only (desktop/pointer: fine only).
- Respect prefers-reduced-motion everywhere. Content readable with JS disabled.
- No autoplay audio.

# AUDIENCE REACH (SEO, AI search, conversion)
- Per-page metadata via the Metadata API, Open Graph/Twitter cards (OG image: hero scene with the verified card), canonical URLs, sitemap.xml, robots.txt.
- Schema.org JSON-LD: Organization, SoftwareApplication, Product, FAQPage, BreadcrumbList.
- Semantic HTML: one H1 per page, logical heading order, landmarks (header, nav, main, footer).
- Target keywords: "integrated waste management software", "solid waste management software India", "door to door waste collection tracking", "QR code waste collection system", "weighbridge monitoring software", "landfill management system", "SWM Rules compliance software", "municipal grievance redressal system".
- Clear, answer-first paragraphs that AI search engines (ChatGPT, Gemini, Perplexity) can quote.
- i18n-ready: all copy in typed /content files (English now; Tamil/Hindi later). No hard-coded strings in components.
- Analytics hooks (env-driven, off by default, loaded after consent and after page load): GA4, Microsoft Clarity, LinkedIn Insight Tag. Track CTA clicks, hero animation completion vs skip, form submits, estimator usage, brochure downloads.
- Lightweight cookie/consent banner (no third-party consent library).

# CODE QUALITY
- TypeScript strict; no `any`. Typed props for every component, typed content objects.
- Folder structure:
  /app                     routes (page.tsx, modules/[slug], layout.tsx)
  /components/ui           shared primitives (Button, Card, Section, Badge, Toast, Counter, Reveal, Container, Heading)
  /components/scene        truck, house, bin, worker, weighbridge, processing plant, landfill SVG components + types.ts
  /components/sections     one folder per section
  /content                 all copy as typed TS objects + config.ts (contact, WhatsApp number, SWM rule year, brochure path)
  /lib/animations          MotionProvider, useScrollTimeline, useReveal, useReducedMotion, useInView
  /lib/estimator           formula + config + tests
  /public/brand            logos, OG image, brochure PDF
- Every pinned/scroll-linked component cleans up its ScrollTrigger on unmount. Call ScrollTrigger.refresh() after fonts and images settle.
- ESLint (incl. jsx-a11y) and `tsc --noEmit` pass with zero errors and zero warnings.
- Unit tests (Vitest) for the estimator and form validation.

# CONTENT RULES
- Use the PDF's facts. Fix grammar and typos from the deck.
- Never invent client names, city deployments, certifications or statistics. Use {{PLACEHOLDER}} tokens and list them all in PLACEHOLDERS.md.
- Keep "SWM Rules" generic in headlines; the specific rule year is one config value.

# WORK PLAN (stop for my review after each step)
1. Plan: content map (each section with the exact PDF content it uses), hero truck storyboard (one line per scroll stage), 3 H1 options, folder tree. Wait for my confirmation.
2. Foundation: project setup, tokens, fonts, MotionProvider + hooks, UI primitives, typed /content with all PDF copy, header, footer, page skeleton with all sections stubbed.
3. Hero: full SVG scene (static first), then the scroll animation with mobile and reduced-motion versions. Show me Lighthouse mobile for the home page at this point.
4. Journey of Waste + modules explorer + module detail pages.
5. Dashboard, technologies, citizen, compliance, impact, finance.
6. Estimator, roadmap, audience tabs, FAQ, demo form.
7. SEO/schema, analytics hooks, consent banner, OG image.
8. Optimization pass: bundle analyzer report, Lighthouse mobile on / and one /modules page, Core Web Vitals, accessibility audit, responsive check at 360, 768, 1024, 1440 and 1920px. Fix everything below budget.
9. Deliver: production static build, deployment notes (Vercel or our own server, with cache headers), README, PLACEHOLDERS.md.

If you can run subagents, you may parallelize steps 4–6 (one subagent per section group), but every subagent must follow this spec, use only the shared primitives and hooks, and must not edit shared files.
