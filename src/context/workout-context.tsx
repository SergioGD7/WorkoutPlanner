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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import type { WorkoutExercise, WorkoutLog } from '@/lib/types';
import { buildDemoWorkoutLog } from '@/lib/demo-data';

/**
 * One Firestore document per training day (`users/{uid}/workout_days/{yyyy-MM-dd}`).
 *
 * The previous layout kept the entire history in a single document, which meant
 * every keystroke rewrote the whole log and the 1 MiB document ceiling was a
 * hard wall after a couple of years of use. Writes are also debounced here, so
 * typing "82.5" produces one write instead of four.
 */
const SAVE_DEBOUNCE_MS = 600;
const MIGRATION_FLAG = 'workoutDaysMigrated';

interface WorkoutContextType {
  workoutLog: WorkoutLog;
  isLoading: boolean;
  /** Optimistic + debounced. Pass `immediate` for destructive actions. */
  saveDay: (dateKey: string, exercises: WorkoutExercise[], immediate?: boolean) => void;
  /** Overwrites many days at once (import / restore). */
  replaceLog: (log: WorkoutLog) => Promise<void>;
  /** Writes days without touching any that are not in `log`. */
  mergeDays: (log: WorkoutLog) => Promise<void>;
  copiedWorkout: WorkoutExercise[] | null;
  setCopiedWorkout: (workout: WorkoutExercise[] | null) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

function daysCollection(uid: string) {
  return collection(db, `users/${uid}/workout_days`);
}

/**
 * Moves a legacy `workout_logs/all` document into per-day documents. Runs once
 * per user; the original document is left untouched as a safety net.
 */
async function migrateLegacyLog(uid: string): Promise<void> {
  const metaRef = doc(db, `users/${uid}/profile/meta`);
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists() && metaSnap.data()?.[MIGRATION_FLAG]) return;

