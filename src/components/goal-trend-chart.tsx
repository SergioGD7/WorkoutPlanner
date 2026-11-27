'use client';

import type { GoalProgress } from '@/lib/progress-insights';

const W = 300;
const H = 72;
const PAD = 6;

/**
 * Sparkline for a strength goal: estimated 1RM per session over the last
 * twelve weeks, a dashed line at the 1RM the goal is worth, and the dashed
 * projection from today to the day the trend reaches it.
 */
export default function GoalTrendChart({ progress, label }: { progress: GoalProgress; label: string }) {
  const { history, targetOneRm, projection } = progress;
  if (history.length < 2) return null;

  const minX = Math.min(-84, history[0].x);
  // Show the projection when it lands within ~4 months; beyond that it would
  // squash the history into a sliver, so it runs off the right edge instead.
  const maxX = projection ? Math.min(Math.max(projection.days, 14), 120) : 0;
  const ys = [...history.map((point) => point.y), targetOneRm, projection?.fromY ?? targetOneRm];
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = Math.max(maxY - minY, 1);

  const sx = (x: number) => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
  const sy = (y: number) => H - PAD - ((y - minY) / spanY) * (H - PAD * 2);

  const line = history.map((point) => `${sx(point.x).toFixed(1)},${sy(point.y).toFixed(1)}`).join(' ');
  let projected: string | null = null;
  if (projection) {
    const endX = Math.min(projection.days, maxX);
    const endY = projection.fromY + ((targetOneRm - projection.fromY) * endX) / projection.days;
    projected = `${sx(0).toFixed(1)},${sy(projection.fromY).toFixed(1)} ${sx(endX).toFixed(1)},${sy(endY).toFixed(1)}`;
  }
  const last = history[history.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-2 h-[72px] w-full"
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <line
        x1={PAD}
        x2={W - PAD}
        y1={sy(targetOneRm)}
        y2={sy(targetOneRm)}
        stroke="hsl(var(--primary))"
        strokeWidth={1}
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
      {projected && (
        <polyline
          points={projected}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <polyline
        points={line}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <circle cx={sx(last.x)} cy={sy(last.y)} r={3} fill="hsl(var(--primary))" />
    </svg>
  );
}
