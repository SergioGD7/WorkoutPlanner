"use client";

import { useEffect, useMemo, useRef } from 'react';
import { Flame, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/context/language-context';
import type { WorkoutLog } from '@/lib/types';
import { calculateStreak, totalCompletedWorkouts } from '@/lib/workout-utils';

interface GamificationBadgesProps {
  workoutLog: WorkoutLog;
}

/** Highest streak already celebrated, so we don't re-fire on every mount. */
const CELEBRATED_KEY = 'workoutPlanner.celebratedStreak';

export default function GamificationBadges({ workoutLog }: GamificationBadgesProps) {
  const { t } = useLanguage();

  // Both numbers count only days with at least one *completed* set: merely
  // planning a workout no longer inflates the streak or the total.
  const streak = useMemo(() => calculateStreak(workoutLog), [workoutLog]);
  const totalWorkouts = useMemo(() => totalCompletedWorkouts(workoutLog), [workoutLog]);

  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (streak === 0) return;

    const stored = Number(window.localStorage.getItem(CELEBRATED_KEY) ?? 0);

    // First render of a session just records where we are; a streak that grows
    // afterwards (or beats the best ever celebrated) earns the confetti.
    if (streak > stored) {
      if (hasCheckedRef.current || stored > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#a855f7'],
        });
      }
      window.localStorage.setItem(CELEBRATED_KEY, String(streak));
    } else if (streak < stored) {
      // Streak broken: reset so the next comeback is celebrated again.
      window.localStorage.setItem(CELEBRATED_KEY, String(streak));
    }

    hasCheckedRef.current = true;
  }, [streak]);

  return (
    <div className="grid grid-cols-2 items-stretch gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="glass-effect h-full cursor-help border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-red-500/10">
              <CardContent className="flex h-full items-center gap-3 p-4">
                <div className="shrink-0 rounded-full bg-orange-500/20 p-3">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div className="min-w-0">
                  {/* Two lines are reserved so both cards' values sit on the same
                      baseline even when one label wraps and the other doesn't. */}
                  <p className="flex min-h-[2.25rem] items-center text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
                    {t('currentStreak')}
                  </p>
                  <h3 className="font-headline text-2xl font-bold leading-none">
                    {streak} {t('days')}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px] text-center">
            <p className="text-xs">{t('streakExplanation')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Card className="glass-effect h-full border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
        <CardContent className="flex h-full items-center gap-3 p-4">
          <div className="shrink-0 rounded-full bg-blue-500/20 p-3">
            <Trophy className="h-6 w-6 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="flex min-h-[2.25rem] items-center text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
              {t('totalWorkouts')}
            </p>
            <h3 className="font-headline text-2xl font-bold leading-none">{totalWorkouts}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
