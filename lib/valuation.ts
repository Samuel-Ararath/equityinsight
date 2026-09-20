import type { FinancialData, ValuationAssumptions } from '@/lib/types'

// Formula engine: monetary inputs must use the same currency and period.
// A result is NaN when its prerequisites are missing or the model is invalid.
export const TERMINAL_GROWTH_RATE = 3
export const DCF_PROJECTION_YEARS = 5
const ok = (n: number) => Number.isFinite(n)

export type Recommendation = {
  action: 'ACCUMULATE' | 'WAIT' | 'REDUCE' | 'NO_SIGNAL'
  rationale: string
  upside: number
  buyZoneLow: number
  buyZoneHigh: number
  takeProfit: number
  stopLoss: number
  sellZoneLow: number
  sellZoneHigh: number
  shortBias: boolean
  shortEntryLow: number
  shortEntryHigh: number
  coverTarget: number
  shortStop: number
}

export type ValuationResult = {
  eps: number
  bvps: number
  grahamNumber: number
  grahamDefensiveValue: number
  dcfPerShare: number
  ddmPerShare: number
  earningsPowerValue: number
  residualIncomeValue: number
  assetValueProxy: number
  perValue: number
  pbvValue: number
  freeCashFlow: number
  enterprisePV: number
  terminalValuePV: number
  equityValue: number
  fairValues: { label: string; value: number; formula: string; suitableFor: string }[]
  averageFairValue: number
  marginOfSafety: number
  verdict: 'UNDERVALUED' | 'FAIR VALUE' | 'OVERVALUED' | null
  recommendation: Recommendation
}

export function calcEPS(f: FinancialData): number {
  if (!ok(f.labaBersih) || !ok(f.sahamBeredar) || f.sahamBeredar === 0) return NaN
  return f.labaBersih / f.sahamBeredar
}

export function calcBVPS(f: FinancialData): number {
  if (!ok(f.totalEkuitas) || !ok(f.sahamBeredar) || f.sahamBeredar === 0) return NaN
  return f.totalEkuitas / f.sahamBeredar
}

/** Graham Number = sqrt(22.5 × EPS × BVPS). Requires positive EPS and BVPS. */
export function calcGrahamNumber(eps: number, bvps: number): number {
  if (!ok(eps) || !ok(bvps) || eps <= 0 || bvps <= 0) return NaN
  return Math.sqrt(22.5 * eps * bvps)
}

/** Graham's defensive formula. g is a percentage, Y is a percentage yield. */
export function calcGrahamDefensive(eps: number, growthRate: number, bondYield: number): number {
  if (!ok(eps) || eps <= 0 || !ok(growthRate) || growthRate < 0 || !ok(bondYield) || bondYield <= 0) return NaN
  return eps * (8.5 + 2 * growthRate) * (4.4 / bondYield)
}

export function calcDCF(f: FinancialData, a: ValuationAssumptions) {
  const empty = { freeCashFlow: NaN, enterprisePV: NaN, terminalValuePV: NaN, equityValue: NaN, perShare: NaN }
  if (![f.arusKasOperasi, f.capex, f.sahamBeredar, a.growthRate, a.discountRate].every(ok) || f.sahamBeredar === 0) return empty
  const fcf0 = f.arusKasOperasi - f.capex
  const g = a.growthRate / 100
  const wacc = a.discountRate / 100
  const gt = TERMINAL_GROWTH_RATE / 100
  if (wacc <= gt || fcf0 <= 0) return empty
  let pvSum = 0
  let lastFcf = fcf0
  for (let year = 1; year <= DCF_PROJECTION_YEARS; year++) {
    lastFcf = fcf0 * Math.pow(1 + g, year)
    pvSum += lastFcf / Math.pow(1 + wacc, year)
  }
  const terminalValue = (lastFcf * (1 + gt)) / (wacc - gt)
  const terminalValuePV = terminalValue / Math.pow(1 + wacc, DCF_PROJECTION_YEARS)
  const enterpriseValue = pvSum + terminalValuePV
  const equityValue = enterpriseValue - (ok(f.totalUtang) ? f.totalUtang : 0) + (ok(f.kas) ? f.kas : 0)
  return { freeCashFlow: fcf0, enterprisePV: pvSum, terminalValuePV, equityValue, perShare: equityValue / f.sahamBeredar }
}

