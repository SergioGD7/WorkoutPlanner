"use client";

import { useMemo, useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/language-context';
import { useExercises } from '@/context/exercise-context';
import { useProfile } from '@/context/profile-context';
import { useWorkout } from '@/context/workout-context';
import { useToast } from '@/hooks/use-toast';
import {
  IMPORT_SOURCES,
  IMPORT_SOURCE_NAMES,
  buildImportPlan,
  parseImport,
  type ImportPlan,
  type ImportSource,
} from '@/lib/importers';

/**
 * Brings a training history over from Strong, Hevy or FitNotes.
 *
 * The file is parsed and previewed before anything is written: these exports run
 * to thousands of rows and the only honest way to offer the feature is to show
 * what will land before it lands.
 */
export default function ImportHistoryForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { workoutLog, mergeDays } = useWorkout();
  const { exercises, replaceExercises } = useExercises();
  const { settings } = useProfile();

  const [source, setSource] = useState<ImportSource>('strong');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Built-in exercises store a translation key where a user-created one stores
  // a name, so both spellings go into the lookup.
  const catalogue = useMemo(
    () =>
      exercises.map((exercise) => ({
        id: exercise.id,
        names: [exercise.name, t(exercise.name)],
      })),
    [exercises, t],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImport(source, String(reader.result), settings.weightUnit);
        if (parsed.workouts.length === 0) {
          toast({ variant: 'destructive', title: t('error'), description: t('importNothingFound') });
          return;
        }
        setPlan(buildImportPlan(parsed, catalogue, workoutLog));
      } catch (error) {
        console.error('Could not read the export file:', error);
        toast({ variant: 'destructive', title: t('error'), description: t('importNothingFound') });
      }
    };
    reader.onerror = () => {
      toast({ variant: 'destructive', title: t('error'), description: t('fileReadError') });
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!plan) return;

    setIsImporting(true);
    try {
      // Exercises first: the days about to be written reference them by id.
      if (plan.newExercises.length > 0) await replaceExercises(plan.newExercises);
      await mergeDays(plan.log);

      toast({
        title: t('importDone'),
        description: t('importDoneDescription', { workouts: plan.workoutCount }),
      });
    } catch (error) {
      console.error('History import failed:', error);
      toast({ variant: 'destructive', title: t('error'), description: t('importFailed') });
    } finally {
      setIsImporting(false);
      setPlan(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('importFromApp')}</CardTitle>
          <CardDescription>{t('importFromAppDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="import-source" className="mb-1 block text-sm">
              {t('importSource')}
            </Label>
            <Select value={source} onValueChange={(value) => setSource(value as ImportSource)}>
              <SelectTrigger id="import-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_SOURCES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {IMPORT_SOURCE_NAMES[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            {t('chooseFile')}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={plan !== null} onOpenChange={(open) => !open && setPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('importPreview', {
              workouts: plan?.workoutCount ?? 0,
              sets: plan?.setCount ?? 0,
            })}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>{t('importMerge')}</p>
                {plan && plan.skippedDays > 0 && (
                  <p>{t('importSkipped', { count: plan.skippedDays })}</p>
                )}
                {plan && plan.newExercises.length > 0 && (
                  <p>{t('importUnmatched', { count: plan.newExercises.length })}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPlan(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={plan?.workoutCount === 0}>
              {t('runImport')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
