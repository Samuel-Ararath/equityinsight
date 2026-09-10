// Formatting helpers for Indonesian Rupiah and numbers.

const idNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const idDecimal = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Parse a user-typed string into a number. Empty/invalid becomes NaN. */
export function parseNumberInput(value: string): number {
  if (value == null) return NaN
  // Allow the user to type thousand separators and spaces.
  const cleaned = value.replace(/[.\s]/g, '').replace(/,/g, '.').trim()
  if (cleaned === '') return NaN
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

/** Full Rupiah format with thousand separators, e.g. "Rp1.250.000". */
export function formatRupiah(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value < 0 ? '-' : ''
  return `${sign}Rp${idNumber.format(Math.abs(Math.round(value)))}`
}

/** Compact Rupiah for big figures, e.g. "Rp1,25 T". */
export function formatRupiahShort(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}Rp${idDecimal.format(abs / 1e12)} T`
  if (abs >= 1e9) return `${sign}Rp${idDecimal.format(abs / 1e9)} M`
  if (abs >= 1e6) return `${sign}Rp${idDecimal.format(abs / 1e6)} Jt`
  return formatRupiah(value)
}

/** Plain number with thousand separators. */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Percentage with sign, e.g. "+32,4%". */
export function formatPercent(value: number, decimals = 1, withSign = false): string {
  if (!Number.isFinite(value)) return '—'
  const sign = withSign && value > 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`
}

/** Ratio value with 2 decimals, e.g. "1,45×". */
export function formatRatio(value: number, suffix = '×'): string {
  if (!Number.isFinite(value)) return '—'
  return `${idDecimal.format(value)}${suffix}`
}
