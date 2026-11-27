/**
 * The native "Rate this app" prompt (StoreKit on iOS, Play In-App Review on
 * Android), through the shells' own WPReview plugin. Asked only after finishing
 * a workout, once there are five behind you, and at most every four months; the
 * OS applies its own quota on top and may show nothing at all, which is expected.
 */
import { callNative, customPlugin } from './native';

interface ReviewPlugin {
  requestReview(): Promise<void>;
}

const getReview = customPlugin<ReviewPlugin>('WPReview');

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
    await callNative(getReview, (plugin) => plugin.requestReview());
  } catch (error) {
    console.warn('In-app review unavailable:', error);
  }
}