  const legacyRef = doc(db, `users/${uid}/workout_logs/all`);
  const legacySnap = await getDoc(legacyRef);
  const legacyLog = (legacySnap.exists() ? legacySnap.data() : {}) as WorkoutLog;
  const dateKeys = Object.keys(legacyLog).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));

  // Firestore batches cap at 500 writes.
  for (let i = 0; i < dateKeys.length; i += 400) {
    const batch = writeBatch(db);
    dateKeys.slice(i, i + 400).forEach((dateKey) => {
      const exercises = legacyLog[dateKey];
      if (!Array.isArray(exercises) || exercises.length === 0) return;
      batch.set(doc(daysCollection(uid), dateKey), { exercises });
    });
    await batch.commit();
  }

  await setDoc(metaRef, { [MIGRATION_FLAG]: true, migratedAt: new Date().toISOString() }, { merge: true });
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [isLoading, setIsLoading] = useState(true);
  const [copiedWorkout, setCopiedWorkout] = useState<WorkoutExercise[] | null>(null);

  /** Days with an unflushed local edit; snapshots must not clobber them. */
  const pendingRef = useRef<Map<string, WorkoutExercise[]>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const uidRef = useRef<string | null>(null);
  const isDemoRef = useRef(false);

  uidRef.current = user?.uid ?? null;
  isDemoRef.current = Boolean(user?.isDemo);

  const flushDay = useCallback(async (dateKey: string) => {
    if (isDemoRef.current) {
      pendingRef.current.delete(dateKey);
      return;
    }
    const uid = uidRef.current;
    const pending = pendingRef.current.get(dateKey);
    if (!uid || pending === undefined) return;

    pendingRef.current.delete(dateKey);
    const timer = timersRef.current.get(dateKey);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(dateKey);
    }

    try {
      const ref = doc(daysCollection(uid), dateKey);
      if (pending.length === 0) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, { exercises: pending, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error(`Failed to save workout for ${dateKey}:`, error);
    }
  }, []);

  const flushAll = useCallback(() => {
    Array.from(pendingRef.current.keys()).forEach((dateKey) => {
      void flushDay(dateKey);
    });
  }, [flushDay]);

  // Subscribe to the whole collection: one listener feeds every screen.
  useEffect(() => {
    if (!user) {
      setWorkoutLog({});
      setIsLoading(false);
      return;
    }

    // Demo account: fixtures in memory, no reads and no writes.
    if (user.isDemo) {
      setWorkoutLog(buildDemoWorkoutLog());
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const start = async () => {
      try {
        await migrateLegacyLog(user.uid);
      } catch (error) {
        console.error('Legacy workout log migration failed:', error);
      }
      if (cancelled) return;

      const unsubscribe = onSnapshot(
        daysCollection(user.uid),
        (snapshot) => {
          const remote: WorkoutLog = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (Array.isArray(data?.exercises)) {
              remote[docSnap.id] = data.exercises as WorkoutExercise[];
            }
          });

          // Local edits win until they've been written.
          pendingRef.current.forEach((exercises, dateKey) => {
            if (exercises.length === 0) delete remote[dateKey];
            else remote[dateKey] = exercises;
          });

          setWorkoutLog(remote);
          setIsLoading(false);
        },
        (error) => {
          console.error('Failed to subscribe to workout days:', error);
          setWorkoutLog({});
          setIsLoading(false);
        },
      );

      return unsubscribe;
    };

    const unsubscribePromise = start();

    return () => {
      cancelled = true;
      flushAll();
      void unsubscribePromise.then((unsubscribe) => unsubscribe?.());
    };
  }, [user, flushAll]);

  // Don't lose the last edit when the tab goes away.
  useEffect(() => {
    const handler = () => flushAll();
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, [flushAll]);

  const saveDay = useCallback(
    (dateKey: string, exercises: WorkoutExercise[], immediate = false) => {
      // Optimistic: the UI reflects the edit before Firestore confirms it.
      setWorkoutLog((previous) => {
        const next = { ...previous };
        if (exercises.length === 0) delete next[dateKey];
        else next[dateKey] = exercises;
        return next;
      });

      pendingRef.current.set(dateKey, exercises);

      const existingTimer = timersRef.current.get(dateKey);
      if (existingTimer) clearTimeout(existingTimer);

      if (immediate) {
        void flushDay(dateKey);
        return;
      }

      timersRef.current.set(
        dateKey,
        setTimeout(() => void flushDay(dateKey), SAVE_DEBOUNCE_MS),
      );
    },
    [flushDay],
  );

  const replaceLog = useCallback(
    async (log: WorkoutLog) => {
      const uid = uidRef.current;
      if (!uid || isDemoRef.current) return;

      const existing = await getDocs(daysCollection(uid));
      const existingIds = existing.docs.map((docSnap) => docSnap.id);
      const incomingKeys = Object.keys(log).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));
      const staleIds = existingIds.filter((id) => !incomingKeys.includes(id));

      let batch = writeBatch(db);
      let count = 0;

      const commitIfNeeded = async () => {
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      };

      for (const dateKey of incomingKeys) {
        const exercises = log[dateKey];
        if (!Array.isArray(exercises) || exercises.length === 0) continue;
        batch.set(doc(daysCollection(uid), dateKey), { exercises, updatedAt: new Date().toISOString() });
        count += 1;
        await commitIfNeeded();
      }

      for (const staleId of staleIds) {
        batch.delete(doc(daysCollection(uid), staleId));
        count += 1;
        await commitIfNeeded();
      }

      if (count > 0) await batch.commit();
    },
    [],
  );

  /**
   * Additive counterpart to `replaceLog`, used by the third-party importers:
   * a restore is meant to leave you with exactly the backup, but an import is
   * meant to leave everything you already had in place.
   */
  const mergeDays = useCallback(async (log: WorkoutLog) => {
    const uid = uidRef.current;
    if (!uid || isDemoRef.current) return;

    const dateKeys = Object.keys(log).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));

    for (let i = 0; i < dateKeys.length; i += 400) {
      const batch = writeBatch(db);
      let count = 0;
      dateKeys.slice(i, i + 400).forEach((dateKey) => {
        const exercises = log[dateKey];
        if (!Array.isArray(exercises) || exercises.length === 0) return;
        batch.set(doc(daysCollection(uid), dateKey), {
          exercises,
          updatedAt: new Date().toISOString(),
        });
        count += 1;
      });
      if (count > 0) await batch.commit();
    }
  }, []);

  const value = useMemo(
    () => ({ workoutLog, isLoading, saveDay, replaceLog, mergeDays, copiedWorkout, setCopiedWorkout }),
    [workoutLog, isLoading, saveDay, replaceLog, mergeDays, copiedWorkout],
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
