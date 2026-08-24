import type { bodyParts } from './data';

export type BodyPart = (typeof bodyParts)[number];

export type WeightUnit = 'kg' | 'lb';

/**
 * Warm-up sets are excluded from volume and set counts so they don't inflate
 * the weekly-volume charts.
 */
export type SetType = 'warmup' | 'normal' | 'failure' | 'dropset';

export interface Set {
  reps: number;
  /** Always persisted in kilograms; convert at the UI edge with `fromKg`/`toKg`. */
  weight: number;
  completed: boolean;
  /** Seconds held, for timed exercises (planks, dead hangs). */
  duration?: number;
  /** Rate of Perceived Exertion, 1-10. */
  rpe?: number;
  /** Defaults to 'normal' when absent. */
  type?: SetType;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  /**
   * Name and body part are snapshotted when the exercise is logged so a deleted
   * exercise definition doesn't make past sets vanish from the UI and charts.
   */
  exerciseName?: string;
  bodyPart?: BodyPart;
  sets: Set[];
  notes?: string;
  /** Per-exercise rest target in seconds; falls back to the profile default. */
  restSeconds?: number;
  /**
   * Stamped from the routine when the workout is loaded, so the rule that
   * produced today's targets travels with the log rather than being re-derived
   * from a template that may have changed since.
   */
  progression?: ProgressionConfig;
}

export interface WorkoutLog {
  [date: string]: WorkoutExercise[];
}

/** How an exercise is measured. Drives which inputs the set row shows. */
export type ExerciseTracking = 'weight' | 'duration' | 'bodyweight';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  description: string;
  emoji: string;
  /** Defaults to 'weight' when absent. */
  tracking?: ExerciseTracking;
}

/**
 * How the next target is worked out for an exercise.
 *
 * - `linear`   adds a fixed step every time the session is completed.
 * - `double`   climbs reps inside a range first, then adds weight and drops
 *              back to the bottom of the range.
 * - `greyskull` last set is taken to failure; beating the target by a margin
 *              earns a double jump, and two failures trigger a deload.
 * - `time`     adds seconds, for planks and holds.
 * - `none`     no suggestion at all.
 */
export type ProgressionRule = 'linear' | 'double' | 'greyskull' | 'time' | 'none';

export interface ProgressionConfig {
  rule: ProgressionRule;
  /** Rep range for `double`; the bottom is where you restart after a jump. */
  repMin?: number;
  repMax?: number;
  /** Increment in kg, or seconds for `time`. Defaults to one small plate pair. */
  step?: number;
}

export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  /** Target weight in kg. Omitted means "use last session / 0". */
  weight?: number;
  restSeconds?: number;
  /** Overrides the routine's rule for this exercise only. */
  progression?: ProgressionConfig;
}

export interface TemplateDay {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

export interface WorkoutTemplate {
  id: string;
  /** Translation key for built-in templates, plain name for user-created ones. */
  nameKey: string;
  /** Legacy shape: a flat array of exercise ids. Kept for backwards compatibility. */
  exercises?: string[] | TemplateExercise[];
  /** Current shape: one or more named days. */
  days?: TemplateDay[];
  /** Applies to every exercise in the routine unless one overrides it. */
  progression?: ProgressionConfig;
}

export interface BodyEntry {
  /** yyyy-MM-dd, also the Firestore document id. */
  date: string;
  /** Kilograms. */
  weight?: number;
  /** Percentage. */
  fat?: number;
  /** Circumferences in cm. */
  waist?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
}

export interface ProfileSettings {
  weightUnit: WeightUnit;
  /** When false, ticking a set never starts a countdown. */
  restTimerEnabled: boolean;
  defaultRestSeconds: number;
  restTimerSound: boolean;
  restTimerNotifications: boolean;
  /** Reminds you on days with a routine planned and nothing logged yet. */
  workoutReminderEnabled: boolean;
  /** Local time of day for that reminder, as "HH:mm". */
  workoutReminderTime: string;
  /** Body-weight target in kg. The chart draws a line at it. */
  bodyWeightGoal?: number;
  /** Fallback rule for routines and exercises that don't specify one. */
  defaultProgression: ProgressionConfig;
  /** Bar weight in kg used by the plate calculator. */
  barWeight: number;
  /** Weekly set target per muscle group, shown as a band on the volume chart. */
  weeklySetTargetMin: number;
  weeklySetTargetMax: number;
}

export interface BackupPayload {
  version: 2;
  exportedAt: string;
  workoutLog: WorkoutLog;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  bodyEntries: BodyEntry[];
  settings?: Partial<ProfileSettings>;
}
