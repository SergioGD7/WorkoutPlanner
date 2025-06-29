"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Exercise } from "@/lib/types";
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";

const formSchema = z.object({
  exerciseId: z.string().min(1, "Please select an exercise."),
  sets: z.coerce.number().min(1, "At least one set is required.").max(10, "Maximum 10 sets."),
  reps: z.coerce.number().min(1, "At least one rep is required.").max(100),
  weight: z.coerce.number().min(0, "Weight must be positive.").max(1000),
});

interface AddExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercise: (data: z.infer<typeof formSchema>) => void;
}

export default function AddExerciseDialog({ isOpen, onClose, onAddExercise }: AddExerciseDialogProps) {
  const { exercises } = useExercises();
  const { t } = useLanguage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      exerciseId: "",
      sets: 3,
      reps: 10,
      weight: 10,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onAddExercise(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('addNewExercise')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="exerciseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exercise')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectAnExercise')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {exercises.map((exercise: Exercise) => (
                        <SelectItem key={exercise.id} value={exercise.id}>
                          {exercise.emoji} {t(exercise.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sets')}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('repsPerSet')}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('weightKg')}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{t('cancel')}</Button>
                </DialogClose>
                <Button type="submit">{t('addExercise')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
