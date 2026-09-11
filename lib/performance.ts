import type { FinancialInputs, PriorPeriod } from '@/lib/types'
import { deriveStatement, ok, type DerivedStatement } from '@/lib/statements'
import type { Criterion } from '@/lib/valuation'

// =====================================================================
//  PERFORMANCE (KINERJA) ENGINE
//  Menilai kesehatan bisnis — tidak menyentuh harga saham kecuali
//  komponen X4 Altman yang secara definisi memakai nilai pasar ekuitas.
// =====================================================================

export const PERF_SOURCES = {
  dupont:
    'DuPont System of Financial Analysis — dikembangkan F. Donaldson Brown di DuPont Corporation (1920-an); ROE = NPM × Asset Turnover × Equity Multiplier.',
  altman:
    'Altman Z-Score — Edward I. Altman, "Financial Ratios, Discriminant Analysis and the Prediction of Corporate Bankruptcy", Journal of Finance (1968).',
  piotroski:
    'Piotroski F-Score — Joseph D. Piotroski, "Value Investing: The Use of Historical Financial Statement Information to Separate Winners from Losers", Journal of Accounting Research (2000).',
  currentRatio:
    'Current Ratio ≥ 2 dianggap sehat menurut analisis kredit konvensional (Graham, The Intelligent Investor, Bab 14; Brigham & Houston).',
  quickRatio: 'Quick (Acid-Test) Ratio ≥ 1 — Brigham & Houston, Fundamentals of Financial Management.',
  cashRatio: 'Cash Ratio ≥ 0,5 dianggap kuat; ≥ 0,2 memadai — Ross, Westerfield & Jaffe, Corporate Finance.',
  der: 'DER ≤ 1 konservatif; > 2 agresif — praktik analisis kredit (Moody’s/S&P) & Brigham & Houston.',
  dar: 'Debt to Asset ≤ 0,5 berarti mayoritas aset didanai ekuitas — Brigham & Houston.',
  icr: 'Interest Coverage ≥ 3 aman; < 1,5 distress — Damodaran, synthetic rating table (Investment Valuation).',
  roe: 'ROE ≥ 15% konsisten adalah ambang bisnis unggul menurut Warren Buffett (Berkshire Letters) & Greenblatt.',
  roa: 'ROA ≥ 5% baik untuk perusahaan non-keuangan — Brigham & Houston.',
  margin: 'Margin laba dibandingkan rule of thumb lintas industri; idealnya dibandingkan rerata sektor — Damodaran, industry averages.',
  turnover: 'Asset Turnover ≥ 1 efisien untuk industri non-padat modal — Brigham & Houston.',
  inventory: 'Inventory Turnover = HPP / Persediaan; ≥ 6× umumnya efisien untuk manufaktur/ritel — Brigham & Houston.',
} as const

export type Health = 'healthy' | 'watch' | 'risk'

export const HEALTH_LABEL: Record<Health, string> = {
  healthy: 'Sehat',
  watch: 'Perlu Perhatian',
  risk: 'Berisiko',
}

export type RatioResult = {
  key: string
  name: string
  value: number
  unit: '%' | '×'
  health: Health | null
  formula: string
  source: string
}

export type RatioCategory = { key: string; title: string; ratios: RatioResult[] }

function classifyHigher(value: number, good: number, warn: number): Health | null {
  if (!ok(value)) return null
  if (value >= good) return 'healthy'
  if (value >= warn) return 'watch'
  return 'risk'
}

function classifyLower(value: number, good: number, warn: number): Health | null {
  if (!ok(value)) return null
  if (value <= good) return 'healthy'
  if (value <= warn) return 'watch'
  return 'risk'
}

export function ratio(a: number, b: number): number {
  if (!ok(a) || !ok(b) || b === 0) return NaN
  return a / b
}

// ---------------------------------------------------------------------
//  DuPont
// ---------------------------------------------------------------------

export type DuPontResult = {
  netProfitMargin: number
  assetTurnover: number
  equityMultiplier: number
  roe: number
}

/**
 * 3-Step DuPont: ROE = (Laba Bersih/Pendapatan) × (Pendapatan/Total Aset) × (Total Aset/Ekuitas).
 * Sumber: DuPont Corporation (F. Donaldson Brown, 1920-an).
 */
