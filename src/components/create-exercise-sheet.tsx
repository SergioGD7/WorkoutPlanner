"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";
import { bodyParts } from "@/lib/data";
import type { Exercise, BodyPart } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  bodyPart: z.enum(bodyParts as unknown as [string, ...string[]]),
});

interface CreateExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseToEdit?: Exercise | null;
}

export default function CreateExerciseSheet({
  isOpen,
  onClose,
  exerciseToEdit,
}: CreateExerciseSheetProps) {
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
        bodyPart: values.bodyPart as BodyPart,
      });
    } else {
      await addExercise({
        ...values,
        bodyPart: values.bodyPart as BodyPart,
      });
    }
    onClose();
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 h-[90vh] bg-card border-t border-border rounded-t-[2rem] shadow-2xl flex flex-col"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing touch-none">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-2 flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold">
                {isEditing ? t("editExercise") : t("createCustomExercise")}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 px-6 pb-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-2 pb-12">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">{t("exerciseName")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t("namePlaceholder") || "Nombre del ejercicio"} 
                            className="h-12 bg-secondary/20 text-base focus-visible:ring-primary/50" 
                            {...field} 
                          />
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
                        <FormLabel className="text-base font-semibold">{t("exerciseDescription")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("descriptionPlaceholder") || "Descripción detallada"}
                            className="min-h-[100px] resize-none bg-secondary/20 text-base focus-visible:ring-primary/50"
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
                        <FormLabel className="text-base font-semibold">{t("bodyPart")}</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {bodyParts.map((part) => {
                              const isSelected = field.value === part;
                              return (
                                <button
                                  key={part}
                                  type="button"
                                  onClick={() => field.onChange(part)}
                                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                    isSelected 
                                    ? "bg-primary text-primary-foreground shadow-md scale-105" 
                                    : "bg-secondary/30 hover:bg-secondary/60 text-foreground border border-transparent"
                                  }`}
                                >
                                  {t(part.toLowerCase())}
                                </button>
                              );
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose} 
                      className="flex-1 rounded-xl h-12"
                    >
                      {t("cancel")}
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 rounded-xl h-12 text-base font-bold shadow-lg"
                    >
                      {isEditing ? t("saveChanges") : t("createExercise")}
                    </Button>
                  </div>
                </form>
              </Form>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
