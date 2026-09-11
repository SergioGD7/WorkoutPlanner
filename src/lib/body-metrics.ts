import type { BodyEntry, WeightUnit } from './types';
import { round } from './workout-utils';

/**
 * The tape-measure half of a body entry: the four girths the form collects.
 *
 * Kept as a list rather than four hand-written blocks so the chips row, the
 * history line and the editor all agree on the order and never drift apart when
 * a fifth measurement shows up.
 */
export type GirthKey = 'waist' | 'chest' | 'arm' | 'thigh';

export const GIRTHS: ReadonlyArray<{ key: GirthKey; labelKey: string }> = [
  { key: 'waist', labelKey: 'waist' },
  { key: 'chest', labelKey: 'chestMeasure' },
  { key: 'arm', labelKey: 'armMeasure' },
  { key: 'thigh', labelKey: 'thighMeasure' },
];

/* -------------------------------------------------------------------------- */
/* Units                                                                       */
/* -------------------------------------------------------------------------- */

export type LengthUnit = 'cm' | 'in';

const CM_PER_INCH = 2.54;

/**
 * Girths follow the weight unit: someone weighing in pounds measures in inches.
 * There is no separate setting because nobody mixes the two.
 */
export function lengthUnitFor(weightUnit: WeightUnit): LengthUnit {
  return weightUnit === 'lb' ? 'in' : 'cm';
}

/** Storage is always centimetres, like weight is always kilograms. */
export function fromCm(cm: number, unit: LengthUnit): number {
  return unit === 'in' ? cm / CM_PER_INCH : cm;
}

export function toCm(value: number, unit: LengthUnit): number {
  return unit === 'in' ? value * CM_PER_INCH : value;
}

/** One decimal is what a tape measure gives you; more is noise. */
export function formatGirth(cm: number, unit: LengthUnit): string {
  return String(round(fromCm(cm, unit), 1));
}

/* -------------------------------------------------------------------------- */
/* Readings                                                                    */
/* -------------------------------------------------------------------------- */

export interface Reading {
  /** Stored value, in centimetres. */
  value: number;
  /** Date of the entry it came from. */
  date: string;
  /**
   * Change since the previous entry that *also* had this field, in centimetres.
   * `null` when this is the first reading of it.
   */
  delta: number | null;
}

function hasField(entry: BodyEntry, field: GirthKey): entry is BodyEntry & Record<GirthKey, number> {
  const value = entry[field];
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * The latest value of one measurement, and how it moved.
 *
 * Per measurement, not per entry. Not every day is a tape-measure day: someone
 * weighs in on Monday and measures on Sunday, so "the latest entry" has no
 * waist and "the previous entry" is the wrong thing to compare against. Both
 * ends of the delta come from entries that actually carry the field.
 *
 * Accepts entries in any order; they are sorted here so the caller does not
 * have to remember which way Firestore handed them over.
 */
export function latestReading(entries: BodyEntry[], field: GirthKey): Reading | null {
  const withField = entries
    .filter((entry) => hasField(entry, field))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const [latest, previous] = withField;
  if (!latest) return null;

  return {
    value: latest[field],
    date: latest.date,
    delta: previous ? round(latest[field] - previous[field], 2) : null,
  };
}

/** The girths one entry actually recorded, in the fixed display order. */
export function recordedGirths(entry: BodyEntry): Array<{ key: GirthKey; labelKey: string; value: number }> {
  return GIRTHS.flatMap(({ key, labelKey }) =>
    hasField(entry, key) ? [{ key, labelKey, value: entry[key] }] : [],
  );
}
