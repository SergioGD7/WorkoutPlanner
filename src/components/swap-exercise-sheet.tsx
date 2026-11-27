"use client";

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import BottomSheet from '@/components/bottom-sheet';
import ExerciseIllustration from '@/components/exercise-illustration';
import { Input } from '@/components/ui/input';
import { useExercises } from '@/context/exercise-context';
import { useLanguage } from '@/context/language-context';
import { useWorkout } from '@/context/workout-context';
import { swapCandidates } from '@/lib/session';
import type { WorkoutExercise } from '@/lib/types';

interface SwapExerciseSheetProps {
  target: WorkoutExercise | null;
  targetName: string;
  /** Exercises already on the day; they can't be picked. */
  excludeIds: string[];
  onClose: () => void;
  onSwap: (exerciseId: string) => void;
}

/**
 * "The machine is taken": alternatives from the same muscle group, the ones
 * you've already done first, so their last numbers prefill the sets.
 */
export default function SwapExerciseSheet({ target, targetName, excludeIds, onClose, onSwap }: SwapExerciseSheetProps) {
  const { t } = useLanguage();
  const { exercises } = useExercises();
  const { workoutLog } = useWorkout();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (target) setQuery('');
  }, [target]);

  const candidates = useMemo(() => {
    if (!target) return [];
    const all = swapCandidates(target, exercises, workoutLog, excludeIds, t);
    const q = query.trim().toLowerCase();
    return q ? all.filter(({ exercise }) => t(exercise.name).toLowerCase().includes(q)) : all;
  }, [target, exercises, workoutLog, excludeIds, query, t]);

  const done = candidates.filter((candidate) => candidate.sessions > 0);
  const others = candidates.filter((candidate) => candidate.sessions === 0);

  const renderRow = ({ exercise, sessions }: (typeof candidates)[number]) => (
    <button
      key={exercise.id}
      type="button"
      onClick={() => onSwap(exercise.id)}
      className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-secondary/10 p-3 text-left transition-colors hover:border-border/50 hover:bg-secondary/30 active:bg-secondary/50"
    >
      <ExerciseIllustration exercise={exercise} name={t(exercise.name)} className="bg-background shadow-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{t(exercise.name)}</p>
        <p className="text-xs text-muted-foreground">
          {sessions > 0 ? t('timesDone', { count: sessions }) : t(exercise.bodyPart.toLowerCase())}
        </p>
      </div>
    </button>
  );

  return (
    <BottomSheet isOpen={target !== null} onClose={onClose} title={t('swapExercise')}>
      <p className="mb-3 text-sm text-muted-foreground">{t('swapDescription', { exercise: targetName })}</p>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchExercises')}
          className="h-12 border-transparent bg-secondary/30 pl-9 text-base"
        />
      </div>
      {candidates.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('noExercisesFound')}</p>
      ) : (
        <div className="space-y-5 pb-8">
          {done.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary/80">{t('alreadyDone')}</h3>
              {done.map(renderRow)}
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('otherOptions')}</h3>
              {others.map(renderRow)}
            </section>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
