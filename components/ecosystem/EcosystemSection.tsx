import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { detectQuality } from '@/components/hero/quality';
import { demoRequestLink, siteConfig } from '@/content/config';
import {
  ECOSYSTEM_BY_ID,
  ECOSYSTEM_NODES,
  ecosystemContent as c,
  ecosystemPillars,
  ecosystemStageContent as s,
  type EcosystemNode,
  type EcosystemNodeId,
  type EcosystemPillar,
} from '@/content/ecosystem';
import { EcosystemMap } from './EcosystemMap';
import './ecosystem.css';

// M3: the miniature-city stage is its own lazily loaded chunk (WebGL code never ships in the
// initial bundle and is never fetched on the poster tier, under reduced motion or without JS).
const EcosystemStage = lazy(() => import('./EcosystemStage'));

type StageState = 'off' | 'wanted' | 'ready' | 'failed';
/** A rectangle covered by UI overlaid on the slot (CSS px, relative to the slot's top-left). */
type Obstacle = { x: number; y: number; w: number; h: number };

/** Any failure of the lazy stage (chunk load, renderer creation, build) falls back to the schematic. */
class StageBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const MODULES = ECOSYSTEM_NODES.filter((n) => n.kind === 'module');
const INTEGRATIONS = ECOSYSTEM_NODES.filter((n) => n.kind === 'integration');
/** Tab order: the seven modules, then the integration hub. */
const ORDER = [...MODULES, ...INTEGRATIONS].map((n) => n.id);
/** Highlights shown in the compact summary (the full list lives in the details). */
const HIGHLIGHTS = 2;
/** Marks UI overlaid on the slot; measured and passed to the stage as obstacles. */
const OVERLAY_ATTR = 'data-eco-overlay';
const NO_OBSTACLES: ReadonlyArray<Obstacle> = [];

const tabId = (id: EcosystemNodeId) => `eco-tab-${id}`;
const panelId = (id: EcosystemNodeId) => `eco-${id}`;
const detailsId = (id: EcosystemNodeId) => `eco-${id}-details`;
const brochureHref = (page: number) =>
  `${siteConfig.brochurePath}#page=${page}`;

/** Simple 24px line icons for the capability cards (decorative). */
function PillarIcon({ icon }: { icon: EcosystemPillar['icon'] }) {
  const paths: Record<EcosystemPillar['icon'], ReactNode> = {
    verify: (
      <>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
        <path d="M7 7h.01M17 7h.01M7 17h.01" />
        <path d="m14 17 2.2 2.2L21 14.5" />
      </>
    ),
    fleet: (
      <>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.4" />
      </>
    ),
    weigh: (
      <>
        <path d="M12 4v16M7 20h10M5 7h14" />
        <path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
      </>
    ),
    citizens: (
      <>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M8 9.5h8M8 12.5h5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[icon]}
    </svg>
  );
}

