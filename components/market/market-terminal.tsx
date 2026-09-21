'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowUpRight, BarChart3, CandlestickChart, Database, RefreshCw, Search, ShieldCheck, Star, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  getCandles,
  getLatestQuote,
  listMarketAssets,
  syncMarketData,
  type MarketAsset,
  type MarketCandle,
  type MarketQuote,
} from '@/lib/market-data'
import { DEFAULT_TOOLKIT, type ToolkitState } from '@/lib/indicators'
import { AnalysisToolkit } from '@/components/market/analysis-toolkit'
import { AdvancedMarketChart } from '@/components/market/advanced-market-chart'

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1mo'] as const
const TIMEFRAME_LABEL: Record<(typeof TIMEFRAMES)[number], string> = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1H', '4h': '4H', '1d': '1D', '1w': '1W', '1mo': '1M' }

type Timeframe = (typeof TIMEFRAMES)[number]
type MarketTab = 'Favorit' | 'Major' | 'Logam' | 'Crypto' | 'Indeks' | 'Saham'
const MARKET_TABS: MarketTab[] = ['Favorit', 'Major', 'Logam', 'Crypto', 'Indeks', 'Saham']

// Quotes are refreshed from the Supabase cache every 30 seconds. The heavier
// provider ingestion is requested at most once per minute to protect sources.
const QUOTE_REFRESH_MS = 30_000
const INGEST_REFRESH_MS = 60_000

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(value)
}

