"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Exercise } from "@/lib/types";
import { useExercises } from "@/context/exercise-context";
import { useLanguage } from "@/context/language-context";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercise: (exerciseId: string) => void;
  existingExerciseIds?: string[];
}

export default function AddExerciseSheet({ isOpen, onClose, onAddExercise, existingExerciseIds = [] }: AddExerciseSheetProps) {
  const { exercises } = useExercises();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery) return exercises;
    return exercises.filter(ex => 
      t(ex.name).toLowerCase().includes(searchQuery.toLowerCase()) || 
      t(ex.bodyPart.toLowerCase()).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [exercises, searchQuery, t]);

  const exercisesByBodyPart = useMemo(() => {
    const grouped: Record<string, Exercise[]> = {};
    filteredExercises.forEach(ex => {
      if (!grouped[ex.bodyPart]) grouped[ex.bodyPart] = [];
      grouped[ex.bodyPart].push(ex);
    });
    
    // Sort groups alphabetically by translated body part
    const sortedGroups: Record<string, Exercise[]> = {};
    Object.keys(grouped).sort((a, b) => t(a.toLowerCase()).localeCompare(t(b.toLowerCase()))).forEach(key => {
      sortedGroups[key] = grouped[key].sort((a, b) => t(a.name).localeCompare(t(b.name)));
    });
    
    return sortedGroups;
  }, [filteredExercises, t]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const handleSelect = (exerciseId: string) => {
    if (existingExerciseIds.includes(exerciseId)) return;
    onAddExercise(exerciseId);
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
            className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] bg-card border-t border-border rounded-t-[2rem] shadow-2xl flex flex-col"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing touch-none">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold">{t('addExercise')}</h2>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search */}
            <div className="px-6 pb-4 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t('searchExercises') || 'Search exercises...'} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/30 border-transparent focus-visible:ring-primary/50 text-base h-12"
                />
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 px-6 pb-8">
              {Object.keys(exercisesByBodyPart).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No exercises found.
                </div>
              ) : (
                <div className="space-y-6 pb-12">
                  {Object.entries(exercisesByBodyPart).map(([bodyPart, groupExercises]) => (
                    <div key={bodyPart} className="space-y-3">
                      <h3 className="text-sm font-bold text-primary/80 uppercase tracking-wider sticky top-0 bg-card py-2 z-10">
                        {t(bodyPart.toLowerCase())}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {groupExercises.map((exercise) => {
                          const isAdded = existingExerciseIds.includes(exercise.id);
                          return (
                            <div 
                              key={exercise.id}
                              onClick={() => handleSelect(exercise.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-colors border border-transparent ${
                                isAdded 
                                ? "opacity-50 cursor-not-allowed bg-secondary/5" 
                                : "bg-secondary/10 hover:bg-secondary/30 active:bg-secondary/50 cursor-pointer hover:border-border/50"
                              }`}
                            >
                              <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-background text-2xl shadow-sm shrink-0 ${isAdded ? 'grayscale' : ''}`}>
                                {exercise.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">
                                  {t(exercise.name)}
                                  {isAdded && <span className="ml-2 text-[10px] uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm">Añadido</span>}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">{t(exercise.bodyPart.toLowerCase())}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
