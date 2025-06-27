"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Trash2, PlusCircle } from "lucide-react";
import type { WorkoutExercise, Exercise } from "@/lib/types";
import { useLanguage } from "@/context/language-context";

const setSchema = z.object({
  reps: z.coerce.number().min(0, "Reps must be positive."),
  weight: z.coerce.number().min(0, "Weight must be positive."),
  completed: z.boolean(),
});

const formSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  sets: z.array(setSchema).min(1, "At least one set is required."),
});

interface EditWorkoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WorkoutExercise) => void;
  workoutExercise: WorkoutExercise | null;
  exerciseDetails: Exercise | undefined;
}

export default function EditWorkoutDialog({ isOpen, onClose, onSave, workoutExercise, exerciseDetails }: EditWorkoutDialogProps) {
  const { t } = useLanguage();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: workoutExercise || undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sets",
  });
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values as WorkoutExercise);
    onClose();
  };
  
  if (!workoutExercise) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('edit')}: {exerciseDetails?.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="max-h-80 overflow-y-auto pr-2 space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2 p-3 rounded-md border">
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`sets.${index}.reps`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('reps')}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`sets.${index}.weight`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('weightKg')}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => append({ reps: 10, weight: 0, completed: false })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> {t('addSet')}
            </Button>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">{t('cancel')}</Button>
              </DialogClose>
              <Button type="submit">{t('saveChanges')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
