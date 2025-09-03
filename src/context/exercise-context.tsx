
"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { initialExercises as initialExercisesData } from '@/lib/data';
import type { Exercise, BodyPart } from '@/lib/types';
import { useAuth } from './auth-context';
import { v4 as uuidv4 } from 'uuid';
import { bodyPartEmojiMap } from '@/lib/style-utils';
import { collection, doc, setDoc, writeBatch, onSnapshot, query } from "firebase/firestore";
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
           console.log("No exercises found for user. This might be a new account or migration pending.");
           // Migration is now handled by AuthContext, so we might see this state briefly.
           // We can set initial exercises as a fallback display until Firestore syncs.
           setExercises(initialExercisesData);
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
