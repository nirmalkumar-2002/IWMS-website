import type { SectionContent } from './types';

/** One technology acting at a custody stage. `captures` lists the evidence it records (deck wording). */
export type TechnologyItem = {
  title: string;
  body: string;
  captures: string[];
};

/** A hand-off point on the chain of custody, from doorstep to landfill. */
export type CustodyStage = {
  index: string;
  place: string;
  summary: string;
  technologies: TechnologyItem[];
};

export type TechnologiesContent = SectionContent & {
  stages: CustodyStage[];
  terminal: { label: string; title: string; body: string };
  labels: {
    chain: string;
    captures: string;
    stageList: string;
  };
};

export const technologiesContent = {
  id: 'technologies',
  eyebrow: 'Key technologies',
  title: 'A chain of custody, from doorstep to landfill.',
  description:
    'IWMS brings together QR verification, GPS-tracked vehicles, IoT load cells and weighbridges, smart bin sensors, CCTV and thermal monitoring. Each one records evidence at the point where waste changes hands, so its movement can be traced end to end.',
  source: {
    pages: [2, 3, 6, 8, 12, 16, 20],
  },
  // Flat list kept for any consumer that expects SectionContent.items.
  items: [
    {
      title: 'QR codes',
      body: 'Pickup verification at household and bin level.',
    },
    {
      title: 'GPS tracking',
      body: 'Route optimisation, diesel usage and unauthorised-movement monitoring.',
    },
    {
      title: 'Smart bin sensors',
      body: 'Fill-level and weight monitoring with automated alerts.',
    },
    {
      title: 'IoT load cells and weighbridges',
      body: 'Real-time weight capture and digital weighment integration.',
    },
    {
      title: 'Thermal cameras',
      body: 'Fire safety and landfill hotspot detection.',
    },
    {
      title: 'CCTV + AI with drone/GIS',
      body: 'Site monitoring and informal-activity tracking.',
    },
    {
      title: 'Body cameras',
      body: 'Operator transparency, safety and dispute-resolution evidence.',
    },
  ],
  stages: [
    {
      index: '01',
      place: 'Doorstep',
      summary: 'Every pickup is verified and logged where it happens.',
      technologies: [
        {
          title: 'QR codes',
          body: 'Tags for households, bins, gated communities, apartments, industries and institutions validate each pickup.',
          captures: ['GPS location', 'Timestamp', 'Waste image'],
        },
        {
          title: 'Smart bin sensors',
          body: 'Fill-level and weight monitoring raises automated alerts.',
          captures: ['Fill level', 'Weight', 'Alerts'],
        },
        {
          title: 'Body cameras',
          body: 'Operator-worn cameras support transparency, safety and fraud prevention.',
          captures: ['Dispute-resolution evidence'],
        },
      ],
    },
    {
      index: '02',
      place: 'Route',
      summary: 'Vehicles stay visible and within their assigned area.',
      technologies: [
        {
          title: 'GPS tracking',
          body: 'Live vehicle positions on a map, optimised routes and alerts when a vehicle deviates.',
          captures: ['Live location', 'Geo-fence breaches', 'Diesel usage'],
        },
        {
          title: 'Vehicle photo and CCTV verification',
          body: 'Auto-detection of vehicle movement, with photo and CCTV verification for accountability.',
          captures: ['Movement events', 'Vehicle images'],
        },
      ],
    },
    {
      index: '03',
      place: 'Weighbridge',
      summary: 'What was collected is reconciled against what arrives.',
      technologies: [
        {
          title: 'IoT load cells',
          body: 'Real-time monitoring of vehicle waste weights with accurate logging.',
          captures: ['Per-stop weight'],
        },
        {
          title: 'Digital weighbridges',
          body: 'Transfer-station weighbridges feed weighment data directly. Per-stop totals are compared with gross weighment, and mismatches raise instant alerts.',
          captures: ['Gross weighment', 'Discrepancy alerts'],
        },
      ],
    },
    {
      index: '04',
      place: 'Landfill',
      summary: 'Sites are watched for fire, dumping and unsafe activity.',
      technologies: [
        {
          title: 'Thermal cameras',
          body: 'Thermal sensors monitor hotspots and initiate alerts to help prevent landfill fires.',
          captures: ['Hotspot alerts'],
        },
        {
          title: 'CCTV + AI with drone/GIS',
          body: 'AI-based analytics and aerial drone surveys help identify unauthorised dumping and unsafe human activity.',
          captures: ['Site footage', 'Aerial surveys'],
        },
      ],
    },
  ],
  terminal: {
    label: 'Centralised oversight',
    title: 'Integrated Command and Control Centre',
    body: 'Web and app-based monitoring brings these records together, and IWMS connects with the city’s ICCC for centralised oversight.',
  },
  labels: {
    chain: 'Chain of custody: four stages from doorstep to landfill',
    captures: 'Records',
    stageList: 'Technologies by stage',
  },
} satisfies TechnologiesContent;
