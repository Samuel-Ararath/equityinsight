import { computeDerived, type Derived, type FinancialModel } from '@/lib/types'

// =====================================================================
//  VALUATION ENGINE
//  Every formula is isolated and documented with its academic source so
//  the model can be audited independently of the UI.
//  Monetary inputs are in Rupiah; rates are handled in percent at the
//  boundary and converted to decimals internally.
// =====================================================================

export const DCF_PROJECTION_YEARS = 5
/** Total assets proxy threshold for Graham's "adequate size" criterion (Rp). */
export const GRAHAM_ASSET_THRESHOLD = 1_000_000_000_000 // Rp1 triliun (proxy kasar)

const ok = (n: number) => Number.isFinite(n)

// ---------------------------------------------------------------------
//  Per-share fundamentals
// ---------------------------------------------------------------------

/** EPS = Laba Bersih / Jumlah Saham Beredar. */
export function calcEPS(d: Derived): number {
  if (!ok(d.labaBersih) || !ok(d.sahamBeredar) || d.sahamBeredar === 0) return NaN
  return d.labaBersih / d.sahamBeredar
}

/** BVPS = Total Ekuitas / Jumlah Saham Beredar. */
export function calcBVPS(d: Derived): number {
  if (!ok(d.totalEkuitas) || !ok(d.sahamBeredar) || d.sahamBeredar === 0) return NaN
  return d.totalEkuitas / d.sahamBeredar
}

/**
 * Graham Number = √(22.5 × EPS × BVPS).
 * Source: Benjamin Graham, The Intelligent Investor (1949) — the 22.5 cap
 * embeds Graham's rule of thumb P/E ≤ 15 and P/BV ≤ 1.5 (15 × 1.5 = 22.5).
 * Only valid when EPS and BVPS are both positive.
 */
export function calcGrahamNumber(eps: number, bvps: number): number {
  if (!ok(eps) || !ok(bvps) || eps <= 0 || bvps <= 0) return NaN
  return Math.sqrt(22.5 * eps * bvps)
}

// ---------------------------------------------------------------------
//  Graham's 7 criteria for the Defensive Investor
//  Source: The Intelligent Investor, ch. 14.
// ---------------------------------------------------------------------

export type CriterionStatus = 'pass' | 'fail' | 'unknown'
export type GrahamCriterion = {
  key: string
  label: string
  status: CriterionStatus
  detail: string
}

export function grahamChecklist(
  d: Derived,
  eps: number,
  bvps: number,
  price: number,
  dividenPerSaham: number,
): { criteria: GrahamCriterion[]; passed: number; total: number } {
  const per = ok(price) && ok(eps) && eps > 0 ? price / eps : NaN
  const pbv = ok(price) && ok(bvps) && bvps > 0 ? price / bvps : NaN

  const criteria: GrahamCriterion[] = [
    {
      key: 'size',
      label: 'Ukuran perusahaan memadai',
      status: ok(d.totalAset) ? (d.totalAset > GRAHAM_ASSET_THRESHOLD ? 'pass' : 'fail') : 'unknown',
      detail: 'Proxy kasar: Total Aset > Rp1 triliun (Graham memakai ukuran penjualan minimum).',
    },
    {
      key: 'liquidity',
      label: 'Kondisi finansial kuat',
      status: ok(d.totalLiabilitasLancar)
        ? d.totalLiabilitasLancar !== 0 && d.totalAktivaLancar / d.totalLiabilitasLancar >= 2
          ? 'pass'
          : 'fail'
        : 'unknown',
      detail: 'Current Ratio ≥ 2 (aktiva lancar minimal dua kali liabilitas lancar).',
    },
    {
      key: 'stability',
      label: 'Stabilitas laba',
      status: 'unknown',
      detail: 'Butuh laba positif 10 tahun berturut — perlu data historis multi-tahun.',
    },
    {
      key: 'dividend',
      label: 'Catatan dividen',
      status: ok(dividenPerSaham) ? (dividenPerSaham > 0 ? 'pass' : 'fail') : 'unknown',
      detail: 'Ada pembayaran dividen (Graham: catatan dividen tak terputus 20 tahun).',
    },
    {
      key: 'growth',
      label: 'Pertumbuhan laba',
      status: 'unknown',
      detail: 'Pertumbuhan EPS ≥ 33% dalam 10 tahun — perlu data historis multi-tahun.',
    },
    {
      key: 'per',
      label: 'PER moderat',
      status: ok(per) ? (per <= 15 ? 'pass' : 'fail') : 'unknown',
      detail: 'Price-to-Earnings ≤ 15 terhadap laba terkini.',
    },
    {
      key: 'combined',
      label: 'Multiple gabungan moderat',
      status: ok(per) && ok(pbv) ? (per * pbv <= 22.5 ? 'pass' : 'fail') : 'unknown',
      detail: "Graham's combined multiplier rule: PER × PBV ≤ 22,5.",
    },
  ]

  const passed = criteria.filter((c) => c.status === 'pass').length
  return { criteria, passed, total: criteria.length }
}

