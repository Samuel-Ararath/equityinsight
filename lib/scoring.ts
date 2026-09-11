import { ALTMAN_ZONE_LABEL, piotroskiVerdict, type PerformanceResult } from '@/lib/performance'
import type { ValuationResult } from '@/lib/valuation'

// =====================================================================
//  COMPOSITE SCORING (SAHAM)
//  Blends the three analytical dimensions into normalized 0–100 scores,
//  following the Graham & Dodd (Security Analysis) separation of business
//  quality from investment attractiveness at the current price.
// =====================================================================

const ok = (n: number) => Number.isFinite(n)
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))

export type DimensionScore = {
  key: 'health' | 'profitability' | 'valuation'
  label: string
  score: number // 0..100, NaN when not computable
}

export type CompositeResult = {
  dimensions: DimensionScore[]
  composite: number // average of computable dimensions
  narrative: string
}

/** Map an Altman Z-Score onto 0–100 (linear between z=1 and z=4). */
function altmanScore(z: number): number {
  if (!ok(z)) return NaN
  return clamp(((z - 1) / 3) * 100)
}

/** Map a margin of safety (%) onto 0–100: 0% MoS → 50, +50% → 100, −50% → 0. */
function valuationScore(mos: number): number {
  if (!ok(mos)) return NaN
  return clamp(50 + mos)
}

export function runComposite(
  valuation: ValuationResult,
  performance: PerformanceResult,
): CompositeResult {
  const { altman, piotroski, dupont } = performance

  // ---- Business health: Altman + Piotroski, normalized and averaged ----
  const aScore = altmanScore(altman.z)
  const pScore = ok(piotroski.score) ? (piotroski.score / 9) * 100 : NaN
  const healthParts = [aScore, pScore].filter(ok)
  const health = healthParts.length ? healthParts.reduce((a, b) => a + b, 0) / healthParts.length : NaN

  // ---- Profitability: DuPont ROE scaled (25% ROE ≈ 100) ----
  const profitability = ok(dupont.roe) ? clamp((dupont.roe / 25) * 100) : NaN

  // ---- Valuation: from margin of safety ----
  const valuationDim = valuationScore(valuation.marginOfSafety)

  const dimensions: DimensionScore[] = [
    { key: 'health', label: 'Kesehatan Bisnis', score: health },
    { key: 'profitability', label: 'Profitabilitas', score: profitability },
    { key: 'valuation', label: 'Valuasi', score: valuationDim },
  ]

  const computable = dimensions.map((x) => x.score).filter(ok)
  const composite = computable.length ? computable.reduce((a, b) => a + b, 0) / computable.length : NaN

  return {
    dimensions,
    composite,
    narrative: buildNarrative(valuation, performance),
  }
}

/**
 * Produce a short qualitative narrative that explains the numbers rather
 * than just labeling them, in the spirit of a Security Analysis write-up.
 */
function buildNarrative(valuation: ValuationResult, performance: PerformanceResult): string {
  const { altman, piotroski } = performance
  const parts: string[] = []

  // Fundamentals sentence.
  if (ok(piotroski.score) && altman.zone) {
    const strength =
      piotroski.score >= 7 ? 'fundamental kuat' : piotroski.score >= 5 ? 'fundamental cukup sehat' : 'fundamental lemah'
    parts.push(
      `Saham ini menunjukkan ${strength} (F-Score ${piotroski.score}/9 — ${piotroskiVerdict(
        piotroski.score,
      )}, Z-Score di ${ALTMAN_ZONE_LABEL[altman.zone]})`,
    )
  } else if (altman.zone) {
    parts.push(`Analisis risiko menempatkan emiten pada ${ALTMAN_ZONE_LABEL[altman.zone]}`)
  } else if (ok(piotroski.score)) {
    parts.push(`Skor fundamental Piotroski ${piotroski.score}/9 (${piotroskiVerdict(piotroski.score)})`)
  }

  // Valuation sentence.
  if (valuation.verdict && ok(valuation.marginOfSafety)) {
    const mos = valuation.marginOfSafety
    let valClause: string
    if (valuation.verdict === 'UNDERVALUED')
      valClause = `dan saat ini diperdagangkan di bawah nilai wajarnya dengan margin of safety ${mos.toFixed(
        1,
      )}%, memberi ruang aman bagi investor konservatif`
    else if (valuation.verdict === 'FAIR VALUE')
      valClause = `namun saat ini diperdagangkan mendekati nilai wajarnya (MoS ${mos.toFixed(
        1,
      )}%), sehingga margin keamanan relatif tipis`
    else
      valClause = `namun harga saat ini berada di atas estimasi nilai wajar (MoS ${mos.toFixed(
        1,
      )}%), sehingga kurang menarik pada level ini`
    parts.push((parts.length ? ' ' : '') + valClause)
  } else {
    parts.push(
      (parts.length ? ' ' : '') +
        'Estimasi nilai wajar belum dapat dihitung — lengkapi data arus kas, harga, dan asumsi valuasi',
    )
  }

  if (parts.length === 0) return 'Lengkapi data laporan keuangan untuk menghasilkan rekomendasi naratif.'
  return parts.join('') + '.'
}

/** Color token for a 0–100 score. */
export function scoreColor(score: number): string {
  if (!ok(score)) return 'var(--muted-foreground)'
  if (score >= 66) return 'var(--positive)'
  if (score >= 40) return 'var(--warning)'
  return 'var(--negative)'
}
