"use client";

/* eslint-disable @next/next/no-img-element -- local data: URLs, nothing for next/image to optimise */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Camera, ChevronRight, Columns2, ImagePlus, Loader2, Lock, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import BottomSheet from '@/components/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import { isNativeApp } from '@/lib/native';
import {
  PHOTO_POSES,
  captureNative,
  deletePhoto,
  listPhotos,
  readPhoto,
  resizeToJpeg,
  savePhoto,
  type PhotoMeta,
  type PhotoPose,
} from '@/lib/photo-store';

/** Loads a photo's data lazily and keeps it while mounted. */
function usePhotoSrc(uid: string | undefined, id: string | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!uid || !id) return;
    void readPhoto(uid, id).then((data) => {
      if (!cancelled && data) setSrc(`data:image/jpeg;base64,${data}`);
    });
    return () => {
      cancelled = true;
    };
  }, [uid, id]);
  return src;
}

function Thumb({ uid, photo, onClick, className = '' }: { uid: string; photo: PhotoMeta; onClick?: () => void; className?: string }) {
  const src = usePhotoSrc(uid, photo.id);
  return (
    <button type="button" onClick={onClick} className={`relative overflow-hidden rounded-xl bg-secondary/30 ${className}`}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Loader2 className="m-auto h-4 w-4 animate-spin text-muted-foreground" />}
    </button>
  );
}

/** Before/after with a draggable divider. */
function CompareSlider({ uid, before, after, labels }: { uid: string; before: PhotoMeta; after: PhotoMeta; labels: [string, string] }) {
  const beforeSrc = usePhotoSrc(uid, before.id);
  const afterSrc = usePhotoSrc(uid, after.id);
  const [position, setPosition] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);

  const moveTo = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      ref={boxRef}
      className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-2xl bg-secondary/30"
      onPointerDown={(event) => {
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => event.buttons > 0 && moveTo(event.clientX)}
    >
      {afterSrc && <img src={afterSrc} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
      {beforeSrc && (
        <img
          src={beforeSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          draggable={false}
        />
      )}
      <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,.6)]" style={{ left: `${position}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
          <Columns2 className="h-4 w-4" />
        </div>
      </div>
      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">{labels[0]}</span>
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">{labels[1]}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="sr-only"
        aria-label="Compare"
      />
    </div>
  );
}

export default function ProgressPhotosCard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = user?.uid;
  const locale = language === 'es' ? es : enUS;
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pose, setPose] = useState<PhotoPose>('front');
  const [mode, setMode] = useState<'grid' | 'compare'>('grid');
  const [selected, setSelected] = useState<PhotoMeta | null>(null);
  const [compare, setCompare] = useState<[string, string] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (uid) setPhotos(await listPhotos(uid));
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const forPose = useMemo(() => photos.filter((photo) => photo.pose === pose), [photos, pose]);
  const dateLabel = (date: string) => format(parseISO(date), 'd MMM yyyy', { locale });

  useEffect(() => {
    // Default comparison: first and latest photo of the pose.
    if (forPose.length >= 2) setCompare([forPose[forPose.length - 1].id, forPose[0].id]);
    else setCompare(null);
  }, [forPose]);

  const store = async (base64: string) => {
    if (!uid || !base64) return;
    setIsSaving(true);
    try {
      await savePhoto(uid, { id: uuidv4(), date: format(new Date(), 'yyyy-MM-dd'), pose, data: base64 });
      await refresh();
    } catch (error) {
      console.error('Saving photo failed:', error);
      toast({ variant: 'destructive', title: t('error'), description: t('unknownError') });
    } finally {
      setIsSaving(false);
    }
  };

  const addPhoto = async () => {
    if (isNativeApp()) {
      const base64 = await captureNative({
        header: t('addPhoto'),
        photo: t('fromGallery'),
        picture: t('takePhoto'),
        cancel: t('cancel'),
      });
      if (base64) await store(base64);
      return;
    }
    fileRef.current?.click();
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await store(await resizeToJpeg(file));
  };

  const remove = async (photo: PhotoMeta) => {
    if (!uid) return;
    await deletePhoto(uid, photo.id);
    setSelected(null);
    await refresh();
  };

  const byId = (id: string) => photos.find((photo) => photo.id === id);
  const latest = photos.slice(0, 3);

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(event) => event.key === 'Enter' && setIsOpen(true)}
        className="glass-effect cursor-pointer border-primary/20 transition-colors hover:border-primary/50"
      >
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-headline text-lg font-bold">
              <Camera className="h-5 w-5 text-primary" />
              {t('progressPhotos')}
            </p>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {uid && latest.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {latest.map((photo) => (
                <Thumb key={photo.id} uid={uid} photo={photo} className="aspect-[3/4] w-full" />
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {t('progressPhotosPrivacy')}
            </p>
          )}
        </CardContent>
      </Card>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

      <BottomSheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSelected(null);
        }}
        title={t('progressPhotos')}
        heightClass="h-[90vh]"
        footer={
          <Button className="w-full rounded-full" onClick={addPhoto} disabled={isSaving || !uid}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {t('addPhotoOfPose', { pose: t(`pose_${pose}`).toLowerCase() })}
          </Button>
        }
      >
        <div className="space-y-4 pb-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/30 p-1">
            {PHOTO_POSES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setPose(option);
                  setSelected(null);
                }}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  pose === option ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {t(`pose_${option}`)}
              </button>
            ))}
          </div>

          {forPose.length >= 2 && (
            <div className="flex gap-2">
              <Button size="sm" variant={mode === 'grid' ? 'default' : 'outline'} className="flex-1 rounded-full" onClick={() => setMode('grid')}>
                {t('allPhotos')}
              </Button>
              <Button size="sm" variant={mode === 'compare' ? 'default' : 'outline'} className="flex-1 rounded-full" onClick={() => setMode('compare')}>
                <Columns2 className="mr-1.5 h-4 w-4" />
                {t('compare')}
              </Button>
            </div>
          )}

          {!uid ? null : mode === 'compare' && compare && byId(compare[0]) && byId(compare[1]) ? (
            <div className="space-y-3">
              <CompareSlider
                uid={uid}
                before={byId(compare[0])!}
                after={byId(compare[1])!}
                labels={[dateLabel(byId(compare[0])!.date), dateLabel(byId(compare[1])!.date)]}
              />
              <div className="grid grid-cols-2 gap-2">
                {([0, 1] as const).map((slot) => (
                  <select
                    key={slot}
                    value={compare[slot]}
                    onChange={(event) =>
                      setCompare((previous) => {
                        if (!previous) return previous;
                        const next: [string, string] = [...previous];
                        next[slot] = event.target.value;
                        return next;
                      })
                    }
                    className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
                    aria-label={slot === 0 ? t('before') : t('after')}
                  >
                    {forPose.map((photo) => (
                      <option key={photo.id} value={photo.id}>
                        {dateLabel(photo.date)}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          ) : selected ? (
            <div className="space-y-3">
              <Thumb uid={uid} photo={selected} onClick={() => setSelected(null)} className="aspect-[3/4] w-full" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{dateLabel(selected.date)}</p>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(selected)}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {t('delete')}
                </Button>
              </div>
            </div>
          ) : forPose.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p>{t('noPhotosYet')}</p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs">
                <Lock className="h-3 w-3" />
                {t('progressPhotosPrivacy')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {forPose.map((photo) => (
                <div key={photo.id} className="space-y-1">
                  <Thumb uid={uid} photo={photo} onClick={() => setSelected(photo)} className="aspect-[3/4] w-full" />
                  <p className="text-center text-[11px] text-muted-foreground">{dateLabel(photo.date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
