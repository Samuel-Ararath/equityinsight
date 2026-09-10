'use client'

import { formatPercent } from '@/lib/format'
import type { ValuationResult } from '@/lib/valuation'

// Circular gauge for Margin of Safety.
// Color rule: green > 30%, amber 10-30%, red < 10% or negative.
function marginColor(margin: number): string {
  if (!Number.isFinite(margin)) return 'var(--muted-foreground)'
  if (margin > 30) return 'var(--positive)'
  if (margin >= 10) return 'var(--warning)'
  return 'var(--negative)'
}

export function MarginGauge({ result }: { result: ValuationResult }) {
  const margin = result.marginOfSafety
  const has = Number.isFinite(margin)
  const color = marginColor(margin)

  const size = 200
  const stroke = 16
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // Fill the arc proportionally to a 0-100% margin scale (clamped).
  const fraction = has ? Math.max(0, Math.min(margin, 100)) / 100 : 0
  const dash = circumference * fraction

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap={fraction > 0 ? 'round' : 'butt'}
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">Margin of Safety</span>
        <span
          className="font-serif text-4xl font-semibold tabular-nums"
          style={{ color: has ? color : 'var(--muted-foreground)' }}
        >
          {has ? formatPercent(margin, 1, true) : '—'}
        </span>
      </div>
    </div>
  )
}

export { marginColor }
