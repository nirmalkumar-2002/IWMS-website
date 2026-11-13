/**
 * M6 — "IWMS in Action": a guided tour of the IWMS application's analytics dashboards, recreated
 * in React/CSS from the approved reference recording of the real application (dashboard GIF).
 *
 * What is authentic: the dashboard structure, navigation (Overview · Inward · Dispatch · Sorting),
 * panel titles, column names, chart types, material categories and the visual language.
 * What is NOT shown: any operational data. Facility, local-body and district names are neutral
 * placeholders; every value, date, count and percentage is masked; chart proportions are
 * illustrative. Only the Inward and Sorting dashboards were seen in the reference, so only they
 * are demonstrated; Overview and Dispatch appear as tabs only.
 *
 * Section heading/lead lines are PROPOSED marketing copy — not yet approved.
 */

export type DashboardTab = 'overview' | 'inward' | 'dispatch' | 'sorting';
export type TourId = 'inward' | 'sorting';

/** Elements of the recreated dashboard a step can point at (`data-tour` attributes). */
export type TourTarget =
  | 'tab-inward'
  | 'tab-sorting'
  | 'date-range'
  | 'inward-tables'
  | 'inward-charts'
  | 'pie-lsg'
  | 'mrf-qty'
  | 'kpis'
  | 'sorting-summary'
  | 'summary-row'
  | 'output'
  | 'treemap-tile'
  | 'mrf-recovery';

export interface TourStep {
  id: string;
  title: string;
  caption: string;
  /** Dashboard tab shown once the step's action has happened. */
  tab: DashboardTab;
  /** Element scrolled into view inside the dashboard (none = top of the page). */
  scrollTo?: TourTarget;
  /** Where the cursor moves, and what it does there. */
  cursor: { target: TourTarget; action: 'click' | 'hover' | 'point' };
  /** Element ringed while the step is shown. */
  ring: TourTarget;
  /** Hover tooltip, in the application's style (values masked). */
  tooltip?: { target: TourTarget; title: string; metric: string };
  /** Panel shown on phones, where the whole dashboard would be too small to read. */
  focus: TourTarget;
}

export interface Tour {
  id: TourId;
  label: string;
  summary: string;
  /** The tab the tour starts from before its first click. */
  startTab: DashboardTab;
  steps: readonly TourStep[];
}

export const softwareContent = {
  eyebrow: 'IWMS software',
  title: 'IWMS in Action',
  /** PROPOSED */
  lead: 'Every load received, sorted and recovered at a material recovery facility becomes data in IWMS — filtered, broken down by material, source and facility, and reported on one dashboard.',
  disclosure: 'Illustrative Interface — Based on IWMS Software',
  disclosureLong:
    'Recreated from the IWMS application’s Inward and Sorting dashboards. Facility and place names are placeholders, all values are masked and chart proportions are illustrative — no operational data is shown.',
  toursLabel: 'Dashboard tours',
  stepsLabel: 'Steps',
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  back: 'Back',
  next: 'Next',
  stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
  /** Accessible name of the recreated application frame. */
  frameLabel: 'Recreated IWMS analytics dashboard (illustrative, values masked)',
  maskedValue: 'value masked',
  demo: 'Request a demo',
  brochure: 'Download brochure (PDF)',
} as const;

/** Labels of the recreated application, verbatim from the reference recording. */
export const dashboardLabels = {
  tabs: [
    { id: 'overview', label: 'Overview' },
    { id: 'inward', label: 'Inward Dashboard' },
    { id: 'dispatch', label: 'Dispatch Dashboard' },
    { id: 'sorting', label: 'Sorting Dashboard' },
  ] as const satisfies readonly { id: DashboardTab; label: string }[],
  filters: 'Filters',
  dateRange: 'DATE RANGE',
  noFilter: 'No filter',
  inwardTitle: 'Facility Inward Analytics',
  districtHeatmap: 'DISTRICT WISE HEATMAP',
  sourceVsQty: 'SOURCE TYPE VS QTY',
  mrfQty: 'MRF WISE QTY',
  sortingTitle: 'SORTING ANALYTICS',
  kpis: ['TOTAL FEEDING', 'TOTAL RECOVERY', 'RECOVERY (%)'],
  sortingSummary: 'SORTING SUMMARY',
  summaryColumns: [
    'sortingDate',
    'facilityName',
    'beltName',
    'shiftName',
    'beltStaffCount',
    'SUM(inputQuantity)',
    'SUM(outputQuantity)',
    'Efficiency',
  ],
  outputMaterials: 'OUTPUT MATERIALS',
  mrfRecovery: 'MRF WISE RECOVERY',
  materialBreakdown: 'Material Output Breakdown',
  mrfOutput: 'MRF WISE OUTPUT',
  metric: 'SUM(materialQuantity)',
  facilityColumn: 'facilityName',
  materialColumn: 'materialName',
  metricLabel: 'Metric',
  sourceTypes: ['LSG', 'OTHER', 'Unspecified'],
  /** Material categories as recorded in IWMS (generic types, not records). */
  inwardMaterials: [
    'RECYCLE',
    'FOOTWEAR WASTE',
    'BSK',
    'PET',
    'CLOTH WASTE',
    'PET BOTTLE MIX',
    'SWEEPING REJECT',
  ],
  outputMaterialNames: [
    'HM',
    'BB',
    'BSK',
    'Raffia',
    'Cloth',
    'Pure MLP',
    'Unshredded',
    'CK',
    'LD',
    'PET BOTTLE',
    'MLP',
    'GLASS',
    'CPP',
    'Footwear',
  ],
  recoveryMaterials: ['ALUMINIUM', 'Aluminium Can', 'Astra (Non Woven)', 'BAJHAR', 'BB', 'BED'],
  /** Placeholders for real identities (local bodies, districts, facilities). */
  sources: ['Local body A', 'Local body B', 'Local body C', 'Local body D', 'Local body E', 'Local body F', 'Local body G'],
  districts: ['District A', 'District B', 'District C', 'District D', 'District E', 'District F'],
  facilities: ['MRF A', 'MRF B', 'MRF C', 'MRF D', 'MRF E'],
  belts: ['Belt A', 'Belt B'],
  shift: 'morning',
} as const;

