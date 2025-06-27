"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { initialWorkoutLog } from "@/lib/data";
import type { WorkoutLog, WorkoutExercise, Exercise, Set } from "@/lib/types";
import WorkoutCard from "@/components/workout-card";
import AddExerciseDialog from "@/components/add-exercise-dialog";
import EditWorkoutDialog from "@/components/edit-workout-dialog";
import { v4 as uuidv4 } from 'uuid';
import * as z from "zod";
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";

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
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>(initialWorkoutLog);
  const [dailyExercises, setDailyExercises] = useState<WorkoutExercise[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWorkoutExercise, setEditingWorkoutExercise] = useState<WorkoutExercise | null>(null);
  const { exercises: allExercises } = useExercises();
  const { t, language } = useLanguage();

  useEffect(() => {
    const formattedDate = format(date, "yyyy-MM-dd");
    setDailyExercises(workoutLog[formattedDate] || []);
  }, [date, workoutLog]);

  const handleSetCompletionChange = (exerciseId: string, setIndex: number, completed: boolean) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    setWorkoutLog(currentLog => {
      const newLog = { ...currentLog };
      if (!newLog[formattedDate]) return currentLog;

      const updatedDailyExercises = JSON.parse(JSON.stringify(newLog[formattedDate]));
      const exerciseIndex = updatedDailyExercises.findIndex((ex: WorkoutExercise) => ex.id === exerciseId);
      if (exerciseIndex === -1) return currentLog;

      updatedDailyExercises[exerciseIndex].sets[setIndex].completed = completed;
      
      newLog[formattedDate] = updatedDailyExercises;
      return newLog;
    });
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
    
    const formattedDate = format(date, "yyyy-MM-dd");
    setWorkoutLog(currentLog => {
      const newLog = { ...currentLog };
      const currentDailyExercises = newLog[formattedDate] ? [...newLog[formattedDate]] : [];
      currentDailyExercises.push(newWorkoutExercise);
      newLog[formattedDate] = currentDailyExercises;
      return newLog;
    });
    setIsAddDialogOpen(false);
  };

  const handleSaveEditedExercise = (updatedWorkoutExercise: WorkoutExercise) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    setWorkoutLog(currentLog => {
        const newLog = { ...currentLog };
        if (!newLog[formattedDate]) return currentLog;
        
        const updatedDailyExercises = newLog[formattedDate].map(ex => 
            ex.id === updatedWorkoutExercise.id ? updatedWorkoutExercise : ex
        );

        newLog[formattedDate] = updatedDailyExercises;
        return newLog;
    });
    setEditingWorkoutExercise(null);
  };
  
  const getFormattedDate = () => {
    const locale = language === 'es' ? es : enUS;
    return format(date, "EEEE, MMMM d", { locale });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl capitalize">
            {t('workoutFor', { date: getFormattedDate() })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dailyExercises.length > 0 ? (
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
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={handleAddExerciseClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('addExercise')}
          </Button>
        </CardFooter>
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
    </>
  );
}
