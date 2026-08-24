import { differenceInCalendarDays, isValid, parseISO, startOfDay } from 'date-fns';
import type {
  BodyPart,
  Exercise,
  Set,
  TemplateDay,
  TemplateExercise,
  WeightUnit,
  WorkoutExercise,
  WorkoutLog,
  WorkoutTemplate,
} from './types';
import { DEFAULT_TEMPLATE_REPS, DEFAULT_TEMPLATE_SETS } from './data';

/* -------------------------------------------------------------------------- */
/* Units                                                                       */
/* -------------------------------------------------------------------------- */

export const KG_PER_LB = 0.45359237;

/** Converts a user-entered value in `unit` into the kilograms we persist. */
export function toKg(value: number, unit: WeightUnit): number {
  if (unit === 'lb') return round(value * KG_PER_LB, 3);
  return value;
}

/** Converts stored kilograms into the unit the user reads. */
export function fromKg(kg: number, unit: WeightUnit): number {
  if (unit === 'lb') return round(kg / KG_PER_LB, 1);
  return round(kg, 2);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  const value = fromKg(kg, unit);
  return `${trimZeros(value)} ${unit}`;
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function trimZeros(value: number): string {
  return String(round(value, 2));
}

/** Smallest sensible weight step for the given unit (one small plate pair). */
export function weightStep(unit: WeightUnit): number {
  return unit === 'lb' ? 5 : 2.5;
}

/* -------------------------------------------------------------------------- */
/* Sets, volume and 1RM                                                        */
/* -------------------------------------------------------------------------- */

/** Warm-ups don't count toward volume or weekly set targets. */
export function isCountedSet(set: Set): boolean {
  return (set.type ?? 'normal') !== 'warmup';
}

export function setVolume(set: Set): number {
  if (!isCountedSet(set)) return 0;
  return (set.reps || 0) * (set.weight || 0);
}

export function exerciseVolume(exercise: WorkoutExercise): number {
  return exercise.sets.reduce((total, set) => total + setVolume(set), 0);
}

export function dayVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce((total, exercise) => total + exerciseVolume(exercise), 0);
}

export function countedSets(exercises: WorkoutExercise[]): number {
  return exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => isCountedSet(set) && set.reps > 0).length,
    0,
  );
}

