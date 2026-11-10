import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { siteConfig } from '@/content/config';
import {
  SOFTWARE_DEMOS,
  softwareContent as c,
  type SoftwareDemo,
  type SoftwareDemoId,
  type SoftwareRegion,
} from '@/content/software';
import { Icon, ICONS, MarkerContext } from './parts';
import {
  FleetScreen,
  GrievanceScreen,
  LandfillScreen,
  WeighbridgeScreen,
} from './screens';
import './software.css';

/**
 * M6.2 "IWMS in Action": four static demonstrations of the IWMS application, each an
 * illustrative application frame (one design system) beside a context panel with the 3-step
 * workflow and the interface elements highlighted at the active step.
 *
 * Progressive enhancement (same pattern as Scene 04): the server/no-JS markup lists all four
 * demonstrations one after another with in-page links; after hydration the selectors become a
 * WAI-ARIA tablist (roving tabindex, arrows/Home/End, automatic activation) that switches the one
 * visible demonstration. Stepping through the workflow (Back / Next) arrives in M6.3; the
 * controls are reserved and disabled here, and every demonstration shows its first step.
 */

const ORDER = SOFTWARE_DEMOS.map((d) => d.id);
const SCREENS: Record<SoftwareDemoId, () => ReactNode> = {
  fleet: FleetScreen,
  weighbridge: WeighbridgeScreen,
  grievance: GrievanceScreen,
  landfill: LandfillScreen,
};
/** Rail icons of the illustrative application; the demonstration's own module is active. */
const RAIL: {
  id: SoftwareDemoId | 'home' | 'reports' | 'settings';
  d: string;
}[] = [
  { id: 'home', d: ICONS.grid },
  { id: 'fleet', d: ICONS.truck },
  { id: 'weighbridge', d: ICONS.scale },
  { id: 'landfill', d: ICONS.layers },
  { id: 'grievance', d: ICONS.chat },
  { id: 'reports', d: ICONS.chart },
];
const SELECTOR_ICON: Record<SoftwareDemoId, string> = {
  fleet: ICONS.pin,
  weighbridge: ICONS.scale,
  grievance: ICONS.chat,
  landfill: ICONS.layers,
};

const tabId = (id: SoftwareDemoId) => `software-tab-${id}`;
const panelId = (id: SoftwareDemoId) => `software-${id}`;
const NOTE_ID = 'software-disclosure';
const brochureHref = (page: number) =>
  `${siteConfig.brochurePath}#page=${page}`;

function SelectorBody({ demo }: { demo: SoftwareDemo }) {
  return (
    <>
      <span className="sw-sel__icon">
        <Icon d={SELECTOR_ICON[demo.id]} size={18} />
      </span>
      <span className="sw-sel__text">
        <span className="sw-sel__label">{demo.label}</span>
        <span className="sw-sel__module">{demo.title}</span>
      </span>
    </>
  );
}

/** The illustrative application window: app bar, module navigation, icon rail, canvas. */
function AppFrame({ demo, stage }: { demo: SoftwareDemo; stage: number }) {
  const markers = useMemo(
    () =>
      new Map<SoftwareRegion, number>(
        demo.stages[stage].callouts.map((co, i) => [co.region, i + 1]),
      ),
    [demo, stage],
  );
  const Screen = SCREENS[demo.id];
  return (
    <figure
      className="sw-frame"
      aria-label={`Illustrative IWMS ${demo.title} screen: ${demo.nav.join(', ')}`}
      aria-describedby={NOTE_ID}
    >
      <div className="sw-app__bar">
        <span className="sw-wordmark">
          <span className="sw-wordmark__mark" aria-hidden="true" />
          {c.appName}
        </span>
        <span className="sw-app__sep" aria-hidden="true" />
        <span className="sw-app__module">{demo.title}</span>
        <span className="sw-app__tools" aria-hidden="true">
          <Icon d={ICONS.search} size={15} />
          <Icon d={ICONS.bell} size={15} />
          <span className="sw-avatar">
            <Icon d={ICONS.user} size={13} />
          </span>
        </span>
      </div>
      <ul className="sw-app__nav">
        {demo.nav.map((n, i) => (
          <li key={n} data-active={i === 0 ? 'true' : undefined}>
            {n}
          </li>
        ))}
      </ul>
      <div className="sw-app__main">
        <span className="sw-app__rail" aria-hidden="true">
          {RAIL.map((r) => (
            <span
              key={r.id}
              data-active={r.id === demo.id ? 'true' : undefined}
            >
              <Icon d={r.d} size={16} />
            </span>
          ))}
          <span className="sw-app__rail-end">
            <Icon d={ICONS.settings} size={16} />
          </span>
        </span>
        <div className="sw-canvas">
          <MarkerContext.Provider value={markers}>
            <Screen />
          </MarkerContext.Provider>
        </div>
      </div>
    </figure>
  );
}

