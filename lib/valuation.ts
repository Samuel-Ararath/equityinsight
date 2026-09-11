import type { FinancialInputs } from '@/lib/types'
import { deriveStatement, n0, ok, type DerivedStatement } from '@/lib/statements'

// =====================================================================
//  VALUATION ENGINE
//  Setiap fungsi diberi JSDoc yang menyebutkan rumus dan sumber teorinya
//  agar mudah diaudit. Semua nilai uang dalam Rupiah, persentase dalam
//  angka persen (12 = 12%).
// =====================================================================

export const DCF_PROJECTION_YEARS = 5

/** Referensi teori yang dipakai di UI (tooltip/footnote). */
export const SOURCES = {
  graham: 'Graham Number — Benjamin Graham, The Intelligent Investor (1949), Bab 14.',
  grahamCriteria:
    'Tujuh kriteria Defensive Investor — Benjamin Graham, The Intelligent Investor (1949), Bab 14 "Stock Selection for the Defensive Investor".',
  grahamMultiplier:
    'Combined multiplier rule PER × PBV ≤ 22,5 — Benjamin Graham, The Intelligent Investor (edisi revisi 1973).',
  capm: 'CAPM — William Sharpe (1964), John Lintner (1965): Ke = Rf + β × ERP.',
  erp: 'Equity Risk Premium — Aswath Damodaran, "Equity Risk Premiums: Determinants, Estimation and Implications" (diperbarui tahunan).',
  beta: 'Beta mengukur sensitivitas return saham terhadap pasar; β = 1 setara risiko pasar. Sharpe (1964).',
  wacc: 'WACC — Modigliani & Miller (1958, 1963); praktik standar di Brealey, Myers & Allen, Principles of Corporate Finance.',
  dcf: 'Discounted Cash Flow (FCFF) — Aswath Damodaran, Investment Valuation (2012), Bab 12–15; John Burr Williams, The Theory of Investment Value (1938).',
  gordon: 'Gordon Growth Model — Myron J. Gordon & Eli Shapiro (1956); Gordon, The Investment, Financing, and Valuation of the Corporation (1962).',
  ddm: 'Dividend Discount Model — John Burr Williams (1938); Gordon Growth (1956, 1962).',
  relative: 'Relative Valuation (multiples) — Aswath Damodaran, Investment Valuation (2012), Bab 17–20.',
  peg: 'PEG Ratio — dipopulerkan Peter Lynch, One Up on Wall Street (1989); PEG ≈ 1 dianggap wajar.',
  realOptions:
    'Real Options Valuation — Aswath Damodaran, Investment Valuation (2012), Bab 28–30; Black & Scholes (1973); Merton (1973).',
  blackScholes: 'Black–Scholes–Merton option pricing — Black & Scholes, Journal of Political Economy (1973).',
  mos: 'Margin of Safety — Benjamin Graham & David Dodd, Security Analysis (1934); The Intelligent Investor, Bab 20.',
  terminalGrowth:
    'Pertumbuhan perpetuitas tidak boleh melebihi pertumbuhan nominal ekonomi jangka panjang — Damodaran, Investment Valuation, Bab 12.',
  sensitivity: 'Analisis sensitivitas DCF — McKinsey & Company, Valuation: Measuring and Managing the Value of Companies (Koller, Goedhart, Wessels).',
} as const

// ---------------------------------------------------------------------
//  Dasar per saham
// ---------------------------------------------------------------------

/** EPS = Laba Bersih / Jumlah Saham Beredar (weighted average). */
export function calcEPS(d: DerivedStatement, sahamBeredar: number): number {
  if (!ok(d.labaBersih) || !ok(sahamBeredar) || sahamBeredar <= 0) return NaN
  return d.labaBersih / sahamBeredar
}

/** BVPS = Total Ekuitas / Jumlah Saham Beredar. */
export function calcBVPS(d: DerivedStatement, sahamBeredar: number): number {
  if (!ok(d.totalEkuitas) || !ok(sahamBeredar) || sahamBeredar <= 0) return NaN
  return d.totalEkuitas / sahamBeredar
}

// ---------------------------------------------------------------------
//  Graham
// ---------------------------------------------------------------------

