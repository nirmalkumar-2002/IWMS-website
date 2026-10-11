import type { ContentItem, SectionContent } from './types';

/** A single operational blind spot, paired with the IWMS capability that closes it. */
export type ProblemGap = ContentItem & {
  /** How IWMS replaces the gap with a verifiable record (deck wording). */
  answer: string;
  /** Brochure page the answer is drawn from. */
  page: number;
};

export type ProblemContent = SectionContent & {
  items: ProblemGap[];
  labels: {
    listLabel: string;
    gapHeading: string;
    answerHeading: string;
    closingKicker: string;
    closing: string;
  };
};

export const problemContent = {
  id: 'problem',
  eyebrow: 'THE VISIBILITY GAP',
  title: 'What cities cannot see, they cannot fix.',
  description:
    'Waste changes hands many times between a doorstep and a landfill. When that journey lives in paper registers and phone calls, no one can prove what was collected, weighed, processed or disposed of.',
  source: {
    pages: [2, 6, 8, 10, 12, 16, 18],
    note: 'Gaps are framed from the capabilities described in the brochure; no statistics are claimed.',
  },
  items: [
    {
      title: 'Pickups no one can prove',
      body: 'Manual logs leave room for fake trip entries, and missed households never surface in the record.',
      answer:
        'QR verification at every household and bin, logging GPS location, timestamp, waste image and weighment as a tamper-proof record.',
      page: 6,
    },
    {
      title: 'Vehicles off the map',
      body: 'Without live tracking, route deviations, unauthorised movement and diesel misuse go unnoticed.',
      answer:
        'GPS live tracking, geo-fencing, route-adherence alerts and diesel consumption monitoring for the whole fleet.',
      page: 8,
    },
    {
      title: 'Weights that never reconcile',
      body: 'What a crew collects and what the weighbridge records are rarely compared, so discrepancies disappear.',
      answer:
        'Per-stop collected waste cross-verified against gross weighment, with instant discrepancy alerts and a full audit trail.',
      page: 12,
    },
    {
      title: 'Attendance taken on trust',
      body: 'Proxy entries and manual errors make it hard to know who actually worked which route.',
      answer:
        'Photo, QR or biometric attendance, crew assignment by route, and daily exception reports for absentees and late logins.',
      page: 10,
    },
    {
      title: 'Complaints with no owner',
      body: 'Missed pickups and service complaints stall without a clear path to resolution.',
      answer:
        'A citizen app and portal, ratings after each pickup, and an escalation matrix that routes unresolved complaints upward.',
      page: 18,
    },
    {
      title: 'Landfills in the dark',
      body: 'Inflow, remaining capacity, fire risk and unsafe activity are hard to track on the ground.',
      answer:
        'Inflow tracking, balance-life dashboards, thermal hotspot alerts, and CCTV with AI analytics and drone surveys.',
      page: 16,
    },
  ],
  labels: {
    listLabel: 'Six gaps in city waste operations',
    gapHeading: 'The gap',
    answerHeading: 'With IWMS',
    closingKicker: 'The shift',
    closing:
      'IWMS replaces each gap with automated verification — end-to-end traceability of waste movement.',
  },
} satisfies ProblemContent;
