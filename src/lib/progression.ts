import type {
  ExerciseTracking,
  ProgressionConfig,
  ProgressionRule,
  Set,
  WeightUnit,
} from './types';
import {
  isCountedSet,
  round,
  toKg,
  weightStep,
  type ExerciseSession,
} from './workout-utils';

/**
 * Works out the next target for an exercise, and says why.
 *
 * Two rules apply to every strategy here, because they are what separate a
 * suggestion you can trust from one you learn to ignore:
 *
 * 1. **Missed reps never advance the load.** If the last session fell short of
 *    its target, the weight stays put — the plan is to earn it, not to outrun it.
 * 2. **Repeated failure deloads instead of insisting.** Stalling twice on the
 *    same weight means the weight is wrong, so it comes down.
 *
 * Every result carries a `reasonKey` so the UI can explain the number rather
 * than assert it.
 */

export const PROGRESSION_RULES: ProgressionRule[] = ['linear', 'double', 'greyskull', 'time', 'none'];

/** Translation keys for each rule, so every picker names them the same way. */
export const PROGRESSION_LABELS: Record<ProgressionRule, { name: string; description: string }> = {
  linear: { name: 'ruleLinear', description: 'ruleLinearDesc' },
  double: { name: 'ruleDouble', description: 'ruleDoubleDesc' },
  greyskull: { name: 'ruleGreyskull', description: 'ruleGreyskullDesc' },
  time: { name: 'ruleTime', description: 'ruleTimeDesc' },
  none: { name: 'ruleNone', description: 'ruleNoneDesc' },
};

/** Sessions to look back over when deciding whether a weight has stalled. */
const STALL_WINDOW = 3;

/** Consecutive failures at the same load before backing off. */
const STALL_LIMIT = 2;

/** Greyskull backs the weight off by this much after a stall. */
const DELOAD_FACTOR = 0.9;

/** Beating the top of the range by this many reps earns a double jump. */
const DOUBLE_JUMP_MARGIN = 5;

export interface ProgressionSuggestion {
  /** Suggested working weight in kg, or null when the target is reps/time. */
  weight: number | null;
  /** Suggested rep target, when the rule advances reps rather than load. */
  reps?: number;
  /** Suggested hold in seconds, for timed exercises. */
  duration?: number;
  /** Translation key explaining the number. */
  reasonKey: string;
  /** Values interpolated into the reason string. */
  reasonValues?: Record<string, string | number>;
  /** True when the suggestion is a step back rather than forward. */
  isDeload?: boolean;
}

export const DEFAULT_PROGRESSION: ProgressionConfig = {
  rule: 'double',
  repMin: 8,
  repMax: 12,
};

/**
 * The config that applies to an exercise, layered: the profile default first,
 * then the routine, then the exercise itself.
 *
 * Layering rather than picking one whole config matters for the fields nobody
 * sets twice. A routine that only names a rule should still climb in the
 * increment you configured once in Settings, instead of silently falling back
 * to a standard plate pair.
 *
 * Timed exercises fall back to the time rule, since adding weight to a plank is
 * not what most people mean.
 */
export function resolveProgression(
  exerciseOverride: ProgressionConfig | undefined,
  routineRule: ProgressionConfig | undefined,
  profileDefault: ProgressionConfig,
  tracking: ExerciseTracking,
): ProgressionConfig {
  const resolved: ProgressionConfig = {
    ...profileDefault,
    ...(routineRule ?? {}),
    ...(exerciseOverride ?? {}),
  };
  if (tracking === 'duration' && resolved.rule !== 'none' && resolved.rule !== 'time') {
    return { ...resolved, rule: 'time' };
  }
  return resolved;
}

/** Working sets only: warm-ups say nothing about whether you progressed. */
function workingSets(session: ExerciseSession): Set[] {
  return session.sets.filter(isCountedSet);
}

function topWeight(sets: Set[]): number {
  return sets.reduce((max, set) => Math.max(max, set.weight || 0), 0);
}

/** Every working set completed at or above the rep target. */
function metTarget(sets: Set[], repTarget: number): boolean {
  if (sets.length === 0) return false;
  return sets.every((set) => set.completed && set.reps >= repTarget);
}

/**
 * How many recent sessions in a row failed to meet their target at the same
 * weight. Used to decide between "hold" and "back off".
 */
function countStalls(history: ExerciseSession[], weight: number, repTarget: number): number {
  let stalls = 0;

  for (const session of history.slice(0, STALL_WINDOW)) {
    const sets = workingSets(session);
    if (sets.length === 0) continue;
    // Only sessions at this same load are evidence about this load.
    if (Math.abs(topWeight(sets) - weight) > 0.01) break;
    if (metTarget(sets, repTarget)) break;
    stalls += 1;
  }

  return stalls;
}

