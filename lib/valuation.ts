import type { FinancialData, ValuationAssumptions } from '@/lib/types'

// =====================================================================
//  VALUATION ENGINE
//  Every formula below is isolated and commented so it can be tuned
//  without touching the UI. All monetary inputs are in Rupiah.
// =====================================================================

// Terminal growth used in the DCF perpetuity (in percent).
export const TERMINAL_GROWTH_RATE = 3
// Number of explicit projection years for the DCF.
export const DCF_PROJECTION_YEARS = 5

const ok = (n: number) => Number.isFinite(n)

export type ValuationResult = {
  // Per-share fundamentals
  eps: number
  bvps: number
  // Intrinsic value estimates (per share). NaN when not computable.
  grahamNumber: number
  dcfPerShare: number
  ddmPerShare: number
  perValue: number
  pbvValue: number
  // DCF intermediate figures for display
  freeCashFlow: number
  enterprisePV: number
  terminalValuePV: number
  equityValue: number
  // Summary
  fairValues: { label: string; value: number }[]
  averageFairValue: number
  marginOfSafety: number // percent
  verdict: 'UNDERVALUED' | 'FAIR VALUE' | 'OVERVALUED' | null
}

/** EPS = Laba Bersih / Jumlah Saham Beredar */
export function calcEPS(f: FinancialData): number {
  if (!ok(f.labaBersih) || !ok(f.sahamBeredar) || f.sahamBeredar === 0) return NaN
  return f.labaBersih / f.sahamBeredar
}

/** BVPS = Total Ekuitas / Jumlah Saham Beredar */
export function calcBVPS(f: FinancialData): number {
  if (!ok(f.totalEkuitas) || !ok(f.sahamBeredar) || f.sahamBeredar === 0) return NaN
  return f.totalEkuitas / f.sahamBeredar
}

/**
 * Graham Number = sqrt(22.5 * EPS * BVPS)
 * Only valid when EPS and BVPS are both positive.
 */
export function calcGrahamNumber(eps: number, bvps: number): number {
  if (!ok(eps) || !ok(bvps) || eps <= 0 || bvps <= 0) return NaN
  return Math.sqrt(22.5 * eps * bvps)
}

/**
 * Discounted Cash Flow (per share).
 * 1. Free Cash Flow = Arus Kas Operasi - Capex
 * 2. Project FCF for DCF_PROJECTION_YEARS at `growthRate`
 * 3. Terminal Value (perpetuity growth) = FCF_last * (1 + g_terminal) / (WACC - g_terminal)
 * 4. Discount every cash flow to present value at `discountRate`
 * 5. Enterprise Value = Σ PV(FCF) + PV(Terminal Value)
 * 6. Equity Value = EV - Total Utang + Kas
 * 7. Fair Value / share = Equity Value / Jumlah Saham Beredar
 */
export function calcDCF(f: FinancialData, a: ValuationAssumptions) {
  const empty = {
    freeCashFlow: NaN,
    enterprisePV: NaN,
    terminalValuePV: NaN,
    equityValue: NaN,
    perShare: NaN,
  }

  const fcf0 = f.arusKasOperasi - f.capex
  if (!ok(fcf0) || !ok(f.sahamBeredar) || f.sahamBeredar === 0) return empty
  if (!ok(a.growthRate) || !ok(a.discountRate)) return empty

  const g = a.growthRate / 100
  const wacc = a.discountRate / 100
  const gt = TERMINAL_GROWTH_RATE / 100

  // Discount rate must exceed terminal growth for the perpetuity to converge.
  if (wacc <= gt) return empty

  let pvSum = 0
  let lastFcf = fcf0
  for (let year = 1; year <= DCF_PROJECTION_YEARS; year++) {
    lastFcf = fcf0 * Math.pow(1 + g, year)
    pvSum += lastFcf / Math.pow(1 + wacc, year)
  }

  // Terminal value at end of projection, discounted back to today.
  const terminalValue = (lastFcf * (1 + gt)) / (wacc - gt)
  const terminalValuePV = terminalValue / Math.pow(1 + wacc, DCF_PROJECTION_YEARS)

  const enterpriseValue = pvSum + terminalValuePV
  const utang = ok(f.totalUtang) ? f.totalUtang : 0
  const kas = ok(f.kas) ? f.kas : 0
  const equityValue = enterpriseValue - utang + kas
  const perShare = equityValue / f.sahamBeredar

  return {
    freeCashFlow: fcf0,
    enterprisePV: pvSum,
    terminalValuePV,
    equityValue,
    perShare,
  }
}

