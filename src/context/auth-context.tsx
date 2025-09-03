
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
import { doc, getDoc, writeBatch } from "firebase/firestore";
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
  console.log(`Starting migration check for user ${email}...`);

  const exercisesCollectionRef = doc(db, `users/${userId}/exercises`, initialExercisesData[0].id);
  const workoutLogDocRef = doc(db, `users/${userId}/workout_logs/all`);

  try {
    const exercisesDocSnap = await getDoc(exercisesCollectionRef);
    if (exercisesDocSnap.exists()) {
      console.log("Firestore data already exists. No migration needed.");
      return;
    }

    console.log("Firestore is empty. Checking for local storage data.");

    const localExercisesKey = `exercises_${email}`;
    const localLogsKey = `workout_logs_${email}`;
    
    const storedExercisesJSON = localStorage.getItem(localExercisesKey);
    const storedLogsJSON = localStorage.getItem(localLogsKey);

    if (!storedExercisesJSON && !storedLogsJSON) {
      console.log("No local data found. Populating with initial exercises.");
       const batch = writeBatch(db);
        initialExercisesData.forEach(exercise => {
            const docRef = doc(db, `users/${userId}/exercises`, exercise.id);
            batch.set(docRef, exercise);
        });
        await batch.commit();
        console.log("Initial exercises populated in Firestore.");
      return;
    }
    
    console.log("Local data found. Starting migration to Firestore.");
    const batch = writeBatch(db);

    // Migrate exercises
    if (storedExercisesJSON) {
      const localExercises: (Exercise | Omit<Exercise, 'emoji'>)[] = JSON.parse(storedExercisesJSON);
      const exercisesToSet = new Map<string, Exercise>();

      localExercises.forEach(ex => {
          const exerciseWithEmoji = {
              ...ex,
              emoji: bodyPartEmojiMap.get(ex.bodyPart) || '💪',
          } as Exercise;

          if (!exerciseWithEmoji.id || initialExercisesData.some(initEx => initEx.id === exerciseWithEmoji.id)) {
                exerciseWithEmoji.id = uuidv4();
          }
          exercisesToSet.set(exerciseWithEmoji.id, exerciseWithEmoji);
      });
      
      initialExercisesData.forEach(initialEx => {
          if (!Array.from(exercisesToSet.values()).some(localEx => localEx.name === initialEx.name)) {
              exercisesToSet.set(initialEx.id, initialEx);
          }
      });
      
      exercisesToSet.forEach(ex => {
        const docRef = doc(db, `users/${userId}/exercises`, ex.id);
        batch.set(docRef, ex);
      });
    } else {
        initialExercisesData.forEach(exercise => {
            const docRef = doc(db, `users/${userId}/exercises`, exercise.id);
            batch.set(docRef, exercise);
        });
    }

    // Migrate workout logs
    if (storedLogsJSON) {
      const localLogs: WorkoutLog = JSON.parse(storedLogsJSON);
      batch.set(workoutLogDocRef, localLogs);
    }

    await batch.commit();
    console.log("Migration from localStorage to Firestore completed successfully.");

    // Clean up local storage after successful migration
    localStorage.removeItem(localExercisesKey);
    localStorage.removeItem(localLogsKey);
    console.log("Local storage data cleaned up.");

  } catch (error) {
    console.error("Error during data migration:", error);
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
      await migrateLocalDataToFirestore(userCredential.user.uid, email);
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
