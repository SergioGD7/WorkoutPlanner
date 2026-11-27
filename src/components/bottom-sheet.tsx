"use client";

import type { ReactNode } from 'react';
import { AnimatePresence, motion, type PanInfo, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';
import { useOverlayLock } from '@/context/overlay-context';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Right of the title, before the close button. */
  actions?: ReactNode;
  /** Fixed under the scrolling body (primary buttons). */
  footer?: ReactNode;
  /** Tailwind height class; defaults to 85vh. */
  heightClass?: string;
  children: ReactNode;
}

/**
 * The app's bottom sheet: same spring, backdrop and handle-only drag as the
 * exercise picker, so scrolling the body never drags the sheet.
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  actions,
  footer,
  heightClass = 'h-[85vh]',
  children,
}: BottomSheetProps) {
  const { t } = useLanguage();
  useOverlayLock(isOpen);
  const dragControls = useDragControls();

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={`fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-w-2xl flex-col rounded-t-[2rem] border-t border-border bg-card shadow-2xl ${heightClass}`}
          >
            <div
              className="flex w-full cursor-grab touch-none justify-center py-4 active:cursor-grabbing"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>
            <div className="flex items-center justify-between gap-2 px-6 pb-3">
              <h2 className="min-w-0 truncate font-headline text-2xl font-bold">{title}</h2>
              <div className="flex shrink-0 items-center gap-1">
                {actions}
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label={t('close')}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
            {footer && (
              <div className="border-t border-border/60 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {footer}
              </div>
            )}
            {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
