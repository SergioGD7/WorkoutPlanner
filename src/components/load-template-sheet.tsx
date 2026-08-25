"use client";

import { useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ChevronRight, FileText, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ManageTemplatesSheet from '@/components/manage-templates-sheet';
import { useLanguage } from '@/context/language-context';
import { useOverlayLock } from '@/context/overlay-context';
import { useTemplates } from '@/context/template-context';
import type { ProgressionConfig, TemplateExercise, WorkoutTemplate } from '@/lib/types';
import { templateDays, templateExerciseCount } from '@/lib/workout-utils';

interface LoadTemplateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The routine's progression rule travels with its exercises onto the log. */
  onLoadTemplate: (exercises: TemplateExercise[], progression?: ProgressionConfig) => void;
}

export default function LoadTemplateSheet({ isOpen, onClose, onLoadTemplate }: LoadTemplateSheetProps) {
  const { t } = useLanguage();
  // Stand the floating nav down while this sheet covers the screen.
  useOverlayLock(isOpen);
  const { templates } = useTemplates();
  const [isManageOpen, setIsManageOpen] = useState(false);
  /** Set when a multi-day routine is tapped: the user still has to pick a day. */
  const [dayPickerFor, setDayPickerFor] = useState<WorkoutTemplate | null>(null);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  };

  const handleTemplateClick = (template: WorkoutTemplate) => {
    const days = templateDays(template);
    if (days.length > 1) {
      setDayPickerFor(template);
      return;
    }
    onLoadTemplate(days[0]?.exercises ?? [], template.progression);
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
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 flex h-[70vh] flex-col rounded-t-[2rem] border-t border-border bg-card shadow-2xl"
          >
            <div className="flex w-full cursor-grab touch-none justify-center py-4 active:cursor-grabbing">
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>

            <div className="flex items-center justify-between px-6 pb-4">
              <h2 className="flex items-center gap-2 font-headline text-2xl font-bold">
                <FileText className="text-primary" />
                {dayPickerFor ? t('chooseDay') : t('loadTemplate')}
              </h2>
              <div className="flex gap-1">
                {!dayPickerFor && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsManageOpen(true)}
                    className="rounded-full"
                    aria-label={t('manageRoutines')}
                  >
                    <Settings2 className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => (dayPickerFor ? setDayPickerFor(null) : onClose())}
                  className="rounded-full"
                  aria-label={t('close')}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-6 pb-8">
              <div className="space-y-4">
                {dayPickerFor ? (
                  templateDays(dayPickerFor).map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        onLoadTemplate(day.exercises, dayPickerFor.progression);
                        setDayPickerFor(null);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-transparent bg-secondary/10 p-4 text-left transition-all hover:border-border/50 hover:bg-secondary/30 active:scale-[0.98]"
                    >
                      <div>
                        <h3 className="mb-1 text-lg font-bold text-foreground">{t(day.name)}</h3>
                        <p className="text-sm text-muted-foreground">
                          {day.exercises.length} {t('exercises')}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  ))
                ) : templates.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">{t('noTemplatesSaved')}</p>
                ) : (
                  templates.map((template) => {
                    const days = templateDays(template);
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateClick(template)}
                        className="flex w-full items-center justify-between rounded-2xl border border-transparent bg-secondary/10 p-4 text-left transition-all hover:border-border/50 hover:bg-secondary/30 active:scale-[0.98]"
                      >
                        <div>
                          <h3 className="mb-1 text-lg font-bold text-foreground">
                            {t(template.nameKey)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {templateExerciseCount(template)} {t('exercises')}
                            {days.length > 1 && ` · ${days.length} ${t('routineDays').toLowerCase()}`}
                          </p>
                        </div>
                        {days.length > 1 && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </motion.div>

          <ManageTemplatesSheet isOpen={isManageOpen} onClose={() => setIsManageOpen(false)} />
        </>
      )}
    </AnimatePresence>
  );
}
