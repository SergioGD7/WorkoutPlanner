"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { WorkoutExercise, Exercise } from "@/lib/types";
import { useLanguage } from "@/context/language-context";
import { motion, useAnimation, PanInfo } from "framer-motion";

interface WorkoutCardProps {
  workoutExercise: WorkoutExercise;
  exerciseDetails: Exercise;
  onSetToggle: (exerciseId: string, setIndex: number, checked: boolean) => void;
  onSetUpdate: (exerciseId: string, setIndex: number, field: "reps" | "weight", value: number) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
  onDelete: () => void;
}

export default function WorkoutCard({
  workoutExercise,
  exerciseDetails,
  onSetToggle,
  onSetUpdate,
  onAddSet,
  onRemoveSet,
  onDelete
}: WorkoutCardProps) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md border-border/50">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <span>{exerciseDetails.emoji}</span>
            <span>{t(exerciseDetails.name)}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t(exerciseDetails.bodyPart.toLowerCase())}</p>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
            <span className="sr-only">{t('deleteExercise')}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <div className="space-y-2">
          {workoutExercise.sets.map((set, index) => (
            <SetRow
              key={`${workoutExercise.id}-${index}`}
              set={set}
              index={index}
              workoutExerciseId={workoutExercise.id}
              onSetToggle={onSetToggle}
              onSetUpdate={onSetUpdate}
              onRemoveSet={onRemoveSet}
            />
          ))}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-colors"
          onClick={() => onAddSet(workoutExercise.id)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir serie
        </Button>
      </CardContent>
    </Card>
  );
}

interface SetRowProps {
  set: { reps: number; weight: number; completed: boolean };
  index: number;
  workoutExerciseId: string;
  onSetToggle: (exerciseId: string, setIndex: number, checked: boolean) => void;
  onSetUpdate: (exerciseId: string, setIndex: number, field: "reps" | "weight", value: number) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
}

function SetRow({ set, index, workoutExerciseId, onSetToggle, onSetUpdate, onRemoveSet }: SetRowProps) {
  const { t } = useLanguage();
  const controls = useAnimation();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Handlers for swipe-to-delete
  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = -80; // Swipe left by 80px to delete
    
    if (info.offset.x < threshold) {
      setIsDeleting(true);
      await controls.start({ x: -1000, opacity: 0, transition: { duration: 0.2 } });
      onRemoveSet(workoutExerciseId, index);
    } else {
      // Snap back if not swiped far enough
      controls.start({ x: 0, transition: { type: "spring", bounce: 0.5 } });
    }
  };

  const handleInputChange = (field: "reps" | "weight", value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    onSetUpdate(workoutExerciseId, index, field, numValue);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background Trash Icon for Swipe */}
      <div className="absolute inset-0 bg-destructive/90 flex items-center justify-end pr-4 rounded-lg z-0">
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>
      
      {/* Foreground Swipeable Row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative z-10 flex items-center justify-between border p-2 pl-3 rounded-lg transition-all ${
          set.completed 
            ? "bg-muted border-primary/50" 
            : "bg-card border-border/50 hover:border-border"
        }`}
      >
        <div className="flex items-center gap-3 md:gap-4 flex-1">
          <span className="text-sm font-medium text-muted-foreground w-12 shrink-0">
            {t('set')} {index + 1}
          </span>
          
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="number"
                value={set.weight || ""}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                className="w-16 h-8 text-center bg-secondary/30 hover:bg-secondary/50 focus:bg-secondary/70 border border-transparent focus:border-primary/50 rounded-md outline-none transition-colors text-foreground font-semibold"
                placeholder="0"
                min="0"
                step="0.01"
              />
              <span className="text-xs text-muted-foreground ml-1.5 font-medium">kg</span>
            </div>
            
            <span className="text-muted-foreground/50 mx-1">x</span>
            
            <div className="relative flex items-center">
              <input
                type="number"
                value={set.reps || ""}
                onChange={(e) => handleInputChange("reps", e.target.value)}
                className="w-14 h-8 text-center bg-secondary/30 hover:bg-secondary/50 focus:bg-secondary/70 border border-transparent focus:border-primary/50 rounded-md outline-none transition-colors text-foreground font-semibold"
                placeholder="0"
                min="0"
                step="1"
              />
              <span className="text-xs text-muted-foreground ml-1.5 font-medium">reps</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-2">
          {/* Explicit Delete Button in case they don't know about swipe */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemoveSet(workoutExerciseId, index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          {/* Checkbox wrapper to prevent drag interference */}
          <div className="pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
            <Checkbox
              id={`set-${workoutExerciseId}-${index}`}
              checked={set.completed}
              onCheckedChange={(checked) => onSetToggle(workoutExerciseId, index, !!checked)}
              aria-label={`Mark set ${index + 1} as done`}
              className={`h-6 w-6 rounded-md transition-all ${set.completed ? 'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground' : ''}`}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
