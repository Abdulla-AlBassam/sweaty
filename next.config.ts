import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from IGDB's CDN and Supabase Storage
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.igdb.com',
        pathname: '/igdb/image/upload/**',
      },
      {
        protocol: 'https',
        hostname: 'onsmlscqlhpvltuwedzi.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
