'use client';

import { useCallback, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { toBlob } from 'html-to-image';
import { Loader2, Share2 } from 'lucide-react';
import { ACHIEVEMENT_ICONS, TIER_CLASSES, useAchievementTitle } from '@/components/achievements-card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import { SHARE_CARD_FONT, shareImage } from '@/lib/file-export';
import type { AchievementState } from '@/lib/progress-insights';

/**
 * Share an unlocked achievement as an image. The card is drawn off screen at a
 * fixed size and captured, so it looks the same whichever sheet it came from.
 */
export function useShareAchievement() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const title = useAchievementTitle();
  const cardRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<AchievementState | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const locale = language === 'es' ? es : enUS;

  const share = useCallback(
    async (achievement: AchievementState) => {
      if (!achievement.unlockedAt) return;
      setSharingId(achievement.id);
      setCurrent(achievement);
      try {
        // Let the card render the new achievement before capturing it.
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 60)));
        if (!cardRef.current) throw new Error('card not mounted');
        const blob = await toBlob(cardRef.current, {
          pixelRatio: 3,
          skipFonts: true,
          fontEmbedCSS: '',
          cacheBust: true,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
        });
        if (!blob) throw new Error('render failed');
        const result = await shareImage(blob, `achievement-${achievement.id}.png`, t('achievementUnlocked'));
        if (result === 'failed') throw new Error('share failed');
      } catch (error) {
        console.error('Achievement share failed:', error);
        toast({ title: t('shareError'), description: t('shareErrorDescription'), variant: 'destructive' });
      } finally {
        setSharingId(null);
      }
    },
    [t, toast],
  );

  const Icon = current ? ACHIEVEMENT_ICONS[current.icon] : null;
  const card = (
    <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: 360, pointerEvents: 'none' }}>
      <div
        ref={cardRef}
        style={SHARE_CARD_FONT}
        className="share-card flex flex-col items-center gap-4 bg-background px-6 py-8 text-center"
      >
        {current && Icon && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{t('achievementUnlocked')}</p>
            <div
              className={`flex h-28 w-28 items-center justify-center rounded-full border-4 ${TIER_CLASSES[current.tier]}`}
            >
              <Icon className="h-14 w-14" />
            </div>
            <p className="text-2xl font-bold leading-tight text-foreground">{title(current)}</p>
            {current.unlockedAt && (
              <p className="text-sm text-muted-foreground">
                {format(parseISO(current.unlockedAt), language === 'es' ? "d 'de' MMMM 'de' yyyy" : 'MMMM d, yyyy', { locale })}
              </p>
            )}
            <p className="pt-2 text-xs text-muted-foreground">Workout Planner</p>
          </>
        )}
      </div>
    </div>
  );

  return { share, sharingId, card };
}

export function ShareAchievementButton({
  achievement,
  sharingId,
  onShare,
}: {
  achievement: AchievementState;
  sharingId: string | null;
  onShare: (achievement: AchievementState) => void;
}) {
  const { t } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={() => onShare(achievement)}
      disabled={sharingId !== null}
      aria-label={t('shareAchievement')}
    >
      {sharingId === achievement.id ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Share2 className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
