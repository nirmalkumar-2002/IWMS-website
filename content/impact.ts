import type { SectionContent } from './types';
export const impactContent = {
  id: 'impact',
  eyebrow: 'BENEFITS OF IWMS',
  title: 'Visibility that supports better decisions.',
  description:
    'Accountability, efficiency and transparency across waste management.',
  source: {
    pages: [19],
  },
  items: [
    {
      title: 'Accountability',
      body: 'Live data on time, staff, fuel and costs.',
      value: '{{IMPACT_STAT_1}}',
    },
    {
      title: 'Efficiency',
      body: 'End-to-end waste collection with checks and balances.',
      value: '{{IMPACT_STAT_2}}',
    },
    {
      title: 'Transparency',
      body: 'Prevent waste leakage and support compliance.',
      value: '{{IMPACT_STAT_3}}',
    },
    {
      title: 'Reduce, Reuse, Recycle',
      body: 'Support segregation, recovery and recycling.',
      value: '{{IMPACT_STAT_4}}',
    },
  ],
} satisfies SectionContent;
