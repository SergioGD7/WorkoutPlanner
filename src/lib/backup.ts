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
