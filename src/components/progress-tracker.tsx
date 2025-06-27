
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { RadialBarChart, RadialBar, Legend, Tooltip } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initialWorkoutLog, bodyParts } from '@/lib/data';
import { isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import type { WorkoutLog } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import { useIsMobile } from "@/hooks/use-mobile";

const chartConfig = {} satisfies import("@/components/ui/chart").ChartConfig;

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
];

const bodyPartColorMap = new Map<string, string>();
bodyParts.forEach((part, index) => {
  bodyPartColorMap.set(part, CHART_COLORS[index % CHART_COLORS.length]);
});

export default function ProgressTracker() {
  const [workoutLog] = useState<WorkoutLog>(initialWorkoutLog);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('week');
  const { exercises } = useExercises();
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const chartData = useMemo(() => {
    const weekStartsOn = language === 'es' ? 1 : 0;
    
    const data: { [bodyPart: string]: { name: string, volume: number, fill: string } } = {};

    Object.entries(workoutLog).forEach(([dateStr, workoutExercises]) => {
      const date = new Date(dateStr);
      date.setUTCHours(0,0,0,0);

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
          if (!workoutEx.sets.some(s => s.completed)) return;
          
          const exerciseDetails = exercises.find(ex => ex.id === workoutEx.exerciseId);
          if (!exerciseDetails) return;

          const bodyPart = exerciseDetails.bodyPart;

          if (!data[bodyPart]) {
            data[bodyPart] = {
              name: t(bodyPart.toLowerCase()),
              volume: 0,
              fill: bodyPartColorMap.get(bodyPart) || CHART_COLORS[CHART_COLORS.length - 1],
            };
          }

          const exerciseVolume = workoutEx.sets
            .filter(s => s.completed)
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
      <h2 className="text-3xl font-bold tracking-tight mb-4 font-headline">{t('progressTracker')}</h2>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('volumeByBodyPart')}</CardTitle>
          <CardDescription>
            {t('totalVolume')} ({getTimeRangeLabel()})
          </CardDescription>
          <div className="pt-4">
             <Tabs defaultValue="week" onValueChange={(value) => setTimeRange(value as any)} className="w-full">
                <TabsList>
                    <TabsTrigger value="day">{t('today')}</TabsTrigger>
                    <TabsTrigger value="week">{t('thisWeek')}</TabsTrigger>
                    <TabsTrigger value="month">{t('thisMonth')}</TabsTrigger>
                    <TabsTrigger value="year">{t('thisYear')}</TabsTrigger>
                    <TabsTrigger value="all">{t('allTime')}</TabsTrigger>
                </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] sm:h-[400px] w-full mx-auto">
              <RadialBarChart 
                data={chartData} 
                innerRadius="20%" 
                outerRadius="90%"
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
                  minAngle={15}
                  background
                  clockWise
                  dataKey="volume"
                  nameKey="name"
                />
                <Legend 
                  iconSize={10} 
                  layout={isMobile ? 'vertical' : 'vertical'}
                  verticalAlign={isMobile ? 'bottom' : 'middle'}
                  align={isMobile ? 'center' : 'right'}
                  wrapperStyle={isMobile ? { position: 'relative', marginTop: '1rem' } : {}}
                  formatter={(value, entry: any) => {
                    const { payload } = entry;
                    return (
                      <span className="text-base p-1">
                        {value} ({payload.volume.toLocaleString()} kg)
                      </span>
                    );
                  }}
                />
              </RadialBarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                <p>{t('noCompletedSets')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
