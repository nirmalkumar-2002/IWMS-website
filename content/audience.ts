import type { ContentItem, SectionContent } from './types';

/** One stakeholder group. `focus` lists deck capabilities most relevant to them; `pages` cites the deck. */
export type AudienceItem = ContentItem & {
  role: string;
  focus: string[];
  pages: number[];
};

export type AudienceContent = Omit<SectionContent, 'items'> & {
  items: AudienceItem[];
  closing: { label: string; statement: string; pages: number[] };
  labels: {
    listLabel: string;
    focusLabel: string;
    sourcePrefix: string;
  };
};

// Stakeholder groups are inferred from the deck's capabilities (ICCC, SWM Rules
// reporting, fleet/crew operations). No named clients or deployments are implied.
export const audienceContent = {
  id: 'audience',
  eyebrow: 'Who it is for',
  title: 'Built for the people accountable for a city’s waste.',
  description:
    'One shared record for municipal leadership, command-centre teams, oversight departments and the operators who run collection, processing and landfill sites.',
  source: {
    pages: [2, 3, 6, 8, 10, 12, 16, 18, 22, 24],
  },
  items: [
    {
      title: 'Municipal corporations and ULBs',
      role: 'Commissioners, SWM cells and ward teams',
      body: 'Verify door-to-door collection at household and bin level, reconcile weighbridge quantities and resolve citizen grievances from a single, traceable record.',
      focus: [
        'QR-verified pickups',
        'Weighbridge reconciliation',
        'Grievance escalation',
      ],
      pages: [6, 12, 18],
    },
    {
      title: 'Smart City SPVs and ICCC teams',
      role: 'Command-centre operators and analysts',
      body: 'Bring field operations into the Integrated Command and Control Centre with live vehicle tracking, exception alerts and tamper-proof digital logs.',
      focus: ['ICCC integration', 'GPS live tracking', 'Exception alerts'],
      pages: [3, 6, 8],
    },
    {
      title: 'State departments and oversight bodies',
      role: 'Programme, monitoring and compliance teams',
      body: 'Monitor segregation at source, receive structured reports aligned with the Solid Waste Management Rules and follow a phased, 12-month implementation plan.',
      focus: [
        'SWM Rules reporting',
        'Segregation monitoring',
        'Phased rollout',
      ],
      pages: [16, 22, 24],
    },
    {
      title: 'Concessionaires and private operators',
      role: 'Fleet, plant and landfill managers',
      body: 'Coordinate vehicles and crews, track diesel use and capacity utilisation, and run processing and landfill operations with a complete audit trail.',
      focus: [
        'Fleet and fuel monitoring',
        'Digital attendance',
        'Landfill capacity',
      ],
      pages: [8, 10, 16],
    },
  ],
  closing: {
    label: 'Common ground',
    statement:
      'End-to-end traceability of waste movement — from the doorstep to the landfill.',
    pages: [2],
  },
  labels: {
    listLabel: 'Stakeholders IWMS is designed for',
    focusLabel: 'Most relevant capabilities',
    sourcePrefix: 'Deck p.',
  },
} satisfies AudienceContent;
