"use client";

import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import {
  eachDayOfInterval,
  format,
  isThisMonth,
  isThisWeek,
  isThisYear,
  isToday,
  isValid,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  RadialBar,
  RadialBarChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, FileSpreadsheet, Loader2, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConsistencyHeatmap from '@/components/consistency-heatmap';
import ExerciseHistorySheet from '@/components/exercise-history-sheet';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { useToast } from '@/hooks/use-toast';
import { bodyPartColorMap } from '@/lib/style-utils';
import {
  epley1RM,
  fromKg,
  getBalanceStats,
  getStalledExercises,
  isCountedSet,
  resolveBodyPart,
  resolveExerciseName,
  setVolume,
  trimZeros,
} from '@/lib/workout-utils';

const chartConfig = {} satisfies ChartConfig;

const TONNAGE_WEEKS = 12;

export default function ProgressTracker() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('week');
  const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>();
  const [selectedExerciseFor1RM, setSelectedExerciseFor1RM] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(null);

  const { exercises } = useExercises();
  const { t, language } = useLanguage();
  const { settings } = useProfile();
  const { workoutLog, isLoading } = useWorkout();
  const { toast } = useToast();

  const unit = settings.weightUnit;
  const locale = language === 'es' ? es : enUS;
  const weekStartsOn = language === 'es' ? 1 : 0;

  const isInSelectedRange = useMemo(() => {
    return (date: Date) => {
      switch (timeRange) {
        case 'day':
          return isToday(date);
        case 'week':
          return isThisWeek(date, { weekStartsOn });
        case 'month':
          return isThisMonth(date);
        case 'year':
          return isThisYear(date);
        case 'all':
        default:
          return true;
      }
    };
  }, [timeRange, weekStartsOn]);

  /** Volume by muscle group for the selected range. Warm-ups excluded. */
  const volumeByBodyPart = useMemo(() => {
    const data: Record<string, { name: string; volume: number; fill: string }> = {};

    Object.entries(workoutLog).forEach(([dateKey, dayExercises]) => {
      const date = parseISO(dateKey);
      if (!isValid(date) || !isInSelectedRange(date)) return;

      dayExercises.forEach((workoutExercise) => {
        const bodyPart = resolveBodyPart(workoutExercise, exercises);
        if (!bodyPart) return;

        if (!data[bodyPart]) {
          data[bodyPart] = {
            name: t(bodyPart.toLowerCase()),
            volume: 0,
            fill: bodyPartColorMap.get(bodyPart) || 'hsl(var(--chart-6))',
          };
        }

        data[bodyPart].volume += workoutExercise.sets.reduce((total, set) => total + setVolume(set), 0);
      });
    });

    return Object.values(data)
      .map((entry) => ({ ...entry, volume: Math.round(fromKg(entry.volume, unit)) }))
      .filter((entry) => entry.volume > 0)
      .sort((a, b) => b.volume - a.volume);
  }, [workoutLog, isInSelectedRange, exercises, t, unit]);

  const oneRmData = useMemo(() => {
    if (selectedExerciseFor1RM === 'all') return [];

    const data: { date: string; max1RM: number }[] = [];

    Object.entries(workoutLog).forEach(([dateKey, dayExercises]) => {
      const matching = dayExercises.filter((entry) => entry.exerciseId === selectedExerciseFor1RM);
      if (matching.length === 0) return;

      let dailyMax = 0;
      matching.forEach((entry) => {
        entry.sets.forEach((set) => {
          if (!isCountedSet(set)) return;
          dailyMax = Math.max(dailyMax, epley1RM(set.weight, set.reps));
        });
      });

      if (dailyMax > 0) data.push({ date: dateKey, max1RM: Math.round(fromKg(dailyMax, unit)) });
    });

    return data.sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [workoutLog, selectedExerciseFor1RM, unit]);

  /** Working sets per muscle group in the current week. */
  const weeklySets = useMemo(() => {
    const data: Record<string, { name: string; sets: number; fill: string }> = {};

    Object.entries(workoutLog).forEach(([dateKey, dayExercises]) => {
      const date = parseISO(dateKey);
      if (!isValid(date) || !isThisWeek(date, { weekStartsOn })) return;

      dayExercises.forEach((workoutExercise) => {
        const bodyPart = resolveBodyPart(workoutExercise, exercises);
        if (!bodyPart) return;

        if (!data[bodyPart]) {
          data[bodyPart] = {
            name: t(bodyPart.toLowerCase()),
            sets: 0,
            fill: bodyPartColorMap.get(bodyPart) || 'hsl(var(--primary))',
          };
        }

        data[bodyPart].sets += workoutExercise.sets.filter((set) => isCountedSet(set) && set.reps > 0).length;
      });
    });

    return Object.values(data)
      .filter((entry) => entry.sets > 0)
      .sort((a, b) => b.sets - a.sets);
  }, [workoutLog, exercises, weekStartsOn, t]);

  /** Total weight moved per week over the last 12 weeks. */
  const tonnageData = useMemo(() => {
    const buckets = new Map<string, number>();
    const firstWeekStart = startOfWeek(subWeeks(new Date(), TONNAGE_WEEKS - 1), { weekStartsOn });

    for (let i = 0; i < TONNAGE_WEEKS; i += 1) {
      buckets.set(format(subWeeks(startOfWeek(new Date(), { weekStartsOn }), TONNAGE_WEEKS - 1 - i), 'yyyy-MM-dd'), 0);
    }

    Object.entries(workoutLog).forEach(([dateKey, dayExercises]) => {
      const date = parseISO(dateKey);
      if (!isValid(date) || startOfDay(date) < firstWeekStart) return;

      const bucketKey = format(startOfWeek(date, { weekStartsOn }), 'yyyy-MM-dd');
      if (!buckets.has(bucketKey)) return;

      const volume = dayExercises.reduce(
        (total, workoutExercise) =>
          total + workoutExercise.sets.reduce((sum, set) => sum + setVolume(set), 0),
        0,
      );
      buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + volume);
    });

    return Array.from(buckets.entries()).map(([weekStart, volume]) => ({
      week: weekStart,
      tonnage: Math.round(fromKg(volume, unit)),
    }));
  }, [workoutLog, weekStartsOn, unit]);

  const balance = useMemo(
    () => getBalanceStats(workoutLog, exercises, isInSelectedRange),
    [workoutLog, exercises, isInSelectedRange],
  );

  const stalled = useMemo(() => getStalledExercises(workoutLog, exercises), [workoutLog, exercises]);

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'day':
        return t('today');
      case 'week':
        return t('thisWeek');
      case 'month':
        return t('thisMonth');
      case 'year':
        return t('thisYear');
      default:
        return t('allTime');
    }
  };

  const handleExport = async () => {
    if (!exportDateRange?.from || !exportDateRange?.to) return;

    const rows: Record<string, string | number>[] = [];
    const headers = {
      date: t('date'),
      exercise: t('exercise'),
      bodyPart: t('bodyPart'),
      set: t('set'),
      type: t('setType'),
      reps: t('reps'),
      weight: `${t('volume')} (${unit})`,
      weightPerSet: t('weightKg', { unit }),
      duration: t('duration'),
      rpe: t('rpe'),
      completed: t('done'),
    };

    eachDayOfInterval({
      start: startOfDay(exportDateRange.from),
      end: startOfDay(exportDateRange.to),
    }).forEach((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayExercises = workoutLog[dateKey];
      if (!dayExercises) return;

      dayExercises.forEach((workoutExercise) => {
        const bodyPart = resolveBodyPart(workoutExercise, exercises);
        workoutExercise.sets.forEach((set, index) => {
          rows.push({
            [headers.date]: dateKey,
            [headers.exercise]: resolveExerciseName(workoutExercise, exercises, t),
            [headers.bodyPart]: bodyPart ? t(bodyPart.toLowerCase()) : '',
            [headers.set]: index + 1,
            [headers.type]: t(
              set.type === 'warmup'
                ? 'warmup'
                : set.type === 'failure'
                  ? 'failureSet'
                  : set.type === 'dropset'
                    ? 'dropsetSet'
                    : 'normalSet',
            ),
            [headers.reps]: set.reps,
            [headers.weightPerSet]: fromKg(set.weight, unit),
            [headers.weight]: Math.round(fromKg(setVolume(set), unit)),
            [headers.duration]: set.duration ?? '',
            [headers.rpe]: set.rpe ?? '',
            [headers.completed]: set.completed ? 1 : 0,
          });
        });
      });
    });

    if (rows.length === 0) {
      toast({ title: t('error'), description: t('noDataToExport'), variant: 'destructive' });
      return;
    }

    try {
      setIsExporting(true);
      // Loaded on demand: the xlsx bundle is far too heavy to ship on first paint.
      const xlsx = await import('xlsx');
      const worksheet = xlsx.utils.json_to_sheet(rows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, t('workoutLogs'));

      const from = format(exportDateRange.from, 'yyyy-MM-dd');
      const to = format(exportDateRange.to, 'yyyy-MM-dd');
      xlsx.writeFile(workbook, `${t('workoutLogs')}_${from}_${to}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({ title: t('error'), description: t('unknownError'), variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const balanceTotal = balance.push + balance.pull;
  const bodyTotal = balance.upper + balance.lower;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold tracking-tight md:text-2xl">{t('progressTracker')}</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t('exportToExcel')}>
              {isExporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-5 w-5" />
              )}
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
              classNames={{ day_today: 'text-green-600 font-bold' }}
            />
            <div className="p-4 pt-0 text-right">
              <Button
                onClick={handleExport}
                disabled={!exportDateRange?.from || !exportDateRange?.to || isExporting}
              >
                {t('export')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <ConsistencyHeatmap />

      <Card className="glass-effect border-primary/20">
        <CardHeader className="p-4 pb-2 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="font-headline text-xl text-primary sm:text-2xl">
                {t('1rmProgression')}
              </CardTitle>
              <CardDescription>{t('trackYour1RM')}</CardDescription>
            </div>
            <Select value={selectedExerciseFor1RM} onValueChange={setSelectedExerciseFor1RM}>
              <SelectTrigger className="w-full bg-background sm:w-[250px]">
                <SelectValue placeholder={t('selectExercise')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">-- {t('selectExercise')} --</SelectItem>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {t(exercise.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] p-4">
          {selectedExerciseFor1RM === 'all' ? (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <p>{t('selectExerciseToView')}</p>
            </div>
          ) : oneRmData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="88%">
                <LineChart data={oneRmData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => format(parseISO(value), 'MMM d', { locale })}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label) => format(parseISO(String(label)), 'PPP', { locale })}
                  />
                  <Line
                    type="monotone"
                    dataKey="max1RM"
                    name={`1RM (${unit})`}
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#1c1c1c' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-right">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setHistoryExerciseId(selectedExerciseFor1RM)}
                >
                  {t('viewHistory')}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <p>{t('no1RMData')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader className="p-4 pb-2 sm:p-6">
          <CardTitle className="flex items-center gap-2 font-headline text-xl sm:text-2xl">
            <Scale className="h-5 w-5 text-primary" />
            {t('weeklyTonnage')}
          </CardTitle>
          <CardDescription>{t('weeklyTonnageDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tonnageData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="tonnageFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
              <XAxis
                dataKey="week"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => format(parseISO(value), 'd MMM', { locale })}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => format(parseISO(String(label)), 'PPP', { locale })}
                formatter={(value) => [`${Number(value).toLocaleString()} ${unit}`, t('tonnage')]}
              />
              <Area
                type="monotone"
                dataKey="tonnage"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#tonnageFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader className="p-4 pb-2 sm:p-6">
          <CardTitle className="font-headline text-xl text-accent sm:text-2xl">{t('weeklyVolume')}</CardTitle>
          <CardDescription>
            {t('weeklyVolumeDescription', {
              min: settings.weeklySetTargetMin,
              max: settings.weeklySetTargetMax,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] p-4">
          {weeklySets.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklySets}
                margin={{ top: 20, right: 20, left: -20, bottom: 20 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" horizontal vertical={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                {/* The evidence-based 10-20 working sets per muscle per week band. */}
                <ReferenceArea
                  x1={settings.weeklySetTargetMin}
                  x2={settings.weeklySetTargetMax}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.08}
                  strokeOpacity={0}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--secondary)/0.1)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="sets" name={t('sets')} radius={[0, 4, 4, 0]}>
                  {weeklySets.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <p className="text-lg">{t('noSetsThisWeek')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader className="p-4 pb-2 sm:p-6">
          <CardTitle className="font-headline text-xl sm:text-2xl">{t('balance')}</CardTitle>
          <CardDescription>{t('balanceDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {balanceTotal === 0 && bodyTotal === 0 ? (
            <p className="py-6 text-center text-muted-foreground">{t('noBalanceData')}</p>
          ) : (
            <>
              <BalanceBar
                leftLabel={t('push')}
                rightLabel={t('pull')}
                leftValue={balance.push}
                rightValue={balance.pull}
              />
              <BalanceBar
                leftLabel={t('upperBody')}
                rightLabel={t('lowerBody')}
                leftValue={balance.upper}
                rightValue={balance.lower}
              />
            </>
          )}
        </CardContent>
      </Card>

      {stalled.length > 0 && (
        <Card className="glass-effect border-amber-500/20">
          <CardHeader className="p-4 pb-2 sm:p-6">
            <CardTitle className="flex items-center gap-2 font-headline text-xl sm:text-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('stalledExercises')}
            </CardTitle>
            <CardDescription>{t('stalledDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-6">
            {stalled.map((entry) => {
              const definition = exercises.find((exercise) => exercise.id === entry.exerciseId);
              return (
                <button
                  key={entry.exerciseId}
                  type="button"
                  onClick={() => setHistoryExerciseId(entry.exerciseId)}
                  className="flex w-full items-center justify-between rounded-xl bg-secondary/10 p-3 text-left transition-colors hover:bg-secondary/20"
                >
                  <div>
                    <p className="font-semibold">{definition ? t(definition.name) : t('deletedExercise')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('weeksWithoutProgress', { weeks: entry.weeks })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-muted-foreground">
                    {Math.round(fromKg(entry.best1RM, unit))} {unit}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="font-headline text-xl sm:text-2xl">{t('volumeByBodyPart')}</CardTitle>
          <CardDescription>
            {t('totalVolume')} ({getTimeRangeLabel()})
          </CardDescription>
          <div className="pt-4">
            <Tabs defaultValue="week" onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
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
        <CardContent className="h-[50vh] p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : volumeByBodyPart.length > 0 ? (
            <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
              <RadialBarChart
                data={volumeByBodyPart}
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
                    if (!payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-lg">
                        <p className="font-bold" style={{ color: item.fill }}>
                          {item.name}
                        </p>
                        <p>
                          {t('totalVolume')}: {item.volume.toLocaleString()} {unit}
                        </p>
                      </div>
                    );
                  }}
                />
                <RadialBar background dataKey="volume" />
                <Legend
                  iconSize={10}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{
                    paddingTop: '24px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                  }}
                  formatter={(value, entry: any) => (
                    <span className="p-1 align-middle text-xs sm:text-sm">
                      {value} ({entry.payload.volume.toLocaleString()} {unit})
                    </span>
                  )}
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

      <ExerciseHistorySheet
        isOpen={historyExerciseId !== null}
        onClose={() => setHistoryExerciseId(null)}
        exerciseId={historyExerciseId}
        exerciseName={
          exercises.find((exercise) => exercise.id === historyExerciseId)
            ? t(exercises.find((exercise) => exercise.id === historyExerciseId)!.name)
            : ''
        }
      />
    </div>
  );
}

interface BalanceBarProps {
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
}

function BalanceBar({ leftLabel, rightLabel, leftValue, rightValue }: BalanceBarProps) {
  const total = leftValue + rightValue;
  const leftPercent = total > 0 ? (leftValue / total) * 100 : 50;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-semibold">
          {leftLabel} <span className="text-muted-foreground">{trimZeros(leftValue)}</span>
        </span>
        <span className="font-semibold">
          <span className="text-muted-foreground">{trimZeros(rightValue)}</span> {rightLabel}
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="bg-primary transition-all duration-500" style={{ width: `${leftPercent}%` }} />
        <div className="bg-accent transition-all duration-500" style={{ width: `${100 - leftPercent}%` }} />
      </div>
    </div>
  );
}
