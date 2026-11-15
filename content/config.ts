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
    'IWMS connects QR-verified collection, GPS fleets, IoT weighbridges and citizen apps into one accountable waste management platform for Indian cities.',
} as const;

/**
 * Request Demo destination. A real `email` gives a mailto with a subject line. While `email` is
 * still a `{{placeholder}}` we never ship a mailto to it: the action falls back to the company
 * website (real, approved: `website`), opened in a new tab.
 */
export function demoRequestLink() {
  const email: string = siteConfig.email;
  if (email && !email.includes('{{')) {
    return {
      href: `mailto:${email}?subject=${encodeURIComponent('IWMS demo request')}`,
      external: false,
    };
  }
  return { href: siteConfig.website, external: true };
}
