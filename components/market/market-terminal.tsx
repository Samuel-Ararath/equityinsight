'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, BarChart3, CandlestickChart, Database, RefreshCw, Search, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
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

const DEFAULT_SYMBOLS = ['^JKSE', '^DJI', '^GSPC', '^IXIC', 'DGS10', 'GC=F', 'CL=F']
const TIMEFRAMES = ['1d', '1w', '1mo'] as const

type Timeframe = (typeof TIMEFRAMES)[number]

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

function Chart({ candles, positive }: { candles: MarketCandle[]; positive: boolean }) {
  if (!candles.length) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-border bg-background/40 text-sm text-muted-foreground">
        Belum ada candle tersimpan. Klik “Segarkan data” untuk mengambil data pertama.
      </div>
    )
  }

  const width = 960
  const height = 360
  const padX = 18
  const padY = 24
  const closes = candles.map((candle) => candle.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const span = max - min || 1
  const points = closes.map((close, index) => {
    const x = padX + (index / Math.max(closes.length - 1, 1)) * (width - padX * 2)
    const y = height - padY - ((close - min) / span) * (height - padY * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const area = `${padX},${height - padY} ${points} ${width - padX},${height - padY}`
  const stroke = positive ? '#22c55e' : '#ef4444'
  const fill = positive ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)'

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background/60 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[360px] w-full" role="img" aria-label="Grafik harga historis">
        <defs>
          <linearGradient id="market-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.38" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((line) => {
          const y = padY + (line / 4) * (height - padY * 2)
          return <line key={line} x1={padX} x2={width - padX} y1={y} y2={y} stroke="currentColor" className="text-border/60" strokeDasharray="4 8" />
        })}
        <polygon points={area} fill="url(#market-area)" />
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x={padX} y={height - 5} className="fill-muted-foreground" fontSize="12">{new Date(candles[0].candle_time).toLocaleDateString('id-ID')}</text>
        <text x={width - padX} y={height - 5} textAnchor="end" className="fill-muted-foreground" fontSize="12">{new Date(candles.at(-1)!.candle_time).toLocaleDateString('id-ID')}</text>
        <text x={width - padX} y={padY} textAnchor="end" className="fill-muted-foreground" fontSize="12">{formatNumber(max)}</text>
        <text x={width - padX} y={height - padY} textAnchor="end" className="fill-muted-foreground" fontSize="12">{formatNumber(min)}</text>
      </svg>
    </div>
  )
}

function AssetRow({ asset, active, quote, onClick }: { asset: MarketAsset; active: boolean; quote?: MarketQuote; onClick: () => void }) {
  const change = quote?.change_percent ?? null
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent', active && 'bg-gold/10 ring-1 ring-gold/25')}>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{asset.symbol}</span>
        <span className="block truncate text-xs text-muted-foreground">{asset.display_name}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm tabular-nums text-foreground">{formatPrice(quote?.price, asset.currency)}</span>
        <span className={cn('block text-xs tabular-nums', change === null ? 'text-muted-foreground' : change >= 0 ? 'text-positive' : 'text-negative')}>
          {change === null ? '—' : `${change >= 0 ? '+' : ''}${formatNumber(change)}%`}
        </span>
      </span>
    </button>
  )
}

