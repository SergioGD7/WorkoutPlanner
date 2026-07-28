"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, type PanInfo } from 'framer-motion';
import {
  ArrowUpRight,
  Calculator,
  GripVertical,
  History,
  StickyNote,
  Trash2,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/context/language-context';
import type { ExerciseTracking, Set, SetType, WeightUnit, WorkoutExercise } from '@/lib/types';
import {
  detectPR,
  fromKg,
  toKg,
  trimZeros,
  type ExercisePR,
  type ExerciseSession,
} from '@/lib/workout-utils';

const SET_TYPES: SetType[] = ['normal', 'warmup', 'failure', 'dropset'];

const SET_TYPE_LABEL_KEYS: Record<SetType, string> = {
  normal: 'normalSet',
  warmup: 'warmup',
  failure: 'failureSet',
  dropset: 'dropsetSet',
};

const SET_TYPE_BADGE: Record<SetType, string> = {
  normal: '',
  warmup: 'text-amber-500',
  failure: 'text-destructive',
  dropset: 'text-purple-500',
};

interface WorkoutCardProps {
  workoutExercise: WorkoutExercise;
  exerciseName: string;
  bodyPartLabel?: string;
  emoji?: string;
  tracking: ExerciseTracking;
  unit: WeightUnit;
  /** Best ever, excluding the day being edited, so today's sets can beat it. */
  pr: ExercisePR;
  lastSession: ExerciseSession | null;
  /** Suggested next working weight in kg, or null. */
  suggestion: number | null;
  isOrphaned: boolean;
  /** Starts a reorder drag; provided by the parent's Reorder.Item. */
  onDragHandlePointerDown?: (event: React.PointerEvent) => void;
  onSetToggle: (setIndex: number, completed: boolean) => void;
  onSetUpdate: (setIndex: number, patch: Partial<Set>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onNotesChange: (notes: string) => void;
  onApplySuggestion: () => void;
  onOpenHistory: () => void;
  onOpenPlates: (weightKg: number) => void;
  onDelete: () => void;
}

export default function WorkoutCard({
  workoutExercise,
  exerciseName,
  bodyPartLabel,
  emoji,
  tracking,
  unit,
  pr,
  lastSession,
  suggestion,
  isOrphaned,
  onDragHandlePointerDown,
  onSetToggle,
  onSetUpdate,
  onAddSet,
  onRemoveSet,
  onNotesChange,
  onApplySuggestion,
  onOpenHistory,
  onOpenPlates,
  onDelete,
}: WorkoutCardProps) {
  const { t } = useLanguage();
  const [showNotes, setShowNotes] = useState(Boolean(workoutExercise.notes));

  const lastTimeSummary = lastSession
    ? lastSession.sets
        .filter((set) => (set.type ?? 'normal') !== 'warmup')
        .map((set) => {
          if (tracking === 'duration') return `${set.duration ?? 0}${t('seconds')}`;
          if (set.weight > 0) return `${trimZeros(fromKg(set.weight, unit))}×${set.reps}`;
          return `${set.reps}`;
        })
        .join(' · ')
    : null;

  return (
    <Card className="overflow-hidden border-border/50 transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2 font-headline text-xl">
            <span
              onPointerDown={onDragHandlePointerDown}
              className="shrink-0 cursor-grab touch-none text-muted-foreground/40 active:cursor-grabbing"
              aria-label={t('reorderHint')}
              role="button"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            {emoji && <span aria-hidden="true">{emoji}</span>}
            <span className="truncate">{exerciseName}</span>
          </CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {bodyPartLabel && <p className="text-sm text-muted-foreground">{bodyPartLabel}</p>}
            {isOrphaned && (
              <Badge variant="outline" className="h-5 border-dashed text-[10px] uppercase">
                {t('deletedExercise')}
              </Badge>
            )}
          </div>

          {/* What you did last time — the number you actually want in the gym. */}
          <p className="mt-2 text-xs text-muted-foreground">
            {lastTimeSummary ? (
              <>
                <span className="font-semibold uppercase tracking-wider">{t('lastTime')}:</span>{' '}
                <span className="font-mono">{lastTimeSummary}</span>
              </>
            ) : (
              <span className="italic">{t('lastTimeNever')}</span>
            )}
          </p>

          {suggestion !== null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onApplySuggestion}
                    className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    {t('suggestedWeight', { weight: `${trimZeros(fromKg(suggestion, unit))} ${unit}` })}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-center">
                  <p className="text-xs">{t('progressionHint')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon" onClick={onOpenHistory} aria-label={t('viewHistory')}>
            <History className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotes((previous) => !previous)}
            aria-label={t('notes')}
            aria-pressed={showNotes}
          >
            <StickyNote
              className={`h-4 w-4 transition-colors ${
                workoutExercise.notes ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t('deleteExercise')}>
            <Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        <div className="space-y-2">
          {workoutExercise.sets.map((set, index) => (
            <SetRow
              key={`${workoutExercise.id}-${index}`}
              set={set}
              index={index}
              tracking={tracking}
              unit={unit}
              prKind={detectPR(set, pr)}
              onToggle={(completed) => onSetToggle(index, completed)}
              onUpdate={(patch) => onSetUpdate(index, patch)}
              onRemove={() => onRemoveSet(index)}
              onOpenPlates={() => onOpenPlates(set.weight)}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full border border-transparent text-primary transition-colors hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
          onClick={onAddSet}
        >
          + {t('addSet')}
        </Button>

        {showNotes && (
          <Textarea
            value={workoutExercise.notes ?? ''}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder={t('notesPlaceholder')}
            aria-label={t('notes')}
            rows={2}
            className="resize-none bg-secondary/20 text-sm"
          />
        )}
      </CardContent>
    </Card>
  );
}

interface SetRowProps {
  set: Set;
  index: number;
  tracking: ExerciseTracking;
  unit: WeightUnit;
  prKind: 'weight' | 'oneRm' | null;
  onToggle: (completed: boolean) => void;
  onUpdate: (patch: Partial<Set>) => void;
  onRemove: () => void;
  onOpenPlates: () => void;
}

function SetRow({
  set,
  index,
  tracking,
  unit,
  prKind,
  onToggle,
  onUpdate,
  onRemove,
  onOpenPlates,
}: SetRowProps) {
  const { t } = useLanguage();
  const controls = useAnimation();
  const setType = set.type ?? 'normal';

  // Text inputs keep their own state while focused so a half-typed value like
  // "0" or "82." is never rewritten from props mid-keystroke.
  const weightFocused = useRef(false);
  const repsFocused = useRef(false);
  const durationFocused = useRef(false);

  const [weightText, setWeightText] = useState(() => numberToText(fromKg(set.weight, unit)));
  const [repsText, setRepsText] = useState(() => numberToText(set.reps));
  const [durationText, setDurationText] = useState(() => numberToText(set.duration ?? 0));

  useEffect(() => {
    if (!weightFocused.current) setWeightText(numberToText(fromKg(set.weight, unit)));
  }, [set.weight, unit]);

  useEffect(() => {
    if (!repsFocused.current) setRepsText(numberToText(set.reps));
  }, [set.reps]);

  useEffect(() => {
    if (!durationFocused.current) setDurationText(numberToText(set.duration ?? 0));
  }, [set.duration]);

  const handleDragEnd = async (_event: unknown, info: PanInfo) => {
    if (info.offset.x < -80) {
      await controls.start({ x: -1000, opacity: 0, transition: { duration: 0.2 } });
      onRemove();
    } else {
      void controls.start({ x: 0, transition: { type: 'spring', bounce: 0.5 } });
    }
  };

  const setLabel = `${t('set')} ${index + 1}`;

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        className="absolute inset-0 z-0 flex items-center justify-end rounded-lg bg-destructive/90 pr-4"
        aria-hidden="true"
      >
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative z-10 flex items-center justify-between rounded-lg border p-2 pl-2 transition-all ${
          set.completed ? 'border-primary/50 bg-muted' : 'border-border/50 bg-card hover:border-border'
        }`}
      >
        <div className="flex flex-1 items-center gap-2 md:gap-3">
          {/* Set number doubles as the set-type / RPE menu trigger. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                className={`w-14 shrink-0 rounded-md px-1 py-1 text-left text-sm font-medium transition-colors hover:bg-secondary/50 ${
                  SET_TYPE_BADGE[setType] || 'text-muted-foreground'
                }`}
                aria-label={`${setLabel} — ${t('setType')}`}
              >
                {setType === 'normal' ? setLabel : t(SET_TYPE_LABEL_KEYS[setType]).slice(0, 6)}
                {set.rpe ? <span className="ml-1 text-[10px] opacity-70">@{set.rpe}</span> : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>{t('setType')}</DropdownMenuLabel>
              {SET_TYPES.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => onUpdate({ type })}
                  className={type === setType ? 'font-bold text-primary' : ''}
                >
                  {t(SET_TYPE_LABEL_KEYS[type])}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center justify-between">
                {t('rpe')}
                <span className="text-[10px] font-normal text-muted-foreground">1-10</span>
              </DropdownMenuLabel>
              <div className="grid grid-cols-5 gap-1 p-2">
                {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((rpe) => (
                  <button
                    key={rpe}
                    type="button"
                    onClick={() => onUpdate({ rpe: set.rpe === rpe ? undefined : rpe })}
                    className={`rounded-md py-1 text-xs font-semibold transition-colors ${
                      set.rpe === rpe
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/40 hover:bg-secondary/70'
                    }`}
                  >
                    {rpe}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            {tracking === 'duration' ? (
              <div className="flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={durationText}
                  aria-label={`${setLabel} — ${t('duration')}`}
                  onFocus={() => {
                    durationFocused.current = true;
                  }}
                  onBlur={() => {
                    durationFocused.current = false;
                    setDurationText(numberToText(set.duration ?? 0));
                  }}
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (!/^\d*$/.test(raw)) return;
                    setDurationText(raw);
                    onUpdate({ duration: raw === '' ? 0 : Number(raw) });
                  }}
                  className="h-8 w-16 rounded-md border border-transparent bg-secondary/30 text-center font-semibold text-foreground outline-none transition-colors hover:bg-secondary/50 focus:border-primary/50 focus:bg-secondary/70"
                  placeholder="0"
                />
                <span className="ml-1.5 text-xs font-medium text-muted-foreground">{t('seconds')}</span>
              </div>
            ) : (
              <>
                {tracking === 'weight' && (
                  <div className="flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={weightText}
                      aria-label={`${setLabel} — ${t('weightKg', { unit })}`}
                      onFocus={() => {
                        weightFocused.current = true;
                      }}
                      onBlur={() => {
                        weightFocused.current = false;
                        setWeightText(numberToText(fromKg(set.weight, unit)));
                      }}
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (!/^[0-9]*[.,]?[0-9]*$/.test(raw)) return;
                        setWeightText(raw);
                        const parsed = raw === '' ? 0 : Number(raw.replace(',', '.'));
                        if (Number.isFinite(parsed)) onUpdate({ weight: toKg(parsed, unit) });
                      }}
                      className="h-8 w-16 rounded-md border border-transparent bg-secondary/30 text-center font-semibold text-foreground outline-none transition-colors hover:bg-secondary/50 focus:border-primary/50 focus:bg-secondary/70"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={onOpenPlates}
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label={t('plateCalculator')}
                      className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-primary"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                    </button>
                    <span className="ml-0.5 text-xs font-medium text-muted-foreground">{unit}</span>
                  </div>
                )}

                <span className="mx-1 text-muted-foreground/50" aria-hidden="true">
                  ×
                </span>

                <div className="flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={repsText}
                    aria-label={`${setLabel} — ${t('reps')}`}
                    onFocus={() => {
                      repsFocused.current = true;
                    }}
                    onBlur={() => {
                      repsFocused.current = false;
                      setRepsText(numberToText(set.reps));
                    }}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (!/^\d*$/.test(raw)) return;
                      setRepsText(raw);
                      onUpdate({ reps: raw === '' ? 0 : Number(raw) });
                    }}
                    className="h-8 w-14 rounded-md border border-transparent bg-secondary/30 text-center font-semibold text-foreground outline-none transition-colors hover:bg-secondary/50 focus:border-primary/50 focus:bg-secondary/70"
                    placeholder="0"
                  />
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">{t('reps')}</span>
                </div>
              </>
            )}
          </div>

          {prKind && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 shrink-0" aria-label={t('personalRecord')}>
                    <Trophy className="h-4 w-4 text-amber-400" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs font-semibold">{t('newPR')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-1 pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            aria-label={`${t('removeSet')} — ${setLabel}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="pointer-events-auto" onPointerDown={(event) => event.stopPropagation()}>
            <Checkbox
              id={`set-${index}`}
              checked={set.completed}
              onCheckedChange={(checked) => onToggle(Boolean(checked))}
              aria-label={`${t('done')} — ${setLabel}`}
              className="h-6 w-6 rounded-md transition-all data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** Empty string for zero so the field shows its placeholder instead of "0". */
function numberToText(value: number): string {
  return value > 0 ? String(value) : '';
}