// ---------------------------------------------------------------------
//  Cost of Capital (WACC)
// ---------------------------------------------------------------------

export type WaccResult = {
  costOfEquity: number // %
  costOfDebtPreTax: number // %
  costOfDebtAfterTax: number // %
  taxRate: number // %
  weightEquity: number // 0..1
  weightDebt: number // 0..1
  wacc: number // %
}

/**
 * Weighted Average Cost of Capital.
 *  - Cost of Equity via CAPM: Re = Rf + β × ERP (Sharpe, 1964).
 *  - Cost of Debt after-tax: Rd × (1 − tax), tax shield per Modigliani–Miller.
 *  - Weights by book value of equity vs interest-bearing debt.
 * Tax rate and pre-tax cost of debt are auto-derived from the statements
 * unless the user supplies a manual override.
 */
export function calcWACC(m: FinancialModel, d: Derived): WaccResult {
  const mk = m.market
  const beta = ok(mk.beta) ? mk.beta : NaN
  const rf = mk.riskFreeRate
  const erp = mk.equityRiskPremium

  const costOfEquity = ok(beta) && ok(rf) && ok(erp) ? rf + beta * erp : NaN

  // Effective tax rate: manual override, else Beban Pajak / EBT.
  let taxRate = mk.taxRateManual
  if (!ok(taxRate)) {
    const bebanPajak = ok(d.ebt) && ok(d.labaBersih) ? d.ebt - d.labaBersih : NaN
    taxRate = ok(bebanPajak) && ok(d.ebt) && d.ebt > 0 ? (bebanPajak / d.ebt) * 100 : NaN
  }
  const taxDec = ok(taxRate) ? Math.max(0, Math.min(taxRate, 100)) / 100 : 0

  // Pre-tax cost of debt: manual override, else Beban Bunga / interest-bearing debt.
  let costOfDebtPreTax = mk.costOfDebtManual
  if (!ok(costOfDebtPreTax)) {
    costOfDebtPreTax =
      ok(d.bebanBunga) && ok(d.totalUtangBerbunga) && d.totalUtangBerbunga > 0
        ? (d.bebanBunga / d.totalUtangBerbunga) * 100
        : NaN
  }
  const costOfDebtAfterTax = ok(costOfDebtPreTax) ? costOfDebtPreTax * (1 - taxDec) : NaN

  const equity = ok(d.totalEkuitas) ? d.totalEkuitas : NaN
  const debt = ok(d.totalUtangBerbunga) ? d.totalUtangBerbunga : 0
  const capital = ok(equity) ? equity + debt : NaN
  const weightEquity = ok(capital) && capital > 0 ? equity / capital : NaN
  const weightDebt = ok(capital) && capital > 0 ? debt / capital : NaN

  const wacc =
    ok(weightEquity) && ok(costOfEquity)
      ? weightEquity * costOfEquity + (ok(weightDebt) && ok(costOfDebtAfterTax) ? weightDebt * costOfDebtAfterTax : 0)
      : NaN

  return {
    costOfEquity,
    costOfDebtPreTax,
    costOfDebtAfterTax,
    taxRate,
    weightEquity,
    weightDebt,
    wacc,
  }
}

