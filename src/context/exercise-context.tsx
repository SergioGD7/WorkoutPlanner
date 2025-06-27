"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { initialExercises as initialExercisesData } from '@/lib/data';
import type { Exercise } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface ExerciseContextType {
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id' | 'image' | 'data-ai-hint'>) => void;
}

const ExerciseContext = createContext<ExerciseContextType | undefined>(undefined);

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercisesData);

  const addExercise = (exerciseData: Omit<Exercise, 'id' | 'image' | 'data-ai-hint'>) => {
    const newExercise: Exercise = {
      ...exerciseData,
      id: uuidv4(),
      image: 'https://placehold.co/600x400.png',
      'data-ai-hint': 'custom exercise'
    };
    setExercises(currentExercises => [...currentExercises, newExercise]);
  };

  return (
    <ExerciseContext.Provider value={{ exercises, addExercise }}>
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
