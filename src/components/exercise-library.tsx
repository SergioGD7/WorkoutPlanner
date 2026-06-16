"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2, Dumbbell } from "lucide-react";
import CreateExerciseDialog from "./create-exercise-dialog";
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { bodyParts as allBodyParts } from "@/lib/data";
import type { Exercise, WorkoutLog } from "@/lib/types";
import DeleteExerciseDialog from "./delete-exercise-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ExerciseLibrary() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  
  const { exercises, deleteExercise } = useExercises();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const bodyPartsWithAll = ["all", ...allBodyParts];
  
  useEffect(() => {
    if (user) {
        const docRef = doc(db, `users/${user.uid}/workout_logs/all`);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setWorkoutLog(docSnap.data() as WorkoutLog);
            } else {
                setWorkoutLog({});
            }
        });
        return () => unsubscribe();
    }
  }, [user]);

  const handleCreateClick = () => {
    setExerciseToEdit(null);
    setIsDialogOpen(true);
  }

  const handleEditClick = (exercise: Exercise) => {
    setExerciseToEdit(exercise);
    setIsDialogOpen(true);
  };
  
  const handleDeleteClick = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setExerciseToEdit(null);
  };
  
  const handleDeleteConfirm = async () => {
    if (exerciseToDelete) {
      await deleteExercise(exerciseToDelete.id);
      setExerciseToDelete(null);
    }
  };

  // 1RM Estimator using Epley formula: 1RM = w * (1 + r/30)
  const getEstimated1RM = (exerciseId: string) => {
    let max1RM = 0;
    Object.values(workoutLog).forEach(dailyWorkout => {
      const exerciseLogs = dailyWorkout.filter(log => log.exerciseId === exerciseId);
      exerciseLogs.forEach(log => {
        log.sets.forEach(set => {
          if (set.weight > 0 && set.reps > 0) {
            const current1RM = set.weight * (1 + set.reps / 30);
            if (current1RM > max1RM) {
              max1RM = current1RM;
            }
          }
        });
      });
    });
    return max1RM > 0 ? Math.round(max1RM) : null;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight font-headline">{t('exerciseLibrary')}</h2>
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t('createCustomExercise')}</span>
          <span className="sm:hidden">{t('create')}</span>
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder={t('searchExercises') || "Search exercises..."} 
          className="pl-10 h-12 bg-muted/50 border-transparent focus-visible:ring-primary rounded-xl text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <ScrollArea className="w-full whitespace-nowrap mb-6">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-none bg-transparent p-1 text-muted-foreground gap-2 w-full">
            {bodyPartsWithAll.map((part) => (
              <TabsTrigger 
                key={part} 
                value={part}
                className="rounded-full border border-border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary px-5 py-2 shadow-sm transition-all"
              >
                {t(part.toLowerCase())}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
        {bodyPartsWithAll.map((part) => (
          <TabsContent key={part} value={part} className="mt-0 outline-none">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
              {exercises
                .filter((ex) => activeTab === 'all' || ex.bodyPart === activeTab)
                .filter((ex) => 
                  ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  t(ex.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                  t(ex.bodyPart.toLowerCase()).toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((exercise) => {
                  const estimated1RM = getEstimated1RM(exercise.id);
                  return (
                    <Card key={exercise.id} className="glass-effect transition-all hover:shadow-lg hover:border-primary/50 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-bl-lg">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(exercise)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">{t('editExercise')}</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(exercise)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">{t('deleteExercise')}</span>
                        </Button>
                      </div>
                      
                      <CardHeader className="flex flex-col items-start justify-between pb-2">
                        <CardTitle className="font-headline text-lg w-full pr-12">{exercise.emoji} {t(exercise.name)}</CardTitle>
                        <div className="flex gap-2 items-center mt-2 w-full justify-between">
                          <Badge className="capitalize bg-accent/20 text-accent hover:bg-accent/30 border-transparent">{t(exercise.bodyPart.toLowerCase())}</Badge>
                          {estimated1RM !== null && estimated1RM > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20 cursor-help">
                                    <Dumbbell className="h-3 w-3" />
                                    1RM: {estimated1RM}kg
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-center">
                                  <p className="text-xs">{t('estimated1RMExplanation')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">{t(exercise.description)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <CreateExerciseDialog isOpen={isDialogOpen} onClose={handleCloseDialog} exerciseToEdit={exerciseToEdit} />
      <DeleteExerciseDialog 
        isOpen={!!exerciseToDelete}
        onClose={() => setExerciseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        exerciseName={exerciseToDelete ? t(exerciseToDelete.name) : ""}
      />
    </div>
  );
}
