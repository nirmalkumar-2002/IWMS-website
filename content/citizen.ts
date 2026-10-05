import type { SectionContent } from './types';
export const citizenContent = {
  id: 'citizen',
  eyebrow: 'CITIZEN INTERFACE & GOVERNANCE',
  title: 'Keep residents informed and heard.',
  description:
    'Notifications, pickup feedback and escalation workflows connect citizens with service teams.',
  source: {
    pages: [6, 18, 21],
  },
  items: [
    {
      title: 'Help desk',
      body: 'Handle complaints and missed pickups.',
    },
    {
      title: 'Escalation matrix',
      body: 'Automatically route unresolved complaints to higher authorities.',
    },
    {
      title: 'AI-based segregation ratings',
      body: 'Rate segregation and compliance.',
    },
    {
      title: 'Fines & enforcement',
      body: 'Penalties for violations and repeat offenders.',
    },
    {
      title: 'Visitor management',
      body: 'Track external entries.',
    },
  ],
  labels: {
    arrival: 'Vehicle arriving in 15 min',
    rating: 'Rate your pickup',
    complaint: 'Raise a complaint',
    status: 'Escalation status',
    ratingHint: 'Choose a rating from 1 to 5 stars',
    pause: 'Pause screen rotation',
    resume: 'Resume screen rotation',
    next: 'Next screen',
    previous: 'Previous screen',
  },
} satisfies SectionContent;
