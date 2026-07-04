import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'export',
  // Set basePath for GitHub Pages if running in GitHub Actions
  ...(process.env.GITHUB_ACTIONS && { basePath: '/WorkoutPlanner' }),
};

export default nextConfig;
