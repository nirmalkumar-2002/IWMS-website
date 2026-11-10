import { softwareContent as c } from '@/content/software';
import { Empty, Icon, ICONS, Panel, Region, Skel, Stars } from './parts';

/**
 * The four illustrative screen compositions. Each renders every region its demonstration's
 * callouts point at (`data-region`), using verified field terminology, skeleton bars, empty
 * states and chart axes only — no values, names, identifiers, timestamps or live data.
 */

/* ---------- Fleet & route monitoring (brochure p.8) ---------- */

/** Schematic street map: muted grid, a dashed geo-fence, a planned route, neutral vehicles. */
function FleetMap() {
  const xs = [40, 100, 180, 240, 300, 360, 420, 480, 560, 610];
  const ys = [30, 100, 150, 200, 260, 320, 370];
  return (
    <svg
      className="sw-map__svg"
      viewBox="0 0 640 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="640" height="400" className="sw-map__ground" />
      <path
        className="sw-map__park"
        d="M488 230h112v120H508a20 20 0 0 1-20-20z"
      />
      <path
        className="sw-map__water"
        d="M0 352c80-14 150 6 230-6s170-30 250-12 120 14 160 6v60H0z"
      />
      <g className="sw-map__streets">
        {xs.map((x) => (
          <line key={`x${x}`} x1={x} y1="0" x2={x} y2="400" />
        ))}
        {ys.map((y) => (
          <line key={`y${y}`} x1="0" y1={y} x2="640" y2={y} />
        ))}
      </g>
      <g className="sw-map__arterials">
        <line x1="0" y1="200" x2="640" y2="200" />
        <line x1="300" y1="0" x2="300" y2="400" />
        <line x1="40" y1="380" x2="620" y2="20" />
      </g>
      <polygon
        className="sw-map__fence"
        points="132,62 446,46 516,184 438,322 168,330 104,196"
      />
      <polyline
        className="sw-map__route"
        points="180,300 180,200 300,200 300,100 420,100"
      />
      <circle className="sw-map__stop" cx="180" cy="300" r="5" />
      <circle className="sw-map__stop" cx="420" cy="100" r="5" />
      {[
        [180, 248, 0],
        [300, 150, 0],
        [360, 260, 90],
        [552, 112, 180],
      ].map(([x, y, r]) => (
        <g
          key={`${x}-${y}`}
          className="sw-map__vehicle"
          transform={`translate(${x} ${y}) rotate(${r})`}
        >
          <circle r="9" />
          <path d="M0 -4.5 3.5 3.5 0 1.8 -3.5 3.5z" />
        </g>
      ))}
    </svg>
  );
}

