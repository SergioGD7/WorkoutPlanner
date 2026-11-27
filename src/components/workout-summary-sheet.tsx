'use client';

import { useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { toBlob } from 'html-to-image';
import { ArrowDownRight, ArrowUpRight, Clock, Dumbbell, Layers, Loader2, Medal, Share2, Trophy } from 'lucide-react';
import BottomSheet from '@/components/bottom-sheet';
import { ShareAchievementButton, useShareAchievement } from '@/components/achievement-share';
import { Button } from '@/components/ui/button';
import { useExercises } from '@/context/exercise-context';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { useToast } from '@/hooks/use-toast';
import { SHARE_CARD_FONT, shareImage } from '@/lib/file-export';
import { achievementsUnlockedOn, computeAchievements } from '@/lib/progress-insights';
import { buildWorkoutSummary } from '@/lib/session';
import { fromKg, resolveExerciseName, trimZeros } from '@/lib/workout-utils';

interface WorkoutSummarySheetProps {
  dateKey: string | null;
  onClose: () => void;
}

/** Elapsed time for the summary: seconds under a minute, then minutes and hours. */
export function formatElapsed(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds} s`;
  return formatDuration(Math.round(seconds / 60));
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${rest} min`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Delta({ now, before }: { now: number; before: number }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="text-xs text-muted-foreground">=</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center text-xs font-semibold ${up ? 'text-emerald-500' : 'text-amber-500'}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {`${up ? '+' : ''}${pct}%`}
    </span>
  );
}

export default function WorkoutSummarySheet({ dateKey, onClose }: WorkoutSummarySheetProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { workoutLog, sessions } = useWorkout();
  const { exercises } = useExercises();
  const { settings, bodyEntries } = useProfile();
  const unit = settings.weightUnit;
  const locale = language === 'es' ? es : enUS;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { share: shareAchievement, sharingId, card: achievementCard } = useShareAchievement();

  const summary = useMemo(
    () =>
      dateKey
        ? buildWorkoutSummary(workoutLog, sessions, dateKey, (exercise) => resolveExerciseName(exercise, exercises, t))
        : null,
    [dateKey, workoutLog, sessions, exercises, t],
  );
  const unlocked = useMemo(
    () => (dateKey ? achievementsUnlockedOn(computeAchievements(workoutLog, bodyEntries), dateKey) : []),
    [dateKey, workoutLog, bodyEntries],
  );

  const session = dateKey ? sessions[dateKey] : undefined;
  const volume = (kg: number) => `${Math.round(fromKg(kg, unit)).toLocaleString(language)} ${unit}`;

  const handleShare = async () => {
    if (!cardRef.current || !dateKey) return;
    setIsSharing(true);
    try {
      const background = getComputedStyle(document.body).backgroundColor;
      const blob = await toBlob(cardRef.current, {
        pixelRatio: Math.min(window.devicePixelRatio || 2, 3),
        backgroundColor: background,
        skipFonts: true,
        fontEmbedCSS: '',
        cacheBust: true,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.shareIgnore === 'true'),
      });
      if (!blob) throw new Error('render failed');
      const result = await shareImage(blob, `workout-summary-${dateKey}.png`, t('workoutSummary'));
      if (result === 'failed') throw new Error('share failed');
    } catch (error) {
      console.error('Summary share failed:', error);
      toast({ title: t('shareError'), description: t('shareErrorDescription'), variant: 'destructive' });
    } finally {
      setIsSharing(false);
    }
  };

  const stats = summary
    ? [
        { icon: Clock, label: t('duration'), value: formatElapsed(summary.durationSeconds), delta: null },
        {
          icon: Dumbbell,
          label: t('volume'),
          value: volume(summary.volumeKg),
          delta: summary.previous ? <Delta now={summary.volumeKg} before={summary.previous.volumeKg} /> : null,
        },
        {
          icon: Layers,
          label: t('sets'),
          value: String(summary.sets),
          delta: summary.previous ? <Delta now={summary.sets} before={summary.previous.sets} /> : null,
        },
        { icon: Trophy, label: t('prsToday'), value: String(summary.prs.length), delta: null },
      ]
    : [];

  return (
    <>
      <BottomSheet
        isOpen={dateKey !== null}
        onClose={onClose}
        title={t('workoutSummary')}
        footer={
          <Button className="w-full rounded-full" onClick={handleShare} disabled={isSharing}>
            {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            {t('shareSummary')}
          </Button>
        }
      >
        {summary && dateKey && (
          <div ref={cardRef} style={SHARE_CARD_FONT} className="share-card space-y-5 rounded-2xl bg-background p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {session?.templateName ?? t('workout')}
              </p>
              <p className="font-headline text-xl font-bold">
                {capitalise(
                  format(parseISO(dateKey), language === 'es' ? "EEEE, d 'de' MMMM" : 'EEEE, MMMM d', { locale }),
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ icon: Icon, label, value, delta }) => (
                <div key={label} className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </p>
                  <p className="mt-1 whitespace-nowrap font-headline text-2xl font-bold">{value}</p>
                  {delta && <p className="mt-0.5">{delta}</p>}
                </div>
              ))}
            </div>

            {summary.previous && (
              <p className="text-xs text-muted-foreground">
                {t('comparedWith', {
                  date: format(parseISO(summary.previous.date), 'd MMM', { locale }),
                  volume: volume(summary.previous.volumeKg),
                  sets: summary.previous.sets,
                })}
              </p>
            )}

            {summary.prs.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('newRecords')}</h3>
                {summary.prs.map((pr) => (
                  <div key={pr.exerciseId} className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
                    <Trophy className="h-5 w-5 shrink-0 text-primary" />
                    <p className="min-w-0 flex-1 truncate font-semibold">{pr.name}</p>
                    <p className="shrink-0 font-mono text-sm">{`${trimZeros(fromKg(pr.weight, unit))} ${unit} × ${pr.reps}`}</p>
                  </div>
                ))}
              </section>
            )}

            {unlocked.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t('achievementsUnlocked')}
                </h3>
                {unlocked.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
                  >
                    <Medal className="h-5 w-5 shrink-0 text-amber-500" />
                    <p className="min-w-0 flex-1 font-semibold">
                      {t(achievement.titleKey, {
                        ...achievement.values,
                        ...(achievement.values?.exercise ? { exercise: t(String(achievement.values.exercise)) } : {}),
                      })}
                    </p>
                    {/* Left out of the summary image, see the capture filter. */}
                    <span data-share-ignore="true">
                      <ShareAchievementButton
                        achievement={achievement}
                        sharingId={sharingId}
                        onShare={shareAchievement}
                      />
                    </span>
                  </div>
                ))}
              </section>
            )}

            <p className="text-center text-[11px] text-muted-foreground">Workout Planner</p>
          </div>
        )}
      </BottomSheet>
      {achievementCard}
    </>
  );
}
