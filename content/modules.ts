import type { ContentItem, ModuleContent, ModulesContent } from './types';

/** A module entry: the shared ModuleContent shape plus editorial fields used by the index and detail page. */
export type ModuleEntry = ModuleContent & {
  /** Where in the waste chain this module operates (editorial framing of PDF p.4). */
  stage: string;
  /** One-line headline used on the module detail page. */
  lead: string;
  features: ContentItem[];
};

export type ModulesSectionContent = ModulesContent & {
  modules: ModuleEntry[];
  labels: {
    moduleCount: string;
    capabilityCount: string;
    capabilities: string;
    stage: string;
    module: string;
    of: string;
    viewModule: string;
    allModules: string;
    previous: string;
    next: string;
    pager: string;
    breadcrumb: string;
    featuresHeading: string;
    ctaTitle: string;
    ctaBody: string;
    indexLabel: string;
  };
};

export const modulesContent = {
  id: 'modules',
  eyebrow: 'ONE CONNECTED PLATFORM',
  title: 'Seven modules. End-to-end oversight.',
  description:
    'From the QR code on a household gate to the weighbridge, the processing plant and the landfill, each IWMS module covers one link in the municipal waste chain — and every module reports into the same platform.',
  source: {
    pages: [4, 6, 8, 10, 12, 14, 16, 18],
  },
  items: [],
  labels: {
    moduleCount: 'modules',
    capabilityCount: 'capabilities',
    capabilities: 'Capabilities',
    stage: 'Stage',
    module: 'Module',
    of: 'of',
    viewModule: 'Open module page',
    allModules: 'All modules',
    previous: 'Previous module',
    next: 'Next module',
    pager: 'Module navigation',
    breadcrumb: 'Breadcrumb',
    featuresHeading: 'What the module does',
    ctaTitle: 'See this module working on your city’s data.',
    ctaBody:
      'IWMS is rolled out in phases over twelve months. We can walk your team through this module and how it connects to the rest of the platform.',
    indexLabel: 'IWMS modules',
  },
  modules: [
    {
      slug: 'collection-verification',
      title: 'Collection & Verification',
      stage: 'At the doorstep',
      lead: 'Every pickup, verified at the household and bin level.',
      summary:
        'Validate waste pickups through QR codes, event logging and citizen notifications.',
      source: {
        pages: [4, 5, 6],
      },
      features: [
        {
          title: 'QR tagging for verification',
          body: 'QR codes for households, bins, gated communities, apartments, industries and institutions.',
        },
        {
          title: 'Pickup event logging',
          body: 'Record GPS location, timestamp, waste image and weighment. Create tamper-proof digital logs; track vehicles live and travel time per zone.',
        },
        {
          title: 'Exception handling',
          body: 'Flag locked houses, no waste and damaged bins; enable reporting and corrective action.',
        },
        {
          title: 'Resident notifications',
          body: 'SMS/app alerts 15 minutes before vehicle arrival improve citizen participation and readiness.',
        },
        {
          title: 'Body cameras for operators',
          body: 'Enhance transparency, safety and fraud prevention; provide dispute-resolution evidence.',
        },
        {
          title: 'Asset management',
          body: 'Capex: vehicles, bins and equipment. Opex: fuel, maintenance and staff. Attendance: daily workforce tracking.',
        },
      ],
    },
    {
      slug: 'd2d-logistics',
      title: 'D2D Collection & Logistics Management',
      stage: 'On the road',
      lead: 'Every collection vehicle, visible on one map.',
      summary:
        'Monitor vehicles with GPS, route optimisation, fuel tracking and automated fraud prevention.',
      source: {
        pages: [4, 7, 8],
      },
      features: [
        {
          title: 'GPS-enabled live tracking',
          body: 'Real-time vehicle visibility on a map; geofencing to prevent unauthorised movement.',
        },
        {
          title: 'Route planning & monitoring',
          body: 'Optimised route allocation and adherence tracking with deviation alerts.',
        },
        {
          title: 'Diesel consumption monitoring',
          body: 'Track fuel usage and efficiency, prevent misuse and support cost control.',
        },
        {
          title: 'Vehicle capacity & utilisation reports',
          body: 'Monitor load against actual capacity and support efficient fleet utilisation.',
        },
        {
          title: 'Ring fencing & fraud prevention',
          body: 'Automatically detect vehicle movement; verify vehicle photos and CCTV for accountability.',
        },
      ],
    },
    {
      slug: 'resource-management',
      title: 'Resource Management',
      stage: 'Across the workforce',
      lead: 'The right crew on the right route, on record.',
      summary:
        'Digitally manage attendance, route assignments and performance reports.',
      source: {
        pages: [4, 9, 10],
      },
      features: [
        {
          title: 'Digital attendance',
          body: 'Photo, QR or biometric attendance logging prevents proxy attendance and manual errors.',
        },
        {
          title: 'Crew assignment',
          body: 'Allocate staff to routes and tasks to optimise workforce utilisation.',
        },
        {
          title: 'Performance tracking',
          body: 'Measure route coverage, stops and citizen service ratings; identify top performers and gaps.',
        },
        {
          title: 'Reports & exceptions',
          body: 'Generate daily and monthly attendance reports; highlight absentees, missed pickups and late logins.',
        },
      ],
    },
    {
      slug: 'weighbridge-management',
      title: 'Weighbridge Management',
      stage: 'At the weighbridge',
      lead: 'What was collected, reconciled against what arrived.',
      summary:
        'Track quantities through IoT sensors, weighbridges and reconciliation alerts.',
      source: {
        pages: [4, 11, 12],
      },
      features: [
        {
          title: 'IoT-enabled load cells',
          body: 'Monitor vehicle waste weights in real time with accurate collection and logging.',
        },
        {
          title: 'Weighbridge integration',
          body: 'Connect transfer stations to digital weighbridges for seamless weighment data flow.',
        },
        {
          title: 'Cross-verification',
          body: 'Compare per-stop collected waste with vehicle gross weighment to ensure consistency and prevent manipulation.',
        },
        {
          title: 'Discrepancy alerts & audit logs',
          body: 'Instant notifications for weight mismatches and a complete digital accountability trail.',
        },
        {
          title: 'Calibration monitoring',
          body: 'Calibration schedule alerts and certificate-renewal reminders for weighbridge compliance.',
        },
      ],
    },
    {
      slug: 'waste-management',
      title: 'Waste Management (Processing)',
      stage: 'At the processing plant',
      lead: 'Each waste stream logged and routed to the right treatment.',
      summary:
        'Log and manage waste segregation and processing across treatment facilities.',
      source: {
        pages: [4, 13, 14],
        note: 'PDF p.14 also says designated low-lying areas. Public copy follows PROMPT.md scientific-landfill requirement; source discrepancy recorded for review.',
      },
      features: [
        {
          title: 'Segregation logging',
          body: 'Track wet, dry, hazardous, sanitary and glass waste.',
        },
        {
          title: 'Processing routes',
          body: 'Organic → Composting / Biomethanation; Dry → MRF (Material Recovery Facility) / Pyrolysis; Mixed → Segregation & Composting.',
        },
        {
          title: 'Disposal & reconciliation',
          body: 'Record disposal flow and aggregate data for reconciliation and compliance reports.',
        },
        {
          title: 'Rejects: definition and examples',
          body: 'Non-combustible, non-compostable, non-reusable, non-recyclable items. Examples: broken commodes, construction debris, inerts and ceramic waste.',
        },
        {
          title: 'Handling protocol',
          body: 'Divert rejects to scientifically managed landfills and keep recyclable and compostable streams free from contamination.',
        },
      ],
    },
    {
      slug: 'landfill-management',
      title: 'Landfill Management',
      stage: 'At the landfill',
      lead: 'Safe, transparent and compliant landfill operations.',
      summary:
        'Support safe, transparent operations through tracking, analytics, safety and reporting.',
      source: {
        pages: [4, 15, 16],
      },
      features: [
        {
          title: 'Waste inflow tracking',
          body: 'Monitor all incoming waste, including processing rejects and mixed/unsegregated waste, integrated with weighbridge data.',
        },
        {
          title: 'Analytics dashboards',
          body: 'Visualise inflow trends, balance life, forecast capacity and diversion ratios for data-driven planning.',
        },
        {
          title: 'Fire & safety management',
          body: 'Surveillance cameras, thermal sensors and suppression systems monitor hotspots and initiate alerts to prevent accidents and fires.',
        },
        {
          title: 'Informal activity monitoring',
          body: 'Detect waste pickers, animals, birds and unsafe activities at landfill sites.',
        },
        {
          title: 'CCTV + AI and drone surveys',
          body: 'Use aerial monitoring to identify unauthorised dumping and unsafe human activity.',
        },
        {
          title: 'Compliance & reporting',
          body: 'Support SWM Rules, environmental norms and safety standards; generate structured authority reports.',
        },
        {
          title: 'Landfill capacity',
          body: 'Track safe capacity before closure using engineered volume, compaction and cover requirements. Update using weighbridge, drone/GIS and 3D modelling data. Show utilisation, balance life and forecast scenarios to plan cells, expansion or diversion.',
        },
      ],
    },
    {
      slug: 'grievance-redressal',
      title: 'Grievance Redressal Management',
      stage: 'With citizens',
      lead: 'Every complaint heard, routed and resolved on record.',
      summary:
        'Capture complaints and feedback with escalation workflows and analytics.',
      source: {
        pages: [4, 17, 18],
      },
      features: [
        {
          title: 'Citizen portal & mobile app',
          body: 'Allow citizens to raise complaints anytime through a transparent communication channel.',
        },
        {
          title: 'Feedback collection',
          body: 'Collect 1–5-star ratings after each pickup to monitor service quality.',
        },
        {
          title: 'Escalation matrix',
          body: 'Automatically route unresolved complaints to higher authorities for accountability and timely resolution.',
        },
        {
          title: 'Analytics-driven insights',
          body: 'Track complaint trends, response times and feedback patterns for service improvements.',
        },
      ],
    },
  ],
} satisfies ModulesSectionContent;
