/**
 * Weekly automatic backup.
 *
 * iOS: a JSON file in the app's iCloud Drive folder (visible in Files ›
 * iCloud Drive › Workout Planner), through the shell's WPCloudBackup plugin.
 * When iCloud is off it falls back to the app's private folder, which the
 * iPhone's own iCloud backup already includes.
 * Android: the app's private folder, which Android Auto Backup copies to the
 * user's Google Drive.
 *
 * The last eight copies are kept; any of them can be restored by date.
 */
import { format } from 'date-fns';
import { callNative, customPlugin, lazyPlugin, nativePlatform } from './native';

export const KEEP_BACKUPS = 8;
const INTERVAL_MS = 7 * 86_400_000;

export interface BackupFile {
  name: string;
  /** ISO timestamp. */
  modifiedAt: string;
  size: number;
}

interface CloudBackupPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  write(options: { folder: string; name: string; json: string }): Promise<void>;
  list(options: { folder: string }): Promise<{ files: BackupFile[] }>;
  read(options: { folder: string; name: string }): Promise<{ json: string }>;
  remove(options: { folder: string; name: string }): Promise<void>;
}

const getCloud = customPlugin<CloudBackupPlugin>('WPCloudBackup');
const getFs = lazyPlugin(() => import('@capacitor/filesystem'));

export type BackupTarget = 'icloud' | 'device' | null;

export async function backupTarget(): Promise<BackupTarget> {
  const platform = nativePlatform();
  if (platform === 'web') return null;
  if (platform === 'ios') {
    const result = await callNative(getCloud, (plugin) => plugin.isAvailable());
    if (result?.available) return 'icloud';
  }
  return (await getFs()) ? 'device' : null;
}

const folderFor = (uid: string) => `backups/${uid}`;

async function deviceList(uid: string): Promise<BackupFile[]> {
  const box = await getFs();
  if (!box) return [];
  try {
    const result = await box.plugin.Filesystem.readdir({ path: folderFor(uid), directory: box.plugin.Directory.Data });
    return result.files
      .filter((file) => file.name.endsWith('.json'))
      .map((file) => ({ name: file.name, modifiedAt: new Date(Number(file.mtime)).toISOString(), size: Number(file.size) }));
  } catch {
    return [];
  }
}

export async function listBackups(uid: string): Promise<BackupFile[]> {
  const target = await backupTarget();
  let files: BackupFile[] = [];
  if (target === 'icloud') files = (await callNative(getCloud, (plugin) => plugin.list({ folder: uid })))?.files ?? [];
  else if (target === 'device') files = await deviceList(uid);
  return files.sort((a, b) => (a.name < b.name ? 1 : -1));
}

export async function readBackup(uid: string, name: string): Promise<string | null> {
  const target = await backupTarget();
  if (target === 'icloud') return (await callNative(getCloud, (plugin) => plugin.read({ folder: uid, name })))?.json ?? null;
  const box = await getFs();
  if (!box) return null;
  try {
    const result = await box.plugin.Filesystem.readFile({
      path: `${folderFor(uid)}/${name}`,
      directory: box.plugin.Directory.Data,
      encoding: box.plugin.Encoding.UTF8,
    });
    return String(result.data);
  } catch {
    return null;
  }
}

async function removeBackup(target: BackupTarget, uid: string, name: string): Promise<void> {
  if (target === 'icloud') {
    await callNative(getCloud, (plugin) => plugin.remove({ folder: uid, name }));
    return;
  }
  const box = await getFs();
  await box?.plugin.Filesystem.deleteFile({ path: `${folderFor(uid)}/${name}`, directory: box.plugin.Directory.Data }).catch(() => undefined);
}

const lastKey = (uid: string) => `autoBackup.last.${uid}`;

export function lastBackupAt(uid: string): number {
  try {
    return Number(localStorage.getItem(lastKey(uid)) ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Writes a backup if the last one is a week old (or `force`), then prunes to
 * the newest eight. `buildJson` is only called when a backup is due, since it
 * reads every photo off disk.
 */
export async function runAutoBackup(uid: string, buildJson: () => Promise<string>, force = false): Promise<BackupFile | null> {
  if (!force && Date.now() - lastBackupAt(uid) < INTERVAL_MS) return null;
  const target = await backupTarget();
  if (!target) return null;

  const name = `workout-planner-${format(new Date(), 'yyyy-MM-dd')}.json`;
  const json = await buildJson();
  if (target === 'icloud') {
    await callNative(getCloud, (plugin) => plugin.write({ folder: uid, name, json }));
  } else {
    const box = await getFs();
    if (!box) return null;
    await box.plugin.Filesystem.writeFile({
      path: `${folderFor(uid)}/${name}`,
      directory: box.plugin.Directory.Data,
      encoding: box.plugin.Encoding.UTF8,
      data: json,
      recursive: true,
    });
  }
  try {
    localStorage.setItem(lastKey(uid), String(Date.now()));
  } catch {
    // Private mode: the next launch simply backs up again.
  }

  const files = await listBackups(uid);
  for (const stale of files.slice(KEEP_BACKUPS)) await removeBackup(target, uid, stale.name);
  return files.find((file) => file.name === name) ?? { name, modifiedAt: new Date().toISOString(), size: json.length };
}

/** Account deletion: every automatic copy, in iCloud Drive and on the device. */
export async function deleteLocalBackups(uid: string): Promise<void> {
  if ((await backupTarget()) === 'icloud') {
    for (const file of await listBackups(uid)) await removeBackup('icloud', uid, file.name);
  }
  const box = await getFs();
  await box?.plugin.Filesystem.rmdir({ path: folderFor(uid), directory: box.plugin.Directory.Data, recursive: true }).catch(() => undefined);
  try {
    localStorage.removeItem(lastKey(uid));
  } catch {
    // Nothing to clear.
  }
}

/** `workout-planner-2026-11-27.json` → `2026-11-27`. */
export function backupDate(name: string): string | null {
  return name.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}
