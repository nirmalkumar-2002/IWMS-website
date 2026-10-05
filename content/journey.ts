import type { SectionContent } from './types';
export const journeyContent = {
  id: 'how-it-works',
  eyebrow: 'FOLLOW THE WASTE',
  title: 'One journey. A complete digital record.',
  description:
    'Connect collection evidence with weighment, processing and disposal.',
  source: {
    pages: [3, 12, 14, 16],
  },
  items: [
    {
      title: 'Weighbridge cross-verification',
      body: 'Compare per-stop weights with gross weighment; flag discrepancies and track calibration reminders.',
    },
    {
      title: 'Processing routes',
      body: 'Organic → Composting / Biomethanation. Dry → MRF / Pyrolysis. Mixed → Segregation & Composting.',
    },
    {
      title: 'Rejects handling',
      body: 'Non-combustible, non-compostable, non-reusable and non-recyclable rejects go to scientifically managed landfills.',
    },
    {
      title: 'Landfill visibility',
      body: 'Track inflow, balance life, thermal hotspots, drone/GIS surveys and informal activity.',
    },
    {
      title: 'Command centre',
      body: 'Connect the operational record to the city’s ICCC dashboard.',
    },
  ],
} satisfies SectionContent;
