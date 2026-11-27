/**
 * Saving and sharing files from the app.
 *
 * In a browser a file is "saved" by clicking an `<a download>` link. Inside the
 * Capacitor shells that does nothing at all: neither WKWebView nor Android's
 * WebView hands a download to the system, so the tap is silently dropped. On
 * native the file is written to the app's cache and handed to the share sheet
 * instead, which offers "Save to Files", Drive, Mail, AirDrop and so on.
 */
import { isNativeApp, lazyPlugin } from './native';

const getFilesystem = lazyPlugin(() => import('@capacitor/filesystem'));
const getShare = lazyPlugin(() => import('@capacitor/share').then((m) => m.Share));

export type ExportResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

type ExportInput = {
  filename: string;
  /** Text content, or a Blob for binary files such as images. */
  data: string | Blob;
  mimeType: string;
  /** Title of the share sheet on native. */
  title?: string;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function isCancel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|abort/i.test(message);
}

function downloadInBrowser({ filename, data, mimeType }: ExportInput): ExportResult {
  const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** Writes the file to the cache directory and returns its native URI. */
export async function writeCacheFile(filename: string, data: string | Blob): Promise<string | null> {
  const fsBox = await getFilesystem();
  if (!fsBox) return null;
  const { Filesystem, Directory, Encoding } = fsBox.plugin;
  const written =
    typeof data === 'string'
      ? await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, encoding: Encoding.UTF8 })
      : await Filesystem.writeFile({ path: filename, data: await blobToBase64(data), directory: Directory.Cache });
  return written.uri;
}

/** Save (web) or share (native) a file. Never throws. */
export async function exportFile(input: ExportInput): Promise<ExportResult> {
  try {
    if (!isNativeApp()) return downloadInBrowser(input);

    const uri = await writeCacheFile(input.filename, input.data);
    const shareBox = await getShare();
    if (!uri || !shareBox) return 'failed';
    await shareBox.plugin.share({ title: input.title ?? input.filename, files: [uri], dialogTitle: input.title });
    return 'shared';
  } catch (error) {
    if (isCancel(error)) return 'cancelled';
    console.error('File export failed:', error);
    return 'failed';
  }
}

/**
 * Share an image (a workout ticket, a monthly recap). Uses the Web Share API
 * where it accepts files, the native share sheet in the shells, and a plain
 * download as a last resort.
 */
export async function shareImage(blob: Blob, filename: string, title: string): Promise<ExportResult> {
  if (isNativeApp()) return exportFile({ filename, data: blob, mimeType: 'image/png', title });

  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      if (isCancel(error)) return 'cancelled';
    }
  }
  return downloadInBrowser({ filename, data: blob, mimeType: 'image/png' });
}

/** RFC 4180 CSV with a BOM so Excel opens accents correctly. */
export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.map(escape).join(','), ...rows.map((row) => headers.map((h) => escape(row[h] ?? '')).join(','))];
  return '﻿' + lines.join('\r\n');
}
