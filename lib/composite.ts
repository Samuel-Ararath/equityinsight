import type { FinancialInputs } from '@/lib/types'
import { ok } from '@/lib/statements'
import { ALTMAN_ZONE_LABEL, type PerformanceResult } from '@/lib/performance'
import type { ValuationResult } from '@/lib/valuation'

// =====================================================================
//  COMPOSITE SCORE (Analisis Saham)
//  Mengikuti pemisahan Graham & Dodd (Security Analysis, 1934) antara
//  "analisis bisnis" dan "kelayakan investasi pada harga saat ini".
// =====================================================================

export const COMPOSITE_SOURCES = {
  framework:
    'Pemisahan analisis bisnis vs. kelayakan harga — Benjamin Graham & David Dodd, Security Analysis (1934).',
  health: 'Dimensi kesehatan: normalisasi Altman Z (1968) & Piotroski F (2000) ke skala 0–100.',
  profitability: 'Dimensi profitabilitas: ROE DuPont dibanding rerata sektor bila tersedia; jika tidak, ambang 15% (Buffett).',
  valuation: 'Dimensi valuasi: Margin of Safety (Graham & Dodd) dipetakan −30% → 0 dan +50% → 100.',
} as const

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v))

export type Dimension = {
  key: 'health' | 'profitability' | 'valuation'
  label: string
  score: number
  detail: string
  source: string
}

/**
 * Altman Z 0→0, 4→100 (linier; 1,81 ≈ 45, 2,99 ≈ 75).
 * Piotroski: skor / kriteria terhitung × 100.
 */
export function scoreHealth(perf: PerformanceResult): { score: number; detail: string } {
  const parts: number[] = []
  const notes: string[] = []
  if (ok(perf.altman.z)) {
    parts.push(clamp((perf.altman.z / 4) * 100))
    notes.push(`Z ${perf.altman.z.toFixed(2)} (${perf.altman.zone ? ALTMAN_ZONE_LABEL[perf.altman.zone] : '—'})`)
  }
  if (perf.piotroski.evaluable > 0) {
    parts.push((perf.piotroski.score / perf.piotroski.evaluable) * 100)
    notes.push(`F ${perf.piotroski.score}/${perf.piotroski.evaluable}`)
  }
  if (!parts.length) return { score: NaN, detail: 'Perlu data neraca & laba rugi' }
  return { score: parts.reduce((s, v) => s + v, 0) / parts.length, detail: notes.join(' · ') }
}

/**
 * Dengan ROE sektor: 50 pada paritas, ±50 per ±100% deviasi relatif.
 * Tanpa sektor: ROE 0% → 0, 25% → 100.
 */
export function scoreProfitability(
  perf: PerformanceResult,
  roeSektorPct: number,
): { score: number; detail: string } {
  const roe = perf.dupont.roe
  if (!ok(roe)) return { score: NaN, detail: 'Perlu laba bersih, pendapatan, aset & ekuitas' }
  const roePct = roe * 100
  if (ok(roeSektorPct) && roeSektorPct > 0) {
    const rel = (roePct - roeSektorPct) / roeSektorPct
    return {
      score: clamp(50 + rel * 50),
      detail: `ROE ${roePct.toFixed(1)}% vs sektor ${roeSektorPct.toFixed(1)}%`,
    }
  }
  return { score: clamp((roePct / 25) * 100), detail: `ROE ${roePct.toFixed(1)}% (ambang 15%)` }
}

/** MoS −30% → 0, +50% → 100. */
export function scoreValuation(val: ValuationResult): { score: number; detail: string } {
  const mos = val.marginOfSafety
  if (!ok(mos)) return { score: NaN, detail: 'Perlu harga saham & minimal satu nilai wajar' }
  return { score: clamp(((mos + 30) / 80) * 100), detail: `MoS ${mos >= 0 ? '+' : ''}${mos.toFixed(1)}%` }
}

export type CompositeResult = {
  dimensions: Dimension[]
  composite: number
  grade: 'strong' | 'moderate' | 'weak' | null
  narrative: string
  headline: string
}

