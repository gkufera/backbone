import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ['@backbone/shared'],
  webpack: (config) => {
    config.resolve.alias['@backbone/shared'] = path.resolve(__dirname, '../shared');
    return config;
  },
};

export default nextConfig;
