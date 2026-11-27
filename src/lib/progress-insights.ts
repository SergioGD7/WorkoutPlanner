/**
 * Motivation layer over the log: achievements, strength goals with a projected
 * date, and the monthly recap. Pure functions of the data the app already has.
 */
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek,
  startOfMonth,
  subMonths,
} from 'date-fns';
import type { BodyEntry, DaySessions, StrengthGoal, WorkoutExercise, WorkoutLog } from './types';
import {
  completedWorkoutDates,
  countedSets,
  dayVolume,
  epley1RM,
  getExercisePR,
  getExerciseSessions,
  isCountedSet,
} from './workout-utils';

/* -------------------------------------------------------------------------- */
/* Achievements                                                                */
/* -------------------------------------------------------------------------- */

export type AchievementCategory = 'consistency' | 'strength' | 'volume';

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  /** i18n key of the title; the description key is `${titleKey}Desc`. */
  titleKey: string;
  values?: Record<string, string | number>;
  icon: 'medal' | 'flame' | 'dumbbell' | 'weight' | 'calendar';
  tier: 1 | 2 | 3;
}

export interface AchievementState extends AchievementDef {
  unlockedAt: string | null;
  /** 0..1 towards unlocking. */
  progress: number;
  /** Missing body weight makes strength medals unmeasurable. */
  needsBodyWeight?: boolean;
}

const WORKOUT_TIERS: [number, 1 | 2 | 3][] = [
  [1, 1],
  [10, 1],
  [25, 1],
  [50, 2],
  [100, 2],
  [250, 3],
  [500, 3],
];
const WEEK_STREAK_TIERS: [number, 1 | 2 | 3][] = [
  [4, 1],
  [12, 2],
  [26, 2],
  [52, 3],
];
/** Lifetime tonnage, in tonnes. */
const VOLUME_TIERS: [number, 1 | 2 | 3][] = [
  [10, 1],
  [100, 2],
  [500, 3],
];
/** Lift / body weight ratios. Exercise ids are the built-in lifts. */
const STRENGTH_TARGETS: { exerciseId: string; nameKey: string; ratios: [number, 1 | 2 | 3][] }[] = [
  { exerciseId: 'ex1', nameKey: 'benchPress', ratios: [[0.75, 1], [1, 2], [1.5, 3]] },
  { exerciseId: 'ex7', nameKey: 'squats', ratios: [[1, 1], [1.5, 2], [2, 3]] },
  { exerciseId: 'ex6', nameKey: 'deadlifts', ratios: [[1.25, 1], [2, 2], [2.5, 3]] },
  { exerciseId: 'ex10', nameKey: 'overheadPress', ratios: [[0.5, 1], [0.75, 2], [1, 3]] },
];

function weekKey(date: Date): string {
  return `${getISOWeekYear(date)}-${String(getISOWeek(date)).padStart(2, '0')}`;
}

