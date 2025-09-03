"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { initialExercises as initialExercisesData } from '@/lib/data';
import type { Exercise, BodyPart } from '@/lib/types';
import { useAuth } from './auth-context';
import { v4 as uuidv4 } from 'uuid';
import { bodyPartEmojiMap } from '@/lib/style-utils';
import { collection, doc, getDoc, setDoc, writeBatch, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ExerciseContextType {
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id' | 'emoji'>) => Promise<void>;
  updateExercise: (exercise: Exercise) => Promise<void>;
  deleteExercise: (exerciseId: string) => Promise<void>;
}

const ExerciseContext = createContext<ExerciseContextType | undefined>(undefined);

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercisesData);
  const { user } = useAuth();

  const getExercisesCollectionRef = useCallback(() => {
    if (!user) return null;
    return collection(db, `users/${user.uid}/exercises`);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setExercises(initialExercisesData);
      return;
    }

    const collectionRef = getExercisesCollectionRef();
    if (!collectionRef) return;

    const unsubscribe = onSnapshot(query(collectionRef), async (querySnapshot) => {
        if (querySnapshot.empty) {
            console.log("No custom exercises found in Firestore. Checking localStorage for migration.");
            // Migration logic for one-time transfer from localStorage to Firestore
            const localExercisesKey = `exercises_${user.email}`;
            try {
                const storedExercisesJSON = localStorage.getItem(localExercisesKey);
                if (storedExercisesJSON) {
                    const localExercises: (Exercise | Omit<Exercise, 'emoji'>)[] = JSON.parse(storedExercisesJSON);
                    
                    const batch = writeBatch(db);
                    
                    const exercisesToSet = localExercises.map(ex => {
                        const exerciseWithEmoji = {
                            ...ex,
                            emoji: bodyPartEmojiMap.get(ex.bodyPart as BodyPart) || '💪',
                        } as Exercise;

                        // Ensure custom exercises have a unique ID if they don't
                        if (!exerciseWithEmoji.id || initialExercisesData.some(initEx => initEx.id === exerciseWithEmoji.id)) {
                             exerciseWithEmoji.id = uuidv4();
                        }
                        
                        const docRef = doc(collectionRef, exerciseWithEmoji.id);
                        batch.set(docRef, exerciseWithEmoji);
                        return exerciseWithEmoji;
                    });

                    // Also add initial exercises if they are not already mixed in
                    initialExercisesData.forEach(initialEx => {
                        if (!localExercises.some(localEx => localEx.name === initialEx.name)) {
                             const docRef = doc(collectionRef, initialEx.id);
                             batch.set(docRef, initialEx);
                             exercisesToSet.push(initialEx);
                        }
                    });

                    await batch.commit();
                    setExercises(exercisesToSet);
                    console.log("Exercises migrated from localStorage to Firestore.");
                    // Optional: remove local data after migration
                    localStorage.removeItem(localExercisesKey);
                } else {
                    // No local data, so populate with initial exercises
                    const batch = writeBatch(db);
                    initialExercisesData.forEach(exercise => {
                        const docRef = doc(collectionRef, exercise.id);
                        batch.set(docRef, exercise);
                    });
                    await batch.commit();
                    setExercises(initialExercisesData);
                    console.log("Initial exercises populated in Firestore.");
                }
            } catch (error) {
                console.error("Error migrating exercises:", error);
                setExercises(initialExercisesData); // Fallback
            }
        } else {
            const firestoreExercises = querySnapshot.docs.map(doc => doc.data() as Exercise);
            setExercises(firestoreExercises);
        }
    }, (error) => {
        console.error("Error fetching exercises from Firestore:", error);
        setExercises(initialExercisesData); // Fallback
    });

    return () => unsubscribe();
  }, [user, getExercisesCollectionRef]);

  const addExercise = async (exerciseData: Omit<Exercise, 'id' | 'emoji'>) => {
    const collectionRef = getExercisesCollectionRef();
    if (!collectionRef) {
      console.error("No user logged in to add exercise");
      return;
    }
    
    const newExercise: Exercise = {
      id: uuidv4(),
      ...exerciseData,
      emoji: bodyPartEmojiMap.get(exerciseData.bodyPart) || '💪',
    };

    try {
        const docRef = doc(collectionRef, newExercise.id);
        await setDoc(docRef, newExercise);
        // The onSnapshot listener will update the state, no need for setExercises here
    } catch(e) {
        console.error("Error adding exercise to Firestore: ", e);
    }
  };
  
  const updateExercise = async (updatedExerciseData: Exercise) => {
    const collectionRef = getExercisesCollectionRef();
    if (!collectionRef) {
      console.error("No user logged in to update exercise");
      return;
    }
    
    const exerciseWithCorrectEmoji: Exercise = {
        ...updatedExerciseData,
        emoji: bodyPartEmojiMap.get(updatedExerciseData.bodyPart) || '💪',
    };
    
    try {
        const docRef = doc(collectionRef, exerciseWithCorrectEmoji.id);
        await setDoc(docRef, exerciseWithCorrectEmoji, { merge: true });
    } catch(e) {
        console.error("Error updating exercise in Firestore: ", e);
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    const collectionRef = getExercisesCollectionRef();
    if (!collectionRef) {
      console.error("No user logged in to delete exercise");
      return;
    }

    // TODO: Also delete this exercise from all workout logs.
    // This is more complex and requires a batch write or cloud function.
    // For now, we just delete the exercise definition.
    try {
        const docRef = doc(collectionRef, exerciseId);
        const batch = writeBatch(db);
        batch.delete(docRef);
        await batch.commit();
    } catch(e) {
        console.error("Error deleting exercise from Firestore: ", e);
    }
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
