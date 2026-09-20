export type MarketAsset = {
  id: string
  symbol: string
  display_name: string
  asset_class: string
  market: string
  currency: string
  provider: string
  provider_symbol: string
  is_delayed: boolean
}

export type MarketQuote = {
  id: number
  asset_id: string
  symbol: string
  display_name: string
  asset_class: string
  market: string
  currency: string
  provider: string
  price: number | null
  change_absolute: number | null
  change_percent: number | null
  volume: number | null
  market_time: string | null
  fetched_at: string | null
  is_delayed: boolean | null
}

export type MarketCandle = {
  candle_time: string
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Market data belum terhubung. Tambahkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY pada GitHub Actions Secrets/Variables.')
  }
}

async function rest<T>(path: string): Promise<T> {
  assertConfig()
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Market data request gagal (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function listMarketAssets(): Promise<MarketAsset[]> {
  return rest<MarketAsset[]>(
    'market_assets?select=id,symbol,display_name,asset_class,market,currency,provider,provider_symbol,is_delayed&is_active=eq.true&order=market.asc,asset_class.asc,symbol.asc',
  )
}

export async function getLatestQuote(assetId: string): Promise<MarketQuote | null> {
  const rows = await rest<MarketQuote[]>(
    `latest_market_quotes?select=*&asset_id=eq.${encodeURIComponent(assetId)}&limit=1`,
  )
  return rows[0] ?? null
}

export async function getCandles(assetId: string, timeframe = '1d'): Promise<MarketCandle[]> {
  return rest<MarketCandle[]>(
    `market_candles?select=candle_time,open,high,low,close,volume&asset_id=eq.${encodeURIComponent(assetId)}&timeframe=eq.${timeframe}&order=candle_time.asc&limit=365`,
  )
}

export async function syncMarketData(symbol?: string) {
  assertConfig()
  const suffix = symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ingest-market-data${suffix}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbol }),
    cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Market sync gagal (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`)
  }
  return response.json()
}
