import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from '@/lib/animations/useReducedMotion';
import { dashboardContent, type DashboardPanelKey } from '@/content/dashboard';

/** Illustrative ICCC console. Hand-built HTML/SVG; every figure is demo data from content/dashboard.ts. */

/** Typed CSS custom properties for inline styles. */
const cssVars = (vars: Record<`--${string}`, number>) => vars as CSSProperties;

const ROUTE_A = 'M24 214 H128 V150 H224 V70 H330 V150 H384';
const ROUTE_B = 'M40 44 H160 V104 H296 V214 H372';
const STATIC_VEHICLES = [
  { x: 128, y: 182, route: 'a' },
  { x: 277, y: 70, route: 'a' },
  { x: 228, y: 104, route: 'b' },
] as const;

type ConsoleProps = {
  active: DashboardPanelKey | null;
  panelId: (key: DashboardPanelKey) => string;
};

export function Console({ active, panelId }: ConsoleProps) {
  const c = dashboardContent.console;
  const reduced = useReducedMotion();
  const figureRef = useRef<HTMLElement>(null);
  const mapRef = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const routeAId = `${uid}-route-a`;
  const routeBId = `${uid}-route-b`;

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure || reduced) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        const map = mapRef.current;
        if (!map) return;
        if (entry.isIntersecting) map.unpauseAnimations();
        else map.pauseAnimations();
      },
      { threshold: 0.15 },
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, [reduced]);

  const { attendance } = c;
  const cells = Array.from({ length: attendance.total }, (_, index) => {
    if (index < attendance.present - attendance.late) return 'present';
    if (index < attendance.present) return 'late';
    return 'absent';
  });

  const panel = (key: DashboardPanelKey) => ({
    id: panelId(key),
    'data-panel': key,
    'data-active': active === key ? 'true' : undefined,
    className: `dashboard-panel dashboard-panel-${key}`,
  });

  return (
    <figure
      ref={figureRef}
      className="dashboard-console"
      data-focus={active ?? 'none'}
      data-inview={inView ? 'true' : 'false'}
      aria-label={c.ariaLabel}
    >
      <div className="dashboard-screen">
        <div className="dashboard-bar">
          <span className="dashboard-bar-product">{c.product}</span>
          <span className="dashboard-bar-view">{c.view}</span>
          <span className="dashboard-bar-ward">{c.ward}</span>
          <span className="dashboard-bar-clock">
            <span className="dashboard-live" aria-hidden="true" />
            {c.clock}
          </span>
          <span className="dashboard-bar-tag">{c.illustrative}</span>
        </div>

        <div className="dashboard-grid">
          {/* Fleet map */}
          <div {...panel('fleet')}>
            <div className="dashboard-panel-head">
              <span className="dashboard-panel-title">{c.fleet.title}</span>
              <dl className="dashboard-inline-stats">
                {c.fleet.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <svg
              ref={mapRef}
              className="dashboard-map"
              viewBox="0 0 400 260"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
              focusable="false"
            >
              <g className="dashboard-map-blocks">
                <rect x="12" y="12" width="132" height="22" />
                <rect x="176" y="12" width="210" height="44" />
                <rect x="12" y="58" width="132" height="76" />
                <rect x="176" y="118" width="104" height="80" />
                <rect x="12" y="166" width="100" height="36" />
                <rect x="144" y="166" width="20" height="80" />
                <rect x="312" y="166" width="76" height="34" />
                <rect x="240" y="226" width="148" height="22" />
              </g>
              <g className="dashboard-map-streets">
                <path d="M0 44 H400 M0 104 H400 M0 150 H400 M0 214 H400 M40 0 V260 M128 0 V260 M160 0 V260 M224 0 V260 M296 0 V260 M330 0 V260" />
              </g>
              <path
                className="dashboard-map-fence"
                d="M16 30 H350 V236 H16 Z"
              />
              <path id={routeAId} className="dashboard-map-route" d={ROUTE_A} />
              <path
                id={routeBId}
                className="dashboard-map-route dashboard-map-route-b"
                d={ROUTE_B}
              />
              {reduced
                ? STATIC_VEHICLES.map((vehicle) => (
                    <circle
                      key={`${vehicle.x}-${vehicle.y}`}
                      className="dashboard-map-vehicle"
                      cx={vehicle.x}
                      cy={vehicle.y}
                      r="5"
                    />
                  ))
                : [
                    { href: routeAId, begin: '0s', dur: '18s' },
                    { href: routeAId, begin: '-9s', dur: '18s' },
                    { href: routeBId, begin: '-4s', dur: '22s' },
                  ].map((vehicle) => (
                    <circle
                      key={`${vehicle.href}-${vehicle.begin}`}
                      className="dashboard-map-vehicle"
                      r="5"
                    >
                      <animateMotion
                        dur={vehicle.dur}
                        begin={vehicle.begin}
                        repeatCount="indefinite"
                      >
                        <mpath href={`#${vehicle.href}`} />
                      </animateMotion>
                    </circle>
                  ))}
              <g className="dashboard-map-alert">
                <circle
                  className="dashboard-map-alert-ring"
                  cx="372"
                  cy="246"
                  r="12"
                />
                <circle cx="372" cy="246" r="5" />
              </g>
            </svg>
            <div className="dashboard-map-foot">
              <ul className="dashboard-legend">
                <li>
                  <span className="dashboard-key dashboard-key-route" />
                  {c.fleet.legend.route}
                </li>
                <li>
                  <span className="dashboard-key dashboard-key-fence" />
                  {c.fleet.legend.geofence}
                </li>
                <li>
                  <span className="dashboard-key dashboard-key-vehicle" />
                  {c.fleet.legend.vehicle}
                </li>
              </ul>
              <p className="dashboard-alert-line">{c.fleet.alert}</p>
            </div>
          </div>

          {/* Collection ring */}
          <div {...panel('collection')}>
            <span className="dashboard-panel-title">{c.collection.title}</span>
            <div className="dashboard-ring-row">
              <svg
                className="dashboard-ring"
                viewBox="0 0 80 80"
                aria-hidden="true"
                focusable="false"
              >
                <circle
                  className="dashboard-ring-track"
                  cx="40"
                  cy="40"
                  r="34"
                  pathLength={100}
                />
                <circle
                  className="dashboard-ring-value"
                  cx="40"
                  cy="40"
                  r="34"
                  pathLength={100}
                  strokeDasharray={`${c.collection.ratio * 100} 100`}
                  style={cssVars({ '--dash': c.collection.ratio * 100 })}
                />
              </svg>
              <p className="dashboard-big">
                {c.collection.value}
                <span>{c.collection.caption}</span>
              </p>
            </div>
            <dl className="dashboard-list">
              {c.collection.exceptions.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Weighbridge reconciliation */}
          <div {...panel('weighbridge')}>
            <span className="dashboard-panel-title">{c.weighbridge.title}</span>
            <dl className="dashboard-bars">
              <div>
                <dt>{c.weighbridge.perStop.label}</dt>
                <dd>{c.weighbridge.perStop.value}</dd>
                <span
                  className="dashboard-bar-fill"
                  style={cssVars({ '--ratio': c.weighbridge.perStopRatio })}
                  aria-hidden="true"
                />
              </div>
              <div>
                <dt>{c.weighbridge.gross.label}</dt>
                <dd>{c.weighbridge.gross.value}</dd>
                <span
                  className="dashboard-bar-fill dashboard-bar-fill-gross"
                  style={cssVars({ '--ratio': 1 })}
                  aria-hidden="true"
                />
              </div>
            </dl>
            <p className="dashboard-toast">
              <strong>{c.weighbridge.alert}</strong>
              <span>{c.weighbridge.alertBody}</span>
            </p>
          </div>

          {/* Attendance unit chart */}
          <div {...panel('attendance')}>
            <span className="dashboard-panel-title">{c.attendance.title}</span>
            <p className="dashboard-big dashboard-big-sm">
              {c.attendance.value}
            </p>
            <ul className="dashboard-cells" aria-hidden="true">
              {cells.map((state, index) => (
                <li key={index} data-state={state} />
              ))}
            </ul>
            <dl className="dashboard-list">
              {c.attendance.exceptions.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Grievances */}
          <div {...panel('grievance')}>
            <span className="dashboard-panel-title">{c.grievance.title}</span>
            <dl className="dashboard-inline-stats dashboard-inline-stats-lg">
              {c.grievance.stats.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
            <dl className="dashboard-bars">
              <div>
                <dt>{c.grievance.target.label}</dt>
                <dd>{c.grievance.target.value}</dd>
                <span
                  className="dashboard-bar-fill"
                  style={cssVars({ '--ratio': c.grievance.ratio })}
                  aria-hidden="true"
                />
              </div>
            </dl>
          </div>

          {/* Landfill gauge */}
          <div {...panel('landfill')}>
            <span className="dashboard-panel-title">{c.landfill.title}</span>
            <svg
              className="dashboard-gauge"
              viewBox="0 0 120 66"
              aria-hidden="true"
              focusable="false"
            >
              <path
                className="dashboard-gauge-track"
                d="M10 60 A50 50 0 0 1 110 60"
                pathLength={100}
              />
              <path
                className="dashboard-gauge-value"
                d="M10 60 A50 50 0 0 1 110 60"
                pathLength={100}
                strokeDasharray={`${c.landfill.ratio * 100} 100`}
                style={cssVars({ '--dash': c.landfill.ratio * 100 })}
              />
            </svg>
            <dl className="dashboard-list">
              <div>
                <dt>{c.landfill.utilised.label}</dt>
                <dd>{c.landfill.utilised.value}</dd>
              </div>
              <div>
                <dt>{c.landfill.balance.label}</dt>
                <dd>{c.landfill.balance.value}</dd>
              </div>
            </dl>
            <p className="dashboard-ok-line">{c.landfill.hotspot}</p>
          </div>
        </div>
      </div>
      <figcaption className="dashboard-caption">{c.caption}</figcaption>
    </figure>
  );
}
