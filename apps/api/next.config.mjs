/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pod/agents', '@pod/tools', '@pod/db'],
};

export default nextConfig;
