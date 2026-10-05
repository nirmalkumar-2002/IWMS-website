import type { SectionContent } from './types';
export const dashboardContent = {
  id: 'dashboard',
  eyebrow: 'COMMAND CENTRE',
  title: 'Your city’s operations, connected.',
  description:
    'IWMS connects with the Integrated Command and Control Centre for centralised oversight.',
  source: {
    pages: [3, 8, 10, 12, 16, 18],
  },
  items: [
    {
      title: 'Vehicle map',
      body: 'GPS-tracked vehicles and route visibility.',
    },
    {
      title: 'Today’s collection',
      body: 'Illustrative collection coverage.',
    },
    {
      title: 'Weighbridge discrepancy',
      body: 'Mismatch notification and audit record.',
    },
    {
      title: 'Attendance summary',
      body: 'Digital workforce attendance.',
    },
    {
      title: 'Complaint response',
      body: 'Complaint trends and response times.',
    },
    {
      title: 'Landfill balance life',
      body: 'Capacity and forecast visibility.',
    },
  ],
  labels: {
    illustrative: 'Illustrative dashboard',
    demoWard: 'Demo ward',
    collection: '{{DASHBOARD_COLLECTION_PERCENT}}',
    attendance: '{{DASHBOARD_ATTENDANCE}}',
    sla: '{{DASHBOARD_SLA}}',
    balanceLife: '{{DASHBOARD_BALANCE_LIFE}}',
  },
} satisfies SectionContent;
