"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { triggerHaptic } from '@/utils/haptics';
import { playChime } from '@/lib/chime';
import {
  cancelRestNotification,
  requestRestNotificationPermission,
  scheduleRestNotification,
} from '@/lib/rest-notifications';
import { useLanguage } from './language-context';
import { useProfile } from './profile-context';

/**
 * The rest timer is driven by an absolute end timestamp rather than a
 * decrementing counter, so it survives the tab being backgrounded (mobile
 * browsers throttle timers) and a page reload mid-set.
 */
const STORAGE_KEY = 'restTimer.endsAt';

interface RestTimerState {
  isActive: boolean;
  /** Seconds remaining, never negative. */
  remaining: number;
  total: number;
  label: string | null;
}

interface RestTimerContextType extends RestTimerState {
  start: (seconds?: number, label?: string | null) => void;
  stop: () => void;
  addSeconds: (delta: number) => void;
  /** Asks for notification permission; returns whether it was granted. */
  requestNotificationPermission: () => Promise<boolean>;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const { settings } = useProfile();
  const { t } = useLanguage();
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(settings.defaultRestSeconds);
  const [label, setLabel] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const firedRef = useRef(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Read inside callbacks that must not be re-created when the language changes.
  const translateRef = useRef(t);
  translateRef.current = t;

  // Restore an in-flight rest after a reload.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = Number(stored);
    if (Number.isFinite(parsed) && parsed > Date.now()) {
      setEndsAt(parsed);
      setRemaining(Math.ceil((parsed - Date.now()) / 1000));
      firedRef.current = false;
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
    setLabel(null);
    firedRef.current = true;
    window.localStorage.removeItem(STORAGE_KEY);
    void cancelRestNotification();
  }, []);

  const finish = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Whether our tick reached zero is not the same question as whether the
    // user is looking at the phone: Android often keeps the WebView running for
    // a while after it goes to the background. Key the decision off visibility.
    const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';

    if (isVisible) {
      triggerHaptic('heavy');
      setTimeout(() => triggerHaptic('success'), 400);
      if (settingsRef.current.restTimerSound) playChime();

      // On screen, so the chime and haptic did the job; withdraw the alert
      // booked with the OS rather than letting it arrive on top of them.
      void cancelRestNotification();
    }
    // Hidden: leave the scheduled notification alone. It is the only thing that
    // will actually reach a phone sitting in a pocket.

    setEndsAt(null);
    setRemaining(0);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Recompute from the wall clock every 250 ms; drift-free by construction.
  useEffect(() => {
    if (endsAt === null) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) finish();
    };

    tick();
    const interval = setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [endsAt, finish]);

  const start = useCallback(
    (seconds?: number, nextLabel: string | null = null) => {
      const duration = Math.max(5, seconds ?? settingsRef.current.defaultRestSeconds);
      const end = Date.now() + duration * 1000;
      firedRef.current = false;
      setTotal(duration);
      setLabel(nextLabel);
      setEndsAt(end);
      setRemaining(duration);
      window.localStorage.setItem(STORAGE_KEY, String(end));

      // Hand the alert to the OS now: by the time the rest ends the WebView may
      // be suspended in a pocket and no timer of ours will be running.
      if (settingsRef.current.restTimerNotifications) {
        const translate = translateRef.current;
        void scheduleRestNotification(
          end,
          translate('restOverTitle'),
          nextLabel
            ? translate('restOverBodyExercise', { exercise: nextLabel })
            : translate('restOverBody'),
        );
      }
    },
    [],
  );

  const addSeconds = useCallback((delta: number) => {
    setEndsAt((previous) => {
      if (previous === null) return previous;
      const next = Math.max(Date.now(), previous + delta * 1000);
      window.localStorage.setItem(STORAGE_KEY, String(next));
      firedRef.current = false;

      // The scheduled alert is keyed by a fixed id, so this replaces it.
      if (settingsRef.current.restTimerNotifications) {
        const translate = translateRef.current;
        void scheduleRestNotification(
          next,
          translate('restOverTitle'),
          translate('restOverBody'),
        );
      }

      return next;
    });
  }, []);

  const requestNotificationPermission = useCallback(
    () => requestRestNotificationPermission(),
    [],
  );

  const value = useMemo(
    () => ({
      isActive: endsAt !== null,
      remaining,
      total,
      label,
      start,
      stop,
      addSeconds,
      requestNotificationPermission,
    }),
    [endsAt, remaining, total, label, start, stop, addSeconds, requestNotificationPermission],
  );

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>;
}

export function useRestTimer() {
  const context = useContext(RestTimerContext);
  if (context === undefined) {
    throw new Error('useRestTimer must be used within a RestTimerProvider');
  }
  return context;
}
