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
import { workoutTemplates as defaultTemplatesData } from '@/lib/data';
import type { WorkoutTemplate } from '@/lib/types';
import { useAuth } from './auth-context';

interface TemplateContextType {
  templates: WorkoutTemplate[];
  addTemplate: (template: Omit<WorkoutTemplate, 'id'>) => Promise<void>;
  updateTemplate: (template: WorkoutTemplate) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  replaceTemplates: (templates: WorkoutTemplate[]) => Promise<void>;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(defaultTemplatesData);
  const { user } = useAuth();

  const getTemplatesCollectionRef = useCallback(() => {
    if (!user) return null;
    return collection(db, `users/${user.uid}/templates`);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTemplates(defaultTemplatesData);
      return;
    }

    const collectionRef = collection(db, `users/${user.uid}/templates`);
    const unsubscribe = onSnapshot(
      query(collectionRef),
      (querySnapshot) => {
        // Deliberately *not* re-seeding the defaults here: doing so meant a user
        // who deleted all their routines got them back on the next snapshot.
        setTemplates(querySnapshot.docs.map((docSnap) => docSnap.data() as WorkoutTemplate));
      },
      (error) => {
        console.error('Error fetching templates from Firestore:', error);
        setTemplates([]);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const addTemplate = useCallback(
    async (templateData: Omit<WorkoutTemplate, 'id'>) => {
      const collectionRef = getTemplatesCollectionRef();
      if (!collectionRef) return;

      const newTemplate: WorkoutTemplate = { id: uuidv4(), ...templateData };
      try {
        await setDoc(doc(collectionRef, newTemplate.id), newTemplate);
      } catch (error) {
        console.error('Error adding template to Firestore:', error);
      }
    },
    [getTemplatesCollectionRef],
  );

  const updateTemplate = useCallback(
    async (updated: WorkoutTemplate) => {
      const collectionRef = getTemplatesCollectionRef();
      if (!collectionRef) return;
      try {
        // Not merging: removing a day or an exercise must actually remove it.
        await setDoc(doc(collectionRef, updated.id), updated);
      } catch (error) {
        console.error('Error updating template in Firestore:', error);
      }
    },
    [getTemplatesCollectionRef],
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      const collectionRef = getTemplatesCollectionRef();
      if (!collectionRef) return;
      try {
        await deleteDoc(doc(collectionRef, templateId));
      } catch (error) {
        console.error('Error deleting template from Firestore:', error);
      }
    },
    [getTemplatesCollectionRef],
  );

  const replaceTemplates = useCallback(
    async (incoming: WorkoutTemplate[]) => {
      const collectionRef = getTemplatesCollectionRef();
      if (!collectionRef || incoming.length === 0) return;

      for (let i = 0; i < incoming.length; i += 400) {
        const batch = writeBatch(db);
        incoming.slice(i, i + 400).forEach((template) => {
          const withId = { ...template, id: template.id || uuidv4() };
          batch.set(doc(collectionRef, withId.id), withId);
        });
        await batch.commit();
      }
    },
    [getTemplatesCollectionRef],
  );

  const value = useMemo(
    () => ({ templates, addTemplate, updateTemplate, deleteTemplate, replaceTemplates }),
    [templates, addTemplate, updateTemplate, deleteTemplate, replaceTemplates],
  );

  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

export function useTemplates() {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplateProvider');
  }
  return context;
}
