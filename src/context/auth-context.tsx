"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// User object for the list of all users
interface StoredUser {
  email: string;
  password_very_insecure: string; // This is not for production, but follows the local-only logic.
}

// User object for the currently authenticated user session
interface LoggedInUser {
  email: string;
}

interface AuthContextType {
  user: LoggedInUser | null;
  loading: boolean;
  loginOrSignUp: (email: string, password: string) => Promise<{ success: boolean; messageKey?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOGGED_IN_USER_STORAGE_KEY = 'workout_planner_logged_in_user';
const ALL_USERS_STORAGE_KEY = 'workout_planner_all_users';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Effect to load the logged-in user from session storage on startup
  useEffect(() => {
    try {
      // Use sessionStorage for the session, which clears when the browser/tab is closed.
      const storedUser = sessionStorage.getItem(LOGGED_IN_USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from sessionStorage", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginOrSignUp = useCallback(async (email: string, password: string): Promise<{ success: boolean; messageKey?: string }> => {
    try {
      const storedUsersRaw = localStorage.getItem(ALL_USERS_STORAGE_KEY);
      const allUsers: StoredUser[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      
      const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        // User exists, check password
        if (existingUser.password_very_insecure === password) {
          // Password matches, log in
          const loggedInUser: LoggedInUser = { email: existingUser.email };
          sessionStorage.setItem(LOGGED_IN_USER_STORAGE_KEY, JSON.stringify(loggedInUser));
          setUser(loggedInUser);
          return { success: true };
        } else {
          // Password does not match
          return { success: false, messageKey: 'userExistsPasswordIncorrect' };
        }
      } else {
        // User does not exist, create new user
        const newUser: StoredUser = { email, password_very_insecure: password };
        const updatedUsers = [...allUsers, newUser];
        localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
        
        // Log in the new user
        const loggedInUser: LoggedInUser = { email: newUser.email };
        sessionStorage.setItem(LOGGED_IN_USER_STORAGE_KEY, JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        return { success: true };
      }
    } catch (error) {
      console.error("Authentication error", error);
      return { success: false, messageKey: 'unknownError' };
    }
  }, []);

  const logout = useCallback(() => {
    try {
        sessionStorage.removeItem(LOGGED_IN_USER_STORAGE_KEY);
        setUser(null);
    } catch (error) {
        console.error("Failed to remove user from sessionStorage", error);
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
