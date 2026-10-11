import type { SectionContent } from './types';

export type FinalCTAFieldKey =
  'name' | 'organisation' | 'role' | 'city' | 'email' | 'phone' | 'message';

export type FinalCTAContent = SectionContent & {
  /** Display line split into lines for the closing-frame composition. */
  displayLines: string[];
  fields: Record<
    FinalCTAFieldKey,
    { label: string; hint?: string; autoComplete: string }
  >;
  labels: Record<string, string>;
};

export const finalCTAContent = {
  id: 'contact',
  eyebrow: 'Let’s plan your rollout',
  title: 'A cleaner city starts with a clear plan.',
  displayLines: ['A cleaner city', 'starts with', 'a clear plan.'],
  // PDF p.25 reads “We can make this vision turns to reality…”; grammar corrected.
  description:
    'We can turn this vision into reality through innovative thinking and collective action.',
  source: {
    pages: [24, 25],
  },
  items: [],
  fields: {
    name: { label: 'Full name', autoComplete: 'name' },
    organisation: {
      label: 'Organisation / ULB',
      hint: 'Municipal corporation, SPV, department or operator.',
      autoComplete: 'organization',
    },
    role: {
      label: 'Role / designation',
      autoComplete: 'organization-title',
    },
    city: { label: 'City / ULB area', autoComplete: 'address-level2' },
    email: { label: 'Work email', autoComplete: 'email' },
    phone: {
      label: 'Phone',
      hint: 'Optional. Include the country code if outside India.',
      autoComplete: 'tel',
    },
    message: {
      label: 'What would you like to discuss?',
      hint: 'Wards, modules or timelines you have in mind.',
      autoComplete: 'off',
    },
  },
  labels: {
    formTitle: 'Request a demo',
    formIntro:
      'Tell us about your city. The IWMS team will follow up to plan a walkthrough.',
    required: 'This field is required.',
    requiredMark: 'Required',
    optionalMark: 'Optional',
    tooShort: 'Please add a little more detail (at least 10 characters).',
    emailError: 'Enter a valid email address, for example name@city.gov.in.',
    phoneError: 'Enter a valid phone number using digits, spaces, + or -.',
    honeypot: 'Leave this field empty',
    submit: 'Request a Demo',
    submitting: 'Sending your request…',
    successTitle: 'Thank you — your request has been sent.',
    successBody:
      'The IWMS team will be in touch using the details you provided.',
    sendAnother: 'Send another request',
    error:
      'Your request could not be sent. Please check your connection and try again.',
    notConfiguredTitle: 'Online requests are not enabled yet.',
    notConfiguredBody:
      'The demo-request service is still being set up, so this form cannot send your details. Please download the brochure or visit www.zigma.in in the meantime.',
    brochureTitle: 'Prefer to read first?',
    brochureBody:
      'The IWMS brochure covers all seven modules, key technologies and the 12-month phased roadmap.',
    brochureMeta: 'PDF',
    websiteLabel: 'Visit',
    officesLabel: 'Offices',
    companyLabel: 'Developed by',
  },
} satisfies FinalCTAContent;
