export const siteConfig = {
  name: 'IWMS',
  company: 'Zigma Global Environ Solutions Pvt. Ltd.',
  tagline: 'A unified digital platform for waste management.',
  group: 'Part of the Blue Planet Group',
  swmRuleYear: 2016, // Source: PDF p.22; confirm applicable year before publishing.
  website: 'https://www.zigma.in',
  websiteLabel: 'www.zigma.in',
  locations: ['Chennai', 'Singapore'],
  email: '{{CONTACT_EMAIL}}',
  phone: '{{CONTACT_PHONE}}',
  whatsappNumber: '{{WHATSAPP_NUMBER}}',
  brochurePath: '/brand/iwms-brochure.pdf',
  locale: 'en-IN',
  title: 'IWMS | Integrated Waste Management Suite',
  description:
    'A unified digital platform for municipal waste collection, verification, processing and landfill management.',
} as const;