function bodyWeightAt(entries: BodyEntry[], dateKey: string): number | null {
  const withWeight = entries.filter((entry) => entry.weight && entry.weight > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (withWeight.length === 0) return null;
  const before = withWeight.filter((entry) => entry.date <= dateKey).pop();
  return (before ?? withWeight[0]).weight ?? null;
}

function bestCompletedWeight(exercises: WorkoutExercise[], exerciseId: string): number {
  let best = 0;
  exercises
    .filter((exercise) => exercise.exerciseId === exerciseId)
    .forEach((exercise) =>
      exercise.sets.forEach((set) => {
        if (set.completed && isCountedSet(set) && set.reps > 0) best = Math.max(best, set.weight || 0);
      }),
    );
  return best;
}

/**
 * Replays the log in date order and records the first day each achievement's
 * condition held, so unlock dates are stable and back-filled for old history.
 */
export function computeAchievements(log: WorkoutLog, bodyEntries: BodyEntry[]): AchievementState[] {
  const dates = completedWorkoutDates(log).slice().reverse();
  const results: AchievementState[] = [];

  // Consistency: workout count.
  WORKOUT_TIERS.forEach(([count, tier]) => {
    results.push({
      id: `workouts-${count}`,
      category: 'consistency',
      titleKey: count === 1 ? 'achFirstWorkout' : 'achWorkouts',
      values: { count },
      icon: 'medal',
      tier,
      unlockedAt: dates[count - 1] ?? null,
      progress: Math.min(1, dates.length / count),
    });
  });

  // Consistency: consecutive ISO weeks with at least one workout.
  const weeks: { key: string; firstDate: string }[] = [];
  dates.forEach((dateKey) => {
    const key = weekKey(parseISO(dateKey));
    if (weeks[weeks.length - 1]?.key !== key) weeks.push({ key, firstDate: dateKey });
  });
  let run = 0;
  let bestRun = 0;
  const reachedAt = new Map<number, string>();
  weeks.forEach((week, index) => {
    const previous = weeks[index - 1];
    const consecutive =
      previous &&
      weekKey(addDays(startOfISOWeek(parseISO(previous.firstDate)), 7)) === week.key;
    run = consecutive ? run + 1 : 1;
    bestRun = Math.max(bestRun, run);
    WEEK_STREAK_TIERS.forEach(([target]) => {
      if (run >= target && !reachedAt.has(target)) reachedAt.set(target, week.firstDate);
    });
  });
  WEEK_STREAK_TIERS.forEach(([target, tier]) => {
    results.push({
      id: `weeks-${target}`,
      category: 'consistency',
      titleKey: 'achWeekStreak',
      values: { count: target },
      icon: 'calendar',
      tier,
      unlockedAt: reachedAt.get(target) ?? null,
      progress: Math.min(1, bestRun / target),
    });
  });

  // Volume: lifetime tonnes.
  let total = 0;
  const volumeAt = new Map<number, string>();
  dates.forEach((dateKey) => {
    total += dayVolume(log[dateKey].map((exercise) => ({ ...exercise, sets: exercise.sets.filter((set) => set.completed) })));
    VOLUME_TIERS.forEach(([tonnes]) => {
      if (total >= tonnes * 1000 && !volumeAt.has(tonnes)) volumeAt.set(tonnes, dateKey);
    });
  });
  VOLUME_TIERS.forEach(([tonnes, tier]) => {
    results.push({
      id: `volume-${tonnes}`,
      category: 'volume',
      titleKey: 'achVolume',
      values: { tonnes },
      icon: 'dumbbell',
      tier,
      unlockedAt: volumeAt.get(tonnes) ?? null,
      progress: Math.min(1, total / (tonnes * 1000)),
    });
  });

  // Strength relative to body weight.
  const latestBodyWeight = bodyWeightAt(bodyEntries, '9999-12-31');
  STRENGTH_TARGETS.forEach(({ exerciseId, nameKey, ratios }) => {
    let bestRatio = 0;
    const ratioAt = new Map<number, string>();
    dates.forEach((dateKey) => {
      const lifted = bestCompletedWeight(log[dateKey], exerciseId);
      const bodyWeight = bodyWeightAt(bodyEntries, dateKey);
      if (!lifted || !bodyWeight) return;
      const ratio = lifted / bodyWeight;
      bestRatio = Math.max(bestRatio, ratio);
      ratios.forEach(([target]) => {
        if (ratio >= target - 1e-9 && !ratioAt.has(target)) ratioAt.set(target, dateKey);
      });
    });
    ratios.forEach(([target, tier]) => {
      results.push({
        id: `strength-${exerciseId}-${target}`,
        category: 'strength',
        titleKey: 'achStrength',
        values: { exercise: nameKey, ratio: String(target).replace('.', ',') },
        icon: 'weight',
        tier,
        unlockedAt: ratioAt.get(target) ?? null,
        progress: Math.min(1, bestRatio / target),
        needsBodyWeight: latestBodyWeight === null,
      });
    });
  });

  return results;
}

export function achievementsUnlockedOn(achievements: AchievementState[], dateKey: string): AchievementState[] {
  return achievements.filter((achievement) => achievement.unlockedAt === dateKey);
}

/* -------------------------------------------------------------------------- */
/* Strength goals                                                              */
/* -------------------------------------------------------------------------- */

export interface GoalProgress {
  goal: StrengthGoal;
  /** Current best, in the goal's own terms (kg, or reps at the goal load). */
  current: number;
  target: number;
  progress: number;
  achieved: boolean;
  achievedOn: string | null;
  /** Projected date from the e1RM trend, or null when there's no upward trend. */
  estimatedDate: string | null;
  /** Best e1RM per session over the last 12 weeks; x is days from today (≤ 0). */
  history: { x: number; y: number }[];
  /** e1RM the goal is worth, the line the chart aims at. */
  targetOneRm: number;
  /** Trend in kg of e1RM per 30 days; null with fewer than three sessions. */
  kgPerMonth: number | null;
  /** Where the projection starts (today) and how many days it takes. */
  projection: { fromY: number; days: number } | null;
  /** Not met yet, but the estimated 1RM already covers it: time to try. */
  readyNow: boolean;
}

/** e1RM that the goal amounts to, so every kind can share one trend line. */
function goalOneRm(goal: StrengthGoal): number {
  if (goal.kind === 'oneRm') return goal.weight;
  if (goal.kind === 'reps') return epley1RM(goal.weight, goal.reps ?? 1);
  return epley1RM(goal.weight, 1);
}

function goalMetOnDay(goal: StrengthGoal, exercises: WorkoutExercise[]): boolean {
  return exercises
    .filter((exercise) => exercise.exerciseId === goal.exerciseId)
    .some((exercise) =>
      exercise.sets.some((set) => {
        if (!set.completed || !isCountedSet(set) || set.reps <= 0) return false;
        if (goal.kind === 'weight') return set.weight >= goal.weight - 1e-9;
        if (goal.kind === 'reps') return set.weight >= goal.weight - 1e-9 && set.reps >= (goal.reps ?? 1);
        return epley1RM(set.weight, set.reps) >= goal.weight - 1e-9;
      }),
    );
}

/** Least-squares slope (e1RM per day) over the last 12 weeks of sessions. */
/** Best completed e1RM per session over the last 12 weeks, oldest first. */
export function e1rmHistory(log: WorkoutLog, exerciseId: string, today: Date): { x: number; y: number }[] {
  const from = format(addDays(today, -84), 'yyyy-MM-dd');
  return getExerciseSessions(log, exerciseId)
    .filter((session) => session.date >= from && session.sets.some((set) => set.completed))
    .map((session) => ({
      x: differenceInCalendarDays(parseISO(session.date), today),
      y: session.sets.reduce(
        (max, set) => (set.completed && isCountedSet(set) ? Math.max(max, epley1RM(set.weight, set.reps)) : max),
        0,
      ),
    }))
    .filter((point) => point.y > 0)
    .sort((a, b) => a.x - b.x);
}

/** Least-squares slope (e1RM per day) over the last 12 weeks of sessions. */
export function e1rmTrend(log: WorkoutLog, exerciseId: string, today: Date): { slope: number; fitToday: number } | null {
  const points = e1rmHistory(log, exerciseId, today);
  if (points.length < 3) return null;
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;
  const sxx = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (sxx === 0) return null;
  const slope = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / sxx;
  return { slope, fitToday: meanY - slope * meanX };
}

export function evaluateGoal(goal: StrengthGoal, log: WorkoutLog, today: Date = new Date()): GoalProgress {
  const pr = getExercisePR(log, goal.exerciseId);
  let current = 0;
  if (goal.kind === 'weight') current = pr.maxWeight;
  else if (goal.kind === 'oneRm') current = pr.best1RM;
  else {
    Object.values(log).forEach((day) =>
      day
        .filter((exercise) => exercise.exerciseId === goal.exerciseId)
        .forEach((exercise) =>
          exercise.sets.forEach((set) => {
            if (set.completed && isCountedSet(set) && set.weight >= goal.weight - 1e-9) current = Math.max(current, set.reps);
          }),
        ),
    );
  }
  const target = goal.kind === 'reps' ? goal.reps ?? 1 : goal.weight;

  const achievedOn =
    Object.keys(log)
      .filter((dateKey) => dateKey >= goal.createdAt.slice(0, 10) && goalMetOnDay(goal, log[dateKey]))
      .sort()[0] ?? null;
  const achieved = current >= target - 1e-9;

  const targetOneRm = goalOneRm(goal);
  const trend = e1rmTrend(log, goal.exerciseId, today);
  let estimatedDate: string | null = null;
  let projection: GoalProgress['projection'] = null;
  if (!achieved && trend && trend.slope > 0.005) {
    const fromY = Math.max(trend.fitToday, pr.best1RM);
    const days = Math.ceil((targetOneRm - fromY) / trend.slope);
    if (days > 0 && days <= 730) {
      estimatedDate = format(addDays(today, days), 'yyyy-MM-dd');
      projection = { fromY, days };
    }
  }

  return {
    goal,
    current,
    target,
    progress: target > 0 ? Math.min(1, current / target) : 0,
    achieved,
    achievedOn,
    estimatedDate,
    history: e1rmHistory(log, goal.exerciseId, today),
    targetOneRm,
    kgPerMonth: trend ? trend.slope * 30 : null,
    projection,
    readyNow: !achieved && pr.best1RM >= targetOneRm,
  };
}

/* -------------------------------------------------------------------------- */
/* Monthly recap                                                               */
/* -------------------------------------------------------------------------- */

export interface MonthlyRecap {
  month: string; // yyyy-MM
  workouts: number;
  volumeKg: number;
  sets: number;
  minutes: number;
  /** Days of the month with a completed workout (1-31). */
  trainedDays: number[];
  daysInMonth: number;
  /** Weekday of the 1st, Monday = 0. */
  firstWeekday: number;
  topExercises: { exerciseId: string; name: string; sets: number }[];
  prCount: number;
  achievements: AchievementState[];
  previous: { workouts: number; volumeKg: number } | null;
}

export function buildMonthlyRecap(
  log: WorkoutLog,
  sessions: DaySessions,
  bodyEntries: BodyEntry[],
  monthDate: Date,
  resolveName: (exercise: WorkoutExercise) => string,
): MonthlyRecap {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const startKey = format(start, 'yyyy-MM-dd');
  const endKey = format(end, 'yyyy-MM-dd');
  const inMonth = completedWorkoutDates(log).filter((key) => key >= startKey && key <= endKey);

  const completed = (dateKey: string) =>
    log[dateKey]
      .map((exercise) => ({ ...exercise, sets: exercise.sets.filter((set) => set.completed) }))
      .filter((exercise) => exercise.sets.length > 0);

  let volumeKg = 0;
  let sets = 0;
  let minutes = 0;
  const perExercise = new Map<string, { name: string; sets: number }>();
  let prCount = 0;

  inMonth.forEach((dateKey) => {
    const day = completed(dateKey);
    volumeKg += dayVolume(day);
    sets += countedSets(day);
    const session = sessions[dateKey];
    if (session?.startedAt && session.finishedAt) {
      const duration = (parseISO(session.finishedAt).getTime() - parseISO(session.startedAt).getTime()) / 60000;
      if (duration > 0 && duration < 600) minutes += duration;
    }
    // A PR day: beat everything before this date.
    const before: WorkoutLog = Object.fromEntries(Object.entries(log).filter(([key]) => key < dateKey));
    day.forEach((exercise) => {
      const entry = perExercise.get(exercise.exerciseId) ?? { name: resolveName(exercise), sets: 0 };
      entry.sets += exercise.sets.filter(isCountedSet).length;
      perExercise.set(exercise.exerciseId, entry);

      const previous = getExercisePR(before, exercise.exerciseId);
      if (previous.maxWeight <= 0) return;
      const beat = exercise.sets.some(
        (set) => isCountedSet(set) && (set.weight > previous.maxWeight || epley1RM(set.weight, set.reps) > previous.best1RM),
      );
      if (beat) prCount += 1;
    });
  });

  const previousStart = format(startOfMonth(subMonths(start, 1)), 'yyyy-MM-dd');
  const previousEnd = format(endOfMonth(subMonths(start, 1)), 'yyyy-MM-dd');
  const previousDates = completedWorkoutDates(log).filter((key) => key >= previousStart && key <= previousEnd);

  return {
    month: format(start, 'yyyy-MM'),
    workouts: inMonth.length,
    volumeKg,
    sets,
    minutes: Math.round(minutes),
    trainedDays: inMonth.map((key) => Number(key.slice(8, 10))).sort((a, b) => a - b),
    daysInMonth: end.getDate(),
    firstWeekday: (start.getDay() + 6) % 7,
    topExercises: Array.from(perExercise.entries())
      .map(([exerciseId, value]) => ({ exerciseId, ...value }))
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 3),
    prCount,
    achievements: computeAchievements(log, bodyEntries).filter(
      (achievement) => achievement.unlockedAt && achievement.unlockedAt >= startKey && achievement.unlockedAt <= endKey,
    ),
    previous:
      previousDates.length > 0
        ? {
            workouts: previousDates.length,
            volumeKg: previousDates.reduce((total, key) => total + dayVolume(completed(key)), 0),
          }
        : null,
  };
}
