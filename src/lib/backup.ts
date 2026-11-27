import type { BackupPayload, WorkoutLog } from './types';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accepts both the current backup envelope and the bare `{date: exercises[]}`
 * workout log that older exports produced.
 */
export function normaliseBackup(parsed: unknown): BackupPayload | null {
  if (!parsed || typeof parsed !== 'object') return null;

  const candidate = parsed as Partial<BackupPayload> & Record<string, unknown>;

  if (candidate.workoutLog && typeof candidate.workoutLog === 'object') {
    return {
      version: 2,
      exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
      workoutLog: candidate.workoutLog as WorkoutLog,
      exercises: Array.isArray(candidate.exercises) ? candidate.exercises : [],
      templates: Array.isArray(candidate.templates) ? candidate.templates : [],
      bodyEntries: Array.isArray(candidate.bodyEntries) ? candidate.bodyEntries : [],
      settings: candidate.settings,
      sessions: candidate.sessions && typeof candidate.sessions === 'object' ? candidate.sessions : undefined,
      photos: Array.isArray(candidate.photos) ? candidate.photos : undefined,
    };
  }

  const keys = Object.keys(candidate);
  const looksLikeLegacyLog =
    keys.length > 0 && keys.every((key) => DATE_KEY.test(key) && Array.isArray(candidate[key]));

  if (looksLikeLegacyLog) {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      workoutLog: candidate as unknown as WorkoutLog,
      exercises: [],
      templates: [],
      bodyEntries: [],
    };
  }

  return null;
}

/**
 * Copy for the automatic iCloud Drive backup. App Store guideline 5.1.3 bars
 * apps that use HealthKit from storing personal health information in iCloud,
 * so body weight (and the weight goal) stay out of it. Restoring is unaffected:
 * body entries and settings are merged, so the weights kept in the account
 * survive a restore from one of these files.
 */
export function withoutBodyWeight(payload: BackupPayload): BackupPayload {
  const bodyEntries = payload.bodyEntries
    .map(({ weight: _weight, ...rest }) => rest)
    .filter((entry) => Object.keys(entry).length > 1);
  const settings = payload.settings ? { ...payload.settings } : undefined;
  if (settings) delete settings.bodyWeightGoal;
  return { ...payload, bodyEntries, settings };
}
