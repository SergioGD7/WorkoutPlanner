"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { initialExercises as initialExercisesData } from '@/lib/data';
import type { Exercise, BodyPart } from '@/lib/types';
import { useAuth } from './auth-context';
import { v4 as uuidv4 } from 'uuid';
import { bodyPartEmojiMap } from '@/lib/style-utils';

interface ExerciseContextType {
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id' | 'emoji'>) => Promise<void>;
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
        const storedExercisesJSON = localStorage.getItem(key);
        let exercisesToLoad: Exercise[];

        if (storedExercisesJSON) {
          const storedExercises: (Exercise | Omit<Exercise, 'emoji'>)[] = JSON.parse(storedExercisesJSON);
          // Data migration: ensure all exercises have an emoji
          exercisesToLoad = storedExercises.map(ex => {
            // Check if emoji property exists and is not empty
            if ('emoji' in ex && ex.emoji) {
              return ex as Exercise;
            }
            // If not, add it based on body part
            return {
              ...ex,
              emoji: bodyPartEmojiMap.get(ex.bodyPart as BodyPart) || '💪',
            } as Exercise;
          });
          // Persist the migrated data
          localStorage.setItem(key, JSON.stringify(exercisesToLoad));
        } else {
          // No stored data, use initial set
          exercisesToLoad = initialExercisesData;
          localStorage.setItem(key, JSON.stringify(exercisesToLoad));
        }
        
        setExercises(exercisesToLoad);

      } catch (error) {
        console.error("Failed to load/migrate exercises from localStorage", error);
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

  const addExercise = async (exerciseData: Omit<Exercise, 'id' | 'emoji'>) => {
    const key = getStorageKey();
    if (!key) {
      console.error("No user logged in to add exercise");
      return;
    }
    
    const newExercise: Exercise = {
      id: uuidv4(),
      ...exerciseData,
      emoji: bodyPartEmojiMap.get(exerciseData.bodyPart) || '💪',
    };

    const updatedExercises = [...exercises, newExercise];
    updateStorageAndState(updatedExercises);
  };
  
  const updateExercise = async (updatedExerciseData: Exercise) => {
    const key = getStorageKey();
    if (!key) {
      console.error("No user logged in to update exercise");
      return;
    }
    
    const exerciseWithCorrectEmoji: Exercise = {
        ...updatedExerciseData,
        emoji: bodyPartEmojiMap.get(updatedExerciseData.bodyPart) || '💪',
    };

    const updatedExercises = exercises.map(ex => 
        (ex.id === exerciseWithCorrectEmoji.id ? exerciseWithCorrectEmoji : ex)
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
