"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { workoutTemplates as defaultTemplatesData } from '@/lib/data';
import type { WorkoutTemplate } from '@/lib/types';
import { useAuth } from './auth-context';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, setDoc, writeBatch, onSnapshot, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TemplateContextType {
  templates: WorkoutTemplate[];
  addTemplate: (template: Omit<WorkoutTemplate, 'id'>) => Promise<void>;
  updateTemplate: (template: WorkoutTemplate) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
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

    const collectionRef = getTemplatesCollectionRef();
    if (!collectionRef) return;

    const unsubscribe = onSnapshot(query(collectionRef), async (querySnapshot) => {
        if (querySnapshot.empty) {
           // If the user has no templates, we seed the defaults to Firestore
           // But just once. So we do a batch write of the default templates.
           const batch = writeBatch(db);
           defaultTemplatesData.forEach(tpl => {
              const docRef = doc(collectionRef, tpl.id);
              batch.set(docRef, tpl);
           });
           try {
             await batch.commit();
             console.log("Seeded default templates for new user");
           } catch(e) {
             console.error("Error seeding default templates:", e);
           }
           setTemplates(defaultTemplatesData);
        } else {
            const firestoreTemplates = querySnapshot.docs.map(doc => doc.data() as WorkoutTemplate);
            setTemplates(firestoreTemplates);
        }
    }, (error) => {
        console.error("Error fetching templates from Firestore:", error);
        setTemplates(defaultTemplatesData);
    });

    return () => unsubscribe();
  }, [user, getTemplatesCollectionRef]);

  const addTemplate = async (templateData: Omit<WorkoutTemplate, 'id'>) => {
    const collectionRef = getTemplatesCollectionRef();
    if (!collectionRef) {
      console.error("No user logged in to add template");
      return;
    }
    
    const newTemplate: WorkoutTemplate = {
      id: uuidv4(),
      ...templateData,
    };

    try {
        const docRef = doc(collectionRef, newTemplate.id);
        await setDoc(docRef, newTemplate);
    } catch(e) {
        console.error("Error adding template to Firestore: ", e);
    }
  };
  
  const updateTemplate = async (updatedTemplateData: WorkoutTemplate) => {
    const collectionRef = getTemplatesCollectionRef();
    if (!collectionRef) {
      console.error("No user logged in to update template");
      return;
    }
    
    try {
        const docRef = doc(collectionRef, updatedTemplateData.id);
        await setDoc(docRef, updatedTemplateData, { merge: true });
    } catch(e) {
        console.error("Error updating template in Firestore: ", e);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    const collectionRef = getTemplatesCollectionRef();
    if (!collectionRef) {
      console.error("No user logged in to delete template");
      return;
    }

    try {
        const docRef = doc(collectionRef, templateId);
        const batch = writeBatch(db);
        batch.delete(docRef);
        await batch.commit();
    } catch(e) {
        console.error("Error deleting template from Firestore: ", e);
    }
  };

  return (
    <TemplateContext.Provider value={{ templates, addTemplate, updateTemplate, deleteTemplate }}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplateProvider');
  }
  return context;
}
