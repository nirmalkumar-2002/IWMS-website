import type { SectionContent } from './types';

/*
 * Rollout scoping tool.
 *
 * ASSUMPTIONS (read before editing):
 * - The deck (pp.8, 19, 23, 24) provides no calculation formula, improvement rates, fuel costs or tariff
 *   assumptions. No savings, leakage or ROI figures are produced.
 * - Every number the tool shows is either the visitor's own input or simple arithmetic on it
 *   (e.g. households per ward). Nothing is multiplied by an efficiency coefficient.
 * - The phase list mirrors the 12-month roadmap on deck p.24.
 * - When coefficients are approved, replace `pending.rows[].value` with real outputs and remove
 *   the "pending approval" wording only after sign-off (see PLACEHOLDERS.md).
 * Tokens in templates: {households} {wards} {vehicles} {tonnes} {percent} {min} {max}.
 */

export type EstimatorNumericField =
  'households' | 'wards' | 'vehicles' | 'tonnesPerDay' | 'collectionPercent';

export type EstimatorSite = 'weighbridge' | 'processing' | 'landfill';

export type EstimatorFieldContent = {
  name: EstimatorNumericField;
  label: string;
  hint: string;
  unit?: string;
  required: boolean;
  integer: boolean;
  min: number;
  max: number;
  inputMode: 'numeric' | 'decimal';
  errors: { required: string; invalid: string; range: string };
};

export type EstimatorPhaseContent = {
  key: string;
  phase: string;
  window: string;
  title: string;
  /** Deck description, shown before the visitor builds a scope. */
  body: string;
  /** Requires these sites; otherwise `unscoped` is shown. */
  requiresSite?: EstimatorSite;
  scoped: string;
  /** Optional richer template used when the named optional input is supplied. */
  scopedWithInput?: { field: EstimatorNumericField; template: string };
  unscoped?: string;
};

export type EstimatorContent = SectionContent & {
  fields: EstimatorFieldContent[];
  sites: {
    legend: string;
    hint: string;
    options: { name: EstimatorSite; label: string }[];
  };
  crossErrors: {
    wardsExceedHouseholds: string;
    vehiclesExceedHouseholds: string;
  };
  summary: {
    heading: string;
    note: string;
    empty: string;
    rows: {
      key: 'households' | 'wards' | 'vehicles' | 'perWard' | 'perVehicle';
      label: string;
    }[];
  };
  phases: EstimatorPhaseContent[];
  pending: {
    heading: string;
    status: string;
    note: string;
    rows: { label: string; value: string }[];
  };
  labels: {
    formHeading: string;
    resultsHeading: string;
    illustrative: string;
    optional: string;
    submit: string;
    update: string;
    reset: string;
    emptyState: string;
    announceUpdated: string;
    announceErrors: string;
    announceError: string;
    phasesLabel: string;
    statusScoped: string;
    statusConfirm: string;
    outcome: string;
    cta: string;
    ctaHref: string;
    disclaimer: string;
  };
};

