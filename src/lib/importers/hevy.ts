import type { SetType } from '@/lib/types';
import { parseCsvRows, pick, toNumber } from './csv';
import { ImportBuilder, parseImportDate, weightToKg } from './shared';
import type { ParseImport } from './types';

/** Hevy names its set types almost the same way this app does. */
const SET_TYPES: Record<string, SetType> = {
  warmup: 'warmup',
  normal: 'normal',
  failure: 'failure',
  dropset: 'dropset',
  drop: 'dropset',
};

/**
 * Hevy exports one row per set, with weights already in kilograms — the column
 * is literally called `weight_kg` regardless of what the app displays — so the
 * fallback unit is never needed here.
 */
export const parseHevy: ParseImport = (text) => {
  const builder = new ImportBuilder();

  for (const row of parseCsvRows(text)) {
    const date = parseImportDate(pick(row, 'starttime', 'date', 'endtime'));
    const name = pick(row, 'exercisetitle', 'exercisename');
    if (!date || !name) continue;

    const reps = Math.round(toNumber(pick(row, 'reps')));
    const weightKg = weightToKg(toNumber(pick(row, 'weightkg', 'weight')), 'kg');
    const seconds = toNumber(pick(row, 'durationseconds'));
    const rpe = toNumber(pick(row, 'rpe'));
    if (reps === 0 && weightKg === 0 && seconds === 0) continue;

    const type = SET_TYPES[pick(row, 'settype').toLowerCase()];

    builder.add(
      date,
      name,
      {
        reps,
        weightKg,
        ...(seconds > 0 ? { durationSeconds: Math.round(seconds) } : {}),
        ...(rpe > 0 ? { rpe } : {}),
        ...(type && type !== 'normal' ? { type } : {}),
      },
      pick(row, 'exercisenotes'),
    );
  }

  return builder.build();
};
