import type { SectionContent } from './types';
export const complianceContent = {
  id: 'compliance',
  eyebrow: 'COMPLIANCE & RULES',
  title: 'Build accountability into daily operations.',
  description:
    'Monitor source segregation and maintain digital records for authority reporting.',
  source: {
    pages: [6, 12, 16, 22],
  },
  items: [
    {
      title: 'SWM Rules alignment',
      body: 'Support regulatory monitoring and reporting.',
    },
    {
      title: 'Segregation at source',
      body: 'Monitor wet, dry and other waste streams at source.',
    },
    {
      title: 'User charges and fines',
      body: 'Support charges and fines for mixed waste.',
    },
    {
      title: 'Authority reports',
      body: 'Automated reporting for transparency and accountability.',
    },
    {
      title: 'Digital audit trails',
      body: 'Tamper-proof pickup logs and weighment audit records.',
    },
    {
      title: 'Calibration monitoring',
      body: 'Schedule alerts and certificate-renewal reminders.',
    },
  ],
} satisfies SectionContent;
