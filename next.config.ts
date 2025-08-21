import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Keep terminal logs persistent
  onDemandEntries: {
    // page buffers
    maxInactiveAge: 25 * 1000,
    // pages
    pagesBufferLength: 2,
  },
};

export default nextConfig;