/**
 * Graham Number = √(22,5 × EPS × BVPS).
 * Angka 22,5 berasal dari batas PER 15 × PBV 1,5.
 * Sumber: Benjamin Graham, The Intelligent Investor (1949), Bab 14.
 */
export function calcGrahamNumber(eps: number, bvps: number): number {
  if (!ok(eps) || !ok(bvps) || eps <= 0 || bvps <= 0) return NaN
  return Math.sqrt(22.5 * eps * bvps)
}

export type CriterionStatus = 'pass' | 'fail' | 'na'

export type Criterion = {
  key: string
  label: string
  status: CriterionStatus
  detail: string
  note?: string
}

/** Proksi ukuran perusahaan: Total Aset ≥ Rp1 triliun (setara mid-cap BEI). */
export const GRAHAM_SIZE_THRESHOLD = 1e12

/**
 * Checklist 7 kriteria Defensive Investor.
 * Sumber: Graham, The Intelligent Investor, Bab 14. Kriteria yang butuh data
 * historis (stabilitas & pertumbuhan laba) ditandai "na".
 */
export function calcGrahamChecklist(
  d: DerivedStatement,
  price: number,
  eps: number,
  bvps: number,
): { criteria: Criterion[]; passed: number; evaluable: number } {
  const currentRatio =
    ok(d.totalAsetLancar) && ok(d.totalLiabilitasLancar) && d.totalLiabilitasLancar > 0
      ? d.totalAsetLancar / d.totalLiabilitasLancar
      : NaN
  const per = ok(price) && ok(eps) && eps > 0 ? price / eps : NaN
  const pbv = ok(price) && ok(bvps) && bvps > 0 ? price / bvps : NaN
  const combined = ok(per) && ok(pbv) ? per * pbv : NaN

  const fmt = (v: number, digits = 2) => (ok(v) ? v.toFixed(digits) : '—')

  const criteria: Criterion[] = [
    {
      key: 'size',
      label: 'Ukuran perusahaan memadai',
      status: ok(d.totalAset) ? (d.totalAset >= GRAHAM_SIZE_THRESHOLD ? 'pass' : 'fail') : 'na',
      detail: ok(d.totalAset) ? `Total Aset ${(d.totalAset / 1e12).toFixed(2)} T` : 'Perlu Total Aset',
      note: 'Proksi kasar: Total Aset ≥ Rp1 T. Graham memakai penjualan tahunan ≥ $100 juta (1970-an).',
    },
    {
      key: 'financial',
      label: 'Kondisi finansial kuat (Current Ratio ≥ 2)',
      status: ok(currentRatio) ? (currentRatio >= 2 ? 'pass' : 'fail') : 'na',
      detail: `Current Ratio ${fmt(currentRatio)}×`,
    },
    {
      key: 'stability',
      label: 'Stabilitas laba (10 tahun positif)',
      status: 'na',
      detail: 'Perlu data historis',
    },
    {
      key: 'dividend',
      label: 'Catatan dividen (DPS > 0)',
      status: ok(d.dividenPerSaham) ? (d.dividenPerSaham > 0 ? 'pass' : 'fail') : 'na',
      detail: ok(d.dividenPerSaham) ? `DPS Rp${Math.round(d.dividenPerSaham)}` : 'Perlu dividen dibayarkan',
    },
    {
      key: 'growth',
      label: 'Pertumbuhan laba (≥ 33% dalam 10 tahun)',
      status: 'na',
      detail: 'Perlu data historis',
    },
    {
      key: 'per',
      label: 'PER moderat (≤ 15)',
      status: ok(per) ? (per <= 15 ? 'pass' : 'fail') : 'na',
      detail: `PER ${fmt(per)}×`,
    },
    {
      key: 'multiplier',
      label: 'PBV moderat (PER × PBV ≤ 22,5)',
      status: ok(combined) ? (combined <= 22.5 ? 'pass' : 'fail') : 'na',
      detail: `PER × PBV = ${fmt(combined, 1)}`,
      note: SOURCES.grahamMultiplier,
    },
  ]

  const passed = criteria.filter((c) => c.status === 'pass').length
  const evaluable = criteria.filter((c) => c.status !== 'na').length
  return { criteria, passed, evaluable }
}

// ---------------------------------------------------------------------
//  Cost of Capital
// ---------------------------------------------------------------------

