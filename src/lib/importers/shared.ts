import { toKg } from '@/lib/workout-utils';
import type { WeightUnit } from '@/lib/types';
import type { ImportedExercise, ImportedSet, ImportedWorkout, ParsedImport } from './types';

/** Month names as the exports write them, for the "12 Jan 2024" style. */
const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

/**
 * Reads the assorted date shapes these exports use and returns yyyy-MM-dd.
 *
 * Only unambiguous formats are accepted. A bare "03/04/2023" is deliberately
 * *not* parsed: there is no way to tell March from April, and silently guessing
 * would scatter someone's history across the wrong months.
 */
export function parseImportDate(value: string): string | null {
  if (!value) return null;
  const text = value.trim();

  // 2023-01-15, optionally followed by a time.
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // 12 Jan 2024, 09:30
  const dmy = text.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (dmy) {
    const month = MONTHS.indexOf(dmy[2].slice(0, 3).toLowerCase());
    if (month >= 0) {
      return `${dmy[3]}-${String(month + 1).padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
  }

  // Jan 12, 2024
  const mdy = text.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdy) {
    const month = MONTHS.indexOf(mdy[1].slice(0, 3).toLowerCase());
    if (month >= 0) {
      return `${mdy[3]}-${String(month + 1).padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
    }
  }

  return null;
}

/** Reads a unit column. Anything that isn't clearly pounds is treated as kg. */
export function unitFromColumn(value: string, fallback: WeightUnit): WeightUnit {
  const text = value.trim().toLowerCase();
  if (!text) return fallback;
  if (text.startsWith('lb')) return 'lb';
  if (text.startsWith('kg')) return 'kg';
  return fallback;
}

/** Converts a raw weight into kilograms, rounded to something storable. */
export function weightToKg(value: number, unit: WeightUnit): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Number(toKg(value, unit).toFixed(2));
}

/**
 * Accumulates flat CSV rows — one per set — into workouts and exercises.
 *
 * Every one of these exports is a long list of sets tagged with a date and an
 * exercise name, so the grouping is identical for all three and only the column
 * names differ.
 */
export class ImportBuilder {
  private readonly byDate = new Map<string, Map<string, ImportedExercise>>();
  private sets = 0;

  add(date: string, exerciseName: string, set: ImportedSet, notes?: string): void {
    const name = exerciseName.trim();
    if (!name) return;

    let exercises = this.byDate.get(date);
    if (!exercises) {
      exercises = new Map();
      this.byDate.set(date, exercises);
    }

    let exercise = exercises.get(name);
    if (!exercise) {
      exercise = { name, sets: [] };
      exercises.set(name, exercise);
    }

    // The first non-empty note for the exercise wins; these files repeat the
    // same note on every set row of the exercise.
    if (notes && !exercise.notes) exercise.notes = notes;

    exercise.sets.push(set);
    this.sets += 1;
  }

  build(): ParsedImport {
    const workouts: ImportedWorkout[] = [...this.byDate.entries()]
      .map(([date, exercises]) => ({ date, exercises: [...exercises.values()] }))
      .filter((workout) => workout.exercises.length > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return { workouts, setCount: this.sets };
  }
}
