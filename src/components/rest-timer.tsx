"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';
import { useRestTimer } from '@/context/rest-timer-context';
import { triggerHaptic } from '@/utils/haptics';

/**
 * Rendered once at the app shell level so the countdown keeps running while the
 * user browses the library, the calendar or their progress.
 */
export default function RestTimer() {
  const { isActive, remaining, total, label, stop, addSeconds } = useRestTimer();
  const { t } = useLanguage();

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          role="timer"
          aria-live="off"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-6"
        >
          <div className="relative overflow-hidden rounded-full border border-primary/20 bg-background/90 px-4 py-2 shadow-2xl shadow-primary/10 backdrop-blur-xl">
            {/* Depleting progress track behind the controls. */}
            <div
              className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-300 ease-linear"
              style={{ width: `${progress * 100}%` }}
              aria-hidden="true"
            />

            <div className="relative flex items-center gap-3">
              <Timer className="h-5 w-5 shrink-0 animate-pulse text-primary" />

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                aria-label={t('subtractFifteenSeconds')}
                onClick={() => {
                  triggerHaptic('light');
                  addSeconds(-15);
                }}
              >
                <Minus className="h-3 w-3" />
              </Button>

              <div className="min-w-[4.5rem] text-center">
                <span className="font-mono text-xl font-bold tabular-nums">
                  {minutes}:{String(seconds).padStart(2, '0')}
                </span>
                {label && (
                  <p className="max-w-[8rem] truncate text-[10px] leading-none text-muted-foreground">
                    {label}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                aria-label={t('addFifteenSeconds')}
                onClick={() => {
                  triggerHaptic('light');
                  addSeconds(15);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>

              <div className="mx-1 h-6 w-px bg-border" />

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-destructive/20 hover:text-destructive"
                aria-label={t('skipRest')}
                onClick={stop}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
