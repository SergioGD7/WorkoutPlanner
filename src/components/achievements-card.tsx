"use client";

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { CalendarDays, ChevronRight, Dumbbell, Flame, Lock, Medal, Weight } from 'lucide-react';
import BottomSheet from '@/components/bottom-sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { computeAchievements, type AchievementCategory, type AchievementState } from '@/lib/progress-insights';

const ICONS = { medal: Medal, flame: Flame, dumbbell: Dumbbell, weight: Weight, calendar: CalendarDays };

/** Bronze, silver, gold. Tailwind palette so both themes keep their contrast. */
const TIER_CLASSES: Record<1 | 2 | 3, string> = {
  1: 'bg-orange-700/15 text-orange-600 dark:text-orange-400 border-orange-700/30',
  2: 'bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/40',
  3: 'bg-amber-400/15 text-amber-600 dark:text-amber-300 border-amber-400/40',
};

const CATEGORIES: AchievementCategory[] = ['consistency', 'strength', 'volume'];

export function useAchievementTitle() {
  const { t } = useLanguage();
  return (achievement: AchievementState) =>
    t(achievement.titleKey, {
      ...achievement.values,
      ...(achievement.values?.exercise ? { exercise: t(String(achievement.values.exercise)) } : {}),
    });
}

function Badge({ achievement, size = 'md' }: { achievement: AchievementState; size?: 'sm' | 'md' }) {
  const Icon = ICONS[achievement.icon];
  const unlocked = Boolean(achievement.unlockedAt);
  const box = size === 'sm' ? 'h-11 w-11' : 'h-12 w-12';
  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center rounded-full border ${
        unlocked ? TIER_CLASSES[achievement.tier] : 'border-border/60 bg-secondary/20 text-muted-foreground/50'
      }`}
    >
      {unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
    </div>
  );
}

export default function AchievementsCard() {
  const { t, language } = useLanguage();
  const { workoutLog } = useWorkout();
  const { bodyEntries } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const locale = language === 'es' ? es : enUS;
  const title = useAchievementTitle();

  const achievements = useMemo(() => computeAchievements(workoutLog, bodyEntries), [workoutLog, bodyEntries]);
  const unlocked = achievements.filter((achievement) => achievement.unlockedAt);
  const recent = [...unlocked].sort((a, b) => ((a.unlockedAt ?? '') < (b.unlockedAt ?? '') ? 1 : -1)).slice(0, 4);
  const next = achievements
    .filter((achievement) => !achievement.unlockedAt && !achievement.needsBodyWeight)
    .sort((a, b) => b.progress - a.progress)[0];

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(event) => event.key === 'Enter' && setIsOpen(true)}
        className="glass-effect cursor-pointer border-primary/20 transition-colors hover:border-primary/50"
      >
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-headline text-lg font-bold">
              <Medal className="h-5 w-5 text-primary" />
              {t('achievements')}
            </p>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {`${unlocked.length}/${achievements.length}`}
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
          {recent.length > 0 ? (
            <div className="flex gap-3">
              {recent.map((achievement) => (
                <Badge key={achievement.id} achievement={achievement} size="sm" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noAchievementsYet')}</p>
          )}
          {next && (
            <div>
              <p className="text-xs text-muted-foreground">
                {t('nextAchievement')}: <span className="font-semibold text-foreground">{title(next)}</span>
              </p>
              <Progress value={next.progress * 100} className="mt-1.5 h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('achievements')}>
        <div className="space-y-6 pb-6">
          {CATEGORIES.map((category) => {
            const items = achievements.filter((achievement) => achievement.category === category);
            return (
              <section key={category} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary/80">{t(`achCategory_${category}`)}</h3>
                {category === 'strength' && items.some((item) => item.needsBodyWeight) && (
                  <p className="rounded-lg bg-secondary/30 p-2 text-xs text-muted-foreground">{t('achNeedsBodyWeight')}</p>
                )}
                {items.map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 rounded-xl bg-secondary/10 p-3">
                    <Badge achievement={achievement} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${achievement.unlockedAt ? '' : 'text-muted-foreground'}`}>
                        {title(achievement)}
                      </p>
                      {achievement.unlockedAt ? (
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(achievement.unlockedAt), 'd MMM yyyy', { locale })}
                        </p>
                      ) : (
                        <Progress value={achievement.progress * 100} className="mt-1.5 h-1.5" />
                      )}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
