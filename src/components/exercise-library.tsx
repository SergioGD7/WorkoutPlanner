"use client";

import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exercises } from "@/lib/data";
import type { Exercise } from "@/lib/types";

const bodyParts: Exercise['bodyPart'][] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export default function ExerciseLibrary() {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight mb-4 font-headline">Exercise Library</h2>
      <Tabs defaultValue="Chest" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          {bodyParts.map((part) => (
            <TabsTrigger key={part} value={part}>{part}</TabsTrigger>
          ))}
        </TabsList>
        {bodyParts.map((part) => (
          <TabsContent key={part} value={part}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-4">
              {exercises
                .filter((ex) => ex.bodyPart === part)
                .map((exercise) => (
                  <Card key={exercise.id} className="overflow-hidden group transition-all hover:shadow-lg">
                    <CardHeader className="p-0">
                       <div className="relative h-48 w-full">
                         <Image
                           src={exercise.image}
                           alt={exercise.name}
                           fill
                           className="object-cover transition-transform group-hover:scale-105"
                           data-ai-hint={exercise['data-ai-hint']}
                         />
                       </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="font-headline text-lg">{exercise.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{exercise.description}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
