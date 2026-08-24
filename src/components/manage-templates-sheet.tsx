"use client";

import { useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import { useTemplates } from '@/context/template-context';
import { DEFAULT_TEMPLATE_REPS, DEFAULT_TEMPLATE_SETS } from '@/lib/data';
import { PROGRESSION_LABELS, PROGRESSION_RULES } from '@/lib/progression';
import type { ProgressionRule, TemplateDay, WorkoutTemplate } from '@/lib/types';
import { templateDays, templateExerciseCount } from '@/lib/workout-utils';

interface ManageTemplatesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageTemplatesSheet({ isOpen, onClose }: ManageTemplatesSheetProps) {
  const { t } = useLanguage();
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { exercises } = useExercises();

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null);

  const [name, setName] = useState('');
  /** 'inherit' keeps the routine on whatever the profile default happens to be. */
  const [progressionRule, setProgressionRule] = useState<ProgressionRule | 'inherit'>('inherit');
  const [days, setDays] = useState<TemplateDay[]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const activeDay = days[activeDayIndex];

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      if (view === 'list') onClose();
      else setView('list');
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setName('');
    setProgressionRule('inherit');
    setDays([{ id: uuidv4(), name: t('templateFullBodyDayA'), exercises: [] }]);
    setActiveDayIndex(0);
    setView('edit');
  };

  const handleEdit = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    // Built-in routines carry a translation key; show the translated text so the
    // user edits words rather than an identifier.
    const translated = t(template.nameKey);
    setName(translated !== template.nameKey ? translated : template.nameKey);
    setProgressionRule(template.progression?.rule ?? 'inherit');
    setDays(
      templateDays(template).map((day) => ({
        ...day,
        id: day.id || uuidv4(),
        name: t(day.name) !== day.name ? t(day.name) : day.name,
      })),
    );
    setActiveDayIndex(0);
    setView('edit');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      nameKey: name.trim(),
      days: days.map((day) => ({ ...day, name: day.name.trim() || t('dayName') })),
      // Only the rule is stored. Undefined for "use my default" so the routine
      // follows the profile if that default later changes, and no copy of the
      // rep range or the increment, so those keep coming from Settings too.
      progression: progressionRule === 'inherit' ? undefined : { rule: progressionRule },
    };

    if (editingTemplate) await updateTemplate({ ...editingTemplate, ...payload, exercises: undefined });
    else await addTemplate(payload);

    setView('list');
  };

  const patchDay = (index: number, patch: Partial<TemplateDay>) => {
    setDays((previous) => previous.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  };

  const toggleExerciseInDay = (exerciseId: string) => {
    if (!activeDay) return;
    const exists = activeDay.exercises.some((entry) => entry.exerciseId === exerciseId);
    patchDay(activeDayIndex, {
      exercises: exists
        ? activeDay.exercises.filter((entry) => entry.exerciseId !== exerciseId)
        : [
            ...activeDay.exercises,
            {
              exerciseId,
              sets: DEFAULT_TEMPLATE_SETS,
              reps: DEFAULT_TEMPLATE_REPS,
              restSeconds: 90,
            },
          ],
    });
  };

  const patchExercise = (exerciseId: string, patch: { sets?: number; reps?: number; restSeconds?: number }) => {
    if (!activeDay) return;
    patchDay(activeDayIndex, {
      exercises: activeDay.exercises.map((entry) =>
        entry.exerciseId === exerciseId ? { ...entry, ...patch } : entry,
      ),
    });
  };

  const addDay = () => {
    setDays((previous) => [
      ...previous,
      { id: uuidv4(), name: `${t('routineDays')} ${previous.length + 1}`, exercises: [] },
    ]);
    setActiveDayIndex(days.length);
  };

  const removeDay = (index: number) => {
    setDays((previous) => previous.filter((_, i) => i !== index));
    setActiveDayIndex((previous) => Math.max(0, previous - (index <= previous ? 1 : 0)));
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    await deleteTemplate(templateToDelete.id);
    setTemplateToDelete(null);
  };

  const exerciseName = (exerciseId: string) => {
    const definition = exercises.find((exercise) => exercise.id === exerciseId);
    return definition ? t(definition.name) : t('deletedExercise');
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
            className="fixed bottom-0 left-0 right-0 z-50 flex h-[90vh] flex-col rounded-t-[2rem] border-t border-border bg-card shadow-2xl"
          >
            <div className="flex w-full cursor-grab touch-none justify-center py-4 active:cursor-grabbing">
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>

            {view === 'list' ? (
              <>
                <div className="flex items-center justify-between px-6 pb-4">
                  <h2 className="font-headline text-2xl font-bold">{t('manageRoutines')}</h2>
                  <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label={t('close')}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="px-6 pb-4">
                  <Button onClick={handleCreateNew} className="w-full rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createNewRoutine')}
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-6 pb-8">
                  {templates.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">{t('noTemplatesSaved')}</p>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template) => {
                        const dayCount = templateDays(template).length;
                        return (
                          <div
                            key={template.id}
                            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-bold">{t(template.nameKey)}</p>
                              <p className="text-xs text-muted-foreground">
                                {templateExerciseCount(template)} {t('exercises').toLowerCase()}
                                {dayCount > 1 && ` · ${dayCount} ${t('routineDays').toLowerCase()}`}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(template)}
                                aria-label={t('editRoutine')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTemplateToDelete(template)}
                                aria-label={t('deleteRoutine')}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 pb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setView('list')}
                      className="-ml-2 rounded-full"
                      aria-label={t('cancel')}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="font-headline text-xl font-bold">
                      {editingTemplate ? t('editRoutine') : t('newRoutine')}
                    </h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label={t('close')}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-3 px-6 pb-3">
                  <div>
                    <Label htmlFor="routine-name" className="mb-1 block text-sm font-semibold">
                      {t('routineName')}
                    </Label>
                    <Input
                      id="routine-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t('routineNamePlaceholder')}
                      className="bg-secondary/20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="routine-progression" className="mb-1 block text-sm font-semibold">
                      {t('progressionRule')}
                    </Label>
                    <Select
                      value={progressionRule}
                      onValueChange={(value) =>
                        setProgressionRule(value as ProgressionRule | 'inherit')
                      }
                    >
                      <SelectTrigger id="routine-progression" className="bg-secondary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">{t('ruleInherit')}</SelectItem>
                        {PROGRESSION_RULES.map((rule) => (
                          <SelectItem key={rule} value={rule}>
                            {t(PROGRESSION_LABELS[rule].name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {progressionRule === 'inherit'
                        ? t('progressionRuleHint')
                        : t(PROGRESSION_LABELS[progressionRule].description)}
                    </p>
                  </div>

                  {/* Day chips: a routine can hold an A/B split or a full mesocycle. */}
                  <div className="flex flex-wrap items-center gap-2">
                    {days.map((day, index) => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setActiveDayIndex(index)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          index === activeDayIndex
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/70'
                        }`}
                      >
                        {day.name || `${index + 1}`}
                      </button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addDay}
                      className="h-7 rounded-full px-2"
                      aria-label={t('addDay')}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {activeDay && days.length > 1 && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor="day-name" className="mb-1 block text-xs font-semibold">
                          {t('dayName')}
                        </Label>
                        <Input
                          id="day-name"
                          value={activeDay.name}
                          onChange={(event) => patchDay(activeDayIndex, { name: event.target.value })}
                          className="h-9 bg-secondary/20"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDay(activeDayIndex)}
                        aria-label={t('deleteDay')}
                        className="mb-0.5"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1 px-6 pb-28">
                  <div className="space-y-4">
                    {activeDay && (
                      <>
                        <div>
                          <h3 className="mb-2 text-sm font-semibold">{t('selectExercisesLabel')}</h3>
                          {activeDay.exercises.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                              {t('emptyRoutineDay')}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {activeDay.exercises.map((entry) => (
                                <div
                                  key={entry.exerciseId}
                                  className="rounded-xl border border-border/60 bg-secondary/10 p-3"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-semibold">
                                      {exerciseName(entry.exerciseId)}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => toggleExerciseInDay(entry.exerciseId)}
                                      aria-label={t('delete')}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <NumberField
                                      label={t('targetSets')}
                                      value={entry.sets}
                                      min={1}
                                      onChange={(sets) => patchExercise(entry.exerciseId, { sets })}
                                    />
                                    <NumberField
                                      label={t('targetReps')}
                                      value={entry.reps}
                                      min={0}
                                      onChange={(reps) => patchExercise(entry.exerciseId, { reps })}
                                    />
                                    <NumberField
                                      label={`${t('restShort')} (${t('seconds')})`}
                                      value={entry.restSeconds ?? 90}
                                      min={0}
                                      step={15}
                                      onChange={(restSeconds) =>
                                        patchExercise(entry.exerciseId, { restSeconds })
                                      }
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="mb-2 text-sm font-semibold">{t('addExercisesToDay')}</h3>
                          <div className="space-y-2">
                            {exercises.map((exercise) => {
                              const isSelected = activeDay.exercises.some(
                                (entry) => entry.exerciseId === exercise.id,
                              );
                              return (
                                <button
                                  key={exercise.id}
                                  type="button"
                                  onClick={() => toggleExerciseInDay(exercise.id)}
                                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                                    isSelected
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-transparent bg-secondary/5 text-foreground hover:bg-secondary/10'
                                  }`}
                                >
                                  <div
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                                    }`}
                                  >
                                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{t(exercise.name)}</p>
                                    <p className="text-xs capitalize opacity-70">
                                      {t(exercise.bodyPart.toLowerCase())}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card via-card to-transparent p-6">
                  <Button
                    onClick={handleSave}
                    disabled={!name.trim() || days.every((day) => day.exercises.length === 0)}
                    className="h-12 w-full rounded-xl text-base shadow-lg"
                  >
                    {t('saveRoutine')}
                  </Button>
                </div>
              </>
            )}
          </motion.div>

          <AlertDialog
            open={!!templateToDelete}
            onOpenChange={(open) => !open && setTemplateToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteRoutine')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteRoutineConfirmation', {
                    name: templateToDelete ? t(templateToDelete.nameKey) : '',
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AnimatePresence>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}

function NumberField({ label, value, min = 0, step = 1, onChange }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed) && parsed >= min) onChange(parsed);
        }}
        className="h-9 w-full rounded-md border border-transparent bg-background text-center font-semibold outline-none focus:border-primary/50"
      />
    </label>
  );
}