// ---------------------------------------------------------------------
//  Discounted Cash Flow (FCFF)
// ---------------------------------------------------------------------

export type DcfYear = {
  year: number
  fcff: number
  discountFactor: number
  presentValue: number
}

export type DcfResult = {
  fcff0: number
  years: DcfYear[]
  terminalValue: number
  terminalValuePV: number
  sumPvFcff: number
  enterpriseValue: number
  equityValue: number
  perShare: number
}

/**
 * FCFF-based DCF with an explicit 5-year projection and a Gordon Growth
 * terminal value. Source: Damodaran, Investment Valuation (FCFF model).
 *  - FCFF₀ = Arus Kas Operasi − Capex
 *  - Terminal Value = FCFF₅ × (1 + g∞) / (WACC − g∞)
 *  - Enterprise Value = Σ PV(FCFF) + PV(Terminal Value)
 *  - Equity Value = EV − Utang Berbunga + Kas
 */
export function calcDCF(m: FinancialModel, d: Derived, waccPct: number): DcfResult | null {
  const fcff0 = d.freeCashFlow
  const g = m.market.growthShort / 100
  const gt = m.market.growthTerminal / 100
  const wacc = waccPct / 100

  if (!ok(fcff0) || !ok(d.sahamBeredar) || d.sahamBeredar === 0) return null
  if (!ok(g) || !ok(wacc) || !ok(gt)) return null
  if (wacc <= gt) return null // perpetuity diverges

  const years: DcfYear[] = []
  let sumPvFcff = 0
  let lastFcff = fcff0
  for (let year = 1; year <= DCF_PROJECTION_YEARS; year++) {
    lastFcff = fcff0 * Math.pow(1 + g, year)
    const discountFactor = 1 / Math.pow(1 + wacc, year)
    const presentValue = lastFcff * discountFactor
    sumPvFcff += presentValue
    years.push({ year, fcff: lastFcff, discountFactor, presentValue })
  }

  const terminalValue = (lastFcff * (1 + gt)) / (wacc - gt)
  const terminalValuePV = terminalValue / Math.pow(1 + wacc, DCF_PROJECTION_YEARS)

  const enterpriseValue = sumPvFcff + terminalValuePV
  const debt = ok(d.totalUtangBerbunga) ? d.totalUtangBerbunga : 0
  const kas = ok(d.kas) ? d.kas : 0
  const equityValue = enterpriseValue - debt + kas
  const perShare = equityValue / d.sahamBeredar

  return {
    fcff0,
    years,
    terminalValue,
    terminalValuePV,
    sumPvFcff,
    enterpriseValue,
    equityValue,
    perShare,
  }
}

/** Per-share fair value for arbitrary WACC and terminal growth (sensitivity grid). */
export function dcfPerShareAt(
  m: FinancialModel,
  d: Derived,
  waccPct: number,
  terminalPct: number,
): number {
  const fcff0 = d.freeCashFlow
  const g = m.market.growthShort / 100
  const gt = terminalPct / 100
  const wacc = waccPct / 100
  if (!ok(fcff0) || !ok(d.sahamBeredar) || d.sahamBeredar === 0) return NaN
  if (wacc <= gt) return NaN

  let sumPv = 0
  let lastFcff = fcff0
  for (let year = 1; year <= DCF_PROJECTION_YEARS; year++) {
    lastFcff = fcff0 * Math.pow(1 + g, year)
    sumPv += lastFcff / Math.pow(1 + wacc, year)
  }
  const tv = (lastFcff * (1 + gt)) / (wacc - gt)
  const tvPv = tv / Math.pow(1 + wacc, DCF_PROJECTION_YEARS)
  const ev = sumPv + tvPv
  const debt = ok(d.totalUtangBerbunga) ? d.totalUtangBerbunga : 0
  const kas = ok(d.kas) ? d.kas : 0
  return (ev - debt + kas) / d.sahamBeredar
}