/** Context panel: title, summary, workflow steps, highlighted elements, source, controls. */
function ContextPanel({ demo, stage }: { demo: SoftwareDemo; stage: number }) {
  const active = demo.stages[stage];
  const headingId = `software-${demo.id}-title`;
  return (
    <div className="sw-ctx">
      <p className="sw-ctx__module">{demo.title}</p>
      <h3 id={headingId} className="sw-ctx__title">
        {demo.label}
      </h3>
      <p className="sw-ctx__summary">{demo.summary}</p>

      <ol className="sw-steps" aria-label={c.stepsLabel}>
        {demo.stages.map((s, i) => (
          <li
            key={s.id}
            className="sw-step"
            data-state={
              i === stage ? 'active' : i < stage ? 'done' : 'upcoming'
            }
            aria-current={i === stage ? 'step' : undefined}
          >
            <span className="sw-step__n" aria-hidden="true">
              {i + 1}
            </span>
            <span className="sw-step__body">
              <span className="sw-step__kicker">{c.stepLabel(i + 1)}</span>
              <span className="sw-step__title">{s.title}</span>
              <span className="sw-step__caption">{s.caption}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="sw-callouts">
        <p className="sw-callouts__head" id={`software-${demo.id}-callouts`}>
          {c.stepLabel(stage + 1)} · {active.title}
        </p>
        <ol
          className="sw-callouts__list"
          aria-labelledby={`software-${demo.id}-callouts`}
        >
          {active.callouts.map((co, i) => (
            <li
              key={co.region}
              className="sw-callout"
              data-region-ref={co.region}
            >
              <span className="sw-callout__n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="sw-callout__body">
                <span className="sw-callout__label">{co.label}</span>
                <span className="sw-callout__text">{co.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="sw-ctx__foot">
        <a className="sw-source" href={brochureHref(demo.page)}>
          <Icon d={ICONS.doc} size={14} />
          {c.sourceLabel(demo.page)}
        </a>
        <div className="sw-controls">
          <button
            type="button"
            className="sw-ctl"
            disabled
            aria-disabled="true"
          >
            <Icon d="M10 3.5 5.5 8l4.5 4.5" size={14} />
            {c.back}
          </button>
          <button
            type="button"
            className="sw-ctl"
            disabled
            aria-disabled="true"
          >
            {c.next}
            <Icon d="M6 3.5 10.5 8 6 12.5" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SoftwareSection() {
  const [enhanced, setEnhanced] = useState(false);
  const [selected, setSelected] = useState<SoftwareDemoId>(ORDER[0]);
  const tabs = useRef<
    Partial<Record<SoftwareDemoId, HTMLButtonElement | null>>
  >({});
  useEffect(() => setEnhanced(true), []);

  const select = (id: SoftwareDemoId, focus = false) => {
    setSelected(id);
    if (focus) tabs.current[id]?.focus();
  };

  // WAI-ARIA tabs with automatic activation; arrows work on both axes (the 2×2 grid on phones).
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

  return (
    <section
      id="software"
      className="sw"
      data-enhanced={enhanced ? 'true' : 'false'}
      aria-labelledby="software-title"
    >
      <div className="sw__inner">
        <header className="sw__head">
          <p className="sw__eyebrow">{c.eyebrow}</p>
          <h2 id="software-title" className="sw__title">
            {c.title}
          </h2>
          <p className="sw__lead">{c.lead}</p>
          <p className="sw__badge">
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
            {c.disclosure}
          </p>
        </header>

        {enhanced ? (
          <div className="sw-sels" role="tablist" aria-label={c.selectorLabel}>
            {SOFTWARE_DEMOS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                id={tabId(d.id)}
                ref={(el) => void (tabs.current[d.id] = el)}
                className="sw-sel"
                aria-selected={d.id === selected}
                aria-controls={panelId(d.id)}
                tabIndex={d.id === selected ? 0 : -1}
                onClick={() => select(d.id)}
                onKeyDown={onKeyDown}
              >
                <SelectorBody demo={d} />
              </button>
            ))}
          </div>
        ) : (
          <nav className="sw-sels sw-sels--static" aria-label={c.selectorLabel}>
            <ul>
              {SOFTWARE_DEMOS.map((d) => (
                <li key={d.id}>
                  <a className="sw-sel" href={`#${panelId(d.id)}`}>
                    <SelectorBody demo={d} />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="sw-demos">
          {SOFTWARE_DEMOS.map((d) => (
            <article
              key={d.id}
              id={panelId(d.id)}
              className="sw-demo"
              data-demo={d.id}
              {...(enhanced
                ? { role: 'tabpanel', 'aria-labelledby': tabId(d.id) }
                : { 'aria-labelledby': `software-${d.id}-title` })}
              hidden={enhanced && d.id !== selected}
            >
              <AppFrame demo={d} stage={0} />
              <ContextPanel demo={d} stage={0} />
            </article>
          ))}
        </div>

        <p id={NOTE_ID} className="sw__note">
          {c.disclosureLong}
        </p>
      </div>
    </section>
  );
}
