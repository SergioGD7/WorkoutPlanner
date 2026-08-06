/**
 * GitHub Pages serves the app from https://<user>.github.io/WorkoutPlanner, so
 * every root-relative URL we write by hand needs this prefix. Next.js adds it
 * automatically to `next/link`, `next/image` and imported assets, but *not* to
 * metadata, the web app manifest or a plain `<a href>` — those use this module.
 *
 * `next.config.ts` reads `basePath` to configure the build and re-exports it as
 * `NEXT_PUBLIC_BASE_PATH`, so the two can't drift.
 *
 * Why two sources: `GITHUB_ACTIONS` is a plain server-side variable, and Next
 * only inlines `NEXT_PUBLIC_*` into client bundles. Without the public copy a
 * client component would silently compute an empty prefix and link to
 * `/privacy` instead of `/WorkoutPlanner/privacy`.
 */
export const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.GITHUB_ACTIONS ? '/WorkoutPlanner' : '');

/** Prefixes a root-relative path with the deployment base path. */
export function withBasePath(path: string): string {
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}