export type WACCResult = {
  costOfEquity: number
  costOfDebtPreTax: number
  costOfDebtAfterTax: number
  taxRate: number
  weightEquity: number
  weightDebt: number
  wacc: number
  totalEkuitas: number
  totalUtang: number
}

/**
 * CAPM: Ke = Rf + β × ERP.
 * Sumber: Sharpe (1964), Lintner (1965). Semua dalam persen.
 */
export function calcCostOfEquity(riskFree: number, beta: number, erp: number): number {
  if (!ok(riskFree) || !ok(beta) || !ok(erp)) return NaN
  return riskFree + beta * erp
}

/**
 * WACC = We × Ke + Wd × Kd × (1 − T).
 * We = E / (E + D), Wd = D / (E + D). D = utang berbunga (bank/obligasi).
 * Sumber: Modigliani & Miller (1963); Brealey, Myers & Allen.
 */
export function calcWACC(d: DerivedStatement, inp: FinancialInputs): WACCResult {
  const m = inp.market
  const costOfEquity = calcCostOfEquity(m.riskFreeRate, m.beta, m.equityRiskPremium)
  const costOfDebtPreTax = d.costOfDebt
  const costOfDebtAfterTax = costOfDebtPreTax * (1 - d.taxRate / 100)

  const E = d.totalEkuitas
  const D = ok(d.utangBerbunga) ? d.utangBerbunga : 0
  let weightEquity = NaN
  let weightDebt = NaN
  if (ok(E) && E > 0 && E + D > 0) {
    weightEquity = E / (E + D)
    weightDebt = D / (E + D)
  }
  const wacc =
    ok(costOfEquity) && ok(weightEquity)
      ? weightEquity * costOfEquity + weightDebt * costOfDebtAfterTax
      : NaN

  return {
    costOfEquity,
    costOfDebtPreTax,
    costOfDebtAfterTax,
    taxRate: d.taxRate,
    weightEquity,
    weightDebt,
    wacc,
    totalEkuitas: E,
    totalUtang: D,
  }
}

// ---------------------------------------------------------------------
//  DCF (FCFF)
// ---------------------------------------------------------------------

export type DCFYear = { year: number; fcff: number; discountFactor: number; pv: number }

export type DCFResult = {
  fcff0: number
  projections: DCFYear[]
  sumPV: number
  terminalValue: number
  terminalValuePV: number
  enterpriseValue: number
  netDebt: number
  equityValue: number
  perShare: number
  wacc: number
  terminalGrowth: number
  invalidReason: string | null
}

/**
 * Free Cash Flow to Firm (versi sederhana) = Arus Kas Operasi − Capex.
 * Sumber: Damodaran, Investment Valuation, Bab 14.
 */
export function calcFCFF(arusKasOperasi: number, capex: number): number {
  if (!ok(arusKasOperasi)) return NaN
  return arusKasOperasi - Math.abs(n0(capex))
}

/**
 * DCF FCFF 5 tahun + Terminal Value (Gordon Growth).
 *  FCFF_t = FCFF_0 × (1+g)^t
 *  PV_t   = FCFF_t / (1+WACC)^t
 *  TV     = FCFF_5 × (1+g_T) / (WACC − g_T)
 *  EV     = Σ PV_t + PV(TV)
 *  Equity = EV − Utang Berbunga + Kas
 *  Nilai/Saham = Equity / Saham Beredar
 * Sumber: Damodaran, Investment Valuation, Bab 12 & 15; Gordon (1962).
 */
