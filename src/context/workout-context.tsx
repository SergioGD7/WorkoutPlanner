"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import type { WorkoutExercise } from '@/lib/types';

interface WorkoutContextType {
  copiedWorkout: WorkoutExercise[] | null;
  setCopiedWorkout: (workout: WorkoutExercise[] | null) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [copiedWorkout, setCopiedWorkout] = useState<WorkoutExercise[] | null>(null);

  return (
    <WorkoutContext.Provider value={{ copiedWorkout, setCopiedWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
