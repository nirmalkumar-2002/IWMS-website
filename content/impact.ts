import type { SectionContent, Source } from './types';

/** One outcome from the deck's "Benefits of IWMS" page, with the platform mechanisms that produce it. */
export type ImpactOutcome = {
  index: string;
  title: string;
  body: string;
  /** Platform capabilities from the deck that make the outcome observable. */
  bullets: string[];
  source: Source;
};

export type ImpactContent = SectionContent & {
  outcomes: ImpactOutcome[];
  labels: {
    mechanismsHeading: string;
    listLabel: string;
    note: string;
    sourcePrefix: string;
  };
};

/*
 * Outcomes are described qualitatively. The previous {{IMPACT_STAT_1..4}} placeholders were removed:
 * the deck contains no measured results, and no deployment metrics are approved (see PLACEHOLDERS.md).
 */
export const impactContent = {
  id: 'impact',
  eyebrow: 'Benefits of IWMS',
  title: 'What changes when every pickup leaves a record.',
  description:
    'IWMS turns daily collection, weighment and disposal into evidence a city can act on. These are the four outcomes the platform is built to support.',
  source: {
    pages: [6, 8, 10, 12, 14, 19, 22],
  },
  items: [
    {
      title: 'Accountability',
      body: 'Live data on time, staff, fuel and costs.',
    },
    {
      title: 'Efficiency',
      body: 'End-to-end waste collection with checks and balances.',
    },
    {
      title: 'Transparency',
      body: 'Prevents waste leakage and supports compliance.',
    },
    {
      title: 'Reduce, reuse, recycle',
      body: 'Supports segregation, recovery and recycling.',
    },
  ],
  outcomes: [
    {
      index: '01',
      title: 'Accountability',
      body: 'Live data on time, staff, fuel and costs — so responsibility for each route, shift and vehicle is visible, not assumed.',
      bullets: [
        'Photo, QR or biometric attendance that prevents proxy entries',
        'Diesel consumption monitoring to prevent misuse',
        'Opex tracking across fuel, maintenance and staff',
      ],
      source: { pages: [6, 8, 10, 19] },
    },
    {
      index: '02',
      title: 'Efficiency',
      body: 'End-to-end waste collection with checks and balances, from the first household stop to the final weighment.',
      bullets: [
        'Optimised route allocation with alerts for deviations',
        'Vehicle load compared against actual capacity',
        'Crews allocated to specific routes and tasks',
      ],
      source: { pages: [8, 10, 19] },
    },
    {
      index: '03',
      title: 'Transparency',
      body: 'Prevents waste leakage and supports compliance with a digital trail that can be audited.',
      bullets: [
        'Tamper-proof pickup logs with GPS location, timestamp and image',
        'Per-stop collection cross-verified against weighbridge gross weight',
        'Automated, structured reports for authorities',
      ],
      source: { pages: [6, 12, 16, 19, 22] },
    },
    {
      index: '04',
      title: 'Reduce, reuse, recycle',
      body: 'Segregation is logged at source, so every stream can reach the right facility.',
      bullets: [
        'Wet, dry, hazardous, sanitary and glass waste tracked separately',
        'Organic waste to composting or biomethanation; dry waste to material recovery',
        'Rejects kept out of recyclable and compostable streams',
      ],
      source: { pages: [14, 19] },
    },
  ],
  labels: {
    mechanismsHeading: 'How IWMS makes it visible',
    listLabel: 'Outcomes IWMS is designed to support',
    note: 'Outcomes are described from the IWMS product deck. Measured results depend on each city’s baseline and rollout, and are not claimed here.',
    sourcePrefix: 'Deck p.',
  },
} satisfies ImpactContent;
