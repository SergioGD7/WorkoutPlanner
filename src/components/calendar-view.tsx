"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, parseISO, isValid, addDays, subDays, startOfWeek, endOfWeek, isSameDay, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';

import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import type { WorkoutLog, BodyPart, Set as WorkoutSet } from '@/lib/types';
import { bodyPartColorMap } from '@/lib/style-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from '@/components/ui/button';

type DailyBodyPartsMap = Map<string, BodyPart[]>;

type WorkoutForDay = {
  date: Date;
  exercises: {
    workoutExerciseId: string;
    exerciseId: string;
    exerciseName: string;
    bodyPart?: BodyPart;
    totalVolume: number;
    sets: WorkoutSet[];
  }[];
} | null;

export default function CalendarView() {
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { exercises: allExercises } = useExercises();

  const getLocale = () => (language === 'es' ? es : enUS);

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
          exerciseId: we.exerciseId,
          exerciseName: exerciseDetail ? t(exerciseDetail.name) : 'Unknown Exercise',
          bodyPart: exerciseDetail?.bodyPart,
          totalVolume: totalVolume,
          sets: we.sets,
        };
      }),
    };
  }, [selectedDate, workoutLog, allExercises, t]);

  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const prevWeek = () => setCurrentWeekStart(subDays(currentWeekStart, 7));

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: addDays(currentWeekStart, 6)
  });

  return (
    <div className="space-y-6">
      {/* Horizontal Swipeable Week Calendar */}
      <Card className="glass-effect border-primary/10 overflow-hidden">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevWeek} className="h-8 w-8">
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="font-headline text-lg uppercase tracking-wider">
               {format(currentWeekStart, 'MMMM yyyy', { locale: getLocale() })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={nextWeek} className="h-8 w-8">
                <ChevronRight className="h-5 w-5" />
            </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isLoading ? (
            <div className="flex h-[80px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex justify-between items-center w-full mt-2">
               {weekDays.map((day) => {
                 const isSelected = isSameDay(day, selectedDate);
                 const isTodayDate = isSameDay(day, new Date());
                 const dayKey = format(day, 'yyyy-MM-dd');
                 const bodyPartsOnDay = dailyBodyParts.get(dayKey) || [];

                 return (
                   <button
                     key={day.toISOString()}
                     onClick={() => setSelectedDate(day)}
                     className={`flex flex-col items-center justify-center w-10 h-14 rounded-xl transition-all duration-300 relative ${
                       isSelected ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'hover:bg-muted'
                     }`}
                   >
                      <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                        {format(day, 'EEE', { locale: getLocale() }).substring(0,1)}
                      </span>
                      <span className={`text-base font-bold font-headline ${isTodayDate && !isSelected ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {/* Dots for workouts */}
                      <div className="flex space-x-[2px] mt-1">
                        {bodyPartsOnDay.slice(0, 3).map((part, i) => (
                           <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : bodyPartColorMap.get(part) }} />
                        ))}
                      </div>
                   </button>
                 )
               })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline View */}
      <Card className="glass-effect bg-card/50">
        <CardHeader className="pb-2 border-b border-border/50">
          <CardTitle className="font-headline text-lg text-primary uppercase tracking-wider flex items-center justify-between">
            <span>{t('workoutDetailsFor', { date: format(selectedDate, 'PPP', { locale: getLocale() }) })}</span>
            {workoutForDay?.exercises.length ? (
                <span className="text-xs font-normal text-muted-foreground normal-case">
                   {workoutForDay.exercises.length} {t('exercises')}
                </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {workoutForDay && workoutForDay.exercises.length > 0 ? (
            <div className="relative border-l-2 border-muted/50 ml-3 sm:ml-4 space-y-8 pb-4">
              {workoutForDay.exercises.map((ex, idx) => (
                <div key={ex.workoutExerciseId} className="relative pl-6 sm:pl-8">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
                  
                  {/* Exercise Card */}
                  <div className="bg-surface-variant/30 rounded-xl p-4 shadow-sm border border-border/50">
                     <div className="flex justify-between items-start mb-3">
                        <div>
                           <h4 className="font-headline font-bold text-lg leading-tight">{ex.exerciseName}</h4>
                           <div className="flex items-center gap-2 mt-1.5">
                              {ex.bodyPart && (
                                <Badge variant="outline" className="text-[10px] h-5 border-transparent bg-muted/80 uppercase" style={{ color: bodyPartColorMap.get(ex.bodyPart) }}>
                                    {t(ex.bodyPart.toLowerCase())}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{ex.sets.length} {t('sets')}</span>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{t('volume')}</p>
                           <p className="font-bold text-sm text-primary">{ex.totalVolume.toLocaleString()} kg</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-2 mt-4">
                        {ex.sets.map((set, setIndex) => (
                          <div key={setIndex} className={`flex justify-between items-center rounded-lg px-3 py-2 text-sm ${set.completed ? 'bg-primary/10 border border-primary/20' : 'bg-background/50'}`}>
                            <span className="font-medium text-muted-foreground">{t('set')} {setIndex + 1}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{set.weight}kg <span className="text-muted-foreground font-normal mx-1">×</span> {set.reps}</span>
                                {set.completed ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-1" /> : <Circle className="h-4 w-4 text-muted-foreground/50 ml-1" />}
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
               <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <span className="text-2xl opacity-50">📅</span>
               </div>
               <p className="text-muted-foreground font-medium">{t('noWorkoutOnThisDay')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
