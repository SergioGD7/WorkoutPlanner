"use client";

import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import type { BodyPart, Set as WorkoutSet } from '@/lib/types';
import { bodyPartColorMap } from '@/lib/style-utils';
import {
  exerciseVolume,
  fromKg,
  isCountedSet,
  resolveBodyPart,
  resolveExerciseName,
  trimZeros,
} from '@/lib/workout-utils';

const WEEK_STARTS_ON = 1;

interface DayExerciseSummary {
  workoutExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  bodyPart?: BodyPart;
  totalVolume: number;
  notes?: string;
  sets: WorkoutSet[];
}

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON }),
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  /**
   * Collapsed on arrival. The week strip is what you came for — today and the
   * days around it — and the full month is a deliberate second step, not the
   * thing that greets you and has to be dismissed.
   */
  const [isMonthView, setIsMonthView] = useState(false);
  /**
   * Expanding or collapsing from the title animates; collapsing because a day
   * was picked switches instantly, so the tap feels immediate.
   */
  const [animateViewChange, setAnimateViewChange] = useState(true);

  const { t, language } = useLanguage();
  const { exercises } = useExercises();
  const { settings } = useProfile();
  const { workoutLog, isLoading } = useWorkout();

  const unit = settings.weightUnit;
  const locale = language === 'es' ? es : enUS;

  const dailyBodyParts = useMemo(() => {
    const map = new Map<string, BodyPart[]>();
    Object.entries(workoutLog).forEach(([dateKey, dayExercises]) => {
      const parts = dayExercises
        .map((workoutExercise) => resolveBodyPart(workoutExercise, exercises))
        .filter((part): part is BodyPart => Boolean(part));
      map.set(dateKey, Array.from(new Set(parts)));
    });
    return map;
  }, [workoutLog, exercises]);

  const workoutForDay = useMemo((): DayExerciseSummary[] => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const dayExercises = workoutLog[dateKey];
    if (!dayExercises) return [];

    return dayExercises.map((workoutExercise) => ({
      workoutExerciseId: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      exerciseName: resolveExerciseName(workoutExercise, exercises, t),
      bodyPart: resolveBodyPart(workoutExercise, exercises),
      totalVolume: exerciseVolume(workoutExercise),
      notes: workoutExercise.notes,
      sets: workoutExercise.sets,
    }));
  }, [selectedDate, workoutLog, exercises, t]);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: currentWeekStart, end: addDays(currentWeekStart, 6) }),
    [currentWeekStart],
  );

  /** Full month grid, padded to whole weeks so the columns line up. */
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON }),
      end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: WEEK_STARTS_ON }),
    });
  }, [currentMonth]);

  /** Picking a day from the month grid collapses back to the week strip. */
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setCurrentWeekStart(startOfWeek(day, { weekStartsOn: WEEK_STARTS_ON }));
    setAnimateViewChange(false);
    setIsMonthView(false);
  };

  const renderDayDots = (dateKey: string, isSelected: boolean) => (
    <div className="mt-1 flex h-1 space-x-[2px]">
      {(dailyBodyParts.get(dateKey) ?? []).slice(0, 3).map((part) => (
        <div
          key={part}
          className="h-1 w-1 rounded-full"
          style={{ backgroundColor: isSelected ? '#fff' : bodyPartColorMap.get(part) }}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.div layout={animateViewChange} className="overflow-hidden">
        <Card className="glass-effect overflow-hidden border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                isMonthView
                  ? setCurrentMonth(subMonths(currentMonth, 1))
                  : setCurrentWeekStart(subDays(currentWeekStart, 7))
              }
              className="h-8 w-8"
              aria-label={isMonthView ? t('previousMonth') : t('previousWeek')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Tapping the title expands the whole month. */}
            <button
              type="button"
              onClick={() => {
                if (!isMonthView) setCurrentMonth(startOfMonth(selectedDate));
                setAnimateViewChange(true);
                setIsMonthView((previous) => !previous);
              }}
              className="group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/50"
              aria-expanded={isMonthView}
              aria-label={isMonthView ? t('collapseToWeek') : t('expandToMonth')}
            >
              <CardTitle className="flex items-center gap-2 font-headline text-lg uppercase tracking-wider">
                {format(isMonthView ? currentMonth : currentWeekStart, 'MMMM yyyy', { locale })}
              </CardTitle>
              {isMonthView ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              )}
            </button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                isMonthView
                  ? setCurrentMonth(addMonths(currentMonth, 1))
                  : setCurrentWeekStart(addDays(currentWeekStart, 7))
              }
              className="h-8 w-8"
              aria-label={isMonthView ? t('nextMonth') : t('nextWeek')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <div className="flex h-[80px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <motion.div layout={animateViewChange}>
                <AnimatePresence mode="popLayout">
                  {isMonthView ? (
                    <motion.div
                      key="month-view"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: animateViewChange ? 0.3 : 0 }}
                      className="mt-2"
                    >
                      <div className="mb-2 grid grid-cols-7">
                        {weekDays.map((day) => (
                          <div
                            key={day.toISOString()}
                            className="text-center text-[10px] font-bold uppercase text-muted-foreground"
                          >
                            {format(day, 'EEE', { locale }).substring(0, 1)}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-y-2">
                        {monthDays.map((day) => {
                          const isSelected = isSameDay(day, selectedDate);
                          const isTodayDate = isSameDay(day, new Date());
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const dayKey = format(day, 'yyyy-MM-dd');

                          return (
                            <div key={day.toISOString()} className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`relative flex h-12 w-10 flex-col items-center justify-center rounded-xl transition-all duration-300 ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                                    : isCurrentMonth
                                      ? 'hover:bg-muted'
                                      : 'opacity-30 hover:bg-muted hover:opacity-100'
                                }`}
                              >
                                <span
                                  className={`font-headline text-base font-bold leading-none ${
                                    isTodayDate && !isSelected ? 'text-primary' : ''
                                  }`}
                                >
                                  {format(day, 'd')}
                                </span>
                                {renderDayDots(dayKey, isSelected)}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="week-view"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: animateViewChange ? 0.3 : 0 }}
                      className="mt-2 flex w-full items-center justify-between"
                    >
                      {weekDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isTodayDate = isSameDay(day, new Date());
                        const dayKey = format(day, 'yyyy-MM-dd');

                        return (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            className={`relative flex h-14 w-10 flex-col items-center justify-center rounded-xl transition-all duration-300 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <span
                              className={`text-[10px] font-bold uppercase ${
                                isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                              }`}
                            >
                              {format(day, 'EEE', { locale }).substring(0, 1)}
                            </span>
                            <span
                              className={`font-headline text-base font-bold ${
                                isTodayDate && !isSelected ? 'text-primary' : ''
                              }`}
                            >
                              {format(day, 'd')}
                            </span>
                            {renderDayDots(dayKey, isSelected)}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Card className="glass-effect bg-card/50">
        <CardHeader className="border-b border-border/50 pb-2">
          <CardTitle className="flex items-center justify-between font-headline text-lg uppercase tracking-wider text-primary">
            <span>{t('workoutDetailsFor', { date: format(selectedDate, 'PPP', { locale }) })}</span>
            {workoutForDay.length > 0 && (
              <span className="text-xs font-normal normal-case text-muted-foreground">
                {workoutForDay.length} {t('exercises')}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {workoutForDay.length > 0 ? (
            <div className="relative ml-3 space-y-8 border-l-2 border-muted/50 pb-4 sm:ml-4">
              {workoutForDay.map((entry) => (
                <div key={entry.workoutExerciseId} className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />

                  <div className="rounded-xl border border-border/50 bg-secondary/10 p-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-headline text-lg font-bold leading-tight">{entry.exerciseName}</h4>
                        <div className="mt-1.5 flex items-center gap-2">
                          {entry.bodyPart && (
                            <Badge
                              variant="outline"
                              className="h-5 border-transparent bg-muted/80 text-[10px] uppercase"
                              style={{ color: bodyPartColorMap.get(entry.bodyPart) }}
                            >
                              {t(entry.bodyPart.toLowerCase())}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {entry.sets.length} {t('sets').toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="mb-0.5 text-xs uppercase tracking-wider text-muted-foreground">
                          {t('volume')}
                        </p>
                        <p className="text-sm font-bold text-primary">
                          {Math.round(fromKg(entry.totalVolume, unit)).toLocaleString()} {unit}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {entry.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                            set.completed ? 'border border-primary/20 bg-primary/10' : 'bg-background/50'
                          } ${!isCountedSet(set) ? 'opacity-70' : ''}`}
                        >
                          <span className="font-medium text-muted-foreground">
                            {t('set')} {setIndex + 1}
                            {!isCountedSet(set) && (
                              <span className="ml-1 text-[10px] uppercase">({t('warmup')})</span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              {set.duration ? (
                                `${set.duration}${t('seconds')}`
                              ) : (
                                <>
                                  {trimZeros(fromKg(set.weight, unit))}
                                  {unit}
                                  <span className="mx-1 font-normal text-muted-foreground">×</span>
                                  {set.reps}
                                </>
                              )}
                              {set.rpe ? (
                                <span className="ml-1 text-[10px] text-muted-foreground">@{set.rpe}</span>
                              ) : null}
                            </span>
                            {set.completed ? (
                              <CheckCircle2 className="ml-1 h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="ml-1 h-4 w-4 text-muted-foreground/50" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {entry.notes && (
                      <p className="mt-3 rounded-lg bg-background/60 p-2 text-xs italic text-muted-foreground">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
                <span className="text-2xl opacity-50">📅</span>
              </div>
              <p className="font-medium text-muted-foreground">{t('noWorkoutOnThisDay')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
