import type { SectionId } from '@/lib/animations/sectionOrder';

export type Landmark = 'homes' | 'weighbridge' | 'plant' | 'landfill' | 'command';
export type ExperienceChapter = {
  id: SectionId;
  label: string;
  title: string;
  description: string;
  landmark: Landmark;
  load: number;
  sourcePages: number[];
};

/** Marketing scene captions based on the deck; no operational/live data. */
export const experienceContent = {
  eyebrow: 'EXPLORE THE CONNECTED CITY',
  title: 'Every stop tells a story.',
  illustration: 'Illustrative IWMS journey',
  scroll: 'Scroll to explore',
  navigation: 'Explore the IWMS chapters',
  pause: 'Pause scene motion',
  resume: 'Resume scene motion',
  chapter: 'Chapter',
  next: 'Next chapter',
  description: 'The same collection truck travels through a connected city as you scroll: from doorstep verification to weighing, recovery, disposal and city oversight. The accompanying text explains each capability.',
  chapters: [
    { id: 'platform', label: 'Collection', title: 'A pickup. A digital record.', description: 'QR verification connects the pickup with its location, time, photograph and weight.', landmark: 'homes', load: 0.25, sourcePages: [4, 5, 6] },
    { id: 'problem', label: 'Visibility', title: 'Follow what happens in the field.', description: 'Connect vehicle movements and pickup evidence to reveal gaps in collection.', landmark: 'homes', load: 0.55, sourcePages: [3, 6, 8] },
    { id: 'how-it-works', label: 'Waste journey', title: 'Weigh. Recover. Account for.', description: 'Cross-check weighment, follow processing routes and track the rejects sent to landfill.', landmark: 'weighbridge', load: 0.75, sourcePages: [12, 14, 16] },
    { id: 'modules', label: 'The platform', title: 'Seven modules. One connected record.', description: 'Collection, logistics, resources, weighbridges, processing, landfill and grievances.', landmark: 'plant', load: 0.45, sourcePages: [4, 6, 8, 10, 12, 14, 16, 18] },
    { id: 'dashboard', label: 'City oversight', title: 'From the field to the command centre.', description: 'Bring the operational record into the city’s ICCC for centralised oversight.', landmark: 'command', load: 0.3, sourcePages: [3, 20] },
    { id: 'technologies', label: 'Connected field', title: 'Evidence at every checkpoint.', description: 'GPS, QR codes, sensors, load cells and cameras connect physical operations with digital records.', landmark: 'weighbridge', load: 0.45, sourcePages: [6, 12, 16, 20] },
    { id: 'citizen', label: 'Citizen voice', title: 'Keep residents part of the journey.', description: 'Arrival notifications, pickup ratings and complaint tracking connect the service with citizens.', landmark: 'homes', load: 0.65, sourcePages: [18, 21] },
    { id: 'compliance', label: 'Compliance', title: 'Make the record ready for review.', description: 'Support segregation monitoring, authority reports and weighbridge calibration reminders.', landmark: 'landfill', load: 0.35, sourcePages: [12, 16, 22] },
    { id: 'impact', label: 'Better outcomes', title: 'Accountability. Efficiency. Transparency.', description: 'Follow the information that supports better waste-management decisions.', landmark: 'plant', load: 0.2, sourcePages: [19] },
    { id: 'finance', label: 'Sustainability', title: 'Connect service with cost recovery.', description: 'User charges, fines and government subsidies support financial sustainability.', landmark: 'command', load: 0.35, sourcePages: [23] },
    { id: 'estimator', label: 'Your city', title: 'Start with your city’s operations.', description: 'Use your collection context as the starting point for a detailed assessment.', landmark: 'homes', load: 0.45, sourcePages: [], },
    { id: 'roadmap', label: 'The rollout', title: 'A route to implementation.', description: 'Six phases connect weighbridges, processing, landfill, GPS and QR, user charges and grievances.', landmark: 'weighbridge', load: 0.6, sourcePages: [24] },
    { id: 'audience', label: 'Your team', title: 'Built around city operations.', description: 'A shared view for municipal teams, Smart City SPVs, state departments and operators.', landmark: 'command', load: 0.55, sourcePages: [2, 3] },
    { id: 'faq', label: 'The details', title: 'Plan the next step with clarity.', description: 'Explore the practical questions behind an IWMS implementation.', landmark: 'homes', load: 0.35, sourcePages: [] },
    { id: 'contact', label: 'Let’s begin', title: 'Bring the journey to your city.', description: 'Talk to the team about a demo, pilot or your implementation requirements.', landmark: 'homes', load: 0.2, sourcePages: [25, 26] },
  ] satisfies ExperienceChapter[],
};
