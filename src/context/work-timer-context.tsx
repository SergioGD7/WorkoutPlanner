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
import { WORK_NOTIFICATION_ID, cancelNotification, scheduleNotification } from '@/lib/rest-notifications';
import { useLanguage } from './language-context';
import { useProfile } from './profile-context';

/**
 * A stopwatch for the set itself — planks, dead hangs, carries.
 *
 * It counts *up* rather than down, because what gets logged is how long you
 * actually held it, not how long you meant to. A target, when the set has one,
 * only decides when the alert fires; the clock keeps running past it.
 *
 * Like the rest timer it is anchored to an absolute start timestamp, so a
 * throttled background tab or a reload mid-hold cannot lose time.
 */
const STORAGE_KEY = 'workTimer.session';

/** Identifies the set being timed: only one can run at a time. */
export function workTimerKey(exerciseId: string, setIndex: number): string {
  return `${exerciseId}#${setIndex}`;
}

interface StoredSession {
  key: string;
  startedAt: number;
  target: number | null;
}

interface WorkTimerContextType {
  /** Key of the set currently being timed, or null. */
  activeKey: string | null;
  /** Whole seconds counted so far. */
  elapsed: number;
  /** The set's target hold in seconds, when it has one. */
  target: number | null;
  start: (
    key: string,
    target?: number,
    label?: string | null,
    /** Receives the elapsed seconds when the clock stops, from wherever. */
    onCommit?: (seconds: number) => void,
  ) => void;
  /**
   * Re-attaches the commit callback to a hold that is already running — after a
   * reload, the set row that owns it mounts long after `start` was called.
   */
  bindCommit: (key: string, onCommit: (seconds: number) => void) => void;
  /** Stops the clock, commits the elapsed seconds and returns them. */
  stop: () => number;
}

const WorkTimerContext = createContext<WorkTimerContextType | undefined>(undefined);

export function WorkTimerProvider({ children }: { children: ReactNode }) {
  const { settings } = useProfile();
  const { t } = useLanguage();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  /** Guards the target alert so it fires once per hold, not on every tick. */
  const reachedRef = useRef(false);

  const sessionRef = useRef<StoredSession | null>(null);
  sessionRef.current = session;

  /**
   * Where the elapsed time goes when the clock stops. Held in a ref rather than
   * state so that the floating widget and the set row can both stop the same
   * hold and have it land on the right set either way.
   */
  const commitRef = useRef<((seconds: number) => void) | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const translateRef = useRef(t);
  translateRef.current = t;

  // Pick a hold back up after a reload.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as StoredSession;
      if (typeof parsed?.startedAt !== 'number' || !parsed.key) throw new Error('malformed');
      setSession(parsed);
      setElapsed(Math.floor((Date.now() - parsed.startedAt) / 1000));
      // The alert may well have already fired while the app was closed; not
      // repeating it is the friendlier of the two mistakes.
      reachedRef.current = true;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    const tick = () => {
      const seconds = Math.floor((Date.now() - session.startedAt) / 1000);
      setElapsed(seconds);

      if (session.target === null || reachedRef.current || seconds < session.target) return;
      reachedRef.current = true;

      // Same reasoning as the rest timer: whether our tick reached the target
      // says nothing about whether anyone is looking at the screen.
      const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
      if (isVisible) {
        triggerHaptic('heavy');
        if (settingsRef.current.restTimerSound) playChime();
        void cancelNotification(WORK_NOTIFICATION_ID);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session]);

  const start = useCallback((
    key: string,
    target?: number,
    label: string | null = null,
    onCommit?: (seconds: number) => void,
  ) => {
    const next: StoredSession = {
      key,
      startedAt: Date.now(),
      target: target && target > 0 ? target : null,
    };
    reachedRef.current = false;
    commitRef.current = onCommit ?? null;
    setSession(next);
    setElapsed(0);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    if (next.target !== null && settingsRef.current.restTimerNotifications) {
      const translate = translateRef.current;
      void scheduleNotification(
        WORK_NOTIFICATION_ID,
        next.startedAt + next.target * 1000,
        translate('workTimerDoneTitle'),
        label
          ? translate('workTimerDoneBodyExercise', { exercise: label })
          : translate('workTimerDoneBody'),
      );
    }
  }, []);

  const stop = useCallback(() => {
    // Read from the ref, not from a state updater: updaters are not guaranteed
    // to run before `stop` returns, and the caller needs the number right now to
    // write it onto the set.
    const current = sessionRef.current;
    const seconds = current ? Math.max(0, Math.round((Date.now() - current.startedAt) / 1000)) : 0;

    setSession(null);
    setElapsed(0);
    reachedRef.current = true;
    commitRef.current?.(seconds);
    commitRef.current = null;
    window.localStorage.removeItem(STORAGE_KEY);
    void cancelNotification(WORK_NOTIFICATION_ID);
    return seconds;
  }, []);

  const bindCommit = useCallback((key: string, onCommit: (seconds: number) => void) => {
    if (sessionRef.current?.key === key) commitRef.current = onCommit;
  }, []);

  const value = useMemo(
    () => ({
      activeKey: session?.key ?? null,
      elapsed,
      target: session?.target ?? null,
      start,
      bindCommit,
      stop,
    }),
    [session, elapsed, start, bindCommit, stop],
  );

  return <WorkTimerContext.Provider value={value}>{children}</WorkTimerContext.Provider>;
}

export function useWorkTimer() {
  const context = useContext(WorkTimerContext);
  if (context === undefined) {
    throw new Error('useWorkTimer must be used within a WorkTimerProvider');
  }
  return context;
}