/**
 * Dividend Discount Model (Gordon Growth), per share.
 * Fair Value = D0 * (1 + g) / (r - g)
 * Only shown when a positive dividend is supplied and r > g.
 */
export function calcDDM(f: FinancialData, a: ValuationAssumptions): number {
  if (!ok(f.dividenPerSaham) || f.dividenPerSaham <= 0) return NaN
  if (!ok(a.growthRate) || !ok(a.discountRate)) return NaN
  const g = a.growthRate / 100
  const r = a.discountRate / 100
  if (r <= g) return NaN
  return (f.dividenPerSaham * (1 + g)) / (r - g)
}

/** Relative valuation from sector P/E: Fair Value = PER Sektor * EPS */
export function calcPERValue(eps: number, perSektor: number): number {
  if (!ok(eps) || !ok(perSektor) || perSektor <= 0 || eps <= 0) return NaN
  return perSektor * eps
}

/** Relative valuation from sector P/BV: Fair Value = PBV Sektor * BVPS */
export function calcPBVValue(bvps: number, pbvSektor: number): number {
  if (!ok(bvps) || !ok(pbvSektor) || pbvSektor <= 0 || bvps <= 0) return NaN
  return pbvSektor * bvps
}

/** Run the full valuation pipeline. */
export function runValuation(f: FinancialData, a: ValuationAssumptions): ValuationResult {
  const eps = calcEPS(f)
  const bvps = calcBVPS(f)
  const grahamNumber = calcGrahamNumber(eps, bvps)
  const dcf = calcDCF(f, a)
  const ddmPerShare = calcDDM(f, a)
  const perValue = calcPERValue(eps, a.perSektor)
  const pbvValue = calcPBVValue(bvps, a.pbvSektor)

  // Collect every intrinsic value that was successfully computed and is positive.
  const candidates: { label: string; value: number }[] = [
    { label: 'Graham Number', value: grahamNumber },
    { label: 'DCF', value: dcf.perShare },
    { label: 'Dividend Discount Model', value: ddmPerShare },
    { label: 'Relative (PER)', value: perValue },
    { label: 'Relative (PBV)', value: pbvValue },
  ]
  const fairValues = candidates.filter((c) => Number.isFinite(c.value) && c.value > 0)

  const averageFairValue = fairValues.length
    ? fairValues.reduce((s, c) => s + c.value, 0) / fairValues.length
    : NaN

  // Margin of Safety (%) = (Avg Fair Value - Harga Saat Ini) / Avg Fair Value * 100
  let marginOfSafety = NaN
  let verdict: ValuationResult['verdict'] = null
  if (ok(averageFairValue) && averageFairValue > 0 && ok(f.hargaSaham) && f.hargaSaham > 0) {
    marginOfSafety = ((averageFairValue - f.hargaSaham) / averageFairValue) * 100
    if (marginOfSafety > 30) verdict = 'UNDERVALUED'
    else if (marginOfSafety >= 10) verdict = 'FAIR VALUE'
    else verdict = 'OVERVALUED'
  }

  return {
    eps,
    bvps,
    grahamNumber,
    dcfPerShare: dcf.perShare,
    ddmPerShare,
    perValue,
    pbvValue,
    freeCashFlow: dcf.freeCashFlow,
    enterprisePV: dcf.enterprisePV,
    terminalValuePV: dcf.terminalValuePV,
    equityValue: dcf.equityValue,
    fairValues,
    averageFairValue,
    marginOfSafety,
    verdict,
  }
}

/** % difference of an intrinsic value vs the current price (upside). */
export function upsideVsPrice(fairValue: number, price: number): number {
  if (!ok(fairValue) || !ok(price) || price <= 0) return NaN
  return ((fairValue - price) / price) * 100
}