export const TOURS: readonly Tour[] = [
  {
    id: 'inward',
    label: 'Inward Analytics',
    summary: 'What arrives at each facility — by material, source, district and MRF.',
    startTab: 'sorting',
    steps: [
      {
        id: 'open',
        title: 'Open the Inward Dashboard',
        caption: 'Inward analytics brings every load received at the facilities into one view.',
        tab: 'inward',
        cursor: { target: 'tab-inward', action: 'click' },
        ring: 'tab-inward',
        focus: 'inward-tables',
      },
      {
        id: 'filter',
        title: 'Filter by date range',
        caption: 'The filters panel narrows every chart on the dashboard to a chosen date range.',
        tab: 'inward',
        cursor: { target: 'date-range', action: 'click' },
        ring: 'date-range',
        focus: 'date-range',
      },
      {
        id: 'materials',
        title: 'Inward by material and source',
        caption: 'Quantities received are broken down by material category and by the local body they came from.',
        tab: 'inward',
        cursor: { target: 'inward-tables', action: 'point' },
        ring: 'inward-tables',
        focus: 'inward-tables',
      },
      {
        id: 'sources',
        title: 'Districts and source types',
        caption: 'A district heatmap and a source-type breakdown show where inward waste originates.',
        tab: 'inward',
        scrollTo: 'inward-charts',
        cursor: { target: 'pie-lsg', action: 'hover' },
        ring: 'inward-charts',
        tooltip: { target: 'pie-lsg', title: 'LSG', metric: 'SUM(materialQuantity)' },
        focus: 'inward-charts',
      },
      {
        id: 'facilities',
        title: 'Quantity by facility',
        caption: 'Each material recovery facility’s inward quantity is listed side by side.',
        tab: 'inward',
        scrollTo: 'inward-charts',
        cursor: { target: 'mrf-qty', action: 'point' },
        ring: 'mrf-qty',
        focus: 'mrf-qty',
      },
    ],
  },
  {
    id: 'sorting',
    label: 'Sorting & Recovery',
    summary: 'How much is fed, sorted and recovered — per facility, belt and shift.',
    startTab: 'inward',
    steps: [
      {
        id: 'open',
        title: 'Open the Sorting Dashboard',
        caption: 'Sorting analytics reports what each facility feeds into sorting and what it recovers.',
        tab: 'sorting',
        cursor: { target: 'tab-sorting', action: 'click' },
        ring: 'tab-sorting',
        focus: 'kpis',
      },
      {
        id: 'kpis',
        title: 'Feeding and recovery at a glance',
        caption: 'Total feeding, total recovery and the recovery percentage head the dashboard.',
        tab: 'sorting',
        cursor: { target: 'kpis', action: 'point' },
        ring: 'kpis',
        focus: 'kpis',
      },
      {
        id: 'summary',
        title: 'Sorting summary by belt and shift',
        caption: 'Every sorting run is listed by date, facility, belt and shift, with input, output and efficiency.',
        tab: 'sorting',
        scrollTo: 'sorting-summary',
        cursor: { target: 'summary-row', action: 'hover' },
        ring: 'sorting-summary',
        focus: 'sorting-summary',
      },
      {
        id: 'output',
        title: 'Output materials and recovery',
        caption: 'Recovered output is broken down by material, and recovery is compared across facilities.',
        tab: 'sorting',
        scrollTo: 'output',
        cursor: { target: 'treemap-tile', action: 'hover' },
        ring: 'output',
        tooltip: { target: 'treemap-tile', title: 'HM', metric: 'SUM(materialQuantity)' },
        focus: 'output',
      },
    ],
  },
] as const;
