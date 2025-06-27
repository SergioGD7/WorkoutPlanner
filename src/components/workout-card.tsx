"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { WorkoutExercise, Exercise } from "@/lib/types";
import { useLanguage } from "@/context/language-context";

interface WorkoutCardProps {
  workoutExercise: WorkoutExercise;
  exerciseDetails: Exercise;
  onSetToggle: (exerciseId: string, setIndex: number, checked: boolean) => void;
  onEdit: (workoutExercise: WorkoutExercise) => void;
}

export default function WorkoutCard({ workoutExercise, exerciseDetails, onSetToggle, onEdit }: WorkoutCardProps) {
  const { t } = useLanguage();
  
  const handleEdit = () => {
    onEdit(workoutExercise);
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="grid md:grid-cols-3">
        <div className="md:col-span-1 relative h-48 md:h-full min-h-[150px]">
          <Image
            src={exerciseDetails.image}
            alt={t(exerciseDetails.name)}
            fill
            className="object-cover"
            data-ai-hint={exerciseDetails['data-ai-hint']}
          />
        </div>
        <div className="md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
                <CardTitle className="font-headline text-xl">{t(exerciseDetails.name)}</CardTitle>
                <p className="text-sm text-muted-foreground">{t(exerciseDetails.bodyPart.toLowerCase())}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">{t('editExercise')}</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workoutExercise.sets.map((set, index) => (
                <div key={index} className="flex items-center justify-between rounded-md bg-secondary/70 p-3">
                  <div className="font-mono text-sm md:text-base">
                    {t('set')} {index + 1}: <span className="font-semibold">{set.reps} {t('reps')}</span> @ <span className="font-semibold">{set.weight} kg</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`set-${workoutExercise.id}-${index}`}
                      checked={set.completed}
                      onCheckedChange={(checked) => onSetToggle(workoutExercise.id, index, !!checked)}
                      aria-label={`Mark set ${index + 1} as done`}
                    />
                    <Label htmlFor={`set-${workoutExercise.id}-${index}`}>{t('done')}</Label>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