export function calcDuPont(d: DerivedStatement, pendapatan: number): DuPontResult {
  const netProfitMargin = ratio(d.labaBersih, pendapatan)
  const assetTurnover = ratio(pendapatan, d.totalAset)
  const equityMultiplier = ratio(d.totalAset, d.totalEkuitas)
  const roe =
    ok(netProfitMargin) && ok(assetTurnover) && ok(equityMultiplier)
      ? netProfitMargin * assetTurnover * equityMultiplier
      : NaN
  return { netProfitMargin, assetTurnover, equityMultiplier, roe }
}

// ---------------------------------------------------------------------
//  Altman Z
// ---------------------------------------------------------------------

export type AltmanZone = 'safe' | 'grey' | 'distress'

export type AltmanResult = {
  x1: number
  x2: number
  x3: number
  x4: number
  x5: number
  z: number
  zone: AltmanZone | null
}

export const ALTMAN_ZONE_LABEL: Record<AltmanZone, string> = {
  safe: 'Zona Aman',
  grey: 'Zona Abu-abu',
  distress: 'Zona Distress',
}

/**
 * Altman Z-Score (1968, perusahaan manufaktur publik):
 *  Z = 1,2·X1 + 1,4·X2 + 3,3·X3 + 0,6·X4 + 1,0·X5
 *  X1 = Modal Kerja/Total Aset, X2 = Saldo Laba/Total Aset, X3 = EBIT/Total Aset,
 *  X4 = Nilai Pasar Ekuitas/Total Liabilitas, X5 = Pendapatan/Total Aset.
 *  Z > 2,99 aman; 1,81–2,99 abu-abu; < 1,81 distress.
 * Sumber: Altman, Journal of Finance (1968).
 */
export function calcAltmanZ(
  d: DerivedStatement,
  pendapatan: number,
  saldoLaba: number,
): AltmanResult {
  const x1 = ratio(d.modalKerja, d.totalAset)
  const x2 = ratio(saldoLaba, d.totalAset)
  const x3 = ratio(d.ebit, d.totalAset)
  const x4 = ratio(d.marketCap, d.totalLiabilitas)
  const x5 = ratio(pendapatan, d.totalAset)
  const parts = [x1, x2, x3, x4, x5]
  const z = parts.every(ok) ? 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5 : NaN
  let zone: AltmanZone | null = null
  if (ok(z)) zone = z > 2.99 ? 'safe' : z >= 1.81 ? 'grey' : 'distress'
  return { x1, x2, x3, x4, x5, z, zone }
}

// ---------------------------------------------------------------------
//  Piotroski F
// ---------------------------------------------------------------------

export type PiotroskiResult = {
  criteria: Criterion[]
  score: number
  evaluable: number
  label: string | null
  grade: Health | null
}

/**
 * Piotroski F-Score (0–9), 9 sinyal biner:
 *  Profitabilitas: ROA>0, CFO>0, ΔROA>0, CFO>Laba Bersih (akrual)
 *  Leverage/likuiditas: ΔLeverage<0, ΔCurrent Ratio>0, tidak ada penerbitan saham
 *  Efisiensi: ΔGross Margin>0, ΔAsset Turnover>0
 * Sumber: Piotroski, Journal of Accounting Research (2000).
 */
