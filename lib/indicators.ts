import { bollingerbands, ema, macd, rsi, sma, stochastic } from 'technicalindicators'
import type { MarketCandle } from '@/lib/market-data'

export type ToolKey =
  | 'ma20' | 'ma50' | 'ma200' | 'ema12' | 'ema26'
  | 'rsi' | 'macd' | 'stochastic' | 'bollinger'
  | 'supportResistance' | 'trendline' | 'fibonacci'
  | 'bos' | 'choch' | 'orderBlock' | 'fvg' | 'liquidity'
  | 'volume' | 'vwap'

export type ToolkitState = Record<ToolKey, boolean>

export const DEFAULT_TOOLKIT: ToolkitState = {
  ma20: false, ma50: false, ma200: false, ema12: false, ema26: false,
  rsi: false, macd: false, stochastic: false, bollinger: false,
  supportResistance: false, trendline: false, fibonacci: false,
  bos: false, choch: false, orderBlock: false, fvg: false, liquidity: false,
  volume: true, vwap: false,
}

export const TOOL_GROUPS = [
  { key: 'trend', label: 'Trend & Moving Average', items: [
    ['ma20', 'MA 20', 'Simple moving average 20 candle.'],
    ['ma50', 'MA 50', 'Simple moving average 50 candle.'],
    ['ma200', 'MA 200', 'Simple moving average 200 candle untuk tren jangka panjang.'],
    ['ema12', 'EMA 12', 'Exponential moving average cepat.'],
    ['ema26', 'EMA 26', 'Exponential moving average lambat.'],
  ] },
  { key: 'momentum', label: 'Momentum & Oscillator', items: [
    ['rsi', 'RSI 14', 'Momentum oscillator dengan zona overbought 70 dan oversold 30.'],
    ['macd', 'MACD', 'Konvergensi/divergensi EMA 12/26 dengan signal dan histogram.'],
    ['stochastic', 'Stochastic', 'Membandingkan posisi close terhadap range high-low periode.'],
  ] },
  { key: 'volatility', label: 'Volatility', items: [
    ['bollinger', 'Bollinger Bands', 'Band 20 periode dengan deviasi standar 2.'],
  ] },
  { key: 'structure', label: 'Support, Resistance & Structure', items: [
    ['supportResistance', 'S/R', 'Auto-detect support dan resistance dari swing signifikan.'],
    ['trendline', 'Trendline', 'Hubungkan swing high dan swing low berurutan.'],
    ['fibonacci', 'Fibonacci', 'Retracement otomatis dari swing high/low terakhir.'],
  ] },
  { key: 'smc', label: 'Smart Money Concept', items: [
    ['bos', 'BOS', 'Break of Structure saat close menembus swing sebelumnya.'],
    ['choch', 'CHoCH', 'Change of Character saat struktur tren berubah.'],
    ['orderBlock', 'Order Block', 'Zona candle terakhir sebelum impuls kuat.'],
    ['fvg', 'Fair Value Gap', 'Gap harga antara candle pertama dan ketiga.'],
    ['liquidity', 'Liquidity Zone', 'Equal highs/lows sebagai potensi liquidity pool.'],
  ] },
  { key: 'volume', label: 'Volume', items: [
    ['volume', 'Volume', 'Volume bar bullish/bearish di panel bawah.'],
    ['vwap', 'VWAP', 'Volume Weighted Average Price sesi/data yang ditampilkan.'],
  ] },
] as const

export type NumericPoint = { time: number; value: number }
export type HistogramPoint = { time: number; value: number; color?: string }
export type Marker = { time: number; position: 'aboveBar' | 'belowBar'; shape: 'arrowUp' | 'arrowDown' | 'circle'; color: string; text: string }
export type Zone = { startTime: number; endTime: number; low: number; high: number; color: string; label: string }
export type Trend = { startTime: number; endTime: number; startValue: number; endValue: number; color: string }

