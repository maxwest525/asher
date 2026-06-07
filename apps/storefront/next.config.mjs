/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are TypeScript source; let Next transpile them.
  transpilePackages: ['@pod/tools', '@pod/db'],
};

export default nextConfig;
