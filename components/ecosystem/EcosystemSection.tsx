import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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

/** Any failure of the lazy stage (chunk load, renderer creation, build) falls back to the schematic. */
class StageBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
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

/** Viewports where the info card overlays the stage card (keep in sync with ecosystem.css). */
const OVERLAY_MQ = '(min-width: 1100px)';
/** Gap between the overlaid card and the area the city is framed in (CSS px). */
const OVERLAY_GAP = 16;

const tabId = (id: EcosystemNodeId) => `eco-tab-${id}`;
const panelId = (id: EcosystemNodeId) => `eco-${id}`;
const brochureHref = (page: number) => `${siteConfig.brochurePath}#page=${page}`;

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

/**
 * Scene 04 (M4): the IWMS ecosystem after the cinematic hero — centred header, module pills, one
 * large framed city view with a contextual info card, and four capability cards.
 * Progressive enhancement: the server/no-JS markup is a readable list of every module (with
 * in-page links); after hydration it becomes an accessible tab interface showing one card at a
 * time. The schematic map holds the slot until (and unless) the lazy 3D stage is ready.
 */
export default function EcosystemSection() {
  const [enhanced, setEnhanced] = useState(false);
  const [selected, setSelected] = useState<EcosystemNodeId>('collection');
  const [focused, setFocused] = useState(false);
  const tabs = useRef<Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>>({});
  const tablistRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<StageState>('off');
  const [tier, setTier] = useState<'high' | 'medium' | null>(null);
  const [insetPx, setInsetPx] = useState(0);
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
        if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1500 });
        else setTimeout(start, 200);
      },
      { rootMargin: '100% 0px 100% 0px' },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, [enhanced]);
  const onStageReady = useCallback(() => setStage((st) => (st === 'wanted' ? 'ready' : st)), []);
  const onStageLost = useCallback(() => setStage('failed'), []);

  // Width the overlaid info card covers on the right of the stage (≥1100px only), so the city
  // can be framed in the remaining area. Measured on layout changes only; state set on change.
  useEffect(() => {
    if (!enhanced) return;
    const card = cardRef.current;
    const panels = panelsRef.current;
    if (!card || !panels) return;
    const mq = window.matchMedia(OVERLAY_MQ);
    const measure = () => {
      let next = 0;
      if (mq.matches) {
        const cr = card.getBoundingClientRect();
        const pr = panels.getBoundingClientRect();
        next = Math.max(0, Math.round(cr.right - pr.left + OVERLAY_GAP));
      }
      setInsetPx((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    ro.observe(panels);
    mq.addEventListener('change', measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', measure);
    };
  }, [enhanced]);

  // Keep the selected pill visible in the horizontally scrolling (mobile) tab row without
  // scrolling the page itself.
  useEffect(() => {
    const list = tablistRef.current;
    const el = tabs.current[selected];
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;
    const left = el.offsetLeft - list.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < list.scrollLeft) list.scrollLeft = left - 16;
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth + 16;
  }, [selected, enhanced]);

  const select = useCallback((id: EcosystemNodeId, focus = false) => {
    setSelected(id);
    setFocused(true);
    if (focus) tabs.current[id]?.focus();
  }, []);
  const onStageSelect = useCallback((id: EcosystemNodeId) => select(id), [select]);

  const returnToOverview = () => {
    setFocused(false);
    tabs.current[selected]?.focus();
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
          <p className="eco__lead">{c.intro}</p>
        </header>

        {enhanced ? (
          <div ref={tablistRef} className="eco__tabs" role="tablist" aria-label={c.railLabel}>
            {MODULES.map(tab)}
            {divider}
            {INTEGRATIONS.map(tab)}
          </div>
        ) : (
          <nav className="eco__tabs eco__tabs--static" aria-label={c.railLabel}>
            <ul>
              {MODULES.map((n) => (
                <li key={n.id}>
                  <a className="eco__pill" data-kind={n.kind} href={`#${panelId(n.id)}`}>
                    {pillContent(n)}
                  </a>
                </li>
              ))}
              <li aria-hidden="true">{divider}</li>
              {INTEGRATIONS.map((n) => (
                <li key={n.id}>
                  <a className="eco__pill" data-kind={n.kind} href={`#${panelId(n.id)}`}>
                    {pillContent(n)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="eco__view" style={{ '--eco-inset': `${insetPx}px` } as CSSProperties}>
          <div ref={cardRef} className="eco__stage-card">
            <div className="eco__slot" data-stage={stage}>
              <EcosystemMap selected={enhanced ? selected : null} onSelect={enhanced ? select : undefined} />
              {tier && (stage === 'wanted' || stage === 'ready') && (
                <StageBoundary onError={onStageLost}>
                  <Suspense fallback={null}>
                    <EcosystemStage
                      quality={tier}
                      selected={selected}
                      focused={focused}
                      insetRight={insetPx}
                      onSelect={onStageSelect}
                      onReady={onStageReady}
                      onLost={onStageLost}
                    />
                  </Suspense>
                </StageBoundary>
              )}
            </div>
            {stage === 'ready' && focused && (
              <button type="button" className="eco__overview-btn" onClick={returnToOverview}>
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
                </svg>
                {s.overviewLabel}
              </button>
            )}
          </div>

          <div ref={panelsRef} className="eco__panels">
            {ORDER.map((id) => {
              const n = ECOSYSTEM_BY_ID[id];
              const hidden = enhanced && id !== selected;
              return (
                <article
                  key={id}
                  id={panelId(id)}
                  className="eco__card"
                  data-kind={n.kind}
                  {...(enhanced
                    ? { role: 'tabpanel', 'aria-labelledby': tabId(id), tabIndex: 0 }
                    : {})}
                  hidden={hidden}
                >
                  <div className="eco__card-head">
                    <p className="eco__card-tag">
                      {n.kind === 'module' ? `${c.moduleTag} ${n.number}` : c.integrationTag}
                      <span className="eco__card-place"> · {n.place}</span>
                    </p>
                    <h3 className="eco__card-title">{n.name}</h3>
                    {n.kind === 'integration' && <p className="eco__card-note">{c.integrationNote}</p>}
                    <p className="eco__card-summary">{n.summary}</p>
                  </div>
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
                    <span className="eco__card-sub">{c.connectsLabel}</span>
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
                </article>
              );
            })}
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
