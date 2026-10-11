import type { SectionContent } from './types';

/** One link in the illustrative audit record: what event, what evidence is kept. */
export type AuditRow = {
  event: string;
  evidence: string;
};

export type CompliancePillar = {
  index: string;
  title: string;
  body: string;
  bullets: string[];
};

export type ComplianceContent = SectionContent & {
  pillars: CompliancePillar[];
  ledger: {
    title: string;
    caption: string;
    columns: { event: string; evidence: string };
    rows: AuditRow[];
  };
  note: string;
};

export const complianceContent = {
  id: 'compliance',
  eyebrow: 'Compliance and rules',
  title: 'Accountability, written into every day’s record.',
  description:
    'IWMS is aligned with the Solid Waste Management (SWM) Rules. It monitors segregation at source, keeps a digital audit trail of pickups and weighments, and generates structured reports for authorities.',
  source: {
    pages: [2, 3, 6, 12, 14, 16, 22],
    note: 'Brochure p.22 cites SWM Rules 2016. The year is deliberately omitted until the applicable rules are confirmed (see content/config.ts).',
  },
  // Flat list kept for any consumer that expects SectionContent.items.
  items: [
    {
      title: 'SWM Rules alignment',
      body: 'Supports regulatory monitoring and reporting.',
    },
    {
      title: 'Segregation at source',
      body: 'Monitors wet, dry and other waste streams at source.',
    },
    {
      title: 'User charges and fines',
      body: 'Supports user charges and fines for mixed waste.',
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
      body: 'Calibration schedule alerts and certificate-renewal reminders.',
    },
  ],
  pillars: [
    {
      index: '01',
      title: 'Segregation at source',
      body: 'Waste is logged by category from the first pickup, so mixing is visible rather than assumed.',
      bullets: [
        'Tracks wet, dry, hazardous, sanitary and glass waste categories',
        'Supports user charges and fines for mixed waste',
        'Rejects defined and handled as described in the SWM Rules',
      ],
    },
    {
      index: '02',
      title: 'A digital audit trail',
      body: 'Every pickup and weighment leaves a record that can be checked later.',
      bullets: [
        'Tamper-proof pickup event logs',
        'Weighments cross-verified against per-stop collection',
        'Instant alerts for mismatched weights',
        'Calibration schedule alerts and certificate-renewal reminders',
      ],
    },
    {
      index: '03',
      title: 'Reporting to authorities',
      body: 'Records are aggregated into reports for transparency and accountability.',
      bullets: [
        'Automated, structured reports for authorities',
        'Disposal flow aggregated for reconciliation and compliance reports',
        'Landfill operations monitored against SWM Rules, environmental norms and safety standards',
      ],
    },
    {
      index: '04',
      title: 'Ready for the command centre',
      body: 'IWMS connects with the Integrated Command and Control Centre (ICCC) for centralised oversight.',
      bullets: [
        'Web and app-based monitoring tools',
        'Live data on time, staff, fuel and costs',
      ],
    },
  ],
  ledger: {
    title: 'What one pickup leaves behind',
    caption:
      'Illustration of the record structure described in the IWMS brochure. Not live data.',
    columns: { event: 'Event', evidence: 'Evidence kept' },
    rows: [
      {
        event: 'Pickup',
        evidence: 'QR scan, GPS location, timestamp, waste image',
      },
      {
        event: 'Segregation',
        evidence: 'Waste category logged at source',
      },
      {
        event: 'Weighment',
        evidence: 'Load-cell reading and weighbridge gross weight',
      },
      {
        event: 'Cross-check',
        evidence: 'Per-stop total compared with gross weighment',
      },
      {
        event: 'Exception',
        evidence: 'Discrepancy alert, if weights do not match',
      },
      {
        event: 'Report',
        evidence: 'Aggregated into reports for authorities',
      },
    ],
  },
  note: 'Applicable rules and reporting formats should be confirmed for each deployment.',
} satisfies ComplianceContent;
