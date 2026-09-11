"use client";

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Plus, Target, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import type { BodyEntry } from '@/lib/types';
import { fromKg, toKg, trimZeros } from '@/lib/workout-utils';
import {
  GIRTHS,
  formatGirth,
  latestReading,
  lengthUnitFor,
  recordedGirths,
  toCm,
  type GirthKey,
} from '@/lib/body-metrics';

/** Every numeric field the editor offers, in form order. */
type MetricKey = 'weight' | 'fat' | GirthKey;
const METRIC_KEYS: MetricKey[] = ['weight', 'fat', 'waist', 'chest', 'arm', 'thigh'];

/**
 * Replaces the old profile cards, which showed a single editable weight next to
 * a hardcoded decorative sparkline. Everything here is real logged data.
 */
export default function BodyMetricsCard() {
  const { t, language } = useLanguage();
  const { settings, bodyEntries, latestBodyEntry, saveBodyEntry, deleteBodyEntry } = useProfile();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  /**
   * The editor works on text and parses on save.
   *
   * It used to hold numbers and derive each field's text from them on every
   * keystroke. Typing "32." parsed to 32, re-rendered as "32", and the next key
   * produced "325" — decimals could be pasted but not typed, in the weight field
   * too. The set rows solved the same thing with per-field focus refs; here the
   * form is modal, so keeping the whole draft as strings until Save is simpler
   * and has nothing to get out of sync.
   */
  const [draftDate, setDraftDate] = useState('');
  const [draftText, setDraftText] = useState<Partial<Record<MetricKey, string>>>({});

  const unit = settings.weightUnit;
  // Tape measures follow the scale: pounds means inches.
  const girthUnit = lengthUnitFor(unit);
  const girthUnitLabel = girthUnit === 'in' ? t('inches') : t('centimeters');
  const locale = language === 'es' ? es : enUS;

  /**
   * One reading per girth, each from the latest entry that *has* it. Not from
   * `latestBodyEntry`, which is the latest entry with a weight and knows nothing
   * about the days you only picked up the tape.
   */
  const girthReadings = useMemo(
    () => GIRTHS.map((girth) => ({ ...girth, reading: latestReading(bodyEntries, girth.key) })),
    [bodyEntries],
  );
  const hasAnyGirth = girthReadings.some((girth) => girth.reading !== null);

  const weightSeries = useMemo(
    () =>
      bodyEntries
        .filter((entry) => typeof entry.weight === 'number')
        .map((entry) => ({
          date: entry.date,
          weight: Number(fromKg(entry.weight as number, unit).toFixed(1)),
        }))
        .reverse(),
    [bodyEntries, unit],
  );

  const goal = settings.bodyWeightGoal;
  const goalDisplay = goal !== undefined ? Number(fromKg(goal, unit).toFixed(1)) : null;

  /**
   * Distance to the target, and whether the last move went toward it. Direction
   * matters more than sign: losing 300 g is progress on a cut and a setback on a
   * bulk, so the colour follows the goal, not the arrow.
   */
  const goalProgress = useMemo(() => {
    if (goalDisplay === null || weightSeries.length === 0) return null;
    const current = weightSeries[weightSeries.length - 1].weight;
    const remaining = Number(Math.abs(current - goalDisplay).toFixed(1));
    const previous = weightSeries.length > 1 ? weightSeries[weightSeries.length - 2].weight : null;
    const closer =
      previous === null ? null : Math.abs(current - goalDisplay) < Math.abs(previous - goalDisplay);
    return { remaining, closer, reached: remaining < 0.15 };
  }, [goalDisplay, weightSeries]);

  const change = useMemo(() => {
    if (weightSeries.length < 2) return null;
    const first = weightSeries[0];
    const last = weightSeries[weightSeries.length - 1];
    return { delta: Number((last.weight - first.weight).toFixed(1)), since: first.date };
  }, [weightSeries]);

  const isGirth = (field: MetricKey): field is GirthKey =>
    GIRTHS.some((girth) => girth.key === field);

  /** Stored number → text in the display unit, for prefilling a field. */
  const toText = (field: MetricKey, value: number | undefined): string => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    if (field === 'weight') return trimZeros(fromKg(value, unit));
    if (isGirth(field)) return formatGirth(value, girthUnit);
    return trimZeros(value);
  };

  /** Text in the display unit → stored number, or undefined for blank/junk. */
  const fromText = (field: MetricKey, raw: string | undefined): number | undefined => {
    if (!raw || raw.trim() === '') return undefined;
    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed)) return undefined;
    if (field === 'weight') return toKg(parsed, unit);
    if (isGirth(field)) return toCm(parsed, girthUnit);
    return parsed;
  };

  const openEditor = (entry?: BodyEntry) => {
    setDraftDate(entry?.date ?? format(new Date(), 'yyyy-MM-dd'));
    setDraftText(
      Object.fromEntries(METRIC_KEYS.map((field) => [field, toText(field, entry?.[field])])),
    );
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!draftDate) return;
    const entry: BodyEntry = { date: draftDate };
    METRIC_KEYS.forEach((field) => {
      const value = fromText(field, draftText[field]);
      if (value !== undefined) entry[field] = value;
    });
    await saveBodyEntry(entry);
    setIsEditorOpen(false);
  };

  const setField = (field: MetricKey) => (raw: string) =>
    setDraftText((previous) => ({ ...previous, [field]: raw }));

  /** "▾ 0.5" / "▴ 0.5" / "= 0", or "first" for a lone reading. Neutral on purpose. */
  const deltaText = (delta: number | null): string => {
    if (delta === null) return t('firstReading');
    const shown = formatGirth(Math.abs(delta), girthUnit);
    if (Number(shown) === 0) return '= 0';
    return `${delta < 0 ? '▾' : '▴'} ${shown}`;
  };

  return (
    <>
      <Card className="glass-effect">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="font-headline text-lg">{t('bodyMetrics')}</CardTitle>
            <CardDescription>
              {goalProgress ? (
                <span className="flex items-center gap-1">
                  {goalProgress.reached ? (
                    <Target className="h-3.5 w-3.5 text-green-500" />
                  ) : goalProgress.closer === false ? (
                    <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                  )}
                  {goalProgress.reached
                    ? t('goalReached')
                    : t('toGoal', { amount: `${goalProgress.remaining} ${unit}` })}
                </span>
              ) : change ? (
                <span className="flex items-center gap-1">
                  {change.delta <= 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                  )}
                  {t('weightChange', {
                    change: `${change.delta > 0 ? '+' : ''}${change.delta} ${unit}`,
                    date: format(parseISO(change.since), 'MMM yyyy', { locale }),
                  })}
                </span>
              ) : (
                t('bodyWeightHistory')
              )}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => openEditor()} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" />
            {t('addEntry')}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {bodyEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('noBodyEntries')}</p>
          ) : (
            <>
              <div className="flex items-baseline gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('bodyWeight')}</p>
                  <p className="text-3xl font-bold">
                    {typeof latestBodyEntry?.weight === 'number'
                      ? trimZeros(fromKg(latestBodyEntry.weight, unit))
                      : '--'}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('bodyFat')}</p>
                  <p className="text-3xl font-bold">
                    {typeof latestBodyEntry?.fat === 'number' ? trimZeros(latestBodyEntry.fat) : '--'}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">%</span>
                  </p>
                </div>
              </div>

              {/* The tape-measure row. Quieter than the two numbers above — you
                  weigh in daily and measure monthly — but present, which until
                  now it was not: four fields were written and never read back.
                  Four fixed slots in a fixed order, so a girth does not change
                  position depending on which ones you happened to record.

                  The arrows do not judge. A smaller waist is the goal on a cut
                  and a setback on a bulk, and only weight has a declared goal to
                  measure against — so weight gets colour and these stay grey. */}
              {hasAnyGirth && (
                <div className="grid grid-cols-4 gap-1.5">
                  {girthReadings.map(({ key, labelKey, reading }) => (
                    <div
                      key={key}
                      className="rounded-lg bg-secondary/30 px-2 py-1.5 tabular-nums"
                      aria-label={`${t(labelKey)}: ${
                        reading ? `${formatGirth(reading.value, girthUnit)} ${girthUnitLabel}` : '—'
                      }`}
                    >
                      <p className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">
                        {t(labelKey)}
                      </p>
                      {reading ? (
                        <>
                          <p className="text-sm font-bold leading-tight">
                            {formatGirth(reading.value, girthUnit)}
                            <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">
                              {girthUnitLabel}
                            </span>
                          </p>
                          <p className="text-[10px] leading-tight text-muted-foreground">
                            {deltaText(reading.delta)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm leading-tight text-muted-foreground">—</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {weightSeries.length > 1 && (
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weightSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="bodyWeightFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => format(parseISO(value), 'MMM d', { locale })}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 10 }}
                        domain={
                          goalDisplay !== null
                            ? [
                                (min: number) => Math.min(min, goalDisplay) - 2,
                                (max: number) => Math.max(max, goalDisplay) + 2,
                              ]
                            : ['dataMin - 2', 'dataMax + 2']
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(label) => format(parseISO(String(label)), 'PPP', { locale })}
                        formatter={(value) => [`${value} ${unit}`, t('bodyWeight')]}
                      />
                      {goalDisplay !== null && (
                        <ReferenceLine
                          y={goalDisplay}
                          stroke="#22c55e"
                          strokeDasharray="5 4"
                          strokeWidth={1.6}
                          label={{
                            value: t('goalShort', { weight: `${goalDisplay} ${unit}` }),
                            position: 'insideBottomLeft',
                            fill: '#22c55e',
                            fontSize: 10,
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#f97316"
                        strokeWidth={2}
                        fill="url(#bodyWeightFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-1">
                {bodyEntries.slice(0, 6).map((entry) => (
                  <div
                    key={entry.date}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-secondary/20"
                  >
                    <button
                      type="button"
                      onClick={() => openEditor(entry)}
                      className="flex-1 text-left"
                      aria-label={t('editEntry')}
                    >
                      <span className="text-muted-foreground">
                        {format(parseISO(entry.date), 'PPP', { locale })}
                      </span>
                      <span className="ml-3 font-semibold">
                        {typeof entry.weight === 'number'
                          ? `${trimZeros(fromKg(entry.weight, unit))} ${unit}`
                          : '—'}
                        {typeof entry.fat === 'number' && (
                          // Rounded like everywhere else: the raw value showed
                          // "17.400000000000002%" for an entry saved as 17.4.
                          <span className="ml-2 text-xs text-muted-foreground">{trimZeros(entry.fat)}%</span>
                        )}
                      </span>
                      {/* Only what was measured that day, so a scale-only day
                          stays one line and a tape day says which tape. */}
                      {recordedGirths(entry).length > 0 && (
                        <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                          {recordedGirths(entry).map((girth, index) => (
                            <span key={girth.key}>
                              {index > 0 && ' · '}
                              {t(girth.labelKey)}{' '}
                              <span className="font-semibold text-foreground">
                                {formatGirth(girth.value, girthUnit)}
                              </span>
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => void deleteBodyEntry(entry.date)}
                      aria-label={t('deleteEntry')}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditorOpen} onOpenChange={(open) => !open && setIsEditorOpen(false)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addEntry')}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="entry-date">{t('entryDate')}</Label>
              <Input
                id="entry-date"
                type="date"
                value={draftDate}
                onChange={(event) => setDraftDate(event.target.value)}
              />
            </div>

            <MetricField
              id="entry-weight"
              label={`${t('bodyWeight')} (${unit})`}
              value={draftText.weight ?? ''}
              onChange={setField('weight')}
            />
            <MetricField
              id="entry-fat"
              label={`${t('bodyFat')} (%)`}
              value={draftText.fat ?? ''}
              onChange={setField('fat')}
            />
            <MetricField
              id="entry-waist"
              label={`${t('waist')} (${girthUnitLabel})`}
              value={draftText.waist ?? ''}
              onChange={setField('waist')}
            />
            <MetricField
              id="entry-chest"
              label={`${t('chestMeasure')} (${girthUnitLabel})`}
              value={draftText.chest ?? ''}
              onChange={setField('chest')}
            />
            <MetricField
              id="entry-arm"
              label={`${t('armMeasure')} (${girthUnitLabel})`}
              value={draftText.arm ?? ''}
              onChange={setField('arm')}
            />
            <MetricField
              id="entry-thigh"
              label={`${t('thighMeasure')} (${girthUnitLabel})`}
              value={draftText.thigh ?? ''}
              onChange={setField('thigh')}
            />
          </div>

          <Button onClick={handleSave} disabled={!draftDate} className="w-full">
            {t('saveEntry')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface MetricFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (raw: string) => void;
}

function MetricField({ id, label, value, onChange }: MetricFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        placeholder="--"
        onChange={(event) => {
          if (!/^[0-9]*[.,]?[0-9]*$/.test(event.target.value)) return;
          onChange(event.target.value);
        }}
      />
    </div>
  );
}
