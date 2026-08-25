import withPWAInit from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';
import { basePath } from './src/lib/base-path';

/**
 * `CAPACITOR_BUILD=1 npm run build` produces the bundle the iOS and Android
 * shells embed. It differs from the web build in two ways:
 *
 * - No service worker. Inside a WebView the app is already served from disk, and
 *   a Workbox worker on the `capacitor://` origin only causes stale assets.
 * - Trailing slashes, so `/settings` is emitted as `settings/index.html` and the
 *   WebView's file lookup resolves it without a server rewrite.
 */
const isNativeBuild = process.env.CAPACITOR_BUILD === '1';

/** Empty for the native shells, which serve the bundle from the device root. */
const effectiveBasePath = isNativeBuild ? '' : basePath;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deployed as a static site to GitHub Pages and embedded in the native shells.
  output: 'export',
  // Pages serves the app from a subdirectory; empty locally and on native.
  ...(effectiveBasePath && { basePath: effectiveBasePath }),
  trailingSlash: isNativeBuild,
  env: {
    NEXT_PUBLIC_NATIVE: isNativeBuild ? '1' : '0',
    // Client components cannot read GITHUB_ACTIONS: Next only inlines
    // NEXT_PUBLIC_*. Without this an <a href> built by `withBasePath` would drop
    // the prefix and 404 on Pages.
    NEXT_PUBLIC_BASE_PATH: effectiveBasePath,
  },
};

const withPWA = withPWAInit({
  dest: 'public',
  // The dev server and the service worker fight over caching; only ship it in prod.
  disable: process.env.NODE_ENV === 'development' || isNativeBuild,
  register: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  /**
   * Keep the exercise artwork out of the precache.
   *
   * There are 906 of these and they total ~25 MB. Precaching means downloading
   * every one the first time someone opens the app, to show a handful — and no
   * routine touches 302 exercises. They are cached on the way past instead, by
   * the CacheFirst rule below.
   *
   * The default entry is repeated because this replaces the list rather than
   * adding to it.
   */
  publicExcludes: ['!noprecache/**/*', '!exercises/**/*'],
  aggressiveFrontEndNavCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // Immutable by construction: the files are copied byte-for-byte and a
        // change would arrive under a new path, so served-from-cache is always
        // correct and never needs revalidating.
        urlPattern: /\/exercises\/.*\.svg$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'exercise-illustrations',
          expiration: {
            // Comfortably more than any real routine, and far less than all 906.
            maxEntries: 300,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

export default withPWA(nextConfig);
