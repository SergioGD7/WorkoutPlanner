"use client";

import { useMemo } from 'react';
import { differenceInCalendarDays, isValid, parseISO, startOfDay } from 'date-fns';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import type { WorkoutLog } from '@/lib/types';
import { bodyParts } from '@/lib/data';
import { isWorkoutCompleted, resolveBodyPart } from '@/lib/workout-utils';

interface MuscleHeatmapProps {
  workoutLog: WorkoutLog;
}

/** Days of rest before a muscle group is considered fully recovered. */
const FULLY_RECOVERED_DAYS = 4;

type MuscleKey = 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'legs';

interface RecoveryStat {
  percent: number;
  daysAgo: number | null;
}

export default function MuscleHeatmap({ workoutLog }: MuscleHeatmapProps) {
  const { exercises } = useExercises();
  const { t } = useLanguage();

  const muscleRecovery = useMemo(() => {
    const lastTrained = new Map<MuscleKey, number>();
    const today = startOfDay(new Date());

    Object.entries(workoutLog).forEach(([dateKey, dayExercises]) => {
      // Only completed work creates fatigue.
      if (!isWorkoutCompleted(dayExercises)) return;

      const date = parseISO(dateKey);
      if (!isValid(date)) return;

      const daysAgo = Math.max(0, differenceInCalendarDays(today, startOfDay(date)));

      dayExercises.forEach((workoutExercise) => {
        if (!workoutExercise.sets.some((set) => set.completed)) return;

        const bodyPart = resolveBodyPart(workoutExercise, exercises);
        if (!bodyPart) return;

        const key = bodyPart.toLowerCase() as MuscleKey;
        const previous = lastTrained.get(key);
        if (previous === undefined || daysAgo < previous) lastTrained.set(key, daysAgo);
      });
    });

    const stats = {} as Record<MuscleKey, RecoveryStat>;
    bodyParts.forEach((part) => {
      const key = part.toLowerCase() as MuscleKey;
      const daysAgo = lastTrained.get(key);
      stats[key] =
        daysAgo === undefined
          ? { percent: 100, daysAgo: null }
          : { percent: Math.round(Math.min(100, (daysAgo / FULLY_RECOVERED_DAYS) * 100)), daysAgo };
    });

    return stats;
  }, [workoutLog, exercises]);

  const getColor = (percent: number) => {
    if (percent >= 80) return '#22c55e';
    if (percent >= 40) return '#f97316';
    return '#ef4444';
  };

  const describe = (stat: RecoveryStat) =>
    stat.daysAgo === null
      ? t('neverTrained')
      : `${t('recoveredPercent', { percent: stat.percent })} · ${t('lastTrained', { days: stat.daysAgo })}`;

  const renderRegion = (part: MuscleKey, children: React.ReactNode) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-help outline-none transition-opacity hover:opacity-80">{children}</g>
        </TooltipTrigger>
        <TooltipContent side="top" className="border-border bg-background">
          <p className="mb-1 text-center font-semibold capitalize">{t(part)}</p>
          <p className="text-xs text-muted-foreground">{describe(muscleRecovery[part])}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="glass-effect relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-headline text-lg">
          <Activity className="h-5 w-5 text-primary" />
          {t('muscleRecovery')}
        </CardTitle>
        <p className="mt-2 text-xs text-muted-foreground">{t('trackMuscleReadiness')}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-between gap-6 pt-4 md:flex-row">
        <div className="relative mx-auto h-64 w-48 flex-shrink-0">
          <svg viewBox="0 0 100 200" className="h-full w-full drop-shadow-md" role="img" aria-label={t('muscleRecovery')}>
            {renderRegion(
              'back',
              <>
                <path d="M35 45 Q25 60 38 70 Z" fill={getColor(muscleRecovery.back.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <path d="M65 45 Q75 60 62 70 Z" fill={getColor(muscleRecovery.back.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              </>,
            )}

            {renderRegion(
              'shoulders',
              <path
                d="M30 40 Q50 30 70 40 L85 55 L78 65 Q70 50 65 45 Q50 50 35 45 Q30 50 22 65 L15 55 Z"
                fill={getColor(muscleRecovery.shoulders.percent)}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />,
            )}

            {renderRegion(
              'chest',
              <path
                d="M35 45 Q50 50 65 45 L62 70 Q50 75 38 70 Z"
                fill={getColor(muscleRecovery.chest.percent)}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />,
            )}

            {renderRegion(
              'core',
              <path
                d="M38 70 Q50 75 62 70 L58 100 Q50 105 42 100 Z"
                fill={getColor(muscleRecovery.core.percent)}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />,
            )}

            {renderRegion(
              'arms',
              <>
                <path d="M15 55 L22 65 L18 110 L10 105 Z" fill={getColor(muscleRecovery.arms.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <path d="M85 55 L78 65 L82 110 L90 105 Z" fill={getColor(muscleRecovery.arms.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </>,
            )}

            {renderRegion(
              'legs',
              <>
                <path d="M42 100 Q45 103 50 105 L48 180 L35 180 L38 100 Z" fill={getColor(muscleRecovery.legs.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <path d="M58 100 Q55 103 50 105 L52 180 L65 180 L62 100 Z" fill={getColor(muscleRecovery.legs.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </>,
            )}

            <circle cx="50" cy="20" r="12" fill="#333535" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </svg>
        </div>

        <div className="w-full flex-1 space-y-3">
          {bodyParts.map((part) => {
            const key = part.toLowerCase() as MuscleKey;
            const stat = muscleRecovery[key];
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-help items-center justify-between rounded-md p-1 transition-colors hover:bg-secondary/20">
                      <span className="text-sm font-medium capitalize">{t(key)}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${stat.percent}%`, backgroundColor: getColor(stat.percent) }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-muted-foreground">{stat.percent}%</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="border-border bg-background">
                    <p className="text-xs">{describe(stat)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
