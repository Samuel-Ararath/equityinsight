import type { MarketCandle } from '@/lib/market-data'

export type ModelSignal = 'LONG' | 'SHORT' | 'NEUTRAL' | 'WAIT'
export type PairSignal = 'LONG_SPREAD' | 'SHORT_SPREAD' | 'NEUTRAL' | 'WAIT'

export type TrendResult = {
  signal: ModelSignal
  close: number | null
  ema20: number | null
  ema50: number | null
  return20: number | null
  bars: number
}

export type ReversionResult = {
  signal: ModelSignal
  zScore: number | null
  mean: number | null
  standardDeviation: number | null
  bars: number
}

export type VolatilityResult = {
  annualized: number | null
  baseline: number | null
  regime: 'TINGGI' | 'RENDAH' | 'NORMAL' | 'WAIT'
  bars: number
}

export type PairResult = {
  signal: PairSignal
  zScore: number | null
  beta: number | null
  adfT: number | null
  halfLife: number | null
  observations: number
  stationaryScreen: boolean
}

export type BacktestSide = 'LONG' | 'SHORT' | 'LONG_SPREAD' | 'SHORT_SPREAD'
export type BacktestKind = 'momentum' | 'mean-reversion' | 'statistical-arbitrage'
export type BacktestTrade = {
  side: BacktestSide
  entryTime: string
  exitTime: string
  returnGross: number
  returnNet: number | null
  exitReason: string
  barsHeld: number
}
export type BacktestStats = {
  count: number
  wins: number
  hitRate: number | null
  lower95: number | null
  upper95: number | null
  averageReturn: number | null
  medianReturn: number | null
  profitFactor: number | null
  compoundedReturn: number | null
  maxDrawdown: number | null
}
export type BacktestSideResult = {
  side: BacktestSide
  stats: BacktestStats
  trades: BacktestTrade[]
}
export type BacktestStrategyResult = {
  kind: BacktestKind
  name: string
  testStart: string | null
  testEnd: string | null
  trainBars: number
  testBars: number
  sides: BacktestSideResult[]
}
export type QuantBacktestReport = {
  totalBars: number
  adjustedCloseBars: number
  delayedBars: number
  providers: string[]
  firstDate: string | null
  lastDate: string | null
  splitDate: string | null
  testBars: number
  oneWayCostBps: number | null
  benchmarkReturn: number | null
  strategies: BacktestStrategyResult[]
}

const closeOf = (candle: MarketCandle) =>
  Number.isFinite(candle.adjusted_close) && (candle.adjusted_close ?? 0) > 0 ? candle.adjusted_close! : candle.close

const adjustedOpenOf = (candle: MarketCandle) =>
  Number.isFinite(candle.adjusted_close) && candle.close > 0
    ? candle.open * (candle.adjusted_close! / candle.close)
    : candle.open

function cleanCandles(candles: MarketCandle[]) {
  return candles
    .filter((candle) => Number.isFinite(closeOf(candle)) && closeOf(candle) > 0 && Number.isFinite(Date.parse(candle.candle_time)))
    .sort((a, b) => Date.parse(a.candle_time) - Date.parse(b.candle_time))
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN
}

function sampleStd(values: number[]) {
  if (values.length < 2) return NaN
  const average = mean(values)
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1))
}

function ema(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null)
  if (values.length < period) return out
  let current = mean(values.slice(0, period))
  out[period - 1] = current
  const alpha = 2 / (period + 1)
  for (let index = period; index < values.length; index += 1) {
    current = values[index] * alpha + current * (1 - alpha)
    out[index] = current
  }
  return out
}

