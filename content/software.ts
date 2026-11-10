/**
 * M6 — "IWMS in Action" content: four software demonstrations, each a 3-stage workflow.
 *
 * Every stage, caption and interface element paraphrases the cited page of iwms-brochure.pdf
 * (text in docs/source/deck-text.txt). The screens are ILLUSTRATIVE: no real application
 * screenshots exist in the project, so the interface shows structure and verified field
 * terminology only — no metrics, KPIs, timestamps, people, vehicle IDs, transactions or live data.
 * Where the brochure does not document how a step looks in the application, captions describe
 * the capability neutrally instead of inventing application behaviour.
 *
 * Section heading/lead lines are PROPOSED marketing copy — not yet approved.
 */
import type { EcosystemNodeId } from './ecosystem';

export type SoftwareDemoId = 'fleet' | 'weighbridge' | 'grievance' | 'landfill';

/**
 * Named regions of each demonstration's screen. A callout points at one region; the visual
 * composition for that demonstration renders every region of its screen.
 */
export type SoftwareRegion =
  // Fleet & route monitoring (p.8)
  | 'map'
  | 'vehicles'
  | 'geofence'
  | 'route'
  | 'alerts'
  | 'verification'
  | 'fuel'
  | 'capacity'
  // Weighbridge reconciliation (p.12)
  | 'loadcells'
  | 'transferStation'
  | 'perStop'
  | 'gross'
  | 'comparison'
  | 'discrepancy'
  | 'auditTrail'
  | 'calibration'
  // Grievance lifecycle (p.18)
  | 'citizenApp'
  | 'complaintForm'
  | 'queue'
  | 'escalationMatrix'
  | 'ratings'
  | 'trends'
  // Landfill & compliance (p.16)
  | 'inflow'
  | 'sources'
  | 'utilisation'
  | 'balanceLife'
  | 'forecast'
  | 'standards'
  | 'report';

export interface SoftwareCallout {
  region: SoftwareRegion;
  /** Short interface-element name, as it would label that part of the screen. */
  label: string;
  /** One-line explanation, traceable to the demonstration's brochure page. */
  text: string;
}

export interface SoftwareStage {
  id: string;
  /** Workflow step name (shown in the 3-step indicator). */
  title: string;
  /** What happens at this step, in one or two sentences. */
  caption: string;
  /** Interface elements highlighted at this step (2–3). */
  callouts: readonly SoftwareCallout[];
}

export interface SoftwareDemo {
  id: SoftwareDemoId;
  /** Selector label. */
  label: string;
  /** Demonstration title (verbatim official module name in `module`). */
  title: string;
  /** The official IWMS module it belongs to (Scene 04 id). */
  module: EcosystemNodeId;
  /** One-line summary of the demonstration. */
  summary: string;
  /** Brochure page with the source (opens iwms-brochure.pdf#page=N). */
  page: number;
  /** Navigation labels of the illustrative application (verified terminology only). */
  nav: readonly string[];
  stages: readonly [SoftwareStage, SoftwareStage, SoftwareStage];
}

export const softwareContent = {
  eyebrow: 'IWMS software',
  title: 'IWMS in Action',
  /** PROPOSED */
  lead: 'Every trip, weighment, complaint and landfill delivery becomes a record in IWMS — monitored, cross-checked, escalated and reported through its web and app-based monitoring tools.',
  disclosure: 'Illustrative Interface — Based on IWMS Brochure',
  /** Accessible explanation of the disclosure (screen readers, no-JS). */
  disclosureLong:
    'The screens in this section are illustrative compositions of documented IWMS capabilities. They contain no real data and are not production screenshots.',
  selectorLabel: 'IWMS software demonstrations',
  stepsLabel: 'Workflow',
  stepLabel: (n: number) => `Step ${n}`,
  sourceLabel: (page: number) => `Brochure, page ${page}`,
  back: 'Back',
  next: 'Next step',
  appName: 'IWMS',
  /** Placeholder shown where real values would appear (no fictional data). */
  empty: 'Shown in the live application',
} as const;

