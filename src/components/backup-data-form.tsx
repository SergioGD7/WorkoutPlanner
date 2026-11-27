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
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { importPhotos } from '@/lib/photo-store';
import { useToast } from '@/hooks/use-toast';
import type { BackupPayload } from '@/lib/types';
import { normaliseBackup } from '@/lib/backup';
import { useBackupData } from '@/hooks/use-backup-data';
import { exportFile } from '@/lib/file-export';

/**
 * Full-account JSON backup, available to every user. Previously only a
 * hardcoded admin address could import data and there was no way to get a copy
 * of your own history out of the app.
 */
export default function BackupDataForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { buildPayload, restorePayload } = useBackupData();
  const { user } = useAuth();
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const payload = buildPayload();
    const result = await exportFile({
      filename: `workout-planner-backup-${format(new Date(), 'yyyy-MM-dd')}.json`,
      data: JSON.stringify(payload, null, 2),
      mimeType: 'application/json',
      title: t('exportBackup'),
    });
    if (result === 'downloaded' || result === 'shared') toast({ title: t('backupExported') });
    else if (result === 'failed') toast({ variant: 'destructive', title: t('error'), description: t('unknownError') });
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
      await restorePayload(pendingBackup);
      if (pendingBackup.photos?.length && user) await importPhotos(user.uid, pendingBackup.photos);

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