export function calcDCF(
  d: DerivedStatement,
  inp: FinancialInputs,
  waccPct: number,
  growthPct = inp.market.growthRate,
  terminalPct = inp.market.terminalGrowth,
): DCFResult {
  const fcff0 = calcFCFF(inp.cashflow.arusKasOperasi, inp.cashflow.capex)
  const shares = inp.income.sahamBeredar
  const base: DCFResult = {
    fcff0,
    projections: [],
    sumPV: NaN,
    terminalValue: NaN,
    terminalValuePV: NaN,
    enterpriseValue: NaN,
    netDebt: NaN,
    equityValue: NaN,
    perShare: NaN,
    wacc: waccPct,
    terminalGrowth: terminalPct,
    invalidReason: null,
  }

  if (!ok(fcff0)) return { ...base, invalidReason: 'Arus kas operasi belum diisi.' }
  if (fcff0 <= 0)
    return { ...base, invalidReason: 'FCFF negatif — DCF tidak relevan; gunakan Real Options.' }
  if (!ok(waccPct)) return { ...base, invalidReason: 'WACC belum dapat dihitung (perlu ekuitas).' }
  if (!ok(growthPct) || !ok(terminalPct)) return { ...base, invalidReason: 'Asumsi growth belum lengkap.' }

  const g = growthPct / 100
  const r = waccPct / 100
  const gT = terminalPct / 100
  if (r <= gT)
    return { ...base, invalidReason: 'WACC harus lebih besar dari growth terminal agar perpetuitas konvergen.' }

  const projections: DCFYear[] = []
  let sumPV = 0
  for (let t = 1; t <= DCF_PROJECTION_YEARS; t++) {
    const fcff = fcff0 * Math.pow(1 + g, t)
    const discountFactor = 1 / Math.pow(1 + r, t)
    const pv = fcff * discountFactor
    sumPV += pv
    projections.push({ year: t, fcff, discountFactor, pv })
  }
  const last = projections[projections.length - 1]
  const terminalValue = (last.fcff * (1 + gT)) / (r - gT)
  const terminalValuePV = terminalValue * last.discountFactor
  const enterpriseValue = sumPV + terminalValuePV
  const netDebt = n0(d.utangBerbunga) - n0(inp.balance.kas)
  const equityValue = enterpriseValue - netDebt
  const perShare = ok(shares) && shares > 0 ? equityValue / shares : NaN

  return {
    ...base,
    projections,
    sumPV,
    terminalValue,
    terminalValuePV,
    enterpriseValue,
    netDebt,
    equityValue,
    perShare,
    invalidReason: ok(perShare) ? null : 'Jumlah saham beredar belum diisi.',
  }
}

export type SensitivityGrid = {
  waccs: number[]
  growths: number[]
  /** rows = wacc, cols = growth terminal */
  values: number[][]
}

/**
 * Grid sensitivitas 3×3: WACC ±1% × growth terminal ±1%.
 * Sumber: Koller, Goedhart & Wessels (McKinsey), Valuation.
 */
export function calcDCFSensitivity(
  d: DerivedStatement,
  inp: FinancialInputs,
  waccPct: number,
): SensitivityGrid {
  const waccs = [waccPct - 1, waccPct, waccPct + 1]
  const growths = [
    inp.market.terminalGrowth - 1,
    inp.market.terminalGrowth,
    inp.market.terminalGrowth + 1,
  ]
  const values = waccs.map((w) =>
    growths.map((g) => calcDCF(d, inp, w, inp.market.growthRate, g).perShare),
  )
  return { waccs, growths, values }
}

// ---------------------------------------------------------------------
//  DDM
// ---------------------------------------------------------------------

/**
 * Gordon Growth Model: P = D₀ × (1+g) / (Ke − g).
 * Memakai Cost of Equity (CAPM), bukan WACC, karena menilai ekuitas langsung.
 * Sumber: Gordon & Shapiro (1956); Williams (1938).
 */
export function calcDDM(dps: number, costOfEquityPct: number, growthPct: number): number {
  if (!ok(dps) || dps <= 0 || !ok(costOfEquityPct) || !ok(growthPct)) return NaN
  const r = costOfEquityPct / 100
  const g = growthPct / 100
  if (r <= g) return NaN
  return (dps * (1 + g)) / (r - g)
}

// ---------------------------------------------------------------------
//  Relative Valuation
// ---------------------------------------------------------------------

export type RelativeResult = {
  perValue: number
  pbvValue: number
  currentPER: number
  currentPBV: number
  peg: number
}

/**
 * Nilai wajar dari multiple sektor: P = PER_sektor × EPS; P = PBV_sektor × BVPS.
 * PEG = PER saat ini / growth (%) — Peter Lynch (1989).
 * Sumber: Damodaran, Investment Valuation, Bab 17–20.
 */