/** Epley estimate. Returns 0 for sets that can't produce a meaningful number. */
export function epley1RM(weight: number, reps: number): number {
  if (!weight || weight <= 0 || !reps || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function best1RMInSets(sets: Set[]): number {
  return sets.reduce((max, set) => {
    if (!isCountedSet(set)) return max;
    return Math.max(max, epley1RM(set.weight, set.reps));
  }, 0);
}

/** A day counts as a completed workout only when at least one set is ticked. */
export function isWorkoutCompleted(exercises: WorkoutExercise[] | undefined): boolean {
  if (!exercises?.length) return false;
  return exercises.some((exercise) => exercise.sets.some((set) => set.completed));
}

/** Sorted (newest first) list of date keys that hold a *completed* workout. */
export function completedWorkoutDates(log: WorkoutLog): string[] {
  return Object.keys(log)
    .filter((dateKey) => isWorkoutCompleted(log[dateKey]))
    .filter((dateKey) => isValid(parseISO(dateKey)))
    .sort((a, b) => (a < b ? 1 : -1));
}

export function totalCompletedWorkouts(log: WorkoutLog): number {
  return completedWorkoutDates(log).length;
}

/**
 * Consecutive-day streak counted from today or yesterday backwards. Only days
 * with at least one completed set participate, so merely planning a workout
 * never extends the streak.
 */
export function calculateStreak(log: WorkoutLog, today: Date = new Date()): number {
  const dates = completedWorkoutDates(log).map((dateKey) => startOfDay(parseISO(dateKey)));
  if (dates.length === 0) return 0;

  const daysSinceLatest = differenceInCalendarDays(startOfDay(today), dates[0]);
  if (daysSinceLatest > 1 || daysSinceLatest < 0) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i += 1) {
    const gap = differenceInCalendarDays(dates[i], dates[i + 1]);
    if (gap === 1) streak += 1;
    else if (gap > 1) break;
    // gap === 0 cannot happen: date keys are unique.
  }
  return streak;
}

/* -------------------------------------------------------------------------- */
/* Exercise history                                                            */
/* -------------------------------------------------------------------------- */

export interface ExerciseSession {
  date: string;
  sets: Set[];
  volume: number;
  best1RM: number;
  maxWeight: number;
}

/** Every session of one exercise, newest first. */
export function getExerciseSessions(log: WorkoutLog, exerciseId: string): ExerciseSession[] {
  const sessions: ExerciseSession[] = [];

  Object.entries(log).forEach(([date, exercises]) => {
    const matching = exercises.filter((exercise) => exercise.exerciseId === exerciseId);
    if (matching.length === 0) return;

    const sets = matching.flatMap((exercise) => exercise.sets);
    if (sets.length === 0) return;

    sessions.push({
      date,
      sets,
      volume: sets.reduce((total, set) => total + setVolume(set), 0),
      best1RM: best1RMInSets(sets),
      maxWeight: sets.reduce((max, set) => (isCountedSet(set) ? Math.max(max, set.weight || 0) : max), 0),
    });
  });

  return sessions.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * The most recent session strictly before `beforeDateKey`. Sessions with at
 * least one completed set win over merely-planned ones.
 */
export function getLastSession(
  log: WorkoutLog,
  exerciseId: string,
  beforeDateKey: string,
): ExerciseSession | null {
  const sessions = getExerciseSessions(log, exerciseId).filter((session) => session.date < beforeDateKey);
  const performed = sessions.find((session) => session.sets.some((set) => set.completed));
  return performed ?? sessions[0] ?? null;
}

export interface ExercisePR {
  maxWeight: number;
  maxWeightReps: number;
  best1RM: number;
  date: string | null;
}

/**
 * Best weight and best estimated 1RM ever recorded, optionally ignoring one day
 * (used to check whether *today* beats the previous best).
 */
export function getExercisePR(
  log: WorkoutLog,
  exerciseId: string,
  excludeDateKey?: string,
): ExercisePR {
  let maxWeight = 0;
  let maxWeightReps = 0;
  let best1RM = 0;
  let date: string | null = null;

  Object.entries(log).forEach(([dateKey, exercises]) => {
    if (excludeDateKey && dateKey === excludeDateKey) return;

    exercises
      .filter((exercise) => exercise.exerciseId === exerciseId)
      .forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (!isCountedSet(set) || !set.completed) return;
          if ((set.weight || 0) > maxWeight) {
            maxWeight = set.weight;
            maxWeightReps = set.reps;
            date = dateKey;
          }
          best1RM = Math.max(best1RM, epley1RM(set.weight, set.reps));
        });
      });
  });

  return { maxWeight, maxWeightReps, best1RM, date };
}

export type PRKind = 'weight' | 'oneRm' | null;

/** Does this set beat the stored PR? Used to light up the 🏆 badge live. */
export function detectPR(set: Set, pr: ExercisePR): PRKind {
  if (!set.completed || !isCountedSet(set) || !set.weight || set.weight <= 0) return null;
  if (set.weight > pr.maxWeight) return 'weight';
  if (epley1RM(set.weight, set.reps) > pr.best1RM && pr.best1RM > 0) return 'oneRm';
  return null;
}

/* -------------------------------------------------------------------------- */

export interface BalanceStats {
  push: number;
  pull: number;
  upper: number;
  lower: number;
}

/**
 * Push/pull and upper/lower split by set count. Arms are split evenly between
 * push and pull because we only track one muscle group per exercise.
 */
export function getBalanceStats(
  log: WorkoutLog,
  exercises: Exercise[],
  isInRange: (date: Date) => boolean,
): BalanceStats {
  const stats: BalanceStats = { push: 0, pull: 0, upper: 0, lower: 0 };

  Object.entries(log).forEach(([dateKey, dayExercises]) => {
    const date = parseISO(dateKey);
    if (!isValid(date) || !isInRange(date)) return;

    dayExercises.forEach((workoutExercise) => {
      const bodyPart = resolveBodyPart(workoutExercise, exercises);
      if (!bodyPart) return;

      const sets = workoutExercise.sets.filter((set) => isCountedSet(set) && set.reps > 0).length;
      if (sets === 0) return;

      switch (bodyPart) {
        case 'Chest':
        case 'Shoulders':
          stats.push += sets;
          stats.upper += sets;
          break;
        case 'Back':
          stats.pull += sets;
          stats.upper += sets;
          break;
        case 'Arms':
          stats.push += sets / 2;
          stats.pull += sets / 2;
          stats.upper += sets;
          break;
        case 'Legs':
          stats.lower += sets;
          break;
        case 'Core':
          break;
      }
    });
  });

  return stats;
}

