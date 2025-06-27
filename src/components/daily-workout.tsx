"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { initialWorkoutLog, exercises as allExercises } from "@/lib/data";
import type { WorkoutLog, WorkoutExercise, Exercise } from "@/lib/types";
import WorkoutCard from "@/components/workout-card";
import { useToast } from "@/hooks/use-toast";

interface DailyWorkoutProps {
  date: Date;
}

export default function DailyWorkout({ date }: DailyWorkoutProps) {
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>(initialWorkoutLog);
  const [dailyExercises, setDailyExercises] = useState<WorkoutExercise[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const formattedDate = format(date, "yyyy-MM-dd");
    setDailyExercises(workoutLog[formattedDate] || []);
  }, [date, workoutLog]);

  const handleSetCompletionChange = (exerciseId: string, setIndex: number, completed: boolean) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    
    // Using a functional update to ensure we have the latest state
    setWorkoutLog(currentLog => {
      const newLog = { ...currentLog };
      if (!newLog[formattedDate]) return currentLog;

      const exerciseIndex = newLog[formattedDate].findIndex(ex => ex.id === exerciseId);
      if (exerciseIndex === -1) return currentLog;

      // Deep copy the exercises for the day to avoid direct mutation
      const updatedDailyExercises = JSON.parse(JSON.stringify(newLog[formattedDate]));
      updatedDailyExercises[exerciseIndex].sets[setIndex].completed = completed;
      
      newLog[formattedDate] = updatedDailyExercises;
      return newLog;
    });
  };

  const getExerciseDetails = (exerciseId: string): Exercise | undefined => {
    return allExercises.find(ex => ex.id === exerciseId);
  };
  
  const handleAddExercise = () => {
    toast({
        title: "Feature not available",
        description: "Adding exercises is not implemented in this demo.",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Workout for {format(date, "EEEE, MMMM d")}
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
              />
            );
          })
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-lg">No workout planned for this day.</p>
            <p>Enjoy your rest day!</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={handleAddExercise}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise
        </Button>
      </CardFooter>
    </Card>
  );
}
