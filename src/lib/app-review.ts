/**
 * The native "Rate this app" prompt (SKStoreReviewController / Play In-App
 * Review). Asked only after finishing a workout, once there are five behind
 * you, and at most every four months; the OS applies its own quota on top and
 * may show nothing at all, which is expected.
 */
import { lazyPlugin } from './native';

const getReview = lazyPlugin(() => import('@capacitor-community/in-app-review'), (m) => m.InAppReview);

const STORAGE_KEY = 'appReview.lastAskedAt';
const MIN_WORKOUTS = 5;
const COOLDOWN_DAYS = 120;

export async function maybeRequestReview(completedWorkouts: number): Promise<void> {
  if (completedWorkouts < MIN_WORKOUTS) return;
  try {
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    if (last && Date.now() - last < COOLDOWN_DAYS * 86_400_000) return;
    const box = await getReview();
    if (!box) return;
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    await box.plugin.requestReview();
  } catch (error) {
    console.warn('In-app review unavailable:', error);
  }
}