export function calculateTrend(candles: MarketCandle[]): TrendResult {
  const rows = cleanCandles(candles)
  const closes = rows.map(closeOf)
  const ema20 = ema(closes, 20)
  const ema50 = ema(closes, 50)
  const last = closes.length - 1
  const close = closes[last] ?? null
  const e20 = ema20[last] ?? null
  const e50 = ema50[last] ?? null
  const return20 = closes.length > 20 ? close! / closes[closes.length - 21] - 1 : null
  let signal: ModelSignal = 'WAIT'
  if (close !== null && e20 !== null && e50 !== null && return20 !== null) {
    if (close > e20 && e20 > e50 && return20 > 0) signal = 'LONG'
    else if (close < e20 && e20 < e50 && return20 < 0) signal = 'SHORT'
    else signal = 'NEUTRAL'
  }
  return { signal, close, ema20: e20, ema50: e50, return20, bars: closes.length }
}

export function calculateMeanReversion(candles: MarketCandle[], period = 20): ReversionResult {
  const closes = cleanCandles(candles).map(closeOf)
  if (closes.length < period) return { signal: 'WAIT', zScore: null, mean: null, standardDeviation: null, bars: closes.length }
  const recent = closes.slice(-period)
  const average = mean(recent)
  const deviation = sampleStd(recent)
  if (!Number.isFinite(deviation) || deviation <= 0) return { signal: 'WAIT', zScore: null, mean: average, standardDeviation: deviation, bars: closes.length }
  const zScore = (recent[recent.length - 1] - average) / deviation
  const signal: ModelSignal = zScore <= -2 ? 'LONG' : zScore >= 2 ? 'SHORT' : 'NEUTRAL'
  return { signal, zScore, mean: average, standardDeviation: deviation, bars: closes.length }
}

function annualizedVolatility(closes: number[]) {
  const returns = closes.slice(1).map((close, index) => Math.log(close / closes[index]))
  if (returns.length < 2) return NaN
  return sampleStd(returns) * Math.sqrt(252)
}

export function calculateRealizedVolatility(candles: MarketCandle[], window = 21): VolatilityResult {
  const closes = cleanCandles(candles).map(closeOf)
  if (closes.length < window + 1) return { annualized: null, baseline: null, regime: 'WAIT', bars: closes.length }
  const annualized = annualizedVolatility(closes.slice(-(window + 1)))
  const start = Math.max(window + 1, closes.length - 126)
  const rolling: number[] = []
  for (let end = start; end <= closes.length; end += 1) {
    const value = annualizedVolatility(closes.slice(end - window - 1, end))
    if (Number.isFinite(value)) rolling.push(value)
  }
  const baseline = rolling.length ? median(rolling.slice(0, -1).length ? rolling.slice(0, -1) : rolling) : null
  if (!Number.isFinite(annualized) || baseline === null || baseline <= 0) {
    return { annualized: Number.isFinite(annualized) ? annualized : null, baseline, regime: 'WAIT', bars: closes.length }
  }
  const ratio = annualized / baseline
  const regime = ratio >= 1.5 ? 'TINGGI' : ratio <= 0.7 ? 'RENDAH' : 'NORMAL'
  return { annualized, baseline, regime, bars: closes.length }
}