function align(values: Array<number | undefined>, times: number[]) {
  const offset = times.length - values.length
  return values.map((value, index) => value === undefined || !Number.isFinite(value) ? null : ({ time: times[index + offset], value }))
    .filter((point): point is NumericPoint => point !== null)
}

function swingIndexes(candles: MarketCandle[], radius = 2) {
  const highs: number[] = []
  const lows: number[] = []
  for (let i = radius; i < candles.length - radius; i += 1) {
    const high = candles[i].high
    const low = candles[i].low
    if (candles.slice(i - radius, i + radius + 1).every((c, index) => index === radius || high >= c.high)) highs.push(i)
    if (candles.slice(i - radius, i + radius + 1).every((c, index) => index === radius || low <= c.low)) lows.push(i)
  }
  return { highs, lows }
}

export type IndicatorSnapshot = {
  times: number[]
  ma20: NumericPoint[]; ma50: NumericPoint[]; ma200: NumericPoint[]; ema12: NumericPoint[]; ema26: NumericPoint[]
  rsi: NumericPoint[]; macd: NumericPoint[]; macdSignal: NumericPoint[]; macdHistogram: HistogramPoint[]
  stochasticK: NumericPoint[]; stochasticD: NumericPoint[]
  bollingerUpper: NumericPoint[]; bollingerMiddle: NumericPoint[]; bollingerLower: NumericPoint[]
  vwap: NumericPoint[]; volume: HistogramPoint[]
  support: number[]; resistance: number[]; fibonacci: Array<{ level: string; value: number }>; trendlines: Trend[]
  bos: Marker[]; choch: Marker[]; orderBlocks: Zone[]; fvg: Zone[]; liquidity: number[]
}

