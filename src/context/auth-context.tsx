
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User as FirebaseUser 
} from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { Dumbbell } from 'lucide-react';
import type { WorkoutLog, Exercise } from '@/lib/types';
import { bodyPartEmojiMap } from '@/lib/style-utils';
import { v4 as uuidv4 } from 'uuid';
import { initialExercises as initialExercisesData } from '@/lib/data';

interface LoggedInUser {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: LoggedInUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; messageKey?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; messageKey?: string }>;
  logout: () => void;
  changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean, messageKey?: string }>;
  importWorkoutLogs: (logs: WorkoutLog) => Promise<{ success: boolean, messageKey?: string }>;
  importExercises: (exercises: (Omit<Exercise, 'emoji'>)[]) => Promise<{ success: boolean, messageKey?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const auth = getAuth(app);

const formatFirebaseError = (errorCode: string, context?: 'login' | 'changePassword'): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'invalidEmail';
    case 'auth/invalid-credential':
        if (context === 'changePassword') {
            return 'incorrectCurrentPassword';
        }
        return 'userExistsPasswordIncorrect';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'userExistsPasswordIncorrect';
    case 'auth/email-already-in-use':
      return 'emailAlreadyInUse';
    case 'auth/weak-password':
        return 'passwordTooShort';
    default:
      console.error("Unhandled Firebase Auth Error:", errorCode);
      return 'unknownError';
  }
}

async function initializeDataForNewUser(userId: string, email: string) {
  console.log(`Checking data for user ${userId}...`);
  
  const workoutLogDocRef = doc(db, `users/${userId}/workout_logs/all`);
  const logDocSnap = await getDoc(workoutLogDocRef);

  // If workout log already exists in Firestore, do nothing.
  if (logDocSnap.exists()) {
    console.log("User already has data in Firestore. No migration needed.");
    return;
  }
  
  console.log(`No Firestore data found. Checking local storage for ${email}...`);
  const localLogsKey = `workout_logs_${email}`;
  const localExercisesKey = `exercises_${email}`;
  const storedLogsJSON = localStorage.getItem(localLogsKey);
  const storedExercisesJSON = localStorage.getItem(localExercisesKey);

  const batch = writeBatch(db);

  if (storedLogsJSON) {
    console.log("Local workout logs found. Migrating to Firestore.");
    try {
        const localLogs: WorkoutLog = JSON.parse(storedLogsJSON);
        batch.set(workoutLogDocRef, localLogs);

        const exercisesCollectionRef = collection(db, `users/${userId}/exercises`);
        if (storedExercisesJSON) {
            console.log("Local exercises found. Migrating to Firestore.");
            const localExercises: (Exercise | Omit<Exercise, 'emoji'>)[] = JSON.parse(storedExercisesJSON);
            localExercises.forEach(ex => {
                const exerciseWithEmoji = {
                    ...ex,
                    id: ex.id || uuidv4(),
                    emoji: bodyPartEmojiMap.get(ex.bodyPart) || '💪',
                } as Exercise;
                const exDocRef = doc(exercisesCollectionRef, exerciseWithEmoji.id);
                batch.set(exDocRef, exerciseWithEmoji);
            });
        } else {
             initialExercisesData.forEach(exercise => {
                const exDocRef = doc(exercisesCollectionRef, exercise.id);
                batch.set(exDocRef, exercise);
            });
        }
    } catch(e) {
        console.error("Failed to parse or migrate local data:", e);
        // If parsing fails, don't commit anything, initialize with default data instead.
        const freshBatch = writeBatch(db);
        const exercisesCollectionRef = collection(db, `users/${userId}/exercises`);
        initialExercisesData.forEach(exercise => {
            const exDocRef = doc(exercisesCollectionRef, exercise.id);
            freshBatch.set(exDocRef, exercise);
        });
        freshBatch.set(workoutLogDocRef, {});
        await freshBatch.commit();
        return;
    }
  } else {
    // If no local data, this is a fresh user. Populate with initial exercises.
    console.log("No local data found. Populating with initial exercises for new user.");
    const exercisesCollectionRef = collection(db, `users/${userId}/exercises`);
    initialExercisesData.forEach(exercise => {
        const exDocRef = doc(exercisesCollectionRef, exercise.id);
        batch.set(exDocRef, exercise);
    });
    // Create an empty workout log document
    batch.set(workoutLogDocRef, {});
  }

  try {
    await batch.commit();
    console.log("Data initialization/migration to Firestore completed successfully.");
  } catch (error) {
    console.error("Error committing batch to Firestore:", error);
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; messageKey?: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await initializeDataForNewUser(userCredential.user.uid, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error.code, 'login') };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ success: boolean; messageKey?: string }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await initializeDataForNewUser(userCredential.user.uid, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error.code) };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }, []);

  const changePassword = useCallback(async (currentPass: string, newPass: string): Promise<{ success: boolean, messageKey?: string }> => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      return { success: false, messageKey: 'unknownError' };
    }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);

    try {
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPass);
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error.code, 'changePassword') };
    }
  }, []);

  const importWorkoutLogs = useCallback(async (logs: WorkoutLog): Promise<{ success: boolean, messageKey?: string }> => {
    if (!user) return { success: false, messageKey: 'notLoggedIn' };
    try {
      const workoutLogDocRef = doc(db, `users/${user.uid}/workout_logs/all`);
      await setDoc(workoutLogDocRef, logs);
      return { success: true };
    } catch (error) {
      console.error("Failed to import workout logs:", error);
      return { success: false, messageKey: 'importFailed' };
    }
  }, [user]);

  const importExercises = useCallback(async (exercises: (Omit<Exercise, 'emoji'>)[]): Promise<{ success: boolean, messageKey?: string }> => {
    if (!user) return { success: false, messageKey: 'notLoggedIn' };
    try {
      const batch = writeBatch(db);
      const exercisesCollectionRef = collection(db, `users/${user.uid}/exercises`);
      
      exercises.forEach(ex => {
        const exerciseWithEmoji = {
          ...ex,
          id: ex.id || uuidv4(),
          emoji: bodyPartEmojiMap.get(ex.bodyPart) || '💪',
        } as Exercise;
        const exDocRef = doc(exercisesCollectionRef, exerciseWithEmoji.id);
        batch.set(exDocRef, exerciseWithEmoji);
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Failed to import exercises:", error);
      return { success: false, messageKey: 'importFailed' };
    }
  }, [user]);

  const value = { user, loading, login, signUp, logout, changePassword, importWorkoutLogs, importExercises };
  
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
