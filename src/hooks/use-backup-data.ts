"use client";

import { useCallback } from 'react';
import { useExercises } from '@/context/exercise-context';
import { useProfile } from '@/context/profile-context';
import { useTemplates } from '@/context/template-context';
import { useWorkout } from '@/context/workout-context';
import type { BackupPayload } from '@/lib/types';

/**
 * Builds and restores the full-account backup. Shared by the manual
 * "Download backup" button and the automatic iCloud / device backup.
 */
export function useBackupData() {
  const { workoutLog, replaceLog } = useWorkout();
  const { exercises, replaceExercises } = useExercises();
  const { templates, replaceTemplates } = useTemplates();
  const { settings, bodyEntries, replaceBodyEntries, updateSettings } = useProfile();

  const buildPayload = useCallback(
    (): BackupPayload => ({
      version: 2,
      exportedAt: new Date().toISOString(),
      workoutLog,
      exercises,
      templates,
      bodyEntries,
      settings,
    }),
    [workoutLog, exercises, templates, bodyEntries, settings],
  );

  const restorePayload = useCallback(
    async (payload: BackupPayload) => {
      if (payload.exercises?.length) await replaceExercises(payload.exercises);
      if (payload.templates?.length) await replaceTemplates(payload.templates);
      if (payload.bodyEntries?.length) await replaceBodyEntries(payload.bodyEntries);
      if (payload.settings) await updateSettings(payload.settings);
      // Workouts last: it's the slowest write and the one worth retrying alone.
      await replaceLog(payload.workoutLog);
    },
    [replaceExercises, replaceTemplates, replaceBodyEntries, updateSettings, replaceLog],
  );

  return { buildPayload, restorePayload };
}
