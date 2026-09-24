import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_SUPABASE_URL = 'https://ubjljepundgttrohrwou.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_bw6oAzB7PLadXfY3hcrMtQ_2l5SJasm'

type CatalogAsset = {
  id: string
  symbol: string
  asset_class: string
  market: string
  provider_symbol: string
}

function json(body: unknown, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers })
}

export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get('asset_id')?.trim() ?? ''
  if (!assetId || assetId.length > 64) return json({ error: 'asset_id is required' }, 400)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY
  const catalogUrl = new URL('/rest/v1/market_assets', supabaseUrl)
  catalogUrl.search = new URLSearchParams({
    select: 'id,symbol,asset_class,market,provider_symbol',
    id: `eq.${assetId}`,
    is_active: 'eq.true',
    limit: '1',
  }).toString()

  let asset: CatalogAsset | undefined
  try {
    const catalog = await fetch(catalogUrl, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (!catalog.ok) return json({ error: 'Asset catalog is temporarily unavailable', catalog_status: catalog.status }, 503)
    const rows = await catalog.json() as CatalogAsset[]
    asset = rows[0]
  } catch (cause) {
    return json({ error: 'Asset catalog is temporarily unavailable', catalog_error: cause instanceof Error ? cause.name : 'UnknownError' }, 503)
  }

  if (!asset?.provider_symbol) return json({ error: 'Active asset was not found' }, 404)
  const assetClass = asset.asset_class.toUpperCase()
  if (assetClass.includes('TREASURY') || assetClass.includes('YIELD') || assetClass.includes('FOREX') || assetClass.includes('CURRENCY')) {
    return json({ error: 'This instrument is not supported by the historical provider' }, 422)
  }
  const market = assetClass.includes('CRYPTO')
    ? 'crypto'
    : assetClass.includes('INDEX') || asset.symbol.toUpperCase() === 'IHSG'
      ? 'index'
      : 'equity'

  const apiUrl = process.env.MARKET_API_URL?.trim()
  const token = process.env.API_ACCESS_TOKEN?.trim()
  if (!apiUrl || !token) return json({ error: 'Historical service is not configured' }, 503)

  const end = new Date()
  const start = new Date(end.getTime() - 3_650 * 24 * 60 * 60 * 1000)
  const query = new URLSearchParams({
    market,
    symbol: asset.provider_symbol,
    provider: 'yfinance',
    interval: '1d',
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  })

  try {
    const upstreamUrl = new URL(`/api/v1/market/history?${query.toString()}`, apiUrl)
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(50_000),
    })
    if (!upstream.ok) {
      const status = upstream.status === 404 || upstream.status === 422 ? upstream.status : 502
      let providerType = 'UnknownError'
      try {
        const errorBody = await upstream.json() as { detail?: string }
        const match = errorBody.detail?.match(/\(([A-Za-z0-9_]+)\)\.?$/)
        if (match) providerType = match[1]
      } catch { /* do not expose untrusted upstream response bodies */ }
      return json({ error: 'Historical provider request failed', provider_status: upstream.status, provider_type: providerType }, status)
    }
    const body = await upstream.json()
    return json(body, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=900, stale-while-revalidate=86400' })
  } catch {
    return json({ error: 'Historical provider is temporarily unavailable' }, 502)
  }
}
