"use client";

import { useMemo, useRef, useState } from 'react';
import { addMonths, format, isSameMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { toBlob } from 'html-to-image';
import { ArrowDownRight, ArrowUpRight, CalendarRange, ChevronLeft, ChevronRight, Loader2, Medal, Share2 } from 'lucide-react';
import BottomSheet from '@/components/bottom-sheet';
import { useAchievementTitle } from '@/components/achievements-card';
import { formatDuration } from '@/components/workout-summary-sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useExercises } from '@/context/exercise-context';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { useToast } from '@/hooks/use-toast';
import { SHARE_CARD_FONT, shareImage } from '@/lib/file-export';
import { buildMonthlyRecap } from '@/lib/progress-insights';
import { fromKg, resolveExerciseName } from '@/lib/workout-utils';

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Change({ now, before }: { now: number; before: number }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center text-xs font-semibold ${up ? 'text-emerald-500' : 'text-amber-500'}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {`${up ? '+' : ''}${pct}%`}
    </span>
  );
}

/** Card on the Progress tab plus the full, shareable recap in a sheet. */
export default function MonthlyRecap() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { workoutLog, sessions } = useWorkout();
  const { exercises } = useExercises();
  const { settings, bodyEntries } = useProfile();
  const unit = settings.weightUnit;
  const locale = language === 'es' ? es : enUS;
  const achievementTitle = useAchievementTitle();
  const cardRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  // Early in the month the interesting recap is the one that just closed.
  const defaultMonth = today.getDate() <= 7 ? subMonths(today, 1) : today;
  const [month, setMonth] = useState(defaultMonth);
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const recapFor = (date: Date) =>
    buildMonthlyRecap(workoutLog, sessions, bodyEntries, date, (exercise) => resolveExerciseName(exercise, exercises, t));

  const headline = useMemo(() => recapFor(defaultMonth), [workoutLog, sessions, bodyEntries, exercises, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const recap = useMemo(() => recapFor(month), [month, workoutLog, sessions, bodyEntries, exercises, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthLabel = (date: Date) => capitalise(format(date, 'LLLL yyyy', { locale }));
  // Tonnes (or thousands of lb), one decimal, in the reader's number format.
  const volume = (kg: number) =>
    `${(fromKg(kg, unit) / 1000).toLocaleString(language, { maximumFractionDigits: 1 })} ${unit === 'kg' ? 't' : 'k lb'}`;

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: Math.min(window.devicePixelRatio || 2, 3),
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        skipFonts: true,
        fontEmbedCSS: '',
        cacheBust: true,
      });
      if (!blob) throw new Error('render failed');
      const result = await shareImage(blob, `workout-recap-${recap.month}.png`, t('monthlyRecap'));
      if (result === 'failed') throw new Error('share failed');
    } catch (error) {
      console.error('Recap share failed:', error);
      toast({ title: t('shareError'), description: t('shareErrorDescription'), variant: 'destructive' });
    } finally {
      setIsSharing(false);
    }
  };

  const cells = [
    ...Array.from({ length: recap.firstWeekday }, () => null),
    ...Array.from({ length: recap.daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => {
          setMonth(defaultMonth);
          setIsOpen(true);
        }}
        onKeyDown={(event) => event.key === 'Enter' && setIsOpen(true)}
        className="glass-effect cursor-pointer border-primary/20 transition-colors hover:border-primary/50"
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarRange className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-headline text-lg font-bold">{t('monthlyRecapOf', { month: format(defaultMonth, 'LLLL', { locale }) })}</p>
            <p className="truncate text-sm text-muted-foreground">
              {t('recapHeadline', { workouts: headline.workouts, volume: volume(headline.volumeKg) })}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('monthlyRecap')}
        actions={
          <>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label={t('previousMonth')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              disabled={isSameMonth(month, today)}
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label={t('nextMonth')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        }
        footer={
          <Button className="w-full rounded-full" onClick={handleShare} disabled={isSharing || recap.workouts === 0}>
            {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            {t('shareRecap')}
          </Button>
        }
      >
        <div ref={cardRef} style={SHARE_CARD_FONT} className="share-card space-y-5 rounded-2xl bg-background p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t('monthlyRecap')}</p>
            <p className="font-headline text-2xl font-bold">{monthLabel(month)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: t('workouts'),
                value: String(recap.workouts),
                change: recap.previous ? <Change now={recap.workouts} before={recap.previous.workouts} /> : null,
              },
              {
                label: t('volume'),
                value: volume(recap.volumeKg),
                change: recap.previous ? <Change now={recap.volumeKg} before={recap.previous.volumeKg} /> : null,
              },
              { label: t('sets'), value: String(recap.sets), change: null },
              { label: t('timeTraining'), value: recap.minutes > 0 ? formatDuration(recap.minutes) : '—', change: null },
            ].map(({ label, value, change }) => (
              <div key={label} className="rounded-xl border border-border/60 bg-card p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 whitespace-nowrap font-headline text-2xl font-bold">{value}</p>
                {change && <p className="mt-0.5">{change}</p>}
              </div>
            ))}
          </div>

          <div>
            <div className="mx-auto grid max-w-[260px] grid-cols-7 gap-1">
              {cells.map((day, index) => (
                <div
                  key={index}
                  className={`flex aspect-square items-center justify-center rounded-md text-[11px] ${
                    day === null
                      ? ''
                      : recap.trainedDays.includes(day)
                        ? 'bg-primary font-bold text-primary-foreground'
                        : 'bg-secondary/30 text-muted-foreground'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {recap.topExercises.length > 0 && (
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('topExercises')}</h3>
              {recap.topExercises.map((exercise, index) => (
                <div key={exercise.exerciseId} className="flex items-center gap-3 text-sm">
                  <span className="w-4 font-bold text-primary">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
                  <span className="shrink-0 whitespace-nowrap text-muted-foreground">{t('setsCount', { count: exercise.sets })}</span>
                </div>
              ))}
            </section>
          )}

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              {t('recapPrs', { count: recap.prCount })}
            </span>
            {recap.achievements.map((achievement) => (
              <span key={achievement.id} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-500/10 px-3 py-1 font-semibold text-amber-600 dark:text-amber-400">
                <Medal className="h-3.5 w-3.5" />
                {achievementTitle(achievement)}
              </span>
            ))}
          </div>

          <p className="text-center text-[11px] text-muted-foreground">Workout Planner</p>
        </div>
      </BottomSheet>
    </>
  );
}
