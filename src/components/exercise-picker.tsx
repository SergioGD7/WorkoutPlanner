"use client";

import { useId, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ExerciseIllustration from '@/components/exercise-illustration';
import { useLanguage } from '@/context/language-context';
import { bodyParts } from '@/lib/data';
import type { BodyPart, Exercise } from '@/lib/types';

/**
 * Picks one exercise out of a long list.
 *
 * A plain `<Select>` was fine with fifteen exercises and useless with three
 * hundred: a single flat column you scroll through hunting for a name you
 * already know. This is the combobox that replaces it — typed search, grouped by
 * body part, with the artwork alongside so the list can be scanned rather than
 * read.
 *
 * Built on Popover rather than Select because Select owns the keyboard for its
 * own typeahead, and a search field inside it spends its life fighting that.
 */

interface ExercisePickerProps {
  /** Already narrowed by the caller — this component does not decide relevance. */
  exercises: Exercise[];
  /** Selected exercise id, or the empty string for nothing chosen. */
  value: string;
  onChange: (exerciseId: string) => void;
  placeholder: string;
  className?: string;
}

/** Accent- and case-insensitive, so "bulgara" finds "Sentadilla Búlgara". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function ExercisePicker({
  exercises,
  value,
  onChange,
  placeholder,
  className = '',
}: ExercisePickerProps) {
  const { t } = useLanguage();
  // The listbox needs a real id so the trigger can point at it: a combobox that
  // does not say what it controls is one a screen reader cannot follow.
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = exercises.find((exercise) => exercise.id === value);

  /** Groups in the catalogue's own order, and only the ones with a match. */
  const groups = useMemo(() => {
    const needle = fold(query);
    const matching = needle
      ? exercises.filter((exercise) => fold(t(exercise.name)).includes(needle))
      : exercises;

    return bodyParts
      .map((bodyPart) => ({
        bodyPart: bodyPart as BodyPart,
        items: matching
          .filter((exercise) => exercise.bodyPart === bodyPart)
          .sort((a, b) => t(a.name).localeCompare(t(b.name))),
      }))
      .filter((group) => group.items.length > 0);
  }, [exercises, query, t]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  const choose = (exerciseId: string) => {
    onChange(exerciseId);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          className={`flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
        >
          <span className={`truncate ${selected ? '' : 'text-muted-foreground'}`}>
            {selected ? t(selected.name) : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-2rem))] p-0"
        // Keeps the trigger from stealing focus back and closing on the way in.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchExercises')}
            aria-label={t('searchExercises')}
            // Not autofocused on purpose: on a phone that throws the keyboard up
            // over the list you came here to look at.
            className="h-11 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div
          id={listboxId}
          role="listbox"
          className="max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain py-1"
        >
          {total === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('noExercisesFound')}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.bodyPart}>
                <p className="sticky top-0 z-10 bg-popover px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {t(group.bodyPart.toLowerCase())}
                </p>
                {group.items.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    role="option"
                    aria-selected={exercise.id === value}
                    onClick={() => choose(exercise.id)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary/40"
                  >
                    <ExerciseIllustration
                      exercise={exercise}
                      name={t(exercise.name)}
                      size="sm"
                      bare
                    />
                    <span className="min-w-0 flex-1 truncate">{t(exercise.name)}</span>
                    {exercise.id === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
