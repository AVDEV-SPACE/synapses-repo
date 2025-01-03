import path from 'path';

/** @type {import("next").NextConfig} */
const config = {
  webpack(config, options) {
    // Adăugăm alias-ul pentru '@'
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