function stepFor(config: ProgressionConfig, unit: WeightUnit): number {
  return config.step ?? toKg(weightStep(unit), unit);
}

/**
 * @param history Sessions for this exercise, newest first. The first entry is
 *                the one being progressed from.
 */
export function suggestNextTarget(
  history: ExerciseSession[],
  config: ProgressionConfig,
  unit: WeightUnit,
  tracking: ExerciseTracking = 'weight',
): ProgressionSuggestion | null {
  if (config.rule === 'none') return null;

  const last = history[0];
  if (!last) return null;

  const sets = workingSets(last);
  if (sets.length === 0) return null;

  // ---------------------------------------------------------------- time --
  if (config.rule === 'time' || tracking === 'duration') {
    const step = config.step ?? 5;
    const best = sets.reduce((max, set) => Math.max(max, set.duration ?? 0), 0);
    if (best === 0) return null;

    const held = sets.every((set) => set.completed);
    if (!held) {
      return {
        weight: null,
        duration: best,
        reasonKey: 'progressionHoldTime',
        reasonValues: { seconds: best },
      };
    }

    return {
      weight: null,
      duration: best + step,
      reasonKey: 'progressionAddTime',
      reasonValues: { seconds: best + step, step },
    };
  }

  const weight = topWeight(sets);
  if (weight <= 0) {
    // Bodyweight work: advance reps instead of load.
    const repMax = config.repMax ?? 12;
    const bestReps = sets.reduce((max, set) => Math.max(max, set.reps), 0);
    if (!metTarget(sets, bestReps)) return null;
    return {
      weight: null,
      reps: bestReps + 1,
      reasonKey: 'progressionAddRep',
      reasonValues: { reps: bestReps + 1, max: repMax },
    };
  }

  const step = stepFor(config, unit);

  // -------------------------------------------------------------- linear --
  if (config.rule === 'linear') {
    const repTarget = config.repMin ?? Math.min(...sets.map((set) => set.reps));
    if (metTarget(sets, repTarget)) {
      return {
        weight: round(weight + step, 2),
        reasonKey: 'progressionLinearUp',
        reasonValues: { reps: repTarget },
      };
    }

    const stalls = countStalls(history, weight, repTarget);
    if (stalls >= STALL_LIMIT) {
      return {
        weight: round(weight * DELOAD_FACTOR, 2),
        reasonKey: 'progressionDeload',
        reasonValues: { sessions: stalls },
        isDeload: true,
      };
    }

    return { weight: round(weight, 2), reasonKey: 'progressionHoldWeight' };
  }

  // ------------------------------------------------------------ greyskull --
  if (config.rule === 'greyskull') {
    const repTarget = config.repMin ?? 5;
    const lastSet = sets[sets.length - 1];

    if (lastSet.completed && lastSet.reps >= repTarget + DOUBLE_JUMP_MARGIN) {
      return {
        weight: round(weight + step * 2, 2),
        reasonKey: 'progressionDoubleJump',
        reasonValues: { reps: lastSet.reps, target: repTarget },
      };
    }

    if (metTarget(sets, repTarget)) {
      return {
        weight: round(weight + step, 2),
        reasonKey: 'progressionLinearUp',
        reasonValues: { reps: repTarget },
      };
    }

    const stalls = countStalls(history, weight, repTarget);
    if (stalls >= STALL_LIMIT) {
      return {
        weight: round(weight * DELOAD_FACTOR, 2),
        reasonKey: 'progressionDeload',
        reasonValues: { sessions: stalls },
        isDeload: true,
      };
    }

    return { weight: round(weight, 2), reasonKey: 'progressionHoldWeight' };
  }

  // --------------------------------------------------------------- double --
  const repMin = config.repMin ?? 8;
  const repMax = config.repMax ?? 12;

  if (metTarget(sets, repMax)) {
    return {
      weight: round(weight + step, 2),
      reps: repMin,
      reasonKey: 'progressionRangeTop',
      reasonValues: { max: repMax, min: repMin },
    };
  }

  if (sets.every((set) => set.completed)) {
    const lowest = Math.min(...sets.map((set) => set.reps));
    return {
      weight: round(weight, 2),
      reps: Math.min(lowest + 1, repMax),
      reasonKey: 'progressionAddRepInRange',
      reasonValues: { reps: Math.min(lowest + 1, repMax), max: repMax },
    };
  }

  const stalls = countStalls(history, weight, repMin);
  if (stalls >= STALL_LIMIT) {
    return {
      weight: round(weight * DELOAD_FACTOR, 2),
      reps: repMin,
      reasonKey: 'progressionDeload',
      reasonValues: { sessions: stalls },
      isDeload: true,
    };
  }

  return { weight: round(weight, 2), reasonKey: 'progressionHoldWeight' };
}
