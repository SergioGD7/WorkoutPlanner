"use client";

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { ChevronLeft, Settings as SettingsIcon, Trophy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import BodyMetricsCard from '@/components/body-metrics-card';
import { useAuth } from '@/context/auth-context';
import { useExercises } from '@/context/exercise-context';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { fromKg, getExercisePR, totalCompletedWorkouts, trimZeros } from '@/lib/workout-utils';

/**
 * The profile screen, rendered at /settings. Preferences, security and data
 * tools live one level down at /settings/advanced.
 */
export default function Settings() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { exercises } = useExercises();
  const { workoutLog } = useWorkout();
  const { settings } = useProfile();
  const router = useRouter();

  const unit = settings.weightUnit;
  const locale = language === 'es' ? es : enUS;

  const totalWorkouts = useMemo(() => totalCompletedWorkouts(workoutLog), [workoutLog]);

  /** Only exercises with an actual record are worth a card. */
  const records = useMemo(
    () =>
      exercises
        .map((exercise) => ({ exercise, pr: getExercisePR(workoutLog, exercise.id) }))
        .filter((entry) => entry.pr.maxWeight > 0)
        .sort((a, b) => b.pr.maxWeight - a.pr.maxWeight),
    [exercises, workoutLog],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* This route sits outside the app shell, so it needs its own way back. */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="-ml-2 rounded-full"
            aria-label={t('backToDashboard')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h2 className="font-headline text-xl font-bold tracking-tight md:text-2xl">{t('profile')}</h2>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/settings/advanced')}
          className="rounded-full"
          aria-label={t('settings')}
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </div>

      <Card className="glass-effect relative overflow-hidden border-primary/20 py-8 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary bg-background shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <User className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl uppercase tracking-wider">
            {user?.displayName || user?.email?.split('@')[0] || t('athlete')}
          </CardTitle>
          {/* Real counters replace the old hardcoded "Level 12 / 45,670 XP". */}
          <p className="mt-2 text-sm text-muted-foreground">
            {totalWorkouts} {t('totalWorkouts').toLowerCase()} · {records.length}{' '}
            {t('personalRecords').toLowerCase()}
          </p>
        </div>
      </Card>

      <BodyMetricsCard />

      <div>
        <h3 className="mb-4 flex items-center gap-2 font-headline text-xl font-bold">
          <Trophy className="h-5 w-5 text-primary" /> {t('personalRecords')}
        </h3>
        {records.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t('noRecordsYet')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {records.map(({ exercise, pr }) => (
              <Card key={exercise.id} className="glass-effect transition-colors hover:border-primary/50">
                <CardContent className="p-4">
                  <p
                    className="line-clamp-2 min-h-[2.5rem] text-sm font-bold uppercase tracking-wider text-muted-foreground"
                    title={t(exercise.name)}
                  >
                    {t(exercise.name)}
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {trimZeros(fromKg(pr.maxWeight, unit))}
                    <span className="text-sm font-normal"> {unit}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    × {pr.maxWeightReps}
                    {pr.date && ` · ${format(parseISO(pr.date), 'MMM d, yyyy', { locale })}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
