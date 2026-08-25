"use client";

import { useCallback, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Reorder, useDragControls } from 'framer-motion';
import { Copy, CopyCheck, FileText, Loader2, Plus, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toBlob } from 'html-to-image';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import WorkoutCard from '@/components/workout-card';
import AddExerciseSheet from '@/components/add-exercise-sheet';
import LoadTemplateSheet from '@/components/load-template-sheet';
import ShareWorkoutTicket from '@/components/share-workout-ticket';
import PlateCalculator from '@/components/plate-calculator';
import ExerciseHistorySheet from '@/components/exercise-history-sheet';
import { useExercises } from '@/context/exercise-context';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/context/auth-context';
import { useWorkout } from '@/context/workout-context';
import { useProfile } from '@/context/profile-context';
import { useRestTimer } from '@/context/rest-timer-context';
import { useToast } from '@/hooks/use-toast';
import { triggerHaptic } from '@/utils/haptics';
import type {
  ProgressionConfig,
  Set as WorkoutSet,
  TemplateExercise,
  WorkoutExercise,
} from '@/lib/types';
import type { ProgressionSuggestion } from '@/lib/progression';
import { DEFAULT_PROGRESSION, resolveProgression, suggestNextTarget } from '@/lib/progression';
import {
  detectPR,
  fromKg,
  getExercisePR,
  getExerciseSessions,
  getLastSession,
  isCountedSet,
  resolveBodyPart,
  resolveExerciseName,
  resolvePerSide,
  resolveTracking,
  trimZeros,
  type ExerciseSession,
} from '@/lib/workout-utils';

interface DailyWorkoutProps {
  date: Date;
}

