"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  type User as FirebaseUser 
} from 'firebase/auth';
import { app } from '@/lib/firebase'; // Ensure firebase is initialized
import { Dumbbell } from 'lucide-react';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const auth = getAuth(app);

const formatFirebaseError = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'invalidEmail';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'userExistsPasswordIncorrect';
    case 'auth/email-already-in-use':
      return 'emailAlreadyInUse';
    case 'auth/weak-password':
        return 'passwordTooShort';
    default:
      return 'unknownError';
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
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, messageKey: formatFirebaseError(error.code) };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ success: boolean; messageKey?: string }> => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
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

  const value = { user, loading, login, signUp, logout };
  
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
