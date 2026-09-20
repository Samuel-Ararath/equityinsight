'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowUpRight, BarChart3, CandlestickChart, Database, RefreshCw, Search, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getCandles, getLatestQuote, listMarketAssets, syncMarketData, type MarketAsset, type MarketCandle, type MarketQuote } from '@/lib/market-data'

const DEFAULT_SYMBOL = 'IHSG'
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1mo'] as const
type Timeframe = (typeof TIMEFRAMES)[number]
const TIMEFRAME_LABEL: Record<Timeframe, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1H', '4h': '4H', '1d': '1D', '1w': '1W', '1mo': '1M' }

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

function priceTag(candles: MarketCandle[], index: number) {
  if (index < 1) return '—'
  const current = candles[index]
  const previous = candles[index - 1]
  const tags: string[] = []
  if (current.high > previous.high) tags.push('HH')
  else if (current.high < previous.high) tags.push('LH')
  if (current.low > previous.low) tags.push('HL')
  else if (current.low < previous.low) tags.push('LL')
  return tags.length ? tags.join(' · ') : 'Inside bar'
}

function PriceChart({ candles }: { candles: MarketCandle[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [width, setWidth] = useState(900)
  const height = 430

  useEffect(() => {
    if (!wrapRef.current) return
    const observer = new ResizeObserver((entries) => setWidth(Math.max(320, Math.floor(entries[0].contentRect.width))))
    observer.observe(wrapRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !candles.length) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    const left = 58
    const right = 16
    const top = 22
    const bottom = 38
    const plotWidth = width - left - right
    const plotHeight = height - top - bottom
    const lows = candles.map((c) => c.low)
    const highs = candles.map((c) => c.high)
    const min = Math.min(...lows)
    const max = Math.max(...highs)
    const span = max - min || 1
    const xAt = (index: number) => left + (index / Math.max(candles.length - 1, 1)) * plotWidth
    const yAt = (value: number) => top + (1 - (value - min) / span) * plotHeight
    const styles = getComputedStyle(document.documentElement)
    const border = styles.getPropertyValue('--border').trim() || '#26314a'
    const muted = styles.getPropertyValue('--muted-foreground').trim() || '#8e9bb2'
    const positive = styles.getPropertyValue('--positive').trim() || '#5ed5a0'
    const negative = styles.getPropertyValue('--negative').trim() || '#ef7777'
    ctx.clearRect(0, 0, width, height)
    ctx.font = '12px Inter, sans-serif'
    ctx.lineWidth = 1
    ctx.strokeStyle = border
    ctx.fillStyle = muted
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = top + (tick / 4) * plotHeight
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke()
      const value = max - (tick / 4) * span
      ctx.fillText(formatNumber(value), 8, y + 4)
    }
    const step = plotWidth / Math.max(candles.length - 1, 1)
    const candleWidth = Math.max(2, Math.min(16, step * 0.62))
    candles.forEach((candle, index) => {
      const x = xAt(index)
      const openY = yAt(candle.open)
      const closeY = yAt(candle.close)
      const highY = yAt(candle.high)
      const lowY = yAt(candle.low)
      const color = candle.close >= candle.open ? positive : negative
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.beginPath(); ctx.moveTo(x, highY); ctx.lineTo(x, lowY); ctx.stroke()
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY))
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight)
    })
    ctx.strokeStyle = muted
    ctx.fillStyle = muted
    ctx.font = '11px Inter, sans-serif'
    const labelIndexes = [0, Math.floor(candles.length / 3), Math.floor((candles.length * 2) / 3), candles.length - 1]
    labelIndexes.forEach((index) => { const x = xAt(index); ctx.fillText(new Date(candles[index].candle_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), Math.max(left, x - 24), height - 12) })
    if (hoverIndex !== null && candles[hoverIndex]) {
      const x = xAt(hoverIndex)
      const y = yAt(candles[hoverIndex].close)
      ctx.strokeStyle = 'rgba(120,152,255,0.8)'
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, height - bottom); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#7898ff'
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
    }
  }, [candles, height, hoverIndex, width])

  const hovered = hoverIndex === null ? null : candles[hoverIndex]
  return (
    <div ref={wrapRef} className="relative overflow-hidden rounded-xl border border-border bg-background/55">
      {candles.length ? <canvas ref={canvasRef} onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const left = 58; const plotWidth = rect.width - left - 16; const raw = Math.round(((event.clientX - rect.left - left) / plotWidth) * Math.max(candles.length - 1, 1)); setHoverIndex(Math.min(candles.length - 1, Math.max(0, raw))) }} onPointerLeave={() => setHoverIndex(null)} className="block max-w-full cursor-crosshair" /> : <div className="flex h-[430px] items-center justify-center px-6 text-center text-sm text-muted-foreground">Belum ada candle tersimpan. Data akan diambil otomatis saat terminal dibuka.</div>}
      {hovered && <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-primary/30 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md"><div className="flex items-center gap-2 font-semibold"><span>{new Date(hovered.candle_time).toLocaleString('id-ID')}</span><Badge variant="outline">{priceTag(candles, hoverIndex!)}</Badge></div><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground"><span>O <b className="text-foreground">{formatNumber(hovered.open)}</b></span><span>H <b className="text-foreground">{formatNumber(hovered.high)}</b></span><span>L <b className="text-foreground">{formatNumber(hovered.low)}</b></span><span>C <b className="text-foreground">{formatNumber(hovered.close)}</b></span><span className="col-span-2">Vol <b className="text-foreground">{formatNumber(hovered.volume, 0)}</b></span></div></div>}
    </div>
  )
}

