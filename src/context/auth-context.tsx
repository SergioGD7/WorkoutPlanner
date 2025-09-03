
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
import { doc, getDoc, setDoc, writeBatch, collection } from "firebase/firestore";
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

async function migrateLocalDataToFirestore(userId: string, email: string) {
  console.log(`Checking for local data for user ${email}...`);
  const localExercisesKey = `exercises_${email}`;
  const localLogsKey = `workout_logs_${email}`;
  
  const storedExercisesJSON = localStorage.getItem(localExercisesKey);
  const storedLogsJSON = localStorage.getItem(localLogsKey);
  const batch = writeBatch(db);

  let hasLocalData = false;

  // Migrate exercises from local storage if they exist
  if (storedExercisesJSON) {
    hasLocalData = true;
    console.log("Local exercises found. Preparing for migration.");
    const localExercises: (Exercise | Omit<Exercise, 'emoji'>)[] = JSON.parse(storedExercisesJSON);
    
    localExercises.forEach(ex => {
      const exerciseWithEmoji = {
        ...ex,
        id: ex.id || uuidv4(),
        emoji: bodyPartEmojiMap.get(ex.bodyPart) || '💪',
      } as Exercise;
      const docRef = doc(db, `users/${userId}/exercises`, exerciseWithEmoji.id);
      batch.set(docRef, exerciseWithEmoji);
    });
  }

  // Migrate workout logs from local storage if they exist
  if (storedLogsJSON) {
    hasLocalData = true;
    console.log("Local workout logs found. Preparing for migration.");
    const localLogs: WorkoutLog = JSON.parse(storedLogsJSON);
    const workoutLogDocRef = doc(db, `users/${userId}/workout_logs/all`);
    batch.set(workoutLogDocRef, localLogs);
  }

  // If no local data was found, populate with initial exercises
  if (!hasLocalData) {
    console.log("No local data found. Populating with initial exercises for new user.");
    initialExercisesData.forEach(exercise => {
        const docRef = doc(db, `users/${userId}/exercises`, exercise.id);
        batch.set(docRef, exercise);
    });
  }

  try {
    await batch.commit();
    if(hasLocalData) {
      console.log("Migration from localStorage to Firestore completed successfully.");
    } else {
      console.log("Initial exercises populated in Firestore successfully.");
    }
    // IMPORTANT: Local storage data is NOT cleaned up automatically to prevent data loss.
    // The user should verify data is synced before clearing browser data manually.
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
      // Check if user document/subcollections exist to prevent re-migration
      const userDocRef = doc(db, `users/${userCredential.user.uid}/workout_logs/all`);
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        await migrateLocalDataToFirestore(userCredential.user.uid, email);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error.code, 'login') };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ success: boolean; messageKey?: string }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await migrateLocalDataToFirestore(userCredential.user.uid, email);
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

  const value = { user, loading, login, signUp, logout, changePassword };
  
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