export function calcRelative(
  eps: number,
  bvps: number,
  price: number,
  perSektor: number,
  pbvSektor: number,
  growthPct: number,
): RelativeResult {
  const perValue = ok(eps) && eps > 0 && ok(perSektor) && perSektor > 0 ? perSektor * eps : NaN
  const pbvValue = ok(bvps) && bvps > 0 && ok(pbvSektor) && pbvSektor > 0 ? pbvSektor * bvps : NaN
  const currentPER = ok(price) && ok(eps) && eps > 0 ? price / eps : NaN
  const currentPBV = ok(price) && ok(bvps) && bvps > 0 ? price / bvps : NaN
  const peg = ok(currentPER) && ok(growthPct) && growthPct > 0 ? currentPER / growthPct : NaN
  return { perValue, pbvValue, currentPER, currentPBV, peg }
}

// ---------------------------------------------------------------------
//  Real Options (Black–Scholes)
// ---------------------------------------------------------------------

/**
 * Fungsi distribusi kumulatif normal standar N(x).
 * Aproksimasi Abramowitz & Stegun (1964), rumus 26.2.17, galat < 7,5×10⁻⁸.
 */
export function normalCDF(x: number): number {
  if (!ok(x)) return NaN
  const b1 = 0.31938153
  const b2 = -0.356563782
  const b3 = 1.781477937
  const b4 = -1.821255978
  const b5 = 1.330274429
  const p = 0.2316419
  const t = 1 / (1 + p * Math.abs(x))
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))))
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
  const cdf = 1 - pdf * poly
  return x >= 0 ? cdf : 1 - cdf
}

export type RealOptionResult = {
  d1: number
  d2: number
  nd1: number
  nd2: number
  optionValue: number
  netCash: number
  equityValue: number
  perShare: number
}

/**
 * Nilai opsi ekspansi (call) — Black–Scholes:
 *  d1 = [ln(S/X) + (r + σ²/2)·t] / (σ√t),  d2 = d1 − σ√t
 *  C  = S·N(d1) − X·e^(−rt)·N(d2)
 * S = PV nilai proyek, X = biaya investasi, r = risk-free, σ = volatilitas, t = umur opsi.
 * Nilai ekuitas ≈ Nilai Opsi + Kas − Utang Berbunga (penyederhanaan: nilai aset
 * operasi eksisting diabaikan karena arus kas belum positif).
 * Sumber: Damodaran, Investment Valuation, Bab 28–30; Black & Scholes (1973).
 */
export function calcRealOption(
  S: number,
  X: number,
  sigmaPct: number,
  t: number,
  riskFreePct: number,
  kas: number,
  utang: number,
  shares: number,
): RealOptionResult {
  const empty: RealOptionResult = {
    d1: NaN,
    d2: NaN,
    nd1: NaN,
    nd2: NaN,
    optionValue: NaN,
    netCash: NaN,
    equityValue: NaN,
    perShare: NaN,
  }
  if (!ok(S) || !ok(X) || !ok(sigmaPct) || !ok(t) || !ok(riskFreePct)) return empty
  if (S <= 0 || X <= 0 || sigmaPct <= 0 || t <= 0) return empty

  const sigma = sigmaPct / 100
  const r = riskFreePct / 100
  const sqrtT = Math.sqrt(t)
  const d1 = (Math.log(S / X) + (r + (sigma * sigma) / 2) * t) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const nd1 = normalCDF(d1)
  const nd2 = normalCDF(d2)
  const optionValue = S * nd1 - X * Math.exp(-r * t) * nd2
  const netCash = n0(kas) - n0(utang)
  const equityValue = optionValue + netCash
  const perShare = ok(shares) && shares > 0 ? equityValue / shares : NaN
  return { d1, d2, nd1, nd2, optionValue, netCash, equityValue, perShare }
}

// ---------------------------------------------------------------------
//  Pipeline
// ---------------------------------------------------------------------

export type Verdict = 'UNDERVALUED' | 'FAIR VALUE' | 'OVERVALUED'

export type FairValueEntry = { key: string; label: string; value: number; source: string }

export type ValuationResult = {
  mode: 'standard' | 'preProfit'
  eps: number
  bvps: number
  grahamNumber: number
  graham: ReturnType<typeof calcGrahamChecklist>
  wacc: WACCResult
  dcf: DCFResult
  sensitivity: SensitivityGrid
  ddmPerShare: number
  relative: RelativeResult
  realOption: RealOptionResult
  fairValues: FairValueEntry[]
  averageFairValue: number
  marginOfSafety: number
  verdict: Verdict | null
  price: number
  dividenPerSaham: number
}

