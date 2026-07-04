import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  const isGithub = process.env.GITHUB_ACTIONS;
  const baseUrl = isGithub ? 'https://sergiogd7.github.io/WorkoutPlanner' : '';

  return {
    name: 'Workout Planner',
    short_name: 'Workout',
    description: 'Track your gym progress with Workout Planner.',
    start_url: isGithub ? 'https://sergiogd7.github.io/WorkoutPlanner/' : '/',
    scope: isGithub ? 'https://sergiogd7.github.io/WorkoutPlanner/' : '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: `${baseUrl}/favicon.ico`,
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