/** Gordon DDM = D0 × (1 + g) / (r − g). */
export function calcDDM(f: FinancialData, a: ValuationAssumptions): number {
  if (!ok(f.dividenPerSaham) || f.dividenPerSaham <= 0 || !ok(a.growthRate) || !ok(a.discountRate)) return NaN
  const g = a.growthRate / 100
  const r = a.discountRate / 100
  if (r <= g) return NaN
  return (f.dividenPerSaham * (1 + g)) / (r - g)
}

/** Simplified EPV = normalized earnings / cost of equity, per share. */
export function calcEarningsPowerValue(eps: number, discountRate: number): number {
  if (!ok(eps) || eps <= 0 || !ok(discountRate) || discountRate <= 0) return NaN
  return eps / (discountRate / 100)
}

/** Single-stage residual income = BVPS + RI1 / (r − g). */
export function calcResidualIncome(eps: number, bvps: number, discountRate: number, growthRate: number): number {
  if (![eps, bvps, discountRate, growthRate].every(ok) || eps <= 0 || bvps <= 0) return NaN
  const r = discountRate / 100
  const g = growthRate / 100
  if (r <= g) return NaN
  const residualIncome = eps - r * bvps
  return bvps + (residualIncome * (1 + g)) / (r - g)
}

/** A transparent balance-sheet proxy; not a full liquidation/NAV model. */
export function calcAssetValueProxy(f: FinancialData): number {
  if (!ok(f.totalAset) || !ok(f.totalUtang) || !ok(f.sahamBeredar) || f.sahamBeredar <= 0) return NaN
  return (f.totalAset - f.totalUtang) / f.sahamBeredar
}

export function calcPERValue(eps: number, perSektor: number): number {
  if (!ok(eps) || !ok(perSektor) || perSektor <= 0 || eps <= 0) return NaN
  return perSektor * eps
}

export function calcPBVValue(bvps: number, pbvSektor: number): number {
  if (!ok(bvps) || !ok(pbvSektor) || pbvSektor <= 0 || bvps <= 0) return NaN
  return pbvSektor * bvps
}

function blankRecommendation(): Recommendation {
  return { action: 'NO_SIGNAL', rationale: 'Data harga dan nilai wajar belum cukup untuk membuat sinyal.', upside: NaN, buyZoneLow: NaN, buyZoneHigh: NaN, takeProfit: NaN, stopLoss: NaN, sellZoneLow: NaN, sellZoneHigh: NaN, shortBias: false, shortEntryLow: NaN, shortEntryHigh: NaN, coverTarget: NaN, shortStop: NaN }
}

/** Heuristic levels are decision-support zones, not guaranteed prices or trade execution. */
export function buildRecommendation(fairValue: number, currentPrice: number): Recommendation {
  if (!ok(fairValue) || fairValue <= 0 || !ok(currentPrice) || currentPrice <= 0) return blankRecommendation()
  const upside = ((fairValue - currentPrice) / currentPrice) * 100
  const shortBias = upside <= -20
  const action: Recommendation['action'] = upside >= 25 ? 'ACCUMULATE' : upside >= -10 ? 'WAIT' : 'REDUCE'
  const rationale = action === 'ACCUMULATE' ? 'Nilai model berada cukup di atas harga saat ini; tetap gunakan zona beli dan margin of safety.' : action === 'REDUCE' ? 'Harga berada di atas kisaran nilai model; pertimbangkan mengurangi risiko, bukan mengejar harga.' : 'Sinyal belum memiliki margin yang cukup untuk keputusan agresif.'
  return {
    action, rationale, upside,
    buyZoneLow: currentPrice * 0.95, buyZoneHigh: currentPrice * 1.02,
    takeProfit: fairValue * 0.9, stopLoss: currentPrice * 0.9,
    sellZoneLow: fairValue * 0.95, sellZoneHigh: fairValue * 1.05,
    shortBias, shortEntryLow: currentPrice * 0.98, shortEntryHigh: currentPrice * 1.03,
    coverTarget: fairValue * 1.05, shortStop: currentPrice * 1.1,
  }
}