/* -------------------------------------------------------------------------- */
/* Exercise resolution (orphan-safe)                                           */
/* -------------------------------------------------------------------------- */

export function resolveBodyPart(
  workoutExercise: WorkoutExercise,
  exercises: Exercise[],
): BodyPart | undefined {
  const definition = exercises.find((exercise) => exercise.id === workoutExercise.exerciseId);
  return definition?.bodyPart ?? workoutExercise.bodyPart;
}

/**
 * Resolves a display name even when the exercise definition was deleted, using
 * the snapshot stored on the log entry.
 */
export function resolveExerciseName(
  workoutExercise: WorkoutExercise,
  exercises: Exercise[],
  t: (key: string) => string,
): string {
  const definition = exercises.find((exercise) => exercise.id === workoutExercise.exerciseId);
  if (definition) return t(definition.name);
  if (workoutExercise.exerciseName) return workoutExercise.exerciseName;
  return t('deletedExercise');
}

export function resolveTracking(
  workoutExercise: WorkoutExercise,
  exercises: Exercise[],
): 'weight' | 'duration' | 'bodyweight' {
  const definition = exercises.find((exercise) => exercise.id === workoutExercise.exerciseId);
  return definition?.tracking ?? 'weight';
}

/* -------------------------------------------------------------------------- */
/* Plate calculator                                                            */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];

export interface PlateResult {
  /** Plates for ONE side of the bar. */
  plates: { weight: number; count: number }[];
  /** Weight that couldn't be matched with the available plates, per side x2. */
  leftover: number;
  achievable: number;
}

/**
 * Greedy per-side plate breakdown. `target` and `barWeight` must share `unit`.
 */
export function calculatePlates(
  target: number,
  barWeight: number,
  unit: WeightUnit,
  available?: number[],
): PlateResult | null {
  const plates = (available ?? (unit === 'lb' ? DEFAULT_PLATES_LB : DEFAULT_PLATES_KG))
    .slice()
    .sort((a, b) => b - a);

  if (target < barWeight) return null;

  let perSide = (target - barWeight) / 2;
  const result: { weight: number; count: number }[] = [];

  plates.forEach((plate) => {
    const count = Math.floor(round(perSide, 3) / plate);
    if (count > 0) {
      result.push({ weight: plate, count });
      perSide = round(perSide - count * plate, 3);
    }
  });

  const leftover = round(perSide * 2, 3);
  return { plates: result, leftover, achievable: round(target - leftover, 3) };
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

function isTemplateExerciseArray(
  value: string[] | TemplateExercise[] | undefined,
): value is TemplateExercise[] {
  return Array.isArray(value) && typeof value[0] === 'object';
}

/**
 * Normalises the three shapes a template can have on disk (legacy id array,
 * legacy TemplateExercise array, current multi-day) into days.
 */
export function templateDays(template: WorkoutTemplate): TemplateDay[] {
  if (template.days?.length) return template.days;

  const legacy = template.exercises;
  if (!legacy?.length) return [{ id: `${template.id}-d1`, name: template.nameKey, exercises: [] }];

  const exercises: TemplateExercise[] = isTemplateExerciseArray(legacy)
    ? legacy
    : (legacy as string[]).map((exerciseId) => ({
        exerciseId,
        sets: DEFAULT_TEMPLATE_SETS,
        reps: DEFAULT_TEMPLATE_REPS,
      }));

  return [{ id: `${template.id}-d1`, name: template.nameKey, exercises }];
}

export function templateExerciseCount(template: WorkoutTemplate): number {
  return templateDays(template).reduce((total, day) => total + day.exercises.length, 0);
}
