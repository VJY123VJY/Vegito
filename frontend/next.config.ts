/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  // Keep static Android builds reliable on Windows environments where the
  // separate webpack build worker cannot be spawned.
  experimental: {
    webpackBuildWorker: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Enable PWA in production via manual service worker in /public
  // To enable @serwist/next, install it separately and configure here
};

export default nextConfig;
