"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { initialExercises as initialExercisesData } from '@/lib/data';
import type { Exercise } from '@/lib/types';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query } from 'firebase/firestore';

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
    if (user && db) {
      const q = query(collection(db, 'users', user.uid, 'exercises'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const exercisesFromDb: Exercise[] = [];
        querySnapshot.forEach((doc) => {
          exercisesFromDb.push({ id: doc.id, ...doc.data() } as Exercise);
        });
        setCustomExercises(exercisesFromDb);
      });
      return () => unsubscribe();
    } else {
      setCustomExercises([]);
    }
  }, [user]);

  const addExercise = useCallback(async (exerciseData: Omit<Exercise, 'id' | 'image' | 'data-ai-hint'>) => {
    if (!user || !db) {
      console.error("No user logged in or DB not configured to add exercise");
      return;
    }
    const newExercise: Omit<Exercise, 'id'> = {
      ...exerciseData,
      image: 'https://placehold.co/600x400.png',
      'data-ai-hint': 'custom exercise'
    };
    try {
      await addDoc(collection(db, 'users', user.uid, 'exercises'), newExercise);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }, [user]);

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
