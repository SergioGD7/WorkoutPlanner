"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";
import { bodyParts } from "@/lib/data";
import type { Exercise } from "@/lib/types";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  bodyPart: z.enum(bodyParts),
});

interface CreateExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseToEdit?: Exercise | null;
}

export default function CreateExerciseDialog({
  isOpen,
  onClose,
  exerciseToEdit,
}: CreateExerciseDialogProps) {
  const { addExercise, updateExercise } = useExercises();
  const { t } = useLanguage();

  const isEditing = !!exerciseToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      bodyPart: "Chest",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && exerciseToEdit) {
        form.reset({
          name: exerciseToEdit.name,
          description: exerciseToEdit.description,
          bodyPart: exerciseToEdit.bodyPart,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          bodyPart: "Chest",
        });
      }
    }
  }, [isOpen, isEditing, exerciseToEdit, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isEditing && exerciseToEdit) {
      await updateExercise({
        ...exerciseToEdit,
        ...values,
      });
    } else {
      await addExercise(values);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editExercise") : t("createCustomExercise")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("exerciseName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("exerciseDescription")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("descriptionPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bodyPart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("bodyPart")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("bodyPart")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bodyParts.map((part) => (
                        <SelectItem key={part} value={part}>
                          {t(part.toLowerCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button type="submit">{isEditing ? t("saveChanges") : t("createExercise")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
