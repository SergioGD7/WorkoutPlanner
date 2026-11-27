/**
 * Shared plumbing for Capacitor plugins.
 *
 * Every plugin is imported lazily, so the web bundle never pays for it and
 * Capacitor's bootstrap never runs during static generation. The plugin object
 * is returned boxed: Capacitor plugins are Proxies that turn any property read —
 * `.then` included — into a native call, so resolving a promise with one
 * directly makes it look like a thenable (see rest-notifications.ts).
 */

export type Box<T> = { plugin: T };

/** True inside the iOS or Android shell, false in a browser or during SSG. */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();
  return platform === 'ios' || platform === 'android' ? platform : 'web';
}

/**
 * Memoised lazy loader. Resolves to null on the web (unless `allowWeb`) or when
 * the import fails, so callers can treat "no plugin" as "feature unavailable".
 *
 * `pick` takes the plugin out of the loaded module *inside* the box. It must
 * never be returned from a `.then` callback or an async function on its own:
 * that would make the promise machinery probe the Proxy's `.then`, which turns
 * into a native call that never answers.
 */
export function lazyPlugin<M, T = M>(
  load: () => Promise<M>,
  pick?: (module: M) => T,
  { allowWeb = false } = {},
): () => Promise<Box<T> | null> {
  let promise: Promise<Box<T> | null> | null = null;
  return () => {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!allowWeb && !isNativeApp()) return Promise.resolve(null);
    promise ??= load()
      .then((module): Box<T> => ({ plugin: pick ? pick(module) : (module as unknown as T) }))
      .catch((error) => {
        console.error('Native plugin unavailable:', error);
        return null;
      });
    return promise;
  };
}

/**
 * Custom plugins shipped by the iOS and Android shells themselves (Live
 * Activity, widgets, Health, iCloud). They are registered natively under these
 * names; on the web, or in an older shell that lacks one, `registerPlugin`
 * returns a stub whose calls reject with "not implemented".
 */
export function customPlugin<T>(name: string): () => Promise<Box<T> | null> {
  return lazyPlugin(
    () => import('@capacitor/core'),
    (core) => core.registerPlugin<T>(name),
  );
}

/** Runs a native call and swallows "not implemented" so older shells keep working. */
export async function callNative<T, R>(
  getter: () => Promise<Box<T> | null>,
  run: (plugin: T) => Promise<R>,
): Promise<R | null> {
  const box = await getter();
  if (!box) return null;
  try {
    return await run(box.plugin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/not implemented|UNIMPLEMENTED/i.test(message)) console.warn('Native call failed:', message);
    return null;
  }
}
