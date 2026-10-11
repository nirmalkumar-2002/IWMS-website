import type { SectionContent } from './types';

/** One moment in a resident's service story, told from both sides. */
export type CitizenBeat = {
  moment: string;
  resident: string;
  city: string;
  screen: CitizenScreenId;
};

export type CitizenScreenId = 'alert' | 'rating' | 'complaint' | 'escalation';

/** Phone illustration screens. Every value is demo data, never live output. */
export type CitizenScreen = {
  id: CitizenScreenId;
  name: string;
  heading: string;
  lines: { label: string; value: string }[];
};

export type CitizenContent = SectionContent & {
  storyTitle: string;
  sides: { resident: string; city: string };
  beats: CitizenBeat[];
  screens: CitizenScreen[];
  governance: { eyebrow: string; title: string };
  labels: {
    phone: string;
    illustration: string;
    screenPicker: string;
    previous: string;
    next: string;
    ratingHint: string;
    ratingValue: string;
    story: string;
  };
};

export const citizenContent = {
  id: 'citizen',
  eyebrow: 'Citizen interface and governance',
  title: 'Residents informed. Complaints answered.',
  description:
    'A citizen portal and mobile app give residents a transparent channel to the service team: alerts before collection, a rating after every pickup, and complaints that are routed upward automatically if they stay unresolved.',
  source: {
    pages: [2, 3, 6, 18, 21],
  },
  storyTitle: 'One collection, seen from both sides',
  sides: {
    resident: 'Resident',
    city: 'Service team',
  },
  beats: [
    {
      moment: '15 minutes before',
      resident:
        'An SMS or app alert says the collection vehicle is on its way, so waste is ready at the door.',
      city: 'Advance alerts improve citizen participation and readiness.',
      screen: 'alert',
    },
    {
      moment: 'After pickup',
      resident: 'The resident rates the pickup from 1 to 5 stars.',
      city: 'Ratings after each pickup help monitor service quality and feed crew performance tracking.',
      screen: 'rating',
    },
    {
      moment: 'When a pickup is missed',
      resident: 'A complaint can be raised anytime through the portal or app.',
      city: 'The help desk handles complaints and missed pickups through a ticketed workflow.',
      screen: 'complaint',
    },
    {
      moment: 'If it stays unresolved',
      resident:
        'The portal stays a transparent channel while the complaint is resolved.',
      city: 'The escalation matrix routes unresolved complaints to higher authorities automatically. Analytics track complaint trends, response times and feedback patterns.',
      screen: 'escalation',
    },
  ],
  screens: [
    {
      id: 'alert',
      name: 'Arrival alert',
      heading: 'Vehicle arriving in 15 min',
      lines: [
        { label: 'Ward', value: 'Demo Ward 00' },
        { label: 'Service', value: 'Door-to-door collection' },
        { label: 'Reminder', value: 'Keep wet and dry waste separate' },
      ],
    },
    {
      id: 'rating',
      name: 'Pickup rating',
      heading: 'Rate your pickup',
      lines: [{ label: 'Pickup', value: 'Verified by QR scan' }],
    },
    {
      id: 'complaint',
      name: 'Complaint',
      heading: 'Raise a complaint',
      lines: [
        { label: 'Category', value: 'Missed pickup' },
        { label: 'Ticket', value: 'DEMO-0000' },
        { label: 'Assigned to', value: 'Help desk' },
      ],
    },
    {
      id: 'escalation',
      name: 'Escalation status',
      heading: 'Escalation status',
      lines: [
        { label: 'Raised', value: 'Logged' },
        { label: 'Help desk', value: 'Unresolved' },
        { label: 'Escalated', value: 'Higher authority' },
      ],
    },
  ],
  governance: {
    eyebrow: 'Governance',
    title: 'Tools for the people who run the service.',
  },
  items: [
    {
      title: 'Help desk',
      body: 'Handles complaints and missed pickups.',
    },
    {
      title: 'Escalation matrix',
      body: 'Automatically routes unresolved complaints to higher authorities for accountability and quicker resolution.',
    },
    {
      title: 'AI-based citizen ratings',
      body: 'AI-based ratings on segregation and compliance.',
    },
    {
      title: 'Fines and enforcement',
      body: 'Penalties for violators and repeat offenders.',
    },
    {
      title: 'Visitor management',
      body: 'Tracks external entries.',
    },
  ],
  labels: {
    phone: 'Citizen app illustration',
    illustration: 'Illustration with demo data. Not a live screen.',
    screenPicker: 'Choose an app screen to preview',
    previous: 'Previous screen',
    next: 'Next screen',
    ratingHint: 'Demo rating: 4 out of 5 stars',
    ratingValue: '4 / 5',
    story: 'Service story, step by step',
  },
} satisfies CitizenContent;
