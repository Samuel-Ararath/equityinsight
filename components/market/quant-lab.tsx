'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, BookOpen, BrainCircuit, CircleHelp, Clock3, RefreshCw, ShieldAlert, Sigma, Waves } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getCandles, listMarketAssets, syncMarketData, type MarketAsset, type MarketCandle } from '@/lib/market-data'
import { calculateConsensus, calculateMeanReversion, calculatePairsSignal, calculateRealizedVolatility, calculateTrend, runQuantBacktest, type BacktestSideResult, type ModelSignal, type PairResult, type QuantBacktestReport } from '@/components/market/quant-models'

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

function adjustedClose(candle: MarketCandle) {
  return Number.isFinite(candle.adjusted_close) && (candle.adjusted_close ?? 0) > 0 ? candle.adjusted_close! : candle.close
}

function dateLabel(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Belum tersedia'
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
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
  const closes = candles.map(adjustedClose)
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

function hitRate(stats: BacktestSideResult['stats'], useNet: boolean) {
  if (stats.hitRate === null) return '—'
  const basis = useNet ? 'net' : 'bruto'
  const interval = stats.lower95 === null || stats.upper95 === null
    ? ''
    : ` · CI Wilson 95% ${number(stats.lower95 * 100, 1)}–${number(stats.upper95 * 100, 1)}%`
  return `${number(stats.hitRate * 100, 1)}% ${basis}${interval}`
}

function BacktestSection({ report, costInput, onCostChange }: { report: QuantBacktestReport; costInput: string; onCostChange: (value: string) => void }) {
  const useNet = report.oneWayCostBps !== null
  const first = report.strategies[0]
  const testStart = first?.testStart ? dateLabel(first.testStart) : '—'
  const testEnd = first?.testEnd ? dateLabel(first.testEnd) : '—'
  const rows = report.strategies.flatMap((strategy) => strategy.sides.map((side) => ({ strategy, side })))
  const ledger = report.strategies.flatMap((strategy) => strategy.sides.flatMap((side) => side.trades.map((trade) => ({ strategy, side, trade }))))
    .sort((a, b) => Date.parse(b.trade.exitTime) - Date.parse(a.trade.exitTime))
    .slice(0, 20)
  const adjustedPercent = report.totalBars ? Math.round(report.adjustedCloseBars / report.totalBars * 100) : 0
  const sourceLabel = report.providers.length ? report.providers.join(' / ') : 'sumber tak tercatat'
  return <Card id="backtest">
    <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
      <div className="max-w-3xl">
        <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4 text-gold" />Backtest out-of-sample</CardTitle>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Pemisahan kronologis 70/30; indikator hanya memakai candle sampai waktu sinyal, entry pada open berikutnya. {useNet ? 'Return dan hit-rate setelah biaya yang Anda masukkan.' : 'Return dan hit-rate bruto; biaya belum dimasukkan.'} Ini frekuensi historis bersyarat, bukan peluang masa depan.</p>
      </div>
      <label className="block w-full shrink-0 md:max-w-[260px]">
        <span className="mb-1 block text-xs font-medium">Biaya satu arah all-in (bps / 1× exposure)</span>
        <input type="number" min="0" max="500" step="1" value={costInput} onChange={(event) => onCostChange(event.target.value)} placeholder="Kosong = bruto saja" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <span className="mt-1 block text-[0.68rem] leading-relaxed text-muted-foreground">Masukkan estimasi komisi + spread + slippage per sisi. Net mengurangi biaya pulang-pergi.</span>
      </label>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-background/45 p-3"><p className="text-[0.68rem] text-muted-foreground">Data / observasi</p><p className="mt-1 text-sm font-medium">{report.totalBars} candle · {dateLabel(report.firstDate ?? undefined)}–{dateLabel(report.lastDate ?? undefined)}</p></div>
        <div className="rounded-lg border border-border bg-background/45 p-3"><p className="text-[0.68rem] text-muted-foreground">Holdout uji</p><p className="mt-1 text-sm font-medium">{testStart}–{testEnd} · {report.testBars} candle</p></div>
        <div className="rounded-lg border border-border bg-background/45 p-3"><p className="text-[0.68rem] text-muted-foreground">Buy & hold pembanding</p><p className="mt-1 text-sm font-medium tabular-nums">{report.benchmarkReturn === null ? '—' : `${number(report.benchmarkReturn * 100, 2)}%`}</p></div>
        <div className="rounded-lg border border-border bg-background/45 p-3"><p className="text-[0.68rem] text-muted-foreground">Sumber / adjusted close</p><p className="mt-1 text-sm font-medium">{sourceLabel}</p><p className="mt-0.5 text-[0.68rem] text-muted-foreground">{adjustedPercent}% baris terisi · {report.delayedBars} delayed</p></div>
        <div className="rounded-lg border border-border bg-background/45 p-3"><p className="text-[0.68rem] text-muted-foreground">Biaya yang dipakai</p><p className="mt-1 text-sm font-medium">{report.oneWayCostBps === null ? 'Belum dimasukkan · gross' : `${number(report.oneWayCostBps, 1)} bps/sisi`}</p></div>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map(({ strategy, side }) => {
          const stats = side.stats
          const sideName = side.side === 'LONG' ? 'Long' : side.side === 'SHORT' ? 'Short' : side.side === 'LONG_SPREAD' ? 'Long spread' : 'Short spread'
          const displayedReturn = stats.averageReturn
          return <div key={`mobile-${strategy.kind}-${side.side}`} className="rounded-lg border border-border bg-background/35 p-3">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold">{strategy.name}</p><p className="mt-0.5 text-[0.68rem] text-muted-foreground">{sideName}</p></div>
              <p className="shrink-0 text-right text-xs font-medium tabular-nums">{stats.count} trade{stats.count === 1 ? '' : 's'}<span className="block text-[0.68rem] text-muted-foreground">{stats.count ? `${stats.wins} menang` : 'belum ada trade'}</span></p>
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <p className="text-[0.68rem] text-muted-foreground">Hit rate OOS · CI Wilson 95%</p>
              <p className="mt-0.5 text-xs font-medium tabular-nums">{hitRate(stats, useNet)}</p>
              {stats.count > 0 && stats.count < 30 && <p className="mt-0.5 text-[0.65rem] text-warning">Sampel tipis; hanya deskriptif, bukan peluang masa depan.</p>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-2 text-[0.68rem]">
              <div><p className="text-muted-foreground">Rata-rata / trade</p><p className="mt-0.5 font-medium tabular-nums">{displayedReturn === null ? '—' : `${number(displayedReturn * 100, 2)}%`}</p></div>
              <div><p className="text-muted-foreground">Profit factor</p><p className="mt-0.5 font-medium tabular-nums">{stats.profitFactor === null ? stats.count && stats.wins === stats.count ? '∞*' : '—' : number(stats.profitFactor, 2)}</p></div>
              <div><p className="text-muted-foreground">DD trade</p><p className="mt-0.5 font-medium tabular-nums">{stats.maxDrawdown === null ? '—' : `${number(stats.maxDrawdown * 100, 2)}%`}</p></div>
            </div>
          </div>
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[770px] text-left text-xs">
          <thead className="bg-muted/55 text-muted-foreground"><tr><th className="px-3 py-2.5 font-medium">Strategi / arah</th><th className="px-3 py-2.5 text-right font-medium">Trade</th><th className="px-3 py-2.5 font-medium">Hit rate OOS</th><th className="px-3 py-2.5 text-right font-medium">Rata-rata / trade</th><th className="px-3 py-2.5 text-right font-medium">Profit factor</th><th className="px-3 py-2.5 text-right font-medium">DD antar-trade</th></tr></thead>
          <tbody>{rows.map(({ strategy, side }) => {
            const stats = side.stats
            const sideName = side.side === 'LONG' ? 'Long' : side.side === 'SHORT' ? 'Short' : side.side === 'LONG_SPREAD' ? 'Long spread' : 'Short spread'
            const reliability = stats.count >= 30 ? 'n ≥ 30 · tetap historis' : stats.count > 0 ? 'Sampel tipis' : 'Belum ada trade'
            return <tr key={`${strategy.kind}-${side.side}`} className="border-t border-border">
              <td className="px-3 py-3"><span className="block font-medium">{strategy.name}</span><span className="text-muted-foreground">{sideName}</span></td>
              <td className="px-3 py-3 text-right tabular-nums">{stats.count}{stats.count ? ` (${stats.wins} menang)` : ''}</td>
              <td className="px-3 py-3"><span className="block font-medium tabular-nums">{hitRate(stats, useNet)}</span><span className={cn('text-[0.68rem]', stats.count >= 30 ? 'text-muted-foreground' : 'text-warning')}>{reliability}{stats.count > 0 && stats.count < 30 ? ' · deskriptif, jangan disebut peluang' : ''}</span></td>
              <td className="px-3 py-3 text-right tabular-nums">{stats.averageReturn === null ? '—' : `${number(stats.averageReturn * 100, 2)}%`}</td>
              <td className="px-3 py-3 text-right tabular-nums">{stats.profitFactor === null ? stats.count && stats.wins === stats.count ? '∞*' : '—' : number(stats.profitFactor, 2)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{stats.maxDrawdown === null ? '—' : `${number(stats.maxDrawdown * 100, 2)}%`}</td>
            </tr>
          })}</tbody>
        </table>
      </div>
      {ledger.length > 0 && <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium">Jurnal trade OOS terbaru ({ledger.length})</summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[690px] text-left text-xs">
            <thead className="bg-muted/45 text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Model / arah</th><th className="px-3 py-2 font-medium">Entry → exit</th><th className="px-3 py-2 text-right font-medium">Return {useNet ? 'net' : 'gross'}</th><th className="px-3 py-2 text-right font-medium">Bar</th><th className="px-3 py-2 font-medium">Alasan keluar</th></tr></thead>
            <tbody>{ledger.map(({ strategy, side, trade }) => <tr key={`${strategy.kind}-${side.side}-${trade.entryTime}`} className="border-t border-border">
              <td className="px-3 py-2"><span className="font-medium">{strategy.name}</span><span className="block text-muted-foreground">{side.side}</span></td>
              <td className="px-3 py-2 tabular-nums">{dateLabel(trade.entryTime)} → {dateLabel(trade.exitTime)}</td>
              <td className={cn('px-3 py-2 text-right font-medium tabular-nums', (useNet ? trade.returnNet ?? trade.returnGross : trade.returnGross) >= 0 ? 'text-positive' : 'text-negative')}>{number((useNet ? trade.returnNet ?? trade.returnGross : trade.returnGross) * 100, 2)}%</td>
              <td className="px-3 py-2 text-right tabular-nums">{trade.barsHeld}</td>
              <td className="px-3 py-2 text-muted-foreground">{trade.exitReason}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>}
      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">CI 95% memakai Wilson, namun mengasumsikan trade independen; hasil pasar berurutan dapat berkorelasi. Sampel kecil, biaya yang belum dimasukkan, harga adjusted yang tidak lengkap, survivorship bias, dan perubahan rezim membatasi inferensi. *PF tak terhingga berarti tidak ada trade rugi dalam sampel—bukan risiko nol.</p>
    </CardContent>
  </Card>
}

export function QuantLab() {
  const [assets, setAssets] = useState<MarketAsset[]>([])
  const [symbol, setSymbol] = useState('')
  const [pairSymbol, setPairSymbol] = useState('')
  const [windowBars, setWindowBars] = useState<WindowBars>(252)
  const [costInput, setCostInput] = useState('')
  const [candles, setCandles] = useState<MarketCandle[]>([])
  const [pairCandles, setPairCandles] = useState<MarketCandle[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestRef = useRef(0)
  const autoSyncedRef = useRef(new Set<string>())

  const selected = assets.find((asset) => asset.symbol === symbol) ?? null
  const candidates = useMemo(() => selected ? assets.filter((asset) => asset.id !== selected.id && asset.market === selected.market && asset.currency === selected.currency && asset.asset_class === selected.asset_class) : [], [assets, selected])
  const pair = candidates.find((asset) => asset.symbol === pairSymbol) ?? candidates[0] ?? null
  const scopedCandles = useMemo(() => candles.slice(-windowBars), [candles, windowBars])
  const scopedPairCandles = useMemo(() => pairCandles.slice(-windowBars), [pairCandles, windowBars])
  const parsedCost = costInput.trim() === '' ? null : Number(costInput)
  const backtestCost = parsedCost !== null && Number.isFinite(parsedCost) && parsedCost >= 0 ? Math.min(parsedCost, 500) : null
  const backtest = useMemo(() => runQuantBacktest(candles, pairCandles, backtestCost), [candles, pairCandles, backtestCost])
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
    const load = async () => {
      let [latest, pairLatest] = await Promise.all([
        getCandles(selected.id, '1d'),
        pair ? getCandles(pair.id, '1d') : Promise.resolve([]),
      ])
      const needsRefresh = (rows: MarketCandle[]) => !rows.length || rows.filter((candle) => Number.isFinite(candle.adjusted_close) && (candle.adjusted_close ?? 0) > 0).length / rows.length < 0.95
      const selectedNeedsRefresh = needsRefresh(latest)
      const pairNeedsRefresh = Boolean(pair && needsRefresh(pairLatest))
      if (selectedNeedsRefresh || pairNeedsRefresh) {
        const symbols = [selected.symbol, ...(pairNeedsRefresh && pair ? [pair.symbol] : [])]
        const syncKey = [...symbols].sort().join(',')
        let alreadySynced = autoSyncedRef.current.has(syncKey)
        try {
          alreadySynced ||= sessionStorage.getItem(`quant-lab-sync:${syncKey}`) === new Date().toISOString().slice(0, 10)
        } catch { /* storage can be disabled; the in-memory guard still applies */ }
        if (!alreadySynced) {
          autoSyncedRef.current.add(syncKey)
          try { sessionStorage.setItem(`quant-lab-sync:${syncKey}`, new Date().toISOString().slice(0, 10)) } catch { /* ignore storage restrictions */ }
          try {
            await syncMarketData(symbols.join(','), '1d')
            ;[latest, pairLatest] = await Promise.all([
              getCandles(selected.id, '1d'),
              pair ? getCandles(pair.id, '1d') : Promise.resolve([]),
            ])
          } catch (syncError) {
            if (!latest.length) throw syncError
          }
        }
      }
      return { latest, pairLatest }
    }
    load().then(({ latest, pairLatest }) => {
      if (!active || requestId !== requestRef.current) return
      setCandles(latest)
      setPairCandles(pairLatest)
    }).catch((cause) => {
      if (active && requestId === requestRef.current) setError(cause instanceof Error ? cause.message : 'Riwayat harga tidak dapat dimuat.')
    }).finally(() => {
      if (active && requestId === requestRef.current) setLoading(false)
    })
    return () => { active = false }
  }, [selected?.id, pair?.id])

  async function refreshData() {
    if (!selected || refreshing) return
    setRefreshing(true)
    setError(null)
    try {
      await syncMarketData([selected.symbol, ...(pair ? [pair.symbol] : [])].join(','), '1d')
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
      <div className="max-w-3xl"><p className="eyebrow mb-2">Market Terminal / Quant Lab</p><div className="flex items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><BrainCircuit className="size-5" /></span><h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Model Kuantitatif</h1></div><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">Sinyal momentum, mean reversion, volatilitas dan pairs disertai backtest kronologis out-of-sample. Hasil melaporkan kinerja historis terukur—bukan jaminan atau ramalan hasil.</p></div>
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
      <Card className="min-w-0 overflow-hidden"><CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-gold" />Harga & tren</CardTitle><p className="mt-1 text-xs text-muted-foreground">Penutupan harian adjusted bila tersedia, dengan EMA 20 / EMA 50</p></div>{loading && <span className="text-xs text-muted-foreground">Memuat data…</span>}</CardHeader><CardContent>{scopedCandles.length ? <LineChart candles={scopedCandles} currency={selected?.currency ?? 'USD'} /> : <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">Belum ada candle untuk aset ini.</div>}</CardContent></Card>
      <Card className="min-w-0"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Sigma className="size-4 text-gold" />Sinyal konsensus</CardTitle><p className="text-xs text-muted-foreground">Hanya membandingkan model arah pada aset utama.</p></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border border-border bg-background/55 p-4"><p className="text-xs font-medium tracking-wide text-muted-foreground">MOMENTUM 20/50</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm">{signalLabel(trend.signal)}</span><span className="font-semibold tabular-nums">{trend.return20 === null ? '—' : `${trend.return20 >= 0 ? '+' : ''}${number(trend.return20 * 100)}%`}</span></div></div><div className="rounded-lg border border-border bg-background/55 p-4"><p className="text-xs font-medium tracking-wide text-muted-foreground">MEAN REVERSION · Z-SCORE</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm">{signalLabel(meanReversion.signal)}</span><span className="font-semibold tabular-nums">{meanReversion.zScore === null ? '—' : `${meanReversion.zScore > 0 ? '+' : ''}${number(meanReversion.zScore)}σ`}</span></div></div><div className="flex items-start gap-2 rounded-lg bg-muted/55 p-3 text-xs leading-relaxed text-muted-foreground"><CircleHelp className="mt-0.5 size-4 shrink-0 text-gold" />Konflik antarmodel tidak dirata-ratakan menjadi satu rekomendasi. Periksa horizon dan asumsi strategi sebelum menafsirkan sinyal.</div></CardContent></Card>
    </div>

    <div><div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Output per teori</p><h2 className="mt-1 text-xl font-semibold">Model & sinyal terkini</h2></div><span className="hidden text-xs text-muted-foreground md:block">Sinyal arah ≠ jaminan performa</span></div><div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      <SignalCard icon={Activity} title="Momentum / trend" subtitle="EMA 20/50 + return 20 bar" signal={trend.signal} metric={trend.return20 === null ? '—' : `${trend.return20 >= 0 ? '+' : ''}${number(trend.return20 * 100)}% / 20 bar`} detail={trend.signal === 'LONG' ? 'Close di atas EMA 20, EMA 20 di atas EMA 50, dan return 20 bar positif.' : trend.signal === 'SHORT' ? 'Close di bawah EMA 20, EMA 20 di bawah EMA 50, dan return 20 bar negatif.' : trend.signal === 'WAIT' ? 'Butuh sedikitnya 50 observasi harian untuk menilai susunan EMA.' : 'Kondisi EMA dan return belum memberi arah yang selaras.'} footnote="Signal trend-following; cenderung terlambat dan rentan whipsaw saat pasar sideways." />
      <SignalCard icon={Waves} title="Mean reversion" subtitle="Z-score close terhadap SMA 20" signal={meanReversion.signal} metric={meanReversion.zScore === null ? '—' : `${meanReversion.zScore > 0 ? '+' : ''}${number(meanReversion.zScore)}σ`} detail={meanReversion.signal === 'LONG' ? 'Harga berada ≥2 simpangan baku di bawah rata-rata 20 bar; kandidat konvergensi, bukan bukti harga akan berbalik.' : meanReversion.signal === 'SHORT' ? 'Harga berada ≥2 simpangan baku di atas rata-rata 20 bar; kandidat konvergensi, bukan bukti harga akan berbalik.' : meanReversion.signal === 'WAIT' ? 'Perlu 20 bar dan variasi harga yang memadai untuk menghitung z-score.' : 'Harga masih di dalam ambang ±2σ; tidak ada ekstrem statistik saat ini.'} footnote="Asumsi mean reversion dapat gagal saat terjadi perubahan rezim atau tren kuat." />
      <SignalCard icon={BarChart3} title="Realized volatility" subtitle="Simpangan baku log-return 21 bar" signal={volatility.regime === 'WAIT' ? 'WAIT' : 'NEUTRAL'} metric={volatility.annualized === null ? '—' : `${number(volatility.annualized * 100, 1)}%`} detail={volatility.regime === 'WAIT' ? 'Riwayat belum cukup untuk estimasi volatilitas tahunan.' : `Regime ${volatility.regime.toLowerCase()} · baseline median historis ${volatility.baseline === null ? '—' : `${number(volatility.baseline * 100, 1)}%`} annualized.`} footnote="Risk state, bukan sinyal arah. Tahunanisasi memakai √252; annualisasi bukan ramalan." />
      <SignalCard icon={Sigma} title="Statistical arbitrage" subtitle={`Spread ${selected?.symbol ?? 'A'} / ${pair?.symbol ?? 'B'}`} signal={pairResult.signal} metric={pairResult.zScore === null ? '—' : `Z ${pairResult.zScore > 0 ? '+' : ''}${number(pairResult.zScore)}`} detail={!pair ? 'Butuh pasangan aset dengan market, mata uang, dan kelas aset yang sama.' : pairResult.signal === 'WAIT' ? `Observasi overlap: ${pairResult.observations}/100 minimum untuk screening.` : pairResult.signal === 'LONG_SPREAD' ? `Spread tertekan; screen lolos. Long ${selected?.symbol}, short ${pair.symbol} menurut rasio hedge.` : pairResult.signal === 'SHORT_SPREAD' ? `Spread melebar; screen lolos. Short ${selected?.symbol}, long ${pair.symbol} menurut rasio hedge.` : pairResult.stationaryScreen ? 'Screen stasioner lolos, tetapi deviasi spread belum menyentuh ambang ±2σ.' : 'Tidak ada sinyal: screen Engle–Granger konservatif belum lolos ambang yang digunakan.'} footnote="Screen ADF residual tanpa lag (kritikal 5% ≈ −3,34) hanyalah pendekatan; perlu uji kointegrasi dan backtest out-of-sample." />
    </div></div>

    <BacktestSection report={backtest} costInput={costInput} onCostChange={setCostInput} />

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-4 text-gold" />Risk & posisi</CardTitle><p className="text-xs text-muted-foreground">Tindakan sebelum sinyal dipakai dalam keputusan.</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-border p-3"><p className="text-xs font-medium">Volatilitas</p><p className="mt-1 text-sm text-muted-foreground">Gunakan ukuran posisi yang mempertimbangkan risiko, gap harga, dan likuiditas.</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs font-medium">Eksekusi</p><p className="mt-1 text-sm text-muted-foreground">SHORT hanya jika broker mengizinkan. Masukkan estimasi fee, spread, dan slippage sebelum membaca hasil net.</p></div><div className="rounded-lg border border-border p-3"><p className="text-xs font-medium">Validasi</p><p className="mt-1 text-sm text-muted-foreground">Backtest pada satu aset tidak mengatasi survivorship bias; uji lintas aset dan periode lain sebelum penggunaan.</p></div></CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4 text-gold" />Metode & batasan</CardTitle><p className="text-xs text-muted-foreground">Aturan eksekusi dan harga yang digunakan di halaman ini.</p></CardHeader><CardContent><ul className="space-y-2 text-sm leading-relaxed text-muted-foreground"><li><b className="text-foreground">Momentum:</b> long jika close &gt; EMA20 &gt; EMA50 dan return 20 bar positif; sebaliknya short. Keluar saat syarat batal atau maksimum 20 bar.</li><li><b className="text-foreground">Mean reversion:</b> z-score SMA 20; masuk di luar ±2σ, keluar saat z-score kembali ke 0, stop di ±3σ, atau maksimum 10 bar.</li><li><b className="text-foreground">Pairs:</b> beta rolling 126 candle dan screen residual Engle–Granger/ADF pendekatan; masuk di ±2σ, stop ±3σ, maksimum 20 bar. Return dinormalisasi terhadap gross exposure.</li><li><b className="text-foreground">Backtest:</b> 70% awal hanya warm-up; 30% terakhir holdout berurutan, parameter tetap, sinyal setelah close dieksekusi pada open berikutnya. Posisi yang tersisa dilikuidasi di close terakhir.</li><li><b className="text-foreground">Harga:</b> adjusted close Yahoo dipakai bila tersedia; open disesuaikan dengan faktor close. Sumber lain dapat berupa harga tak disesuaikan. Dividen, short borrow, pajak, market impact, dan gap eksekusi tidak otomatis dimodelkan.</li></ul></CardContent></Card>
    </div>
    <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />Hit-rate di atas adalah statistik historis pada holdout terpilih, bukan probabilitas menang pada trade berikutnya dan bukan janji keuntungan. Data tertunda, sampel kecil, dependensi antar-trade, survivorship bias, corporate action, likuiditas, biaya aktual, short borrow, dan perubahan rezim dapat mengubah hasil.</p>
  </div>
}
