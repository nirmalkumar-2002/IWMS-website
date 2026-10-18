/**
 * Scene 04 — IWMS ecosystem content (single typed source for the section, the M2 schematic map
 * and the future M3 3D city). Module names are the seven official IWMS modules, verbatim and in
 * brochure order (iwms-brochure.pdf p.4); capability lines paraphrase the cited brochure pages.
 * ICCC is an integration, not an IWMS module (p.3). No statistics or live data are shown here.
 *
 * Section heading/intro/benefit lines are PROPOSED marketing copy — not yet approved.
 */

export type EcosystemNodeId =
  | 'collection'
  | 'logistics'
  | 'resources'
  | 'weighbridge'
  | 'processing'
  | 'landfill'
  | 'grievance'
  | 'iccc';

export interface EcosystemNode {
  id: EcosystemNodeId;
  /** 'module' = one of the seven official IWMS modules; 'integration' = ICCC hub. */
  kind: 'module' | 'integration';
  /** Display number ('01'–'07'); integrations have none. */
  number?: string;
  /** Official module name (brochure p.4) or integration name. */
  name: string;
  /** Short label for chips and the map. */
  label: string;
  /** Where it sits in the city (map / future 3D). */
  place: string;
  summary: string;
  /** 3–4 capabilities, each traceable to the cited brochure page. */
  capabilities: string[];
  /** One benefit line (PROPOSED copy, grounded in the cited page). */
  benefit: string;
  /** Brochure page with the details (opens iwms-brochure.pdf#page=N). */
  page: number;
  connects: EcosystemNodeId[];
  /** Schematic map position (viewBox 0–100 × 0–62). */
  map: { x: number; y: number };
}

export const ecosystemContent = {
  eyebrow: 'The IWMS platform',
  /** PROPOSED */
  title: 'One connected platform for every waste operation',
  /** PROPOSED */
  intro:
    'Seven IWMS modules cover the journey from household to landfill, and the platform connects to the city’s command centre. Select a module to see what it does and how it links to the rest.',
  railLabel: 'IWMS modules',
  moduleTag: 'Module',
  integrationTag: 'Integration',
  integrationNote: 'Connects IWMS to the city’s command centre — not a separate IWMS module.',
  capabilitiesLabel: 'What it does',
  connectsLabel: 'Connected to',
  sourceLabel: (page: number) => `Brochure, page ${page}`,
  mapLabel:
    'Schematic map of the IWMS ecosystem: households, fleet routes, crews, the weighbridge, processing, the landfill and citizens, all connected to the city command centre.',
  brochure: 'Download brochure (PDF)',
  demo: 'Request a demo',
  noJsHint: 'IWMS modules',
};