export default function DailyWorkout({ date }: DailyWorkoutProps) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false);
  const [exerciseToConfirmDelete, setExerciseToConfirmDelete] = useState<WorkoutExercise | null>(null);
  const [showPasteConfirm, setShowPasteConfirm] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [plateTarget, setPlateTarget] = useState<number | null>(null);
  const [ticketSize, setTicketSize] = useState({ width: 1080, height: 1920 });
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const { exercises: allExercises } = useExercises();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useProfile();
  const { start: startRest } = useRestTimer();
  const { workoutLog, isLoading, saveDay, copiedWorkout, setCopiedWorkout } = useWorkout();

  const unit = settings.weightUnit;
  const formattedDate = format(date, 'yyyy-MM-dd');
  const dailyExercises = useMemo(() => workoutLog[formattedDate] ?? [], [workoutLog, formattedDate]);

  const locale = language === 'es' ? es : enUS;
  const getFormattedDate = useCallback(() => {
    const formatted = format(date, 'EEEE, d', { locale });
    // date-fns lowercases Spanish weekdays; only the first letter needs raising.
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [date, locale]);

  /** Best ever per exercise, excluding today, so today's sets can beat it. */
  const prMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getExercisePR>>();
    dailyExercises.forEach((workoutExercise) => {
      if (!map.has(workoutExercise.exerciseId)) {
        map.set(workoutExercise.exerciseId, getExercisePR(workoutLog, workoutExercise.exerciseId, formattedDate));
      }
    });
    return map;
  }, [dailyExercises, workoutLog, formattedDate]);

  /** Full history per exercise: the progression rules read more than one session. */
  const historyMap = useMemo(() => {
    const map = new Map<string, ExerciseSession[]>();
    dailyExercises.forEach((workoutExercise) => {
      if (!map.has(workoutExercise.exerciseId)) {
        map.set(
          workoutExercise.exerciseId,
          getExerciseSessions(workoutLog, workoutExercise.exerciseId).filter(
            (session) => session.date < formattedDate,
          ),
        );
      }
    });
    return map;
  }, [dailyExercises, workoutLog, formattedDate]);

  const lastSessionMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getLastSession>>();
    dailyExercises.forEach((workoutExercise) => {
      if (!map.has(workoutExercise.exerciseId)) {
        map.set(workoutExercise.exerciseId, getLastSession(workoutLog, workoutExercise.exerciseId, formattedDate));
      }
    });
    return map;
  }, [dailyExercises, workoutLog, formattedDate]);

  const persist = useCallback(
    (exercises: WorkoutExercise[], immediate = false) => saveDay(formattedDate, exercises, immediate),
    [saveDay, formattedDate],
  );

  const updateExerciseAt = useCallback(
    (workoutExerciseId: string, updater: (exercise: WorkoutExercise) => WorkoutExercise, immediate = false) => {
      persist(
        dailyExercises.map((exercise) => (exercise.id === workoutExerciseId ? updater(exercise) : exercise)),
        immediate,
      );
    },
    [dailyExercises, persist],
  );

  /**
   * Builds a set list pre-filled from the last session for this exercise, which
   * is what you almost always want to repeat or beat.
   */
  const buildSets = useCallback(
    (exerciseId: string, count: number, reps?: number, weightKg?: number): WorkoutSet[] => {
      const last = getLastSession(workoutLog, exerciseId, formattedDate);
      const reference = (last?.sets ?? []).filter(isCountedSet);

      return Array.from({ length: Math.max(1, count) }, (_, index) => {
        const source = reference[index] ?? reference[reference.length - 1];
        const set: WorkoutSet = {
          reps: reps ?? source?.reps ?? 10,
          weight: weightKg ?? source?.weight ?? 0,
          completed: false,
          type: 'normal',
        };
        if (source?.duration) set.duration = source.duration;
        return set;
      });
    },
    [workoutLog, formattedDate],
  );

  const handleSetToggle = (workoutExerciseId: string, setIndex: number, completed: boolean) => {
    const target = dailyExercises.find((exercise) => exercise.id === workoutExerciseId);
    if (!target) return;

    const updatedSet: WorkoutSet = { ...target.sets[setIndex], completed };

    updateExerciseAt(
      workoutExerciseId,
      (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set, index) => (index === setIndex ? updatedSet : set)),
      }),
      true,
    );

    if (!completed) return;

    const exerciseName = resolveExerciseName(target, allExercises, t);
    if (settings.restTimerEnabled) {
      startRest(target.restSeconds ?? settings.defaultRestSeconds, exerciseName);
    }

    const pr = prMap.get(target.exerciseId);
    if (pr && detectPR(updatedSet, pr)) {
      triggerHaptic('success');
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fbbf24', '#a855f7'],
      });
      toast({
        title: t('newPR'),
        description: t('newPRDescription', {
          exercise: exerciseName,
          weight: `${trimZeros(fromKg(updatedSet.weight, unit))} ${unit} × ${updatedSet.reps}`,
        }),
      });
    }
  };

  const handleSetUpdate = (workoutExerciseId: string, setIndex: number, patch: Partial<WorkoutSet>) => {
    updateExerciseAt(workoutExerciseId, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) => (index === setIndex ? { ...set, ...patch } : set)),
    }));
  };

  const handleAddSet = (workoutExerciseId: string) => {
    updateExerciseAt(
      workoutExerciseId,
      (exercise) => {
        const last = exercise.sets[exercise.sets.length - 1];
        const newSet: WorkoutSet = last
          ? { ...last, completed: false, rpe: undefined }
          : { reps: 10, weight: 0, completed: false, type: 'normal' };
        return { ...exercise, sets: [...exercise.sets, newSet] };
      },
      true,
    );
  };

  const handleRemoveSet = (workoutExerciseId: string, setIndex: number) => {
    updateExerciseAt(
      workoutExerciseId,
      (exercise) => ({ ...exercise, sets: exercise.sets.filter((_, index) => index !== setIndex) }),
      true,
    );
  };

  const handleNotesChange = (workoutExerciseId: string, notes: string) => {
    updateExerciseAt(workoutExerciseId, (exercise) => ({
      ...exercise,
      notes: notes.trim() === '' ? undefined : notes,
    }));
  };

  const handleApplySuggestion = (workoutExerciseId: string, suggestion: ProgressionSuggestion) => {
    triggerHaptic('light');
    updateExerciseAt(
      workoutExerciseId,
      (exercise) => ({
        ...exercise,
        // Only sets still to be done: a completed set is a record of what
        // happened and must not be rewritten by a target.
        sets: exercise.sets.map((set) => {
          if (!isCountedSet(set) || set.completed) return set;
          return {
            ...set,
            ...(suggestion.weight !== null ? { weight: suggestion.weight } : {}),
            ...(suggestion.reps !== undefined ? { reps: suggestion.reps } : {}),
            ...(suggestion.duration !== undefined ? { duration: suggestion.duration } : {}),
          };
        }),
      }),
      true,
    );
  };

  const handleAddExercise = (exerciseId: string) => {
    if (dailyExercises.some((exercise) => exercise.exerciseId === exerciseId)) {
      toast({ title: t('error'), description: t('exerciseAlreadyAdded'), variant: 'destructive' });
      return;
    }

    const definition = allExercises.find((exercise) => exercise.id === exerciseId);
    const newExercise: WorkoutExercise = {
      id: uuidv4(),
      exerciseId,
      // Snapshot so history survives the definition being deleted later.
      exerciseName: definition ? t(definition.name) : undefined,
      bodyPart: definition?.bodyPart,
      sets: buildSets(exerciseId, 3),
    };

    persist([...dailyExercises, newExercise], true);
    setIsAddSheetOpen(false);
  };

  const handleLoadTemplate = (
    templateExercises: TemplateExercise[],
    routineProgression?: ProgressionConfig,
  ) => {
    const existingIds = dailyExercises.map((exercise) => exercise.exerciseId);
    const toAdd = templateExercises.filter((entry) => !existingIds.includes(entry.exerciseId));

    if (toAdd.length > 0) {
      const newExercises: WorkoutExercise[] = toAdd.map((entry) => {
        const definition = allExercises.find((exercise) => exercise.id === entry.exerciseId);
        return {
          id: uuidv4(),
          exerciseId: entry.exerciseId,
          exerciseName: definition ? t(definition.name) : undefined,
          bodyPart: definition?.bodyPart,
          restSeconds: entry.restSeconds,
          progression: entry.progression ?? routineProgression,
          sets: buildSets(entry.exerciseId, entry.sets, entry.reps || undefined, entry.weight),
        };
      });
      persist([...dailyExercises, ...newExercises], true);
    }

    setIsTemplateSheetOpen(false);
  };

  const handleDeleteWorkoutExercise = () => {
    if (!exerciseToConfirmDelete) return;
    persist(
      dailyExercises.filter((exercise) => exercise.id !== exerciseToConfirmDelete.id),
      true,
    );
    setExerciseToConfirmDelete(null);
  };

  const handleCopyDay = () => {
    triggerHaptic('light');
    setCopiedWorkout(
      dailyExercises.map((exercise) => ({
        ...exercise,
        id: uuidv4(),
        sets: exercise.sets.map((set) => ({ ...set, completed: false })),
      })),
    );
    toast({ title: t('workoutCopied'), description: t('workoutCopiedDescription') });
  };

  const handlePasteDay = () => {
    if (dailyExercises.length > 0) setShowPasteConfirm(true);
    else executePaste();
  };

  const executePaste = () => {
    if (!copiedWorkout) return;
    // Fresh ids: pasting the same day twice must not collide.
    persist(
      copiedWorkout.map((exercise) => ({ ...exercise, id: uuidv4() })),
      true,
    );
    setShowPasteConfirm(false);
  };

  const handleShare = async () => {
    if (!ticketRef.current || dailyExercises.length === 0) {
      toast({ title: t('error'), description: t('nothingToShare'), variant: 'destructive' });
      return;
    }

    try {
      setIsSharing(true);

      // Match the device viewport so the image looks like a screenshot of the
      // phone rather than a fixed 9:16 frame with letterboxing.
      const width = Math.round(window.innerWidth);
      const height = Math.round(window.innerHeight);
      setTicketSize({ width, height });

      // Let the resized ticket lay out before rasterising it.
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 80)));

      const blob = await toBlob(ticketRef.current, {
        quality: 0.95,
        cacheBust: true,
        // Render at the screen's real pixel density.
        pixelRatio: Math.min(window.devicePixelRatio || 1, 3),
        skipFonts: true,
        fontEmbedCSS: '',
        width,
        height,
      });

      if (!blob) throw new Error('Failed to generate image');

      const file = new File([blob], `workout-${formattedDate}.png`, { type: 'image/png' });
      const text = t('shareMessage', { date: getFormattedDate(), count: dailyExercises.length });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: t('myWorkout'), text, files: [file] });
        toast({ title: t('shared'), description: t('sharedDescription') });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `workout-${formattedDate}.png`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast({ title: t('imageDownloaded'), description: t('imageDownloadedDescription') });
      }
    } catch (error: any) {
      // Dismissing the native share sheet throws AbortError; that isn't a failure.
      if (error?.name !== 'AbortError') {
        console.error('Error sharing workout:', error);
        toast({ title: t('shareError'), description: t('shareErrorDescription'), variant: 'destructive' });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const historyExerciseName = useMemo(() => {
    if (!historyExerciseId) return '';
    const definition = allExercises.find((exercise) => exercise.id === historyExerciseId);
    if (definition) return t(definition.name);
    const logged = dailyExercises.find((exercise) => exercise.exerciseId === historyExerciseId);
    return logged?.exerciseName ?? t('deletedExercise');
  }, [historyExerciseId, allExercises, dailyExercises, t]);

  return (
    <>
      <Card className="border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-2 sm:px-6">
          {/* On a phone there is only room for the date itself next to the
              actions; the full phrase would truncate to "Entrenamiento pa...". */}
          <CardTitle className="min-w-0 truncate font-headline text-lg capitalize sm:text-xl md:text-2xl">
            <span className="sm:hidden">{getFormattedDate()}</span>
            <span className="hidden sm:inline">
              {t('workoutFor', { date: getFormattedDate() })}
            </span>
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            {dailyExercises.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyDay}
                aria-label={t('copyDay')}
                className="rounded-full"
              >
                <Copy className="h-5 w-5" />
              </Button>
            )}
            {copiedWorkout && (
              <Button
                variant="outline"
                size="icon"
                onClick={handlePasteDay}
                aria-label={t('pasteDay')}
                className="rounded-full"
              >
                <CopyCheck className="h-5 w-5" />
              </Button>
            )}
            {dailyExercises.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                disabled={isSharing}
                aria-label={t('shareWorkout')}
                className="rounded-full"
              >
                {isSharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsTemplateSheetOpen(true)}
              aria-label={t('loadTemplate')}
              className="rounded-full border-primary/20 bg-primary/5 text-primary shadow-sm"
            >
              <FileText className="h-5 w-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={() => setIsAddSheetOpen(true)}
              aria-label={t('addExercise')}
              className="rounded-full shadow-md"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-2 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : dailyExercises.length > 0 ? (
            <Reorder.Group
              axis="y"
              values={dailyExercises}
              onReorder={(reordered) => persist(reordered, true)}
              className="space-y-4"
            >
              {dailyExercises.map((workoutExercise) => (
                <ReorderableExercise
                  key={workoutExercise.id}
                  workoutExercise={workoutExercise}
                  exerciseName={resolveExerciseName(workoutExercise, allExercises, t)}
                  bodyPart={resolveBodyPart(workoutExercise, allExercises)}
                  emoji={allExercises.find((exercise) => exercise.id === workoutExercise.exerciseId)?.emoji}
                  illustration={
                    allExercises.find((exercise) => exercise.id === workoutExercise.exerciseId)?.illustration
                  }
                  tracking={resolveTracking(workoutExercise, allExercises)}
                  perSide={resolvePerSide(workoutExercise, allExercises)}
                  unit={unit}
                  pr={prMap.get(workoutExercise.exerciseId) ?? {
                    maxWeight: 0,
                    maxWeightReps: 0,
                    best1RM: 0,
                    date: null,
                  }}
                  lastSession={lastSessionMap.get(workoutExercise.exerciseId) ?? null}
                  history={historyMap.get(workoutExercise.exerciseId) ?? []}
                  isOrphaned={!allExercises.some((exercise) => exercise.id === workoutExercise.exerciseId)}
                  onSetToggle={(setIndex, completed) =>
                    handleSetToggle(workoutExercise.id, setIndex, completed)
                  }
                  onSetUpdate={(setIndex, patch) => handleSetUpdate(workoutExercise.id, setIndex, patch)}
                  onAddSet={() => handleAddSet(workoutExercise.id)}
                  onRemoveSet={(setIndex) => handleRemoveSet(workoutExercise.id, setIndex)}
                  onNotesChange={(notes) => handleNotesChange(workoutExercise.id, notes)}
                  onApplySuggestion={(suggestion) =>
                    handleApplySuggestion(workoutExercise.id, suggestion)
                  }
                  onOpenHistory={() => setHistoryExerciseId(workoutExercise.exerciseId)}
                  onOpenPlates={(weightKg) => setPlateTarget(weightKg)}
                  onDelete={() => setExerciseToConfirmDelete(workoutExercise)}
                />
              ))}
            </Reorder.Group>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-secondary/10 px-4 py-12 text-center">
              <p className="mb-1 text-lg font-medium text-foreground">{t('noWorkoutPlanned')}</p>
              <p className="mb-4 text-muted-foreground">{t('enjoyRestDay')}</p>
              <Button onClick={() => setIsAddSheetOpen(true)} className="rounded-full">
                <Plus className="mr-2 h-4 w-4" />
                {t('startTraining')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddExerciseSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onAddExercise={handleAddExercise}
        existingExerciseIds={dailyExercises.map((exercise) => exercise.exerciseId)}
      />

      <LoadTemplateSheet
        isOpen={isTemplateSheetOpen}
        onClose={() => setIsTemplateSheetOpen(false)}
        onLoadTemplate={handleLoadTemplate}
      />

      <PlateCalculator
        isOpen={plateTarget !== null}
        onClose={() => setPlateTarget(null)}
        initialWeightKg={plateTarget ?? 0}
      />

      <ExerciseHistorySheet
        isOpen={historyExerciseId !== null}
        onClose={() => setHistoryExerciseId(null)}
        exerciseId={historyExerciseId}
        exerciseName={historyExerciseName}
      />

      <AlertDialog
        open={!!exerciseToConfirmDelete}
        onOpenChange={(open) => !open && setExerciseToConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteExercise')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteWorkoutExerciseConfirmation', {
                exerciseName: exerciseToConfirmDelete
                  ? resolveExerciseName(exerciseToConfirmDelete, allExercises, t)
                  : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExerciseToConfirmDelete(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkoutExercise}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPasteConfirm} onOpenChange={setShowPasteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pasteWorkout')}</AlertDialogTitle>
            <AlertDialogDescription>{t('pasteWorkoutConfirmation')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPasteConfirm(false)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={executePaste}>{t('pasteAndReplace')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareWorkoutTicket
        ref={ticketRef}
        dateStr={getFormattedDate()}
        userName={user?.displayName || user?.email?.split('@')[0] || t('athlete')}
        dailyExercises={dailyExercises}
        exercises={allExercises}
        unit={unit}
        width={ticketSize.width}
        height={ticketSize.height}
      />
    </>
  );
}

type ReorderableExerciseProps = Omit<
  React.ComponentProps<typeof WorkoutCard>,
  'suggestion' | 'bodyPartLabel' | 'onApplySuggestion' | 'onDragHandlePointerDown'
> & {
  bodyPart?: string;
  /** Every session of this exercise, newest first: the rules read history. */
  history: ExerciseSession[];
  onApplySuggestion: (suggestion: ProgressionSuggestion) => void;
};

/**
 * Reorder handling lives here so the card itself stays presentational. Dragging
 * is limited to the grip handle, otherwise it would fight the swipe-to-delete
 * gesture on the set rows.
 */
function ReorderableExercise({
  bodyPart,
  history,
  onApplySuggestion,
  ...cardProps
}: ReorderableExerciseProps) {
  const { t } = useLanguage();
  const { settings } = useProfile();
  const dragControls = useDragControls();

  // A template stamps its rule onto each exercise as it is loaded, so there is
  // only one field to consult here.
  const config = resolveProgression(
    cardProps.workoutExercise.progression,
    undefined,
    settings.defaultProgression ?? DEFAULT_PROGRESSION,
    cardProps.tracking,
  );
  const suggestion = suggestNextTarget(history, config, settings.weightUnit, cardProps.tracking);

  return (
    <Reorder.Item
      value={cardProps.workoutExercise}
      dragListener={false}
      dragControls={dragControls}
      className="list-none"
    >
      <WorkoutCard
        {...cardProps}
        bodyPartLabel={bodyPart ? t(bodyPart.toLowerCase()) : undefined}
        suggestion={suggestion}
        onApplySuggestion={() => suggestion && onApplySuggestion(suggestion)}
        onDragHandlePointerDown={(event) => dragControls.start(event)}
      />
    </Reorder.Item>
  );
}
