/**
 * Progress photos. They never leave the device: no Firestore, no Storage. In
 * the apps they live in the app's private data directory (part of the iOS
 * device backup and of the app's own iCloud / device backup file); in a
 * browser, in IndexedDB. Everything is scoped by user id so two accounts on one
 * phone never see each other's photos.
 */
import { isNativeApp, lazyPlugin } from './native';

export type PhotoPose = 'front' | 'side' | 'back';
export const PHOTO_POSES: PhotoPose[] = ['front', 'side', 'back'];

export interface PhotoMeta {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  pose: PhotoPose;
}

export interface PhotoWithData extends PhotoMeta {
  /** Base64 JPEG, no data: prefix. */
  data: string;
}

const getFs = lazyPlugin(() => import('@capacitor/filesystem'));

/* ------------------------------- native ---------------------------------- */

const dirFor = (uid: string) => `progress-photos/${uid}`;

async function nativeReadIndex(uid: string): Promise<PhotoMeta[]> {
  const box = await getFs();
  if (!box) return [];
  const { Filesystem, Directory, Encoding } = box.plugin;
  try {
    const result = await Filesystem.readFile({ path: `${dirFor(uid)}/index.json`, directory: Directory.Data, encoding: Encoding.UTF8 });
    const parsed = JSON.parse(String(result.data));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function nativeWriteIndex(uid: string, index: PhotoMeta[]): Promise<void> {
  const box = await getFs();
  if (!box) return;
  const { Filesystem, Directory, Encoding } = box.plugin;
  await Filesystem.writeFile({
    path: `${dirFor(uid)}/index.json`,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    data: JSON.stringify(index),
    recursive: true,
  });
}

/* --------------------------------- web ----------------------------------- */

const DB_NAME = 'workout-planner-photos';
const STORE = 'photos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'key' });
      store.createIndex('uid', 'uid');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

type StoredPhoto = PhotoWithData & { key: string; uid: string };

/* --------------------------------- API ----------------------------------- */

export async function listPhotos(uid: string): Promise<PhotoMeta[]> {
  let photos: PhotoMeta[] = [];
  try {
    if (isNativeApp()) photos = await nativeReadIndex(uid);
    else {
      const rows = await idb<StoredPhoto[]>('readonly', (store) => store.index('uid').getAll(uid));
      photos = rows.map(({ id, date, pose }) => ({ id, date, pose }));
    }
  } catch (error) {
    console.error('Could not list photos:', error);
  }
  return photos.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export async function readPhoto(uid: string, id: string): Promise<string | null> {
  try {
    if (isNativeApp()) {
      const box = await getFs();
      if (!box) return null;
      const result = await box.plugin.Filesystem.readFile({ path: `${dirFor(uid)}/${id}.jpg`, directory: box.plugin.Directory.Data });
      return typeof result.data === 'string' ? result.data : null;
    }
    const row = await idb<StoredPhoto | undefined>('readonly', (store) => store.get(`${uid}/${id}`));
    return row?.data ?? null;
  } catch (error) {
    console.error('Could not read photo:', error);
    return null;
  }
}

export async function savePhoto(uid: string, photo: PhotoWithData): Promise<void> {
  if (isNativeApp()) {
    const box = await getFs();
    if (!box) throw new Error('Filesystem unavailable');
    await box.plugin.Filesystem.writeFile({
      path: `${dirFor(uid)}/${photo.id}.jpg`,
      directory: box.plugin.Directory.Data,
      data: photo.data,
      recursive: true,
    });
    const index = (await nativeReadIndex(uid)).filter((entry) => entry.id !== photo.id);
    await nativeWriteIndex(uid, [...index, { id: photo.id, date: photo.date, pose: photo.pose }]);
    return;
  }
  await idb('readwrite', (store) => store.put({ ...photo, key: `${uid}/${photo.id}`, uid } satisfies StoredPhoto));
}

export async function deletePhoto(uid: string, id: string): Promise<void> {
  if (isNativeApp()) {
    const box = await getFs();
    if (!box) return;
    await box.plugin.Filesystem.deleteFile({ path: `${dirFor(uid)}/${id}.jpg`, directory: box.plugin.Directory.Data }).catch(() => undefined);
    await nativeWriteIndex(uid, (await nativeReadIndex(uid)).filter((entry) => entry.id !== id));
    return;
  }
  await idb('readwrite', (store) => store.delete(`${uid}/${id}`));
}

/** Account deletion: every photo of this user on this device. */
export async function deleteAllPhotos(uid: string): Promise<void> {
  try {
    if (isNativeApp()) {
      const box = await getFs();
      if (!box) return;
      await box.plugin.Filesystem.rmdir({ path: dirFor(uid), directory: box.plugin.Directory.Data, recursive: true }).catch(() => undefined);
      return;
    }
    const photos = await listPhotos(uid);
    await Promise.all(photos.map((photo) => deletePhoto(uid, photo.id)));
  } catch (error) {
    console.error('Could not delete photos:', error);
  }
}

/** For the device / iCloud backup file. */
export async function exportPhotos(uid: string): Promise<PhotoWithData[]> {
  const photos = await listPhotos(uid);
  const withData = await Promise.all(
    photos.map(async (photo) => ({ ...photo, data: (await readPhoto(uid, photo.id)) ?? '' })),
  );
  return withData.filter((photo) => photo.data);
}

export async function importPhotos(uid: string, photos: { id: string; date: string; pose: string; data: string }[]): Promise<void> {
  for (const photo of photos) {
    const pose = (PHOTO_POSES as string[]).includes(photo.pose) ? (photo.pose as PhotoPose) : 'front';
    await savePhoto(uid, { id: photo.id, date: photo.date, pose, data: photo.data });
  }
}

/* ------------------------------- capture --------------------------------- */

const MAX_EDGE = 1280;

/** Downscales to MAX_EDGE and re-encodes as JPEG, returning base64 without prefix. */
export async function resizeToJpeg(source: Blob | string): Promise<string> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82).split(',')[1] ?? '';
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(url);
  }
}

const getCamera = lazyPlugin(() => import('@capacitor/camera'));

/**
 * Native: the system camera / photo picker. Returns null when cancelled or on
 * the web, where the caller uses a file input instead.
 */
export async function captureNative(promptLabels: { header: string; photo: string; picture: string; cancel: string }): Promise<string | null> {
  const box = await getCamera();
  if (!box) return null;
  const { Camera, CameraResultType, CameraSource } = box.plugin;
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      quality: 82,
      width: MAX_EDGE,
      correctOrientation: true,
      saveToGallery: false,
      promptLabelHeader: promptLabels.header,
      promptLabelPhoto: promptLabels.photo,
      promptLabelPicture: promptLabels.picture,
      promptLabelCancel: promptLabels.cancel,
    });
    return photo.base64String ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/cancel/i.test(message)) console.error('Camera failed:', error);
    return null;
  }
}
