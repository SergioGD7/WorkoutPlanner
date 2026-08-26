"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, writeBatch } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { initialExercises as initialExercisesData } from '@/lib/data';
import { mergeWithLibrary } from '@/lib/exercise-merge';
import { DEMO_EXERCISES } from '@/lib/demo-data';
import { bodyPartEmojiMap } from '@/lib/style-utils';
import type { Exercise } from '@/lib/types';
import { useAuth } from './auth-context';

interface ExerciseContextType {
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id' | 'emoji'>) => Promise<void>;
  updateExercise: (exercise: Exercise) => Promise<void>;
  deleteExercise: (exerciseId: string) => Promise<void>;
  replaceExercises: (exercises: Exercise[]) => Promise<void>;
}

const ExerciseContext = createContext<ExerciseContextType | undefined>(undefined);

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>(() => mergeWithLibrary(initialExercisesData));
  const { user } = useAuth();

  const getExercisesCollectionRef = useCallback(() => {
    // Returning null makes every mutation a no-op, which is what demo needs.
    if (!user || user.isDemo) return null;
    return collection(db, `users/${user.uid}/exercises`);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setExercises(mergeWithLibrary(initialExercisesData));
      return;
    }

    if (user.isDemo) {
      setExercises(mergeWithLibrary(DEMO_EXERCISES));
      return;
    }

    const collectionRef = collection(db, `users/${user.uid}/exercises`);
    const unsubscribe = onSnapshot(
      query(collectionRef),
      (querySnapshot) => {
        if (querySnapshot.empty) {
          // Seeding happens at sign-in; show the defaults until it lands.
          setExercises(mergeWithLibrary(initialExercisesData));
          return;
        }
        setExercises(mergeWithLibrary(querySnapshot.docs.map((docSnap) => docSnap.data() as Exercise)));
      },
      (error) => {
        console.error('Error fetching exercises from Firestore:', error);
        setExercises(mergeWithLibrary(initialExercisesData));
      },
    );

    return () => unsubscribe();
  }, [user]);

  const addExercise = useCallback(
    async (exerciseData: Omit<Exercise, 'id' | 'emoji'>) => {
      const collectionRef = getExercisesCollectionRef();
      if (!collectionRef) return;

      const newExercise: Exercise = {
        id: uuidv4(),
        tracking: 'weight',
        ...exerciseData,
        emoji: bodyPartEmojiMap.get(exerciseData.bodyPart) || '💪',
      };

      try {
        await setDoc(doc(collectionRef, newExercise.id), newExercise);
      } catch (error) {
        console.error('Error adding exercise to Firestore:', error);
      }
    },
    [getExercisesCollectionRef],
  );

  const updateExercise = useCallback(
    async (updated: Exercise) => {
      const collectionRef = getExercisesCollectionRef();
      if (!collectionRef) return;

      const withEmoji: Exercise = {
        ...updated,
        emoji: bodyPartEmojiMap.get(updated.bodyPart) || '💪',
      };

      try {
        await setDoc(doc(collectionRef, withEmoji.id), withEmoji, { merge: true });
      } catch (error) {
        console.error('Error updating exercise in Firestore:', error);
      }
    },
    [getExercisesCollectionRef],
  );

  /**
   * Only the definition is removed. Past log entries keep working because they
   * carry a name/body-part snapshot (see `resolveExerciseName`), so history and
   * volume charts stay intact instead of silently dropping sets.
   */
  const deleteExercise = useCallback(
    async (exerciseId: string) => {
      const collectionRef = getExercisesCollectionRef();
      if (!collectionRef) return;

      try {
        await deleteDoc(doc(collectionRef, exerciseId));
      } catch (error) {
        console.error('Error deleting exercise from Firestore:', error);
      }
    },
    [getExercisesCollectionRef],
  );

  const replaceExercises = useCallback(
    async (incoming: Exercise[]) => {
      const collectionRef = getExercisesCollectionRef();
      if (!collectionRef || incoming.length === 0) return;

      for (let i = 0; i < incoming.length; i += 400) {
        const batch = writeBatch(db);
        incoming.slice(i, i + 400).forEach((exercise) => {
          const withEmoji: Exercise = {
            ...exercise,
            id: exercise.id || uuidv4(),
            emoji: exercise.emoji || bodyPartEmojiMap.get(exercise.bodyPart) || '💪',
          };
          batch.set(doc(collectionRef, withEmoji.id), withEmoji, { merge: true });
        });
        await batch.commit();
      }
    },
    [getExercisesCollectionRef],
  );

  const value = useMemo(
    () => ({ exercises, addExercise, updateExercise, deleteExercise, replaceExercises }),
    [exercises, addExercise, updateExercise, deleteExercise, replaceExercises],
  );

  return <ExerciseContext.Provider value={value}>{children}</ExerciseContext.Provider>;
}

export function useExercises() {
  const context = useContext(ExerciseContext);
  if (context === undefined) {
    throw new Error('useExercises must be used within an ExerciseProvider');
  }
  return context;
}
