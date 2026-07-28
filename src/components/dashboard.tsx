"use client";

import { useState } from 'react';
import { addDays, eachDayOfInterval, format, isSameDay, isToday, startOfWeek, subDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import DailyWorkout from '@/components/daily-workout';
import GamificationBadges from '@/components/gamification-badges';
import MuscleHeatmap from '@/components/muscle-heatmap';
import { useLanguage } from '@/context/language-context';
import { useWorkout } from '@/context/workout-context';
import { isWorkoutCompleted } from '@/lib/workout-utils';

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { language, t } = useLanguage();
  const { workoutLog } = useWorkout();

  const weekStartsOn = language === 'es' ? 1 : 0;
  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const locale = language === 'es' ? es : enUS;

  const handlePrevWeek = () => {
    const newDate = subDays(currentDate, 7);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = addDays(currentDate, 7);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-6">
      <GamificationBadges workoutLog={workoutLog} />

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-headline text-2xl capitalize">
            <span>{format(weekStart, 'MMMM yyyy', { locale })}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevWeek}
                className="rounded-full"
                aria-label={t('previousWeek')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextWeek}
                className="rounded-full"
                aria-label={t('nextWeek')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayExercises = workoutLog[dayKey];
              const hasPlan = Boolean(dayExercises?.length);
              const completed = isWorkoutCompleted(dayExercises);

              return (
                <Button
                  key={day.toISOString()}
                  variant={isSameDay(day, selectedDate) ? 'secondary' : 'ghost'}
                  className={`flex h-auto flex-col gap-1 rounded-full p-2 capitalize transition-all duration-200 ${
                    isToday(day) && !isSameDay(day, selectedDate) ? 'border-2 border-primary/50' : ''
                  }`}
                  onClick={() => setSelectedDate(day)}
                >
                  <span className="text-sm font-medium">{format(day, 'E', { locale })}</span>
                  <span className="text-2xl font-bold">{format(day, 'd')}</span>
                  {/* Solid dot = completed, hollow = planned but not done. */}
                  {hasPlan && (
                    <div
                      className={`mt-1 h-1.5 w-1.5 rounded-full ${
                        completed ? 'bg-primary' : 'border border-primary/70 bg-transparent'
                      }`}
                    />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DailyWorkout date={selectedDate} />

      <Collapsible className="grid grid-cols-1 gap-6">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>{t('muscleRecovery')}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <MuscleHeatmap workoutLog={workoutLog} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
