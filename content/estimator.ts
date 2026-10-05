import type { SectionContent } from './types';
export const estimatorContent = {
  id: 'estimator',
  eyebrow: 'LEAKAGE & SAVINGS',
  title: 'Explore an indicative assessment.',
  description:
    'Share your city’s operating inputs to support a detailed assessment.',
  source: {
    pages: [8, 19, 23],
    note: 'The PDF provides no calculation formula or improvement coefficients. Do not invent savings.',
  },
  items: [
    {
      title: 'Households',
      body: 'Number of households served.',
    },
    {
      title: 'Vehicles',
      body: 'Number of collection vehicles.',
    },
    {
      title: 'Tonnes per day',
      body: 'Daily waste handled.',
    },
    {
      title: 'User-charge collection',
      body: 'Current collection percentage.',
    },
  ],
  labels: {
    disclaimer: 'Indicative only.',
    cta: 'Get a detailed assessment for your city',
    fuel: 'Fuel efficiency',
    coverage: 'Collection coverage',
    recovery: 'User-charge recovery',
    pending: 'Assessment assumptions await confirmation.',
  },
} satisfies SectionContent;
