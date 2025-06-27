"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { initialExercises as initialExercisesData } from '@/lib/data';
import type { Exercise } from '@/lib/types';
import { useAuth } from './auth-context';
import { v4 as uuidv4 } from 'uuid';

interface ExerciseContextType {
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id' | 'image' | 'data-ai-hint'>) => Promise<void>;
}

const ExerciseContext = createContext<ExerciseContextType | undefined>(undefined);

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [initialExercises] = useState<Exercise[]>(initialExercisesData);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      try {
        const key = `custom_exercises_${user.email}`;
        const storedExercises = localStorage.getItem(key);
        if (storedExercises) {
          setCustomExercises(JSON.parse(storedExercises));
        } else {
          setCustomExercises([]);
        }
      } catch (error) {
        console.error("Failed to load custom exercises from localStorage", error);
        setCustomExercises([]);
      }
    } else {
      setCustomExercises([]);
    }
  }, [user]);

  const addExercise = useCallback(async (exerciseData: Omit<Exercise, 'id' | 'image' | 'data-ai-hint'>) => {
    if (!user) {
      console.error("No user logged in to add exercise");
      return;
    }
    
    const newExercise: Exercise = {
      id: uuidv4(),
      ...exerciseData,
      image: 'https://placehold.co/600x400.png',
      'data-ai-hint': 'custom exercise'
    };

    try {
      const updatedExercises = [...customExercises, newExercise];
      const key = `custom_exercises_${user.email}`;
      localStorage.setItem(key, JSON.stringify(updatedExercises));
      setCustomExercises(updatedExercises);
    } catch (error) {
      console.error("Failed to save custom exercises to localStorage", error);
    }
  }, [user, customExercises]);

  const allExercises = [...initialExercises, ...customExercises];

  return (
    <ExerciseContext.Provider value={{ exercises: allExercises, addExercise }}>
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
