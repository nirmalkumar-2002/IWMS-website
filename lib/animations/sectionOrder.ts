export const sectionOrder = [
  'platform',
  'problem',
  'how-it-works',
  'modules',
  'dashboard',
  'technologies',
  'citizen',
  'compliance',
  'impact',
  'finance',
  'estimator',
  'roadmap',
  'audience',
  'faq',
  'contact',
] as const;
export type SectionId = (typeof sectionOrder)[number];
