/**
 * In-gym helpers that operate on a single day: supersets, warm-up ramps,
 * swapping an exercise, and the end-of-workout summary. All pure.
 */
import { differenceInMinutes, parseISO } from 'date-fns';
import type { DaySession, DaySessions, Exercise, Set, WeightUnit, WorkoutExercise, WorkoutLog } from './types';
import {
  DEFAULT_PLATES_KG,
  DEFAULT_PLATES_LB,
  KG_PER_LB,
  countedSets,
  dayVolume,
  detectPR,
  getExercisePR,
  getExerciseSessions,
  isCountedSet,
  isWorkoutCompleted,
} from './workout-utils';

/* -------------------------------------------------------------------------- */
/* Supersets                                                                   */
/* -------------------------------------------------------------------------- */

export interface SupersetInfo {
  /** "A", "B"… in order of appearance. */
  letter: string;
  /** 1-based position inside the group. */
  position: number;
  size: number;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Keeps groups valid after any edit: members must be contiguous and a group
 * needs at least two. A member separated from its group by a reorder leaves it.
 */
export function normaliseSupersets<T extends { supersetId?: string }>(items: T[]): T[] {
  const seen = new globalThis.Set<string>();
  const result = items.map((item) => ({ ...item }));

  // Pass 1: only the first contiguous run of each id keeps it.
  let previousId: string | undefined;
  result.forEach((item) => {
    const id = item.supersetId;
    if (!id) {
      previousId = undefined;
      return;
    }
    if (id !== previousId && seen.has(id)) delete item.supersetId;
    else seen.add(id);
    previousId = item.supersetId;
  });

  // Pass 2: drop single-member groups.
  const counts = new Map<string, number>();
  result.forEach((item) => item.supersetId && counts.set(item.supersetId, (counts.get(item.supersetId) ?? 0) + 1));
  result.forEach((item) => {
    if (item.supersetId && (counts.get(item.supersetId) ?? 0) < 2) delete item.supersetId;
  });
  return result;
}

export function supersetInfo(items: { supersetId?: string }[]): (SupersetInfo | null)[] {
  const letters = new Map<string, string>();
  const sizes = new Map<string, number>();
  items.forEach((item) => {
    if (!item.supersetId) return;
    if (!letters.has(item.supersetId)) letters.set(item.supersetId, String.fromCharCode(65 + letters.size));
    sizes.set(item.supersetId, (sizes.get(item.supersetId) ?? 0) + 1);
  });
  const positions = new Map<string, number>();
  return items.map((item) => {
    const id = item.supersetId;
    if (!id) return null;
    const position = (positions.get(id) ?? 0) + 1;
    positions.set(id, position);
    const size = sizes.get(id) ?? 1;
    return { letter: letters.get(id) ?? 'A', position, size, isFirst: position === 1, isLast: position === size };
  });
}

/** Links item `index` with the one after it, joining an existing group if either has one. */
export function linkWithNext<T extends { supersetId?: string }>(items: T[], index: number, newId: string): T[] {
  if (index < 0 || index >= items.length - 1) return items;
  const id = items[index].supersetId ?? items[index + 1].supersetId ?? newId;
  const otherId = items[index + 1].supersetId;
  const next = items.map((item, i) => {
    if (i === index || i === index + 1) return { ...item, supersetId: id };
    // Merging two groups: the following one adopts the id.
    if (otherId && otherId !== id && item.supersetId === otherId) return { ...item, supersetId: id };
    return item;
  });
  return normaliseSupersets(next);
}

/** Takes item `index` out of its group. Splits the group if it was in the middle. */
export function unlink<T extends { supersetId?: string }>(items: T[], index: number, newId: string): T[] {
  const id = items[index]?.supersetId;
  if (!id) return items;
  let afterRemoved = false;
  const next = items.map((item, i) => {
    if (i === index) {
      afterRemoved = true;
      const copy = { ...item };
      delete copy.supersetId;
      return copy;
    }
    if (afterRemoved && item.supersetId === id) return { ...item, supersetId: newId };
    return item;
  });
  return normaliseSupersets(next);
}

/**
 * Does ticking a set of `exercise` start the rest timer? Inside a superset, only
 * the last member's set does: you move straight to the next exercise otherwise.
 */
export function shouldRestAfter(items: WorkoutExercise[], workoutExerciseId: string): boolean {
  const index = items.findIndex((item) => item.id === workoutExerciseId);
  if (index < 0) return true;
  const info = supersetInfo(items)[index];
  return !info || info.isLast;
}

/* -------------------------------------------------------------------------- */
/* Warm-up                                                                     */
/* -------------------------------------------------------------------------- */

/** The ramp: empty bar, then 50 %, 70 % and 85 % of the first working weight. */
const WARMUP_STEPS: { pct: number; reps: number }[] = [
  { pct: 0.5, reps: 5 },
  { pct: 0.7, reps: 3 },
  { pct: 0.85, reps: 1 },
];

/**
 * Smallest jump the plates allow: two of the lightest plate. The result is
 * returned in kg, rounded down so a warm-up never ends up heavier than intended.
 */
function roundToPlates(kg: number, barKg: number, unit: WeightUnit): number {
  const smallest = unit === 'lb' ? DEFAULT_PLATES_LB[DEFAULT_PLATES_LB.length - 1] * KG_PER_LB : DEFAULT_PLATES_KG[DEFAULT_PLATES_KG.length - 1];
  const step = smallest * 2;
  if (kg <= barKg) return barKg;
  return barKg + Math.floor((kg - barKg) / step + 1e-9) * step;
}

export function buildWarmupSets(workingWeightKg: number, barKg: number, unit: WeightUnit): Set[] {
  if (!workingWeightKg || workingWeightKg <= barKg) return [];
  const sets: Set[] = [{ reps: 10, weight: barKg, completed: false, type: 'warmup' }];
  let last = barKg;
  WARMUP_STEPS.forEach(({ pct, reps }) => {
    const weight = Math.round(roundToPlates(workingWeightKg * pct, barKg, unit) * 100) / 100;
    if (weight > last && weight < workingWeightKg) {
      sets.push({ reps, weight, completed: false, type: 'warmup' });
      last = weight;
    }
  });
  return sets;
}

export function hasWarmup(exercise: WorkoutExercise): boolean {
  return exercise.sets.some((set) => set.type === 'warmup');
}

/** Replaces any unticked warm-up sets with a fresh ramp. */
export function withWarmup(exercise: WorkoutExercise, barKg: number, unit: WeightUnit): WorkoutExercise {
  const working = exercise.sets.find((set) => isCountedSet(set));
  const ramp = buildWarmupSets(working?.weight ?? 0, barKg, unit);
  if (ramp.length === 0) return exercise;
  const kept = exercise.sets.filter((set) => set.type !== 'warmup' || set.completed);
  return { ...exercise, sets: [...ramp, ...kept] };
}

export function withoutWarmup(exercise: WorkoutExercise): WorkoutExercise {
  return { ...exercise, sets: exercise.sets.filter((set) => set.type !== 'warmup' || set.completed) };
}

/** Row labels: warm-ups are "C" (calentamiento) / "W", working sets count from 1. */
export function setLabels(sets: Set[], warmupLetter: string): string[] {
  let working = 0;
  return sets.map((set) => {
    if (set.type === 'warmup') return warmupLetter;
    working += 1;
    return String(working);
  });
}

/* -------------------------------------------------------------------------- */
/* Swap                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Alternatives for an exercise: same muscle group and tracking, the ones you've
 * already done first (most sessions first), then the rest alphabetically.
 */
export function swapCandidates(
  current: { exerciseId: string; bodyPart?: string },
  exercises: Exercise[],
  log: WorkoutLog,
  excludeIds: string[],
  translate: (key: string) => string,
): { exercise: Exercise; sessions: number }[] {
  const source = exercises.find((exercise) => exercise.id === current.exerciseId);
  const bodyPart = source?.bodyPart ?? current.bodyPart;
  const counts = new Map<string, number>();
  Object.values(log).forEach((day) =>
    day.forEach((entry) => {
      if (entry.sets.some((set) => set.completed)) counts.set(entry.exerciseId, (counts.get(entry.exerciseId) ?? 0) + 1);
    }),
  );
  return exercises
    .filter((exercise) => exercise.id !== current.exerciseId && !excludeIds.includes(exercise.id))
    .filter((exercise) => !bodyPart || exercise.bodyPart === bodyPart)
    .map((exercise) => ({ exercise, sessions: counts.get(exercise.id) ?? 0 }))
    .sort((a, b) => b.sessions - a.sessions || translate(a.exercise.name).localeCompare(translate(b.exercise.name)));
}

/**
 * Applies a swap. Completed sets are history and stay with the original
 * exercise; the sets still to do move to the replacement, which is inserted
 * right after it (or takes its place when nothing was done yet).
 */
export function applySwap(
  items: WorkoutExercise[],
  workoutExerciseId: string,
  replacement: { id: string; exerciseId: string; exerciseName?: string; bodyPart?: WorkoutExercise['bodyPart']; sets: Set[] },
): WorkoutExercise[] {
  const index = items.findIndex((item) => item.id === workoutExerciseId);
  if (index < 0) return items;
  const original = items[index];
  const done = original.sets.filter((set) => set.completed);
  const swapped: WorkoutExercise = {
    ...original,
    id: done.length > 0 ? replacement.id : original.id,
    exerciseId: replacement.exerciseId,
    exerciseName: replacement.exerciseName,
    bodyPart: replacement.bodyPart,
    sets: replacement.sets,
    notes: undefined,
  };
  if (done.length === 0) return items.map((item, i) => (i === index ? swapped : item));
  const kept = { ...original, sets: done };
  return normaliseSupersets([...items.slice(0, index), kept, swapped, ...items.slice(index + 1)]);
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

export interface WorkoutSummary {
  durationMinutes: number | null;
  volumeKg: number;
  sets: number;
  exercises: number;
  prs: { exerciseId: string; name: string; weight: number; reps: number; kind: 'weight' | 'oneRm' }[];
  /** Previous session of the same routine day, if there is one. */
  previous: { date: string; volumeKg: number; sets: number; durationMinutes: number | null } | null;
}

function minutesBetween(session: DaySession | undefined): number | null {
  if (!session?.startedAt || !session.finishedAt) return null;
  const minutes = differenceInMinutes(parseISO(session.finishedAt), parseISO(session.startedAt));
  return minutes > 0 && minutes < 600 ? minutes : null;
}

function completedOnly(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises
    .map((exercise) => ({ ...exercise, sets: exercise.sets.filter((set) => set.completed) }))
    .filter((exercise) => exercise.sets.length > 0);
}

export function buildWorkoutSummary(
  log: WorkoutLog,
  sessions: DaySessions,
  dateKey: string,
  resolveName: (exercise: WorkoutExercise) => string,
): WorkoutSummary {
  const day = completedOnly(log[dateKey] ?? []);
  const session = sessions[dateKey];

  const prs: WorkoutSummary['prs'] = [];
  day.forEach((exercise) => {
    const pr = getExercisePR(log, exercise.exerciseId, dateKey);
    // Earlier dates only: a PR is beating what came before.
    const hadHistory = getExerciseSessions(log, exercise.exerciseId).some((entry) => entry.date < dateKey);
    if (!hadHistory) return;
    let best: WorkoutSummary['prs'][number] | null = null;
    exercise.sets.forEach((set) => {
      const kind = detectPR(set, pr);
      if (!kind) return;
      if (!best || set.weight > best.weight) {
        best = { exerciseId: exercise.exerciseId, name: resolveName(exercise), weight: set.weight, reps: set.reps, kind };
      }
    });
    if (best) prs.push(best);
  });

  let previous: WorkoutSummary['previous'] = null;
  if (session?.templateDayId) {
    const previousKey = Object.keys(sessions)
      .filter(
        (key) =>
          key < dateKey &&
          sessions[key]?.templateDayId === session.templateDayId &&
          sessions[key]?.templateId === session.templateId &&
          isWorkoutCompleted(log[key]),
      )
      .sort()
      .pop();
    if (previousKey) {
      const previousDay = completedOnly(log[previousKey] ?? []);
      previous = {
        date: previousKey,
        volumeKg: dayVolume(previousDay),
        sets: countedSets(previousDay),
        durationMinutes: minutesBetween(sessions[previousKey]),
      };
    }
  }

  return {
    durationMinutes: minutesBetween(session),
    volumeKg: dayVolume(day),
    sets: countedSets(day),
    exercises: day.length,
    prs,
    previous,
  };
}
