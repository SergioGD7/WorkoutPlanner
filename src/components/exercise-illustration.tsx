"use client";

import { useEffect, useState } from 'react';
import type { Exercise } from '@/lib/types';
import { FRAME_COUNT, hasIllustration, illustrationUrl } from '@/lib/illustrations';

/**
 * The artwork for an exercise, or its emoji when there is none.
 *
 * The fallback lives here rather than at each call site because it is the common
 * case, not the edge one: anything you create yourself, and anything imported
 * from Strong, Hevy or FitNotes, arrives without a slug.
 *
 * The drawings are white silhouettes on transparency. Rather than edit 906 files
 * to make them theme-aware — which would make them adaptations, and CC BY-SA
 * would then require publishing the results under the same licence — the light
 * theme inverts them in CSS. `dark:invert-0` undoes it again, because Tailwind's
 * `invert` is unconditional and the dark theme wants the artwork as drawn.
 */

type Size = 'sm' | 'md' | 'lg' | 'hero';

const BOX: Record<Size, string> = {
  sm: 'h-9 w-9 rounded-md',
  md: 'h-[52px] w-[52px] rounded-[10px]',
  lg: 'h-[68px] w-[68px] rounded-xl',
  hero: 'h-auto w-full rounded-xl',
};

const EMOJI_SIZE: Record<Size, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  hero: 'text-6xl',
};

interface ExerciseIllustrationProps {
  /**
   * Either shape works: a full catalogue entry, or the loose pair the workout
   * card carries. Both fields are optional — a deleted exercise has neither.
   */
  exercise: Partial<Pick<Exercise, 'illustration' | 'emoji'>> | undefined;
  /** Shown to assistive tech; the drawing adds nothing a screen reader needs. */
  name: string;
  size?: Size;
  /** Cycles the three frames. Off by default: a grid of them would be a fairground. */
  animated?: boolean;
  /** Pins a single frame. Ignored while `animated`. */
  frame?: number;
  className?: string;
}

export default function ExerciseIllustration({
  exercise,
  name,
  size = 'md',
  animated = false,
  frame = 1,
  className = '',
}: ExerciseIllustrationProps) {
  const slug = exercise?.illustration;
  const current = useFrameCycle(animated, slug);

  const box = `flex shrink-0 items-center justify-center overflow-hidden bg-secondary/30 ${BOX[size]} ${className}`;

  if (!hasIllustration(slug)) {
    return (
      <div className={box} aria-hidden="true">
        <span className={EMOJI_SIZE[size]}>{exercise?.emoji ?? '💪'}</span>
      </div>
    );
  }

  return (
    <div className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element --
          `next/image` needs a loader, and this is a static export. There is also
          nothing to optimise: a single-path SVG is already smaller than the
          request that would fetch a resized version of it. */}
      <img
        src={illustrationUrl(slug, animated ? current : frame)}
        alt={name}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`${size === 'hero' ? 'w-full' : 'h-[88%] w-[88%]'} invert dark:invert-0`}
      />
    </div>
  );
}

/**
 * Walks 1 → 2 → 3 → 1 while animating.
 *
 * Held at the middle frame under `prefers-reduced-motion`: that is the one at
 * the top of the effort, so a still picture of it still says what the movement
 * is. Returning to frame 1 would show someone standing there.
 */
function useFrameCycle(animated: boolean, slug: string | undefined): number {
  const [index, setIndex] = useState(1);

  useEffect(() => {
    if (!animated || !slug) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setIndex(2);
      return;
    }

    setIndex(1);
    const timer = setInterval(() => {
      setIndex((previous) => (previous % FRAME_COUNT) + 1);
    }, 700);

    return () => clearInterval(timer);
  }, [animated, slug]);

  return index;
}
