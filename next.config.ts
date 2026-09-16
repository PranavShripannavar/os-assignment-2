import type { NextConfig } from 'next';
const config: NextConfig = { experimental: { turbopackFileSystemCacheForBuild: false, turbopackFileSystemCacheForDev: false } };
export default config;
