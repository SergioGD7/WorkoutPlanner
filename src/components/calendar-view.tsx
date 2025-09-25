
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import type { DayContentProps } from 'react-day-picker';

import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import type { WorkoutLog, BodyPart, Set as WorkoutSet } from '@/lib/types';
import { bodyPartColorMap } from '@/lib/style-utils';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Check } from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type DailyBodyPartsMap = Map<string, BodyPart[]>;

type WorkoutForDay = {
  date: Date;
  exercises: {
    workoutExerciseId: string;
    exerciseName: string;
    totalVolume: number;
    sets: WorkoutSet[];
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
    if (user) {
        const docRef = doc(db, `users/${user.uid}/workout_logs/all`);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setWorkoutLog(docSnap.data() as WorkoutLog);
            } else {
                setWorkoutLog({});
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Failed to load workout logs from Firestore:", error);
            setWorkoutLog({});
            setIsLoading(false);
        });
        return () => unsubscribe();
    } else {
        setWorkoutLog({});
        setIsLoading(false);
    }
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
          workoutExerciseId: we.id,
          exerciseName: exerciseDetail ? t(exerciseDetail.name) : 'Unknown Exercise',
          totalVolume: totalVolume,
          sets: we.sets,
        };
      }),
    };
  }, [selectedDate, workoutLog, allExercises, t]);
  
  const DayContentWithDots = useCallback((props: DayContentProps) => {
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
              <Accordion type="multiple" className="w-full space-y-2">
                {workoutForDay.exercises.map(ex => (
                  <AccordionItem key={ex.workoutExerciseId} value={ex.workoutExerciseId} className="rounded-md border-none bg-muted">
                    <AccordionTrigger className="flex w-full items-center rounded-md p-3 hover:no-underline">
                        <span className="font-medium text-left">{ex.exerciseName}</span>
                        <span className="ml-auto pr-2 text-sm text-muted-foreground">{t('totalVolumeLifted', { volume: ex.totalVolume.toLocaleString() })}</span>
                    </AccordionTrigger>
                    <AccordionContent className="p-3 pt-0">
                      <ul className="space-y-1 pt-2 text-sm text-muted-foreground">
                        {ex.sets.map((set, index) => (
                          <li key={index} className="flex justify-between items-center rounded-md bg-background/50 px-3 py-1">
                            <span>{t('set')} {index + 1}: {set.reps} {t('reps')} @ {set.weight} kg</span>
                            {set.completed && <Check className="h-4 w-4 text-green-500" />}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-muted-foreground">{t('noWorkoutOnThisDay')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
