import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseStorageUrl = supabaseUrl ? new URL(supabaseUrl) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseStorageUrl
      ? [{
        protocol: supabaseStorageUrl.protocol === "http:" ? "http" : "https",
        hostname: supabaseStorageUrl.hostname,
        port: supabaseStorageUrl.port,
        pathname: "/storage/v1/object/public/listing-images/**",
      }]
      : [],
  },
};

export default nextConfig;