/** Small decorative 16px line icon. */
function Glyph({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}
const ICON_OVERVIEW = 'M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4';
const ICON_CHEVRON = 'm4 6 4 4 4-4';
const ICON_CLOSE = 'm4 4 8 8M12 4l-8 8';
const ICON_TAP =
  'M8 1.5v2M3.4 3.4l1.4 1.4M12.6 3.4l-1.4 1.4M8 7v7.5M5.5 11.5 8 14.5l2.5-3';

/**
 * Scene 04 (M4.1): the IWMS ecosystem after the cinematic hero — centred header, module pills,
 * one large city view, four capability cards. Progressive disclosure: the overview shows the
 * whole city with only a small hint; selecting a module shows a compact summary (floating on the
 * city ≥768px once the 3D stage is ready, below it otherwise) and "View details" expands the
 * complete module information below the city in normal flow.
 * Progressive enhancement: the server/no-JS markup is a readable list of every module, fully
 * expanded, with in-page links; after hydration it becomes an accessible tab interface. The
 * schematic map holds the slot until (and unless) the lazy 3D stage is ready.
 */
export default function EcosystemSection() {
  const [enhanced, setEnhanced] = useState(false);
  const [selected, setSelected] = useState<EcosystemNodeId>('collection');
  const [focused, setFocused] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const tabs = useRef<
    Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>
  >({});
  const detailBtns = useRef<
    Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>
  >({});
  const tablistRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<StageState>('off');
  const [tier, setTier] = useState<'high' | 'medium' | null>(null);
  const [obstacles, setObstacles] =
    useState<ReadonlyArray<Obstacle>>(NO_OBSTACLES);
  const obstacleKey = useRef('[]');
  useEffect(() => setEnhanced(true), []);

  // Load the 3D stage only for capable tiers, without reduced motion, and only once the section
  // is within one viewport of being seen.
  useEffect(() => {
    if (!enhanced || !sectionRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        // Tier detection (a probe WebGL context) only when the visitor actually approaches.
        const q = detectQuality();
        if (q === 'poster') return;
        setTier(q);
        // Mount in idle time so parsing/compiling never competes with a hero frame.
        const start = () => setStage((st) => (st === 'off' ? 'wanted' : st));
        if ('requestIdleCallback' in window)
          window.requestIdleCallback(start, { timeout: 1500 });
        else setTimeout(start, 200);
      },
      { rootMargin: '100% 0px 100% 0px' },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, [enhanced]);
  const onStageReady = useCallback(
    () => setStage((st) => (st === 'wanted' ? 'ready' : st)),
    [],
  );
  const onStageLost = useCallback(() => setStage('failed'), []);

  // Obstacles for the stage: every element marked as overlaid (hint chip, floating summary)
  // that actually covers the slot, clipped to it, in integer CSS px relative to the slot. Only
  // a real change produces a new array (the stage reframes on change).
  useLayoutEffect(() => {
    if (!enhanced) return;
    const view = viewRef.current;
    const slot = slotRef.current;
    if (!view || !slot) return;
    const overlays = [
      ...view.querySelectorAll<HTMLElement>(`[${OVERLAY_ATTR}]`),
    ];
    const measure = () => {
      const sr = slot.getBoundingClientRect();
      const next: Obstacle[] = [];
      for (const el of overlays) {
        const r = el.getBoundingClientRect();
        const x0 = Math.max(r.left, sr.left);
        const y0 = Math.max(r.top, sr.top);
        const x1 = Math.min(r.right, sr.right);
        const y1 = Math.min(r.bottom, sr.bottom);
        if (r.width === 0 || r.height === 0 || x1 <= x0 || y1 <= y0) continue;
        const x = Math.floor(x0 - sr.left);
        const y = Math.floor(y0 - sr.top);
        next.push({
          x,
          y,
          w: Math.ceil(x1 - sr.left) - x,
          h: Math.ceil(y1 - sr.top) - y,
        });
      }
      const key = JSON.stringify(next);
      if (key === obstacleKey.current) return;
      obstacleKey.current = key;
      setObstacles(next.length ? next : NO_OBSTACLES);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    overlays.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [enhanced, focused, selected, stage]);

  // Keep the selected pill visible in the horizontally scrolling (mobile) tab row without
  // scrolling the page itself.
  useEffect(() => {
    const list = tablistRef.current;
    const el = tabs.current[selected];
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;
    const left = el.offsetLeft - list.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < list.scrollLeft) list.scrollLeft = left - 16;
    else if (right > list.scrollLeft + list.clientWidth)
      list.scrollLeft = right - list.clientWidth + 16;
  }, [selected, enhanced]);

  const select = useCallback((id: EcosystemNodeId, focus = false) => {
    setSelected(id);
    setFocused(true);
    if (focus) tabs.current[id]?.focus();
  }, []);
  const onStageSelect = useCallback(
    (id: EcosystemNodeId) => select(id),
    [select],
  );

  const returnToOverview = () => {
    setFocused(false);
    tabs.current[selected]?.focus();
  };

  const toggleDetails = () => {
    const open = !detailsOpen;
    setDetailsOpen(open);
    if (!open) return;
    // User-initiated: if the newly expanded details end below the fold, scroll just enough to
    // reveal them, never pushing their top under the fixed header (never on module selection).
    requestAnimationFrame(() => {
      const el = document.getElementById(detailsId(selected));
      if (!el) return;
      const r = el.getBoundingClientRect();
      const delta = Math.min(r.bottom - window.innerHeight + 24, r.top - 92);
      if (delta <= 0) return;
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches;
      window.scrollTo({
        top: window.scrollY + delta,
        behavior: smooth ? 'smooth' : 'auto',
      });
    });
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    detailBtns.current[selected]?.focus();
  };

  // WAI-ARIA tabs with automatic activation; arrows work on both axes.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = ORDER.indexOf(selected);
    const to =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? ORDER[(i + 1) % ORDER.length]
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? ORDER[(i - 1 + ORDER.length) % ORDER.length]
          : e.key === 'Home'
            ? ORDER[0]
            : e.key === 'End'
              ? ORDER[ORDER.length - 1]
              : null;
    if (!to) return;
    e.preventDefault();
    select(to, true);
  };

  const ready = stage === 'ready';
  /** The compact summary floats on the city (≥768px, see CSS) only over the live 3D stage. */
  const floating = enhanced && ready && focused;
  const demo = demoRequestLink();
  const pillContent = (n: EcosystemNode) => (
    <>
      {n.number && <span className="eco__pill-n">{n.number}</span>}
      <span className="eco__pill-label">{n.label}</span>
    </>
  );
  const tab = (n: EcosystemNode) => (
    <button
      key={n.id}
      type="button"
      role="tab"
      id={tabId(n.id)}
      ref={(el) => void (tabs.current[n.id] = el)}
      className="eco__pill"
      data-kind={n.kind}
      aria-selected={n.id === selected}
      aria-controls={panelId(n.id)}
      tabIndex={n.id === selected ? 0 : -1}
      onClick={() => select(n.id)}
      onKeyDown={onKeyDown}
    >
      {pillContent(n)}
    </button>
  );
  const divider = (
    <span className="eco__tabs-divider" aria-hidden="true">
      {c.integrationTag}
    </span>
  );

  const card = (n: EcosystemNode) => {
    const id = n.id;
    const isSel = id === selected;
    const hidden = enhanced && !isSel;
    const showDetails = !enhanced || detailsOpen;
    return (
      <article
        key={id}
        id={panelId(id)}
        className="eco__card"
        data-kind={n.kind}
        {...(enhanced
          ? { role: 'tabpanel', 'aria-labelledby': tabId(id) }
          : {})}
        hidden={hidden}
      >
        <div
          className="eco__summary"
          {...(floating && isSel ? { [OVERLAY_ATTR]: '' } : {})}
        >
          <div className="eco__summary-main">
            <p className="eco__card-tag">
              {n.kind === 'module'
                ? `${c.moduleTag} ${n.number}`
                : c.integrationTag}
              <span className="eco__card-place"> · {n.place}</span>
            </p>
            <h3 className="eco__card-title">{n.name}</h3>
            {n.kind === 'integration' && (
              <p className="eco__card-note">{c.integrationNote}</p>
            )}
            <p className="eco__card-summary">{n.summary}</p>
          </div>
          {enhanced && (
            <div className="eco__summary-aside">
              <ul className="eco__highlights" aria-label={s.highlightsLabel}>
                {n.capabilities.slice(0, HIGHLIGHTS).map((cap) => (
                  <li key={cap}>{cap}</li>
                ))}
              </ul>
              <div className="eco__summary-actions">
                <button
                  type="button"
                  ref={(el) => void (detailBtns.current[id] = el)}
                  className="eco__details-btn"
                  aria-expanded={detailsOpen}
                  aria-controls={detailsId(id)}
                  onClick={toggleDetails}
                >
                  {s.detailsLabel}
                  <Glyph d={ICON_CHEVRON} />
                </button>
                {ready && focused && isSel && (
                  <button
                    type="button"
                    className="eco__overview-btn"
                    onClick={returnToOverview}
                  >
                    <Glyph d={ICON_OVERVIEW} />
                    {s.overviewLabel}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          id={detailsId(id)}
          className="eco__details"
          role={enhanced ? 'region' : undefined}
          aria-label={enhanced ? `${s.detailsTitle}: ${n.name}` : undefined}
          hidden={!showDetails}
        >
          {enhanced && (
            <div className="eco__details-head">
              <p className="eco__details-title">
                {s.detailsTitle}
                <span className="eco__details-name"> · {n.label}</span>
              </p>
              <button
                type="button"
                className="eco__close-btn"
                aria-label={s.closeDetailsLabel(n.name)}
                onClick={closeDetails}
              >
                <Glyph d={ICON_CLOSE} />
                {s.closeLabel}
              </button>
            </div>
          )}
          <div className="eco__details-grid">
            <div className="eco__card-body">
              <h4 className="eco__card-sub">{c.capabilitiesLabel}</h4>
              <ul className="eco__card-list">
                {n.capabilities.map((cap) => (
                  <li key={cap}>{cap}</li>
                ))}
              </ul>
            </div>
            <div className="eco__card-side">
              <p className="eco__card-benefit">{n.benefit}</p>
              <h4 className="eco__card-sub">{c.connectsLabel}</h4>
              <ul className="eco__card-links">
                {n.connects.map((to) => (
                  <li key={to}>
                    {enhanced ? (
                      <button
                        type="button"
                        className="eco__link"
                        aria-controls={panelId(to)}
                        onClick={() => select(to, true)}
                      >
                        {ECOSYSTEM_BY_ID[to].label}
                      </button>
                    ) : (
                      <a className="eco__link" href={`#${panelId(to)}`}>
                        {ECOSYSTEM_BY_ID[to].label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              <a className="eco__source" href={brochureHref(n.page)}>
                {c.sourceLabel(n.page)}
              </a>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section
      ref={sectionRef}
      id="ecosystem"
      className="eco"
      data-enhanced={enhanced ? 'true' : 'false'}
      aria-labelledby="eco-title"
    >
      <div className="eco__inner">
        <header className="eco__head">
          <p className="eco__eyebrow">{c.eyebrow}</p>
          <h2 id="eco-title" className="eco__title">
            {c.title}
          </h2>
          <p className="eco__lead">{s.lead}</p>
        </header>

        {enhanced ? (
          <div
            ref={tablistRef}
            className="eco__tabs"
            role="tablist"
            aria-label={c.railLabel}
          >
            {MODULES.map(tab)}
            {divider}
            {INTEGRATIONS.map(tab)}
          </div>
        ) : (
          <nav className="eco__tabs eco__tabs--static" aria-label={c.railLabel}>
            <ul>
              {MODULES.map((n) => (
                <li key={n.id}>
                  <a
                    className="eco__pill"
                    data-kind={n.kind}
                    href={`#${panelId(n.id)}`}
                  >
                    {pillContent(n)}
                  </a>
                </li>
              ))}
              <li aria-hidden="true">{divider}</li>
              {INTEGRATIONS.map((n) => (
                <li key={n.id}>
                  <a
                    className="eco__pill"
                    data-kind={n.kind}
                    href={`#${panelId(n.id)}`}
                  >
                    {pillContent(n)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div
          ref={viewRef}
          className="eco__view"
          data-float={floating ? 'true' : 'false'}
          data-details={enhanced && detailsOpen ? 'open' : 'closed'}
        >
          <div className="eco__stage-card">
            <div ref={slotRef} className="eco__slot" data-stage={stage}>
              <EcosystemMap
                selected={enhanced ? selected : null}
                onSelect={enhanced ? select : undefined}
              />
              {tier && (stage === 'wanted' || stage === 'ready') && (
                <StageBoundary onError={onStageLost}>
                  <Suspense fallback={null}>
                    <EcosystemStage
                      quality={tier}
                      selected={selected}
                      focused={focused}
                      obstacles={obstacles}
                      onSelect={onStageSelect}
                      onReady={onStageReady}
                      onLost={onStageLost}
                    />
                  </Suspense>
                </StageBoundary>
              )}
            </div>
            {enhanced && ready && !focused && (
              <p className="eco__hint" {...{ [OVERLAY_ATTR]: '' }}>
                <Glyph d={ICON_TAP} size={13} />
                {s.hint}
              </p>
            )}
          </div>

          <div className="eco__panels">
            {ORDER.map((id) => card(ECOSYSTEM_BY_ID[id]))}
          </div>
        </div>

        <p className="eco__note">
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 7.2v4M8 4.8h.01" />
          </svg>
          {s.stageNote}
        </p>

        <ul className="eco__pillars" aria-label={s.pillarsLabel}>
          {ecosystemPillars.map((p) => (
            <li key={p.id} className="eco__pillar">
              <span className="eco__pillar-icon">
                <PillarIcon icon={p.icon} />
              </span>
              <h3 className="eco__pillar-title">{p.title}</h3>
              <p className="eco__pillar-text">{p.text}</p>
              <a className="eco__source" href={brochureHref(p.page)}>
                {c.sourceLabel(p.page)}
              </a>
            </li>
          ))}
        </ul>

        <div className="eco__actions">
          <a
            className="eco__action eco__action--primary"
            href={demo.href}
            {...(demo.external ? { target: '_blank', rel: 'noopener' } : {})}
          >
            {c.demo}
          </a>
          <a className="eco__action" href={siteConfig.brochurePath}>
            {c.brochure}
          </a>
        </div>
      </div>
    </section>
  );
}
