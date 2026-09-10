import type { FinancialData } from '@/lib/types'

// =====================================================================
//  PERFORMANCE (KINERJA) ENGINE
//  Financial ratios + rule-of-thumb health classification.
//  Thresholds are grouped at the top so they are easy to adjust.
// =====================================================================

export type Health = 'healthy' | 'watch' | 'risk'

export type RatioResult = {
  key: string
  name: string
  value: number
  unit: '%' | '×'
  health: Health | null
  formula: string
}

export type RatioCategory = {
  key: string
  title: string
  ratios: RatioResult[]
}

const ok = (n: number) => Number.isFinite(n)

/**
 * Classify a "higher is better" ratio.
 * value >= good -> healthy, >= warn -> watch, else risk.
 */
function classifyHigher(value: number, good: number, warn: number): Health | null {
  if (!ok(value)) return null
  if (value >= good) return 'healthy'
  if (value >= warn) return 'watch'
  return 'risk'
}

/**
 * Classify a "lower is better" ratio (e.g. DER).
 * value <= good -> healthy, <= warn -> watch, else risk.
 */
function classifyLower(value: number, good: number, warn: number): Health | null {
  if (!ok(value)) return null
  if (value <= good) return 'healthy'
  if (value <= warn) return 'watch'
  return 'risk'
}

function ratio(a: number, b: number): number {
  if (!ok(a) || !ok(b) || b === 0) return NaN
  return a / b
}

export function runPerformance(f: FinancialData): RatioCategory[] {
  // ---- Profitabilitas ----
  const roe = ratio(f.labaBersih, f.totalEkuitas) * 100 // ROE = Laba Bersih / Ekuitas
  const roa = ratio(f.labaBersih, f.totalAset) * 100 // ROA = Laba Bersih / Total Aset
  // ROI ≈ return on invested capital = Laba Bersih / (Ekuitas + Utang)
  const roi = ratio(f.labaBersih, f.totalEkuitas + f.totalUtang) * 100
  const npm = ratio(f.labaBersih, f.pendapatan) * 100 // Net Profit Margin
  const gpm = ratio(f.labaKotor, f.pendapatan) * 100 // Gross Profit Margin
  const opm = ratio(f.labaOperasi, f.pendapatan) * 100 // Operating Margin

  // ---- Solvabilitas & Likuiditas ----
  const der = ratio(f.totalUtang, f.totalEkuitas) // Debt to Equity
  const currentRatio = ratio(f.asetLancar, f.liabilitasLancar) // Aset Lancar / Liabilitas Lancar
  const quickRatio = ratio(f.asetLancar - f.persediaan, f.liabilitasLancar) // (AL - Persediaan) / LL
  const interestCoverage = ratio(f.labaOperasi, f.bebanBunga) // Laba Operasi / Beban Bunga

  // ---- Efisiensi ----
  const assetTurnover = ratio(f.pendapatan, f.totalAset) // Pendapatan / Total Aset

  return [
    {
      key: 'profitabilitas',
      title: 'Profitabilitas',
      ratios: [
        { key: 'roe', name: 'ROE', value: roe, unit: '%', formula: 'Laba Bersih / Total Ekuitas', health: classifyHigher(roe, 15, 5) },
        { key: 'roa', name: 'ROA', value: roa, unit: '%', formula: 'Laba Bersih / Total Aset', health: classifyHigher(roa, 5, 2) },
        { key: 'roi', name: 'ROI', value: roi, unit: '%', formula: 'Laba Bersih / (Ekuitas + Utang)', health: classifyHigher(roi, 10, 5) },
        { key: 'npm', name: 'Net Profit Margin', value: npm, unit: '%', formula: 'Laba Bersih / Pendapatan', health: classifyHigher(npm, 10, 5) },
        { key: 'gpm', name: 'Gross Profit Margin', value: gpm, unit: '%', formula: 'Laba Kotor / Pendapatan', health: classifyHigher(gpm, 40, 20) },
        { key: 'opm', name: 'Operating Margin', value: opm, unit: '%', formula: 'Laba Operasi / Pendapatan', health: classifyHigher(opm, 15, 5) },
      ],
    },
    {
      key: 'solvabilitas',
      title: 'Solvabilitas & Likuiditas',
      ratios: [
        { key: 'der', name: 'Debt to Equity (DER)', value: der, unit: '×', formula: 'Total Utang / Total Ekuitas', health: classifyLower(der, 1, 2) },
        { key: 'current', name: 'Current Ratio', value: currentRatio, unit: '×', formula: 'Aset Lancar / Liabilitas Lancar', health: classifyHigher(currentRatio, 2, 1) },
        { key: 'quick', name: 'Quick Ratio', value: quickRatio, unit: '×', formula: '(Aset Lancar − Persediaan) / Liabilitas Lancar', health: classifyHigher(quickRatio, 1, 0.5) },
        { key: 'icr', name: 'Interest Coverage', value: interestCoverage, unit: '×', formula: 'Laba Operasi / Beban Bunga', health: classifyHigher(interestCoverage, 3, 1.5) },
      ],
    },
    {
      key: 'efisiensi',
      title: 'Efisiensi',
      ratios: [
        { key: 'ato', name: 'Asset Turnover', value: assetTurnover, unit: '×', formula: 'Pendapatan / Total Aset', health: classifyHigher(assetTurnover, 1, 0.5) },
      ],
    },
  ]
}

export const HEALTH_LABEL: Record<Health, string> = {
  healthy: 'Sehat',
  watch: 'Perlu Perhatian',
  risk: 'Berisiko',
}
