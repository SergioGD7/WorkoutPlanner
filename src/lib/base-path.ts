/**
 * GitHub Pages serves the app from https://<user>.github.io/WorkoutPlanner, so
 * every root-relative asset URL needs this prefix. Next.js adds it automatically
 * to `next/link`, `next/image` and imported assets, but *not* to URLs we write
 * by hand in metadata or the web app manifest — those use this constant.
 *
 * Also consumed by next.config.ts to set `basePath`, so the two can't drift.
 */
export const basePath = process.env.GITHUB_ACTIONS ? '/WorkoutPlanner' : '';

/** Prefixes a root-relative path with the deployment base path. */
export function withBasePath(path: string): string {
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}
