"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';
import { useWorkTimer } from '@/context/work-timer-context';
import { triggerHaptic } from '@/utils/haptics';

/**
 * The counterpart to the rest pill, for the hold itself.
 *
 * It sits a little higher up the screen than the rest timer so the two never
 * cover each other — a hold and a rest are mutually exclusive in practice, but
 * only in practice.
 */
export default function WorkTimer() {
  const { activeKey, elapsed, target, stop } = useWorkTimer();
  const { t } = useLanguage();

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const reached = target !== null && elapsed >= target;
  // Fills up towards the target instead of draining: the point is what you have
  // banked so far, not what is left.
  const progress = target ? Math.min(1, elapsed / target) : 0;

  return (
    <AnimatePresence>
      {activeKey !== null && (
        <motion.div
          // The horizontal centring is an animated value, not a class: framer
          // writes the element's `transform` outright, so a Tailwind
          // `-translate-x-1/2` would be wiped the moment the entry animation
          // settled and the pill would sit half a width to the right.
          initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
          role="timer"
          aria-live="off"
          className="fixed left-1/2 z-50"
          style={{ bottom: 'calc(10rem + env(safe-area-inset-bottom))' }}
        >
          <div
            className={`relative overflow-hidden rounded-full border bg-background/90 px-4 py-2 shadow-2xl backdrop-blur-xl ${
              reached ? 'border-green-500/40 shadow-green-500/10' : 'border-primary/20 shadow-primary/10'
            }`}
          >
            {target !== null && (
              <div
                className={`absolute inset-y-0 left-0 transition-[width] duration-300 ease-linear ${
                  reached ? 'bg-green-500/15' : 'bg-primary/10'
                }`}
                style={{ width: `${progress * 100}%` }}
                aria-hidden="true"
              />
            )}

            <div className="relative flex items-center gap-3">
              <Hourglass
                className={`h-5 w-5 shrink-0 ${
                  reached ? 'text-green-500' : 'animate-pulse text-primary'
                }`}
              />

              <div className="min-w-[4.5rem] text-center">
                <span className="font-mono text-xl font-bold tabular-nums">
                  {minutes}:{String(seconds).padStart(2, '0')}
                </span>
                {target !== null && (
                  <p className="text-[10px] leading-none text-muted-foreground">
                    / {target}
                    {t('seconds')}
                  </p>
                )}
              </div>

              <div className="mx-1 h-6 w-px bg-border" />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary"
                aria-label={t('stopWorkTimer')}
                onClick={() => {
                  triggerHaptic('medium');
                  stop();
                }}
              >
                <Check className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
