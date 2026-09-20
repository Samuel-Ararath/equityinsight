/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const repository = 'equityinsight'

const nextConfig = {
  ...(isGitHubPages ? { output: 'export', basePath: `/${repository}`, assetPrefix: `/${repository}/`, trailingSlash: true } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
