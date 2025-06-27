"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Simplified user object for local auth
interface LocalUser {
  email: string;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  loginOrSignUp: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'workout_planner_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginOrSignUp = useCallback((email: string) => {
    const newUser: LocalUser = { email };
    try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        setUser(newUser);
    } catch (error) {
        console.error("Failed to save user to localStorage", error);
    }
  }, []);

  const logout = useCallback(() => {
    try {
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
    } catch (error) {
        console.error("Failed to remove user from localStorage", error);
    }
  }, []);

  const value = { user, loading, loginOrSignUp, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