export function runValuation(f: FinancialData, a: ValuationAssumptions): ValuationResult {
  const eps = calcEPS(f)
  const bvps = calcBVPS(f)
  const grahamNumber = calcGrahamNumber(eps, bvps)
  const grahamDefensiveValue = calcGrahamDefensive(eps, a.growthRate, a.grahamBondYield)
  const dcf = calcDCF(f, a)
  const ddmPerShare = calcDDM(f, a)
  const earningsPowerValue = calcEarningsPowerValue(eps, a.discountRate)
  const residualIncomeValue = calcResidualIncome(eps, bvps, a.discountRate, a.growthRate)
  const assetValueProxy = calcAssetValueProxy(f)
  const perValue = calcPERValue(eps, a.perSektor)
  const pbvValue = calcPBVValue(bvps, a.pbvSektor)
  const candidates = [
    { label: 'Graham Number', value: grahamNumber, formula: '√(22,5 × EPS × BVPS)', suitableFor: 'Perusahaan dengan EPS dan BVPS positif' },
    { label: 'Graham Defensive', value: grahamDefensiveValue, formula: 'EPS × (8,5 + 2g) × 4,4/Y', suitableFor: 'Screening konservatif; yield referensi harus jelas' },
    { label: 'DCF FCFF', value: dcf.perShare, formula: 'PV FCFF + terminal value − utang + kas', suitableFor: 'Bisnis non-keuangan dengan FCF positif' },
    { label: 'Dividend Discount', value: ddmPerShare, formula: 'D₀ × (1 + g) / (r − g)', suitableFor: 'Perusahaan dengan dividen stabil' },
    { label: 'Earnings Power Value', value: earningsPowerValue, formula: 'EPS / cost of equity', suitableFor: 'Screening earnings yang relatif stabil' },
    { label: 'Residual Income', value: residualIncomeValue, formula: 'BVPS + RI₁ / (r − g)', suitableFor: 'Bank dan bisnis berbasis book value' },
    { label: 'Relative (PER)', value: perValue, formula: 'PER sektor × EPS', suitableFor: 'Perbandingan dengan peer setara' },
    { label: 'Relative (PBV)', value: pbvValue, formula: 'PBV sektor × BVPS', suitableFor: 'Bank/properti dan peer setara' },
  ]
  const fairValues = candidates.filter((c) => Number.isFinite(c.value) && c.value > 0)
  const averageFairValue = fairValues.length ? fairValues.reduce((sum, item) => sum + item.value, 0) / fairValues.length : NaN
  let marginOfSafety = NaN
  let verdict: ValuationResult['verdict'] = null
  if (ok(averageFairValue) && averageFairValue > 0 && ok(f.hargaSaham) && f.hargaSaham > 0) {
    marginOfSafety = ((averageFairValue - f.hargaSaham) / averageFairValue) * 100
    if (marginOfSafety > 30) verdict = 'UNDERVALUED'
    else if (marginOfSafety >= 10) verdict = 'FAIR VALUE'
    else verdict = 'OVERVALUED'
  }
  return { eps, bvps, grahamNumber, grahamDefensiveValue, dcfPerShare: dcf.perShare, ddmPerShare, earningsPowerValue, residualIncomeValue, assetValueProxy, perValue, pbvValue, freeCashFlow: dcf.freeCashFlow, enterprisePV: dcf.enterprisePV, terminalValuePV: dcf.terminalValuePV, equityValue: dcf.equityValue, fairValues, averageFairValue, marginOfSafety, verdict, recommendation: buildRecommendation(averageFairValue, f.hargaSaham) }
}

export function upsideVsPrice(fairValue: number, price: number): number {
  if (!ok(fairValue) || !ok(price) || price <= 0) return NaN
  return ((fairValue - price) / price) * 100
}