export const estimatorContent = {
  id: 'estimator',
  eyebrow: 'Rollout scope',
  title: 'Size the rollout for your city.',
  description:
    'Enter a few operating figures to see what a phased IWMS rollout would cover — vehicles to track, households to tag and sites to connect. A detailed assessment follows with your team.',
  source: {
    pages: [8, 19, 23, 24],
    note: 'The PDF provides no calculation formula or improvement coefficients. Do not invent savings.',
  },
  items: [
    { title: 'Households', body: 'Number of households served.' },
    { title: 'Wards', body: 'Number of wards in the service area.' },
    { title: 'Vehicles', body: 'Number of collection vehicles.' },
    { title: 'Tonnes per day', body: 'Daily waste handled.' },
    { title: 'User-charge collection', body: 'Current collection percentage.' },
  ],
  fields: [
    {
      name: 'households',
      label: 'Households served',
      hint: 'Approximate number of households in the collection area.',
      required: true,
      integer: true,
      min: 1,
      max: 10000000,
      inputMode: 'numeric',
      errors: {
        required: 'Enter the number of households served.',
        invalid: 'Households must be a whole number, for example 45000.',
        range: 'Households must be between {min} and {max}.',
      },
    },
    {
      name: 'wards',
      label: 'Wards',
      hint: 'Wards or zones covered by the service.',
      required: true,
      integer: true,
      min: 1,
      max: 1000,
      inputMode: 'numeric',
      errors: {
        required: 'Enter the number of wards.',
        invalid: 'Wards must be a whole number, for example 48.',
        range: 'Wards must be between {min} and {max}.',
      },
    },
    {
      name: 'vehicles',
      label: 'Collection vehicles',
      hint: 'Vehicles used for door-to-door collection and transport.',
      required: true,
      integer: true,
      min: 1,
      max: 20000,
      inputMode: 'numeric',
      errors: {
        required: 'Enter the number of collection vehicles.',
        invalid: 'Vehicles must be a whole number, for example 120.',
        range: 'Vehicles must be between {min} and {max}.',
      },
    },
    {
      name: 'tonnesPerDay',
      label: 'Waste handled',
      hint: 'Tonnes per day reaching processing or landfill.',
      unit: 'tonnes / day',
      required: false,
      integer: false,
      min: 0.1,
      max: 50000,
      inputMode: 'decimal',
      errors: {
        required: '',
        invalid: 'Enter tonnes per day as a number, for example 180 or 180.5.',
        range: 'Tonnes per day must be between {min} and {max}.',
      },
    },
    {
      name: 'collectionPercent',
      label: 'User-charge collection',
      hint: 'Share of households currently paying user charges.',
      unit: '%',
      required: false,
      integer: false,
      min: 0,
      max: 100,
      inputMode: 'decimal',
      errors: {
        required: '',
        invalid: 'Enter a percentage as a number, for example 35.',
        range: 'User-charge collection must be between {min}% and {max}%.',
      },
    },
  ],
  sites: {
    legend: 'Sites in scope',
    hint: 'Select the facilities your city operates today.',
    options: [
      {
        name: 'weighbridge',
        label: 'Weighbridge at a transfer station or landfill',
      },
      {
        name: 'processing',
        label: 'Processing facility (composting, biomethanation or MRF)',
      },
      { name: 'landfill', label: 'Landfill site' },
    ],
  },
  crossErrors: {
    wardsExceedHouseholds: 'Wards cannot be more than households served.',
    vehiclesExceedHouseholds: 'Vehicles cannot be more than households served.',
  },
  summary: {
    heading: 'Your inputs',
    note: 'Derived only from the figures you entered — not a performance estimate.',
    empty: '—',
    rows: [
      { key: 'households', label: 'Households' },
      { key: 'wards', label: 'Wards' },
      { key: 'vehicles', label: 'Vehicles' },
      { key: 'perWard', label: 'Households per ward' },
      { key: 'perVehicle', label: 'Households per vehicle' },
    ],
  },
  phases: [
    {
      key: 'weighbridge',
      phase: 'Phase 1',
      window: 'Months 0–1',
      title: 'Weighbridge monitoring',
      body: 'Accurate inflow measurement, integrated with landfill and processing data.',
      requiresSite: 'weighbridge',
      scoped: 'Digital weighbridge integration at your selected sites.',
      scopedWithInput: {
        field: 'tonnesPerDay',
        template:
          'Digital weighbridge integration for the {tonnes} tonnes a day you reported.',
      },
      unscoped:
        'No weighbridge selected — inflow measurement points to confirm in assessment.',
    },
    {
      key: 'processing',
      phase: 'Phase 2',
      window: 'Months 1–2',
      title: 'Processing system setup',
      body: 'Facility mapping and segregation of organic, dry and mixed waste.',
      requiresSite: 'processing',
      scoped:
        'Facility mapping and segregation logging at your processing facilities.',
      unscoped: 'No processing facility selected — to confirm in assessment.',
    },
    {
      key: 'landfill',
      phase: 'Phase 3',
      window: 'Months 2–3',
      title: 'Landfill management',
      body: 'Inflow tracking, analytics dashboards, landfill capacity, fire and safety, and compliance.',
      requiresSite: 'landfill',
      scoped:
        'Inflow tracking, capacity and balance life, fire and safety, and compliance reporting for your landfill site.',
      unscoped: 'No landfill site selected — the module can be scoped later.',
    },
    {
      key: 'collection',
      phase: 'Phase 4',
      window: 'Months 3–6',
      title: 'GPS tracking and QR rollout',
      body: 'GPS tracking and route optimisation; QR codes for households, apartments, bulk waste generators and bins.',
      scoped:
        'GPS tracking for {vehicles} vehicles and QR tagging for {households} households across {wards} wards, plus apartments, bulk generators and bins.',
    },
    {
      key: 'user-charge',
      phase: 'Phase 5',
      window: 'Months 6–9',
      title: 'User charge',
      body: 'Integrated billing with online and offline payment options.',
      scoped:
        'Integrated billing with online and offline payment options for {households} households.',
      scopedWithInput: {
        field: 'collectionPercent',
        template:
          'Integrated billing with online and offline payments, starting from the {percent}% user-charge collection you reported.',
      },
    },
    {
      key: 'grievance',
      phase: 'Phase 6',
      window: 'Months 9–12',
      title: 'Grievance redressal',
      body: 'Citizen app and portal, ticketing and escalation matrix.',
      scoped:
        'Citizen app and portal, ticketing and escalation matrix for {households} households.',
    },
  ],
  pending: {
    heading: 'Savings and leakage estimate',
    status: 'Illustrative — coefficients pending approval',
    note: 'No savings, fuel or recovery figures are shown until the assessment coefficients are approved. A detailed assessment uses your city’s own data.',
    rows: [
      { label: 'Fuel efficiency', value: 'Pending approval' },
      { label: 'Collection coverage', value: 'Pending approval' },
      { label: 'User-charge recovery', value: 'Pending approval' },
    ],
  },
  labels: {
    formHeading: 'Your city',
    resultsHeading: 'Rollout scope',
    illustrative: 'Illustrative scope',
    optional: 'Optional',
    submit: 'Build rollout scope',
    update: 'Update scope',
    reset: 'Clear',
    emptyState:
      'Enter households, wards and vehicles to see how the six phases would apply to your city.',
    announceUpdated:
      'Rollout scope updated for {households} households across {wards} wards.',
    announceErrors: '{count} fields need attention.',
    announceError: '1 field needs attention.',
    phasesLabel: 'Six-phase rollout, as set out in the IWMS roadmap',
    statusScoped: 'In scope',
    statusConfirm: 'To confirm',
    outcome:
      'Full IWMS operational in 12 months, with scope for a faster rollout if manpower is available.',
    cta: 'Get a detailed assessment for your city',
    ctaHref: '#contact',
    disclaimer:
      'Indicative only. This tool restates your inputs against the published roadmap; it does not estimate savings.',
  },
} satisfies EstimatorContent;
