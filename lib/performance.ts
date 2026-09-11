import { computeDerived, type Derived, type FinancialModel } from '@/lib/types'

// =====================================================================
//  PERFORMANCE (KINERJA) ENGINE
//  Business-health analytics only — never references share price except
//  where a model formally requires market value of equity (Altman X4).
//  Each function documents its academic source.
// =====================================================================

const ok = (n: number) => Number.isFinite(n)
function ratio(a: number, b: number): number {
  if (!ok(a) || !ok(b) || b === 0) return NaN
  return a / b
}

export type Health = 'healthy' | 'watch' | 'risk'

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

// ---------------------------------------------------------------------
//  DuPont Analysis — 3-step decomposition of ROE
//  Source: DuPont Corporation system of financial analysis (1920s).
// ---------------------------------------------------------------------

export type DuPontResult = {
  netProfitMargin: number // %
  assetTurnover: number // ×
  equityMultiplier: number // ×
  roe: number // %
}

/** ROE = Net Profit Margin × Asset Turnover × Equity Multiplier. */
export function calcDuPont(d: Derived): DuPontResult {
  const netProfitMargin = ratio(d.labaBersih, d.pendapatan) * 100
  const assetTurnover = ratio(d.pendapatan, d.totalAset)
  const equityMultiplier = ratio(d.totalAset, d.totalEkuitas)
  const roe =
    ok(netProfitMargin) && ok(assetTurnover) && ok(equityMultiplier)
      ? (netProfitMargin / 100) * assetTurnover * equityMultiplier * 100
      : NaN
  return { netProfitMargin, assetTurnover, equityMultiplier, roe }
}

// ---------------------------------------------------------------------
//  Altman Z-Score — bankruptcy risk
//  Source: Edward Altman (1968), original manufacturing model.
// ---------------------------------------------------------------------

export type AltmanResult = {
  x1: number
  x2: number
  x3: number
  x4: number
  x5: number
  z: number
  zone: 'safe' | 'grey' | 'distress' | null
}

/**
 * Z = 1.2·X1 + 1.4·X2 + 3.3·X3 + 0.6·X4 + 1.0·X5, where
 *  X1 = Modal Kerja / Total Aset
 *  X2 = Saldo Laba / Total Aset
 *  X3 = EBIT / Total Aset
 *  X4 = Nilai Pasar Ekuitas / Total Liabilitas
 *  X5 = Pendapatan / Total Aset
 * Interpretation: Z > 2.99 safe, 1.81–2.99 grey, < 1.81 distress.
 */
export function calcAltman(m: FinancialModel, d: Derived): AltmanResult {
  const workingCapital =
    ok(d.totalAktivaLancar) && ok(d.totalLiabilitasLancar)
      ? d.totalAktivaLancar - d.totalLiabilitasLancar
      : NaN
  const saldoLaba = m.balance.saldoLaba
  const marketCap =
    ok(m.market.hargaSaham) && ok(d.sahamBeredar) ? m.market.hargaSaham * d.sahamBeredar : NaN

  const x1 = ratio(workingCapital, d.totalAset)
  const x2 = ratio(saldoLaba, d.totalAset)
  const x3 = ratio(d.ebit, d.totalAset)
  const x4 = ratio(marketCap, d.totalLiabilitas)
  const x5 = ratio(d.pendapatan, d.totalAset)

  const z =
    ok(x1) && ok(x2) && ok(x3) && ok(x4) && ok(x5)
      ? 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5
      : NaN

  let zone: AltmanResult['zone'] = null
  if (ok(z)) {
    if (z > 2.99) zone = 'safe'
    else if (z >= 1.81) zone = 'grey'
    else zone = 'distress'
  }

  return { x1, x2, x3, x4, x5, z, zone }
}

export const ALTMAN_ZONE_LABEL: Record<NonNullable<AltmanResult['zone']>, string> = {
  safe: 'Zona Aman',
  grey: 'Zona Abu-abu',
  distress: 'Zona Distress',
}

// ---------------------------------------------------------------------
//  Piotroski F-Score — fundamental strength (0–9)
//  Source: Joseph Piotroski (2000), "Value Investing: The Use of Historical
//  Financial Statement Information..."
// ---------------------------------------------------------------------

export type PiotroskiSignal = {
  key: string
  label: string
  status: 'pass' | 'fail' | 'unknown'
  detail: string
}

export type PiotroskiResult = {
  signals: PiotroskiSignal[]
  score: number // number passing
  computable: number // number that could be evaluated
}

/**
 * Nine binary signals across profitability, leverage/liquidity, and
 * operating efficiency. Signals needing a prior period return "unknown"
 * (score parsial) until comparison data is supplied.
 */
