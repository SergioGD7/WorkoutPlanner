import type { SetType, WeightUnit } from '@/lib/types';

/** The tracker a file came from. */
export type ImportSource = 'strong' | 'hevy' | 'fitnotes';

export const IMPORT_SOURCES: ImportSource[] = ['strong', 'hevy', 'fitnotes'];

/** Display names, which are trademarks and so are not translated. */
export const IMPORT_SOURCE_NAMES: Record<ImportSource, string> = {
  strong: 'Strong',
  hevy: 'Hevy',
  fitnotes: 'FitNotes',
};

export interface ImportedSet {
  reps: number;
  /** Kilograms, already converted from whatever the file used. */
  weightKg: number;
  /** Seconds held, for timed entries. */
  durationSeconds?: number;
  rpe?: number;
  type?: SetType;
}

export interface ImportedExercise {
  /** The other app's name for it; matched against the catalogue later. */
  name: string;
  sets: ImportedSet[];
  notes?: string;
}

export interface ImportedWorkout {
  /** yyyy-MM-dd. */
  date: string;
  exercises: ImportedExercise[];
}

/**
 * A parser's job ends here: dates, names and numbers, with nothing yet decided
 * about how they map onto this app's catalogue or existing log.
 */
export interface ParsedImport {
  workouts: ImportedWorkout[];
  setCount: number;
}

/**
 * Some exports carry no unit column at all. The profile's own unit is the least
 * surprising guess — people rarely switch units between apps — so parsers take
 * it as a fallback rather than silently assuming kilograms.
 */
export type ParseImport = (text: string, fallbackUnit: WeightUnit) => ParsedImport;