function AssetRow({ asset, active, quote, onClick }: { asset: MarketAsset; active: boolean; quote?: MarketQuote; onClick: () => void }) {
  const change = quote?.change_percent ?? null
  return <button type="button" onClick={onClick} className={cn('flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent', active && 'bg-primary/10 ring-1 ring-primary/25')}><span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{asset.symbol}</span><span className="block truncate text-xs text-muted-foreground">{asset.display_name}</span></span><span className="shrink-0 text-right"><span className="block text-sm tabular-nums text-foreground">{formatPrice(quote?.price, asset.currency)}</span><span className={cn('block text-xs tabular-nums', change === null ? 'text-muted-foreground' : change >= 0 ? 'text-positive' : 'text-negative')}>{change === null ? '—' : `${change >= 0 ? '+' : ''}${formatNumber(change)}%`}</span></span></button>
}

export function MarketTerminal() {
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({})
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL)
  const [candles, setCandles] = useState<MarketCandle[]>([])
  const [timeframe, setTimeframe] = useState<Timeframe>('1d')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const selected = assets.find((asset) => asset.symbol === selectedSymbol) ?? assets[0]
  const selectedQuote = selected ? quotes[selected.id] : undefined
  const filteredAssets = useMemo(() => { const normalized = query.trim().toLowerCase(); if (!normalized) return assets; return assets.filter((asset) => `${asset.symbol} ${asset.display_name} ${asset.market} ${asset.asset_class}`.toLowerCase().includes(normalized)) }, [assets, query])
  const groups = useMemo(() => filteredAssets.reduce<Record<string, MarketAsset[]>>((acc, asset) => { const key = asset.market === 'IDX' ? 'Indonesia' : asset.asset_class === 'TREASURY_YIELD' ? 'U.S. Treasury' : 'Amerika & Global'; acc[key] = [...(acc[key] ?? []), asset]; return acc }, {}), [filteredAssets])
  const positive = (selectedQuote?.change_percent ?? 0) >= 0

  async function loadAssets() {
    setLoading(true); setError(null)
    try {
      const nextAssets = await listMarketAssets(); setAssets(nextAssets)
      const nextQuotes = await Promise.all(nextAssets.map(async (asset) => [asset.id, await getLatestQuote(asset.id)] as const))
      setQuotes(Object.fromEntries(nextQuotes.filter((entry): entry is [string, MarketQuote] => Boolean(entry[1]))))
      if (!nextAssets.some((asset) => asset.symbol === selectedSymbol) && nextAssets[0]) setSelectedSymbol(nextAssets[0].symbol)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Market data tidak dapat dimuat.') } finally { setLoading(false) }
  }

  async function refreshSelected(quiet = false) {
    if (!selected) return
    if (!quiet) setSyncing(true)
    setError(null)
    try {
      await syncMarketData(selected.symbol, timeframe)
      const [quote, nextCandles] = await Promise.all([getLatestQuote(selected.id), getCandles(selected.id, timeframe)])
      if (quote) setQuotes((current) => ({ ...current, [selected.id]: quote }))
      setCandles(nextCandles); setLastRefresh(new Date().toISOString())
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Market sync gagal.') } finally { if (!quiet) setSyncing(false) }
  }

  useEffect(() => { void loadAssets() }, [])
  useEffect(() => {
    if (!selected) return
    let active = true
    async function bootstrap() {
      setChartLoading(true)
      try {
        let nextCandles = await getCandles(selected.id, timeframe)
        if (!nextCandles.length) { await syncMarketData(selected.symbol, timeframe); nextCandles = await getCandles(selected.id, timeframe) }
        if (active) setCandles(nextCandles)
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Grafik tidak dapat dimuat.') } finally { if (active) setChartLoading(false) }
    }
    void bootstrap()
    const interval = window.setInterval(() => { void refreshSelected(true) }, 60000)
    return () => { active = false; window.clearInterval(interval) }
  }, [selected?.id, timeframe])

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow text-gold">Market terminal</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">Data Pasar</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Candlestick, multi-timeframe, dan konteks makro untuk membaca pergerakan harga dengan lebih jernih.</p></div><div className="flex items-center gap-2"><Badge variant="positive"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />Auto-refresh 60s</Badge><Button onClick={() => void refreshSelected()} disabled={!selected || syncing} variant="outline"><RefreshCw className={cn('size-4', syncing && 'animate-spin')} />{syncing ? 'Mengambil data…' : 'Refresh'}</Button></div></div>
    {error && <div className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="h-fit xl:sticky xl:top-20"><CardHeader className="gap-3"><CardTitle className="flex items-center gap-2 text-base"><Database className="size-4 text-gold" />Watchlist market</CardTitle><div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari simbol atau aset" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div></CardHeader><CardContent className="space-y-4 pt-0">{loading ? <p className="px-3 py-4 text-sm text-muted-foreground">Memuat aset…</p> : Object.entries(groups).map(([group, groupAssets]) => <div key={group}><p className="px-3 pb-1 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{group}</p><div className="space-y-1">{groupAssets.map((asset) => <AssetRow key={asset.id} asset={asset} active={asset.id === selected?.id} quote={quotes[asset.id]} onClick={() => setSelectedSymbol(asset.symbol)} />)}</div></div>)}</CardContent></Card>
      <div className="min-w-0 space-y-4">
        <Card className="overflow-hidden border-primary/20"><CardContent className="p-5 md:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-serif text-2xl font-semibold text-foreground">{selected?.display_name ?? 'Pilih aset'}</span>{selected && <Badge variant="gold">{selected.symbol}</Badge>}{selected?.is_delayed && <Badge variant="outline">Delayed / EOD</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{selected?.market} · {selected?.asset_class} · {selected?.provider}</p></div><div className="text-left xl:text-right"><p className="font-serif text-4xl font-semibold tabular-nums text-foreground">{formatPrice(selectedQuote?.price, selected?.currency ?? 'USD')}</p><p className={cn('mt-1 flex items-center gap-1 text-sm tabular-nums xl:justify-end', positive ? 'text-positive' : 'text-negative')}>{positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{selectedQuote?.change_percent === null || selectedQuote?.change_percent === undefined ? 'Belum ada quote' : `${positive ? '+' : ''}${formatNumber(selectedQuote.change_percent)}%`}</p></div></div><div className="mt-6 flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-center md:justify-between"><div className="flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-background p-1">{TIMEFRAMES.map((item) => <button key={item} type="button" onClick={() => setTimeframe(item)} className={cn('min-h-9 rounded-md px-2.5 text-xs font-semibold tabular-nums transition-colors', timeframe === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>{TIMEFRAME_LABEL[item]}</button>)}</div><span className="text-xs text-muted-foreground">{lastRefresh ? `Auto-updated ${formatTime(lastRefresh)}` : `Market time: ${formatTime(selectedQuote?.market_time)}`}</span></div><div className="relative mt-4">{chartLoading && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 text-sm text-muted-foreground">Menyiapkan candle…</div>}<PriceChart candles={candles} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span><b className="text-foreground">Hover</b> candle untuk OHLC, volume, dan struktur HH / HL / LH / LL.</span><span>Auto-refresh setiap 60 detik</span></div></CardContent></Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Harga sebelumnya</p><p className="mt-2 text-lg font-semibold tabular-nums">{formatPrice(selectedQuote && selectedQuote.price !== null && selectedQuote.change_absolute !== null ? selectedQuote.price - selectedQuote.change_absolute : null, selected?.currency ?? 'USD')}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Perubahan nominal</p><p className={cn('mt-2 text-lg font-semibold tabular-nums', positive ? 'text-positive' : 'text-negative')}>{selectedQuote?.change_absolute === null || selectedQuote?.change_absolute === undefined ? '—' : `${positive ? '+' : ''}${formatNumber(selectedQuote.change_absolute)}`}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Volume</p><p className="mt-2 text-lg font-semibold tabular-nums">{formatNumber(selectedQuote?.volume, 0)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sumber</p><p className="mt-2 text-lg font-semibold capitalize">{selectedQuote?.provider ?? selected?.provider ?? '—'}</p></CardContent></Card></div>
        <Card className="border-gold/20 bg-gradient-to-br from-card to-gold/5"><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold"><CandlestickChart className="size-5" /></span><div><h2 className="font-serif text-lg font-semibold text-foreground">Fundamental & valuation layer</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Pilih candle untuk price action. Buka valuation lab untuk menghubungkan harga terbaru dengan DCF/NPV, Graham Number, ROA, ROE, dan margin of safety.</p></div></div><Button nativeButton={false} render={<Link href="/valuasi" />} variant="outline">Buka valuasi <ArrowUpRight className="size-4" /></Button></CardContent></Card>
        <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="flex gap-3 p-4"><Activity className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Auto-refresh</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Quote dan candle diperbarui otomatis tiap 60 detik.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 p-4"><ShieldCheck className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Sumber transparan</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Provider, timestamp, dan status delayed selalu terlihat.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 p-4"><BarChart3 className="mt-0.5 size-4 text-gold" /><div><p className="text-sm font-medium">Price action</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">OHLC, volume, crosshair, dan struktur swing per candle.</p></div></CardContent></Card></div>
      </div>
    </div>
  </div>
}
