# IWMS marketing website

React 19 + strict TypeScript + Vite + Tailwind CSS v4. This is the public marketing website for IWMS. The foundation includes branding, shared components, PDF content and section placeholders. Full section designs and enquiry form are subsequent review stages.

## Run locally

Use Node.js 22.12+ or 24 and npm. On Windows use npm.cmd to avoid PowerShell script-policy restrictions.

```powershell
npm.cmd ci
npm.cmd run dev
```

Vite prints the local address (normally http://127.0.0.1:5173).

## Check and build

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
npm.cmd run test:foundation
```

Build produces a static dist/ directory, including HTML for the home page, seven module pages, privacy placeholder, 404 and isolated section previews. React hydrates the generated HTML; content and native links remain available without JavaScript. Development uses Vite’s client rendering. No Next.js runtime or backend is included.

Fonts are bundled locally via Fontsource (Inter and Montserrat, Latin subset). GSAP/Lenis load after paint and are not requested when reduced motion is enabled. The shared timeline API and scene contracts are unchanged.

Use /dev/hero, /dev/journey and other keys in AGENTS.md. Native document navigation deliberately avoids a routing dependency for this marketing site. Module pages currently remain placeholders.

## Deployment

Upload dist/ to a static host. Serve existing /path/index.html files for clean URLs; use 404.html with a 404 status for unknown paths. Do not rewrite every URL to the home page. Cache /assets/* for one year with immutable; revalidate HTML. The PDF brochure is downloaded only on request.

Set VITE_CONTACT_ENDPOINT to an external form endpoint when the enquiry form is implemented. VITE_* values are public: never put Resend/SMTP/API secrets there. Configure CORS and abuse controls on that external endpoint. See .env.example.

Read docs/PROMPT.md and AGENTS.md before editing. PDF facts are in typed content files; unsupported claims are tracked in PLACEHOLDERS.md. The old Vite sample binary assets are retained but not imported. Historical .next output, if present locally, is ignored and never deployed.

Build-time prerendering follows Vite’s rendering APIs: https://vite.dev/guide/ssr.html
