/**
 * The native "Rate this app" prompt (StoreKit on iOS, Play In-App Review on
 * Android), through the shells' own WPReview plugin. Asked only after finishing
 * a workout, once there are five behind you, and at most every four months; the
 * OS applies its own quota on top and may show nothing at all, which is expected.
 */
import { callNative, customPlugin } from './native';

interface ReviewPlugin {
  /**
   * `skipped` says the store would never show the sheet here: a TestFlight
   * build on iOS, or an Android install that didn't come from Google Play.
   */
  requestReview(): Promise<{ skipped?: 'testflight' | 'not-play-store' }>;
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
    const result = await callNative(getReview, (plugin) => plugin.requestReview());
    // Test builds never show the sheet; don't let them start the cooldown, or
    // the tester's own device would wait months once the store version lands.
    if (result && !result.skipped) localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch (error) {
    console.warn('In-app review unavailable:', error);
  }
}
