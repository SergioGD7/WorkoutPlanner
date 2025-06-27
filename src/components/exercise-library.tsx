"use client";

import { useState } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CreateExerciseDialog from "./create-exercise-dialog";
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";
import { bodyParts as allBodyParts } from "@/lib/data";

export default function ExerciseLibrary() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { exercises } = useExercises();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("all");

  const bodyPartsWithAll = ["all", ...allBodyParts];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold tracking-tight font-headline">{t('exerciseLibrary')}</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('createCustomExercise')}
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
          {bodyPartsWithAll.map((part) => (
            <TabsTrigger key={part} value={part}>{t(part.toLowerCase())}</TabsTrigger>
          ))}
        </TabsList>
        {bodyPartsWithAll.map((part) => (
          <TabsContent key={part} value={part}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-4">
              {exercises
                .filter((ex) => activeTab === 'all' || ex.bodyPart === activeTab)
                .map((exercise) => (
                  <Card key={exercise.id} className="overflow-hidden group transition-all hover:shadow-lg">
                    <CardHeader className="p-0">
                       <div className="relative h-48 w-full">
                         <Image
                           src={exercise.image}
                           alt={t(exercise.name)}
                           fill
                           className="object-cover transition-transform group-hover:scale-105"
                           data-ai-hint={exercise['data-ai-hint']}
                         />
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
      <CreateExerciseDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
    </div>
  );
}
