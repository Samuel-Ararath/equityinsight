'use client'

import { useEffect, useRef, useState } from 'react'
import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineSeries, createChart, createSeriesMarkers, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import type { MarketCandle } from '@/lib/market-data'
import { calculateIndicators, type IndicatorSnapshot, type ToolkitState } from '@/lib/indicators'

const lineColors = { ma20: '#7898ff', ma50: '#e4b85c', ma200: '#bf8eda', ema12: '#5ed5a0', ema26: '#de9255', vwap: '#4fb9c9', upper: '#e4b85c', middle: '#8e9bb2', lower: '#e4b85c' }

type ChartProps = { candles: MarketCandle[]; toolkit: ToolkitState }

type TooltipState = { x: number; y: number; index: number } | null

function toLineData(points: Array<{ time: number; value: number }>) { return points.map((point) => ({ time: point.time as UTCTimestamp, value: point.value })) }
function toCandleData(candles: MarketCandle[]) { return candles.map((candle) => ({ time: Math.floor(new Date(candle.candle_time).getTime() / 1000) as UTCTimestamp, open: candle.open, high: candle.high, low: candle.low, close: candle.close })) }
function baseOptions(element: HTMLElement, height: number) { return { width: element.clientWidth, height, layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8e9bb2', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11 }, grid: { vertLines: { color: 'rgba(142,155,178,0.08)' }, horzLines: { color: 'rgba(142,155,178,0.12)' } }, rightPriceScale: { borderColor: 'rgba(142,155,178,0.18)' }, timeScale: { borderColor: 'rgba(142,155,178,0.18)', timeVisible: true, secondsVisible: false, rightOffset: 8, barSpacing: 7 }, crosshair: { mode: CrosshairMode.Normal, vertLine: { color: 'rgba(120,152,255,0.65)', width: 1, style: 3 }, horzLine: { color: 'rgba(120,152,255,0.45)', width: 1, style: 3 } }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true } } as any }

function addLine(chart: IChartApi, points: Array<{ time: number; value: number }>, color: string, lineWidth = 2, priceScaleId = 'right') {
  const series = chart.addSeries(LineSeries, { color, lineWidth: lineWidth as 1 | 2 | 3 | 4, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceScaleId })
  series.setData(toLineData(points))
  return series
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="relative overflow-hidden rounded-xl border border-border bg-card/70"><div className="absolute left-3 top-2 z-10 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</div>{children}</div> }

export function AdvancedMarketChart({ candles, toolkit }: ChartProps) {
  const mainRef = useRef<HTMLDivElement>(null)
  const oscillatorRef = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const [snapshot, setSnapshot] = useState<IndicatorSnapshot | null>(null)
  const [zoneRects, setZoneRects] = useState<Array<{ left: number; top: number; width: number; height: number; color: string; label: string }>>([])

  useEffect(() => {
    if (!candles.length || !mainRef.current) return
    const indicators = calculateIndicators(candles)
    setSnapshot(indicators)
    const charts: IChartApi[] = []
    const cleanupSeries: Array<() => void> = []
    const candleTimes = indicators.times
    const candleData = toCandleData(candles)
    const main = createChart(mainRef.current, baseOptions(mainRef.current, 480)); charts.push(main)
    const candleSeries = main.addSeries(CandlestickSeries, { upColor: '#5ed5a0', downColor: '#ef7777', borderVisible: false, wickUpColor: '#5ed5a0', wickDownColor: '#ef7777' })
    candleSeries.setData(candleData)
    const visibleRange = main.timeScale().getVisibleLogicalRange()
    const seriesByTool = new Map<string, ISeriesApi<'Line' | 'Histogram'>>()
    const addIf = (key: keyof ToolkitState, points: Array<{ time: number; value: number }>, color: string, width = 2) => { if (!toolkit[key] || !points.length) return; seriesByTool.set(key, addLine(main, points, color, width)) }
    addIf('ma20', indicators.ma20, lineColors.ma20); addIf('ma50', indicators.ma50, lineColors.ma50); addIf('ma200', indicators.ma200, lineColors.ma200, 3); addIf('ema12', indicators.ema12, lineColors.ema12); addIf('ema26', indicators.ema26, lineColors.ema26); addIf('vwap', indicators.vwap, lineColors.vwap, 2)
    if (toolkit.bollinger) { addIf('bollinger', indicators.bollingerUpper, lineColors.upper); addLine(main, indicators.bollingerMiddle, lineColors.middle, 1); addLine(main, indicators.bollingerLower, lineColors.lower, 1) }
    const priceLines: Array<() => void> = []
    const zones = [...(toolkit.orderBlock ? indicators.orderBlocks : []), ...(toolkit.fvg ? indicators.fvg : [])]
    const addPriceLine = (series: any, options: any) => { const line = series.createPriceLine(options); priceLines.push(() => series.removePriceLine(line)) }
    if (toolkit.supportResistance) [...indicators.support.map((price) => ({ price, title: 'Support', color: '#5ed5a0' })), ...indicators.resistance.map((price) => ({ price, title: 'Resistance', color: '#ef7777' }))].forEach((item) => addPriceLine(candleSeries, { price: item.price, color: item.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: item.title }))
    if (toolkit.fibonacci) indicators.fibonacci.forEach((item) => addPriceLine(candleSeries, { price: item.value, color: 'rgba(228,184,92,0.65)', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: `Fib ${item.level}` }))
    if (toolkit.liquidity) indicators.liquidity.forEach((price) => addPriceLine(candleSeries, { price, color: 'rgba(191,142,218,0.8)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Liquidity' }))
    if (toolkit.trendline) indicators.trendlines.forEach((trend) => { const series = addLine(main, [{ time: trend.startTime, value: trend.startValue }, { time: trend.endTime, value: trend.endValue }], trend.color, 2); cleanupSeries.push(() => main.removeSeries(series)) })
    if (toolkit.orderBlock) indicators.orderBlocks.slice(-4).forEach((zone) => { addPriceLine(candleSeries, { price: zone.high, color: '#5ed5a0', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: zone.label }); addPriceLine(candleSeries, { price: zone.low, color: '#5ed5a0', lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: '' }) })
    if (toolkit.fvg) indicators.fvg.slice(-4).forEach((zone) => { addPriceLine(candleSeries, { price: zone.high, color: '#7898ff', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: zone.label }); addPriceLine(candleSeries, { price: zone.low, color: '#7898ff', lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: '' }) })
    if (toolkit.bos || toolkit.choch) { const markers = [...(toolkit.bos ? indicators.bos : []), ...(toolkit.choch ? indicators.choch : [])].sort((a, b) => a.time - b.time); if (markers.length) createSeriesMarkers(candleSeries, markers as any) }
    function updateZones() {
      const rects = zones.flatMap((zone) => {
        const x1 = main.timeScale().timeToCoordinate(zone.startTime as UTCTimestamp)
        const x2 = main.timeScale().timeToCoordinate(zone.endTime as UTCTimestamp)
        const y1 = candleSeries.priceToCoordinate(zone.high)
        const y2 = candleSeries.priceToCoordinate(zone.low)
        if (x1 === null || x2 === null || y1 === null || y2 === null) return []
        return [{ left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.max(2, Math.abs(x2 - x1)), height: Math.max(2, Math.abs(y2 - y1)), color: zone.color, label: zone.label }]
      })
      setZoneRects(rects)
    }
    main.timeScale().fitContent(); if (visibleRange) main.timeScale().setVisibleLogicalRange(visibleRange); updateZones(); main.timeScale().subscribeVisibleLogicalRangeChange(updateZones)
    const onCrosshair = (param: any) => { if (!param.point || param.time === undefined) { setTooltip(null); return }; const index = candleTimes.indexOf(Number(param.time)); if (index >= 0) setTooltip({ x: param.point.x, y: param.point.y, index }) }
    main.subscribeCrosshairMove(onCrosshair)
    const ro = new ResizeObserver(() => { if (mainRef.current) main.applyOptions({ width: mainRef.current.clientWidth }); updateZones(); charts.slice(1).forEach((chart, index) => { const element = [oscillatorRef.current, macdRef.current, volumeRef.current][index]; if (element) chart.applyOptions({ width: element.clientWidth }) }) }); ro.observe(mainRef.current)
    function makeOscillator() {
      if (!oscillatorRef.current || (!toolkit.rsi && !toolkit.stochastic)) return
      const chart = createChart(oscillatorRef.current, baseOptions(oscillatorRef.current, 190)); charts.push(chart)
      if (toolkit.rsi) { const rsiSeries = addLine(chart, indicators.rsi, '#7898ff', 2); rsiSeries.createPriceLine({ price: 70, color: '#ef7777', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '70' }); rsiSeries.createPriceLine({ price: 30, color: '#5ed5a0', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '30' }); chart.priceScale('right').applyOptions({ autoScale: false, scaleMargins: { top: 0.1, bottom: 0.1 } });  }
      if (toolkit.stochastic) { addLine(chart, indicators.stochasticK, '#e4b85c', 2); addLine(chart, indicators.stochasticD, '#bf8eda', 1) }
      chart.timeScale().fitContent(); cleanupSeries.push(() => chart.remove())
    }
    function makeMacd() { if (!macdRef.current || !toolkit.macd) return; const chart = createChart(macdRef.current, baseOptions(macdRef.current, 170)); charts.push(chart); const hist = chart.addSeries(HistogramSeries, { priceFormat: { type: 'price', precision: 4, minMove: 0.0001 }, priceScaleId: 'right' }); hist.setData(indicators.macdHistogram.map((point) => ({ time: point.time as UTCTimestamp, value: point.value, color: point.color }))); addLine(chart, indicators.macd, '#7898ff', 2); addLine(chart, indicators.macdSignal, '#e4b85c', 1); chart.timeScale().fitContent(); cleanupSeries.push(() => chart.remove()) }
    function makeVolume() { if (!volumeRef.current || !toolkit.volume) return; const chart = createChart(volumeRef.current, baseOptions(volumeRef.current, 120)); charts.push(chart); const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'right' }); volumeSeries.setData(indicators.volume.map((point) => ({ time: point.time as UTCTimestamp, value: point.value, color: point.color }))); chart.timeScale().fitContent(); cleanupSeries.push(() => chart.remove()) }
    makeOscillator(); makeMacd(); makeVolume()
    return () => { ro.disconnect(); main.unsubscribeCrosshairMove(onCrosshair); main.timeScale().unsubscribeVisibleLogicalRangeChange(updateZones); setZoneRects([]); priceLines.forEach((remove) => remove()); cleanupSeries.forEach((remove) => remove()); charts.forEach((chart) => { try { chart.remove() } catch {} }) }
  }, [candles, toolkit])

  const activeCandle = tooltip ? candles[tooltip.index] : null
  return <div className="relative space-y-2"><div ref={mainRef} className="relative min-h-[480px] w-full"><div className="pointer-events-none absolute inset-0 z-10">{zoneRects.map((zone, index) => <div key={`${zone.label}-${index}`} className="absolute rounded-sm border" style={{ left: zone.left, top: zone.top, width: zone.width, height: zone.height, background: zone.color, borderColor: zone.color.replace('0.12', '0.42') }}><span className="absolute left-1 top-0 text-[9px] font-semibold text-muted-foreground">{zone.label}</span></div>)}</div></div>{toolkit.rsi || toolkit.stochastic ? <Panel title="Momentum"><div ref={oscillatorRef} className="h-[190px] w-full" /></Panel> : null}{toolkit.macd ? <Panel title="MACD"><div ref={macdRef} className="h-[170px] w-full" /></Panel> : null}{toolkit.volume ? <Panel title="Volume"><div ref={volumeRef} className="h-[120px] w-full" /></Panel> : null}{activeCandle && tooltip && <div className="pointer-events-none absolute z-20 rounded-lg border border-primary/30 bg-background/95 px-3 py-2 text-xs shadow-xl" style={{ left: Math.min(Math.max(tooltip.x + 18, 8), 360), top: Math.max(tooltip.y - 42, 8) }}><div className="flex items-center gap-2 font-semibold"><span>{new Date(activeCandle.candle_time).toLocaleString('id-ID')}</span><span className="text-primary">{tooltip.index > 0 ? (() => { const current = candles[tooltip.index]; const previous = candles[tooltip.index - 1]; const tags = []; if (current.high > previous.high) tags.push('HH'); else if (current.high < previous.high) tags.push('LH'); if (current.low > previous.low) tags.push('HL'); else if (current.low < previous.low) tags.push('LL'); return tags.join(' · ') || 'Inside bar' })() : '—'}</span></div><div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground"><span>O <b className="text-foreground">{activeCandle.open}</b></span><span>H <b className="text-foreground">{activeCandle.high}</b></span><span>L <b className="text-foreground">{activeCandle.low}</b></span><span>C <b className="text-foreground">{activeCandle.close}</b></span></div></div>}{snapshot && null}</div>
}
