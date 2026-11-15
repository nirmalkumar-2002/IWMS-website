import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
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
import {
  CITY_OVERLAY_ATTR,
  EcosystemCity,
  type PopupPlacement,
  type PopupSize,
} from './EcosystemCity';
import './ecosystem.css';

const MODULES = ECOSYSTEM_NODES.filter((n) => n.kind === 'module');
const INTEGRATIONS = ECOSYSTEM_NODES.filter((n) => n.kind === 'integration');
/** Tab order: the seven modules, then the integration hub. */
const ORDER = [...MODULES, ...INTEGRATIONS].map((n) => n.id);
/** Highlights shown in the compact summary (the full list lives in the details). */
const HIGHLIGHTS = 2;
/** The popup floats on the city from this width up (phones keep the summary below the city). */
const WIDE_QUERY = '(min-width: 768px)';
/** Exit fade of the popup (matches ecosystem.css). */
const POPUP_EXIT_MS = 200;
/** The one floating popup (owned by the selected tabpanel via aria-owns). */
const POPUP_ID = 'eco-popup';

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
 * Scene 04: the IWMS ecosystem after the cinematic hero — centred header, module pills, one
 * static city view (a pre-rendered image; no WebGL, camera or animation loop), capability cards.
 * Every block shares the same content width. Progressive disclosure: the overview shows the
 * whole city with small numbered pins and a hint; selecting a module highlights its zone and
 * shows a compact summary (one popup floating beside the zone ≥768px, below the city on phones);
 * "View details" expands the complete module information below the city in normal flow.
 * Progressive enhancement: the server/no-JS markup is the city image plus a readable list of
 * every module, fully expanded, with in-page links; after hydration it becomes an accessible tab
 * interface (the pills are the WAI-ARIA tabs; the pins are aria-hidden pointer shortcuts).
 */
