import type { SectionContent } from './types';

/**
 * FAQ answers wrapped in {{TOKEN}} are unconfirmed placeholders (see PLACEHOLDERS.md).
 * They are never published: the section shows `labels.pending` instead and must
 * omit them from any FAQ schema until the product team supplies an answer.
 * For confirmed answers, `value` holds the deck page reference(s) shown as the source.
 */
export type FAQContent = SectionContent & {
  labels: {
    pending: string;
    pendingTag: string;
    confirmedNote: string;
    contactPrompt: string;
    contactLink: string;
    sourcePrefix: string;
  };
};

/** True while an answer still holds a {{TOKEN}}; such answers must never be published or added to schema. */
export function isPendingAnswer(body: string): boolean {
  return /\{\{[A-Z0-9_]+\}\}/.test(body);
}

export const fAQContent = {
  id: 'faq',
  eyebrow: 'Your questions',
  title: 'Plan your IWMS implementation.',
  description:
    'Answers drawn from the IWMS product deck. Where the deck is silent, we say so — confirm the deployment scope with the IWMS team.',
  source: {
    pages: [2, 3, 6, 14, 18, 20, 22, 24],
  },
  items: [
    {
      title: 'How does IWMS verify that a pickup actually happened?',
      body: 'Households, bins, gated communities, apartments, industries and institutions carry QR codes. Each pickup event records GPS location, timestamp, a waste image and weighment, creating a tamper-proof digital log.',
      value: '6',
    },
    {
      title: 'Can IWMS connect with our existing ICCC?',
      body: 'The IWMS model connects with the Integrated Command and Control Centre (ICCC) for centralised oversight. Interfaces and integration scope must be confirmed for your deployment.',
      value: '3',
    },
    {
      title: 'Which waste streams does IWMS track?',
      body: 'Segregation logging covers wet, dry, hazardous, sanitary and glass waste. Organic waste is routed to composting or biomethanation, dry waste to a material recovery facility or pyrolysis, and mixed waste to segregation and composting.',
      value: '14',
    },
    {
      title: 'How are citizens involved?',
      body: 'Residents receive SMS or app alerts 15 minutes before the collection vehicle arrives, can rate each pickup from one to five stars, and can raise complaints through a citizen portal and mobile app with an escalation matrix.',
      value: '6, 18',
    },
    {
      title: 'Does IWMS support SWM Rules compliance?',
      body: 'IWMS is aligned with the Solid Waste Management Rules: it monitors segregation at source, supports user charges and fines for mixed waste, and automates reporting for transparency and accountability.',
      value: '22',
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
      body: 'The deck describes web and mobile software alongside QR codes, GPS, smart bin sensors, IoT load cells, weighbridges, CCTV and thermal cameras. Deployment hardware and commercial scope need confirmation.',
      value: '2, 20',
    },
    {
      title: 'What is the implementation timeline?',
      body: 'The deck proposes six phases over 12 months — from weighbridge monitoring to grievance redressal — with scope for faster rollout if manpower is available.',
      value: '24',
    },
  ],
  labels: {
    pending:
      'Please discuss this requirement with the IWMS team; the product deck does not specify it.',
    pendingTag: 'To be confirmed',
    confirmedNote:
      'Questions marked “To be confirmed” are awaiting an answer from the product team.',
    contactPrompt: 'Have a question that is not listed?',
    contactLink: 'Ask the IWMS team',
    sourcePrefix: 'Source: deck p.',
  },
} satisfies FAQContent;
