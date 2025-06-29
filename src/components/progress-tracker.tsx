
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { RadialBarChart, RadialBar, Legend, Tooltip } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isToday, isThisWeek, isThisMonth, isThisYear, parseISO, isValid } from 'date-fns';
import type { WorkoutLog } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from "lucide-react";
import { bodyPartColorMap } from '@/lib/style-utils';

const chartConfig = {} satisfies import("@/components/ui/chart").ChartConfig;

export default function ProgressTracker() {
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('week');
  const { exercises } = useExercises();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    setIsLoading(true);
    if (user && user.email) {
        try {
            const key = `workout_logs_${user.email}`;
            const storedLogs = localStorage.getItem(key);
            if (storedLogs) {
                setWorkoutLog(JSON.parse(storedLogs));
            } else {
                setWorkoutLog({});
            }
        } catch (error) {
            console.error("Failed to load workout logs from localStorage", error);
            setWorkoutLog({});
        }
    } else {
        setWorkoutLog({});
    }
    setIsLoading(false);
  }, [user]);

  const chartData = useMemo(() => {
    const weekStartsOn = language === 'es' ? 1 : 0;
    
    const data: { [bodyPart: string]: { name: string, volume: number, fill: string } } = {};

    Object.entries(workoutLog).forEach(([dateStr, workoutExercises]) => {
      const date = parseISO(dateStr);
      if (!isValid(date)) return;

      let isInRange = false;
      switch (timeRange) {
        case 'day':
          isInRange = isToday(date);
          break;
        case 'week':
          isInRange = isThisWeek(date, { weekStartsOn });
          break;
        case 'month':
          isInRange = isThisMonth(date);
          break;
        case 'year':
          isInRange = isThisYear(date);
          break;
        case 'all':
          isInRange = true;
          break;
      }

      if (isInRange) {
        workoutExercises.forEach(workoutEx => {
          const exerciseDetails = exercises.find(ex => ex.id === workoutEx.exerciseId);
          if (!exerciseDetails) return;

          const bodyPart = exerciseDetails.bodyPart;

          if (!data[bodyPart]) {
            data[bodyPart] = {
              name: t(bodyPart.toLowerCase()),
              volume: 0,
              fill: bodyPartColorMap.get(bodyPart) || "hsl(var(--chart-6))",
            };
          }

          const exerciseVolume = workoutEx.sets
            .reduce((total, set) => total + (set.reps * set.weight), 0);
          
          data[bodyPart].volume += exerciseVolume;
        });
      }
    });

    return Object.values(data).filter(d => d.volume > 0).sort((a, b) => b.volume - a.volume);
  }, [workoutLog, timeRange, exercises, language, t]);
  
  const getTimeRangeLabel = () => {
    switch (timeRange) {
        case 'day': return t('today');
        case 'week': return t('thisWeek');
        case 'month': return t('thisMonth');
        case 'year': return t('thisYear');
        case 'all': return t('allTime');
        default: return '';
    }
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 font-headline">{t('progressTracker')}</h2>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-headline text-xl sm:text-2xl">{t('volumeByBodyPart')}</CardTitle>
          <CardDescription>
            {t('totalVolume')} ({getTimeRangeLabel()})
          </CardDescription>
          <div className="pt-4">
             <Tabs defaultValue="week" onValueChange={(value) => setTimeRange(value as any)} className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:grid-cols-5">
                    <TabsTrigger value="day">{t('today')}</TabsTrigger>
                    <TabsTrigger value="week">{t('thisWeek')}</TabsTrigger>
                    <TabsTrigger value="month">{t('thisMonth')}</TabsTrigger>
                    <TabsTrigger value="year">{t('thisYear')}</TabsTrigger>
                    <TabsTrigger value="all">{t('allTime')}</TabsTrigger>
                </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="relative h-[450px] sm:h-[550px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="absolute inset-0">
              <RadialBarChart 
                data={chartData} 
                innerRadius="20%" 
                outerRadius="80%"
                startAngle={90}
                endAngle={-270}
                cx="50%" 
                cy="50%"
              >
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                        <div className="p-2 bg-background border rounded-lg shadow-lg">
                            <p className="font-bold" style={{color: item.fill}}>{item.name}</p>
                            <p>{t('totalVolume')}: {item.volume.toLocaleString()} kg</p>
                        </div>
                    );
                  }}
                />
                <RadialBar
                  background
                  dataKey="volume"
                />
                <Legend
                  iconSize={10}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    paddingTop: "24px",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: "8px",
                    width: '100%',
                  }}
                  formatter={(value, entry: any) => {
                    const { payload } = entry;
                    return (
                      <span className="p-1 text-xs align-middle">
                        {value} ({payload.volume.toLocaleString()} kg)
                      </span>
                    );
                  }}
                />
              </RadialBarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <p className="text-lg">{t('noWorkoutDataForVolume')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