function formatPrice(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (currency === 'IDR') return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)}`
  if (currency === 'PERCENT') return `${formatNumber(value)}%`
  return `$${formatNumber(value)}`
}

function formatTime(value: string | null | undefined) {
  if (!value) return 'Belum tersedia'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function AssetRow({ asset, active, favorite, quote, onClick, onToggleFavorite }: { asset: MarketAsset; active: boolean; favorite: boolean; quote?: MarketQuote; onClick: () => void; onToggleFavorite: () => void }) {
  const change = quote?.change_percent ?? null
  return (
    <div className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent', active && 'bg-gold/10 ring-1 ring-gold/25')}>
      <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold text-foreground">{asset.symbol}</span>
        <span className="block truncate text-xs text-muted-foreground">{asset.display_name}</span>
      </button>
      <button type="button" onClick={onToggleFavorite} className="rounded p-1 text-muted-foreground hover:text-gold" aria-label={favorite ? `Hapus ${asset.symbol} dari favorit` : `Tambah ${asset.symbol} ke favorit`}>
        <Star className={cn('size-3.5', favorite && 'fill-gold text-gold')} />
      </button>
      <button type="button" onClick={onClick} className="shrink-0 text-right">
        <span className="block text-sm tabular-nums text-foreground">{formatPrice(quote?.price, asset.currency)}</span>
        <span className={cn('block text-xs tabular-nums', change === null ? 'text-muted-foreground' : change >= 0 ? 'text-positive' : 'text-negative')}>
          {change === null ? '—' : `${change >= 0 ? '+' : ''}${formatNumber(change)}%`}
        </span>
      </button>
    </div>
  )
}

function marketTabFor(asset: MarketAsset): MarketTab {
  if (asset.asset_class === 'CRYPTO') return 'Crypto'
  if (asset.asset_class === 'COMMODITY') return 'Logam'
  if (asset.asset_class === 'INDEX' || asset.asset_class === 'IDX_INDEX') return 'Indeks'
  if (asset.asset_class === 'IDX_STOCK' || asset.asset_class === 'US_STOCK' || asset.market === 'IDX') return 'Saham'
  return 'Major'
}

export function MarketTerminal() {
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({})
  const [selectedSymbol, setSelectedSymbol] = useState('IHSG')
  const [candles, setCandles] = useState<MarketCandle[]>([])
  const [timeframe, setTimeframe] = useState<Timeframe>('1d')
  const [query, setQuery] = useState('')
  const [marketTab, setMarketTab] = useState<MarketTab>('Favorit')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toolkit, setToolkit] = useState<ToolkitState>({ ...DEFAULT_TOOLKIT })
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [sourceStatus, setSourceStatus] = useState<string | null>(null)
  const refreshInFlight = useRef(false)
  const lastIngestAt = useRef(0)

  const selected = assets.find((asset) => asset.symbol === selectedSymbol) ?? assets[0]
  const selectedQuote = selected ? quotes[selected.id] : undefined
  const positive = (selectedQuote?.change_percent ?? 0) >= 0
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return assets
    return assets.filter((asset) => `${asset.symbol} ${asset.display_name} ${asset.market} ${asset.asset_class}`.toLowerCase().includes(normalized))
  }, [assets, query])
  const visibleAssets = useMemo(() => filteredAssets.filter((asset) => {
    if (marketTab === 'Favorit') return favoriteIds.includes(asset.id)
    return marketTabFor(asset) === marketTab
  }), [filteredAssets, favoriteIds, marketTab])

  async function loadAssets() {
    setLoading(true)
    setError(null)
    try {
      const nextAssets = await listMarketAssets()
      setAssets(nextAssets)
      setFavoriteIds((current) => {
        if (current.length) return current.filter((id) => nextAssets.some((asset) => asset.id === id))
        const curated = nextAssets.filter((asset) => ['IHSG', 'BBCA', 'BTC', 'ETH', 'XAU', 'XAUUSD', 'DJI', '^DJI'].includes(asset.symbol)).map((asset) => asset.id)
        return curated.length ? curated : nextAssets.slice(0, 5).map((asset) => asset.id)
      })
      const nextQuotes = await Promise.all(nextAssets.map(async (asset) => [asset.id, await getLatestQuote(asset.id)] as const))
      setQuotes(Object.fromEntries(nextQuotes.filter((entry): entry is [string, MarketQuote] => Boolean(entry[1]))))
      if (!nextAssets.some((asset) => asset.symbol === selectedSymbol) && nextAssets[0]) setSelectedSymbol(nextAssets[0].symbol)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tidak dapat memuat market data.')
    } finally {
      setLoading(false)
    }
  }

  async function loadChart(asset = selected) {
    if (!asset) return
    setChartLoading(true)
    try {
      setCandles(await getCandles(asset.id, timeframe))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tidak dapat memuat grafik.')
      setCandles([])
    } finally {
      setChartLoading(false)
    }
  }

  useEffect(() => { void loadAssets() }, [])
  useEffect(() => {
    if (!selected) return
    let alive = true
    async function bootstrap() {
      setChartLoading(true)
      try {
        let nextCandles = await getCandles(selected.id, timeframe)
        if (!nextCandles.length) {
          const syncPayload = await syncMarketData(selected.symbol, timeframe)
          applySyncStatus(syncPayload)
          nextCandles = await getCandles(selected.id, timeframe)
        }
        if (alive) setCandles(nextCandles)
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Grafik tidak dapat dimuat.')
      } finally {
        if (alive) setChartLoading(false)
      }
    }
    void bootstrap()
    return () => { alive = false }
  }, [selected?.id, timeframe])

  useEffect(() => {
    if (!assets.length) return
    const interval = window.setInterval(() => { void refreshMarketData(true) }, QUOTE_REFRESH_MS)
    return () => window.clearInterval(interval)
  }, [assets.length, selected?.id, timeframe])

  function applySyncStatus(payload: any) {
    const results = Array.isArray(payload?.results) ? payload.results : []
    const idxResult = results.find((result: any) => result?.provider === 'idx' && result?.source_status !== 'fallback_yahoo')
    const fallbackResult = results.find((result: any) => result?.source_status === 'fallback_yahoo')
    const yahooResult = results.find((result: any) => result?.provider === 'yahoo')
    if (idxResult) setSourceStatus('IDX source · live candidate')
    else if (fallbackResult) setSourceStatus(`IDX unavailable · fallback ${fallbackResult.provider}`)
    else if (yahooResult) setSourceStatus('Yahoo Finance · delayed')
  }

  async function refreshMarketData(quiet = false) {
    if (!selected || refreshInFlight.current) return
    refreshInFlight.current = true
    if (!quiet) setSyncing(true)
    setError(null)
    try {
      const now = Date.now()
      if (now - lastIngestAt.current >= INGEST_REFRESH_MS) {
        const syncPayload = await syncMarketData(undefined, '1d')
        lastIngestAt.current = Date.now()
        applySyncStatus(syncPayload)
      }
      const nextQuotes = await Promise.all(assets.map(async (asset) => [asset.id, await getLatestQuote(asset.id)] as const))
      setQuotes(Object.fromEntries(nextQuotes.filter((entry): entry is [string, MarketQuote] => Boolean(entry[1]))))
      const nextCandles = await getCandles(selected.id, timeframe)
      setCandles(nextCandles)
      setLastRefresh(new Date().toISOString())
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : 'Market sync gagal.')
    } finally {
      refreshInFlight.current = false
      if (!quiet) setSyncing(false)
    }
  }

  function refreshSelected(quiet = false) {
    return refreshMarketData(quiet)
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.2em] text-gold uppercase">Market terminal</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Data Pasar</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Workspace harga dan konteks makro untuk saham IDX, indeks Amerika, Treasury yield, serta komoditas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end"><span className="text-xs text-muted-foreground">Auto-refresh quote 30 dtk · ingest 60 dtk</span><Button onClick={() => void refreshSelected()} disabled={!selected || syncing} variant="outline">
          <RefreshCw className={cn('size-4', syncing && 'animate-spin')} />
          {syncing ? 'Mengambil data…' : 'Segarkan data'}
        </Button></div>
      </div>

      {error && <div className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}</div>}

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit 2xl:sticky 2xl:top-20">
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 text-base"><Database className="size-4 text-gold" />Watchlist market</CardTitle>
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">{MARKET_TABS.map((tab) => <button key={tab} type="button" onClick={() => setMarketTab(tab)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors', marketTab === tab ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>{tab}</button>)}</div>
            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari simbol atau aset" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>
          </CardHeader>
          <CardContent className="max-h-[min(60vh,520px)] overflow-y-auto pt-0 pr-2">
            {loading ? <p className="px-3 py-4 text-sm text-muted-foreground">Memuat aset…</p> : visibleAssets.length ? <div className="space-y-1"><div className="grid grid-cols-[minmax(0,1fr)_auto] px-2 pb-1 text-[0.62rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase"><span>{marketTab}</span><span>Harga / 24J</span></div>{visibleAssets.map((asset) => <AssetRow key={asset.id} asset={asset} active={asset.id === selected?.id} favorite={favoriteIds.includes(asset.id)} quote={quotes[asset.id]} onClick={() => setSelectedSymbol(asset.symbol)} onToggleFavorite={() => setFavoriteIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id])} />)}</div> : <p className="px-3 py-6 text-sm text-muted-foreground">Belum ada aset di tab {marketTab}. Tandai aset dengan bintang untuk memasukkannya ke Favorit.</p>}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <AnalysisToolkit value={toolkit} onChange={setToolkit} />
          <Card className="min-w-0 overflow-hidden border-gold/20">
            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-serif text-2xl font-semibold text-foreground">{selected?.display_name ?? 'Pilih aset'}</span>{selected && <Badge variant="gold">{selected.symbol}</Badge>}{(selectedQuote?.is_delayed ?? selected?.is_delayed) && <Badge variant="outline">Delayed / EOD</Badge>}{sourceStatus && <Badge variant="outline">{sourceStatus}</Badge>}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{selected?.market} · {selected?.asset_class} · {selected?.provider}</p>
                </div>
                <div className="text-left xl:text-right"><p className="font-serif text-4xl font-semibold tabular-nums text-foreground">{formatPrice(selectedQuote?.price, selected?.currency ?? 'USD')}</p><p className={cn('mt-1 flex items-center gap-1 text-sm tabular-nums xl:justify-end', positive ? 'text-positive' : 'text-negative')}>{positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{selectedQuote?.change_percent === null || selectedQuote?.change_percent === undefined ? 'Belum ada quote' : `${positive ? '+' : ''}${formatNumber(selectedQuote.change_percent)}% hari ini`}</p></div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">{TIMEFRAMES.map((item) => <button key={item} type="button" onClick={() => setTimeframe(item)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', timeframe === item ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground')}>{TIMEFRAME_LABEL[item]}</button>)}</div><span className="text-xs text-muted-foreground">Market time: {formatTime(selectedQuote?.market_time)} · fetched: {formatTime(selectedQuote?.fetched_at)}</span></div>
              <div className="relative mt-4">{chartLoading && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 text-sm text-muted-foreground">Menyiapkan candle…</div>}<AdvancedMarketChart candles={candles} toolkit={toolkit} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span><b className="text-foreground">Hover</b> candle untuk OHLC, volume, dan struktur market.</span><span>{lastRefresh ? `Updated ${formatTime(lastRefresh)}` : 'Auto-refresh quote setiap 30 detik'}</span></div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Harga sebelumnya</p><p className="mt-2 text-lg font-semibold tabular-nums">{formatPrice(selectedQuote && selectedQuote.price !== null && selectedQuote.change_absolute !== null ? selectedQuote.price - selectedQuote.change_absolute : null, selected?.currency ?? 'USD')}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Perubahan nominal</p><p className={cn('mt-2 text-lg font-semibold tabular-nums', positive ? 'text-positive' : 'text-negative')}>{selectedQuote?.change_absolute === null || selectedQuote?.change_absolute === undefined ? '—' : `${positive ? '+' : ''}${formatNumber(selectedQuote.change_absolute)}`}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Volume</p><p className="mt-2 text-lg font-semibold tabular-nums">{formatNumber(selectedQuote?.volume, 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sumber</p><p className="mt-2 text-lg font-semibold capitalize">{selectedQuote?.provider ?? selected?.provider ?? '—'}</p></CardContent></Card>
          </div>

          <Card className="border-gold/20 bg-gradient-to-br from-card to-gold/5"><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold"><CandlestickChart className="size-5" /></span><div><h2 className="font-serif text-lg font-semibold text-foreground">Capital project & allocation layer</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Grafik market berada di atas. Di Lab Proyek, RAB, CAPEX, OPEX, BEP, NPV, IRR, MIRR, dan skenario arus kas dapat diuji sebelum modal dialokasikan.</p></div></div><Button nativeButton={false} render={<Link href="/valuasi" />} variant="outline">Buka lab proyek <ArrowUpRight className="size-4" /></Button></CardContent></Card>

          <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="flex gap-3 p-4"><Activity className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Refresh aman</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Data disimpan di cache Supabase, bukan dipanggil ulang tanpa batas dari browser.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 p-4"><ShieldCheck className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Sumber transparan</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Provider dan status delayed ditampilkan pada setiap aset.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 p-4"><BarChart3 className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Siap diperluas</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Candle, quote, dan hasil valuasi memiliki tabel terpisah untuk analisis historis.</p></div></CardContent></Card></div>
        </div>
      </div>
    </div>
  )
}
