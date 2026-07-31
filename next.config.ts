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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deployed as a static site to GitHub Pages and embedded in the native shells.
  output: 'export',
  // Pages serves the app from a subdirectory; empty locally and on native.
  ...(basePath && !isNativeBuild && { basePath }),
  trailingSlash: isNativeBuild,
  env: {
    NEXT_PUBLIC_NATIVE: isNativeBuild ? '1' : '0',
  },
};

const withPWA = withPWAInit({
  dest: 'public',
  // The dev server and the service worker fight over caching; only ship it in prod.
  disable: process.env.NODE_ENV === 'development' || isNativeBuild,
  register: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

export default withPWA(nextConfig);
