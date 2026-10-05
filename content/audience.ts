import type { SectionContent } from './types';
export const audienceContent = {
  id: 'audience',
  eyebrow: 'WHO IT IS FOR',
  title: 'Built around public-service outcomes.',
  description:
    'A shared view for municipal leadership, oversight teams and waste operators.',
  source: {
    pages: [2, 3, 19, 22, 24],
  },
  items: [
    {
      title: 'Municipal Corporations',
      body: 'Track service delivery, reconcile waste quantities and monitor citizen complaints.',
    },
    {
      title: 'Smart City SPVs',
      body: 'Connect field operations with ICCC oversight, exception alerts and digital records.',
    },
    {
      title: 'State Departments',
      body: 'Support authority reporting, compliance monitoring and phased implementation.',
    },
    {
      title: 'Private Operators',
      body: 'Coordinate fleets and crews, track processing flows and manage operating costs.',
    },
  ],
} satisfies SectionContent;
