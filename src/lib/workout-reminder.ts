import { addDays, format, isSameDay, parse, startOfDay } from 'date-fns';
import type { WorkoutLog } from './types';
import { isWorkoutCompleted } from './workout-utils';
import {
  REMINDER_NOTIFICATION_ID,
  cancelNotification,
  scheduleNotification,
} from './rest-notifications';

/**
 * A nudge on days you planned to train and haven't.
 *
 * Everything is decided on the device: there is no server, and the app cannot
 * run code in the background. So the rule is to always hold *one* pending alert
 * for the next qualifying moment, and recompute it whenever the log changes.
 * If the day is already logged by the time it fires, it was cancelled long
 * before.
 */

/** Parses "HH:mm" onto a given day. Falls back to 18:30 on nonsense input. */
function timeOnDay(day: Date, hhmm: string): Date {
  const parsed = parse(hhmm, 'HH:mm', startOfDay(day));
  return Number.isNaN(parsed.getTime()) ? parse('18:30', 'HH:mm', startOfDay(day)) : parsed;
}

/**
 * A day counts as "planned" if something is on the log for it — a routine was
 * loaded, or exercises were added — but no set has been completed yet. A day
 * with nothing on it at all is a rest day, and rest days are not nagged.
 */
function isPlannedButUnlogged(log: WorkoutLog, day: Date): boolean {
  const entry = log[format(day, 'yyyy-MM-dd')];
  if (!entry?.length) return false;
  return !isWorkoutCompleted(entry);
}

export interface ReminderTexts {
  /** Called with the routine name when one can be inferred, else undefined. */
  title: (routine?: string) => string;
  body: string;
}

/** When the next reminder is due, and what it is for. */
export interface NextReminder {
  at: number;
  /** Named only for today, where the day's exercises are already known. */
  routine?: string;
}

/**
 * The decision, separated from the side effect: which moment in the next week
 * deserves a nudge, if any. A week is as far as a weekly plan can reach.
 */
export function nextReminder(log: WorkoutLog, time: string, now: Date): NextReminder | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(now, offset);
    const at = timeOnDay(day, time);

    // Today only qualifies if its reminder time hasn't already gone by.
    if (at.getTime() <= now.getTime()) continue;
    if (!isPlannedButUnlogged(log, day)) continue;

    const entry = log[format(day, 'yyyy-MM-dd')];
    // The first exercise's own name is the closest thing to a routine label
    // that survives on the log, since a loaded routine is flattened into it.
    const routine = isSameDay(day, now) ? entry?.[0]?.exerciseName : undefined;

    return routine ? { at: at.getTime(), routine } : { at: at.getTime() };
  }

  return null;
}

/**
 * Schedules the next reminder, or withdraws the pending one when the setting is
 * off or nothing qualifies.
 */
export async function syncWorkoutReminder(
  log: WorkoutLog,
  enabled: boolean,
  time: string,
  texts: ReminderTexts,
  now: Date = new Date(),
): Promise<void> {
  const next = enabled ? nextReminder(log, time, now) : null;

  if (!next) {
    await cancelNotification(REMINDER_NOTIFICATION_ID);
    return;
  }

  await scheduleNotification(
    REMINDER_NOTIFICATION_ID,
    next.at,
    texts.title(next.routine),
    texts.body,
  );
}
