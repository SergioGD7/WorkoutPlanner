import type { SetType } from '@/lib/types';
import { parseCsvRows, pick, toNumber } from './csv';
import { ImportBuilder, parseImportDate, unitFromColumn, weightToKg } from './shared';
import type { ParseImport } from './types';

/**
 * Strong exports one row per set.
 *
 * The header has changed across versions — older files carry `Weight Unit` and
 * `Distance Unit` columns that newer ones drop, writing weights in whatever unit
 * the app was set to instead. Both are read here; when no unit column exists the
 * profile's unit stands in.
 *
 * Warm-ups appear as a `Set Order` of "W" rather than a number, which is the
 * only marking Strong gives them.
 */
export const parseStrong: ParseImport = (text, fallbackUnit) => {
  const builder = new ImportBuilder();

  for (const row of parseCsvRows(text)) {
    const date = parseImportDate(pick(row, 'date', 'workoutdate'));
    const name = pick(row, 'exercisename', 'exercise');
    if (!date || !name) continue;

    const order = pick(row, 'setorder');
    const type: SetType | undefined = /^w/i.test(order) ? 'warmup' : undefined;

    const unit = unitFromColumn(pick(row, 'weightunit'), fallbackUnit);
    const seconds = toNumber(pick(row, 'seconds', 'duration'));
    const reps = Math.round(toNumber(pick(row, 'reps')));
    const rpe = toNumber(pick(row, 'rpe'));

    // Rows with nothing logged are Strong's placeholders for a planned set.
    const weightKg = weightToKg(toNumber(pick(row, 'weight')), unit);
    if (reps === 0 && weightKg === 0 && seconds === 0) continue;

    builder.add(
      date,
      name,
      {
        reps,
        weightKg,
        ...(seconds > 0 ? { durationSeconds: Math.round(seconds) } : {}),
        ...(rpe > 0 ? { rpe } : {}),
        ...(type ? { type } : {}),
      },
      pick(row, 'notes'),
    );
  }

  return builder.build();
};
