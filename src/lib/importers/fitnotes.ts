import { parseCsvRows, pick, toNumber } from './csv';
import { ImportBuilder, parseImportDate, unitFromColumn, weightToKg } from './shared';
import type { ParseImport } from './types';

/** FitNotes writes holds as hh:mm:ss rather than a plain number of seconds. */
function parseClock(value: string): number {
  if (!value) return 0;
  const parts = value.split(':').map((part) => toNumber(part));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

/**
 * FitNotes exports one row per set, with an explicit unit column and no notion
 * of warm-up sets. Its `Category` column is the body part, but exercise matching
 * is by name, so it is only read to help place exercises the catalogue is
 * missing — which the importer leaves to the caller.
 */
export const parseFitNotes: ParseImport = (text, fallbackUnit) => {
  const builder = new ImportBuilder();

  for (const row of parseCsvRows(text)) {
    const date = parseImportDate(pick(row, 'date'));
    const name = pick(row, 'exercise', 'exercisename');
    if (!date || !name) continue;

    const unit = unitFromColumn(pick(row, 'weightunit'), fallbackUnit);
    const reps = Math.round(toNumber(pick(row, 'reps')));
    const weightKg = weightToKg(toNumber(pick(row, 'weight')), unit);
    const seconds = Math.round(parseClock(pick(row, 'time')));
    if (reps === 0 && weightKg === 0 && seconds === 0) continue;

    builder.add(
      date,
      name,
      {
        reps,
        weightKg,
        ...(seconds > 0 ? { durationSeconds: seconds } : {}),
      },
      pick(row, 'comment'),
    );
  }

  return builder.build();
};
