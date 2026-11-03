
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    domains: ['files.sportrz.com', 'res.cloudinary.com'],
  },
};

export default nextConfig;