export function calcPiotroski(m: FinancialModel, d: Derived): PiotroskiResult {
  const p = m.prior
  const roa = ratio(d.labaBersih, d.totalAset)
  const roaLalu =
    ok(p.labaBersihLalu) && ok(p.totalAsetLalu) ? ratio(p.labaBersihLalu, p.totalAsetLalu) : NaN
  const cfo = d.arusKasOperasi
  const leverage = ratio(d.totalLiabilitasJangkaPanjang, d.totalAset)
  const currentRatio = ratio(d.totalAktivaLancar, d.totalLiabilitasLancar)
  const grossMargin = ratio(d.labaKotor, d.pendapatan) * 100
  const assetTurnover = ratio(d.pendapatan, d.totalAset)

  const bin = (cond: boolean): PiotroskiSignal['status'] => (cond ? 'pass' : 'fail')
  const known = (v: number) => ok(v)

  const signals: PiotroskiSignal[] = [
    {
      key: 'roa',
      label: 'ROA positif',
      status: known(roa) ? bin(roa > 0) : 'unknown',
      detail: 'Return on Assets tahun berjalan lebih besar dari nol.',
    },
    {
      key: 'cfo',
      label: 'Arus Kas Operasi positif',
      status: known(cfo) ? bin(cfo > 0) : 'unknown',
      detail: 'Arus kas dari aktivitas operasi bernilai positif.',
    },
    {
      key: 'droa',
      label: 'ROA meningkat (YoY)',
      status: known(roa) && known(roaLalu) ? bin(roa > roaLalu) : 'unknown',
      detail: 'ROA tahun ini lebih tinggi dari tahun lalu. Butuh data pembanding.',
    },
    {
      key: 'accrual',
      label: 'Kualitas laba (CFO > Laba Bersih)',
      status: known(cfo) && known(d.labaBersih) ? bin(cfo > d.labaBersih) : 'unknown',
      detail: 'Arus kas operasi melebihi laba bersih (akrual sehat).',
    },
    {
      key: 'leverage',
      label: 'Leverage menurun (YoY)',
      status: known(leverage) && known(p.leverageLalu) ? bin(leverage < p.leverageLalu) : 'unknown',
      detail: 'Rasio utang jangka panjang / aset turun. Butuh data pembanding.',
    },
    {
      key: 'liquidity',
      label: 'Current Ratio meningkat (YoY)',
      status:
        known(currentRatio) && known(p.currentRatioLalu)
          ? bin(currentRatio > p.currentRatioLalu)
          : 'unknown',
      detail: 'Current ratio tahun ini lebih tinggi dari tahun lalu. Butuh data pembanding.',
    },
    {
      key: 'shares',
      label: 'Tidak ada penerbitan saham baru',
      status:
        known(d.sahamBeredar) && known(p.sahamBeredarLalu)
          ? bin(d.sahamBeredar <= p.sahamBeredarLalu)
          : 'unknown',
      detail: 'Jumlah saham beredar tidak bertambah. Butuh data pembanding.',
    },
    {
      key: 'margin',
      label: 'Gross Margin meningkat (YoY)',
      status:
        known(grossMargin) && known(p.grossMarginLalu)
          ? bin(grossMargin > p.grossMarginLalu)
          : 'unknown',
      detail: 'Marjin laba kotor tahun ini lebih tinggi. Butuh data pembanding.',
    },
    {
      key: 'turnover',
      label: 'Asset Turnover meningkat (YoY)',
      status:
        known(assetTurnover) && known(p.assetTurnoverLalu)
          ? bin(assetTurnover > p.assetTurnoverLalu)
          : 'unknown',
      detail: 'Perputaran aset tahun ini lebih tinggi. Butuh data pembanding.',
    },
  ]

  const score = signals.filter((s) => s.status === 'pass').length
  const computable = signals.filter((s) => s.status !== 'unknown').length
  return { signals, score, computable }
}

export function piotroskiVerdict(score: number): string {
  if (score >= 8) return 'Fundamental Sangat Kuat'
  if (score >= 5) return 'Cukup Sehat'
  return 'Lemah'
}

// ---------------------------------------------------------------------
//  Standard ratios (grouped)
// ---------------------------------------------------------------------

export type RatioResult = {
  key: string
  name: string
  value: number
  unit: '%' | '×'
  health: Health | null
  formula: string
  source: string
}

export type RatioCategory = {
  key: string
  title: string
  ratios: RatioResult[]
}