export function MarketTerminal() {
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({})
  const [selectedSymbol, setSelectedSymbol] = useState('^JKSE')
  const [candles, setCandles] = useState<MarketCandle[]>([])
  const [timeframe, setTimeframe] = useState<Timeframe>('1d')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = assets.find((asset) => asset.symbol === selectedSymbol) ?? assets[0]
  const selectedQuote = selected ? quotes[selected.id] : undefined
  const positive = (selectedQuote?.change_percent ?? 0) >= 0
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return assets
    return assets.filter((asset) => `${asset.symbol} ${asset.display_name} ${asset.market} ${asset.asset_class}`.toLowerCase().includes(normalized))
  }, [assets, query])
  const groups = useMemo(() => filteredAssets.reduce<Record<string, MarketAsset[]>>((acc, asset) => {
    const key = asset.market === 'IDX' ? 'Indonesia' : asset.asset_class === 'TREASURY_YIELD' ? 'U.S. Treasury' : 'Amerika & Global'
    acc[key] = [...(acc[key] ?? []), asset]
    return acc
  }, {}), [filteredAssets])

  async function loadAssets() {
    setLoading(true)
    setError(null)
    try {
      const nextAssets = await listMarketAssets()
      setAssets(nextAssets)
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
  useEffect(() => { void loadChart() }, [selected?.id, timeframe])

  async function refreshSelected() {
    if (!selected) return
    setSyncing(true)
    setError(null)
    try {
      await syncMarketData(selected.symbol)
      const [quote, nextCandles] = await Promise.all([getLatestQuote(selected.id), getCandles(selected.id, timeframe)])
      if (quote) setQuotes((current) => ({ ...current, [selected.id]: quote }))
      setCandles(nextCandles)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Market sync gagal.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.2em] text-gold uppercase">Market terminal</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Data Pasar</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Workspace harga dan konteks makro untuk saham IDX, indeks Amerika, Treasury yield, serta komoditas.</p>
        </div>
        <Button onClick={refreshSelected} disabled={!selected || syncing} variant="outline">
          <RefreshCw className={cn('size-4', syncing && 'animate-spin')} />
          {syncing ? 'Mengambil data…' : 'Segarkan data'}
        </Button>
      </div>

      {error && <div className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 text-base"><Database className="size-4 text-gold" />Watchlist market</CardTitle>
            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari simbol atau aset" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {loading ? <p className="px-3 py-4 text-sm text-muted-foreground">Memuat aset…</p> : Object.entries(groups).map(([group, groupAssets]) => <div key={group}><p className="px-3 pb-1 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{group}</p><div className="space-y-1">{groupAssets.map((asset) => <AssetRow key={asset.id} asset={asset} active={asset.id === selected?.id} quote={quotes[asset.id]} onClick={() => setSelectedSymbol(asset.symbol)} />)}</div></div>)}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden border-gold/20">
            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-serif text-2xl font-semibold text-foreground">{selected?.display_name ?? 'Pilih aset'}</span>{selected && <Badge variant="gold">{selected.symbol}</Badge>}{selected?.is_delayed && <Badge variant="outline">Delayed / EOD</Badge>}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{selected?.market} · {selected?.asset_class} · {selected?.provider}</p>
                </div>
                <div className="text-left xl:text-right"><p className="font-serif text-4xl font-semibold tabular-nums text-foreground">{formatPrice(selectedQuote?.price, selected?.currency ?? 'USD')}</p><p className={cn('mt-1 flex items-center gap-1 text-sm tabular-nums xl:justify-end', positive ? 'text-positive' : 'text-negative')}>{positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{selectedQuote?.change_percent === null || selectedQuote?.change_percent === undefined ? 'Belum ada quote' : `${positive ? '+' : ''}${formatNumber(selectedQuote.change_percent)}% hari ini`}</p></div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">{TIMEFRAMES.map((item) => <button key={item} type="button" onClick={() => setTimeframe(item)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', timeframe === item ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground')}>{item === '1d' ? 'Daily' : item === '1w' ? 'Weekly' : 'Monthly'}</button>)}</div><span className="text-xs text-muted-foreground">Market time: {formatTime(selectedQuote?.market_time)} · fetched: {formatTime(selectedQuote?.fetched_at)}</span></div>
              <div className="relative mt-4">{chartLoading && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 text-sm text-muted-foreground">Memuat grafik…</div>}<Chart candles={candles} positive={positive} /></div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Harga sebelumnya</p><p className="mt-2 text-lg font-semibold tabular-nums">{formatPrice(selectedQuote && selectedQuote.price !== null && selectedQuote.change_absolute !== null ? selectedQuote.price - selectedQuote.change_absolute : null, selected?.currency ?? 'USD')}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Perubahan nominal</p><p className={cn('mt-2 text-lg font-semibold tabular-nums', positive ? 'text-positive' : 'text-negative')}>{selectedQuote?.change_absolute === null || selectedQuote?.change_absolute === undefined ? '—' : `${positive ? '+' : ''}${formatNumber(selectedQuote.change_absolute)}`}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Volume</p><p className="mt-2 text-lg font-semibold tabular-nums">{formatNumber(selectedQuote?.volume, 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sumber</p><p className="mt-2 text-lg font-semibold capitalize">{selectedQuote?.provider ?? selected?.provider ?? '—'}</p></CardContent></Card>
          </div>

          <Card className="border-gold/20 bg-gradient-to-br from-card to-gold/5"><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold"><CandlestickChart className="size-5" /></span><div><h2 className="font-serif text-lg font-semibold text-foreground">Fundamental & valuation layer</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Grafik market berada di atas. Di halaman valuasi, data laporan keuangan dapat dipakai untuk menghitung DCF/NPV, Graham Number, ROA, ROE, break-even point, dan skenario nilai wajar.</p></div></div><Button nativeButton={false} render={<Link href="/valuasi" />} variant="outline">Buka valuasi <ArrowUpRight className="size-4" /></Button></CardContent></Card>

          <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="flex gap-3 p-4"><Activity className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Refresh aman</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Data disimpan di cache Supabase, bukan dipanggil ulang tanpa batas dari browser.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 p-4"><ShieldCheck className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Sumber transparan</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Provider dan status delayed ditampilkan pada setiap aset.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 p-4"><BarChart3 className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Siap diperluas</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Candle, quote, dan hasil valuasi memiliki tabel terpisah untuk analisis historis.</p></div></CardContent></Card></div>
        </div>
      </div>
    </div>
  )
}
