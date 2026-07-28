"use client";

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/language-context';
import { useProfile } from '@/context/profile-context';
import type { BodyEntry } from '@/lib/types';
import { fromKg, toKg, trimZeros } from '@/lib/workout-utils';

/**
 * Replaces the old profile cards, which showed a single editable weight next to
 * a hardcoded decorative sparkline. Everything here is real logged data.
 */
export default function BodyMetricsCard() {
  const { t, language } = useLanguage();
  const { settings, bodyEntries, latestBodyEntry, saveBodyEntry, deleteBodyEntry } = useProfile();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState<BodyEntry | null>(null);

  const unit = settings.weightUnit;
  const locale = language === 'es' ? es : enUS;

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

  const change = useMemo(() => {
    if (weightSeries.length < 2) return null;
    const first = weightSeries[0];
    const last = weightSeries[weightSeries.length - 1];
    return { delta: Number((last.weight - first.weight).toFixed(1)), since: first.date };
  }, [weightSeries]);

  const openEditor = (entry?: BodyEntry) => {
    setDraft(entry ?? { date: format(new Date(), 'yyyy-MM-dd') });
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!draft?.date) return;
    await saveBodyEntry(draft);
    setIsEditorOpen(false);
    setDraft(null);
  };

  const patchDraft = (patch: Partial<BodyEntry>) => {
    setDraft((previous) => (previous ? { ...previous, ...patch } : previous));
  };

  /** Reads a measurement field from the draft as text for a controlled input. */
  const draftText = (field: keyof BodyEntry): string => {
    const value = draft?.[field];
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    if (field === 'weight') return String(fromKg(value, unit));
    return String(value);
  };

  const numericPatch = (field: keyof BodyEntry, raw: string): Partial<BodyEntry> => {
    if (raw.trim() === '') return { [field]: undefined } as Partial<BodyEntry>;
    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed)) return {};
    if (field === 'weight') return { weight: toKg(parsed, unit) };
    return { [field]: parsed } as Partial<BodyEntry>;
  };

  return (
    <>
      <Card className="glass-effect">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="font-headline text-lg">{t('bodyMetrics')}</CardTitle>
            <CardDescription>
              {change ? (
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
                        domain={['dataMin - 2', 'dataMax + 2']}
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
                          <span className="ml-2 text-xs text-muted-foreground">{entry.fat}%</span>
                        )}
                      </span>
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
                value={draft?.date ?? ''}
                onChange={(event) => patchDraft({ date: event.target.value })}
              />
            </div>

            <MetricField
              id="entry-weight"
              label={`${t('bodyWeight')} (${unit})`}
              value={draftText('weight')}
              onChange={(raw) => patchDraft(numericPatch('weight', raw))}
            />
            <MetricField
              id="entry-fat"
              label={`${t('bodyFat')} (%)`}
              value={draftText('fat')}
              onChange={(raw) => patchDraft(numericPatch('fat', raw))}
            />
            <MetricField
              id="entry-waist"
              label={`${t('waist')} (${t('centimeters')})`}
              value={draftText('waist')}
              onChange={(raw) => patchDraft(numericPatch('waist', raw))}
            />
            <MetricField
              id="entry-chest"
              label={`${t('chestMeasure')} (${t('centimeters')})`}
              value={draftText('chest')}
              onChange={(raw) => patchDraft(numericPatch('chest', raw))}
            />
            <MetricField
              id="entry-arm"
              label={`${t('armMeasure')} (${t('centimeters')})`}
              value={draftText('arm')}
              onChange={(raw) => patchDraft(numericPatch('arm', raw))}
            />
            <MetricField
              id="entry-thigh"
              label={`${t('thighMeasure')} (${t('centimeters')})`}
              value={draftText('thigh')}
              onChange={(raw) => patchDraft(numericPatch('thigh', raw))}
            />
          </div>

          <Button onClick={handleSave} disabled={!draft?.date} className="w-full">
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
