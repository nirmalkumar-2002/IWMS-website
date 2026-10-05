import type { SectionContent } from './types';
export const fAQContent = {
  id: 'faq',
  eyebrow: 'YOUR QUESTIONS',
  title: 'Plan your IWMS implementation.',
  description: 'Confirm the deployment scope with the IWMS team.',
  source: {
    pages: [3, 6, 20, 24],
  },
  items: [
    {
      title: 'Can IWMS connect with our existing ICCC?',
      body: 'The deck describes ICCC integration. Interfaces and integration scope must be confirmed for your deployment.',
    },
    {
      title: 'Who owns the data and where is it hosted?',
      body: '{{FAQ_DATA_OWNERSHIP_HOSTING}}',
    },
    {
      title: 'Can field staff work offline?',
      body: '{{FAQ_OFFLINE_MODE}}',
    },
    {
      title: 'Are Tamil and other regional languages supported?',
      body: '{{FAQ_REGIONAL_LANGUAGES}}',
    },
    {
      title: 'What training and handholding are included?',
      body: '{{FAQ_TRAINING}}',
    },
    {
      title: 'Can you support tender or DPR documentation?',
      body: '{{FAQ_TENDER_SUPPORT}}',
    },
    {
      title: 'Can we start with a pilot ward?',
      body: '{{FAQ_PILOT_WARD}}',
    },
    {
      title: 'What is the hardware and software scope?',
      body: 'The deck includes web/mobile software, QR codes, GPS, sensors, weighbridges and cameras. Deployment hardware and commercial scope need confirmation.',
    },
    {
      title: 'What is the implementation timeline?',
      body: 'The deck proposes six phases over 12 months, with faster rollout subject to manpower availability.',
    },
  ],
  labels: {
    pending:
      'Please discuss this requirement with the IWMS team; the product deck does not specify it.',
  },
} satisfies SectionContent;