export const ECOSYSTEM_NODES: EcosystemNode[] = [
  {
    id: 'collection',
    kind: 'module',
    number: '01',
    name: 'Collection & Verification',
    label: 'Collection',
    place: 'Households and bins',
    summary:
      'Validates every pickup with QR codes, event logging and citizen notifications.',
    capabilities: [
      'QR codes for households, bins, apartments and institutions',
      'Pickup log with GPS location, timestamp and waste image',
      'Exceptions recorded: locked house, no waste, damaged bin',
      'Citizens alerted before the vehicle arrives',
    ],
    benefit: 'A tamper-proof digital record of every collection.',
    page: 6,
    connects: ['logistics', 'grievance', 'iccc'],
    map: { x: 16, y: 44 },
  },
  {
    id: 'logistics',
    kind: 'module',
    number: '02',
    name: 'D2D Collection & Logistics Management',
    label: 'D2D Logistics',
    place: 'Fleet and routes',
    summary: 'Tracks collection vehicles live and keeps them on their planned routes.',
    capabilities: [
      'Live map of all vehicles with geo-fencing',
      'Optimised route allocation',
      'Alerts when a vehicle deviates from its route',
      'Diesel consumption and load-versus-capacity reports',
    ],
    benefit: 'Ring-fencing and fraud prevention across the fleet.',
    page: 8,
    connects: ['collection', 'resources', 'weighbridge', 'iccc'],
    map: { x: 36, y: 34 },
  },
  {
    id: 'resources',
    kind: 'module',
    number: '03',
    name: 'Resource Management',
    label: 'Resources',
    place: 'Crews and depot',
    summary: 'Manages collection staff, attendance and crew assignments.',
    capabilities: [
      'Photo, QR or biometric attendance',
      'Crews assigned to routes and tasks',
      'Performance tracking: route coverage, stops, citizen ratings',
      'Exception reports: absentees, missed pickups, late logins',
    ],
    benefit: 'Daily and monthly reports for every crew.',
    page: 10,
    connects: ['collection', 'logistics', 'iccc'],
    map: { x: 24, y: 16 },
  },
  {
    id: 'weighbridge',
    kind: 'module',
    number: '04',
    name: 'Weighbridge Management',
    label: 'Weighbridge',
    place: 'Transfer station',
    summary: 'Connects transfer stations to digital weighbridges with IoT load cells.',
    capabilities: [
      'IoT load-cell weighment',
      'Per-stop weights checked against gross vehicle weight',
      'Discrepancy alerts with an audit trail',
      'Calibration and certificate renewal reminders',
    ],
    benefit: 'Weighment data that can be audited end to end.',
    page: 12,
    connects: ['logistics', 'processing', 'landfill', 'iccc'],
    map: { x: 56, y: 42 },
  },
  {
    id: 'processing',
    kind: 'module',
    number: '05',
    name: 'Waste Management (Processing)',
    label: 'Processing',
    place: 'Processing and segregation',
    summary: 'Logs segregation and sends each waste stream to the right processing.',
    capabilities: [
      'Segregation logging: wet, dry, hazardous, sanitary and glass',
      'Organic waste to composting or biomethanization',
      'Dry waste to the MRF or pyrolysis',
      'Disposal reconciliation and reject handling',
    ],
    benefit: 'Traceable processing for every waste stream.',
    page: 14,
    connects: ['weighbridge', 'landfill', 'iccc'],
    map: { x: 74, y: 22 },
  },
  {
    id: 'landfill',
    kind: 'module',
    number: '06',
    name: 'Landfill Management',
    label: 'Landfill',
    place: 'Engineered landfill',
    summary: 'Monitors landfill inflow, capacity and site safety.',
    capabilities: [
      'Inflow tracking linked to weighbridge records',
      'Capacity and balance-life analytics from drone and GIS surveys',
      'Thermal sensors with hotspot alerts',
      'CCTV and AI monitoring of site activity',
    ],
    benefit: 'Remaining capacity forecast well before it becomes critical.',
    page: 16,
    connects: ['weighbridge', 'processing', 'iccc'],
    map: { x: 88, y: 46 },
  },
  {
    id: 'grievance',
    kind: 'module',
    number: '07',
    name: 'Grievance Redressal Management',
    label: 'Grievances',
    place: 'Citizens',
    summary: 'Gives citizens a portal and app to rate collections and raise grievances.',
    capabilities: [
      'Citizen portal and mobile app',
      'Star rating after each pickup',
      'Escalation matrix for unresolved complaints',
      'Complaint analytics',
    ],
    benefit: 'Citizen feedback tied directly to collection performance.',
    page: 18,
    connects: ['collection', 'logistics', 'iccc'],
    map: { x: 8, y: 24 },
  },
  {
    id: 'iccc',
    kind: 'integration',
    name: 'ICCC Integration',
    label: 'ICCC',
    place: 'City command centre',
    summary:
      'IWMS connects with the city’s Integrated Command and Control Centre (ICCC) for centralised oversight.',
    capabilities: [
      'Centralised oversight of waste operations',
      'Web and app based monitoring tools',
    ],
    benefit: 'One city-level view across every IWMS module.',
    page: 3,
    connects: [
      'collection',
      'logistics',
      'resources',
      'weighbridge',
      'processing',
      'landfill',
      'grievance',
    ],
    map: { x: 50, y: 10 },
  },
];

export const ECOSYSTEM_BY_ID = Object.fromEntries(
  ECOSYSTEM_NODES.map((n) => [n.id, n]),
) as Record<EcosystemNodeId, EcosystemNode>;
