/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pod/tools', '@pod/db'],
};

export default nextConfig;