export type SensitivityGrid = {
  waccAxis: number[]
  terminalAxis: number[]
  values: number[][] // [waccIndex][terminalIndex]
}

/** 3×3 sensitivity of DCF fair value to WACC ±1% and terminal growth ±1%. */
export function dcfSensitivity(m: FinancialModel, d: Derived, baseWacc: number): SensitivityGrid | null {
  if (!ok(baseWacc)) return null
  const baseTerminal = m.market.growthTerminal
  const waccAxis = [baseWacc - 1, baseWacc, baseWacc + 1]
  const terminalAxis = [baseTerminal - 1, baseTerminal, baseTerminal + 1]
  const values = waccAxis.map((w) => terminalAxis.map((t) => dcfPerShareAt(m, d, w, t)))
  return { waccAxis, terminalAxis, values }
}

// ---------------------------------------------------------------------
//  Dividend Discount Model (Gordon Growth)
// ---------------------------------------------------------------------

/**
 * Gordon Growth DDM per share: P = D₀ × (1 + g) / (Re − g).
 * Source: Gordon & Shapiro (1956). Uses Cost of Equity (CAPM), not WACC,
 * because the DDM discounts cash flows accruing directly to equity holders.
 */
export function calcDDM(dividenPerSaham: number, growthPct: number, costOfEquityPct: number): number {
  if (!ok(dividenPerSaham) || dividenPerSaham <= 0) return NaN
  const g = growthPct / 100
  const re = costOfEquityPct / 100
  if (!ok(g) || !ok(re) || re <= g) return NaN
  return (dividenPerSaham * (1 + g)) / (re - g)
}

// ---------------------------------------------------------------------
//  Relative Valuation
// ---------------------------------------------------------------------

export type RelativeResult = {
  perValue: number
  pbvValue: number
  peg: number
}

/**
 * Relative valuation from sector multiples plus the PEG ratio.
 *  - Fair Value (PER) = PER Sektor × EPS
 *  - Fair Value (PBV) = PBV Sektor × BVPS
 *  - PEG = (Harga/EPS) / growth% — Lynch (One Up on Wall Street); <1 murah.
 */
export function calcRelative(
  eps: number,
  bvps: number,
  perSektor: number,
  pbvSektor: number,
  price: number,
  growthPct: number,
): RelativeResult {
  const perValue = ok(eps) && ok(perSektor) && perSektor > 0 && eps > 0 ? perSektor * eps : NaN
  const pbvValue = ok(bvps) && ok(pbvSektor) && pbvSektor > 0 && bvps > 0 ? pbvSektor * bvps : NaN
  const perAktual = ok(price) && ok(eps) && eps > 0 ? price / eps : NaN
  const peg = ok(perAktual) && ok(growthPct) && growthPct > 0 ? perAktual / growthPct : NaN
  return { perValue, pbvValue, peg }
}

// ---------------------------------------------------------------------
//  Real Options Valuation (Black-Scholes)
// ---------------------------------------------------------------------

/**
 * Standard normal cumulative distribution N(x) via the Abramowitz & Stegun
 * (1964) rational approximation of the error function (error < 7.5e-8).
 */
export function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989422804014327 * Math.exp(-(x * x) / 2)
  let p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  p = 1 - p
  return x >= 0 ? p : 1 - p
}

export type RealOptionResult = {
  d1: number
  d2: number
  optionValue: number
  perShare: number
}

/**
 * Black-Scholes (1973) applied to a real growth option, following
 * Damodaran's Real Options framework (Investment Valuation):
 *  - S = present value of the expansion opportunity (like the stock price)
 *  - X = investment cost to execute (the strike)
 *  - r = risk-free rate, σ = volatility, t = option life
 *  - d1 = [ln(S/X) + (r + σ²/2)·t] / (σ·√t); d2 = d1 − σ·√t
 *  - Option Value = S·N(d1) − X·e^(−r·t)·N(d2)
 */
