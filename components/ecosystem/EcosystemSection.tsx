import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
  useEffect(() => setEnhanced(true), []);

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
          <EcosystemMap selected={enhanced ? selected : null} onSelect={enhanced ? select : undefined} />
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
                  <p className="eco__panel-tag">
                    {n.kind === 'module' ? `${c.moduleTag} ${n.number}` : c.integrationTag}
                    <span className="eco__panel-place"> · {n.place}</span>
                  </p>
                  <h3 className="eco__panel-title">{n.name}</h3>
                  {n.kind === 'integration' && <p className="eco__panel-note">{c.integrationNote}</p>}
                  <p className="eco__panel-summary">{n.summary}</p>
                  <h4 className="eco__panel-sub">{c.capabilitiesLabel}</h4>
                  <ul className="eco__panel-list">
                    {n.capabilities.map((cap) => (
                      <li key={cap}>{cap}</li>
                    ))}
                  </ul>
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
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
