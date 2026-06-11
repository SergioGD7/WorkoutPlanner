"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import type { WorkoutLog } from '@/lib/types';
import { parseISO, isValid, isToday, isYesterday, differenceInDays } from 'date-fns';
import { Flame, Trophy } from "lucide-react";

interface GamificationBadgesProps {
  workoutLog: WorkoutLog;
}

export default function GamificationBadges({ workoutLog }: GamificationBadgesProps) {
  const { t } = useLanguage();

  const streak = useMemo(() => {
    if (!workoutLog || Object.keys(workoutLog).length === 0) return 0;

    const sortedDates = Object.keys(workoutLog)
      .map(dateStr => parseISO(dateStr))
      .filter(date => isValid(date))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDates.length === 0) return 0;

    let currentStreak = 0;
    const today = new Date();

    // Check if the latest workout was today or yesterday to start counting
    if (isToday(sortedDates[0]) || isYesterday(sortedDates[0])) {
      currentStreak = 1;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const diff = differenceInDays(sortedDates[i], sortedDates[i + 1]);
        if (diff === 1) {
          currentStreak++;
        } else if (diff > 1) {
          break; // Streak broken
        }
      }
    }

    return currentStreak;
  }, [workoutLog]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="glass-effect bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-orange-500/20 p-3 rounded-full">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{t('currentStreak')}</p>
            <h3 className="text-2xl font-bold font-headline">{streak} {t('days')}</h3>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-effect bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-full">
            <Trophy className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">{t('totalWorkouts')}</p>
            <h3 className="text-2xl font-bold font-headline">{Object.keys(workoutLog).length}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
