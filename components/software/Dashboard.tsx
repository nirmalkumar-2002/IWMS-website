import type { CSSProperties, ReactNode } from 'react';
import {
  dashboardLabels as L,
  type DashboardTab,
  type TourTarget,
} from '@/content/software';

/**
 * Recreation of the IWMS application's analytics dashboards (Inward, Sorting) from the approved
 * reference recording: same shell, tabs, filter panel, panel titles, column names, chart types,
 * chart palette (the application's Superset-style palette) and cell bars. No operational data:
 * names are placeholders, values are masked bars, chart proportions are illustrative.
 * Panels are separate components so phones can show one panel at a readable size.
 */

/** Chart palette of the reference application. */
const P = {
  cyan: '#1fa8c9',
  navy: '#454e7c',
  green: '#5ac189',
  orange: '#ff7f44',
  grey: '#666666',
  red: '#e04355',
  yellow: '#fcc700',
  purple: '#a868b7',
  teal: '#3ccccb',
  taupe: '#a38f79',
  sky: '#8fd3e4',
  mint: '#ace1c4',
  silver: '#b2b2b2',
  rose: '#efa1aa',
  lemon: '#fde380',
  lilac: '#d3b3da',
} as const;

export interface DashboardState {
  tab: DashboardTab;
  /** Inward: the date-range field is focused. */
  dateFocus: boolean;
  /** Sorting: the highlighted summary row is hovered. */
  rowHover: boolean;
}

const tour = (t: TourTarget) => ({ 'data-tour': t });
const bar = (w: number) => ({ '--w': `${w}%` }) as CSSProperties;

/** A masked value: a neutral bar where the application shows a number. */
function Mask({ w = '2.6em', tone }: { w?: string; tone?: 'teal' | 'dark' }) {
  return <span className="iw-mask" data-tone={tone} style={{ width: w }} aria-hidden="true" />;
}

function Dots() {
  return (
    <span className="iw-dots" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M2.5 3h11l-4.2 5v4.5l-2.6 1.2V8z" strokeLinejoin="round" />
    </svg>
  );
}

function Panel({
  title,
  children,
  className,
  t,
  filter,
}: {
  title: string;
  children?: ReactNode;
  className?: string;
  t?: TourTarget;
  filter?: boolean;
}) {
  return (
    <div className={`iw-panel ${className ?? ''}`} {...(t ? tour(t) : {})}>
      <div className="iw-panel__head">
        <span className="iw-panel__title">{title}</span>
        <span className="iw-panel__tools" aria-hidden="true">
          {filter && <FilterIcon />}
          <span className="iw-kebab" />
        </span>
      </div>
      {children}
    </div>
  );
}

