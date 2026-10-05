import type { SectionContent } from './types';
export const roadmapContent = {
  id: 'roadmap',
  eyebrow: 'PHASED IMPLEMENTATION',
  title: 'A clear 12-month rollout.',
  description: 'Build the platform in six operational phases.',
  source: {
    pages: [24],
  },
  items: [
    {
      title: 'Phase 1 · 0–1 month',
      body: 'Weighbridge Monitoring System: accurate inflow measurement, integrated with landfill and processing data.',
    },
    {
      title: 'Phase 2 · Month 1–2',
      body: 'Processing System Setup: facility mapping and segregation of organic, dry and mixed waste.',
    },
    {
      title: 'Phase 3 · Month 2–3',
      body: 'Landfill Management Module: inflow tracking, analytics dashboards, landfill capacity, fire and safety, compliance.',
    },
    {
      title: 'Phase 4 · Month 3–6',
      body: 'GPS Tracking & Route Optimisation; QR code rollout for households, apartments, bulk waste generators and bins.',
    },
    {
      title: 'Phase 5 · Month 6–9',
      body: 'User Charge: integrated billing and online/offline payment options.',
    },
    {
      title: 'Phase 6 · Month 9–12',
      body: 'Grievance Redressal Mechanism: citizen app/portal, ticketing and escalation matrix.',
    },
  ],
  labels: {
    outcome:
      'Full IWMS operational in 12 months, with scalability for faster rollout if manpower is available.',
  },
} satisfies SectionContent;