export default function EcosystemSection() {
  const [enhanced, setEnhanced] = useState(false);
  const [selected, setSelected] = useState<EcosystemNodeId>('collection');
  const [focused, setFocused] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  /** Pill hovered or keyboard-focused: previews that zone's label on the city. */
  const [peek, setPeek] = useState<EcosystemNodeId | null>(null);
  const tabs = useRef<
    Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>
  >({});
  const detailBtns = useRef<
    Partial<Record<EcosystemNodeId, HTMLButtonElement | null>>
  >({});
  const tablistRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  // Floating popup. `wide`: the viewport floats it (>=768px). `popupSize`: measured size of the
  // selected module's popup (from a hidden twin, so it is known before the popup opens).
  // `placement`: the city's last placement; `placed`: whether it is current. `dismissed`: closed
  // with × / Escape (selection kept). `closing`: exit fade. `movable`: the popup has been shown
  // for a frame, so later placement changes (another module, a resize) glide.
  const [wide, setWide] = useState(false);
  const [popupSize, setPopupSize] = useState<PopupSize | null>(null);
  const [placement, setPlacement] = useState<PopupPlacement | null>(null);
  const [placed, setPlaced] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [movable, setMovable] = useState(false);
  const closeTimer = useRef(0);
  useEffect(() => setEnhanced(true), []);

  useEffect(() => {
    if (!enhanced) return;
    const mq = window.matchMedia(WIDE_QUERY);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [enhanced]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Popup size from its hidden twin (same layout as the popup). Integer px; state changes only
  // on a real change. Phones never float the popup (null).
  const measuring = enhanced && wide;
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!measuring || !el) {
      setPopupSize((prev) => (prev === null ? prev : null));
      return;
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.ceil(r.width);
      const h = Math.ceil(r.height);
      setPopupSize((prev) =>
        prev && prev.w === w && prev.h === h ? prev : w && h ? { w, h } : null,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measuring, selected]);

  const onPopupPlace = useCallback((p: PopupPlacement | null) => {
    setPlaced(p !== null);
    if (!p) return;
    setPlacement((prev) =>
      prev && prev.x === p.x && prev.y === p.y && prev.side === p.side
        ? prev
        : { x: p.x, y: p.y, side: p.side },
    );
  }, []);

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

  /** Any selection (pill, pin, Connected-to) highlights the zone and (re)opens the popup. */
  const select = useCallback((id: EcosystemNodeId, focus = false) => {
    setSelected(id);
    setFocused(true);
    setDismissed(false);
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    if (focus) tabs.current[id]?.focus();
  }, []);

  /** The popup should float: >=768px, a selected module, not dismissed. */
  const wantPopup = enhanced && wide && focused && !dismissed;
  /** The selected summary is rendered as the floating popup (shown, or fading out). */
  const float = (wantPopup && placed && placement !== null) || closing;
  const popupShown = float && !closing;

  // A newly shown popup appears in place; only later placement changes glide.
  useEffect(() => {
    if (!popupShown) {
      setMovable(false);
      return;
    }
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setMovable(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [popupShown]);

  /** Fade the popup out (if shown) before the summary returns to the flow below the city. */
  const fadePopup = () => {
    if (!popupShown) return;
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    closeTimer.current = window.setTimeout(
      () => setClosing(false),
      reduce ? 0 : POPUP_EXIT_MS,
    );
  };
  /** × / Escape: dismiss the popup, keep the selection and its highlight. */
  const closePopup = () => {
    fadePopup();
    setDismissed(true);
    tabs.current[selected]?.focus();
  };
  const returnToOverview = () => {
    fadePopup();
    setFocused(false);
    tabs.current[selected]?.focus();
  };

  // Escape closes the (non-modal) popup while focus is in it or on the module pills.
  const closePopupRef = useRef(closePopup);
  useEffect(() => {
    closePopupRef.current = closePopup;
  });
  const popupOpenRef = useRef(false);
  useEffect(() => {
    popupOpenRef.current = popupShown;
  });
  useEffect(() => {
    const view = viewRef.current;
    const list = tablistRef.current;
    if (!enhanced || !view || !list) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || !popupOpenRef.current) return;
      const target = e.target as Element | null;
      if (!target?.closest(`#${POPUP_ID}, [role="tablist"]`)) return;
      e.preventDefault();
      closePopupRef.current();
    };
    view.addEventListener('keydown', onKey);
    list.addEventListener('keydown', onKey);
    return () => {
      view.removeEventListener('keydown', onKey);
      list.removeEventListener('keydown', onKey);
    };
  }, [enhanced]);

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
      onMouseEnter={() => setPeek(n.id)}
      onMouseLeave={() => setPeek((p) => (p === n.id ? null : p))}
      onFocus={(e) => {
        if (e.currentTarget.matches(':focus-visible')) setPeek(n.id);
      }}
      onBlur={() => setPeek((p) => (p === n.id ? null : p))}
    >
      {pillContent(n)}
    </button>
  );
  const divider = (
    <span className="eco__tabs-divider" aria-hidden="true">
      {c.integrationTag}
    </span>
  );

  /** Compact summary content (tag, title, ICCC note, summary, highlights, View details).
   *  `twin`: the inert, hidden copy used only to measure the popup's size. */
  const summaryBody = (n: EcosystemNode, twin = false) => (
    <>
      <div className="eco__summary-main">
        <p className="eco__card-tag">
          {n.kind === 'module'
            ? `${c.moduleTag} ${n.number}`
            : c.integrationTag}
          <span className="eco__card-place"> · {n.place}</span>
        </p>
        {twin ? (
          <p className="eco__card-title">{n.name}</p>
        ) : (
          <h3 className="eco__card-title">{n.name}</h3>
        )}
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
            {twin ? (
              <span className="eco__twin-btn">
                {s.detailsLabel}
                <Glyph d={ICON_CHEVRON} />
              </span>
            ) : (
              <button
                type="button"
                ref={(el) => void (detailBtns.current[n.id] = el)}
                className="eco__details-btn"
                aria-expanded={detailsOpen}
                aria-controls={detailsId(n.id)}
                onClick={toggleDetails}
              >
                {s.detailsLabel}
                <Glyph d={ICON_CHEVRON} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );

  const card = (n: EcosystemNode) => {
    const id = n.id;
    const isSel = id === selected;
    const hidden = enhanced && !isSel;
    const showDetails = !enhanced || detailsOpen;
    // While the popup floats, the selected panel's summary is the popup (aria-owns).
    const owned = isSel && float;
    return (
      <article
        key={id}
        id={panelId(id)}
        className="eco__card"
        data-kind={n.kind}
        {...(enhanced
          ? {
              role: 'tabpanel',
              'aria-labelledby': tabId(id),
              ...(owned ? { 'aria-owns': POPUP_ID } : {}),
            }
          : {})}
        hidden={hidden}
      >
        {!owned && <div className="eco__summary">{summaryBody(n)}</div>}

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

  const node = ECOSYSTEM_BY_ID[selected];
  const overlay = { [CITY_OVERLAY_ATTR]: '' };

  return (
    <section
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
          data-float={float ? 'true' : 'false'}
          data-details={enhanced && detailsOpen ? 'open' : 'closed'}
        >
          <EcosystemCity
            enhanced={enhanced}
            selected={selected}
            focused={focused}
            peek={peek}
            popupSize={wantPopup ? popupSize : null}
            onSelect={select}
            onPopupPlace={onPopupPlace}
            alt={s.cityAlt}
          >
            {enhanced && !focused && (
              <p className="eco__hint" {...overlay}>
                <Glyph d={ICON_TAP} size={13} />
                {s.hint}
              </p>
            )}
            {enhanced && focused && (
              <button
                type="button"
                className="eco__overview-btn"
                onClick={returnToOverview}
                {...overlay}
              >
                <Glyph d={ICON_OVERVIEW} />
                {s.overviewLabel}
              </button>
            )}
          </EcosystemCity>

          {/* The one floating popup: the selected module's summary beside its zone. A single
              element across modules, so switching glides it to the new placement. */}
          {float && placement && (
            <div
              id={POPUP_ID}
              className="eco__summary eco__popup"
              data-kind={node.kind}
              data-eco-popup={closing ? 'closing' : 'open'}
              data-side={placement.side}
              data-move={movable ? 'on' : 'off'}
              style={{
                transform: `translate(${placement.x}px, ${placement.y}px)`,
              }}
            >
              {summaryBody(node)}
              <button
                type="button"
                className="eco__popup-close"
                aria-label={s.closePopupLabel(node.label)}
                onClick={closePopup}
              >
                <Glyph d={ICON_CLOSE} />
              </button>
            </div>
          )}

          <div className="eco__panels">
            {ORDER.map((id) => card(ECOSYSTEM_BY_ID[id]))}
          </div>

          {measuring && (
            <div
              ref={measureRef}
              className="eco__popup-twin"
              data-kind={node.kind}
              aria-hidden="true"
              inert
            >
              {summaryBody(node, true)}
            </div>
          )}
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
