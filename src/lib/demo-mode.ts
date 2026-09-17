/**
 * The sample account is a development tool: it drives the store screenshots
 * and lets the app be explored without a Firebase project. It is never
 * offered to end users, so the entry point only exists in builds that opt in
 * with `NEXT_PUBLIC_DEMO_MODE=1` (read at build time; Next inlines it).
 */
export const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