export function calcPiotroski(
  d: DerivedStatement,
  inp: FinancialInputs,
  prior: PriorPeriod,
): PiotroskiResult {
  const roa = ratio(d.labaBersih, d.totalAset)
  const cfo = inp.cashflow.arusKasOperasi
  const leverage = ratio(d.utangBerbunga, d.totalAset)
  const currentRatio = ratio(d.totalAsetLancar, d.totalLiabilitasLancar)
  const grossMargin = ratio(d.labaKotor, inp.income.pendapatan)
  const assetTurnover = ratio(inp.income.pendapatan, d.totalAset)
  const shares = inp.income.sahamBeredar

  const pct = (v: number) => (ok(v) ? `${(v * 100).toFixed(1)}%` : '—')
  const num = (v: number, dg = 2) => (ok(v) ? v.toFixed(dg) : '—')

  const cmp = (cur: number, prev: number, higherBetter: boolean): Criterion['status'] => {
    if (!ok(cur) || !ok(prev)) return 'na'
    return (higherBetter ? cur > prev : cur < prev) ? 'pass' : 'fail'
  }

  const criteria: Criterion[] = [
    {
      key: 'roa',
      label: 'ROA positif',
      status: ok(roa) ? (roa > 0 ? 'pass' : 'fail') : 'na',
      detail: `ROA ${pct(roa)}`,
    },
    {
      key: 'cfo',
      label: 'Arus kas operasi positif',
      status: ok(cfo) ? (cfo > 0 ? 'pass' : 'fail') : 'na',
      detail: ok(cfo) ? (cfo > 0 ? 'CFO > 0' : 'CFO ≤ 0') : 'Perlu CFO',
    },
    {
      key: 'droa',
      label: 'ROA meningkat YoY',
      status: cmp(roa, ok(prior.roa) ? prior.roa / 100 : NaN, true),
      detail: `${pct(roa)} vs ${ok(prior.roa) ? prior.roa.toFixed(1) + '%' : '—'}`,
    },
    {
      key: 'accrual',
      label: 'CFO > Laba Bersih (kualitas laba)',
      status: ok(cfo) && ok(d.labaBersih) ? (cfo > d.labaBersih ? 'pass' : 'fail') : 'na',
      detail: 'Akrual negatif = laba didukung kas',
    },
    {
      key: 'leverage',
      label: 'Leverage menurun YoY',
      status: cmp(leverage, prior.leverage, false),
      detail: `${num(leverage)} vs ${num(prior.leverage)}`,
    },
    {
      key: 'liquidity',
      label: 'Current Ratio meningkat YoY',
      status: cmp(currentRatio, prior.currentRatio, true),
      detail: `${num(currentRatio)}× vs ${num(prior.currentRatio)}×`,
    },
    {
      key: 'dilution',
      label: 'Tidak ada penerbitan saham baru',
      status: ok(shares) && ok(prior.sahamBeredar) ? (shares <= prior.sahamBeredar ? 'pass' : 'fail') : 'na',
      detail: ok(shares) && ok(prior.sahamBeredar) ? 'Saham beredar tidak bertambah' : 'Perlu saham beredar tahun lalu',
    },
    {
      key: 'gm',
      label: 'Gross Margin meningkat YoY',
      status: cmp(grossMargin, ok(prior.grossMargin) ? prior.grossMargin / 100 : NaN, true),
      detail: `${pct(grossMargin)} vs ${ok(prior.grossMargin) ? prior.grossMargin.toFixed(1) + '%' : '—'}`,
    },
    {
      key: 'ato',
      label: 'Asset Turnover meningkat YoY',
      status: cmp(assetTurnover, prior.assetTurnover, true),
      detail: `${num(assetTurnover)}× vs ${num(prior.assetTurnover)}×`,
    },
  ]

  const score = criteria.filter((c) => c.status === 'pass').length
  const evaluable = criteria.filter((c) => c.status !== 'na').length
  let label: string | null = null
  let grade: Health | null = null
  if (evaluable > 0) {
    // Skala ke 9 bila parsial agar label tetap informatif.
    const scaled = evaluable === 9 ? score : (score / evaluable) * 9
    if (scaled >= 8) {
      label = 'Fundamental Sangat Kuat'
      grade = 'healthy'
    } else if (scaled >= 5) {
      label = 'Cukup Sehat'
      grade = 'watch'
    } else {
      label = 'Lemah'
      grade = 'risk'
    }
  }
  return { criteria, score, evaluable, label, grade }
}

// ---------------------------------------------------------------------
//  Rasio standar
// ---------------------------------------------------------------------

