import type { SectionContent, Source } from './types';

/** A funding stream from the deck, with the IWMS capability that supports it. */
export type FinanceStream = {
  index: string;
  title: string;
  body: string;
  /** How the platform supports this stream, as described in the deck. */
  support: string;
  source: Source;
  /** Optional two-step sequence rendered as a hairline arrow. */
  flow?: { from: string; to: string; accessibleSummary: string };
};

export type FinanceContent = SectionContent & {
  streams: FinanceStream[];
  tariff: {
    label: string;
    low: string;
    lowLabel: string;
    high: string;
    highLabel: string;
    period: string;
    /** Full sentence for assistive technology; the visual scale is decorative. */
    accessibleSummary: string;
  };
  rollout: { label: string; phase: string; window: string; body: string };
  labels: {
    streamsLabel: string;
    supportHeading: string;
    note: string;
    sourcePrefix: string;
  };
};

export const financeContent = {
  id: 'finance',
  eyebrow: 'Financial sustainability',
  title: 'Cost recovery, built into the service.',
  description:
    'IWMS brings billing, enforcement and reporting into the same platform that records collection. The deck sets out three funding mechanisms for a sustainable waste service.',
  source: {
    pages: [21, 22, 23, 24],
  },
  items: [
    {
      title: 'User charges',
      body: '₹5–₹1,000 per month, from households to bulk users.',
    },
    {
      title: 'Revenue from fines',
      body: 'For non-compliance and violations.',
    },
    {
      title: 'Government subsidies',
      body: 'Upfront spending followed by later reimbursement.',
    },
  ],
  tariff: {
    label: 'User charges described in the deck',
    low: '₹5',
    lowLabel: 'Household',
    high: '₹1,000',
    highLabel: 'Bulk user',
    period: 'per month',
    accessibleSummary:
      'User charges range from ₹5 per month for households to ₹1,000 per month for bulk users.',
  },
  streams: [
    {
      index: '01',
      title: 'User charges',
      body: 'Monthly charges scaled from households to bulk users, including user charges for mixed waste.',
      support: 'Integrated billing with online and offline payment options.',
      source: { pages: [22, 23, 24] },
    },
    {
      index: '02',
      title: 'Revenue from fines',
      body: 'Penalties for non-compliance and violations, including repeat offenders.',
      support:
        'Fines and enforcement in the citizen interface, backed by monitoring of segregation at source.',
      source: { pages: [21, 22, 23] },
    },
    {
      index: '03',
      title: 'Government subsidies',
      body: 'Upfront spending by the city, followed by later reimbursement.',
      support:
        'Automated reporting and a complete digital audit trail for accountability.',
      source: { pages: [12, 22, 23] },
      flow: {
        from: 'Upfront spend',
        to: 'Later reimbursement',
        accessibleSummary: 'Upfront spend, followed by later reimbursement.',
      },
    },
  ],
  rollout: {
    label: 'In the 12-month roadmap',
    phase: 'Phase 5',
    window: 'Months 6–9',
    body: 'User charge: integrated billing with online and offline payment options.',
  },
  labels: {
    streamsLabel: 'Funding mechanisms',
    supportHeading: 'Where IWMS helps',
    note: 'Funding model as described in the product deck. Applicable charges, fines and subsidy arrangements are set by each city and require confirmation.',
    sourcePrefix: 'Deck p.',
  },
} satisfies FinanceContent;
