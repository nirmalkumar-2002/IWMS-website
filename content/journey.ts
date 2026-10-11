import type { ContentItem, SectionContent } from './types';

/** A processing route: one segregated stream and its treatment. */
export type JourneyFlow = { stream: string; treatment: string };

/** One handover in the waste journey and the evidence IWMS records there. */
export type JourneyStage = ContentItem & {
  /** Anchor suffix; the full id is `${section id}-${slug}`. */
  slug: string;
  /** Short place name used in the route index. */
  place: string;
  /** Data captured at this stage (rendered as the stage's record). */
  bullets: string[];
  flows?: JourneyFlow[];
  note?: { title: string; body: string };
  page: number[];
};

export type JourneyContent = SectionContent & {
  items: JourneyStage[];
  labels: {
    lede: string;
    indexLabel: string;
    stageLabel: string;
    recordsHeading: string;
    flowsHeading: string;
    flowStreamHeading: string;
    flowTreatmentHeading: string;
  };
};

export const journeyContent = {
  id: 'how-it-works',
  eyebrow: 'HOW IT WORKS · FOLLOW THE WASTE',
  title: 'One journey. A complete digital record.',
  description:
    'IWMS follows waste from the doorstep to the landfill. At every handover — crew, vehicle, weighbridge, plant, landfill — it captures evidence, and connects it all to the city’s command centre.',
  source: {
    pages: [3, 6, 8, 10, 12, 14, 16, 18, 22],
  },
  items: [
    {
      slug: 'doorstep',
      place: 'Doorstep',
      title: 'Every pickup is verified at the door.',
      body: 'QR codes tag households, bins, gated communities, apartments, industries and institutions. Residents receive an SMS or app alert 15 minutes before the collection vehicle arrives.',
      bullets: [
        'GPS location',
        'Timestamp',
        'Waste image',
        'Weighment',
        'Exceptions — locked house, no waste, damaged bin',
        'Operator body-camera evidence for disputes',
      ],
      page: [6],
    },
    {
      slug: 'route',
      place: 'On the route',
      title: 'Every vehicle runs on a known route.',
      body: 'GPS puts the whole fleet on a live map. Geo-fencing and ring-fencing flag unauthorised movement, and crews are assigned to routes with photo, QR or biometric attendance.',
      bullets: [
        'Live location and travel time per zone',
        'Route adherence and deviation alerts',
        'Diesel consumption and efficiency',
        'Load versus vehicle capacity',
        'Vehicle photo and CCTV verification',
        'Crew attendance and route coverage',
      ],
      page: [6, 8, 10],
    },
    {
      slug: 'weighbridge',
      place: 'Weighbridge',
      title: 'Every load is weighed and cross-checked.',
      body: 'Transfer stations connect to digital weighbridges and IoT-enabled load cells. Per-stop collected waste is compared with the vehicle’s gross weighment, so mismatches surface instantly.',
      bullets: [
        'Gross weighment',
        'Per-stop versus gross reconciliation',
        'Discrepancy alerts',
        'Complete digital audit trail',
        'Calibration schedule alerts',
        'Certificate renewal reminders',
      ],
      page: [12],
    },
    {
      slug: 'processing',
      place: 'Processing',
      title: 'Every stream is routed to its treatment.',
      body: 'Segregation is logged across wet, dry, hazardous, sanitary and glass categories, and each stream is sent to the right facility.',
      bullets: [
        'Segregation category',
        'Disposal flow',
        'Reconciliation and compliance reports',
      ],
      flows: [
        { stream: 'Organic', treatment: 'Composting / Biomethanation' },
        {
          stream: 'Dry',
          treatment: 'MRF (Material Recovery Facility) / Pyrolysis',
        },
        { stream: 'Mixed', treatment: 'Segregation & Composting' },
      ],
      page: [14],
    },
    {
      slug: 'landfill',
      place: 'Landfill',
      title: 'Rejects are diverted, tracked and accounted for.',
      body: 'Inflow to the landfill — including processing rejects and mixed waste — is integrated with weighbridge data, while capacity, fire safety and site activity are monitored continuously.',
      bullets: [
        'Inflow, integrated with weighbridge data',
        'Utilisation, balance life and forecast capacity',
        'Thermal hotspot and fire alerts',
        'CCTV with AI analytics and drone surveys',
        'Informal activity — rag pickers, animals, birds',
        'Structured compliance reports',
      ],
      note: {
        title: 'Rejects under SWM Rules',
        body: 'Non-combustible, non-compostable, non-reusable and non-recyclable items — such as broken commodes, construction debris, inerts and ceramic waste — go to scientifically managed landfills or designated low-lying areas, keeping recyclable and compostable streams uncontaminated.',
      },
      page: [14, 16],
    },
    {
      slug: 'command-centre',
      place: 'Command centre',
      title: 'The whole record reaches one command view.',
      body: 'Web and app monitoring tools connect to the city’s Integrated Command and Control Centre (ICCC) for centralised oversight, while citizens close the loop through the app or portal.',
      bullets: [
        'Citizen ratings (1–5 stars) after each pickup',
        'Complaints routed through an escalation matrix',
        'Complaint trends and response times',
        'Automated reporting for transparency and accountability',
      ],
      page: [3, 18, 22],
    },
  ],
  labels: {
    lede: 'From doorstep to landfill, every handover leaves evidence.',
    indexLabel: 'Stages of the waste journey',
    stageLabel: 'Stage',
    recordsHeading: 'What gets recorded',
    flowsHeading: 'Processing routes',
    flowStreamHeading: 'Stream',
    flowTreatmentHeading: 'Treatment',
  },
} satisfies JourneyContent;
