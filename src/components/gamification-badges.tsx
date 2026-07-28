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
    <div className="grid grid-cols-2 gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="glass-effect cursor-help border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-red-500/10">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-full bg-orange-500/20 p-3">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('currentStreak')}</p>
                  <h3 className="font-headline text-2xl font-bold">
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

      <Card className="glass-effect border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-full bg-blue-500/20 p-3">
            <Trophy className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('totalWorkouts')}</p>
            <h3 className="font-headline text-2xl font-bold">{totalWorkouts}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