/**
 * Margin of Safety = (Nilai Wajar − Harga) / Nilai Wajar.
 * Ambang: > 30% UNDERVALUED, 10–30% FAIR VALUE, < 10% OVERVALUED.
 * Sumber: Graham & Dodd, Security Analysis (1934); The Intelligent Investor, Bab 20.
 */
export function calcMarginOfSafety(fairValue: number, price: number): number {
  if (!ok(fairValue) || fairValue <= 0 || !ok(price) || price <= 0) return NaN
  return ((fairValue - price) / fairValue) * 100
}

export function verdictFromMargin(mos: number): Verdict | null {
  if (!ok(mos)) return null
  if (mos > 30) return 'UNDERVALUED'
  if (mos >= 10) return 'FAIR VALUE'
  return 'OVERVALUED'
}

export function runValuation(inp: FinancialInputs): ValuationResult {
  const d = deriveStatement(inp)
  const shares = inp.income.sahamBeredar
  const price = inp.market.hargaSaham
  const m = inp.market

  const eps = calcEPS(d, shares)
  const bvps = calcBVPS(d, shares)
  const grahamNumber = calcGrahamNumber(eps, bvps)
  const graham = calcGrahamChecklist(d, price, eps, bvps)
  const wacc = calcWACC(d, inp)
  const dcf = calcDCF(d, inp, wacc.wacc)
  const sensitivity = calcDCFSensitivity(d, inp, wacc.wacc)
  const ddmPerShare = calcDDM(d.dividenPerSaham, wacc.costOfEquity, m.growthRate)
  const relative = calcRelative(eps, bvps, price, m.perSektor, m.pbvSektor, m.growthRate)
  const realOption = calcRealOption(
    m.optS,
    m.optX,
    m.optSigma,
    m.optT,
    m.riskFreeRate,
    inp.balance.kas,
    d.utangBerbunga,
    shares,
  )

  const mode: ValuationResult['mode'] = m.preProfit ? 'preProfit' : 'standard'

  // Pra-profitabilitas: DCF/DDM/Graham butuh laba & arus kas positif stabil,
  // jadi hanya Real Options + Relative yang dipakai (Damodaran, Bab 23 & 30).
  const candidates: FairValueEntry[] =
    mode === 'preProfit'
      ? [
          { key: 'realOption', label: 'Real Options', value: realOption.perShare, source: SOURCES.realOptions },
          { key: 'per', label: 'Relative (PER)', value: relative.perValue, source: SOURCES.relative },
          { key: 'pbv', label: 'Relative (PBV)', value: relative.pbvValue, source: SOURCES.relative },
        ]
      : [
          { key: 'graham', label: 'Graham Number', value: grahamNumber, source: SOURCES.graham },
          { key: 'dcf', label: 'DCF (FCFF)', value: dcf.perShare, source: SOURCES.dcf },
          { key: 'ddm', label: 'DDM (Gordon)', value: ddmPerShare, source: SOURCES.gordon },
          { key: 'per', label: 'Relative (PER)', value: relative.perValue, source: SOURCES.relative },
          { key: 'pbv', label: 'Relative (PBV)', value: relative.pbvValue, source: SOURCES.relative },
        ]

  const fairValues = candidates.filter((c) => ok(c.value) && c.value > 0)
  const averageFairValue = fairValues.length
    ? fairValues.reduce((s, c) => s + c.value, 0) / fairValues.length
    : NaN
  const marginOfSafety = calcMarginOfSafety(averageFairValue, price)
  const verdict = verdictFromMargin(marginOfSafety)

  return {
    mode,
    eps,
    bvps,
    grahamNumber,
    graham,
    wacc,
    dcf,
    sensitivity,
    ddmPerShare,
    relative,
    realOption,
    fairValues,
    averageFairValue,
    marginOfSafety,
    verdict,
    price,
    dividenPerSaham: d.dividenPerSaham,
  }
}

/** Selisih % nilai wajar terhadap harga saat ini (upside). */
export function upsideVsPrice(fairValue: number, price: number): number {
  if (!ok(fairValue) || !ok(price) || price <= 0) return NaN
  return ((fairValue - price) / price) * 100
}
