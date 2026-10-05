import type { SectionContent } from './types';
export const financeContent = {
  id: 'finance',
  eyebrow: 'FINANCIAL SUSTAINABILITY',
  title: 'Support sustainable waste services.',
  description:
    'The deck outlines user charges, fines and government subsidies as funding mechanisms.',
  source: {
    pages: [23],
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
      body: 'Upfront spending followed by later reimbursement, as described in the deck.',
    },
  ],
  labels: {
    note: 'Funding model described in the product deck; applicable charges and funding arrangements require confirmation.',
  },
} satisfies SectionContent;
