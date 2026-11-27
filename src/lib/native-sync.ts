/**
 * Bridges to the shells' own plugins for Apple Health / Health Connect and the
 * home-screen widgets. Every call is a no-op on the web and in an older shell.
 */
import { callNative, customPlugin, nativePlatform } from './native';
import type { WorkoutExercise } from './types';
import { countedSets, dayVolume } from './workout-utils';

/* -------------------------------------------------------------------------- */
/* Health                                                                      */
/* -------------------------------------------------------------------------- */

interface HealthPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(): Promise<{ granted: boolean }>;
  saveWorkout(options: { startDate: string; endDate: string; title: string; totalVolumeKg: number; sets: number }): Promise<void>;
  saveBodyWeight(options: { kg: number; date: string }): Promise<void>;
  readBodyWeights(options: { since: string }): Promise<{ samples: { date: string; kg: number }[] }>;
}

const getHealth = customPlugin<HealthPlugin>('WPHealth');

/** i18n key of the health store's name on this platform, null on the web. */
export function healthProviderKey(): 'appleHealth' | 'healthConnect' | null {
  const platform = nativePlatform();
  if (platform === 'ios') return 'appleHealth';
  if (platform === 'android') return 'healthConnect';
  return null;
}

export async function isHealthAvailable(): Promise<boolean> {
  const result = await callNative(getHealth, (plugin) => plugin.isAvailable());
  return Boolean(result?.available);
}

export async function requestHealthAuthorization(): Promise<boolean> {
  const result = await callNative(getHealth, (plugin) => plugin.requestAuthorization());
  return Boolean(result?.granted);
}

export async function saveBodyWeightToHealth(kg: number, dateKey: string): Promise<void> {
  // Noon local time: a date-only entry should not slide to the previous day in UTC.
  const [year, month, day] = dateKey.split('-').map(Number);
  await callNative(getHealth, (plugin) =>
    plugin.saveBodyWeight({ kg, date: new Date(year, month - 1, day, 12).toISOString() }),
  );
}

export async function readBodyWeightsFromHealth(since: Date): Promise<{ date: string; kg: number }[]> {
  const result = await callNative(getHealth, (plugin) => plugin.readBodyWeights({ since: since.toISOString() }));
  return result?.samples ?? [];
}

/* -------------------------------------------------------------------------- */
/* Widgets                                                                     */
/* -------------------------------------------------------------------------- */

export interface WidgetSnapshot {
  streak: number;
  weekWorkouts: number;
  weekTarget: number;
  /** Routine day suggested for today, or null when it's a rest day. */
  todayTitle: string | null;
  todayExercises: string[];
  /** Strings in the user's language, so the widget needs no i18n of its own. */
  labels: { streak: string; week: string; today: string; rest: string; days: string };
  updatedAt: string;
}

interface WidgetsPlugin {
  update(options: { json: string }): Promise<void>;
}

const getWidgets = customPlugin<WidgetsPlugin>('WPWidgets');

let lastWidgetJson = '';

export async function updateWidgets(snapshot: Omit<WidgetSnapshot, 'updatedAt'>): Promise<void> {
  const json = JSON.stringify(snapshot);
  if (json === lastWidgetJson) return;
  lastWidgetJson = json;
  await callNative(getWidgets, (plugin) =>
    plugin.update({ json: JSON.stringify({ ...snapshot, updatedAt: new Date().toISOString() }) }),
  );
}

/* -------------------------------------------------------------------------- */
/* Finishing a workout                                                         */
/* -------------------------------------------------------------------------- */

export async function onWorkoutFinished(input: {
  dateKey: string;
  exercises: WorkoutExercise[];
  startedAt: string;
  finishedAt: string;
  title: string;
  healthEnabled: boolean;
}): Promise<void> {
  if (!input.healthEnabled) return;
  const done = input.exercises
    .map((exercise) => ({ ...exercise, sets: exercise.sets.filter((set) => set.completed) }))
    .filter((exercise) => exercise.sets.length > 0);
  // HealthKit refuses zero-length workouts; give a ticked-in-one-go day a minute.
  const start = new Date(input.startedAt);
  let end = new Date(input.finishedAt);
  if (end.getTime() - start.getTime() < 60_000) end = new Date(start.getTime() + 60_000);
  await callNative(getHealth, (plugin) =>
    plugin.saveWorkout({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      title: input.title,
      totalVolumeKg: Math.round(dayVolume(done)),
      sets: countedSets(done),
    }),
  );
}
