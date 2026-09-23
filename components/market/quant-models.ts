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

function cleanCandles(candles: MarketCandle[]) {
  return candles
    .filter((candle) => Number.isFinite(candle.close) && candle.close > 0 && Number.isFinite(Date.parse(candle.candle_time)))
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
  const closes = rows.map((row) => row.close)
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
  const closes = cleanCandles(candles).map((row) => row.close)
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
  const closes = cleanCandles(candles).map((row) => row.close)
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
  const rightByTime = new Map(right.map((row) => [row.candle_time, row.close]))
  const aligned = left.flatMap((row) => {
    const hedgeClose = rightByTime.get(row.candle_time)
    return hedgeClose && hedgeClose > 0 ? [{ time: row.candle_time, y: Math.log(row.close), x: Math.log(hedgeClose) }] : []
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

export function calculateConsensus(trend: ModelSignal, reversion: ModelSignal) {
  if (trend === 'LONG' && reversion === 'LONG') return 'KONSENSUS LONG'
  if (trend === 'SHORT' && reversion === 'SHORT') return 'KONSENSUS SHORT'
  if ((trend === 'LONG' && reversion === 'SHORT') || (trend === 'SHORT' && reversion === 'LONG')) return 'KONFLIK MODEL'
  if (trend === 'LONG' || trend === 'SHORT' || reversion === 'LONG' || reversion === 'SHORT') return 'SATU MODEL AKTIF'
  if (trend === 'WAIT' || reversion === 'WAIT') return 'DATA BELUM CUKUP'
  return 'BELUM ADA SINYAL'
}
