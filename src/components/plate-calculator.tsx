"use client";

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/language-context';
import { useOverlayLock } from '@/context/overlay-context';
import { useProfile } from '@/context/profile-context';
import {
  DEFAULT_PLATES_KG,
  DEFAULT_PLATES_LB,
  calculatePlates,
  fromKg,
  trimZeros,
} from '@/lib/workout-utils';

interface PlateCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fills the target with the weight of the set that opened the dialog (kg). */
  initialWeightKg?: number;
}

/** Plate colours follow the usual competition scheme so they read at a glance. */
const PLATE_COLORS: Record<number, string> = {
  25: '#ef4444',
  20: '#3b82f6',
  15: '#eab308',
  10: '#22c55e',
  5: '#e5e7eb',
  2.5: '#111827',
  1.25: '#9ca3af',
  45: '#3b82f6',
  35: '#eab308',
};

export default function PlateCalculator({ isOpen, onClose, initialWeightKg = 0 }: PlateCalculatorProps) {
  const { t } = useLanguage();
  // A centred dialog still has the nav pill floating over its footer.
  useOverlayLock(isOpen);
  const { settings, updateSettings } = useProfile();
  const unit = settings.weightUnit;

  const initialTarget = initialWeightKg > 0 ? String(fromKg(initialWeightKg, unit)) : '';
  const [target, setTarget] = useState(initialTarget);
  const [targetTouched, setTargetTouched] = useState(false);

  const displayTarget = targetTouched ? target : initialTarget;
  const barWeight = fromKg(settings.barWeight, unit);

  const result = useMemo(() => {
    const parsed = Number(displayTarget.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return calculatePlates(parsed, barWeight, unit);
  }, [displayTarget, barWeight, unit]);

  const availablePlates = unit === 'lb' ? DEFAULT_PLATES_LB : DEFAULT_PLATES_KG;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('plateCalculator')}</DialogTitle>
          <DialogDescription>{t('plateCalculatorDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="plate-target">{`${t('targetWeight')} (${unit})`}</Label>
            <Input
              id="plate-target"
              inputMode="decimal"
              value={displayTarget}
              placeholder="0"
              onChange={(event) => {
                setTargetTouched(true);
                setTarget(event.target.value);
              }}
              className="text-lg font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plate-bar">{`${t('barWeight')} (${unit})`}</Label>
            <Input
              id="plate-bar"
              inputMode="decimal"
              value={trimZeros(barWeight)}
              onChange={(event) => {
                const parsed = Number(event.target.value.replace(',', '.'));
                if (!Number.isFinite(parsed) || parsed < 0) return;
                // Persist in kg; the field itself is in the display unit.
                void updateSettings({ barWeight: unit === 'lb' ? parsed * 0.45359237 : parsed });
              }}
              className="text-lg font-bold"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/10 p-4">
          {result === null ? (
            <p className="text-center text-sm text-muted-foreground">{t('belowBarWeight')}</p>
          ) : result.plates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t('noPlatesNeeded')}</p>
          ) : (
            <>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('perSide')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {result.plates.map((plate) => (
                  <div
                    key={plate.weight}
                    className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 shadow-sm"
                  >
                    <span
                      className="h-4 w-4 rounded-sm border border-border"
                      style={{ backgroundColor: PLATE_COLORS[plate.weight] ?? '#6b7280' }}
                      aria-hidden="true"
                    />
                    <span className="font-bold">
                      {plate.count} × {trimZeros(plate.weight)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
                    </span>
                  </div>
                ))}
              </div>
              {result.leftover > 0.01 && (
                <p className="mt-3 text-xs text-destructive">
                  {t('plateLeftover', { amount: `${trimZeros(result.leftover)} ${unit}` })}
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {availablePlates.map((plate) => `${trimZeros(plate)}`).join(' · ')} {unit}
        </p>
      </DialogContent>
    </Dialog>
  );
}