export function FleetScreen() {
  return (
    <div className="sw-screen sw-fleet">
      <div className="sw-fleet__top">
        <Region name="map" className="sw-map">
          <FleetMap />
          <span className="sw-map__zoom" aria-hidden="true">
            <Icon d={ICONS.plus} size={14} />
            <Icon d={ICONS.minus} size={14} />
          </span>
          <Region
            name="geofence"
            className="sw-chip sw-map__tag sw-map__tag--fence"
          >
            <span className="sw-swatch sw-swatch--fence" aria-hidden="true" />
            Geo-fence
          </Region>
          <Region
            name="route"
            className="sw-chip sw-map__tag sw-map__tag--route"
          >
            <span className="sw-swatch sw-swatch--route" aria-hidden="true" />
            Planned route
          </Region>
        </Region>
        <div className="sw-fleet__side">
          <Panel
            title="Fleet"
            region="vehicles"
            aside={<Icon d={ICONS.search} size={14} />}
          >
            <div className="sw-list">
              <div className="sw-list__head">Vehicle</div>
              {['62%', '48%', '70%', '54%'].map((w, i) => (
                <div className="sw-list__row" key={w + i}>
                  <span className="sw-dot" aria-hidden="true" />
                  <Skel w={w} />
                  <Skel w="22%" tone="soft" />
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Deviation alerts"
            region="alerts"
            className="sw-fleet__alerts"
          >
            <div className="sw-emptystate">
              <Icon d={ICONS.bell} size={18} />
              <span>Deviation alerts appear here</span>
            </div>
          </Panel>
        </div>
      </div>
      <div className="sw-fleet__bottom">
        <Panel title="Ring fencing" region="verification">
          <div className="sw-cam">
            <span className="sw-cam__corners" aria-hidden="true" />
            <Icon d={ICONS.camera} size={20} />
            <span>Vehicle photo · CCTV verification</span>
          </div>
        </Panel>
        <Panel title="Diesel consumption" region="fuel">
          <div className="sw-chart sw-chart--bars">
            <span className="sw-chart__grid" aria-hidden="true" />
            <Empty>{c.empty}</Empty>
          </div>
        </Panel>
        <Panel title="Capacity & utilisation" region="capacity">
          <div className="sw-chart sw-chart--rows">
            <span className="sw-chart__grid" aria-hidden="true" />
            <Empty>{c.empty}</Empty>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Weighbridge reconciliation (brochure p.12) ---------- */

const REGISTER_COLUMNS = [
  'Transfer station',
  'Vehicle',
  'Gross weighment',
  'Per-stop total',
  'Status',
];

export function WeighbridgeScreen() {
  return (
    <div className="sw-screen sw-weigh">
      <div className="sw-weigh__tiles">
        <Region name="loadcells" className="sw-tile">
          <span className="sw-tile__icon">
            <Icon d={ICONS.scale} />
          </span>
          <span className="sw-tile__text">
            <span className="sw-tile__label">IoT load cells</span>
            <Skel w="58%" tone="soft" />
          </span>
          <span className="sw-status" aria-hidden="true" />
        </Region>
        <Region name="transferStation" className="sw-tile">
          <span className="sw-tile__icon">
            <Icon d={ICONS.link} />
          </span>
          <span className="sw-tile__text">
            <span className="sw-tile__label">Weighbridge integration</span>
            <span className="sw-tile__sub">
              Transfer station ↔ Digital weighbridge
            </span>
          </span>
          <span className="sw-status" aria-hidden="true" />
        </Region>
        <Region name="calibration" className="sw-tile sw-tile--stack">
          <span className="sw-tile__icon">
            <Icon d={ICONS.clock} />
          </span>
          <span className="sw-tile__text">
            <span className="sw-tile__label">
              Calibration schedule · Certificate renewal
            </span>
            <Empty>{c.empty}</Empty>
          </span>
        </Region>
      </div>

      <Region name="discrepancy" className="sw-banner">
        <span className="sw-banner__icon">
          <Icon d={ICONS.alert} />
        </span>
        <span className="sw-banner__text">
          <span className="sw-banner__title">Discrepancy alert</span>
          <Skel w="46%" tone="soft" />
        </span>
        <Skel w="64px" />
      </Region>

      <div className="sw-panel sw-table-wrap">
        <div className="sw-panel__head">
          <span className="sw-panel__title">Weighment register</span>
          <Icon d={ICONS.download} size={14} />
        </div>
        <table className="sw-table">
          <thead>
            <tr>
              {REGISTER_COLUMNS.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody aria-hidden="true">
            {[0, 1, 2, 3].map((r) => (
              <tr key={r}>
                {REGISTER_COLUMNS.map((h, i) => (
                  <td key={h}>
                    {i === 4 ? (
                      <span className="sw-pill-skel" />
                    ) : (
                      <Skel w={`${[72, 54, 60, 48][(r + i) % 4]}%`} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sw-weigh__bottom">
        <Panel title="Cross-verification" region="comparison" className="sw-xv">
          <div className="sw-xv__flow">
            <Region name="perStop" className="sw-node">
              <span className="sw-node__label">Per-stop collection</span>
              <span className="sw-node__sub">Σ stops</span>
            </Region>
            <span className="sw-xv__op" aria-hidden="true">
              ↔
            </span>
            <Region name="gross" className="sw-node">
              <span className="sw-node__label">Gross weighment</span>
              <span className="sw-node__sub">Weighbridge</span>
            </Region>
            <span className="sw-xv__op" aria-hidden="true">
              →
            </span>
            <div className="sw-node sw-node--result">
              <span className="sw-state sw-state--ok">
                <Icon d={ICONS.check} size={12} />
                Consistent
              </span>
              <span className="sw-state sw-state--warn">
                <Icon d={ICONS.alert} size={12} />
                Mismatch
              </span>
            </div>
          </div>
        </Panel>
        <Panel title="Audit trail" region="auditTrail">
          <ol className="sw-timeline" aria-hidden="true">
            {['70%', '56%', '64%', '48%'].map((w, i) => (
              <li key={w + i}>
                <Skel w={w} />
                <Skel w="36%" tone="soft" />
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Grievance lifecycle (brochure p.18) ---------- */

export function GrievanceScreen() {
  return (
    <div className="sw-screen sw-griev">
      <Region name="citizenApp" className="sw-phone">
        <span className="sw-phone__notch" aria-hidden="true" />
        <div className="sw-phone__bar">
          <span className="sw-wordmark sw-wordmark--sm">{c.appName}</span>
          <span className="sw-phone__title">Complaint</span>
        </div>
        <Region name="complaintForm" className="sw-form">
          {/* The brochure (p.18) documents raising a complaint through the portal/app, not the
              form's fields — so one neutral complaint area, no invented fields. */}
          <span className="sw-field">
            <span className="sw-field__label">Complaint</span>
            <span className="sw-input sw-input--area">
              <Skel w="86%" tone="soft" />
              <Skel w="72%" tone="soft" />
              <Skel w="48%" tone="soft" />
            </span>
          </span>
          <span className="sw-fakebtn sw-fakebtn--block" aria-hidden="true">
            <Skel w="40%" tone="strong" />
          </span>
        </Region>
        <Region name="ratings" className="sw-rating">
          <span className="sw-field__label">Pickup rating</span>
          <Stars />
        </Region>
      </Region>

      <div className="sw-griev__desk">
        <Panel title="Complaint queue" region="queue" className="sw-queue">
          <div className="sw-kanban">
            {['Raised', 'Escalated', 'Resolved'].map((col, ci) => (
              <div className="sw-kanban__col" key={col}>
                <span className="sw-kanban__head">
                  <span className="sw-dot" data-state={ci} aria-hidden="true" />
                  {col}
                </span>
                {[0, 1].slice(0, ci === 1 ? 1 : 2).map((k) => (
                  <span className="sw-card" key={k} aria-hidden="true">
                    <Skel w="78%" />
                    <Skel w="52%" tone="soft" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </Panel>
        <div className="sw-griev__row">
          <Panel title="Escalation matrix" region="escalationMatrix">
            <ol className="sw-ladder">
              <li>
                <span className="sw-ladder__step">
                  Level <span className="sw-ord">1</span>
                </span>
              </li>
              <li>
                <span className="sw-ladder__step">
                  Level <span className="sw-ord">2</span>
                </span>
              </li>
              <li>
                <span className="sw-ladder__step sw-ladder__step--top">
                  Higher authority
                </span>
              </li>
            </ol>
          </Panel>
          <Panel title="Insights" region="trends">
            <div className="sw-chart">
              <span className="sw-chart__grid" aria-hidden="true" />
              <Empty>{c.empty}</Empty>
            </div>
            <ul className="sw-legend">
              <li>
                <span className="sw-swatch sw-swatch--a" aria-hidden="true" />
                Complaint trends
              </li>
              <li>
                <span className="sw-swatch sw-swatch--b" aria-hidden="true" />
                Response times
              </li>
              <li>
                <span className="sw-swatch sw-swatch--c" aria-hidden="true" />
                Feedback patterns
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---------- Landfill & compliance (brochure p.16) ---------- */

function CellsSchematic() {
  return (
    <svg
      className="sw-cells"
      viewBox="0 0 200 110"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="sw-hatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" />
        </pattern>
      </defs>
      <rect
        className="sw-cells__berm"
        x="4"
        y="4"
        width="192"
        height="102"
        rx="12"
      />
      {[0, 1, 2].map((col) =>
        [0, 1].map((row) => (
          <rect
            key={`${col}-${row}`}
            className={
              col === 2 && row === 1
                ? 'sw-cells__cell sw-cells__cell--planned'
                : 'sw-cells__cell'
            }
            x={14 + col * 60}
            y={14 + row * 44}
            width="52"
            height="38"
            rx="4"
          />
        )),
      )}
    </svg>
  );
}

export function LandfillScreen() {
  return (
    <div className="sw-screen sw-land">
      <Panel
        title="Waste inflow"
        region="inflow"
        className="sw-land__inflow"
        aside={
          <span className="sw-chip sw-chip--mint">
            <Icon d={ICONS.link} size={12} />
            Integrated with weighbridge data
          </span>
        }
      >
        <Region name="sources" className="sw-sources">
          {['Processing rejects', 'Mixed / unsegregated waste'].map((s, i) => (
            <span className="sw-inrow" key={s}>
              <span className="sw-inrow__label">
                <span
                  className={`sw-swatch sw-swatch--${i ? 'b' : 'a'}`}
                  aria-hidden="true"
                />
                {s}
              </span>
              <span className="sw-hbars__track" aria-hidden="true"></span>
            </span>
          ))}
        </Region>
      </Panel>

      <Panel
        title="Current utilisation"
        region="utilisation"
        className="sw-land__util"
      >
        <div className="sw-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle className="sw-ring__track" cx="50" cy="50" r="40" />
          </svg>
          <Empty>{c.empty}</Empty>
        </div>
      </Panel>

      <Region
        name="balanceLife"
        className="sw-tile sw-tile--stack sw-land__bal"
      >
        <span className="sw-tile__icon">
          <Icon d={ICONS.clock} />
        </span>
        <span className="sw-tile__text">
          <span className="sw-tile__label">Balance life</span>
          <Empty>{c.empty}</Empty>
        </span>
      </Region>
      <Region name="forecast" className="sw-tile sw-tile--stack sw-land__fore">
        <span className="sw-tile__icon">
          <Icon d={ICONS.chart} />
        </span>
        <span className="sw-tile__text">
          <span className="sw-tile__label">Forecast scenarios</span>
          <Empty>{c.empty}</Empty>
        </span>
      </Region>
      <Panel title="Landfill cells" className="sw-land__cells">
        <CellsSchematic />
      </Panel>

      <Panel title="Compliance" region="standards" className="sw-land__std">
        <ul className="sw-checklist">
          {['SWM Rules', 'Environmental norms', 'Safety standards'].map((s) => (
            <li key={s}>
              <span className="sw-checkbox" aria-hidden="true" />
              <span className="sw-checklist__label">{s}</span>
              <span className="sw-pill-skel" aria-hidden="true" />
            </li>
          ))}
        </ul>
      </Panel>
      <Panel
        title="Reports for authorities"
        region="report"
        className="sw-land__rep"
      >
        <ul className="sw-docs" aria-hidden="true">
          {['64%', '52%'].map((w) => (
            <li key={w}>
              <Icon d={ICONS.doc} size={14} />
              <Skel w={w} />
            </li>
          ))}
        </ul>
        <span className="sw-fakebtn" aria-hidden="true">
          <Icon d={ICONS.doc} size={13} />
          Generate report
        </span>
      </Panel>
    </div>
  );
}
