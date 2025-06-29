"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import CreateExerciseDialog from "./create-exercise-dialog";
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";
import { bodyParts as allBodyParts } from "@/lib/data";
import type { Exercise } from "@/lib/types";
import DeleteExerciseDialog from "./delete-exercise-dialog";
import { Badge } from "@/components/ui/badge";

export default function ExerciseLibrary() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const { exercises, deleteExercise } = useExercises();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("all");

  const bodyPartsWithAll = ["all", ...allBodyParts];
  
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


  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">{t('exerciseLibrary')}</h2>
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('createCustomExercise')}
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-7">
          {bodyPartsWithAll.map((part) => (
            <TabsTrigger 
              key={part} 
              value={part} 
              className="transition-colors data-[state=active]:bg-border data-[state=active]:text-foreground hover:bg-accent hover:text-accent-foreground data-[state=active]:hover:bg-border data-[state=active]:hover:text-foreground"
            >
              {t(part.toLowerCase())}
            </TabsTrigger>
          ))}
        </TabsList>
        {bodyPartsWithAll.map((part) => (
          <TabsContent key={part} value={part} className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {exercises
                .filter((ex) => activeTab === 'all' || ex.bodyPart === activeTab)
                .map((exercise) => (
                  <Card key={exercise.id} className="transition-all hover:shadow-lg">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <CardTitle className="font-headline text-lg">{exercise.emoji} {t(exercise.name)}</CardTitle>
                        <Badge variant="outline" className="mt-1 capitalize">{t(exercise.bodyPart.toLowerCase())}</Badge>
                      </div>
                      <div className="flex gap-1 -mr-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(exercise)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">{t('editExercise')}</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(exercise)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">{t('deleteExercise')}</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{t(exercise.description)}</p>
                    </CardContent>
                  </Card>
                ))}
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
