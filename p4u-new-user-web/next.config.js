/** @type {import('next').NextConfig} */
/** @type {import('next').NextConfig} */
// GitHub Pages needs /p4u; `next dev` uses no basePath so http://localhost:3000/ works.
const useGhPagesBase = process.env.NODE_ENV === 'production';

const nextConfig = {
  // output: 'export' removed — dynamic API-driven routes require server rendering
  basePath: useGhPagesBase ? '/p4u' : '',
  assetPrefix: useGhPagesBase ? '/p4u/' : '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack(config) {
    config.module.rules.push({
      test: /\.(mp4|webm|ogg)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[name].[hash][ext]',
      },
    });
    return config;
  },
};

module.exports = nextConfig;