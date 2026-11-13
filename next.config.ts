import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { hostname: "files.sportrz.com" },
      { hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
