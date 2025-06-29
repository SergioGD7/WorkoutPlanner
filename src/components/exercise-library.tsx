"use client";

import { useState } from "react";
import Image from "next/image";
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
                  <Card key={exercise.id} className="overflow-hidden group transition-all hover:shadow-lg">
                    <CardHeader className="p-0 relative">
                       <div className="overflow-hidden h-48 w-full">
                         <Image
                           src={exercise.image}
                           alt={t(exercise.name)}
                           width={600}
                           height={400}
                           className="object-cover w-full h-full transition-transform group-hover:scale-105"
                           data-ai-hint={exercise['data-ai-hint']}
                         />
                       </div>
                       <div className="absolute top-2 right-2 z-10 flex gap-2">
                         <Button variant="outline" size="icon" className="bg-background/70 hover:bg-background" onClick={() => handleEditClick(exercise)}>
                           <Pencil className="h-4 w-4" />
                           <span className="sr-only">{t('editExercise')}</span>
                         </Button>
                          <Button variant="destructive" size="icon" className="bg-destructive/80 hover:bg-destructive text-destructive-foreground" onClick={() => handleDeleteClick(exercise)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{t('deleteExercise')}</span>
                          </Button>
                       </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="font-headline text-lg">{t(exercise.name)}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{t(exercise.description)}</p>
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
