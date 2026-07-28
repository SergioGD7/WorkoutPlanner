"use client";

import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Download, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useTemplates } from '@/context/template-context';
import { useWorkout } from '@/context/workout-context';
import { useToast } from '@/hooks/use-toast';
import type { BackupPayload, WorkoutLog } from '@/lib/types';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Full-account JSON backup, available to every user. Previously only a
 * hardcoded admin address could import data and there was no way to get a copy
 * of your own history out of the app.
 */
export default function BackupDataForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { workoutLog, replaceLog } = useWorkout();
  const { exercises, replaceExercises } = useExercises();
  const { templates, replaceTemplates } = useTemplates();
  const { settings, bodyEntries, replaceBodyEntries, updateSettings } = useProfile();

  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const payload: BackupPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      workoutLog,
      exercises,
      templates,
      bodyEntries,
      settings,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `workout-planner-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    toast({ title: t('backupExported') });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ variant: 'destructive', title: t('error'), description: t('invalidFileType') });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const normalised = normaliseBackup(parsed);
        if (!normalised) {
          toast({ variant: 'destructive', title: t('error'), description: t('invalidBackupFile') });
          return;
        }
        setPendingBackup(normalised);
      } catch {
        toast({ variant: 'destructive', title: t('error'), description: t('invalidJsonFormat') });
      }
    };
    reader.onerror = () => {
      toast({ variant: 'destructive', title: t('error'), description: t('fileReadError') });
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!pendingBackup) return;

    setIsRestoring(true);
    try {
      if (pendingBackup.exercises?.length) await replaceExercises(pendingBackup.exercises);
      if (pendingBackup.templates?.length) await replaceTemplates(pendingBackup.templates);
      if (pendingBackup.bodyEntries?.length) await replaceBodyEntries(pendingBackup.bodyEntries);
      if (pendingBackup.settings) await updateSettings(pendingBackup.settings);
      // Workouts last: it's the slowest write and the one worth retrying alone.
      await replaceLog(pendingBackup.workoutLog);

      toast({ title: t('backupImported') });
    } catch (error) {
      console.error('Backup restore failed:', error);
      toast({ variant: 'destructive', title: t('error'), description: t('importFailed') });
    } finally {
      setIsRestoring(false);
      setPendingBackup(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('backup')}</CardTitle>
          <CardDescription>{t('backupDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleExport} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            {t('exportBackup')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={isRestoring}
            className="flex-1"
          >
            {isRestoring ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {t('importBackup')}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={pendingBackup !== null} onOpenChange={(open) => !open && setPendingBackup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('importBackup')}</AlertDialogTitle>
            <AlertDialogDescription>{t('restoreConfirmation')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingBackup(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>{t('restore')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Accepts both the current backup envelope and the bare `{date: exercises[]}`
 * workout log that older exports produced.
 */
function normaliseBackup(parsed: unknown): BackupPayload | null {
  if (!parsed || typeof parsed !== 'object') return null;

  const candidate = parsed as Partial<BackupPayload> & Record<string, unknown>;

  if (candidate.workoutLog && typeof candidate.workoutLog === 'object') {
    return {
      version: 2,
      exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
      workoutLog: candidate.workoutLog as WorkoutLog,
      exercises: Array.isArray(candidate.exercises) ? candidate.exercises : [],
      templates: Array.isArray(candidate.templates) ? candidate.templates : [],
      bodyEntries: Array.isArray(candidate.bodyEntries) ? candidate.bodyEntries : [],
      settings: candidate.settings,
    };
  }

  const keys = Object.keys(candidate);
  const looksLikeLegacyLog =
    keys.length > 0 && keys.every((key) => DATE_KEY.test(key) && Array.isArray(candidate[key]));

  if (looksLikeLegacyLog) {
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      workoutLog: candidate as unknown as WorkoutLog,
      exercises: [],
      templates: [],
      bodyEntries: [],
    };
  }

  return null;
}
