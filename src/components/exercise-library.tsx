"use client";

import { useMemo, useState } from 'react';
import { Dumbbell, History, Pencil, PlusCircle, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CreateExerciseSheet from '@/components/create-exercise-sheet';
import DeleteExerciseDialog from '@/components/delete-exercise-dialog';
import ExerciseHistorySheet from '@/components/exercise-history-sheet';
import { useExercises } from '@/context/exercise-context';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { bodyParts as allBodyParts } from '@/lib/data';
import type { Exercise } from '@/lib/types';
import { fromKg, getExercisePR } from '@/lib/workout-utils';

export default function ExerciseLibrary() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { exercises, deleteExercise } = useExercises();
  const { t } = useLanguage();
  const { settings } = useProfile();
  const { workoutLog } = useWorkout();

  const unit = settings.weightUnit;
  const bodyPartsWithAll = ['all', ...allBodyParts];

  /** Best estimated 1RM per exercise, computed once for the whole grid. */
  const oneRmByExercise = useMemo(() => {
    const map = new Map<string, number>();
    exercises.forEach((exercise) => {
      const pr = getExercisePR(workoutLog, exercise.id);
      if (pr.best1RM > 0) map.set(exercise.id, Math.round(fromKg(pr.best1RM, unit)));
    });
    return map;
  }, [exercises, workoutLog, unit]);

  const handleDeleteConfirm = async () => {
    if (!exerciseToDelete) return;
    await deleteExercise(exerciseToDelete.id);
    setExerciseToDelete(null);
  };

  const matchesSearch = (exercise: Exercise) => {
    const needle = searchTerm.toLowerCase();
    if (!needle) return true;
    return (
      exercise.name.toLowerCase().includes(needle) ||
      t(exercise.name).toLowerCase().includes(needle) ||
      t(exercise.bodyPart.toLowerCase()).toLowerCase().includes(needle)
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold tracking-tight md:text-2xl">{t('exerciseLibrary')}</h2>
        <Button
          onClick={() => {
            setExerciseToEdit(null);
            setIsDialogOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t('createCustomExercise')}</span>
          <span className="sm:hidden">{t('create')}</span>
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchExercises')}
          aria-label={t('searchExercises')}
          className="h-12 rounded-xl border-transparent bg-muted/50 pl-10 text-base focus-visible:ring-primary"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <ScrollArea className="mb-6 w-full whitespace-nowrap">
          <TabsList className="inline-flex h-12 w-full items-center justify-start gap-2 rounded-none bg-transparent p-1 text-muted-foreground">
            {bodyPartsWithAll.map((part) => (
              <TabsTrigger
                key={part}
                value={part}
                className="rounded-full border-transparent bg-secondary/50 px-5 py-2.5 text-sm font-medium transition-all hover:bg-secondary/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                {t(part.toLowerCase())}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>

        {bodyPartsWithAll.map((part) => (
          <TabsContent key={part} value={part} className="mt-0 outline-none">
            <div className="grid gap-4 pb-10 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {exercises
                .filter((exercise) => activeTab === 'all' || exercise.bodyPart === activeTab)
                .filter(matchesSearch)
                .map((exercise) => {
                  const oneRm = oneRmByExercise.get(exercise.id);
                  return (
                    <Card
                      key={exercise.id}
                      className="glass-effect group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg"
                    >
                      <div className="absolute right-0 top-0 rounded-bl-lg bg-background/80 p-2 opacity-0 backdrop-blur-sm transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setHistoryExercise(exercise)}
                          aria-label={t('viewHistory')}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setExerciseToEdit(exercise);
                            setIsDialogOpen(true);
                          }}
                          aria-label={t('editExercise')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExerciseToDelete(exercise)}
                          aria-label={t('deleteExercise')}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <CardHeader className="flex flex-col items-start justify-between pb-2">
                        <CardTitle className="w-full pr-28 font-headline text-lg">
                          {exercise.emoji} {t(exercise.name)}
                        </CardTitle>
                        <div className="mt-2 flex w-full items-center justify-between gap-2">
                          <Badge className="border-transparent bg-accent/20 capitalize text-accent hover:bg-accent/30">
                            {t(exercise.bodyPart.toLowerCase())}
                          </Badge>
                          {oneRm !== undefined && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="secondary"
                                    className="flex cursor-help items-center gap-1 border-primary/20 bg-primary/10 text-primary"
                                  >
                                    <Dumbbell className="h-3 w-3" />
                                    1RM: {oneRm}
                                    {unit}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-center">
                                  <p className="text-xs">{t('estimated1RMExplanation')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="line-clamp-3 text-sm text-muted-foreground">{t(exercise.description)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <CreateExerciseSheet
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setExerciseToEdit(null);
        }}
        exerciseToEdit={exerciseToEdit}
      />

      <DeleteExerciseDialog
        isOpen={!!exerciseToDelete}
        onClose={() => setExerciseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        exerciseName={exerciseToDelete ? t(exerciseToDelete.name) : ''}
      />

      <ExerciseHistorySheet
        isOpen={historyExercise !== null}
        onClose={() => setHistoryExercise(null)}
        exerciseId={historyExercise?.id ?? null}
        exerciseName={historyExercise ? t(historyExercise.name) : ''}
      />
    </div>
  );
}
