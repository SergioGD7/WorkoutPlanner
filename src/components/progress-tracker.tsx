"use client";

import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { RadialBarChart, RadialBar, Legend, Tooltip } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isToday, isThisWeek, isThisMonth, isThisYear, parseISO, isValid, format, eachDayOfInterval, startOfDay } from 'date-fns';
import type { WorkoutLog } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import { useAuth } from '@/context/auth-context';
import { Loader2, FileSpreadsheet } from "lucide-react";
import { bodyPartColorMap } from '@/lib/style-utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import * as xlsx from 'xlsx';

const chartConfig = {} satisfies import("@/components/ui/chart").ChartConfig;

export default function ProgressTracker() {
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('week');
  const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>();

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

  const handleExport = () => {
    if (!exportDateRange || !exportDateRange.from || !exportDateRange.to) {
        return;
    }

    const exportData: { [key: string]: string | number }[] = [];
    
    const headers = {
        date: t('date'),
        exercise: t('exercise'),
        bodyPart: t('bodyPart'),
        set: t('set'),
        reps: t('reps'),
        weight: t('weightKg'),
        volume: t('totalVolume'),
    };

    const datesInRange = eachDayOfInterval({
        start: startOfDay(exportDateRange.from),
        end: startOfDay(exportDateRange.to),
    });

    datesInRange.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const dailyLog = workoutLog[dateKey];
        if (dailyLog) {
            dailyLog.forEach(workoutExercise => {
                const exerciseDetails = exercises.find(ex => ex.id === workoutExercise.exerciseId);
                if (exerciseDetails) {
                    workoutExercise.sets.forEach((set, index) => {
                        const row: { [key: string]: string | number } = {};
                        row[headers.date] = dateKey;
                        row[headers.exercise] = t(exerciseDetails.name);
                        row[headers.bodyPart] = t(exerciseDetails.bodyPart.toLowerCase());
                        row[headers.set] = index + 1;
                        row[headers.reps] = set.reps;
                        row[headers.weight] = set.weight;
                        row[headers.volume] = set.reps * set.weight;
                        exportData.push(row);
                    });
                }
            });
        }
    });
    
    if (exportData.length === 0) {
        alert(t('noDataToExport'));
        return;
    }

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, t('workoutLogs'));

    const from = format(exportDateRange.from, 'yyyy-MM-dd');
    const to = format(exportDateRange.to, 'yyyy-MM-dd');
    xlsx.writeFile(workbook, `${t('workoutLogs')}_${from}_${to}.xlsx`);
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">{t('progressTracker')}</h2>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                        <FileSpreadsheet className="h-5 w-5" />
                        <span className="sr-only">{t('exportToExcel')}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={new Date()}
                        selected={exportDateRange}
                        onSelect={setExportDateRange}
                        numberOfMonths={1}
                        classNames={{
                          day_today: 'text-green-600 font-bold',
                        }}
                    />
                    <div className="p-4 pt-0 text-right">
                       <Button onClick={handleExport} disabled={!exportDateRange || !exportDateRange.from || !exportDateRange.to}>
                         {t('export')}
                       </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
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
        <CardContent className="p-4 h-[50vh]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
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
                      <span className="p-1 text-xs sm:text-sm align-middle">
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