export function calcRatios(d: Derived): RatioCategory[] {
  const roe = ratio(d.labaBersih, d.totalEkuitas) * 100
  const roa = ratio(d.labaBersih, d.totalAset) * 100
  const npm = ratio(d.labaBersih, d.pendapatan) * 100
  const gpm = ratio(d.labaKotor, d.pendapatan) * 100
  const opm = ratio(d.ebit, d.pendapatan) * 100

  const currentRatio = ratio(d.totalAktivaLancar, d.totalLiabilitasLancar)
  const quickRatio = ratio(
    ok(d.totalAktivaLancar) ? d.totalAktivaLancar - (ok(d.persediaan) ? d.persediaan : 0) : NaN,
    d.totalLiabilitasLancar,
  )
  const cashRatio = ratio(d.kas, d.totalLiabilitasLancar)

  const der = ratio(d.totalLiabilitas, d.totalEkuitas)
  const dar = ratio(d.totalLiabilitas, d.totalAset)
  const icr = ratio(d.ebit, d.bebanBunga)

  const assetTurnover = ratio(d.pendapatan, d.totalAset)
  const cogs = ok(d.pendapatan) && ok(d.labaKotor) ? d.pendapatan - d.labaKotor : NaN
  const inventoryTurnover = ratio(cogs, d.persediaan)

  return [
    {
      key: 'profitabilitas',
      title: 'Profitabilitas',
      ratios: [
        { key: 'roe', name: 'ROE', value: roe, unit: '%', formula: 'Laba Bersih / Total Ekuitas', source: 'Standar analisis rasio; ROE > 15% umumnya baik.', health: classifyHigher(roe, 15, 5) },
        { key: 'roa', name: 'ROA', value: roa, unit: '%', formula: 'Laba Bersih / Total Aset', source: 'ROA > 5% dianggap efisien memakai aset.', health: classifyHigher(roa, 5, 2) },
        { key: 'npm', name: 'Net Profit Margin', value: npm, unit: '%', formula: 'Laba Bersih / Pendapatan', source: 'Marjin bersih; bervariasi per industri.', health: classifyHigher(npm, 10, 5) },
        { key: 'gpm', name: 'Gross Profit Margin', value: gpm, unit: '%', formula: 'Laba Kotor / Pendapatan', source: 'Marjin kotor tinggi menandakan daya harga.', health: classifyHigher(gpm, 40, 20) },
        { key: 'opm', name: 'Operating Margin', value: opm, unit: '%', formula: 'EBIT / Pendapatan', source: 'Marjin usaha inti sebelum bunga & pajak.', health: classifyHigher(opm, 15, 5) },
      ],
    },
    {
      key: 'likuiditas',
      title: 'Likuiditas',
      ratios: [
        { key: 'current', name: 'Current Ratio', value: currentRatio, unit: '×', formula: 'Aktiva Lancar / Liabilitas Lancar', source: 'Current Ratio > 2 dianggap sehat menurut analisis kredit konvensional.', health: classifyHigher(currentRatio, 2, 1) },
        { key: 'quick', name: 'Quick Ratio', value: quickRatio, unit: '×', formula: '(Aktiva Lancar − Persediaan) / Liabilitas Lancar', source: 'Acid-test; > 1 ideal tanpa mengandalkan persediaan.', health: classifyHigher(quickRatio, 1, 0.5) },
        { key: 'cash', name: 'Cash Ratio', value: cashRatio, unit: '×', formula: 'Kas & Setara Kas / Liabilitas Lancar', source: 'Ukuran likuiditas paling konservatif.', health: classifyHigher(cashRatio, 0.5, 0.2) },
      ],
    },
    {
      key: 'solvabilitas',
      title: 'Solvabilitas',
      ratios: [
        { key: 'der', name: 'Debt to Equity (DER)', value: der, unit: '×', formula: 'Total Liabilitas / Total Ekuitas', source: 'DER < 1 umumnya konservatif (di luar sektor perbankan).', health: classifyLower(der, 1, 2) },
        { key: 'dar', name: 'Debt to Asset Ratio', value: dar, unit: '×', formula: 'Total Liabilitas / Total Aset', source: 'Proporsi aset yang dibiayai utang; < 0,5 lebih aman.', health: classifyLower(dar, 0.5, 0.7) },
        { key: 'icr', name: 'Interest Coverage', value: icr, unit: '×', formula: 'EBIT / Beban Bunga', source: 'ICR > 3 dianggap aman melayani bunga.', health: classifyHigher(icr, 3, 1.5) },
      ],
    },
    {
      key: 'efisiensi',
      title: 'Efisiensi',
      ratios: [
        { key: 'ato', name: 'Asset Turnover', value: assetTurnover, unit: '×', formula: 'Pendapatan / Total Aset', source: 'Efektivitas aset menghasilkan penjualan.', health: classifyHigher(assetTurnover, 1, 0.5) },
        { key: 'ito', name: 'Inventory Turnover', value: inventoryTurnover, unit: '×', formula: 'HPP / Persediaan', source: 'Perputaran persediaan; makin tinggi makin efisien.', health: classifyHigher(inventoryTurnover, 4, 2) },
      ],
    },
  ]
}

export const HEALTH_LABEL: Record<Health, string> = {
  healthy: 'Sehat',
  watch: 'Perlu Perhatian',
  risk: 'Berisiko',
}

// ---------------------------------------------------------------------
//  Full pipeline
// ---------------------------------------------------------------------

export type PerformanceResult = {
  dupont: DuPontResult
  altman: AltmanResult
  piotroski: PiotroskiResult
  ratios: RatioCategory[]
}

export function runPerformance(m: FinancialModel, derived?: Derived): PerformanceResult {
  const d = derived ?? computeDerived(m)
  return {
    dupont: calcDuPont(d),
    altman: calcAltman(m, d),
    piotroski: calcPiotroski(m, d),
    ratios: calcRatios(d),
  }
}
