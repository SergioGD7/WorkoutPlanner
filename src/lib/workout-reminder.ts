import { addDays, format, isSameDay, parse, startOfDay } from 'date-fns';
import type { WorkoutLog } from './types';
import { isWorkoutCompleted } from './workout-utils';
import {
  LEGACY_REMINDER_ID,
  REMINDER_HORIZON_DAYS,
  REMINDER_IDS,
  cancelNotifications,
  scheduleNotifications,
  type PendingNotification,
} from './rest-notifications';

/**
 * A nudge on your training days, when the day is nearly over and nothing has
 * been logged.
 *
 * The first version keyed off the log: a day qualified if it already had
 * exercises on it but no completed set. That can only ever describe *today*,
 * and only after you have opened the app and loaded a routine — so on the day
 * that actually matters, a day you meant to train and never opened the app,
 * there was nothing on the log and no reminder was ever scheduled. The log
 * records what happened; it holds no plan for a future date. Which days you
 * train has to be stated, and `workoutReminderDays` states it.
 *
 * Everything is decided on the device: there is no server, and the app cannot
 * run code in the background. So the whole horizon is booked with the OS in
 * advance, one alert per training day, and re-armed whenever the log or the
 * settings change. A day that gets logged before its alert is due loses it on
 * the next re-arm.
 */

/** Parses "HH:mm" onto a given day. Falls back to 18:30 on nonsense input. */
function timeOnDay(day: Date, hhmm: string): Date {
  const parsed = parse(hhmm, 'HH:mm', startOfDay(day));
  return Number.isNaN(parsed.getTime()) ? parse('18:30', 'HH:mm', startOfDay(day)) : parsed;
}

export interface ReminderTexts {
  /** Called with the routine name when one can be inferred, else undefined. */
  title: (routine?: string) => string;
  body: string;
}

/** One reminder the OS should hold. */
export interface PlannedReminder {
  at: number;
  /** Named only for today, where the day's exercises are already known. */
  routine?: string;
}

/**
 * The decision, separated from the side effect: which moments over the next
 * fortnight deserve a nudge.
 *
 * A day qualifies when it is one of your training days, its time has not yet
 * passed, and nothing has been logged for it. "Nothing logged" means no
 * completed set — half a session still counts as having trained, and finishing
 * the last set is not what a reminder is for.
 */
export function plannedReminders(
  log: WorkoutLog,
  days: number[],
  time: string,
  now: Date,
  horizon: number = REMINDER_HORIZON_DAYS,
): PlannedReminder[] {
  if (days.length === 0) return [];

  const planned: PlannedReminder[] = [];

  for (let offset = 0; offset < horizon; offset += 1) {
    const day = addDays(now, offset);
    if (!days.includes(day.getDay())) continue;

    const at = timeOnDay(day, time);
    // Today only qualifies if its reminder time hasn't already gone by.
    if (at.getTime() <= now.getTime()) continue;

    const entry = log[format(day, 'yyyy-MM-dd')];
    if (isWorkoutCompleted(entry)) continue;

    // The first exercise's own name is the closest thing to a routine label that
    // survives on the log, and only today can have one: a routine is flattened
    // onto a day when you load it, which nobody does in advance.
    const routine = isSameDay(day, now) ? entry?.[0]?.exerciseName : undefined;

    planned.push(routine ? { at: at.getTime(), routine } : { at: at.getTime() });
  }

  return planned;
}

/**
 * The horizon already booked with the OS, as a comparable string.
 *
 * The caller re-runs on every Firestore snapshot — both the log and the settings
 * arrive as new objects each time — and re-arming a fortnight of alerts on each
 * one is a dozen pointless trips across the native bridge.
 *
 * `null` means "we have not looked yet", which is not the same as "nothing is
 * booked": a previous session may have left alerts with the OS, and they outlive
 * the process. An empty string is the confirmed-empty state.
 */
let bookedSignature: string | null = null;

/** Whether the retired single-reminder id has been cleared this session. */
let legacyCleared = false;

/** Test seam: the module holds state that outlives a single call. */
export function resetReminderCache(): void {
  bookedSignature = null;
  legacyCleared = false;
}

/**
 * Books the horizon, or clears it when the setting is off or nothing qualifies.
 */
export async function syncWorkoutReminder(
  log: WorkoutLog,
  enabled: boolean,
  days: number[],
  time: string,
  texts: ReminderTexts,
  now: Date = new Date(),
): Promise<void> {
  // Older builds held a single reminder under its own id. Retire it once per
  // session so it cannot fire alongside the new block.
  if (!legacyCleared) {
    await cancelNotifications([LEGACY_REMINDER_ID]);
    legacyCleared = true;
  }

  if (!enabled) {
    // Not `!== null`: on a cold start we have no idea what the OS is still
    // holding from last time, and skipping the clear would leave a switched-off
    // reminder firing for another fortnight.
    if (bookedSignature !== '') {
      await cancelNotifications(REMINDER_IDS);
      bookedSignature = '';
    }
    return;
  }

  const pending: PendingNotification[] = plannedReminders(log, days, time, now)
    .slice(0, REMINDER_IDS.length)
    .map((reminder, index) => ({
      id: REMINDER_IDS[index],
      at: reminder.at,
      title: texts.title(reminder.routine),
      body: texts.body,
    }));

  const signature = pending.map((item) => `${item.id}@${item.at}:${item.title}`).join('|');
  if (signature === bookedSignature) return;

  await scheduleNotifications(REMINDER_IDS, pending);
  bookedSignature = signature;
}