export function calcRatioCategories(d: DerivedStatement, inp: FinancialInputs): RatioCategory[] {
  const i = inp.income
  const b = inp.balance

  const roe = ratio(d.labaBersih, d.totalEkuitas) * 100
  const roa = ratio(d.labaBersih, d.totalAset) * 100
  const npm = ratio(d.labaBersih, i.pendapatan) * 100
  const gpm = ratio(d.labaKotor, i.pendapatan) * 100
  const opm = ratio(d.ebit, i.pendapatan) * 100

  const currentRatio = ratio(d.totalAsetLancar, d.totalLiabilitasLancar)
  const quickRatio = ratio(d.totalAsetLancar - (ok(b.persediaan) ? b.persediaan : 0), d.totalLiabilitasLancar)
  const cashRatio = ratio(b.kas, d.totalLiabilitasLancar)

  const der = ratio(d.utangBerbunga, d.totalEkuitas)
  const dar = ratio(d.totalLiabilitas, d.totalAset)
  const icr = ratio(d.ebit, i.bebanBunga)

  const ato = ratio(i.pendapatan, d.totalAset)
  const invTurn = ratio(i.hpp, b.persediaan)

  return [
    {
      key: 'profitabilitas',
      title: 'Profitabilitas',
      ratios: [
        { key: 'roe', name: 'ROE', value: roe, unit: '%', formula: 'Laba Bersih / Total Ekuitas', health: classifyHigher(roe, 15, 5), source: PERF_SOURCES.roe },
        { key: 'roa', name: 'ROA', value: roa, unit: '%', formula: 'Laba Bersih / Total Aset', health: classifyHigher(roa, 5, 2), source: PERF_SOURCES.roa },
        { key: 'npm', name: 'Net Profit Margin', value: npm, unit: '%', formula: 'Laba Bersih / Pendapatan', health: classifyHigher(npm, 10, 5), source: PERF_SOURCES.margin },
        { key: 'gpm', name: 'Gross Margin', value: gpm, unit: '%', formula: 'Laba Kotor / Pendapatan', health: classifyHigher(gpm, 40, 20), source: PERF_SOURCES.margin },
        { key: 'opm', name: 'Operating Margin', value: opm, unit: '%', formula: 'EBIT / Pendapatan', health: classifyHigher(opm, 15, 5), source: PERF_SOURCES.margin },
      ],
    },
    {
      key: 'likuiditas',
      title: 'Likuiditas',
      ratios: [
        { key: 'current', name: 'Current Ratio', value: currentRatio, unit: '×', formula: 'Aktiva Lancar / Liabilitas Lancar', health: classifyHigher(currentRatio, 2, 1), source: PERF_SOURCES.currentRatio },
        { key: 'quick', name: 'Quick Ratio', value: quickRatio, unit: '×', formula: '(Aktiva Lancar − Persediaan) / Liabilitas Lancar', health: classifyHigher(quickRatio, 1, 0.5), source: PERF_SOURCES.quickRatio },
        { key: 'cash', name: 'Cash Ratio', value: cashRatio, unit: '×', formula: 'Kas & Setara Kas / Liabilitas Lancar', health: classifyHigher(cashRatio, 0.5, 0.2), source: PERF_SOURCES.cashRatio },
      ],
    },
    {
      key: 'solvabilitas',
      title: 'Solvabilitas',
      ratios: [
        { key: 'der', name: 'Debt to Equity (DER)', value: der, unit: '×', formula: 'Utang Berbunga / Total Ekuitas', health: classifyLower(der, 1, 2), source: PERF_SOURCES.der },
        { key: 'dar', name: 'Debt to Asset', value: dar, unit: '×', formula: 'Total Liabilitas / Total Aset', health: classifyLower(dar, 0.5, 0.7), source: PERF_SOURCES.dar },
        { key: 'icr', name: 'Interest Coverage', value: icr, unit: '×', formula: 'EBIT / Beban Bunga', health: classifyHigher(icr, 3, 1.5), source: PERF_SOURCES.icr },
      ],
    },
    {
      key: 'efisiensi',
      title: 'Efisiensi',
      ratios: [
        { key: 'ato', name: 'Asset Turnover', value: ato, unit: '×', formula: 'Pendapatan / Total Aset', health: classifyHigher(ato, 1, 0.5), source: PERF_SOURCES.turnover },
        { key: 'inv', name: 'Inventory Turnover', value: invTurn, unit: '×', formula: 'HPP / Persediaan', health: classifyHigher(invTurn, 6, 3), source: PERF_SOURCES.inventory },
      ],
    },
  ]
}

// ---------------------------------------------------------------------
//  Pipeline
// ---------------------------------------------------------------------

export type PerformanceResult = {
  dupont: DuPontResult
  altman: AltmanResult
  piotroski: PiotroskiResult
  categories: RatioCategory[]
  hasData: boolean
}

export function runPerformance(inp: FinancialInputs): PerformanceResult {
  const d = deriveStatement(inp)
  const dupont = calcDuPont(d, inp.income.pendapatan)
  const altman = calcAltmanZ(d, inp.income.pendapatan, inp.balance.saldoLaba)
  const piotroski = calcPiotroski(d, inp, inp.prior)
  const categories = calcRatioCategories(d, inp)
  const hasData =
    categories.some((c) => c.ratios.some((r) => ok(r.value))) ||
    ok(dupont.roe) ||
    ok(altman.z) ||
    piotroski.evaluable > 0
  return { dupont, altman, piotroski, categories, hasData }
}
