import type { NextConfig } from 'next';
import path from 'path';

const sharedPath = path.resolve(process.cwd(), '../shared');

const nextConfig: NextConfig = {
  transpilePackages: ['@backbone/shared'],
  turbopack: {
    root: path.resolve(process.cwd(), '..'),
    resolveAlias: {
      '@backbone/shared': sharedPath,
      '@backbone/shared/*': `${sharedPath}/*`,
    },
  },
  webpack: (config) => {
    config.resolve.alias['@backbone/shared'] = sharedPath;
    return config;
  },
};

export default nextConfig;
