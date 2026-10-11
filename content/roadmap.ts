import type { ContentItem, SectionContent } from './types';

/** One implementation phase; start/end are months from project kick-off. */
export type RoadmapPhase = ContentItem & {
  period: string;
  start: number;
  end: number;
  bullets: string[];
};

export type RoadmapContent = SectionContent & {
  items: RoadmapPhase[];
  totalMonths: number;
  labels: {
    timelineLabel: string;
    phaseLabel: string;
    monthLabel: string;
    outcomeKicker: string;
    outcome: string;
    outcomeNote: string;
  };
};

export const roadmapContent = {
  id: 'roadmap',
  eyebrow: 'PHASED IMPLEMENTATION',
  title: 'A clear 12-month rollout.',
  description:
    'Six phases, sequenced from the weighbridge outward: measure inflow first, then bring processing, the landfill, the fleet, billing and citizen grievances onto the platform.',
  source: {
    pages: [24],
  },
  totalMonths: 12,
  items: [
    {
      title: 'Weighbridge Monitoring System',
      period: 'Month 0–1',
      start: 0,
      end: 1,
      body: 'Accurate inflow measurement.',
      bullets: ['Integrated with landfill and processing data'],
    },
    {
      title: 'Processing System Setup',
      period: 'Month 1–2',
      start: 1,
      end: 2,
      body: 'Facility mapping.',
      bullets: ['Segregation of organic, dry and mixed waste'],
    },
    {
      title: 'Landfill Management Module',
      period: 'Month 2–3',
      start: 2,
      end: 3,
      body: 'Inflow tracking and analytics dashboards.',
      bullets: ['Landfill capacity', 'Fire and safety', 'Compliance'],
    },
    {
      title: 'GPS Tracking & QR Code Rollout',
      period: 'Month 3–6',
      start: 3,
      end: 6,
      body: 'GPS tracking and route optimisation.',
      bullets: [
        'QR codes for households, apartments, bulk waste generators and bins',
      ],
    },
    {
      title: 'User Charge',
      period: 'Month 6–9',
      start: 6,
      end: 9,
      body: 'Integrated billing.',
      bullets: ['Online and offline payment options'],
    },
    {
      title: 'Grievance Redressal Mechanism',
      period: 'Month 9–12',
      start: 9,
      end: 12,
      body: 'Citizen app and portal.',
      bullets: ['Ticketing', 'Escalation matrix'],
    },
  ],
  labels: {
    timelineLabel: '12-month implementation timeline',
    phaseLabel: 'Phase',
    monthLabel: 'Month',
    outcomeKicker: 'Outcome · Month 12',
    outcome: 'Full IWMS operational in 12 months.',
    outcomeNote:
      'With scalability for faster rollout if manpower is available.',
  },
} satisfies RoadmapContent;
