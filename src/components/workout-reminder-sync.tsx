"use client";

import { useEffect } from 'react';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { syncWorkoutReminder } from '@/lib/workout-reminder';

/**
 * Keeps the pending workout reminder in step with the log.
 *
 * Rendered once inside the providers rather than folded into one of them: it
 * needs the log, the settings and the translations at the same time, and none of
 * those contexts should have to know about the other two.
 */
export default function WorkoutReminderSync() {
  const { workoutLog, isLoading } = useWorkout();
  const { settings } = useProfile();
  const { t, language } = useLanguage();

  useEffect(() => {
    if (isLoading) return;

    void syncWorkoutReminder(
      workoutLog,
      settings.workoutReminderEnabled,
      settings.workoutReminderTime,
      {
        title: (routine) =>
          routine ? t('reminderTitle', { routine }) : t('reminderTitleGeneric'),
        body: t('reminderBody'),
      },
    );
    // `language` is a dependency in spirit: the texts change with it.
  }, [workoutLog, isLoading, settings.workoutReminderEnabled, settings.workoutReminderTime, t, language]);

  return null;
}