export function runComposite(
  inp: FinancialInputs,
  val: ValuationResult,
  perf: PerformanceResult,
): CompositeResult {
  const h = scoreHealth(perf)
  const p = scoreProfitability(perf, inp.market.roeSektor)
  const v = scoreValuation(val)

  const dimensions: Dimension[] = [
    { key: 'health', label: 'Kesehatan Bisnis', score: h.score, detail: h.detail, source: COMPOSITE_SOURCES.health },
    { key: 'profitability', label: 'Profitabilitas', score: p.score, detail: p.detail, source: COMPOSITE_SOURCES.profitability },
    { key: 'valuation', label: 'Valuasi', score: v.score, detail: v.detail, source: COMPOSITE_SOURCES.valuation },
  ]
  const available = dimensions.filter((d) => ok(d.score))
  const composite = available.length
    ? available.reduce((s, d) => s + d.score, 0) / available.length
    : NaN

  let grade: CompositeResult['grade'] = null
  if (ok(composite)) grade = composite >= 70 ? 'strong' : composite >= 45 ? 'moderate' : 'weak'

  return { dimensions, composite, grade, ...buildNarrative(inp, val, perf, h.score, v.score) }
}

function buildNarrative(
  inp: FinancialInputs,
  val: ValuationResult,
  perf: PerformanceResult,
  healthScore: number,
  valuationScore: number,
): { headline: string; narrative: string } {
  const nama = inp.identity.nama || 'Emiten ini'
  const parts: string[] = []

  // Fundamental
  const fBits: string[] = []
  if (perf.piotroski.evaluable > 0)
    fBits.push(`F-Score ${perf.piotroski.score}/${perf.piotroski.evaluable}`)
  if (perf.altman.zone) fBits.push(`Z-Score di ${ALTMAN_ZONE_LABEL[perf.altman.zone]}`)
  if (ok(perf.dupont.roe)) fBits.push(`ROE ${(perf.dupont.roe * 100).toFixed(1)}%`)

  if (fBits.length) {
    const tone = !ok(healthScore)
      ? 'fundamental'
      : healthScore >= 70
        ? 'fundamental kuat'
        : healthScore >= 45
          ? 'fundamental moderat'
          : 'fundamental lemah'
    parts.push(`${nama} menunjukkan ${tone} (${fBits.join(', ')})`)
  }

  // Valuasi
  const mos = val.marginOfSafety
  if (ok(mos)) {
    const mosTxt = `MoS ${mos >= 0 ? '+' : ''}${mos.toFixed(1)}%`
    let vTxt: string
    if (mos > 30)
      vTxt = `dan saat ini diperdagangkan jauh di bawah estimasi nilai wajar (${mosTxt}), memberi margin keamanan yang lega bagi investor konservatif`
    else if (mos >= 10)
      vTxt = `namun saat ini diperdagangkan mendekati nilai wajarnya (${mosTxt}), sehingga margin keamanan tipis bagi investor konservatif`
    else if (mos >= 0)
      vTxt = `namun harga saat ini nyaris setara nilai wajar (${mosTxt}); tidak ada bantalan bila estimasi meleset`
    else
      vTxt = `namun harga saat ini melampaui estimasi nilai wajar (${mosTxt}), sehingga secara Graham & Dodd belum layak beli`
    parts.push(parts.length ? vTxt : `${nama} ${vTxt.replace(/^(dan|namun) /, '')}`)
  }

  if (val.mode === 'preProfit')
    parts.push(
      'Karena perusahaan berstatus pra-profitabilitas, nilai wajar bertumpu pada Real Options dan multiple sektor, bukan DCF/DDM',
    )

  if (!parts.length)
    return {
      headline: 'Menunggu data',
      narrative: 'Isi laporan keuangan dan harga saham untuk mendapatkan rekomendasi kualitatif.',
    }

  let headline = 'Netral — pantau'
  if (ok(healthScore) && ok(valuationScore)) {
    if (healthScore >= 60 && valuationScore >= 65) headline = 'Menarik — kandidat akumulasi'
    else if (healthScore < 45 && valuationScore < 45) headline = 'Hindari — fundamental lemah & mahal'
    else if (healthScore >= 60 && valuationScore < 45) headline = 'Bisnis bagus, harga mahal — tunggu koreksi'
    else if (healthScore < 45 && valuationScore >= 65) headline = 'Murah karena alasan — value trap potensial'
  } else if (ok(healthScore)) {
    headline = healthScore >= 60 ? 'Bisnis sehat — lengkapi harga untuk valuasi' : 'Bisnis perlu perhatian'
  } else if (ok(valuationScore)) {
    headline = valuationScore >= 65 ? 'Diskon terlihat — verifikasi kesehatan bisnis' : 'Belum ada diskon'
  }

  return { headline, narrative: parts.join('. ') + '.' }
}
