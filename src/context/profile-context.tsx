"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { auth, db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import type { BodyEntry, ProfileSettings } from '@/lib/types';

export const DEFAULT_SETTINGS: ProfileSettings = {
  weightUnit: 'kg',
  restTimerEnabled: true,
  defaultRestSeconds: 90,
  restTimerSound: true,
  restTimerNotifications: false,
  barWeight: 20,
  weeklySetTargetMin: 10,
  weeklySetTargetMax: 20,
};

/** Comma-separated allowlist used only when no `admin` custom claim is present. */
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

interface ProfileContextType {
  settings: ProfileSettings;
  updateSettings: (patch: Partial<ProfileSettings>) => Promise<void>;
  bodyEntries: BodyEntry[];
  /** Newest entry that has a weight, or null. */
  latestBodyEntry: BodyEntry | null;
  saveBodyEntry: (entry: BodyEntry) => Promise<void>;
  deleteBodyEntry: (date: string) => Promise<void>;
  replaceBodyEntries: (entries: BodyEntry[]) => Promise<void>;
  isAdmin: boolean;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

function bodyEntriesCollection(uid: string) {
  return collection(db, `users/${uid}/body_entries`);
}

/**
 * The old profile screen kept a single mutable weight/fat pair in
 * `profile/stats`. Seed it as the first history entry so nothing is lost.
 */
async function migrateLegacyStats(uid: string): Promise<void> {
  const metaRef = doc(db, `users/${uid}/profile/meta`);
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists() && metaSnap.data()?.bodyEntriesMigrated) return;

  const statsRef = doc(db, `users/${uid}/profile/stats`);
  const statsSnap = await getDoc(statsRef);

  if (statsSnap.exists()) {
    const data = statsSnap.data() as { weight?: number; fat?: number | null };
    if (typeof data.weight === 'number' || typeof data.fat === 'number') {
      const today = format(new Date(), 'yyyy-MM-dd');
      const entry: BodyEntry = { date: today };
      if (typeof data.weight === 'number') entry.weight = data.weight;
      if (typeof data.fat === 'number') entry.fat = data.fat;
      await setDoc(doc(bodyEntriesCollection(uid), today), entry, { merge: true });
    }
  }

  await setDoc(metaRef, { bodyEntriesMigrated: true }, { merge: true });
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);
  const [bodyEntries, setBodyEntries] = useState<BodyEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Admin rights come from a custom claim; the env allowlist is the fallback
  // for local development so the data tools stay reachable.
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      let admin = ADMIN_EMAILS.includes((user.email ?? '').toLowerCase());
      try {
        const token = await auth.currentUser?.getIdTokenResult();
        if (token?.claims?.admin === true) admin = true;
      } catch {
        // Offline or token refresh failure: keep the allowlist answer.
      }
      if (!cancelled) setIsAdmin(admin);
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setBodyEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubSettings = onSnapshot(
      doc(db, `users/${user.uid}/profile/settings`),
      (snap) => {
        setSettings({ ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) } as ProfileSettings);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    const unsubEntries = onSnapshot(
      bodyEntriesCollection(user.uid),
      (snapshot) => {
        const entries = snapshot.docs
          .map((docSnap) => ({ ...(docSnap.data() as BodyEntry), date: docSnap.id }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        setBodyEntries(entries);
      },
      (error) => console.error('Failed to load body entries:', error),
    );

    void migrateLegacyStats(user.uid).catch((error) =>
      console.error('Body stats migration failed:', error),
    );

    return () => {
      unsubSettings();
      unsubEntries();
    };
  }, [user]);

  const updateSettings = useCallback(
    async (patch: Partial<ProfileSettings>) => {
      setSettings((previous) => ({ ...previous, ...patch }));
      if (!user) return;
      try {
        await setDoc(doc(db, `users/${user.uid}/profile/settings`), patch, { merge: true });
      } catch (error) {
        console.error('Failed to save profile settings:', error);
      }
    },
    [user],
  );

  const saveBodyEntry = useCallback(
    async (entry: BodyEntry) => {
      if (!user) return;
      const payload: Record<string, unknown> = {};
      Object.entries(entry).forEach(([key, value]) => {
        if (key !== 'date' && value !== undefined && value !== null && !Number.isNaN(value)) {
          payload[key] = value;
        }
      });
      try {
        await setDoc(doc(bodyEntriesCollection(user.uid), entry.date), payload, { merge: true });
      } catch (error) {
        console.error('Failed to save body entry:', error);
      }
    },
    [user],
  );

  const deleteBodyEntry = useCallback(
    async (date: string) => {
      if (!user) return;
      try {
        await deleteDoc(doc(bodyEntriesCollection(user.uid), date));
      } catch (error) {
        console.error('Failed to delete body entry:', error);
      }
    },
    [user],
  );

  const replaceBodyEntries = useCallback(
    async (entries: BodyEntry[]) => {
      if (!user || entries.length === 0) return;
      for (let i = 0; i < entries.length; i += 400) {
        const batch = writeBatch(db);
        entries.slice(i, i + 400).forEach((entry) => {
          if (!entry?.date) return;
          const { date, ...rest } = entry;
          batch.set(doc(bodyEntriesCollection(user.uid), date), rest, { merge: true });
        });
        await batch.commit();
      }
    },
    [user],
  );

  const latestBodyEntry = useMemo(
    () => bodyEntries.find((entry) => typeof entry.weight === 'number') ?? bodyEntries[0] ?? null,
    [bodyEntries],
  );

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      bodyEntries,
      latestBodyEntry,
      saveBodyEntry,
      deleteBodyEntry,
      replaceBodyEntries,
      isAdmin,
      isLoading,
    }),
    [
      settings,
      updateSettings,
      bodyEntries,
      latestBodyEntry,
      saveBodyEntry,
      deleteBodyEntry,
      replaceBodyEntries,
      isAdmin,
      isLoading,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
