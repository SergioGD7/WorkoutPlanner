import withPWAInit from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';
import { basePath } from './src/lib/base-path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deployed as a static site to GitHub Pages: no server at runtime.
  output: 'export',
  // Pages serves the app from a subdirectory; empty locally.
  ...(basePath && { basePath }),
};

const withPWA = withPWAInit({
  dest: 'public',
  // The dev server and the service worker fight over caching; only ship it in prod.
  disable: process.env.NODE_ENV === 'development',
  register: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

export default withPWA(nextConfig);
