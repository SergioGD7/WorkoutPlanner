import { v4 as uuidv4 } from 'uuid';
import type { BodyPart, Exercise, WorkoutExercise, WorkoutLog } from '@/lib/types';
import { parseFitNotes } from './fitnotes';
import { parseHevy } from './hevy';
import { parseStrong } from './strong';
import type { ImportSource, ParseImport, ParsedImport } from './types';

export { IMPORT_SOURCES, IMPORT_SOURCE_NAMES } from './types';
export type { ImportSource, ParsedImport } from './types';

const PARSERS: Record<ImportSource, ParseImport> = {
  strong: parseStrong,
  hevy: parseHevy,
  fitnotes: parseFitNotes,
};

export const parseImport: (source: ImportSource, ...args: Parameters<ParseImport>) => ParsedImport =
  (source, text, fallbackUnit) => PARSERS[source](text, fallbackUnit);

/**
 * One catalogue entry as the caller sees it: an id and every name it might be
 * known by. Built-in exercises store a translation key rather than a name, so
 * the caller passes both and the matcher stays free of i18n.
 */
export interface CatalogueEntry {
  id: string;
  names: string[];
}

/**
 * Strips everything that varies between apps for the same movement: case,
 * accents, punctuation, and the equipment qualifier Strong and Hevy append —
 * "Bench Press (Barbell)" and "Bench press" are the same exercise.
 */
export function normaliseExerciseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '');
}

/** Keyword guesses for exercises the catalogue does not have, in both languages. */
const BODY_PART_HINTS: Array<[BodyPart, RegExp]> = [
  ['Chest', /bench|chest|pec|press.*(inclin|declin)|fly|flye|pecho|pectoral|apertura/],
  ['Back', /row|pull|lat|deadlift|chin|shrug|espalda|dominad|remo|jalon|peso muerto/],
  ['Legs', /squat|leg|lunge|calf|hamstring|glute|quad|hip thrust|pierna|sentadilla|zancada|gemelo|femoral|gluteo/],
  ['Shoulders', /shoulder|delt|overhead|lateral raise|face pull|hombro|deltoide|militar|elevacion/],
  ['Arms', /curl|tricep|bicep|dip|extension|brazo|triceps|biceps|fondo/],
  ['Core', /ab|core|crunch|plank|oblique|sit.?up|abdominal|plancha|oblicuo/],
];

function guessBodyPart(name: string): BodyPart {
  const text = name.toLowerCase();
  for (const [bodyPart, pattern] of BODY_PART_HINTS) {
    if (pattern.test(text)) return bodyPart;
  }
  // Nothing matched: Core is the least misleading home for an unknown movement,
  // since it is the one group people rarely plan volume around.
  return 'Core';
}

export interface ImportPlan {
  /** Days ready to be written, keyed by date. */
  log: WorkoutLog;
  /** Exercises the catalogue was missing, created so the sets have a home. */
  newExercises: Exercise[];
  /** How many days were already logged and so left untouched. */
  skippedDays: number;
  workoutCount: number;
  setCount: number;
}

/**
 * Turns parsed rows into days this app can store.
 *
 * Dates that already have something logged are left alone rather than merged:
 * re-running an import is a normal thing to do after a failed first attempt,
 * and appending would quietly double every set.
 */
export function buildImportPlan(
  parsed: ParsedImport,
  catalogue: CatalogueEntry[],
  existingLog: WorkoutLog,
): ImportPlan {
  const byName = new Map<string, string>();
  catalogue.forEach((entry) => {
    entry.names.forEach((name) => {
      const key = normaliseExerciseName(name);
      if (key && !byName.has(key)) byName.set(key, entry.id);
    });
  });

  const log: WorkoutLog = {};
  const newExercises: Exercise[] = [];
  let skippedDays = 0;
  let setCount = 0;

  for (const workout of parsed.workouts) {
    if (existingLog[workout.date]?.length) {
      skippedDays += 1;
      continue;
    }

    const exercises: WorkoutExercise[] = workout.exercises.map((imported) => {
      const key = normaliseExerciseName(imported.name);
      let exerciseId = byName.get(key);

      if (!exerciseId) {
        const created: Exercise = {
          id: uuidv4(),
          name: imported.name,
          bodyPart: guessBodyPart(imported.name),
          description: '',
          emoji: '💪',
          // Sets that only ever carried a hold are timed; everything else is
          // treated as a weight exercise, which the user can correct.
          tracking: imported.sets.every((set) => set.durationSeconds && set.reps === 0)
            ? 'duration'
            : 'weight',
        };
        newExercises.push(created);
        byName.set(key, created.id);
        exerciseId = created.id;
      }

      setCount += imported.sets.length;

      return {
        id: uuidv4(),
        exerciseId,
        exerciseName: imported.name,
        ...(imported.notes ? { notes: imported.notes } : {}),
        sets: imported.sets.map((set) => ({
          reps: set.reps,
          weight: set.weightKg,
          // Imported sets are history: they happened, so they are complete.
          completed: true,
          ...(set.durationSeconds ? { duration: set.durationSeconds } : {}),
          ...(set.rpe ? { rpe: set.rpe } : {}),
          ...(set.type ? { type: set.type } : {}),
        })),
      };
    });

    if (exercises.length > 0) log[workout.date] = exercises;
  }

  return {
    log,
    newExercises,
    skippedDays,
    workoutCount: Object.keys(log).length,
    setCount,
  };
}
