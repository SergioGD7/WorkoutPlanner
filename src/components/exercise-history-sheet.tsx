"use client";

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import {
  epley1RM,
  fromKg,
  getExercisePR,
  getExerciseSessions,
  isCountedSet,
  trimZeros,
} from '@/lib/workout-utils';

interface ExerciseHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string | null;
  exerciseName: string;
}

const REP_RANGES: { label: string; min: number; max: number }[] = [
  { label: '1-3', min: 1, max: 3 },
  { label: '4-6', min: 4, max: 6 },
  { label: '7-10', min: 7, max: 10 },
  { label: '11-15', min: 11, max: 15 },
  { label: '16+', min: 16, max: Number.POSITIVE_INFINITY },
];

export default function ExerciseHistorySheet({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
}: ExerciseHistorySheetProps) {
  const { t, language } = useLanguage();
  const { settings } = useProfile();
  const { workoutLog } = useWorkout();
  const unit = settings.weightUnit;
  const locale = language === 'es' ? es : enUS;

  const sessions = useMemo(
    () => (exerciseId ? getExerciseSessions(workoutLog, exerciseId) : []),
    [workoutLog, exerciseId],
  );

  const pr = useMemo(
    () => (exerciseId ? getExercisePR(workoutLog, exerciseId) : null),
    [workoutLog, exerciseId],
  );

  const chartData = useMemo(
    () =>
      sessions
        .filter((session) => session.best1RM > 0)
        .map((session) => ({
          date: session.date,
          oneRm: Math.round(fromKg(session.best1RM, unit)),
          volume: Math.round(fromKg(session.volume, unit)),
        }))
        .reverse(),
    [sessions, unit],
  );

  const bestByRange = useMemo(() => {
    const best = new Map<string, { weight: number; reps: number }>();
    sessions.forEach((session) => {
      session.sets.forEach((set) => {
        if (!isCountedSet(set) || !set.completed || set.weight <= 0 || set.reps <= 0) return;
        const range = REP_RANGES.find((candidate) => set.reps >= candidate.min && set.reps <= candidate.max);
        if (!range) return;
        const current = best.get(range.label);
        if (!current || set.weight > current.weight) {
          best.set(range.label, { weight: set.weight, reps: set.reps });
        }
      });
    });
    return best;
  }, [sessions]);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 flex h-[85vh] flex-col rounded-t-[2rem] border-t border-border bg-card shadow-2xl"
          >
            <div className="flex w-full cursor-grab touch-none justify-center py-4 active:cursor-grabbing">
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>

            <div className="flex items-center justify-between px-6 pb-4">
              <div className="min-w-0">
                <h2 className="truncate font-headline text-2xl font-bold">{exerciseName}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('sessionsCount', { count: sessions.length })}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label={t('close')}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-6 pb-10">
              {sessions.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('noHistory')}</p>
              ) : (
                <div className="space-y-6">
                  {pr && pr.maxWeight > 0 && (
                    <div className="flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <Trophy className="h-8 w-8 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t('personalRecord')}
                        </p>
                        <p className="text-2xl font-bold">
                          {trimZeros(fromKg(pr.maxWeight, unit))} {unit}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            × {pr.maxWeightReps}
                          </span>
                        </p>
                        {pr.date && (
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(pr.date), 'PPP', { locale })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {chartData.length > 1 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {t('estimated1RM')} ({unit})
                      </h3>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                            <XAxis
                              dataKey="date"
                              stroke="hsl(var(--muted-foreground))"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value) => format(parseISO(value), 'MMM d', { locale })}
                            />
                            <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
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
                              dataKey="oneRm"
                              name={t('estimated1RM')}
                              stroke="#f97316"
                              strokeWidth={3}
                              dot={{ r: 3, fill: '#f97316' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {bestByRange.size > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {t('bestSets')}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {REP_RANGES.filter((range) => bestByRange.has(range.label)).map((range) => {
                          const best = bestByRange.get(range.label)!;
                          return (
                            <div key={range.label} className="rounded-xl bg-secondary/20 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {range.label} {t('reps')}
                              </p>
                              <p className="font-bold">
                                {trimZeros(fromKg(best.weight, unit))} {unit} × {best.reps}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                ≈ {Math.round(fromKg(epley1RM(best.weight, best.reps), unit))} {unit} 1RM
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      {t('volumePerSession')}
                    </h3>
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div
                          key={session.date}
                          className="rounded-xl border border-border/50 bg-secondary/10 p-3"
                        >
                          <div className="mb-2 flex items-baseline justify-between">
                            <p className="text-sm font-semibold">
                              {format(parseISO(session.date), 'PPP', { locale })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {trimZeros(fromKg(session.volume, unit))} {unit}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {session.sets.map((set, index) => (
                              <span
                                key={index}
                                className={`rounded-md px-2 py-0.5 font-mono text-xs ${
                                  set.completed
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-muted text-muted-foreground line-through'
                                } ${!isCountedSet(set) ? 'opacity-60' : ''}`}
                              >
                                {set.duration
                                  ? `${set.duration}${t('seconds')}`
                                  : set.weight > 0
                                    ? `${trimZeros(fromKg(set.weight, unit))}×${set.reps}`
                                    : `${set.reps}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
