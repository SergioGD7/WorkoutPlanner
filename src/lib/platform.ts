/**
 * Runtime platform detection for the shared web codebase.
 *
 * The same build runs as a PWA in the browser and inside the Capacitor WebView
 * of the iOS and Android apps. A few behaviours have to differ, and Capacitor
 * exposes itself on `window.Capacitor`, so we can branch without pulling the
 * Capacitor packages into the web build.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  isNative?: boolean;
  getPlatform?: () => string;
}

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True inside the iOS or Android shell, false in any browser. */
export function isNativeApp(): boolean {
  // Set by the native repos at build time; covers the first render before
  // hydration, when `window.Capacitor` has not been evaluated yet.
  if (process.env.NEXT_PUBLIC_NATIVE === '1') return true;

  const cap = capacitor();
  if (!cap) return false;
  return Boolean(cap.isNativePlatform?.() ?? cap.isNative);
}

export type AppPlatform = 'ios' | 'android' | 'web';

export function getPlatform(): AppPlatform {
  const platform = capacitor()?.getPlatform?.();
  if (platform === 'ios' || platform === 'android') return platform;
  return 'web';
}

/**
 * Firebase's `signInWithPopup` needs a real browser popup, which a WebView does
 * not provide, and `signInWithRedirect` loses the result on the custom scheme.
 * Google sign-in therefore needs the native Firebase SDK (see the README of the
 * platform repos) and is hidden until that is wired up.
 */
export function supportsGooglePopupSignIn(): boolean {
  return !isNativeApp();
}
