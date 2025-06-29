"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { initialExercises as initialExercisesData } from '@/lib/data';
import type { Exercise } from '@/lib/types';
import { useAuth } from './auth-context';
import { v4 as uuidv4 } from 'uuid';

interface ExerciseContextType {
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id'>) => Promise<void>;
  updateExercise: (exercise: Exercise) => Promise<void>;
  deleteExercise: (exerciseId: string) => Promise<void>;
}

const ExerciseContext = createContext<ExerciseContextType | undefined>(undefined);

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { user } = useAuth();

  const getStorageKey = useCallback(() => {
    return user && user.email ? `exercises_${user.email}` : null;
  }, [user]);

  useEffect(() => {
    const key = getStorageKey();
    if (key) {
      try {
        const storedExercises = localStorage.getItem(key);
        if (storedExercises) {
          setExercises(JSON.parse(storedExercises));
        } else {
          localStorage.setItem(key, JSON.stringify(initialExercisesData));
          setExercises(initialExercisesData);
        }
      } catch (error) {
        console.error("Failed to load exercises from localStorage", error);
        setExercises(initialExercisesData); // Fallback
      }
    } else {
      // No user, just use default exercises in memory
      setExercises(initialExercisesData);
    }
  }, [user, getStorageKey]);

  const updateStorageAndState = (updatedExercises: Exercise[]) => {
    setExercises(updatedExercises);
    const key = getStorageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(updatedExercises));
    } catch (error) {
      console.error("Failed to save exercises to localStorage", error);
    }
  };

  const addExercise = async (exerciseData: Omit<Exercise, 'id'>) => {
    const key = getStorageKey();
    if (!key) {
      console.error("No user logged in to add exercise");
      return;
    }
    
    const newExercise: Exercise = {
      id: uuidv4(),
      ...exerciseData,
    };

    const updatedExercises = [...exercises, newExercise];
    updateStorageAndState(updatedExercises);
  };
  
  const updateExercise = async (updatedExercise: Exercise) => {
    const key = getStorageKey();
    if (!key) {
      console.error("No user logged in to update exercise");
      return;
    }

    const updatedExercises = exercises.map(ex => 
        (ex.id === updatedExercise.id ? updatedExercise : ex)
    );
    updateStorageAndState(updatedExercises);
  };

  const deleteExercise = async (exerciseId: string) => {
    const key = getStorageKey();
    if (!key) {
      console.error("No user logged in to delete exercise");
      return;
    }
    const updatedExercises = exercises.filter(ex => ex.id !== exerciseId);
    updateStorageAndState(updatedExercises);
  };

  return (
    <ExerciseContext.Provider value={{ exercises, addExercise, updateExercise, deleteExercise }}>
      {children}
    </ExerciseContext.Provider>
  );
}

export function useExercises() {
  const context = useContext(ExerciseContext);
  if (context === undefined) {
    throw new Error('useExercises must be used within an ExerciseProvider');
  }
  return context;
}
