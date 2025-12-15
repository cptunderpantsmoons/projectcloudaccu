/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'accu-platform.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000/api' : ''),
    NEXT_PUBLIC_APP_NAME: 'ACCU Platform',
  },
  webpack: (config, { isServer }) => {
    // Add support for other file extensions
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|svg)$/,
      type: 'asset/resource',
    });
    return config;
  },
};

module.exports = nextConfig;
