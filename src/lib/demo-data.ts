import { addDays, format, startOfWeek, subWeeks } from 'date-fns';
import { initialExercises, workoutTemplates } from './data';
import type {
  BodyEntry,
  DaySessions,
  StrengthGoal,
  Exercise,
  Set,
  WorkoutExercise,
  WorkoutLog,
  WorkoutTemplate,
} from './types';

/**
 * Read-only sample account.
 *
 * App Store review requires working access to an app that sits behind a login,
 * and the store screenshots need a populated history. Demo mode satisfies both
 * without shipping real user data: every provider below detects `isDemo` and
 * serves these fixtures instead of touching Firestore, and edits stay in memory.
 *
 * The data is generated relative to today so the streak, heatmap and weekly
 * charts always look alive, and it is deterministic so screenshots are stable.
 */
export const DEMO_UID = 'demo-user';

export const DEMO_EMAIL = 'demo@workoutplanner.app';

/** Weeks of history to generate. */
const WEEKS = 14;

/** A four-day upper/lower split, keyed by weekday index (1 = Monday). */
const SPLIT: Record<number, { exerciseId: string; sets: number; reps: number; startWeight: number; step: number }[]> = {
  1: [
    { exerciseId: 'ex1', sets: 4, reps: 8, startWeight: 60, step: 1.25 },
    { exerciseId: 'ex2', sets: 3, reps: 12, startWeight: 14, step: 0.5 },
    { exerciseId: 'ex10', sets: 4, reps: 8, startWeight: 35, step: 0.625 },
    { exerciseId: 'ex11', sets: 3, reps: 15, startWeight: 10, step: 0.25 },
  ],
  2: [
    { exerciseId: 'ex4', sets: 4, reps: 8, startWeight: 0, step: 0 },
    { exerciseId: 'ex5', sets: 4, reps: 10, startWeight: 55, step: 1.25 },
    { exerciseId: 'ex12', sets: 3, reps: 12, startWeight: 12, step: 0.5 },
  ],
  4: [
    { exerciseId: 'ex7', sets: 4, reps: 8, startWeight: 80, step: 2.5 },
    { exerciseId: 'ex8', sets: 3, reps: 12, startWeight: 120, step: 2.5 },
    { exerciseId: 'ex9', sets: 3, reps: 12, startWeight: 20, step: 0.5 },
    { exerciseId: 'ex14', sets: 3, reps: 0, startWeight: 0, step: 0 },
  ],
  5: [
    { exerciseId: 'ex6', sets: 3, reps: 5, startWeight: 90, step: 2.5 },
    { exerciseId: 'ex3', sets: 3, reps: 15, startWeight: 0, step: 0 },
    { exerciseId: 'ex13', sets: 3, reps: 12, startWeight: 0, step: 0 },
    { exerciseId: 'ex15', sets: 3, reps: 20, startWeight: 0, step: 0 },
  ],
};

function round(value: number, step = 0.25): number {
  return Math.round(value / step) * step;
}

export function buildDemoWorkoutLog(today: Date = new Date()): WorkoutLog {
  const log: WorkoutLog = {};
  const firstWeek = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 1 });

  for (let week = 0; week < WEEKS; week += 1) {
    const weekStart = addDays(firstWeek, week * 7);

    Object.entries(SPLIT).forEach(([weekdayKey, plan]) => {
      const weekday = Number(weekdayKey);
      const day = addDays(weekStart, weekday - 1);
      if (day > today) return;

      // Deload every fifth week: lighter, and the last week is still in progress.
      const isDeload = week > 0 && week % 5 === 4;
      const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

      const exercises: WorkoutExercise[] = plan.map((entry, exerciseIndex) => {
        const definition = initialExercises.find((exercise) => exercise.id === entry.exerciseId);
        const progressed = entry.startWeight + entry.step * week * entry.sets;
        const weight = round(isDeload ? progressed * 0.85 : progressed);
        const isTimed = definition?.tracking === 'duration';

        const sets: Set[] = Array.from({ length: entry.sets }, (_, setIndex) => {
          const set: Set = {
            reps: isTimed ? 0 : Math.max(4, entry.reps - (setIndex > 1 ? 1 : 0)),
            weight:
              entry.startWeight === 0
                ? 0
                : setIndex === 0
                  ? round(weight * 0.5, 2.5)
                  : round(weight - (entry.sets - 1 - setIndex) * entry.step),
            // The current day is left partly unticked so the app looks in-use.
            completed: !isToday || setIndex < entry.sets - 1,
            type: setIndex === 0 && entry.startWeight > 0 ? 'warmup' : 'normal',
          };
          if (isTimed) set.duration = 45 + week * 2 + setIndex * 5;
          if (setIndex === entry.sets - 1 && !isDeload) set.rpe = 9;
          return set;
        });

        return {
          id: `${format(day, 'yyyyMMdd')}-${exerciseIndex}`,
          exerciseId: entry.exerciseId,
          exerciseName: definition?.name,
          bodyPart: definition?.bodyPart,
          restSeconds: entry.reps <= 6 ? 180 : 90,
          // Monday's last two accessories run as a superset.
          ...(weekday === 1 && exerciseIndex >= 2 ? { supersetId: 'demo-mon-a' } : {}),
          sets,
        };
      });

      log[format(day, 'yyyy-MM-dd')] = exercises;
    });
  }

  return log;
}

