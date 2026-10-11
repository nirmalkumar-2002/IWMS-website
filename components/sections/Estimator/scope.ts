/**
 * Pure helpers for the rollout scoping tool. No coefficients: every figure is a visitor input
 * or plain arithmetic on inputs (see the assumptions block in content/estimator.ts).
 */
import { siteConfig } from '@/content/config';
import type {
  EstimatorFieldContent,
  EstimatorNumericField,
  EstimatorPhaseContent,
  EstimatorSite,
} from '@/content/estimator';

export type RawValues = Record<EstimatorNumericField, string>;
export type SiteValues = Record<EstimatorSite, boolean>;
export type FieldErrors = Partial<Record<EstimatorNumericField, string>>;

export type ScopeInput = {
  households: number;
  wards: number;
  vehicles: number;
  tonnesPerDay?: number;
  collectionPercent?: number;
  sites: SiteValues;
};

export type PhaseResult = {
  key: string;
  status: 'scoped' | 'confirm';
  text: string;
};

export const emptyRaw: RawValues = {
  households: '',
  wards: '',
  vehicles: '',
  tonnesPerDay: '',
  collectionPercent: '',
};

export const emptySites: SiteValues = {
  weighbridge: false,
  processing: false,
  landfill: false,
};

export function formatNumber(value: number, maxDecimals = 0): string {
  return value.toLocaleString(siteConfig.locale, {
    maximumFractionDigits: maxDecimals,
  });
}

export function fill(
  template: string,
  tokens: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in tokens ? String(tokens[key]) : match,
  );
}

/** Accepts Indian or international digit grouping ("1,20,000", "120 000"). */
function parse(raw: string): number | null {
  const cleaned = raw.replace(/[\s,_]/g, '');
  if (cleaned === '' || !/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Validates one field; returns an error message or undefined. */
export function validateField(
  field: EstimatorFieldContent,
  raw: string,
): string | undefined {
  if (raw.trim() === '')
    return field.required ? field.errors.required : undefined;
  const value = parse(raw);
  if (value === null || (field.integer && !Number.isInteger(value))) {
    return field.errors.invalid;
  }
  if (value < field.min || value > field.max) {
    return fill(field.errors.range, {
      min: formatNumber(field.min, 1),
      max: formatNumber(field.max, 1),
    });
  }
  return undefined;
}

export function validateAll(
  fields: EstimatorFieldContent[],
  raw: RawValues,
  sites: SiteValues,
  crossErrors: {
    wardsExceedHouseholds: string;
    vehiclesExceedHouseholds: string;
  },
): { errors: FieldErrors; input?: ScopeInput } {
  const errors: FieldErrors = {};
  for (const field of fields) {
    const error = validateField(field, raw[field.name]);
    if (error) errors[field.name] = error;
  }
  if (Object.keys(errors).length > 0) return { errors };

  const households = parse(raw.households) ?? 0;
  const wards = parse(raw.wards) ?? 0;
  const vehicles = parse(raw.vehicles) ?? 0;
  if (wards > households) errors.wards = crossErrors.wardsExceedHouseholds;
  if (vehicles > households)
    errors.vehicles = crossErrors.vehiclesExceedHouseholds;
  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    input: {
      households,
      wards,
      vehicles,
      tonnesPerDay: parse(raw.tonnesPerDay) ?? undefined,
      collectionPercent: parse(raw.collectionPercent) ?? undefined,
      sites,
    },
  };
}

export function tokensFor(input: ScopeInput): Record<string, string> {
  return {
    households: formatNumber(input.households),
    wards: formatNumber(input.wards),
    vehicles: formatNumber(input.vehicles),
    tonnes:
      input.tonnesPerDay === undefined
        ? ''
        : formatNumber(input.tonnesPerDay, 1),
    percent:
      input.collectionPercent === undefined
        ? ''
        : formatNumber(input.collectionPercent, 1),
  };
}

export function summaryFor(
  input: ScopeInput,
): Record<
  'households' | 'wards' | 'vehicles' | 'perWard' | 'perVehicle',
  string
> {
  return {
    households: formatNumber(input.households),
    wards: formatNumber(input.wards),
    vehicles: formatNumber(input.vehicles),
    perWard: formatNumber(Math.round(input.households / input.wards)),
    perVehicle: formatNumber(Math.round(input.households / input.vehicles)),
  };
}

export function phaseResult(
  phase: EstimatorPhaseContent,
  input: ScopeInput,
): PhaseResult {
  const tokens = tokensFor(input);
  if (phase.requiresSite && !input.sites[phase.requiresSite]) {
    return {
      key: phase.key,
      status: 'confirm',
      text: phase.unscoped ?? phase.body,
    };
  }
  const optional = phase.scopedWithInput;
  const template =
    optional && input[optional.field] !== undefined
      ? optional.template
      : phase.scoped;
  return { key: phase.key, status: 'scoped', text: fill(template, tokens) };
}
