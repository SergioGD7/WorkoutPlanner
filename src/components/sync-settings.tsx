"use client";

import { useCallback, useEffect, useState } from 'react';
import { format, parseISO, subYears } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { CalendarRange, Cloud, CloudUpload, HeartPulse, History, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { useProfile } from '@/context/profile-context';
import { useBackupData } from '@/hooks/use-backup-data';
import { useToast } from '@/hooks/use-toast';
import { normaliseBackup } from '@/lib/backup';
import {
  backupDate,
  backupTarget,
  lastBackupAt,
  listBackups,
  readBackup,
  runAutoBackup,
  type BackupFile,
  type BackupTarget,
} from '@/lib/cloud-backup';
import { isNativeApp, nativePlatform } from '@/lib/native';
import {
  healthProviderKey,
  isHealthAvailable,
  readBodyWeightsFromHealth,
  requestHealthAuthorization,
} from '@/lib/native-sync';
import { exportPhotos, importPhotos } from '@/lib/photo-store';

/**
 * Settings › Sync: Apple Health / Health Connect, the weekly automatic backup
 * with restore-by-date, and the monthly recap notification. The first two only
 * exist in the apps.
 */
export default function SyncSettings() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings, updateSettings, bodyEntries, saveBodyEntry } = useProfile();
  const { buildPayload, restorePayload } = useBackupData();
  const locale = language === 'es' ? es : enUS;
  const native = isNativeApp();
  const uid = user?.uid;

  const [healthAvailable, setHealthAvailable] = useState(false);
  const [target, setTarget] = useState<BackupTarget>(null);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [busy, setBusy] = useState<'backup' | 'import' | 'restore' | null>(null);
  const [toRestore, setToRestore] = useState<BackupFile | null>(null);

  const refresh = useCallback(async () => {
    if (!native || !uid) return;
    setTarget(await backupTarget());
    setFiles(await listBackups(uid));
  }, [native, uid]);

  useEffect(() => {
    if (!native) return;
    void isHealthAvailable().then(setHealthAvailable);
    void refresh();
  }, [native, refresh]);

  const providerKey = healthProviderKey();
  const provider = providerKey ? t(providerKey) : null;

  const toggleHealth = async (checked: boolean) => {
    if (checked) {
      const granted = await requestHealthAuthorization();
      if (!granted) {
        toast({ variant: 'destructive', title: t('healthDenied', { provider: provider ?? '' }) });
        return;
      }
    }
    await updateSettings({ healthSyncEnabled: checked });
  };

  const importWeights = async () => {
    setBusy('import');
    try {
      const samples = await readBodyWeightsFromHealth(subYears(new Date(), 1));
      // One reading per day, the latest; never overwrite a weight already logged here.
      const byDay = new Map<string, number>();
      samples
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .forEach((sample) => byDay.set(format(parseISO(sample.date), 'yyyy-MM-dd'), sample.kg));
      const known = new Set(bodyEntries.filter((entry) => entry.weight).map((entry) => entry.date));
      let added = 0;
      for (const [date, kg] of byDay) {
        if (known.has(date)) continue;
        const existing = bodyEntries.find((entry) => entry.date === date);
        await saveBodyEntry({ ...(existing ?? { date }), weight: Math.round(kg * 10) / 10 });
        added += 1;
      }
      toast({ title: t('healthImported', { count: added }) });
    } finally {
      setBusy(null);
    }
  };

  const backupNow = async () => {
    if (!uid) return;
    setBusy('backup');
    try {
      const file = await runAutoBackup(uid, async () => JSON.stringify({ ...buildPayload(), photos: await exportPhotos(uid) }), true);
      if (file) toast({ title: t('backupSaved') });
      await refresh();
    } catch (error) {
      console.error('Backup failed:', error);
      toast({ variant: 'destructive', title: t('error'), description: t('unknownError') });
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (!uid || !toRestore) return;
    setBusy('restore');
    try {
      const json = await readBackup(uid, toRestore.name);
      const payload = json ? normaliseBackup(JSON.parse(json)) : null;
      if (!payload) throw new Error('invalid backup');
      await restorePayload(payload);
      if (payload.photos?.length) await importPhotos(uid, payload.photos);
      toast({ title: t('backupImported') });
    } catch (error) {
      console.error('Restore failed:', error);
      toast({ variant: 'destructive', title: t('error'), description: t('importFailed') });
    } finally {
      setBusy(null);
      setToRestore(null);
    }
  };

  const last = uid ? lastBackupAt(uid) : 0;
  const fileLabel = (file: BackupFile) => {
    const date = backupDate(file.name);
    return date ? format(parseISO(date), 'EEEE d MMM yyyy', { locale }) : file.name;
  };

  return (
    <div className="space-y-5">
      {native && provider && healthAvailable && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="health-sync" className="pr-2">
              <span className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-rose-500" />
                {t('healthSync', { provider })}
              </span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{t('healthSyncHint')}</span>
            </Label>
            <Switch id="health-sync" checked={Boolean(settings.healthSyncEnabled)} onCheckedChange={(checked) => void toggleHealth(checked)} />
          </div>
          {settings.healthSyncEnabled && (
            <Button variant="outline" size="sm" className="w-full" onClick={importWeights} disabled={busy !== null}>
              {busy === 'import' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HeartPulse className="mr-2 h-4 w-4" />}
              {t('healthImportWeight', { provider })}
            </Button>
          )}
        </div>
      )}

      {native && target && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="auto-backup" className="pr-2">
              <span className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-sky-500" />
                {t(target === 'icloud' ? 'autoBackupICloud' : 'autoBackupDevice')}
              </span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {t(
                  target === 'icloud'
                    ? 'autoBackupICloudHint'
                    : nativePlatform() === 'ios'
                      ? 'autoBackupDeviceHintIOS'
                      : 'autoBackupDeviceHint',
                )}
              </span>
            </Label>
            <Switch
              id="auto-backup"
              checked={Boolean(settings.autoBackupEnabled)}
              onCheckedChange={(checked) => void updateSettings({ autoBackupEnabled: checked })}
            />
          </div>
          {settings.autoBackupEnabled && (
            <>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{last ? t('lastBackup', { date: format(last, 'd MMM yyyy, HH:mm', { locale }) }) : t('noBackupYet')}</span>
                <Button variant="outline" size="sm" onClick={backupNow} disabled={busy !== null}>
                  {busy === 'backup' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-1.5 h-4 w-4" />}
                  {t('backupNow')}
                </Button>
              </div>
              {files.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    {t('restoreFromDate')}
                  </p>
                  {files.map((file) => (
                    <button
                      key={file.name}
                      type="button"
                      onClick={() => setToRestore(file)}
                      className="flex w-full items-center justify-between rounded-lg bg-secondary/20 px-3 py-2 text-left text-sm hover:bg-secondary/40"
                    >
                      <span className="capitalize">{fileLabel(file)}</span>
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="recap-notification" className="pr-2">
          <span className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            {t('monthlyRecapNotification')}
          </span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{t('monthlyRecapNotificationHint')}</span>
        </Label>
        <Switch
          id="recap-notification"
          checked={settings.monthlyRecapNotification !== false}
          onCheckedChange={(checked) => void updateSettings({ monthlyRecapNotification: checked })}
        />
      </div>

      <AlertDialog open={toRestore !== null} onOpenChange={(open) => !open && setToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('restoreFromDate')}</AlertDialogTitle>
            <AlertDialogDescription>
              {toRestore ? t('restoreBackupConfirm', { date: fileLabel(toRestore) }) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={restore} disabled={busy === 'restore'}>
              {t('restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
