import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true'
const repository = 'equityinsight'

// GitHub Pages is a static export; the authenticated historical-data proxy is a
// Vercel-only runtime route, so omit it from the static build.
if (isGitHubPages) {
  rmSync(resolve(process.cwd(), 'app/quant-api'), { recursive: true, force: true })
}

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
