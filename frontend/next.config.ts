import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@backbone/shared'],
  webpack: (config) => {
    config.resolve.alias['@backbone/shared'] = path.resolve(
      process.cwd(),
      '../shared',
    );
    return config;
  },
};

export default nextConfig;
