import type { SectionContent } from './types';

export const heroContent = {
  id: 'platform',
  eyebrow: 'INTEGRATED WASTE MANAGEMENT SUITE',
  title: 'Every pickup. Every kilo. Accounted for.',
  description:
    'IWMS connects QR-verified collection, GPS fleets, IoT weighbridges and citizen apps into one accountable platform for Indian cities.',
  source: { pages: [1, 2, 3, 6, 12, 24] },
  items: [
    { title: 'Aligned with SWM Rules', body: '' },
    { title: 'ICCC-ready', body: '' },
    { title: 'Web + Mobile + IoT', body: '' },
    { title: '12-month rollout', body: '' },
  ],
  labels: {
    lines: 'Every pickup.|Every kilo.|Accounted for.',
    primaryCta: 'Request a Demo',
    primaryHref: '/#contact',
    secondaryCta: 'Watch how it works',
    secondaryHref: '#how-it-works',
    scrollHint: 'Scroll',
    scrollLabel: 'Scroll to explore',
    trustLabel: 'At a glance',
    mediaDescription:
      'Cinematic backdrop: an Indian city street at dawn with a municipal waste collection vehicle.',
    devMediaLabel:
      'DEV: add public/media/hero-loop.mp4, hero-loop.webm and hero-poster.avif',
  },
} satisfies SectionContent;
