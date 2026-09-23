'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, BookOpen, BrainCircuit, CircleHelp, Clock3, RefreshCw, ShieldAlert, Sigma, Waves } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getCandles, listMarketAssets, syncMarketData, type MarketAsset, type MarketCandle } from '@/lib/market-data'
import { calculateConsensus, calculateMeanReversion, calculatePairsSignal, calculateRealizedVolatility, calculateTrend, type ModelSignal, type PairResult } from '@/components/market/quant-models'

const WINDOWS = [
  { label: '3 bulan', bars: 63 },
  { label: '6 bulan', bars: 126 },
  { label: '1 tahun', bars: 252 },
] as const

type WindowBars = (typeof WINDOWS)[number]['bars']

function number(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
}

function price(value: number | null, currency: string) {
  if (value === null || !Number.isFinite(value)) return '—'
  if (currency === 'IDR') return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)}`
  if (currency === 'PERCENT') return `${number(value)}%`
  return `${currency === 'USD' ? '$' : ''}${number(value)}`
}

function dateLabel(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Belum tersedia'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function signalStyle(signal: ModelSignal | PairResult['signal']) {
  if (signal === 'LONG' || signal === 'LONG_SPREAD') return 'border-positive/30 bg-positive/10 text-positive'
  if (signal === 'SHORT' || signal === 'SHORT_SPREAD') return 'border-negative/30 bg-negative/10 text-negative'
  if (signal === 'WAIT') return 'border-warning/30 bg-warning/10 text-warning'
  return 'border-border bg-muted/60 text-muted-foreground'
}

function signalLabel(signal: ModelSignal | PairResult['signal']) {
  if (signal === 'LONG') return 'LONG candidate'
  if (signal === 'SHORT') return 'SHORT candidate'
  if (signal === 'LONG_SPREAD') return 'Long spread'
  if (signal === 'SHORT_SPREAD') return 'Short spread'
  if (signal === 'WAIT') return 'Data belum cukup'
  return 'Netral / no trade'
}

function pricePath(points: Array<number | null>, width: number, height: number, min: number, max: number) {
  const valid = points.map((value, index) => value === null || !Number.isFinite(value) ? null : `${(index / Math.max(1, points.length - 1)) * width},${height - ((value - min) / Math.max(0.0000001, max - min)) * height}`).filter(Boolean)
  return valid.length ? `M ${valid.join(' L ')}` : ''
}

function LineChart({ candles, currency }: { candles: MarketCandle[]; currency: string }) {
  const closes = candles.map((candle) => candle.close)
  const emaValues = (period: number) => {
    const output: Array<number | null> = Array(closes.length).fill(null)
    if (closes.length < period) return output
    let value = closes.slice(0, period).reduce((sum, close) => sum + close, 0) / period
    output[period - 1] = value
    const alpha = 2 / (period + 1)
    for (let index = period; index < closes.length; index += 1) {
      value = closes[index] * alpha + value * (1 - alpha)
      output[index] = value
    }
    return output
  }
  const ema20 = emaValues(20)
  const ema50 = emaValues(50)
  const values = [...closes, ...ema20.filter((value): value is number => value !== null), ...ema50.filter((value): value is number => value !== null)]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const chartWidth = 720
  const chartHeight = 220
  const pad = { top: 12, right: 16, bottom: 28, left: 16 }
  const innerWidth = chartWidth - pad.left - pad.right
  const innerHeight = chartHeight - pad.top - pad.bottom
  const yMin = min - (max - min) * 0.08
  const yMax = max + (max - min) * 0.08
  const closePath = pricePath(closes, innerWidth, innerHeight, yMin, yMax)
  const fastPath = pricePath(ema20, innerWidth, innerHeight, yMin, yMax)
  const slowPath = pricePath(ema50, innerWidth, innerHeight, yMin, yMax)
  return <div className="min-w-0">
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><i className="h-0.5 w-4 rounded bg-gold" />Harga tutup</span><span className="inline-flex items-center gap-2"><i className="h-0.5 w-4 rounded bg-sky-400" />EMA 20</span><span className="inline-flex items-center gap-2"><i className="h-0.5 w-4 rounded bg-violet-400" />EMA 50</span><span className="ml-auto tabular-nums">{price(closes.at(-1) ?? null, currency)}</span></div>
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Grafik harga penutupan dan EMA 20 serta EMA 50" className="h-auto w-full overflow-visible rounded-lg bg-background/65">
      {[0, 1, 2, 3].map((index) => { const y = pad.top + (innerHeight / 3) * index; return <g key={index}><line x1={pad.left} y1={y} x2={chartWidth - pad.right} y2={y} stroke="currentColor" className="text-border" strokeOpacity="0.62" strokeDasharray="3 5" /><text x={pad.left + 2} y={y - 4} fill="currentColor" className="text-muted-foreground" fontSize="10">{number(yMax - (yMax - yMin) * index / 3, currency === 'IDR' ? 0 : 2)}</text></g> })}
      <g transform={`translate(${pad.left},${pad.top})`}><path d={closePath} fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" /><path d={fastPath} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /><path d={slowPath} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /></g>
      <text x={pad.left} y={chartHeight - 7} fill="currentColor" className="text-muted-foreground" fontSize="10">{dateLabel(candles[0]?.candle_time)}</text><text x={chartWidth - pad.right} y={chartHeight - 7} textAnchor="end" fill="currentColor" className="text-muted-foreground" fontSize="10">{dateLabel(candles.at(-1)?.candle_time)}</text>
    </svg>
  </div>
}

function SignalCard({ icon: Icon, title, subtitle, signal, metric, detail, footnote }: { icon: typeof Activity; title: string; subtitle: string; signal: ModelSignal | PairResult['signal']; metric: string; detail: string; footnote: string }) {
  const SignalIcon = signal === 'LONG' || signal === 'LONG_SPREAD' ? ArrowUpRight : signal === 'SHORT' || signal === 'SHORT_SPREAD' ? ArrowDownRight : signal === 'WAIT' ? Clock3 : ArrowRight
  return <Card className="min-w-0"><CardHeader className="pb-3"><CardTitle className="flex items-start justify-between gap-3 text-base"><span className="flex min-w-0 items-center gap-2"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold"><Icon className="size-4" /></span><span className="min-w-0"><span className="block truncate">{title}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{subtitle}</span></span></span><SignalIcon className="mt-1 size-4 shrink-0 text-muted-foreground" /></CardTitle></CardHeader><CardContent className="space-y-3"><Badge variant="outline" className={cn('border px-2.5 py-1 text-[0.67rem] font-semibold tracking-wide', signalStyle(signal))}>{signalLabel(signal)}</Badge><div><p className="text-2xl font-semibold tabular-nums tracking-tight">{metric}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p></div><p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{footnote}</p></CardContent></Card>
}

export function QuantLab() {
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [symbol, setSymbol] = useState('')
  const [pairSymbol, setPairSymbol] = useState('')
  const [windowBars, setWindowBars] = useState<WindowBars>(252)
  const [candles, setCandles] = useState<MarketCandle[]>([])
  const [pairCandles, setPairCandles] = useState<MarketCandle[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef(0)

  const selected = assets.find((asset) => asset.symbol === symbol) ?? null
  const candidates = useMemo(() => selected ? assets.filter((asset) => asset.id !== selected.id && asset.market === selected.market && asset.currency === selected.currency && asset.asset_class === selected.asset_class) : [], [assets, selected])
  const pair = candidates.find((asset) => asset.symbol === pairSymbol) ?? candidates[0] ?? null
  const scopedCandles = useMemo(() => candles.slice(-windowBars), [candles, windowBars])
  const scopedPairCandles = useMemo(() => pairCandles.slice(-windowBars), [pairCandles, windowBars])
  const trend = useMemo(() => calculateTrend(scopedCandles), [scopedCandles])
  const meanReversion = useMemo(() => calculateMeanReversion(scopedCandles), [scopedCandles])
  const volatility = useMemo(() => calculateRealizedVolatility(scopedCandles), [scopedCandles])
  const pairResult = useMemo(() => calculatePairsSignal(scopedCandles, scopedPairCandles), [scopedCandles, scopedPairCandles])
  const consensus = calculateConsensus(trend.signal, meanReversion.signal)

  useEffect(() => {
    let active = true
    listMarketAssets().then((rows) => {
      if (!active) return
      setAssets(rows)
      const initial = rows.find((asset) => asset.symbol === 'IHSG') ?? rows.find((asset) => asset.market === 'IDX') ?? rows[0]
      setSymbol(initial?.symbol ?? '')
      if (initial) {
        const nextPair = rows.find((asset) => asset.id !== initial.id && asset.market === initial.market && asset.currency === initial.currency && asset.asset_class === initial.asset_class)
        setPairSymbol(nextPair?.symbol ?? '')
      }
      if (!rows.length) setLoading(false)
    }).catch((cause) => {
      if (active) { setError(cause instanceof Error ? cause.message : 'Daftar aset tidak dapat dimuat.'); setLoading(false) }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selected) return
    const requestId = ++requestRef.current
    let active = true
    setLoading(true)
    setError(null)
    setCandles([])
    setPairCandles([])
    const load = async (asset: MarketAsset) => {
      let rows = await getCandles(asset.id, '1d')
      if (!rows.length) {
        await syncMarketData(asset.symbol, '1d')
        rows = await getCandles(asset.id, '1d')
      }
      return rows
    }
    const jobs = [load(selected), pair ? load(pair) : Promise.resolve([])]
    Promise.allSettled(jobs).then((results) => {
      if (!active || requestId !== requestRef.current) return
      if (results[0].status === 'fulfilled') setCandles(results[0].value)
      else setError(results[0].reason instanceof Error ? results[0].reason.message : 'Riwayat harga tidak dapat dimuat.')
      if (results[1].status === 'fulfilled') setPairCandles(results[1].value)
      setLoading(false)
    })
    return () => { active = false }
  }, [selected?.id, pair?.id])

  async function refreshData() {
    if (!selected || refreshing) return
    setRefreshing(true)
    setError(null)
    try {
      await Promise.all([syncMarketData(selected.symbol, '1d'), ...(pair ? [syncMarketData(pair.symbol, '1d')] : [])])
      const [latest, pairLatest] = await Promise.all([getCandles(selected.id, '1d'), pair ? getCandles(pair.id, '1d') : Promise.resolve([])])
      setCandles(latest)
      setPairCandles(pairLatest)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Data terbaru tidak dapat disinkronkan.')
    } finally {
      setRefreshing(false)
    }
  }

  const topSignal = consensus === 'KONSENSUS LONG' ? 'Konsensus LONG' : consensus === 'KONSENSUS SHORT' ? 'Konsensus SHORT' : consensus === 'KONFLIK MODEL' ? 'Model berbeda arah' : consensus === 'SATU MODEL AKTIF' ? 'Satu model memberi sinyal' : consensus === 'DATA BELUM CUKUP' ? 'Belum cukup data' : 'Belum ada sinyal arah'
  const consensusTone = consensus.includes('LONG') ? 'text-positive' : consensus.includes('SHORT') ? 'text-negative' : consensus.includes('KONFLIK') ? 'text-warning' : 'text-muted-foreground'

  return <div className="mx-auto min-w-0 max-w-[1440px] space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl"><p className="eyebrow mb-2">Market Terminal / Quant Lab</p><div className="flex items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><BrainCircuit className="size-5" /></span><h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Model Kuantitatif</h1></div><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">Sinyal berbasis momentum, mean reversion, volatilitas terealisasi, dan pasangan statistik. Semua dihitung dari candle harian yang tersimpan—bukan prediksi pasti atau order otomatis.</p></div>
      <Button onClick={() => void refreshData()} disabled={!selected || loading || refreshing} variant="outline" className="min-h-11 shrink-0"><RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />{refreshing ? 'Memperbarui…' : 'Segarkan candle'}</Button>
    </div>

    <Card className="overflow-hidden border-gold/25 bg-gradient-to-br from-card via-card to-gold/[0.06]">
      <CardContent className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(250px,0.75fr)] xl:items-center">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">Ringkasan sinyal model</Badge>{selected?.is_delayed && <Badge variant="outline">Data delayed / EOD</Badge>}</div><h2 className={cn('mt-3 text-2xl font-semibold tracking-tight md:text-3xl', consensusTone)}>{loading ? 'Menghitung model…' : topSignal}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{consensus === 'KONFLIK MODEL' ? 'Momentum dan mean reversion menunjuk arah berlawanan. Model tidak membuat keputusan gabungan; pertimbangkan no-trade sampai konflik terurai.' : consensus === 'SATU MODEL AKTIF' ? 'Hanya satu model arah yang aktif. Anggap sebagai sinyal eksploratif, bukan konfirmasi independen.' : consensus.startsWith('KONSENSUS') ? 'Kedua model arah sejalan pada data historis terbaru. Kesepakatan ini tetap bukan probabilitas menang atau jaminan hasil.' : 'Tunggu data yang cukup atau kondisi model yang memenuhi ambang batas yang dijelaskan.'}</p></div>
        <div className="grid grid-cols-2 gap-3 xl:border-l xl:border-border xl:pl-5"><div className="rounded-lg border border-border bg-background/55 p-3"><p className="text-xs text-muted-foreground">Aset utama</p><p className="mt-1 truncate font-semibold">{selected?.symbol ?? '—'}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{selected?.display_name ?? 'Pilih aset'}</p></div><div className="rounded-lg border border-border bg-background/55 p-3"><p className="text-xs text-muted-foreground">Candle harian terakhir</p><p className="mt-1 font-semibold tabular-nums">{dateLabel(candles.at(-1)?.candle_time)}</p><p className="mt-0.5 text-xs text-muted-foreground">{candles.length ? `${candles.length} observasi tersedia` : 'Belum ada observasi'}</p></div></div>
      </CardContent>
    </Card>

    {error && <div role="alert" className="flex gap-3 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}

    <Card><CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end md:p-5">
      <label className="block min-w-0"><span className="mb-1.5 block text-sm font-medium">Aset / instrumen</span><select value={symbol} onChange={(event) => setSymbol(event.target.value)} disabled={!assets.length} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{assets.map((asset) => <option key={asset.id} value={asset.symbol}>{asset.symbol} — {asset.display_name}</option>)}</select></label>
      <label className="block min-w-0"><span className="mb-1.5 block text-sm font-medium">Pasangan untuk pairs</span><select value={pair?.symbol ?? ''} onChange={(event) => setPairSymbol(event.target.value)} disabled={!candidates.length} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Tidak tersedia</option>{candidates.map((asset) => <option key={asset.id} value={asset.symbol}>{asset.symbol} — {asset.display_name}</option>)}</select></label>
      <fieldset className="min-w-0"><legend className="mb-1.5 text-sm font-medium">Jendela analisis</legend><div className="flex h-11 items-center gap-1 rounded-md border border-input bg-background p-1">{WINDOWS.map((window) => <button key={window.bars} type="button" onClick={() => setWindowBars(window.bars)} aria-pressed={windowBars === window.bars} className={cn('h-full min-w-0 flex-1 rounded px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', windowBars === window.bars ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground')}>{window.label}</button>)}</div></fieldset>
    </CardContent></Card>

    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
      <Card className="min-w-0 overflow-hidden"><CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-gold" />Harga & tren</CardTitle><p className="mt-1 text-xs text-muted-foreground">Penutupan harian dengan EMA 20 / EMA 50</p></div>{loading && <span className="text-xs text-muted-foreground">Memuat data…</span>}</CardHeader><CardContent>{scopedCandles.length ? <LineChart candles={scopedCandles} currency={selected?.currency ?? 'USD'} /> : <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">Belum ada candle untuk aset ini.</div>}</CardContent></Card>
      <Card className="min-w-0"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Sigma className="size-4 text-gold" />Sinyal konsensus</CardTitle><p className="text-xs text-muted-foreground">Hanya membandingkan model arah pada aset utama.</p></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border border-border bg-background/55 p-4"><p className="text-xs font-medium tracking-wide text-muted-foreground">MOMENTUM 20/50</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm">{signalLabel(trend.signal)}</span><span className="font-semibold tabular-nums">{trend.return20 === null ? '—' : `${trend.return20 >= 0 ? '+' : ''}${number(trend.return20 * 100)}%`}</span></div></div><div className="rounded-lg border border-border bg-background/55 p-4"><p className="text-xs font-medium tracking-wide text-muted-foreground">MEAN REVERSION · Z-SCORE</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm">{signalLabel(meanReversion.signal)}</span><span className="font-semibold tabular-nums">{meanReversion.zScore === null ? '—' : `${meanReversion.zScore > 0 ? '+' : ''}${number(meanReversion.zScore)}σ`}</span></div></div><div className="flex items-start gap-2 rounded-lg bg-muted/55 p-3 text-xs leading-relaxed text-muted-foreground"><CircleHelp className="mt-0.5 size-4 shrink-0 text-gold" />Konflik antarmodel tidak dirata-ratakan menjadi satu rekomendasi. Periksa horizon dan asumsi strategi sebelum menafsirkan sinyal.</div></CardContent></Card>
    </div>

    <div><div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Output per teori</p><h2 className="mt-1 text-xl font-semibold">Model & sinyal terkini</h2></div><span className="hidden text-xs text-muted-foreground md:block">Sinyal arah ≠ jaminan performa</span></div><div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      <SignalCard icon={Activity} title="Momentum / trend" subtitle="EMA 20/50 + return 20 bar" signal={trend.signal} metric={trend.return20 === null ? '—' : `${trend.return20 >= 0 ? '+' : ''}${number(trend.return20 * 100)}% / 20 bar`} detail={trend.signal === 'LONG' ? 'Close di atas EMA 20, EMA 20 di atas EMA 50, dan return 20 bar positif.' : trend.signal === 'SHORT' ? 'Close di bawah EMA 20, EMA 20 di bawah EMA 50, dan return 20 bar negatif.' : trend.signal === 'WAIT' ? 'Butuh sedikitnya 50 observasi harian untuk menilai susunan EMA.' : 'Kondisi EMA dan return belum memberi arah yang selaras.'} footnote="Signal trend-following; cenderung terlambat dan rentan whipsaw saat pasar sideways." />
      <SignalCard icon={Waves} title="Mean reversion" subtitle="Z-score close terhadap SMA 20" signal={meanReversion.signal} metric={meanReversion.zScore === null ? '—' : `${meanReversion.zScore > 0 ? '+' : ''}${number(meanReversion.zScore)}σ`} detail={meanReversion.signal === 'LONG' ? 'Harga berada ≥2 simpangan baku di bawah rata-rata 20 bar; kandidat konvergensi, bukan bukti harga akan berbalik.' : meanReversion.signal === 'SHORT' ? 'Harga berada ≥2 simpangan baku di atas rata-rata 20 bar; kandidat konvergensi, bukan bukti harga akan berbalik.' : meanReversion.signal === 'WAIT' ? 'Perlu 20 bar dan variasi harga yang memadai untuk menghitung z-score.' : 'Harga masih di dalam ambang ±2σ; tidak ada ekstrem statistik saat ini.'} footnote="Asumsi mean reversion dapat gagal saat terjadi perubahan rezim atau tren kuat." />
      <SignalCard icon={BarChart3} title="Realized volatility" subtitle="Simpangan baku log-return 21 bar" signal={volatility.regime === 'WAIT' ? 'WAIT' : 'NEUTRAL'} metric={volatility.annualized === null ? '—' : `${number(volatility.annualized * 100, 1)}%`} detail={volatility.regime === 'WAIT' ? 'Riwayat belum cukup untuk estimasi volatilitas tahunan.' : `Regime ${volatility.regime.toLowerCase()} · baseline median historis ${volatility.baseline === null ? '—' : `${number(volatility.baseline * 100, 1)}%`} annualized.`} footnote="Risk state, bukan sinyal arah. Tahunanisasi memakai √252; annualisasi bukan ramalan." />
      <SignalCard icon={Sigma} title="Statistical arbitrage" subtitle={`Spread ${selected?.symbol ?? 'A'} / ${pair?.symbol ?? 'B'}`} signal={pairResult.signal} metric={pairResult.zScore === null ? '—' : `Z ${pairResult.zScore > 0 ? '+' : ''}${number(pairResult.zScore)}`} detail={!pair ? 'Butuh pasangan aset dengan market, mata uang, dan kelas aset yang sama.' : pairResult.signal === 'WAIT' ? `Observasi overlap: ${pairResult.observations}/100 minimum untuk screening.` : pairResult.signal === 'LONG_SPREAD' ? `Spread tertekan; screen lolos. Long ${selected?.symbol}, short ${pair.symbol} menurut rasio hedge.` : pairResult.signal === 'SHORT_SPREAD' ? `Spread melebar; screen lolos. Short ${selected?.symbol}, long ${pair.symbol} menurut rasio hedge.` : pairResult.stationaryScreen ? 'Screen stasioner lolos, tetapi deviasi spread belum menyentuh ambang ±2σ.' : 'Tidak ada sinyal: screen Engle–Granger konservatif belum lolos ambang yang digunakan.'} footnote="Screen ADF residual tanpa lag (kritikal 5% ≈ −3,34) hanyalah pendekatan; perlu uji kointegrasi dan backtest out-of-sample." />
    </div></div>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-4 text-gold" />Risk & posisi</CardTitle><p className="text-xs text-muted-foreground">Tindakan sebelum sinyal dipakai dalam keputusan.</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-border p-3"><p className="text-xs font-medium">Volatilitas</p><p className="mt-1 text-sm text-muted-foreground">Gunakan ukuran posisi yang mempertimbangkan risiko dan gap harga.</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs font-medium">Eksekusi</p><p className="mt-1 text-sm text-muted-foreground">SHORT hanya jika instrumen dan broker mengizinkan; perhitungkan biaya, slippage, dan likuiditas.</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs font-medium">Validasi</p><p className="mt-1 text-sm text-muted-foreground">Uji walk-forward dengan data bersih, corporate action, biaya, dan benchmark sebelum penggunaan.</p></div></CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-gold" />Metode & batasan</CardTitle><p className="text-xs text-muted-foreground">Definisi yang dipakai pada halaman ini.</p></CardHeader><CardContent><ul className="space-y-2 text-sm leading-relaxed text-muted-foreground"><li><b className="text-foreground">Momentum:</b> long jika close &gt; EMA20 &gt; EMA50 dan return 20 bar positif; short kebalikannya.</li><li><b className="text-foreground">Mean reversion:</b> z = (close − SMA20) / simpangan baku sampel 20 bar; kandidat di luar ±2σ.</li><li><b className="text-foreground">Pairs:</b> regresi log-harga untuk hedge ratio, z-score spread, lalu screen residual ADF satu lag nol.</li><li><b className="text-foreground">Data:</b> memakai candle daily dari Market Terminal; sinyal tidak dieksekusi otomatis, tidak memuat biaya transaksi, dan bukan nasihat investasi.</li></ul></CardContent></Card>
    </div>
    <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />Sinyal kuantitatif ini bersifat riset/edukasi. Tidak ada probabilitas menang yang diklaim; data delayed, survivorship bias, likuiditas, aksi korporasi, dan perubahan rezim dapat mengubah hasil.</p>
  </div>
}
