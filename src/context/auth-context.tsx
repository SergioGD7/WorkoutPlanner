"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, writeBatch, limit, query } from 'firebase/firestore';
import { Dumbbell } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { initialExercises as initialExercisesData, workoutTemplates as defaultTemplates } from '@/lib/data';
import { bodyPartEmojiMap } from '@/lib/style-utils';
import type { Exercise, WorkoutLog } from '@/lib/types';
import { DEMO_EMAIL, DEMO_UID } from '@/lib/demo-data';
import { v4 as uuidv4 } from 'uuid';

export interface LoggedInUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  /**
   * Read-only sample account. Every data provider serves fixtures instead of
   * Firestore for this user, which is what App Store review is given access to.
   */
  isDemo?: boolean;
}

const DEMO_USER: LoggedInUser = {
  uid: DEMO_UID,
  email: DEMO_EMAIL,
  displayName: 'Alex',
  isDemo: true,
};

type AuthResult = { success: boolean; messageKey?: string };

interface AuthContextType {
  user: LoggedInUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Enters the read-only sample account without contacting Firebase. */
  enterDemoMode: () => void;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const formatFirebaseError = (errorCode: string, context?: 'login' | 'changePassword'): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'invalidEmail';
    case 'auth/invalid-credential':
      return context === 'changePassword' ? 'incorrectCurrentPassword' : 'userExistsPasswordIncorrect';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'userExistsPasswordIncorrect';
    case 'auth/email-already-in-use':
      return 'emailAlreadyInUse';
    case 'auth/weak-password':
      return 'passwordTooShort';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'popupClosed';
    case 'auth/account-exists-with-different-credential':
      return 'accountExistsWithDifferentCredential';
    case 'auth/too-many-requests':
      return 'tooManyRequests';
    case 'auth/network-request-failed':
      return 'networkError';
    default:
      console.error('Unhandled Firebase Auth error:', errorCode);
      return 'unknownError';
  }
};

/**
 * Seeds the exercise library and default routines for a brand new account, and
 * carries over data from the pre-Firestore localStorage era if any is found.
 *
 * The legacy `workout_logs/all` document written here is split into per-day
 * documents by `WorkoutProvider` on the next render.
 */
async function initializeDataForNewUser(userId: string, email: string | null) {
  const exercisesCollectionRef = collection(db, `users/${userId}/exercises`);
  const existingExercises = await getDocs(query(exercisesCollectionRef, limit(1)));
  const hasExercises = !existingExercises.empty;

  const workoutLogDocRef = doc(db, `users/${userId}/workout_logs/all`);
  const daysSnapshot = await getDocs(query(collection(db, `users/${userId}/workout_days`), limit(1)));
  const legacySnap = await getDoc(workoutLogDocRef);
  const hasWorkouts = !daysSnapshot.empty || legacySnap.exists();

  if (hasExercises && hasWorkouts) return;

  const batch = writeBatch(db);

  if (!hasExercises) {
    const localExercisesJSON = email ? window.localStorage.getItem(`exercises_${email}`) : null;
    let seeded = false;

    if (localExercisesJSON) {
      try {
        const localExercises = JSON.parse(localExercisesJSON) as (Exercise | Omit<Exercise, 'emoji'>)[];
        localExercises.forEach((exercise) => {
          const withEmoji = {
            ...exercise,
            id: exercise.id || uuidv4(),
            emoji: bodyPartEmojiMap.get(exercise.bodyPart) || '💪',
          } as Exercise;
          batch.set(doc(exercisesCollectionRef, withEmoji.id), withEmoji);
        });
        seeded = localExercises.length > 0;
      } catch (error) {
        console.error('Could not parse local exercises, falling back to defaults:', error);
      }
    }

    if (!seeded) {
      initialExercisesData.forEach((exercise) => {
        batch.set(doc(exercisesCollectionRef, exercise.id), exercise);
      });
    }
  }

  if (!hasWorkouts) {
    const localLogsJSON = email ? window.localStorage.getItem(`workout_logs_${email}`) : null;
    if (localLogsJSON) {
      try {
        const localLogs = JSON.parse(localLogsJSON) as WorkoutLog;
        batch.set(workoutLogDocRef, localLogs);
      } catch (error) {
        console.error('Could not parse local workout logs, skipping migration:', error);
      }
    }
  }

  const templatesCollectionRef = collection(db, `users/${userId}/templates`);
  const existingTemplates = await getDocs(query(templatesCollectionRef, limit(1)));
  if (existingTemplates.empty) {
    defaultTemplates.forEach((template) => {
      batch.set(doc(templatesCollectionRef, template.id), template);
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error('Failed to initialize account data:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [demoUser, setDemoUser] = useState<LoggedInUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setUser(
        firebaseUser
          ? {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            }
          : null,
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await initializeDataForNewUser(credential.user.uid, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error?.code, 'login') };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await initializeDataForNewUser(credential.user.uid, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error?.code) };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      await initializeDataForNewUser(credential.user.uid, credential.user.email);
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error?.code) };
    }
  }, []);

  const enterDemoMode = useCallback(() => setDemoUser(DEMO_USER), []);

  const logout = useCallback(async () => {
    setDemoUser(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }, []);

  const changePassword = useCallback(
    async (currentPass: string, newPass: string): Promise<AuthResult> => {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) return { success: false, messageKey: 'unknownError' };

      try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPass);
        return { success: true };
      } catch (error: any) {
        return { success: false, messageKey: formatFirebaseError(error?.code, 'changePassword') };
      }
    },
    [],
  );

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error?.code) };
    }
  }, []);

  const value = useMemo(
    () => ({
      // The demo account shadows any real session while it is active.
      user: demoUser ?? user,
      isDemo: demoUser !== null,
      loading,
      login,
      signUp,
      signInWithGoogle,
      logout,
      changePassword,
      resetPassword,
      enterDemoMode,
    }),
    [
      demoUser,
      user,
      loading,
      login,
      signUp,
      signInWithGoogle,
      logout,
      changePassword,
      resetPassword,
      enterDemoMode,
    ],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Dumbbell className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
