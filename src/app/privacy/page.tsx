import type { Metadata } from 'next';
import PrivacyPolicy from './privacy-policy';

/**
 * Public privacy policy. Both stores refuse a listing without a reachable URL,
 * so it lives inside the app and ships with the existing GitHub Pages deploy:
 * https://sergiogd7.github.io/WorkoutPlanner/privacy
 *
 * The text itself is in the client component, which shows one language at a
 * time — the app's own, or whatever `?lang=` pins for a per-locale store
 * listing. This file only carries the metadata a server component can export.
 */
export const metadata: Metadata = {
  title: 'Privacidad · Privacy · Workout Planner',
  description: 'Política de privacidad de Workout Planner / Workout Planner privacy policy.',
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
