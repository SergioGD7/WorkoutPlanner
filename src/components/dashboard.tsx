"use client";

import { useState, useEffect } from "react";
import { format, addDays, subDays, isSameDay, isToday, startOfWeek, eachDayOfInterval } from "date-fns";
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Button } from "@/components/ui/button";
import DailyWorkout from "@/components/daily-workout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WorkoutLog } from '@/lib/types';

import GamificationBadges from "./gamification-badges";
import MuscleHeatmap from "./muscle-heatmap";

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const weekStartsOn = language === 'es' ? 1 : 0; // Monday for ES, Sunday for EN
  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  
  const getLocale = () => language === 'es' ? es : enUS;

  useEffect(() => {
    if (user) {
        const docRef = doc(db, `users/${user.uid}/workout_logs/all`);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setWorkoutLog(docSnap.data() as WorkoutLog);
            } else {
                setWorkoutLog({});
            }
        });
        return () => unsubscribe();
    }
  }, [user]);

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
            <span>{format(weekStart, 'MMMM yyyy', { locale: getLocale() })}</span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevWeek} className="rounded-full">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextWeek} className="rounded-full">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const hasWorkout = !!workoutLog[dayKey];
                return (
                    <Button 
                        key={day.toString()}
                        variant={isSameDay(day, selectedDate) ? 'secondary' : 'ghost'}
                        className={`flex h-auto flex-col gap-1 p-2 rounded-full transition-all duration-200 capitalize ${isToday(day) && !isSameDay(day, selectedDate) ? 'border-2 border-primary/50' : ''}`}
                        onClick={() => setSelectedDate(day)}
                    >
                        <span className="text-sm font-medium">{format(day, 'E', { locale: getLocale() })}</span>
                        <span className="text-2xl font-bold">{format(day, 'd')}</span>
                        {hasWorkout && <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1" />}
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
            <span>{t('muscleHeatmap') || 'Muscle Heatmap'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
            <MuscleHeatmap workoutLog={workoutLog} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
