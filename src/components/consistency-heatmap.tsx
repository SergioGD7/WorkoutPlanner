"use client";

import { useEffect, useMemo, useRef } from 'react';
import { addDays, eachWeekOfInterval, format, isSameMonth, parseISO, startOfWeek, subYears } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/context/language-context';
import { useWorkout } from '@/context/workout-context';
import { countedSets, isWorkoutCompleted } from '@/lib/workout-utils';

/** Set-count buckets → opacity, so heavier days read darker. */
const LEVEL_CLASSES = [
  'bg-muted/40',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
];

function levelForSets(sets: number): number {
  if (sets === 0) return 0;
  if (sets <= 8) return 1;
  if (sets <= 15) return 2;
  if (sets <= 24) return 3;
  return 4;
}

export default function ConsistencyHeatmap() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const { workoutLog } = useWorkout();
  const locale = language === 'es' ? es : enUS;
  const weekStartsOn = language === 'es' ? 1 : 0;

  const { weeks, monthLabels, totalWorkouts } = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(subYears(today, 1), { weekStartsOn });

    const weekStarts = eachWeekOfInterval({ start, end: today }, { weekStartsOn });

    const grid = weekStarts.map((weekStart) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const day = addDays(weekStart, dayIndex);
        const dateKey = format(day, 'yyyy-MM-dd');
        const exercises = workoutLog[dateKey];
        const completed = isWorkoutCompleted(exercises);
        return {
          dateKey,
          day,
          isFuture: day > today,
          sets: completed ? countedSets(exercises ?? []) : 0,
          completed,
        };
      }),
    );

    // One label per month, positioned at the first week that starts in it.
    const labels = weekStarts.map((weekStart, index) => {
      const previous = weekStarts[index - 1];
      if (previous && isSameMonth(previous, weekStart)) return null;
      return format(weekStart, 'MMM', { locale });
    });

    const total = Object.keys(workoutLog).filter((dateKey) => {
      if (!isWorkoutCompleted(workoutLog[dateKey])) return false;
      const parsed = parseISO(dateKey);
      return parsed >= start && parsed <= today;
    }).length;

    return { weeks: grid, monthLabels: labels, totalWorkouts: total };
  }, [workoutLog, weekStartsOn, locale]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [weeks.length]);

  return (
    <Card className="glass-effect">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-headline text-lg">
          <CalendarCheck className="h-5 w-5 text-primary" />
          {t('consistency')}
        </CardTitle>
        <CardDescription>{t('consistencyDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Horizontal scroll keeps a full year readable on a phone. */}
        <div ref={scrollRef} className="overflow-x-auto pb-2">
          <div className="inline-block min-w-full">
            <div className="mb-1 flex gap-[3px] pl-0">
              {monthLabels.map((label, index) => (
                <div key={index} className="relative h-3 w-[11px] shrink-0">
                  {label && (
                    <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] text-muted-foreground">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <TooltipProvider delayDuration={100}>
              <div className="flex gap-[3px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((cell) => {
                      if (cell.isFuture) {
                        return <div key={cell.dateKey} className="h-[11px] w-[11px]" />;
                      }
                      return (
                        <Tooltip key={cell.dateKey}>
                          <TooltipTrigger asChild>
                            <div
                              className={`h-[11px] w-[11px] rounded-[2px] ${LEVEL_CLASSES[levelForSets(cell.sets)]}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs font-semibold">
                              {format(cell.day, 'PPP', { locale })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cell.completed ? `${cell.sets} ${t('sets').toLowerCase()}` : '—'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t('consistencyWorkouts', { count: totalWorkouts })}
          </p>
          <div className="flex items-center gap-1">
            {LEVEL_CLASSES.map((className, index) => (
              <div key={index} className={`h-[10px] w-[10px] rounded-[2px] ${className}`} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
