import type { ContentItem, SectionContent } from './types';

export type DashboardPanelKey =
  | 'fleet'
  | 'collection'
  | 'weighbridge'
  | 'attendance'
  | 'grievance'
  | 'landfill';

export type DashboardSignal = ContentItem & {
  key: DashboardPanelKey;
  /** Module that feeds this signal (matches a modulesContent slug). */
  module: string;
  moduleTitle: string;
};

/** A labelled demo figure on the illustrative console. NOT real operational data. */
export type DemoStat = { label: string; value: string };

export type DashboardContent = SectionContent & {
  items: DashboardSignal[];
  model: { title: string; body: string; items: ContentItem[] };
  /**
   * Illustrative console. Every value below is demo data chosen for the illustration;
   * replaces the former {{DASHBOARD_*}} tokens. Never present as live or client data.
   */
  console: {
    ariaLabel: string;
    caption: string;
    product: string;
    view: string;
    illustrative: string;
    ward: string;
    clock: string;
    fleet: {
      title: string;
      stats: DemoStat[];
      alert: string;
      legend: { route: string; geofence: string; vehicle: string };
    };
    collection: {
      title: string;
      value: string;
      ratio: number;
      caption: string;
      exceptions: DemoStat[];
    };
    weighbridge: {
      title: string;
      perStop: DemoStat;
      gross: DemoStat;
      perStopRatio: number;
      alert: string;
      alertBody: string;
    };
    attendance: {
      title: string;
      value: string;
      total: number;
      present: number;
      late: number;
      exceptions: DemoStat[];
    };
    grievance: {
      title: string;
      stats: DemoStat[];
      target: DemoStat;
      ratio: number;
    };
    landfill: {
      title: string;
      utilised: DemoStat;
      ratio: number;
      balance: DemoStat;
      hotspot: string;
    };
  };
  labels: {
    signalsHeading: string;
    highlight: string;
    feeds: string;
    moduleLink: string;
  };
};

export const dashboardContent = {
  id: 'dashboard',
  eyebrow: 'COMMAND CENTRE',
  title: 'Your city’s operations, in one control room.',
  description:
    'IWMS connects with the Integrated Command and Control Centre (ICCC) for centralised oversight. Field data from QR scans, GPS-tracked vehicles, IoT load cells, CCTV and the citizen app arrives in one view — so exceptions surface as they happen.',
  source: {
    pages: [2, 3, 6, 8, 10, 12, 16, 18],
  },
  items: [
    {
      key: 'fleet',
      module: 'd2d-logistics',
      moduleTitle: 'D2D Collection & Logistics',
      title: 'Fleet on the map',
      body: 'Real-time visibility of every GPS-tracked vehicle, with geofencing and alerts when a vehicle deviates from its route.',
    },
    {
      key: 'collection',
      module: 'collection-verification',
      moduleTitle: 'Collection & Verification',
      title: 'Verified pickups',
      body: 'QR scans log GPS location, timestamp, waste image and weighment for each household and bin; locked houses, no waste and damaged bins are flagged.',
    },
    {
      key: 'weighbridge',
      module: 'weighbridge-management',
      moduleTitle: 'Weighbridge Management',
      title: 'Weighment reconciliation',
      body: 'Per-stop collected waste is compared with the vehicle’s gross weighment; mismatches trigger instant alerts and a digital audit trail.',
    },
    {
      key: 'attendance',
      module: 'resource-management',
      moduleTitle: 'Resource Management',
      title: 'Workforce on duty',
      body: 'Photo, QR or biometric attendance and crew assignment, with absentees, missed pickups and late logins highlighted.',
    },
    {
      key: 'grievance',
      module: 'grievance-redressal',
      moduleTitle: 'Grievance Redressal',
      title: 'Citizen grievances',
      body: 'Complaints and 1–5-star ratings from the citizen portal and app, with response times tracked and unresolved complaints routed up the escalation matrix.',
    },
    {
      key: 'landfill',
      module: 'landfill-management',
      moduleTitle: 'Landfill Management',
      title: 'Landfill balance life',
      body: 'Inflow trends, current utilisation, balance life and forecast scenarios, alongside thermal-sensor hotspot alerts.',
    },
  ],
  model: {
    title: 'The IWMS model',
    body: 'Web and app-based monitoring with an IoT-enabled navigation system, QR-code tracking for accountability and a grievance redressal system — operated in line with the Solid Waste Management (SWM) Rules.',
    items: [
      {
        title: 'Web & app-based monitoring tools',
        body: 'Web and mobile platforms for monitoring operations.',
      },
      {
        title: 'IoT-based navigation system',
        body: 'GPS-tracked vehicles and optimised routes.',
      },
      {
        title: 'Sensor-based waste collection',
        body: 'IoT load cells and smart bin sensors.',
      },
      {
        title: 'ICCC integration',
        body: 'Centralised oversight from the Integrated Command and Control Centre.',
      },
      {
        title: 'Grievance redressal system',
        body: 'Citizen complaints handled with escalation workflows.',
      },
    ],
  },
  console: {
    ariaLabel:
      'Illustrative dashboard: an IWMS control-room screen showing demo data only',
    caption:
      'Illustrative dashboard with demo data. Figures, ward and routes are placeholders, not real operational data.',
    product: 'IWMS · ICCC view',
    view: 'Operations overview',
    illustrative: 'Illustrative dashboard · demo data',
    ward: 'Demo ward',
    clock: '06:40',
    fleet: {
      title: 'Vehicles · live',
      stats: [
        { label: 'On route', value: '18' },
        { label: 'Deviation', value: '1' },
      ],
      alert: 'Route deviation · demo vehicle',
      legend: {
        route: 'Planned route',
        geofence: 'Geofence',
        vehicle: 'Vehicle',
      },
    },
    collection: {
      title: 'Today’s collection',
      value: '82%',
      ratio: 0.82,
      caption: 'QR-verified pickups',
      exceptions: [
        { label: 'Locked house', value: '6' },
        { label: 'No waste', value: '4' },
        { label: 'Damaged bin', value: '1' },
      ],
    },
    weighbridge: {
      title: 'Weighbridge',
      perStop: { label: 'Per-stop total', value: '4.6 t' },
      gross: { label: 'Gross weighment', value: '5.0 t' },
      perStopRatio: 0.92,
      alert: 'Discrepancy alert',
      alertBody: 'Weights do not match · logged for audit',
    },
    attendance: {
      title: 'Attendance',
      value: '46 / 50',
      total: 50,
      present: 46,
      late: 1,
      exceptions: [
        { label: 'Absent', value: '4' },
        { label: 'Late login', value: '1' },
      ],
    },
    grievance: {
      title: 'Complaints',
      stats: [
        { label: 'Open', value: '12' },
        { label: 'Escalated', value: '2' },
      ],
      target: { label: 'Within response target', value: '88%' },
      ratio: 0.88,
    },
    landfill: {
      title: 'Landfill',
      utilised: { label: 'Capacity utilised', value: '60%' },
      ratio: 0.6,
      balance: { label: 'Balance life', value: '4.5 yrs' },
      hotspot: 'Thermal hotspot check · clear',
    },
  },
  labels: {
    signalsHeading: 'What the control room sees',
    highlight: 'Highlight on the illustration',
    feeds: 'Fed by',
    moduleLink: 'Open the module',
  },
} satisfies DashboardContent;
