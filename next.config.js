/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow server actions for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