function median(values: number[]) {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function ordinaryLeastSquares(x: number[], y: number[]) {
  const xMean = mean(x)
  const yMean = mean(y)
  const denominator = x.reduce((sum, value) => sum + (value - xMean) ** 2, 0)
  if (denominator <= 0) return null
  const slope = x.reduce((sum, value, index) => sum + (value - xMean) * (y[index] - yMean), 0) / denominator
  return { intercept: yMean - slope * xMean, slope }
}

export function calculatePairsSignal(primary: MarketCandle[], hedge: MarketCandle[]): PairResult {
  const left = cleanCandles(primary)
  const right = cleanCandles(hedge)
  const rightByTime = new Map(right.map((row) => [dateKey(row.candle_time), row]))
  const aligned = left.flatMap((row) => {
    const hedgeRow = rightByTime.get(dateKey(row.candle_time))
    return hedgeRow ? [{ time: row.candle_time, y: Math.log(closeOf(row)), x: Math.log(closeOf(hedgeRow)) }] : []
  }).slice(-126)
  const insufficient: PairResult = { signal: 'WAIT', zScore: null, beta: null, adfT: null, halfLife: null, observations: aligned.length, stationaryScreen: false }
  if (aligned.length < 60) return insufficient

  // Engle–Granger level regression, followed by an unlagged residual ADF screen.
  const fit = ordinaryLeastSquares(aligned.map((row) => row.x), aligned.map((row) => row.y))
  if (!fit) return insufficient
  const spread = aligned.map((row) => row.y - fit.intercept - fit.slope * row.x)
  const zScore = (spread[spread.length - 1] - mean(spread)) / sampleStd(spread)
  const lagged = spread.slice(0, -1)
  const differences = spread.slice(1).map((value, index) => value - spread[index])
  const denominator = lagged.reduce((sum, value) => sum + value ** 2, 0)
  if (denominator <= 0 || lagged.length < 3 || !Number.isFinite(zScore)) return { ...insufficient, beta: fit.slope }
  const gamma = lagged.reduce((sum, value, index) => sum + value * differences[index], 0) / denominator
  const residuals = differences.map((value, index) => value - gamma * lagged[index])
  const residualVariance = residuals.reduce((sum, value) => sum + value ** 2, 0) / Math.max(1, residuals.length - 1)
  const standardError = Math.sqrt(residualVariance / denominator)
  const adfT = standardError > 0 ? gamma / standardError : NaN
  // A conservative asymptotic Engle–Granger 5% screen for two I(1) series.
  const stationaryScreen = Number.isFinite(adfT) && aligned.length >= 100 && adfT < -3.34
  const halfLife = gamma < 0 && gamma > -1 ? -Math.log(2) / Math.log(1 + gamma) : null
  const signal: PairSignal = !stationaryScreen ? 'NEUTRAL' : zScore >= 2 ? 'SHORT_SPREAD' : zScore <= -2 ? 'LONG_SPREAD' : 'NEUTRAL'
  return { signal, zScore, beta: fit.slope, adfT: Number.isFinite(adfT) ? adfT : null, halfLife: Number.isFinite(halfLife) ? halfLife : null, observations: aligned.length, stationaryScreen }
}

function wilsonInterval(wins: number, count: number) {
  if (!count) return { lower: null, upper: null }
  const z = 1.959963984540054
  const p = wins / count
  const denominator = 1 + z ** 2 / count
  const center = (p + z ** 2 / (2 * count)) / denominator
  const radius = z * Math.sqrt((p * (1 - p) + z ** 2 / (4 * count)) / count) / denominator
  return { lower: Math.max(0, center - radius), upper: Math.min(1, center + radius) }
}

function medianValue(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function summarizeTrades(trades: BacktestTrade[], useNet: boolean): BacktestStats {
  const values = trades.map((trade) => useNet ? trade.returnNet : trade.returnGross).filter((value): value is number => value !== null && Number.isFinite(value))
  if (!values.length) return { count: 0, wins: 0, hitRate: null, lower95: null, upper95: null, averageReturn: null, medianReturn: null, profitFactor: null, compoundedReturn: null, maxDrawdown: null }
  const wins = values.filter((value) => value > 0).length
  const interval = wilsonInterval(wins, values.length)
  const positive = values.filter((value) => value > 0).reduce((sum, value) => sum + value, 0)
  const negative = -values.filter((value) => value < 0).reduce((sum, value) => sum + value, 0)
  let equity = 1
  let peak = 1
  let maxDrawdown = 0
  for (const value of values) {
    equity *= Math.max(0, 1 + value)
    peak = Math.max(peak, equity)
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, 1 - equity / peak)
  }
  return {
    count: values.length,
    wins,
    hitRate: wins / values.length,
    lower95: interval.lower,
    upper95: interval.upper,
    averageReturn: values.reduce((sum, value) => sum + value, 0) / values.length,
    medianReturn: medianValue(values),
    profitFactor: negative === 0 ? positive > 0 ? null : 0 : positive / negative,
    compoundedReturn: equity - 1,
    maxDrawdown,
  }
}

function dateKey(value: string) {
  return value.slice(0, 10)
}

function sideResults(trades: BacktestTrade[], useNet: boolean, sides: BacktestSide[]): BacktestSideResult[] {
  return sides.map((side) => {
    const matching = trades.filter((trade) => trade.side === side)
    return { side, trades: matching, stats: summarizeTrades(matching, useNet) }
  })
}

function singleAssetTrades(
  rows: MarketCandle[],
  split: number,
  kind: 'momentum' | 'mean-reversion',
  costBps: number | null,
): BacktestTrade[] {
  const trades: BacktestTrade[] = []
  const signalAt = (index: number) => {
    const history = rows.slice(0, index + 1)
    if (kind === 'momentum') return { signal: calculateTrend(history).signal, zScore: null }
    const result = calculateMeanReversion(history)
    return { signal: result.signal, zScore: result.zScore }
  }
  const firstSignal = Math.max(49, split - 1)
  let signalIndex = firstSignal
  while (signalIndex < rows.length - 1) {
    const entrySignal = signalAt(signalIndex)
    if (entrySignal.signal !== 'LONG' && entrySignal.signal !== 'SHORT') {
      signalIndex += 1
      continue
    }
    const side = entrySignal.signal
    const entryIndex = signalIndex + 1
    if (entryIndex >= rows.length) break
    const entryPrice = adjustedOpenOf(rows[entryIndex])
    if (!(entryPrice > 0)) {
      signalIndex += 1
      continue
    }
    let exitIndex = rows.length - 1
    let exitPrice = closeOf(rows[exitIndex])
    let exitReason = 'Akhir jendela OOS (likuidasi terjadwal saat penutupan)'
    let exitAtClose = true
    for (let closeIndex = entryIndex; closeIndex < rows.length; closeIndex += 1) {
      const barsHeld = closeIndex - entryIndex + 1
      if (closeIndex === rows.length - 1) {
        exitIndex = closeIndex
        exitPrice = closeOf(rows[closeIndex])
        break
      }
      const current = signalAt(closeIndex)
      let shouldExit = false
      let reason = ''
      if (kind === 'momentum') {
        shouldExit = current.signal !== side
        reason = 'Sinyal trend berubah'
      } else if (current.zScore !== null) {
        shouldExit = side === 'LONG'
          ? current.zScore >= 0 || current.zScore <= -3
          : current.zScore <= 0 || current.zScore >= 3
        reason = Math.abs(current.zScore) >= 3 ? 'Stop z-score 3σ' : 'Spread kembali ke mean'
      }
      if (shouldExit) {
        exitIndex = closeIndex + 1
        exitPrice = adjustedOpenOf(rows[exitIndex])
        exitReason = reason
        exitAtClose = false
        break
      }
      if (barsHeld >= (kind === 'momentum' ? 20 : 10)) {
        exitIndex = closeIndex + 1
        exitPrice = adjustedOpenOf(rows[exitIndex])
        exitReason = 'Batas holding period'
        exitAtClose = false
        break
      }
    }
    const gross = side === 'LONG' ? exitPrice / entryPrice - 1 : 1 - exitPrice / entryPrice
    const roundTripCost = costBps === null ? null : 2 * costBps / 10_000
    trades.push({
      side,
      entryTime: rows[entryIndex].candle_time,
      exitTime: rows[exitIndex].candle_time,
      returnGross: gross,
      returnNet: roundTripCost === null ? null : gross - roundTripCost,
      exitReason,
      barsHeld: Math.max(1, exitIndex - entryIndex + Number(exitAtClose)),
    })
    // Resume from the exit bar's close; this avoids same-close look-ahead or overlap.
    signalIndex = exitIndex
  }
  return trades
}

function pairTrades(primary: MarketCandle[], hedge: MarketCandle[], costBps: number | null) {
  const hedgeByDay = new Map(cleanCandles(hedge).map((row) => [dateKey(row.candle_time), row]))
  const primaryByDay = new Map(cleanCandles(primary).map((row) => [dateKey(row.candle_time), row]))
  const days = [...primaryByDay.keys()].filter((day) => hedgeByDay.has(day)).sort()
  const left = days.map((day) => primaryByDay.get(day)!)
  const right = days.map((day) => hedgeByDay.get(day)!)
  const trades: BacktestTrade[] = []
  const alignedSplit = Math.floor(left.length * 0.7)
  const metadata = {
    trades,
    trainBars: alignedSplit,
    testBars: Math.max(0, left.length - alignedSplit),
    testStart: left[alignedSplit]?.candle_time ?? null,
    testEnd: left.at(-1)?.candle_time ?? null,
  }
  if (left.length < 100) return metadata
  let signalIndex = Math.max(99, alignedSplit - 1)
  const signalAt = (index: number) => calculatePairsSignal(left.slice(0, index + 1), right.slice(0, index + 1))
  while (signalIndex < left.length - 1) {
    const entrySignal = signalAt(signalIndex)
    if ((entrySignal.signal !== 'LONG_SPREAD' && entrySignal.signal !== 'SHORT_SPREAD') || entrySignal.beta === null) {
      signalIndex += 1
      continue
    }
    const side = entrySignal.signal
    const beta = entrySignal.beta
    const entryIndex = signalIndex + 1
    const entryA = adjustedOpenOf(left[entryIndex])
    const entryB = adjustedOpenOf(right[entryIndex])
    if (!(entryA > 0 && entryB > 0)) {
      signalIndex += 1
      continue
    }
    let exitIndex = left.length - 1
    let exitA = closeOf(left[exitIndex])
    let exitB = closeOf(right[exitIndex])
    let exitReason = 'Akhir jendela OOS (likuidasi terjadwal saat penutupan)'
    let exitAtClose = true
    for (let closeIndex = entryIndex; closeIndex < left.length; closeIndex += 1) {
      const barsHeld = closeIndex - entryIndex + 1
      if (closeIndex === left.length - 1) {
        exitIndex = closeIndex
        exitA = closeOf(left[closeIndex])
        exitB = closeOf(right[closeIndex])
        break
      }
      const current = signalAt(closeIndex)
      const stopHit = current.zScore !== null && (side === 'LONG_SPREAD' ? current.zScore <= -3 : current.zScore >= 3)
      if (current.signal !== side || stopHit) {
        exitIndex = closeIndex + 1
        exitA = adjustedOpenOf(left[exitIndex])
        exitB = adjustedOpenOf(right[exitIndex])
        exitReason = stopHit ? 'Stop z-score 3σ' : 'Sinyal/konvergensi berubah'
        exitAtClose = false
        break
      }
      if (barsHeld >= 20) {
        exitIndex = closeIndex + 1
        exitA = adjustedOpenOf(left[exitIndex])
        exitB = adjustedOpenOf(right[exitIndex])
        exitReason = 'Batas holding period'
        exitAtClose = false
        break
      }
    }
    const longSpreadReturn = ((exitA / entryA - 1) - beta * (exitB / entryB - 1)) / (1 + Math.abs(beta))
    const gross = side === 'LONG_SPREAD' ? longSpreadReturn : -longSpreadReturn
    const roundTripCost = costBps === null ? null : 2 * costBps / 10_000
    trades.push({
      side,
      entryTime: left[entryIndex].candle_time,
      exitTime: left[exitIndex].candle_time,
      returnGross: gross,
      returnNet: roundTripCost === null ? null : gross - roundTripCost,
      exitReason,
      barsHeld: Math.max(1, exitIndex - entryIndex + Number(exitAtClose)),
    })
    signalIndex = exitIndex
  }
  return metadata
}

export function runQuantBacktest(primaryCandles: MarketCandle[], hedgeCandles: MarketCandle[] = [], oneWayCostBps: number | null = null): QuantBacktestReport {
  const primary = cleanCandles(primaryCandles)
  const split = Math.floor(primary.length * 0.7)
  const useNet = oneWayCostBps !== null && Number.isFinite(oneWayCostBps) && oneWayCostBps >= 0
  const cost = useNet ? Math.min(oneWayCostBps!, 500) : null
  const benchmarkReturn = split < primary.length - 1 && split >= 0
    ? closeOf(primary.at(-1)!) / adjustedOpenOf(primary[split]) - 1
    : null
  const trendTrades = singleAssetTrades(primary, split, 'momentum', cost)
  const reversionTrades = singleAssetTrades(primary, split, 'mean-reversion', cost)
  const pairResult = pairTrades(primary, hedgeCandles, cost)
  const strategies: BacktestStrategyResult[] = [
    {
      kind: 'momentum',
      name: 'Momentum / trend',
      testStart: primary[split]?.candle_time ?? null,
      testEnd: primary.at(-1)?.candle_time ?? null,
      trainBars: split,
      testBars: Math.max(0, primary.length - split),
      sides: sideResults(trendTrades, useNet, ['LONG', 'SHORT']),
    },
    {
      kind: 'mean-reversion',
      name: 'Mean reversion',
      testStart: primary[split]?.candle_time ?? null,
      testEnd: primary.at(-1)?.candle_time ?? null,
      trainBars: split,
      testBars: Math.max(0, primary.length - split),
      sides: sideResults(reversionTrades, useNet, ['LONG', 'SHORT']),
    },
    {
      kind: 'statistical-arbitrage',
      name: 'Statistical arbitrage',
      testStart: pairResult.testStart,
      testEnd: pairResult.testEnd,
      trainBars: pairResult.trainBars,
      testBars: pairResult.testBars,
      sides: sideResults(pairResult.trades, useNet, ['LONG_SPREAD', 'SHORT_SPREAD']),
    },
  ]
  return {
    totalBars: primary.length,
    adjustedCloseBars: primary.filter((candle) => Number.isFinite(candle.adjusted_close) && (candle.adjusted_close ?? 0) > 0).length,
    delayedBars: primary.filter((candle) => candle.is_delayed === true).length,
    providers: [...new Set(primary.map((candle) => candle.provider).filter((provider): provider is string => Boolean(provider)))].sort(),
    firstDate: primary[0]?.candle_time ?? null,
    lastDate: primary.at(-1)?.candle_time ?? null,
    splitDate: primary[split]?.candle_time ?? null,
    testBars: Math.max(0, primary.length - split),
    oneWayCostBps: cost,
    benchmarkReturn: Number.isFinite(benchmarkReturn) ? benchmarkReturn : null,
    strategies,
  }
}

export function calculateConsensus(trend: ModelSignal, reversion: ModelSignal) {
  if (trend === 'LONG' && reversion === 'LONG') return 'KONSENSUS LONG'
  if (trend === 'SHORT' && reversion === 'SHORT') return 'KONSENSUS SHORT'
  if ((trend === 'LONG' && reversion === 'SHORT') || (trend === 'SHORT' && reversion === 'LONG')) return 'KONFLIK MODEL'
  if (trend === 'LONG' || trend === 'SHORT' || reversion === 'LONG' || reversion === 'SHORT') return 'SATU MODEL AKTIF'
  if (trend === 'WAIT' || reversion === 'WAIT') return 'DATA BELUM CUKUP'
  return 'BELUM ADA SINYAL'
}
