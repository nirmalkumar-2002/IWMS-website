import type { SectionContent } from './types';
export const technologiesContent = {
  id: 'technologies',
  eyebrow: 'CONNECTED IN THE FIELD',
  title: 'The technology behind every record.',
  description: 'Connect field evidence with digital oversight.',
  source: {
    pages: [6, 12, 16, 20],
  },
  items: [
    {
      title: 'GPS tracking',
      body: 'Route optimisation, diesel usage and unauthorised movement monitoring.',
    },
    {
      title: 'QR codes',
      body: 'Household and bin-level pickup verification.',
    },
    {
      title: 'Smart bin sensors',
      body: 'Fill-level and weight monitoring with automated alerts.',
    },
    {
      title: 'IoT load cells & weighbridges',
      body: 'Real-time weight capture and digital weighment integration.',
    },
    {
      title: 'Thermal cameras',
      body: 'Fire safety and landfill hotspot detection.',
    },
    {
      title: 'CCTV + AI with Drone/GIS',
      body: 'Site monitoring and informal activity tracking.',
    },
    {
      title: 'Body cameras',
      body: 'Operator transparency, safety and dispute-resolution evidence.',
    },
  ],
} satisfies SectionContent;