export function calculateIndicators(candles: MarketCandle[]): IndicatorSnapshot {
  const times = candles.map((c) => Math.floor(new Date(c.candle_time).getTime() / 1000))
  const close = candles.map((c) => c.close)
  const high = candles.map((c) => c.high)
  const low = candles.map((c) => c.low)
  const volume = candles.map((c) => c.volume ?? 0)
  const ma = (period: number) => align(sma({ period, values: close }), times)
  const e = (period: number) => align(ema({ period, values: close }), times)
  const r = align(rsi({ period: 14, values: close }), times)
  const m = macd({ values: close, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false })
  const macdValues = m.map((item) => item.MACD)
  const macdSignal = m.map((item) => item.signal)
  const macdHistogram = m.map((item) => item.histogram)
  const st = stochastic({ high, low, close, period: 14, signalPeriod: 3 })
  const bb = bollingerbands({ period: 20, stdDev: 2, values: close })
  const vwapPoints: NumericPoint[] = []
  let cumulativePV = 0
  let cumulativeVolume = 0
  candles.forEach((candle, index) => { cumulativePV += ((candle.high + candle.low + candle.close) / 3) * (candle.volume ?? 0); cumulativeVolume += candle.volume ?? 0; vwapPoints.push({ time: times[index], value: cumulativeVolume ? cumulativePV / cumulativeVolume : candle.close }) })
  const volumePoints = candles.map((candle, index) => ({ time: times[index], value: candle.volume ?? 0, color: candle.close >= candle.open ? '#5ed5a0' : '#ef7777' }))
  const swings = swingIndexes(candles)
  const recentHighs = swings.highs.slice(-5)
  const recentLows = swings.lows.slice(-5)
  const resistance = recentHighs.length ? [candles[recentHighs.at(-1)!].high] : []
  const support = recentLows.length ? [candles[recentLows.at(-1)!].low] : []
  const trendlines: Trend[] = []
  if (recentHighs.length >= 2) { const a = recentHighs.at(-2)!; const b = recentHighs.at(-1)!; trendlines.push({ startTime: times[a], endTime: times[b], startValue: candles[a].high, endValue: candles[b].high, color: '#e4b85c' }) }
  if (recentLows.length >= 2) { const a = recentLows.at(-2)!; const b = recentLows.at(-1)!; trendlines.push({ startTime: times[a], endTime: times[b], startValue: candles[a].low, endValue: candles[b].low, color: '#7898ff' }) }
  const lastHigh = recentHighs.at(-1)
  const lastLow = recentLows.at(-1)
  const fibBaseHigh = lastHigh !== undefined ? candles[lastHigh].high : Math.max(...high)
  const fibBaseLow = lastLow !== undefined ? candles[lastLow].low : Math.min(...low)
  const range = fibBaseHigh - fibBaseLow || 1
  const fibonacci = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((level) => ({ level: `${(level * 100).toFixed(1)}%`, value: fibBaseHigh - range * level }))
  const bos: Marker[] = []
  const choch: Marker[] = []
  let trend: 'up' | 'down' | null = null
  candles.forEach((candle, index) => {
    const previousHigh = swings.highs.filter((s) => s < index).at(-1)
    const previousLow = swings.lows.filter((s) => s < index).at(-1)
    if (previousHigh !== undefined && candle.close > candles[previousHigh].high) { const next = trend === 'down' ? choch : bos; next.push({ time: times[index], position: 'belowBar', shape: 'arrowUp', color: '#5ed5a0', text: trend === 'down' ? 'CHoCH ↑' : 'BOS ↑' }); trend = 'up' }
    if (previousLow !== undefined && candle.close < candles[previousLow].low) { const next = trend === 'up' ? choch : bos; next.push({ time: times[index], position: 'aboveBar', shape: 'arrowDown', color: '#ef7777', text: trend === 'up' ? 'CHoCH ↓' : 'BOS ↓' }); trend = 'down' }
  })
  const orderBlocks: Zone[] = []
  for (let i = 2; i < candles.length; i += 1) { const move = candles[i].close - candles[i - 1].close; const previous = candles[i - 1]; if (move > (candles[i - 1].high - candles[i - 1].low) * 1.8 && previous.close < previous.open) orderBlocks.push({ startTime: times[i - 1], endTime: times.at(-1)!, low: previous.low, high: previous.high, color: 'rgba(94,213,160,0.12)', label: 'Bullish OB' }); if (move < -(candles[i - 1].high - candles[i - 1].low) * 1.8 && previous.close > previous.open) orderBlocks.push({ startTime: times[i - 1], endTime: times.at(-1)!, low: previous.low, high: previous.high, color: 'rgba(239,119,119,0.12)', label: 'Bearish OB' }) }
  const fvg: Zone[] = []
  for (let i = 2; i < candles.length; i += 1) { if (candles[i].low > candles[i - 2].high) fvg.push({ startTime: times[i - 2], endTime: times[i], low: candles[i - 2].high, high: candles[i].low, color: 'rgba(120,152,255,0.12)', label: 'Bullish FVG' }); if (candles[i].high < candles[i - 2].low) fvg.push({ startTime: times[i - 2], endTime: times[i], low: candles[i].high, high: candles[i - 2].low, color: 'rgba(228,184,92,0.12)', label: 'Bearish FVG' }) }
  const liquidity = [...new Set([...swings.highs.map((i) => candles[i].high), ...swings.lows.map((i) => candles[i].low)].map((value) => Number(value.toFixed(2))))].slice(-8)
  return { times, ma20: ma(20), ma50: ma(50), ma200: ma(200), ema12: e(12), ema26: e(26), rsi: r, macd: align(macdValues, times), macdSignal: align(macdSignal, times), macdHistogram: align(macdHistogram, times).map((point) => ({ ...point, color: point.value >= 0 ? '#5ed5a0' : '#ef7777' })), stochasticK: align(st.map((item) => item.k), times), stochasticD: align(st.map((item) => item.d), times), bollingerUpper: align(bb.map((item) => item.upper), times), bollingerMiddle: align(bb.map((item) => item.middle), times), bollingerLower: align(bb.map((item) => item.lower), times), vwap: vwapPoints, volume: volumePoints, support, resistance, fibonacci, trendlines, bos, choch, orderBlocks, fvg, liquidity }
}
