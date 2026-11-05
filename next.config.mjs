/** @type {import('next').NextConfig} */
const nextConfig = {
  // solc is large and loads at runtime (used by /api/reset to redeploy); keep it unbundled.
  experimental: { serverComponentsExternalPackages: ["solc"] },
};
export default nextConfig;
