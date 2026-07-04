import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Workout Planner',
    short_name: 'Workout',
    description: 'Track your gym progress with Workout Planner.',
    start_url: process.env.GITHUB_ACTIONS ? '/WorkoutPlanner/' : '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
