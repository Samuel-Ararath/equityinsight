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

type YahooCandle = {
  candle_time: string
  open: number
  high: number
  low: number
  close: number
  adjusted_close: number | null
  volume: number | null
  provider: string
  is_delayed: true
}

async function fetchYahooHistory(asset: CatalogAsset, market: string, start: Date, end: Date) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.provider_symbol)}`)
  url.search = new URLSearchParams({
    period1: String(Math.floor(start.getTime() / 1000)),
    period2: String(Math.floor((end.getTime() + 24 * 60 * 60 * 1000) / 1000)),
    interval: '1d',
    events: 'div,splits',
    includeAdjustedClose: 'true',
  }).toString()
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EquityInsight/1.0)', Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error('Yahoo history unavailable')
  const payload = await response.json() as {
    chart?: {
      result?: Array<{
        timestamp?: number[]
        indicators?: {
          quote?: Array<{ open?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>; close?: Array<number | null>; volume?: Array<number | null> }>
          adjclose?: Array<{ adjclose?: Array<number | null> }>
        }
      }>
    }
  }
  const result = payload.chart?.result?.[0]
  const timestamps = result?.timestamp ?? []
  const quote = result?.indicators?.quote?.[0]
  if (!timestamps.length || !quote) throw new Error('Yahoo returned no daily candles')
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose ?? []
  const candles: YahooCandle[] = []
  for (let i = 0; i < timestamps.length; i += 1) {
    const open = quote.open?.[i]
    const high = quote.high?.[i]
    const low = quote.low?.[i]
    const close = quote.close?.[i]
    if (![open, high, low, close].every((value) => typeof value === 'number' && Number.isFinite(value)) || !close || close <= 0) continue
    candles.push({
      candle_time: new Date(timestamps[i] * 1000).toISOString(),
      open: open as number,
      high: high as number,
      low: low as number,
      close: close as number,
      adjusted_close: typeof adjusted[i] === 'number' && Number.isFinite(adjusted[i]) ? adjusted[i]! : null,
      volume: typeof quote.volume?.[i] === 'number' && Number.isFinite(quote.volume[i]) ? quote.volume[i]! : null,
      provider: 'yfinance',
      is_delayed: true,
    })
  }
  if (!candles.length) throw new Error('Yahoo returned no valid daily candles')
  return {
    market,
    symbol: asset.provider_symbol,
    provider: 'yfinance',
    mode: 'historical',
    delayed: true,
    data_as_of: candles[candles.length - 1].candle_time,
    candles,
  }
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
    if (!catalog.ok) return json({ error: 'Asset catalog is temporarily unavailable' }, 503)
    const rows = await catalog.json() as CatalogAsset[]
    asset = rows[0]
  } catch {
    return json({ error: 'Asset catalog is temporarily unavailable' }, 503)
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

  const end = new Date()
  const start = new Date(end.getTime() - 3_650 * 24 * 60 * 60 * 1000)
  if (apiUrl && token) {
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
        signal: AbortSignal.timeout(15_000),
      })
      if (upstream.ok) {
        const body = await upstream.json()
        return json(body, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=900, stale-while-revalidate=86400' })
      }
    } catch { /* fall through to the public, key-free history endpoint */ }
  }

  try {
    const body = await fetchYahooHistory(asset, market, start, end)
    return json(body, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=900, stale-while-revalidate=86400' })
  } catch {
    return json({ error: 'Historical sources are temporarily unavailable' }, 502)
  }
}