export function calcRealOption(m: FinancialModel, d: Derived): RealOptionResult | null {
  const mk = m.market
  const S = mk.optionS
  const X = mk.optionX
  const r = mk.riskFreeRate / 100
  const sigma = mk.optionSigma / 100
  const t = mk.optionT
  if (!ok(S) || !ok(X) || S <= 0 || X <= 0) return null
  if (!ok(r) || !ok(sigma) || sigma <= 0 || !ok(t) || t <= 0) return null

  const d1 = (Math.log(S / X) + (r + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t))
  const d2 = d1 - sigma * Math.sqrt(t)
  const optionValue = S * normalCDF(d1) - X * Math.exp(-r * t) * normalCDF(d2)
  const perShare = ok(d.sahamBeredar) && d.sahamBeredar > 0 ? optionValue / d.sahamBeredar : NaN
  return { d1, d2, optionValue, perShare }
}

// ---------------------------------------------------------------------
//  Full pipeline
// ---------------------------------------------------------------------

export type FairValue = { label: string; value: number }

export type ValuationResult = {
  eps: number
  bvps: number
  grahamNumber: number
  graham: ReturnType<typeof grahamChecklist>
  wacc: WaccResult
  dcf: DcfResult | null
  sensitivity: SensitivityGrid | null
  ddmPerShare: number
  relative: RelativeResult
  realOption: RealOptionResult | null
  preProfit: boolean
  fairValues: FairValue[] // the values that feed the margin of safety
  averageFairValue: number
  marginOfSafety: number // %
  verdict: 'UNDERVALUED' | 'FAIR VALUE' | 'OVERVALUED' | null
}

/** Run the full valuation pipeline for a financial model. */
export function runValuation(m: FinancialModel, derived?: Derived): ValuationResult {
  const d = derived ?? computeDerived(m)
  const price = m.market.hargaSaham

  const eps = calcEPS(d)
  const bvps = calcBVPS(d)
  const grahamNumber = calcGrahamNumber(eps, bvps)
  const graham = grahamChecklist(d, eps, bvps, price, m.market.dividenPerSaham)
  const wacc = calcWACC(m, d)
  const dcf = calcDCF(m, d, wacc.wacc)
  const sensitivity = dcfSensitivity(m, d, wacc.wacc)
  const ddmPerShare = calcDDM(m.market.dividenPerSaham, m.market.growthShort, wacc.costOfEquity)
  const relative = calcRelative(
    eps,
    bvps,
    m.market.perSektor,
    m.market.pbvSektor,
    price,
    m.market.growthShort,
  )
  const preProfit = m.market.preProfit
  const realOption = preProfit ? calcRealOption(m, d) : null

  // Collect the fair values relevant to the company's stage.
  let candidates: FairValue[]
  if (preProfit) {
    candidates = [
      { label: 'Real Options', value: realOption?.perShare ?? NaN },
      { label: 'Relative (PER)', value: relative.perValue },
      { label: 'Relative (PBV)', value: relative.pbvValue },
    ]
  } else {
    candidates = [
      { label: 'Graham Number', value: grahamNumber },
      { label: 'DCF', value: dcf?.perShare ?? NaN },
      { label: 'Dividend Discount Model', value: ddmPerShare },
      { label: 'Relative (PER)', value: relative.perValue },
      { label: 'Relative (PBV)', value: relative.pbvValue },
    ]
  }
  const fairValues = candidates.filter((c) => ok(c.value) && c.value > 0)

  const averageFairValue = fairValues.length
    ? fairValues.reduce((s, c) => s + c.value, 0) / fairValues.length
    : NaN

  let marginOfSafety = NaN
  let verdict: ValuationResult['verdict'] = null
  if (ok(averageFairValue) && averageFairValue > 0 && ok(price) && price > 0) {
    marginOfSafety = ((averageFairValue - price) / averageFairValue) * 100
    if (marginOfSafety > 30) verdict = 'UNDERVALUED'
    else if (marginOfSafety >= 10) verdict = 'FAIR VALUE'
    else verdict = 'OVERVALUED'
  }

  return {
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
    preProfit,
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
