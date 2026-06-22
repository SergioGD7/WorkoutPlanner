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
import AddExerciseSheet from "@/components/add-exercise-sheet";
import RestTimer from "@/components/rest-timer";
import { v4 as uuidv4 } from 'uuid';
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { useWorkout } from "@/context/workout-context";
import { useToast } from "@/hooks/use-toast";
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
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DailyWorkoutProps {
  date: Date;
}

export default function DailyWorkout({ date }: DailyWorkoutProps) {
  const [dailyExercises, setDailyExercises] = useState<WorkoutExercise[]>([]);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [exerciseToConfirmDelete, setExerciseToConfirmDelete] = useState<WorkoutExercise | null>(null);
  const [showPasteConfirm, setShowPasteConfirm] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const { exercises: allExercises } = useExercises();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
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
            console.log("No workout log found in Firestore for this user.");
            setWorkoutLog({});
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching workout log from Firestore:", error);
        setWorkoutLog({});
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
    updateWorkoutInStorage(updatedDailyExercises);
    
    if (completed) {
      setIsTimerActive(true);
    }
  };

  const handleSetUpdate = (exerciseId: string, setIndex: number, field: "reps" | "weight", value: number) => {
    const updatedDailyExercises = dailyExercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        return { ...ex, sets: newSets };
      }
      return ex;
    });
    updateWorkoutInStorage(updatedDailyExercises);
  };

  const handleAddSet = (exerciseId: string) => {
    const updatedDailyExercises = dailyExercises.map(ex => {
      if (ex.id === exerciseId) {
        // Copy the last set's weight and reps, or use defaults
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: Set = lastSet 
          ? { reps: lastSet.reps, weight: lastSet.weight, completed: false }
          : { reps: 10, weight: 0, completed: false };
          
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    });
    updateWorkoutInStorage(updatedDailyExercises);
  };

  const handleRemoveSet = (exerciseId: string, setIndex: number) => {
    const updatedDailyExercises = dailyExercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = ex.sets.filter((_, idx) => idx !== setIndex);
        return { ...ex, sets: newSets };
      }
      return ex;
    });
    updateWorkoutInStorage(updatedDailyExercises);
  };

  const getExerciseDetails = (exerciseId: string): Exercise | undefined => {
    return allExercises.find(ex => ex.id === exerciseId);
  };
  
  const handleAddExerciseClick = () => {
    setIsAddSheetOpen(true);
  }

  const handleDeleteWorkoutExercise = () => {
    if (!exerciseToConfirmDelete) return;
    const updatedDailyExercises = dailyExercises.filter(ex => ex.id !== exerciseToConfirmDelete.id);
    updateWorkoutInStorage(updatedDailyExercises);
    setExerciseToConfirmDelete(null);
  };

  const handleSaveNewExercise = (exerciseId: string) => {
    if (dailyExercises.some(ex => ex.exerciseId === exerciseId)) {
      toast({
        title: t('error'),
        description: t('exerciseAlreadyAdded') || "Este ejercicio ya está en tu rutina de hoy.",
        variant: "destructive"
      });
      return;
    }

    const newSets: Set[] = Array.from({ length: 3 }, () => ({
      reps: 10,
      weight: 0,
      completed: false,
    }));

    const newWorkoutExercise: WorkoutExercise = {
      id: uuidv4(),
      exerciseId: exerciseId,
      sets: newSets,
    };
    
    const updatedDailyExercises = [...dailyExercises, newWorkoutExercise];
    updateWorkoutInStorage(updatedDailyExercises);
    setIsAddSheetOpen(false); // Close the sheet automatically
  };

  const handleCopyDay = () => {
    const workoutToCopy = dailyExercises.map(ex => ({
      ...ex,
      id: uuidv4(),
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

  const existingExerciseIds = dailyExercises.map(ex => ex.exerciseId);

  return (
    <>
      <Card className="border-0 shadow-none bg-transparent sm:border sm:shadow-sm sm:bg-card">
        <CardHeader className="flex flex-row items-center justify-between px-2 sm:px-6">
          <CardTitle className="font-headline text-2xl capitalize">
            {t('workoutFor', { date: getFormattedDate() })}
          </CardTitle>
          <div className="flex items-center gap-1">
             {dailyExercises.length > 0 && (
                <Button variant="outline" size="icon" onClick={handleCopyDay} aria-label={t('copyDay')} className="rounded-full">
                    <Copy className="h-5 w-5" />
                </Button>
             )}
             {copiedWorkout && (
                <Button variant="outline" size="icon" onClick={handlePasteDay} aria-label={t('pasteDay')} className="rounded-full">
                    <CopyCheck className="h-5 w-5" />
                </Button>
             )}
            <Button variant="default" size="icon" onClick={handleAddExerciseClick} aria-label={t('addExercise')} className="rounded-full shadow-md">
              <Plus className="h-6 w-6" />
              <span className="sr-only">{t('addExercise')}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-2 sm:px-6">
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
                  onSetUpdate={handleSetUpdate}
                  onAddSet={handleAddSet}
                  onRemoveSet={handleRemoveSet}
                  onDelete={() => setExerciseToConfirmDelete(workoutExercise)}
                />
              );
            })
          ) : (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-secondary/10">
              <p className="text-lg font-medium text-foreground mb-1">{t('noWorkoutPlanned')}</p>
              <p className="text-muted-foreground mb-4">{t('enjoyRestDay')}</p>
              <Button onClick={handleAddExerciseClick} className="rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                Empezar a entrenar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddExerciseSheet 
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onAddExercise={handleSaveNewExercise}
        existingExerciseIds={existingExerciseIds}
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

      <RestTimer 
        isActive={isTimerActive} 
        onClose={() => setIsTimerActive(false)} 
        initialSeconds={90} 
      />
    </>
  );
}
