"use client";

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Bell, Settings as SettingsIcon, Trophy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BackupDataForm from '@/components/backup-data-form';
import BodyMetricsCard from '@/components/body-metrics-card';
import ChangePasswordForm from '@/components/change-password-form';
import LanguageSwitcher from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useAuth } from '@/context/auth-context';
import { useExercises } from '@/context/exercise-context';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useRestTimer } from '@/context/rest-timer-context';
import { useWorkout } from '@/context/workout-context';
import { useToast } from '@/hooks/use-toast';
import type { WeightUnit } from '@/lib/types';
import { fromKg, getExercisePR, totalCompletedWorkouts, trimZeros } from '@/lib/workout-utils';

const REST_PRESETS = [45, 60, 90, 120, 180, 240];

export default function Settings() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { exercises } = useExercises();
  const { workoutLog } = useWorkout();
  const { settings, updateSettings } = useProfile();
  const { requestNotificationPermission } = useRestTimer();
  const { toast } = useToast();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!enabled) {
      await updateSettings({ restTimerNotifications: false });
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) {
      toast({ variant: 'destructive', title: t('error'), description: t('notificationsDenied') });
      return;
    }
    await updateSettings({ restTimerNotifications: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-bold tracking-tight md:text-2xl">{t('profile')}</h2>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full" aria-label={t('settings')}>
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{t('settings')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-8 pt-4">
              <section className="space-y-4">
                <h3 className="font-headline text-lg font-semibold">{t('preferences')}</h3>

                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="weight-unit">{t('weightUnit')}</Label>
                  <Select
                    value={unit}
                    onValueChange={(value) => void updateSettings({ weightUnit: value as WeightUnit })}
                  >
                    <SelectTrigger id="weight-unit" className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">{t('kilograms')}</SelectItem>
                      <SelectItem value="lb">{t('pounds')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="default-rest">{t('defaultRest')}</Label>
                  <Select
                    value={String(settings.defaultRestSeconds)}
                    onValueChange={(value) => void updateSettings({ defaultRestSeconds: Number(value) })}
                  >
                    <SelectTrigger id="default-rest" className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REST_PRESETS.map((seconds) => (
                        <SelectItem key={seconds} value={String(seconds)}>
                          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="rest-sound">{t('restTimerSound')}</Label>
                  <Switch
                    id="rest-sound"
                    checked={settings.restTimerSound}
                    onCheckedChange={(checked) => void updateSettings({ restTimerSound: checked })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="rest-notifications" className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    {t('restTimerNotifications')}
                  </Label>
                  <Switch
                    id="rest-notifications"
                    checked={settings.restTimerNotifications}
                    onCheckedChange={(checked) => void handleNotificationToggle(checked)}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Label>{t('language')}</Label>
                  <LanguageSwitcher />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Label>{t('appearance')}</Label>
                  <ThemeSwitcher />
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-headline text-lg font-semibold">{t('security')}</h3>
                <ChangePasswordForm />
              </section>

              <section>
                <h3 className="mb-3 font-headline text-lg font-semibold">{t('dataManagement')}</h3>
                <BackupDataForm />
              </section>
            </div>
          </DialogContent>
        </Dialog>
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
