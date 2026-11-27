"use client";

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { CalendarClock, CheckCircle2, Plus, Target, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import BottomSheet from '@/components/bottom-sheet';
import ExercisePicker from '@/components/exercise-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useExercises } from '@/context/exercise-context';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { evaluateGoal } from '@/lib/progress-insights';
import type { StrengthGoal, StrengthGoalKind } from '@/lib/types';
import { fromKg, toKg, trimZeros } from '@/lib/workout-utils';

const KINDS: StrengthGoalKind[] = ['weight', 'reps', 'oneRm'];

export default function StrengthGoalsCard() {
  const { t, language } = useLanguage();
  const { exercises } = useExercises();
  const { workoutLog } = useWorkout();
  const { settings, updateSettings } = useProfile();
  const unit = settings.weightUnit;
  const locale = language === 'es' ? es : enUS;
  const goals = useMemo(() => settings.strengthGoals ?? [], [settings.strengthGoals]);

  const [isOpen, setIsOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState('');
  const [kind, setKind] = useState<StrengthGoalKind>('weight');
  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');

  const weightExercises = useMemo(
    () => exercises.filter((exercise) => (exercise.tracking ?? 'weight') === 'weight'),
    [exercises],
  );

  const evaluated = useMemo(
    () =>
      goals
        .map((goal) => evaluateGoal(goal, workoutLog))
        .sort((a, b) => Number(a.achieved) - Number(b.achieved) || b.progress - a.progress),
    [goals, workoutLog],
  );

  const exerciseName = (id: string) => {
    const definition = exercises.find((exercise) => exercise.id === id);
    return definition ? t(definition.name) : t('deletedExercise');
  };

  const describe = (goal: StrengthGoal) => {
    const weight = `${trimZeros(fromKg(goal.weight, unit))} ${unit}`;
    if (goal.kind === 'reps') return t('goalRepsAt', { reps: goal.reps ?? 1, weight });
    if (goal.kind === 'oneRm') return t('goalOneRm', { weight });
    return t('goalWeight', { weight });
  };

  const formatCurrent = (goal: StrengthGoal, current: number) =>
    goal.kind === 'reps' ? `${current} / ${goal.reps ?? 1} reps` : `${trimZeros(Math.round(fromKg(current, unit) * 10) / 10)} / ${trimZeros(fromKg(goal.weight, unit))} ${unit}`;

  const weightValue = Number(weightText.replace(',', '.'));
  const repsValue = Number(repsText);
  const canSave = Boolean(exerciseId) && weightValue > 0 && (kind !== 'reps' || repsValue > 0);

  const save = async () => {
    if (!canSave) return;
    const goal: StrengthGoal = {
      id: uuidv4(),
      exerciseId,
      kind,
      weight: toKg(weightValue, unit),
      ...(kind === 'reps' ? { reps: Math.round(repsValue) } : {}),
      createdAt: new Date().toISOString(),
    };
    await updateSettings({ strengthGoals: [...goals, goal] });
    setIsOpen(false);
    setExerciseId('');
    setWeightText('');
    setRepsText('');
  };

  const remove = (id: string) => updateSettings({ strengthGoals: goals.filter((goal) => goal.id !== id) });

  return (
    <>
      <Card className="glass-effect border-primary/20">
        <CardHeader className="flex flex-row items-start justify-between gap-2 p-4 pb-2 sm:p-6">
          <div>
            <CardTitle className="flex items-center gap-2 font-headline text-xl text-primary sm:text-2xl">
              <Target className="h-5 w-5" />
              {t('strengthGoals')}
            </CardTitle>
            <CardDescription>{t('strengthGoalsDescription')}</CardDescription>
          </div>
          <Button size="icon" variant="outline" className="shrink-0 rounded-full" onClick={() => setIsOpen(true)} aria-label={t('addGoal')}>
            <Plus className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-2 sm:p-6 sm:pt-2">
          {evaluated.length === 0 ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground hover:bg-secondary/20"
            >
              {t('noGoalsYet')}
            </button>
          ) : (
            evaluated.map(({ goal, current, progress, achieved, achievedOn, estimatedDate }) => (
              <div key={goal.id} className="rounded-xl border border-border/60 bg-secondary/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{exerciseName(goal.exerciseId)}</p>
                    <p className="text-xs text-muted-foreground">{describe(goal)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(goal.id)} aria-label={t('delete')}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
                <Progress value={progress * 100} className="mt-2 h-2" />
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                  <span className="font-mono text-muted-foreground">{formatCurrent(goal, current)}</span>
                  {achieved ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {achievedOn
                        ? t('goalAchievedOn', { date: format(parseISO(achievedOn), 'd MMM yyyy', { locale }) })
                        : t('goalAchieved')}
                    </span>
                  ) : estimatedDate ? (
                    <span className="flex items-center gap-1 text-primary">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {t('goalEta', { date: format(parseISO(estimatedDate), 'd MMM yyyy', { locale }) })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t('goalNoTrend')}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('addGoal')}
        heightClass="h-[75vh]"
        footer={
          <Button className="w-full rounded-full" disabled={!canSave} onClick={save}>
            {t('save')}
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>{t('exercise')}</Label>
            <ExercisePicker exercises={weightExercises} value={exerciseId} onChange={setExerciseId} placeholder={t('selectExercise')} />
          </div>
          <div className="space-y-2">
            <Label>{t('goalType')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                    kind === option ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground'
                  }`}
                >
                  {t(`goalKind_${option}`)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t(`goalKindHint_${kind}`)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-weight">{`${t(kind === 'oneRm' ? 'estimated1RM' : 'weight')} (${unit})`}</Label>
              <Input id="goal-weight" inputMode="decimal" value={weightText} onChange={(event) => setWeightText(event.target.value)} />
            </div>
            {kind === 'reps' && (
              <div className="space-y-2">
                <Label htmlFor="goal-reps">{t('reps')}</Label>
                <Input id="goal-reps" inputMode="numeric" value={repsText} onChange={(event) => setRepsText(event.target.value)} />
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
