import type { SectionContent } from './types';
export const problemContent = {
  id: 'problem',
  eyebrow: 'THE VISIBILITY GAP',
  title: 'What cities cannot see, they cannot fix.',
  description: 'Replace disconnected records with traceable waste operations.',
  source: {
    pages: [2, 6, 8, 10, 12, 16, 18],
  },
  items: [
    {
      title: 'Manual records and disputed trips',
      body: 'Manual logs and fake trip entries make service verification difficult.',
      value: '{{PROBLEM_STAT_1}}',
    },
    {
      title: 'Unreconciled weights',
      body: 'Compare collected waste with gross weighment to flag discrepancies.',
      value: '{{PROBLEM_STAT_2}}',
    },
    {
      title: 'Missed pickups and unanswered complaints',
      body: 'Track exceptions and unresolved service requests.',
      value: '{{PROBLEM_STAT_3}}',
    },
    {
      title: 'Limited landfill visibility',
      body: 'Connect inflow, capacity and safety monitoring.',
      value: '{{PROBLEM_STAT_4}}',
    },
  ],
} satisfies SectionContent;