const DEMO_DAY_NAMES: Record<number, string> = { 1: 'Torso A', 2: 'Pierna A', 4: 'Torso B', 5: 'Pierna B' };

/** Start and finish times for every past demo day, and the routine day it came from. */
export function buildDemoSessions(today: Date = new Date()): DaySessions {
  const sessions: DaySessions = {};
  const todayKey = format(today, 'yyyy-MM-dd');
  Object.keys(buildDemoWorkoutLog(today)).forEach((dateKey, index) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    // Today's session started 50 minutes ago, so finishing it shows a duration.
    const started =
      dateKey === todayKey
        ? new Date(today.getTime() - 50 * 60_000)
        : new Date(year, month - 1, day, 18, 30 + (index % 4) * 5);
    const weekday = new Date(year, month - 1, day).getDay();
    sessions[dateKey] = {
      startedAt: started.toISOString(),
      ...(dateKey === todayKey
        ? {}
        : { finishedAt: new Date(started.getTime() + (52 + (index % 5) * 4) * 60_000).toISOString() }),
      templateId: 'demo-upper-lower',
      templateDayId: `day-${weekday}`,
      templateName: DEMO_DAY_NAMES[weekday],
    };
  });
  return sessions;
}

export function buildDemoBodyEntries(today: Date = new Date()): BodyEntry[] {
  const entries: BodyEntry[] = [];

  for (let index = 0; index < WEEKS; index += 1) {
    const date = startOfWeek(subWeeks(today, WEEKS - 1 - index), { weekStartsOn: 1 });
    if (date > today) continue;

    entries.push({
      date: format(date, 'yyyy-MM-dd'),
      // A slow, believable cut: 78 kg down to about 75 kg.
      weight: round(78 - index * 0.22, 0.1),
      fat: round(18.5 - index * 0.14, 0.1),
      waist: round(84 - index * 0.2, 0.5),
      chest: round(102 + index * 0.05, 0.5),
      arm: round(35 + index * 0.04, 0.5),
    });
  }

  // Newest first, matching what the profile screen expects from Firestore.
  return entries.reverse();
}

export const DEMO_EXERCISES: Exercise[] = initialExercises;

/** The routine the demo history follows, so "today's plan" and comparisons work. */
const DEMO_ROUTINE: WorkoutTemplate = {
  id: 'demo-upper-lower',
  nameKey: 'Torso / Pierna',
  days: [1, 2, 4, 5].map((weekday) => ({
    id: `day-${weekday}`,
    name: DEMO_DAY_NAMES[weekday],
    exercises: SPLIT[weekday].map((entry, index) => ({
      exerciseId: entry.exerciseId,
      sets: entry.sets,
      reps: entry.reps,
      restSeconds: entry.reps <= 6 ? 180 : 90,
      ...(weekday === 1 && index >= 2 ? { supersetId: 'demo-mon-a' } : {}),
    })),
  })),
};

export const DEMO_TEMPLATES: WorkoutTemplate[] = [DEMO_ROUTINE, ...workoutTemplates];

/** Two goals a bit above the demo's records, so the trend chart has a target to aim at. */
export function buildDemoStrengthGoals(today: Date = new Date()): StrengthGoal[] {
  const log = buildDemoWorkoutLog(today);
  const best = (exerciseId: string) =>
    Math.max(
      0,
      ...Object.values(log).flatMap((day) =>
        day.filter((entry) => entry.exerciseId === exerciseId).flatMap((entry) => entry.sets.map((set) => set.weight)),
      ),
    );
  const above = (kg: number) => Math.ceil((kg * 1.08) / 2.5) * 2.5;
  const createdAt = subWeeks(today, 6).toISOString();
  return [
    { id: 'demo-goal-bench', exerciseId: 'ex1', kind: 'weight', weight: above(best('ex1')), createdAt },
    { id: 'demo-goal-deadlift', exerciseId: 'ex6', kind: 'oneRm', weight: above(best('ex6') * 1.17), createdAt },
  ];
}
