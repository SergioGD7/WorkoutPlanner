"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addMonths, format, startOfISOWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useTemplates } from '@/context/template-context';
import { useWorkout } from '@/context/workout-context';
import { useExercises } from '@/context/exercise-context';
import { useBackupData } from '@/hooks/use-backup-data';
import { runAutoBackup } from '@/lib/cloud-backup';
import { isNativeApp, lazyPlugin } from '@/lib/native';
import { updateWidgets } from '@/lib/native-sync';
import { exportPhotos } from '@/lib/photo-store';
import { cancelNotification, scheduleNotification } from '@/lib/rest-notifications';
import { planForToday } from '@/lib/session';
import { calculateStreak, completedWorkoutDates } from '@/lib/workout-utils';

export const RECAP_NOTIFICATION_ID = 4;

/** Set by a deep link, consumed by the screen that handles it once it mounts. */
export const PENDING_ACTION_KEY = 'wp.pendingAction';
export type PendingAction = 'start-workout' | 'log-weight';

export function takePendingAction(action: PendingAction): boolean {
  try {
    if (sessionStorage.getItem(PENDING_ACTION_KEY) !== action) return false;
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return true;
  } catch {
    return false;
  }
}

const getApp = lazyPlugin(() => import('@capacitor/app').then((m) => m.App));

/**
 * Keeps everything that lives outside the WebView in step with the data:
 * home-screen widgets, the monthly-recap notification, the weekly automatic
 * backup, and deep links from widgets, Siri and Shortcuts.
 */
export default function NativeSync() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { settings } = useProfile();
  const { templates } = useTemplates();
  const { exercises } = useExercises();
  const { workoutLog, sessions, isLoading } = useWorkout();
  const { buildPayload } = useBackupData();
  const backupRanRef = useRef<string | null>(null);

  /* Widgets ---------------------------------------------------------------- */
  useEffect(() => {
    if (isLoading || !user || !isNativeApp()) return;
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfISOWeek(new Date()), 'yyyy-MM-dd');
    const weekWorkouts = completedWorkoutDates(workoutLog).filter((key) => key >= weekStart && key <= todayKey).length;
    const plan = planForToday(
      workoutLog,
      sessions,
      templates,
      settings.workoutReminderEnabled ? settings.workoutReminderDays : null,
      todayKey,
      t,
    );
    const nameOf = (id: string) => {
      const definition = exercises.find((exercise) => exercise.id === id);
      return definition ? t(definition.name) : '';
    };
    void updateWidgets({
      streak: calculateStreak(workoutLog),
      weekWorkouts,
      weekTarget: settings.workoutReminderDays?.length || 3,
      todayTitle: plan?.title ?? null,
      todayExercises: (plan?.exerciseIds ?? []).map(nameOf).filter(Boolean).slice(0, 6),
      labels: {
        streak: t('widgetStreak'),
        week: t('widgetWeek'),
        today: t('widgetToday'),
        rest: t('widgetRestDay'),
        days: t('widgetDays'),
      },
    });
  }, [isLoading, user, workoutLog, sessions, templates, exercises, settings.workoutReminderEnabled, settings.workoutReminderDays, t]);

  /* Monthly recap notification -------------------------------------------- */
  useEffect(() => {
    if (!user || user.isDemo) return;
    if (settings.monthlyRecapNotification === false) {
      void cancelNotification(RECAP_NOTIFICATION_ID);
      return;
    }
    const nextFirst = startOfMonth(addMonths(new Date(), 1));
    nextFirst.setHours(10, 0, 0, 0);
    const month = format(startOfMonth(new Date()), 'LLLL', { locale: language === 'es' ? es : enUS });
    void scheduleNotification(
      RECAP_NOTIFICATION_ID,
      nextFirst.getTime(),
      t('recapNotificationTitle', { month }),
      t('recapNotificationBody'),
    );
  }, [user, settings.monthlyRecapNotification, language, t]);

  /* Weekly automatic backup ----------------------------------------------- */
  useEffect(() => {
    if (isLoading || !user || user.isDemo || !settings.autoBackupEnabled || !isNativeApp()) return;
    if (backupRanRef.current === user.uid) return;
    if (Object.keys(workoutLog).length === 0) return;
    backupRanRef.current = user.uid;
    const uid = user.uid;
    void runAutoBackup(uid, async () =>
      JSON.stringify({ ...buildPayload(), photos: await exportPhotos(uid) }),
    ).catch((error) => console.error('Automatic backup failed:', error));
  }, [isLoading, user, settings.autoBackupEnabled, workoutLog, buildPayload]);

  /* Deep links: workoutplanner://start, ://weight, ://today --------------- */
  useEffect(() => {
    let remove: (() => void) | undefined;
    const handle = (url: string) => {
      const target = url.replace(/^workoutplanner:\/\//, '').replace(/^\/+/, '').split(/[/?#]/)[0];
      try {
        if (target === 'start') sessionStorage.setItem(PENDING_ACTION_KEY, 'start-workout');
        if (target === 'weight') sessionStorage.setItem(PENDING_ACTION_KEY, 'log-weight');
      } catch {
        // No session storage: the link still opens the right screen.
      }
      if (target === 'weight') router.push('/settings');
      else router.push('/');
      window.dispatchEvent(new Event('wp:pending-action'));
    };
    void getApp().then(async (box) => {
      if (!box) return;
      const launch = await box.plugin.getLaunchUrl().catch(() => undefined);
      if (launch?.url) handle(launch.url);
      const listener = await box.plugin.addListener('appUrlOpen', (event) => handle(event.url));
      remove = () => void listener.remove();
    });
    return () => remove?.();
  }, [router]);

  return null;
}
