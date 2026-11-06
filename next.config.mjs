/** @type {import('next').NextConfig} */
const nextConfig = {
  // solc is large and loads at runtime (used by /api/reset to redeploy); keep it unbundled.
  experimental: { serverComponentsExternalPackages: ["solc"] },
  webpack: (config) => {
    // RainbowKit/wagmi statically import the Coinbase "baseAccount" connector, which
    // drags in optional deps (@base-org/account → @coinbase/cdp-sdk → @x402/*) that
    // Next can't resolve. We don't use that wallet, so stub the unresolvable modules.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm/upto/client": false,
      "@base-org/account": false,
      "@coinbase/cdp-sdk": false,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};
export default nextConfig;
