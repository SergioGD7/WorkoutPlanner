import type { Exercise } from './types';
import { initialExercises } from './data';
import { LIBRARY_EXERCISES } from './exercise-catalog';

/**
 * What the app ships, combined with what the account holds.
 *
 * Two separate problems, both solved by merging at read time rather than writing
 * to Firestore:
 *
 * 1. The 287 catalogue exercises are identical for everyone. Storing them per
 *    account would mean 287 duplicated documents each — and the collection is
 *    seeded once at sign-in, so an existing account would never see a catalogue
 *    that grew afterwards.
 *
 * 2. The original 15 *are* stored per account, and were seeded before the
 *    illustrations existed. Those documents have no `illustration` field, so
 *    overlaying them naively hides the artwork for exactly the exercises
 *    everybody actually uses.
 *
 * So the account wins on everything it has an opinion about, and the shipped
 * copy fills what a document predates.
 */

/**
 * Fields that belong to the app rather than the user, and may be missing from a
 * document written by an older version.
 *
 * Anything added to the built-in catalogue from here on needs to be listed, or
 * it will be invisible to every account that predates it.
 */
const SHIPPED_FIELDS = ['illustration'] as const;

/** Shipped definitions by id: the catalogue and the seeded originals. */
const SHIPPED = new Map<string, Exercise>(
  [...LIBRARY_EXERCISES, ...initialExercises].map((exercise) => [exercise.id, exercise]),
);

/**
 * Backfills the shipped fields a stored document is missing.
 *
 * Only ever *adds*: a value the account already has is left alone, so renaming a
 * catalogue exercise or changing its body part still sticks.
 */
function withShippedDefaults(stored: Exercise): Exercise {
  const shipped = SHIPPED.get(stored.id);
  if (!shipped) return stored;

  let patched: Exercise | null = null;
  for (const field of SHIPPED_FIELDS) {
    if (stored[field] === undefined && shipped[field] !== undefined) {
      patched ??= { ...stored };
      patched[field] = shipped[field];
    }
  }

  return patched ?? stored;
}

export function mergeWithLibrary(stored: Exercise[]): Exercise[] {
  const byId = new Map<string, Exercise>();
  LIBRARY_EXERCISES.forEach((exercise) => byId.set(exercise.id, exercise));
  stored.forEach((exercise) => byId.set(exercise.id, withShippedDefaults(exercise)));

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