export const SOFTWARE_DEMOS: readonly SoftwareDemo[] = [
  {
    id: 'fleet',
    label: 'Fleet & Route Monitoring',
    title: 'D2D Collection & Logistics Management',
    module: 'logistics',
    summary: 'Every collection vehicle visible on one map, with routes, fuel and capacity under control.',
    page: 8,
    nav: ['Live tracking', 'Routes', 'Diesel', 'Capacity reports'],
    stages: [
      {
        id: 'tracking',
        title: 'Live tracking',
        caption:
          'All collection vehicles appear on a live map, and geo-fences mark where each vehicle is allowed to operate.',
        callouts: [
          { region: 'map', label: 'Live vehicle map', text: 'Real-time visibility of all vehicles on a map.' },
          { region: 'geofence', label: 'Geo-fence', text: 'Prevents unauthorised vehicle movement.' },
          { region: 'vehicles', label: 'Fleet list', text: 'Each vehicle tracked by GPS.' },
        ],
      },
      {
        id: 'adherence',
        title: 'Route adherence',
        caption:
          'Routes are allocated and followed in IWMS; a deviation from the planned route raises an alert, and vehicle movement is verified.',
        callouts: [
          { region: 'route', label: 'Allocated route', text: 'Optimised route allocation for each vehicle.' },
          { region: 'alerts', label: 'Deviation alerts', text: 'Adherence tracking with alerts for deviations.' },
          {
            region: 'verification',
            label: 'Ring fencing',
            text: 'Auto-detection of vehicle movement, with vehicle photo and CCTV verification.',
          },
        ],
      },
      {
        id: 'reports',
        title: 'Fuel & capacity reports',
        caption:
          'Diesel use and vehicle load are reported against efficiency and capacity, so misuse is prevented and the fleet is used well.',
        callouts: [
          { region: 'fuel', label: 'Diesel consumption', text: 'Tracks fuel usage and efficiency; prevents misuse.' },
          { region: 'capacity', label: 'Capacity & utilisation', text: 'Monitors load against actual vehicle capacity.' },
        ],
      },
    ],
  },
  {
    id: 'weighbridge',
    label: 'Weighbridge Reconciliation',
    title: 'Weighbridge Management',
    module: 'weighbridge',
    summary: 'Collected waste is weighed, reconciled against every stop and kept in an audit trail.',
    page: 12,
    nav: ['Weighments', 'Cross-verification', 'Alerts', 'Calibration'],
    stages: [
      {
        id: 'capture',
        title: 'Weighment capture',
        caption:
          'Transfer stations are connected to digital weighbridges, and IoT load cells log each vehicle’s waste weight as it is measured.',
        callouts: [
          { region: 'loadcells', label: 'IoT load cells', text: 'Real-time monitoring of vehicle waste weights.' },
          {
            region: 'transferStation',
            label: 'Weighbridge integration',
            text: 'Transfer stations connected with digital weighbridges.',
          },
        ],
      },
      {
        id: 'cross-check',
        title: 'Cross-verification',
        caption:
          'The waste recorded at each collection stop is compared with the vehicle’s gross weighment, keeping records consistent.',
        callouts: [
          { region: 'perStop', label: 'Per-stop collection', text: 'Waste recorded at each collection stop.' },
          { region: 'gross', label: 'Gross weighment', text: 'The vehicle’s weight measured at the weighbridge.' },
          { region: 'comparison', label: 'Cross-verification', text: 'Ensures consistency and prevents manipulation.' },
        ],
      },
      {
        id: 'audit',
        title: 'Alerts & audit trail',
        caption:
          'A weight mismatch triggers an instant notification, every weighment stays in a complete digital audit trail, and calibration is kept on schedule.',
        callouts: [
          { region: 'discrepancy', label: 'Discrepancy alert', text: 'Instant notifications for mismatched weights.' },
          { region: 'auditTrail', label: 'Audit log', text: 'Complete digital audit trail for accountability.' },
          {
            region: 'calibration',
            label: 'Calibration',
            text: 'Calibration schedule alerts and certificate renewal reminders.',
          },
        ],
      },
    ],
  },
  {
    id: 'grievance',
    label: 'Grievance Lifecycle',
    title: 'Grievance Redressal Management',
    module: 'grievance',
    summary: 'Citizen complaints are raised, escalated until resolved and analysed for service quality.',
    page: 18,
    nav: ['Complaints', 'Escalation', 'Feedback', 'Insights'],
    stages: [
      {
        id: 'raised',
        title: 'Complaint raised',
        caption:
          'Citizens raise a complaint at any time through the IWMS citizen portal or mobile app — a transparent channel to the city.',
        callouts: [
          { region: 'citizenApp', label: 'Citizen portal & app', text: 'Easy access for citizens to raise complaints anytime.' },
          { region: 'complaintForm', label: 'Complaint', text: 'A transparent communication channel.' },
        ],
      },
      {
        id: 'escalation',
        title: 'Escalation',
        caption:
          'Complaints that remain unresolved are routed automatically up the escalation matrix to higher authorities.',
        callouts: [
          { region: 'queue', label: 'Complaint queue', text: 'Complaints tracked until they are resolved.' },
          {
            region: 'escalationMatrix',
            label: 'Escalation matrix',
            text: 'Automatic routing of unresolved complaints to higher authorities.',
          },
        ],
      },
      {
        id: 'insights',
        title: 'Feedback & insights',
        caption:
          'Citizens rate each pickup from one to five stars, and analytics track complaint trends, response times and feedback patterns.',
        callouts: [
          { region: 'ratings', label: 'Pickup ratings', text: 'Ratings (1–5 stars) after each waste pickup.' },
          {
            region: 'trends',
            label: 'Analytics-driven insights',
            text: 'Complaint trends, response times and feedback patterns.',
          },
        ],
      },
    ],
  },
  {
    id: 'landfill',
    label: 'Landfill & Compliance',
    title: 'Landfill Management',
    module: 'landfill',
    summary: 'Every delivery to the landfill is tracked, capacity is planned and compliance is reported.',
    page: 16,
    nav: ['Inflow', 'Capacity', 'Compliance', 'Reports'],
    stages: [
      {
        id: 'inflow',
        title: 'Inflow tracking',
        caption:
          'All waste reaching the landfill is monitored — including processing rejects and mixed or unsegregated waste — with weighbridge data integrated.',
        callouts: [
          { region: 'inflow', label: 'Waste inflow', text: 'Monitors all waste reaching the landfill; integrated with weighbridge data.' },
          { region: 'sources', label: 'Inflow categories', text: 'Processing rejects and mixed/unsegregated waste.' },
        ],
      },
      {
        id: 'capacity',
        title: 'Capacity & balance life',
        caption:
          'Dashboards show current utilisation, balance life and forecast scenarios, so new cells, expansion or diversion can be planned in time.',
        callouts: [
          { region: 'utilisation', label: 'Current utilisation', text: 'How much of the landfill’s safe capacity is used.' },
          { region: 'balanceLife', label: 'Balance life', text: 'Updated with weighbridge, drone/GIS and 3D modelling data.' },
          { region: 'forecast', label: 'Forecast scenarios', text: 'Planning for new cells, expansion or diversion.' },
        ],
      },
      {
        id: 'compliance',
        title: 'Compliance reporting',
        caption:
          'Operations are checked against SWM Rules, environmental norms and safety standards, and structured reports are generated for authorities.',
        callouts: [
          { region: 'standards', label: 'Compliance', text: 'Adherence to SWM Rules, environmental norms and safety standards.' },
          { region: 'report', label: 'Reports for authorities', text: 'Structured reports generated for authorities.' },
        ],
      },
    ],
  },
] as const;

export const SOFTWARE_BY_ID = Object.fromEntries(SOFTWARE_DEMOS.map((d) => [d.id, d])) as Record<
  SoftwareDemoId,
  SoftwareDemo
>;
