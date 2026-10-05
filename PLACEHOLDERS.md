# Unconfirmed content and launch requirements

## Content tokens

| Token                              | Location               | Status                                            |
| ---------------------------------- | ---------------------- | ------------------------------------------------- |
| `{{CONTACT_EMAIL}}`                | `content/config.ts`    | Awaiting confirmation; do not treat as live data. |
| `{{CONTACT_PHONE}}`                | `content/config.ts`    | Awaiting confirmation; do not treat as live data. |
| `{{WHATSAPP_NUMBER}}`              | `content/config.ts`    | Awaiting confirmation; do not treat as live data. |
| `{{DASHBOARD_ATTENDANCE}}`         | `content/dashboard.ts` | Awaiting confirmation; do not treat as live data. |
| `{{DASHBOARD_BALANCE_LIFE}}`       | `content/dashboard.ts` | Awaiting confirmation; do not treat as live data. |
| `{{DASHBOARD_COLLECTION_PERCENT}}` | `content/dashboard.ts` | Awaiting confirmation; do not treat as live data. |
| `{{DASHBOARD_SLA}}`                | `content/dashboard.ts` | Awaiting confirmation; do not treat as live data. |
| `{{FAQ_DATA_OWNERSHIP_HOSTING}}`   | `content/faq.ts`       | Awaiting confirmation; do not treat as live data. |
| `{{FAQ_OFFLINE_MODE}}`             | `content/faq.ts`       | Awaiting confirmation; do not treat as live data. |
| `{{FAQ_PILOT_WARD}}`               | `content/faq.ts`       | Awaiting confirmation; do not treat as live data. |
| `{{FAQ_REGIONAL_LANGUAGES}}`       | `content/faq.ts`       | Awaiting confirmation; do not treat as live data. |
| `{{FAQ_TENDER_SUPPORT}}`           | `content/faq.ts`       | Awaiting confirmation; do not treat as live data. |
| `{{FAQ_TRAINING}}`                 | `content/faq.ts`       | Awaiting confirmation; do not treat as live data. |
| `{{HERO_HOUSEHOLDS_AFTER}}`        | `content/hero.ts`      | Awaiting confirmation; do not treat as live data. |
| `{{HERO_HOUSEHOLDS_BEFORE}}`       | `content/hero.ts`      | Awaiting confirmation; do not treat as live data. |
| `{{IMPACT_STAT_1}}`                | `content/impact.ts`    | Awaiting confirmation; do not treat as live data. |
| `{{IMPACT_STAT_2}}`                | `content/impact.ts`    | Awaiting confirmation; do not treat as live data. |
| `{{IMPACT_STAT_3}}`                | `content/impact.ts`    | Awaiting confirmation; do not treat as live data. |
| `{{IMPACT_STAT_4}}`                | `content/impact.ts`    | Awaiting confirmation; do not treat as live data. |
| `{{PROBLEM_STAT_1}}`               | `content/problem.ts`   | Awaiting confirmation; do not treat as live data. |
| `{{PROBLEM_STAT_2}}`               | `content/problem.ts`   | Awaiting confirmation; do not treat as live data. |
| `{{PROBLEM_STAT_3}}`               | `content/problem.ts`   | Awaiting confirmation; do not treat as live data. |
| `{{PROBLEM_STAT_4}}`               | `content/problem.ts`   | Awaiting confirmation; do not treat as live data. |

## Source and implementation gaps

- No docs/reference screenshots were supplied. The live myblue.ai page currently describes an AI video platform; the intended visual reference is not verified.
- PDF p.22 names SWM Rules 2016. Stored only in content/config.ts; verify the applicable rule year before publication. This is source transcription, not legal verification.
- PDF p.14 also mentions designated low-lying areas for rejects. Public copy follows PROMPT.md's scientifically managed landfill requirement; review this discrepancy before launch. Original text is in docs/source/deck-text.txt.
- Contact email, phone and WhatsApp are not in the PDF. Do not create active links using placeholder tokens.
- Estimator has no source formula, improvement rates, fuel costs or household tariff assumptions. Agent E must define a commented config and clearly identify assumptions; no savings figures are approved.
- Hero Ward 12, 07:42 AM and 8.4 kg are illustrative script values, not deployment evidence. Household counts remain placeholder tokens; use clearly labelled demo values only if needed for animation.
- Dashboard values and SLA targets are illustrative only; no real city names or claimed results.
- Hosting, data ownership, offline mode, regional languages, training, tender assistance and pilot availability need product-team answers.
- Privacy policy, consent wording, public site origin, analytics IDs and OG image await integration. The privacy route is explicitly pending and no personal-data collection is implemented in Phase 0.
- Agent E must supply contact validation, rate limiting, honeypot, email delivery, WhatsApp and estimator-to-form integration. All sections remain stubs until Phase 1.
- No real deployment metrics, certifications or customer logos are approved.

## Asset status

Zigma and Blue Planet raster logos extracted from the PDF cover at native resolution, separated without redrawing. Suitable for the compact 32–38px-high lockup; request vector originals before any large-format use. Brochure copied unchanged to public/brand/iwms-brochure.pdf.

## Foundation revision — 4 October 2026

User changed the stack to React + TypeScript + Vite and confirmed a marketing-only website. Next.js server/API references above are historical. Use an external VITE_CONTACT_ENDPOINT; no email credentials belong in the browser. Section implementation remains pending after foundation review.

## Agent A — illustrative hero counter

The hero uses the specification’s 1,248 → 1,249 solely in a caption explicitly marked “Illustrative pickup — demo data”. Original HERO_HOUSEHOLDS placeholder tokens remain in content/hero.ts for replacement with approved values; no live city deployment is claimed.
