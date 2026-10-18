import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
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
  type EcosystemNode,
  type EcosystemNodeId,
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
type Anchors = Record<EcosystemNodeId, { x: number; y: number }>;

const MODULES = ECOSYSTEM_NODES.filter((n) => n.kind === 'module');
const INTEGRATIONS = ECOSYSTEM_NODES.filter((n) => n.kind === 'integration');
/** Tab order: the seven modules, then the integration hub. */
const ORDER = [...MODULES, ...INTEGRATIONS].map((n) => n.id);

const tabId = (id: EcosystemNodeId) => `eco-tab-${id}`;
const panelId = (id: EcosystemNodeId) => `eco-${id}`;
const brochureHref = (page: number) => `${siteConfig.brochurePath}#page=${page}`;

/**
 * Scene 04 (M2): the IWMS ecosystem as a lightweight HTML/CSS interface after the cinematic hero.
 * Progressive enhancement: the server/no-JS markup is a readable list of every module (with
 * in-page links); after hydration it becomes an accessible tab interface showing one panel at a
 * time. No canvas, no animation loop — the schematic map holds the slot for the M3 3D city.
 */
export default function EcosystemSection() {
  const [enhanced, setEnhanced] = useState(false);
  const [selected, setSelected] = useState<EcosystemNodeId>('collection');
  const tabs = useRef<Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>>({});
  const sectionRef = useRef<HTMLElement>(null);
  const [stage, setStage] = useState<StageState>('off');
  const [tier, setTier] = useState<'high' | 'medium' | null>(null);
  const [anchors, setAnchors] = useState<Anchors | null>(null);
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
        const start = () => setStage((s) => (s === 'off' ? 'wanted' : s));
        if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1500 });
        else setTimeout(start, 200);
      },
      { rootMargin: '100% 0px 100% 0px' },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, [enhanced]);
  const onStageReady = useCallback(() => setStage((s) => (s === 'wanted' ? 'ready' : s)), []);
  const onStageLost = useCallback(() => setStage('failed'), []);

  const select = (id: EcosystemNodeId, focus = false) => {
    setSelected(id);
    if (focus) tabs.current[id]?.focus();
  };

  // WAI-ARIA tabs with automatic activation; arrows work on both axes (rail is vertical on
  // desktop, horizontal on small screens).
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
  const tab = (n: EcosystemNode) => (
    <button
      key={n.id}
      type="button"
      role="tab"
      id={tabId(n.id)}
      ref={(el) => void (tabs.current[n.id] = el)}
      className="eco__chip"
      data-kind={n.kind}
      aria-selected={n.id === selected}
      aria-controls={panelId(n.id)}
      tabIndex={n.id === selected ? 0 : -1}
      onClick={() => select(n.id)}
      onKeyDown={onKeyDown}
    >
      {n.number && <span className="eco__chip-n">{n.number}</span>}
      <span className="eco__chip-label">{n.label}</span>
    </button>
  );

  return (
    <section
      ref={sectionRef}
      id="ecosystem"
      className="eco"
      data-enhanced={enhanced ? 'true' : 'false'}
      aria-labelledby="eco-title"
    >
      <div className="eco__stage">
        <div className="eco__intro">
          <p className="eco__eyebrow">{c.eyebrow}</p>
          <h2 id="eco-title" className="eco__title">
            {c.title}
          </h2>
          <p className="eco__lead">{c.intro}</p>

          {enhanced ? (
            <div className="eco__rail" role="tablist" aria-label={c.railLabel}>
              {MODULES.map(tab)}
              <span className="eco__rail-divider" aria-hidden="true">
                {c.integrationTag}
              </span>
              {INTEGRATIONS.map(tab)}
            </div>
          ) : (
            <nav className="eco__rail eco__rail--static" aria-label={c.railLabel}>
              <ul>
                {[...MODULES, ...INTEGRATIONS].map((n) => (
                  <li key={n.id}>
                    <a className="eco__chip" data-kind={n.kind} href={`#${panelId(n.id)}`}>
                      {n.number && <span className="eco__chip-n">{n.number}</span>}
                      <span className="eco__chip-label">{n.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

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

        <div className="eco__view">
          <div className="eco__slot" data-stage={stage}>
            <EcosystemMap selected={enhanced ? selected : null} onSelect={enhanced ? select : undefined} />
            {tier && (stage === 'wanted' || stage === 'ready') && (
              <StageBoundary onError={onStageLost}>
                <Suspense fallback={null}>
                  <EcosystemStage
                    quality={tier}
                    selected={selected}
                    onReady={onStageReady}
                    onLost={onStageLost}
                    onAnchors={setAnchors}
                  />
                </Suspense>
              </StageBoundary>
            )}
            {stage === 'ready' && anchors && (
              <div className="eco__labels" aria-hidden="true">
                {ECOSYSTEM_NODES.map((n) => {
                  const a = anchors[n.id];
                  const state =
                    n.id === selected
                      ? 'selected'
                      : ECOSYSTEM_BY_ID[selected].connects.includes(n.id)
                        ? 'linked'
                        : 'idle';
                  return (
                    // Mouse convenience only (out of the tab order, hidden from AT): the tabs are
                    // the accessible control. Lets a click on the city select its zone.
                    <button
                      key={n.id}
                      type="button"
                      tabIndex={-1}
                      className="eco__label"
                      data-kind={n.kind}
                      data-state={state}
                      style={{ transform: `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px)` }}
                      onClick={() => select(n.id)}
                    >
                      {n.number ? `${n.number} · ${n.label}` : n.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="eco__panels">
            {ORDER.map((id) => {
              const n = ECOSYSTEM_BY_ID[id];
              const hidden = enhanced && id !== selected;
              return (
                <article
                  key={id}
                  id={panelId(id)}
                  className="eco__panel"
                  data-kind={n.kind}
                  {...(enhanced
                    ? { role: 'tabpanel', 'aria-labelledby': tabId(id), tabIndex: 0 }
                    : {})}
                  hidden={hidden}
                >
                  <div className="eco__panel-head">
                    <p className="eco__panel-tag">
                      {n.kind === 'module' ? `${c.moduleTag} ${n.number}` : c.integrationTag}
                      <span className="eco__panel-place"> · {n.place}</span>
                    </p>
                    <h3 className="eco__panel-title">{n.name}</h3>
                    {n.kind === 'integration' && <p className="eco__panel-note">{c.integrationNote}</p>}
                    <p className="eco__panel-summary">{n.summary}</p>
                  </div>
                  <div className="eco__panel-body">
                    <h4 className="eco__panel-sub">{c.capabilitiesLabel}</h4>
                    <ul className="eco__panel-list">
                      {n.capabilities.map((cap) => (
                        <li key={cap}>{cap}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="eco__panel-side">
                    <p className="eco__panel-benefit">{n.benefit}</p>
                    <div className="eco__panel-foot">
                      <span className="eco__panel-sub">{c.connectsLabel}</span>
                      <ul className="eco__panel-links">
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
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
