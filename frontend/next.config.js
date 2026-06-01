/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Support output standalone or default builds in Docker Compose
  webpack: (config) => {
    // Polling file changes for HMR inside docker containers on Windows
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
};

module.exports = nextConfig;
