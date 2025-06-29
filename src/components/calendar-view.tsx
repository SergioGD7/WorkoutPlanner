"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import type { DayPickerDayProps } from 'react-day-picker';

import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import type { WorkoutLog, BodyPart } from '@/lib/types';
import { bodyPartColorMap } from '@/lib/style-utils';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type DailyBodyPartsMap = Map<string, BodyPart[]>;

type WorkoutForDay = {
  date: Date;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    totalVolume: number;
  }[];
} | null;

export default function CalendarView() {
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { exercises: allExercises } = useExercises();

  useEffect(() => {
    setIsLoading(true);
    if (user && user.email) {
      try {
        const key = `workout_logs_${user.email}`;
        const storedLogs = localStorage.getItem(key);
        setWorkoutLog(storedLogs ? JSON.parse(storedLogs) : {});
      } catch (error) {
        console.error("Failed to load workout logs from localStorage", error);
        setWorkoutLog({});
      }
    } else {
      setWorkoutLog({});
    }
    setIsLoading(false);
  }, [user]);

  const dailyBodyParts = useMemo((): DailyBodyPartsMap => {
    const map: DailyBodyPartsMap = new Map();
    if (!allExercises.length) return map;

    Object.entries(workoutLog).forEach(([dateStr, workoutExercises]) => {
      const parts = workoutExercises.map(we => {
        const exerciseDetail = allExercises.find(e => e.id === we.exerciseId);
        return exerciseDetail?.bodyPart;
      }).filter((p): p is BodyPart => !!p);
      map.set(dateStr, Array.from(new Set(parts)));
    });

    return map;
  }, [workoutLog, allExercises]);

  const workoutForDay = useMemo((): WorkoutForDay => {
    if (!selectedDate || !allExercises.length) return null;

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const dailyWorkout = workoutLog[dateKey];
    if (!dailyWorkout) return null;

    return {
      date: selectedDate,
      exercises: dailyWorkout.map(we => {
        const exerciseDetail = allExercises.find(e => e.id === we.exerciseId);
        const totalVolume = we.sets.reduce((sum, set) => sum + (set.reps * set.weight), 0);
        return {
          exerciseId: we.id,
          exerciseName: exerciseDetail ? t(exerciseDetail.name) : 'Unknown Exercise',
          totalVolume,
        };
      }),
    };
  }, [selectedDate, workoutLog, allExercises, t]);
  
  const DayContentWithDots = useCallback((props: DayPickerDayProps) => {
    const dayKey = format(props.date, 'yyyy-MM-dd');
    const bodyPartsOnDay = dailyBodyParts.get(dayKey);

    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center">
        <time dateTime={format(props.date, 'yyyy-MM-dd')}>{props.date.getDate()}</time>
        {bodyPartsOnDay && bodyPartsOnDay.length > 0 && (
          <div className="absolute bottom-1.5 flex space-x-1">
            {bodyPartsOnDay.map((part) => (
              <div
                key={part}
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: bodyPartColorMap.get(part) }}
                title={t(part.toLowerCase())}
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [dailyBodyParts, t]);

  const getLocale = () => (language === 'es' ? es : enUS);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-2 sm:p-4 md:p-6">
          {isLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={getLocale()}
              className="p-0"
              classNames={{
                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                month: 'space-y-4 w-full',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex justify-around',
                head_cell: 'w-full rounded-md font-normal text-muted-foreground',
                row: 'flex w-full mt-2 justify-around',
                cell: 'h-14 w-full text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
                day: 'h-14 w-full p-0 font-normal aria-selected:opacity-100',
              }}
              components={{
                DayContent: DayContentWithDots,
              }}
            />
          )}
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl">
              {t('workoutDetailsFor', { date: format(selectedDate, 'PPP', { locale: getLocale() }) })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workoutForDay && workoutForDay.exercises.length > 0 ? (
              <ul className="space-y-2">
                {workoutForDay.exercises.map(ex => (
                  <li key={ex.exerciseId} className="flex justify-between items-center rounded-md bg-secondary/70 p-3">
                    <span className="font-medium">{ex.exerciseName}</span>
                    <span className="text-sm text-muted-foreground">{t('totalVolumeLifted', { volume: ex.totalVolume.toLocaleString() })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t('noWorkoutOnThisDay')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
