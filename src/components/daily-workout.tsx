"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Loader2, Copy, CopyCheck } from "lucide-react";
import type { WorkoutExercise, Exercise, Set, WorkoutLog } from "@/lib/types";
import WorkoutCard from "@/components/workout-card";
import AddExerciseDialog from "@/components/add-exercise-dialog";
import EditWorkoutDialog from "@/components/edit-workout-dialog";
import { v4 as uuidv4 } from 'uuid';
import * as z from "zod";
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { useWorkout } from "@/context/workout-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const addExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Please select an exercise."),
  sets: z.coerce.number().min(1, "At least one set is required.").max(10, "Maximum 10 sets."),
  reps: z.coerce.number().min(1, "At least one rep is required.").max(100),
  weight: z.coerce.number().min(0, "Weight must be positive.").max(1000),
});

interface DailyWorkoutProps {
  date: Date;
}

export default function DailyWorkout({ date }: DailyWorkoutProps) {
  const [dailyExercises, setDailyExercises] = useState<WorkoutExercise[]>([]);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWorkoutExercise, setEditingWorkoutExercise] = useState<WorkoutExercise | null>(null);
  const [exerciseToConfirmDelete, setExerciseToConfirmDelete] = useState<WorkoutExercise | null>(null);
  const [showPasteConfirm, setShowPasteConfirm] = useState(false);

  const { exercises: allExercises } = useExercises();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const { copiedWorkout, setCopiedWorkout } = useWorkout();

  const formattedDate = format(date, "yyyy-MM-dd");

  const getWorkoutLogDocRef = useCallback(() => {
    if (!user) return null;
    return doc(db, `users/${user.uid}/workout_logs/all`);
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    if (!user) {
      setWorkoutLog({});
      setIsLoading(false);
      return;
    }

    const docRef = getWorkoutLogDocRef();
    if (!docRef) return;

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            setWorkoutLog(docSnap.data() as WorkoutLog);
        } else {
            console.log("No workout log found, checking localStorage for migration.");
            // Migration logic
            const localLogKey = `workout_logs_${user.email}`;
            try {
              const storedLogs = localStorage.getItem(localLogKey);
              if (storedLogs) {
                  const localLogs: WorkoutLog = JSON.parse(storedLogs);
                  setDoc(docRef, localLogs); // Write local data to Firestore
                  setWorkoutLog(localLogs);
                  localStorage.removeItem(localLogKey); // Optional: remove local data after migration
                  console.log("Workout logs migrated from localStorage to Firestore.");
              } else {
                setWorkoutLog({});
              }
            } catch (error) {
              console.error("Error migrating workout logs from localStorage:", error);
              setWorkoutLog({});
            }
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching workout log from Firestore:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, getWorkoutLogDocRef]);

  useEffect(() => {
    setDailyExercises(workoutLog[formattedDate] || []);
  }, [date, workoutLog, formattedDate]);


  const updateWorkoutInStorage = async (updatedDailyExercises: WorkoutExercise[]) => {
    const docRef = getWorkoutLogDocRef();
    if (!docRef) return;
    
    const updatedLog = { ...workoutLog };
     if (updatedDailyExercises.length > 0) {
        updatedLog[formattedDate] = updatedDailyExercises;
    } else {
        delete updatedLog[formattedDate];
    }

    try {
        await setDoc(docRef, updatedLog);
        // The onSnapshot listener will update the state, no need for setWorkoutLog here.
    } catch (error) {
        console.error("Failed to save workout log to Firestore:", error);
    }
  };

  const handleSetCompletionChange = (exerciseId: string, setIndex: number, completed: boolean) => {
    const updatedDailyExercises = dailyExercises.map(ex => {
        if (ex.id === exerciseId) {
            const newSets = [...ex.sets];
            newSets[setIndex] = { ...newSets[setIndex], completed };
            return { ...ex, sets: newSets };
        }
        return ex;
    });
    // setDailyExercises(updatedDailyExercises); // State will be updated by the listener
    updateWorkoutInStorage(updatedDailyExercises);
  };

  const getExerciseDetails = (exerciseId: string): Exercise | undefined => {
    return allExercises.find(ex => ex.id === exerciseId);
  };
  
  const handleAddExerciseClick = () => {
    setIsAddDialogOpen(true);
  }

  const handleEditExerciseClick = (workoutExercise: WorkoutExercise) => {
    setEditingWorkoutExercise(workoutExercise);
  };

  const handleDeleteWorkoutExercise = () => {
    if (!exerciseToConfirmDelete) return;
    const updatedDailyExercises = dailyExercises.filter(ex => ex.id !== exerciseToConfirmDelete.id);
    updateWorkoutInStorage(updatedDailyExercises);
    setExerciseToConfirmDelete(null);
  };

  const handleSaveNewExercise = (data: z.infer<typeof addExerciseSchema>) => {
    const newSets: Set[] = Array.from({ length: data.sets }, () => ({
      reps: data.reps,
      weight: data.weight,
      completed: false,
    }));

    const newWorkoutExercise: WorkoutExercise = {
      id: uuidv4(),
      exerciseId: data.exerciseId,
      sets: newSets,
    };
    
    const updatedDailyExercises = [...dailyExercises, newWorkoutExercise];
    updateWorkoutInStorage(updatedDailyExercises);
    setIsAddDialogOpen(false);
  };

  const handleSaveEditedExercise = (updatedWorkoutExercise: WorkoutExercise) => {
    const updatedDailyExercises = dailyExercises.map(ex => 
        ex.id === updatedWorkoutExercise.id ? updatedWorkoutExercise : ex
    );
    updateWorkoutInStorage(updatedDailyExercises);
    setEditingWorkoutExercise(null);
  };

  const handleCopyDay = () => {
    // Reset completion status when copying
    const workoutToCopy = dailyExercises.map(ex => ({
      ...ex,
      id: uuidv4(), // Generate new unique ID for the workout exercise itself
      sets: ex.sets.map(set => ({ ...set, completed: false }))
    }));
    setCopiedWorkout(workoutToCopy);
  }

  const handlePasteDay = () => {
    if (dailyExercises.length > 0) {
      setShowPasteConfirm(true);
    } else {
      executePaste();
    }
  }

  const executePaste = () => {
    if (!copiedWorkout) return;
    updateWorkoutInStorage(copiedWorkout);
    setShowPasteConfirm(false);
  }
  
  const getFormattedDate = () => {
    const locale = language === 'es' ? es : enUS;
    return format(date, "EEEE, d", { locale });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline text-2xl capitalize">
            {t('workoutFor', { date: getFormattedDate() })}
          </CardTitle>
          <div className="flex items-center gap-1">
             {dailyExercises.length > 0 && (
                <Button variant="outline" size="icon" onClick={handleCopyDay} aria-label={t('copyDay')}>
                    <Copy className="h-5 w-5" />
                </Button>
             )}
             {copiedWorkout && (
                <Button variant="outline" size="icon" onClick={handlePasteDay} aria-label={t('pasteDay')}>
                    <CopyCheck className="h-5 w-5" />
                </Button>
             )}
            <Button variant="default" size="icon" onClick={handleAddExerciseClick} aria-label={t('addExercise')} className="rounded-full">
              <Plus className="h-6 w-6" />
              <span className="sr-only">{t('addExercise')}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : dailyExercises.length > 0 ? (
            dailyExercises.map((workoutExercise) => {
              const exerciseDetails = getExerciseDetails(workoutExercise.exerciseId);
              if (!exerciseDetails) return null;
              return (
                <WorkoutCard
                  key={workoutExercise.id}
                  workoutExercise={workoutExercise}
                  exerciseDetails={exerciseDetails}
                  onSetToggle={handleSetCompletionChange}
                  onEdit={handleEditExerciseClick}
                  onDelete={() => setExerciseToConfirmDelete(workoutExercise)}
                />
              );
            })
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-lg">{t('noWorkoutPlanned')}</p>
              <p>{t('enjoyRestDay')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddExerciseDialog 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddExercise={handleSaveNewExercise}
      />

      <EditWorkoutDialog 
        isOpen={!!editingWorkoutExercise}
        onClose={() => setEditingWorkoutExercise(null)}
        onSave={handleSaveEditedExercise}
        workoutExercise={editingWorkoutExercise}
        exerciseDetails={editingWorkoutExercise ? getExerciseDetails(editingWorkoutExercise.exerciseId) : undefined}
      />

      <AlertDialog open={!!exerciseToConfirmDelete} onOpenChange={(isOpen) => !isOpen && setExerciseToConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteExercise')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteWorkoutExerciseConfirmation', { exerciseName: exerciseToConfirmDelete ? t(getExerciseDetails(exerciseToConfirmDelete.exerciseId)?.name || '') : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExerciseToConfirmDelete(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkoutExercise}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPasteConfirm} onOpenChange={setShowPasteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pasteWorkout')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pasteWorkoutConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPasteConfirm(false)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={executePaste}>
              {t('pasteAndReplace')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