/** Two-column table with a cell bar on the value column (application style), paginated. */
function BarTable({ rows, widths, pages }: { rows: readonly string[]; widths: number[]; pages: number }) {
  return (
    <div className="iw-bars">
      <div className="iw-bars__rows">
        {rows.map((r, i) => (
          <div className="iw-bars__row" key={r}>
            <span className="iw-bars__label">{r}</span>
            <span className="iw-bars__cell">
              <span className="iw-cellbar" style={bar(widths[i])} />
              <Mask w="2.2em" />
            </span>
          </div>
        ))}
      </div>
      <div className="iw-pager" aria-hidden="true">
        {Array.from({ length: pages }, (_, i) => (
          <span key={i} data-active={i === 0 ? 'true' : undefined} className="iw-pager__n">
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Treemap tiles on a CSS grid: [label, colour, column span, row span]. */
function Treemap({
  tiles,
  t,
}: {
  tiles: [string, string, number, number][];
  t?: { index: number; target: TourTarget };
}) {
  return (
    <div className="iw-treemap">
      {tiles.map(([label, color, cs, rs], i) => (
        <span
          key={`${label}-${i}`}
          className="iw-tile"
          style={{ background: color, gridColumn: `span ${cs}`, gridRow: `span ${rs}` }}
          {...(t && t.index === i ? tour(t.target) : {})}
        >
          {label && <span className="iw-tile__label">{label}</span>}
        </span>
      ))}
    </div>
  );
}

/** Pie with the application's legend; illustrative shares. */
function Pie() {
  const shares = [0.56, 0.28, 0.16];
  const colors = [P.cyan, P.navy, P.orange];
  let a0 = -Math.PI / 2;
  const arcs = shares.map((s, i) => {
    const a1 = a0 + s * Math.PI * 2;
    const r = 46;
    const x0 = 50 + r * Math.cos(a0);
    const y0 = 50 + r * Math.sin(a0);
    const x1 = 50 + r * Math.cos(a1);
    const y1 = 50 + r * Math.sin(a1);
    const d = `M50 50 L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${s > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    const mid = (a0 + a1) / 2;
    a0 = a1;
    return { d, color: colors[i], mid };
  });
  return (
    <div className="iw-pie">
      <div className="iw-legend" aria-hidden="true">
        {L.sourceTypes.map((s, i) => (
          <span key={s} className="iw-legend__item">
            <i style={{ background: colors[i] }} />
            {s}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 100 100" className="iw-pie__svg" aria-hidden="true">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} stroke="#fff" strokeWidth="0.8" />
        ))}
        {/* Hover point inside the LSG slice. */}
        <circle
          cx={(50 + 26 * Math.cos(arcs[0].mid)).toFixed(2)}
          cy={(50 + 26 * Math.sin(arcs[0].mid)).toFixed(2)}
          r="3"
          fill="transparent"
          {...tour('pie-lsg')}
        />
      </svg>
    </div>
  );
}

/* ---------- Panels (shared by the desktop dashboard and the phone focus view) ---------- */

export function FiltersPanel({ state }: { state: DashboardState }) {
  return (
    <aside className="iw-filters">
      <div className="iw-filters__head">
        <span>{L.filters}</span>
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 2.5v11M13 8H6M8.5 5 6 8l2.5 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="iw-filters__label">{L.dateRange}</span>
      <span className="iw-input" data-focus={state.dateFocus ? 'true' : undefined} {...tour('date-range')}>
        <span>{L.noFilter}</span>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
          <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
        </svg>
      </span>
    </aside>
  );
}

export function InwardTables() {
  return (
    <div className="iw-grid2" {...tour('inward-tables')}>
      <BarTable rows={L.inwardMaterials} widths={[92, 64, 26, 14, 9, 6, 5]} pages={3} />
      <BarTable rows={L.sources} widths={[88, 80, 54, 51, 45, 41, 39]} pages={6} />
    </div>
  );
}

function DistrictHeatmap() {
  return (
    <Panel title={L.districtHeatmap}>
      <Treemap
        tiles={[
          [L.districts[0], P.green, 3, 3],
          [L.districts[1], P.red, 2, 2],
          [L.districts[2], P.grey, 1, 2],
          [L.districts[3], P.orange, 3, 2],
          ['', P.purple, 1, 1],
          ['', P.yellow, 1, 1],
          ['', P.sky, 1, 1],
          ['', P.navy, 1, 1],
          ['', P.teal, 1, 1],
          ['', P.taupe, 1, 1],
        ]}
      />
    </Panel>
  );
}

export function MrfQty() {
  return (
    <Panel title={L.mrfQty} t="mrf-qty">
      <table className="iw-table iw-table--fixed">
        <thead>
          <tr>
            <th>{L.facilityColumn}</th>
            <th>{L.metric}</th>
          </tr>
        </thead>
        <tbody>
          {L.facilities.map((f, i) => (
            <tr key={f}>
              <td>{f}</td>
              <td className="iw-num">
                <span className="iw-cellbar" style={bar([96, 52, 51, 32, 18][i])} />
                <Mask w="2.4em" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** District heatmap and source-type pie, with MRF quantities beside them on desktop. */
export function InwardCharts({ withMrf = true }: { withMrf?: boolean }) {
  return (
    <div className={withMrf ? 'iw-grid3' : 'iw-grid2'} {...tour('inward-charts')}>
      <DistrictHeatmap />
      <Panel title={L.sourceVsQty}>
        <Pie />
      </Panel>
      {withMrf && <MrfQty />}
    </div>
  );
}

export function Kpis() {
  return (
    <div className="iw-kpis" {...tour('kpis')}>
      {L.kpis.map((k) => (
        <div className="iw-kpi" key={k}>
          <span className="iw-kpi__value" aria-hidden="true" />
          <span className="iw-kpi__label">{k}</span>
        </div>
      ))}
    </div>
  );
}

const SUMMARY_FACILITY = [0, 0, 1, 2, 0, 2, 3];
const SUMMARY_IN = [18, 80, 52, 20, 90, 34, 44];
const SUMMARY_OUT = [44, 96, 56, 21, 93, 30, 36];

export function SortingSummary({ state }: { state: DashboardState }) {
  return (
    <Panel title={L.sortingSummary} t="sorting-summary" className="iw-summary">
      <div className="iw-tablewrap">
        <table className="iw-table iw-table--wide">
          <thead>
            <tr>
              {L.summaryColumns.map((h) => (
                <th key={h}>
                  {h}
                  <span className="iw-sort" aria-hidden="true" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUMMARY_FACILITY.map((f, i) => (
              <tr
                key={i}
                data-hover={i === 3 && state.rowHover ? 'true' : undefined}
                {...(i === 3 ? tour('summary-row') : {})}
              >
                <td>
                  <Mask w="4.6em" tone="dark" />
                </td>
                <td>{L.facilities[f]}</td>
                <td>{L.belts[i % 2]}</td>
                <td>{L.shift}</td>
                <td className="iw-num">
                  <Mask w="1.4em" />
                </td>
                <td className="iw-num">
                  <span className="iw-cellbar" style={bar(SUMMARY_IN[i])} />
                  <Mask w="2.2em" />
                </td>
                <td className="iw-num">
                  <span className="iw-cellbar" style={bar(SUMMARY_OUT[i])} />
                  <Mask w="2.2em" />
                </td>
                <td className="iw-num">
                  <Mask w="2em" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const O = L.outputMaterialNames;

export function OutputPanels() {
  return (
    <div className="iw-grid2 iw-grid2--output" {...tour('output')}>
      <Panel title={L.outputMaterials}>
        <Treemap
          t={{ index: 0, target: 'treemap-tile' }}
          tiles={[
            [O[0], P.green, 2, 4],
            [O[2], P.sky, 2, 1],
            [O[5], P.silver, 1, 2],
            [O[6], P.orange, 1, 2],
            [O[7], P.rose, 1, 2],
            [O[8], P.mint, 1, 2],
            [O[3], P.green, 2, 1],
            [O[9], P.navy, 1, 1],
            [O[10], P.navy, 1, 1],
            [O[11], P.sky, 1, 1],
            [O[4], P.teal, 2, 1],
            [O[12], P.silver, 1, 1],
            ['', P.yellow, 1, 1],
            [O[1], P.lilac, 2, 2],
            [O[13], P.silver, 1, 1],
            ['', P.orange, 1, 1],
            ['', P.lemon, 1, 1],
            ['', P.red, 1, 1],
          ]}
        />
      </Panel>
      <Panel title={L.mrfRecovery} t="mrf-recovery">
        <div className="iw-tablewrap">
          <table className="iw-table iw-pivot">
            <thead>
              <tr>
                <th className="iw-pivot__corner">{L.metricLabel}</th>
                <th colSpan={L.facilities.length}>{L.metric}</th>
              </tr>
              <tr>
                <th className="iw-pivot__corner">{L.facilityColumn}</th>
                {L.facilities.map((f) => (
                  <th key={f}>{f}</th>
                ))}
              </tr>
              <tr>
                <th className="iw-pivot__corner iw-pivot__rowhead">{L.materialColumn}</th>
                {L.facilities.map((f) => (
                  <th key={f} aria-hidden="true" />
                ))}
              </tr>
            </thead>
            <tbody>
              {L.recoveryMaterials.map((m, r) => (
                <tr key={m}>
                  <td>{m}</td>
                  {L.facilities.map((f, col) => (
                    <td key={f} className="iw-num">
                      {(r + col) % 3 !== 1 && <Mask w="1.8em" tone="teal" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Board({ title, caps, children }: { title: string; caps?: boolean; children: ReactNode }) {
  return (
    <div className="iw-board">
      <div className="iw-board__head">
        <span className={`iw-board__title${caps ? ' iw-board__title--caps' : ''}`}>{title}</span>
        <span className="iw-more" aria-hidden="true">
          <Dots />
        </span>
      </div>
      <div className="iw-scrollbox">
        <div className="iw-scroll" data-scroll="true">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Tab bar of the application (shared by the dashboard and the phone focus view). */
export function DashboardTabs({ tab }: { tab: DashboardTab }) {
  return (
    <div className="iw-tabs">
      <span className="iw-tabs__list">
        {L.tabs.map((t) => (
          <span
            key={t.id}
            className="iw-tab"
            data-active={t.id === tab ? 'true' : undefined}
            {...(t.id === 'inward' ? tour('tab-inward') : t.id === 'sorting' ? tour('tab-sorting') : {})}
          >
            {t.label}
          </span>
        ))}
      </span>
      <span className="iw-collapse" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9.5 6.5 13.5 2.5M9.5 6.5V3.3M9.5 6.5h3.2M6.5 9.5 2.5 13.5M6.5 9.5v3.2M6.5 9.5H3.3" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

/** The application shell: dashboard tabs, then the active dashboard (pages remount = crossfade). */
export function Dashboard({ state }: { state: DashboardState }) {
  return (
    <div className="iw" data-tab={state.tab}>
      <DashboardTabs tab={state.tab} />
      <div className="iw-body">
        {state.tab === 'sorting' ? (
          <div className="iw-page iw-page--sorting" key="sorting">
            <aside className="iw-strip" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 2.5v11M3 8h7M7.5 5 10 8l-2.5 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <FilterIcon />
            </aside>
            <Board title={L.sortingTitle} caps>
              <Kpis />
              <SortingSummary state={state} />
              <OutputPanels />
              <div className="iw-grid2 iw-grid2--stub">
                <Panel title={L.materialBreakdown} filter />
                <Panel title={L.mrfOutput} filter />
              </div>
            </Board>
          </div>
        ) : (
          <div className="iw-page iw-page--inward" key="inward">
            <FiltersPanel state={state} />
            <Board title={L.inwardTitle}>
              <InwardTables />
              <InwardCharts />
            </Board>
          </div>
        )}
      </div>
    </div>
  );
}

/** Phones: only the panel the step is about, at a readable size, under the tab bar. */
export function FocusView({ target, state }: { target: TourTarget; state: DashboardState }) {
  let body: ReactNode;
  switch (target) {
    case 'date-range':
      body = <FiltersPanel state={state} />;
      break;
    case 'inward-tables':
      body = <InwardTables />;
      break;
    case 'inward-charts':
      body = <InwardCharts withMrf={false} />;
      break;
    case 'mrf-qty':
      body = <MrfQty />;
      break;
    case 'kpis':
      body = <Kpis />;
      break;
    case 'sorting-summary':
      body = <SortingSummary state={state} />;
      break;
    default:
      body = <OutputPanels />;
  }
  return (
    <div className="iw iw--focus" data-tab={state.tab}>
      <DashboardTabs tab={state.tab} />
      <div className="iw-focus" key={target}>
        {body}
      </div>
    </div>
  );
}
