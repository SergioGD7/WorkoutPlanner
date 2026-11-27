/**
 * The rest countdown outside the app: a Live Activity on the iPhone lock screen
 * and Dynamic Island (iOS 16.1+, with −15 s / +15 s / Skip buttons on iOS 17+),
 * and an ongoing notification with a live countdown and the same buttons on
 * Android.
 *
 * The buttons work without opening the app: the shell moves the countdown and
 * re-books the "rest over" alert itself. When the app comes back it asks the
 * shell for the current end time and follows it (`getState`), and the shell
 * also emits `restChanged` while the app is alive.
 */
import { callNative, customPlugin } from './native';

export interface RestActivityTexts {
  /** Exercise name, or the generic title. */
  label: string;
  /** "Rest" — the activity's heading. */
  title: string;
  skipLabel: string;
  /** The alert the shell posts if it has to re-book it. */
  alertTitle: string;
  alertBody: string;
}

interface RestActivityPlugin {
  start(options: RestActivityTexts & { endsAt: number; total: number }): Promise<void>;
  update(options: { endsAt: number; total: number }): Promise<void>;
  end(): Promise<void>;
  getState(): Promise<{ endsAt: number | null }>;
  addListener(
    event: 'restChanged',
    listener: (state: { endsAt: number | null }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const getPlugin = customPlugin<RestActivityPlugin>('WPRestActivity');

export function startRestActivity(endsAt: number, total: number, texts: RestActivityTexts): void {
  void callNative(getPlugin, (plugin) => plugin.start({ endsAt, total, ...texts }));
}

export function updateRestActivity(endsAt: number, total: number): void {
  void callNative(getPlugin, (plugin) => plugin.update({ endsAt, total }));
}

export function endRestActivity(): void {
  void callNative(getPlugin, (plugin) => plugin.end());
}

/** Where the shell thinks the countdown ends; undefined when there is no shell. */
export async function readRestActivityState(): Promise<number | null | undefined> {
  const state = await callNative(getPlugin, (plugin) => plugin.getState());
  return state === null ? undefined : state.endsAt;
}

export async function onRestActivityChanged(listener: (endsAt: number | null) => void): Promise<() => void> {
  const handle = await callNative(getPlugin, (plugin) =>
    plugin.addListener('restChanged', (state) => listener(state.endsAt ?? null)),
  );
  return () => void handle?.remove();
}
