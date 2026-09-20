'use client'

import { Coins, Gauge, LineChart, Scale, Sparkles, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarginGauge, marginColor } from '@/components/valuation/margin-gauge'
import { formatPercent, formatRupiah, formatRupiahShort } from '@/lib/format'
import { upsideVsPrice, type ValuationResult } from '@/lib/valuation'
import type { FinancialData } from '@/lib/types'
import { cn } from '@/lib/utils'

/** A big-number result value with an optional upside-vs-price line. */
function ValueLine({
  label,
  value,
  price,
  short = false,
}: {
  label: string
  value: number
  price?: number
  short?: boolean
}) {
  const upside = price !== undefined ? upsideVsPrice(value, price) : NaN
  const has = Number.isFinite(value)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-serif text-2xl font-semibold text-foreground tabular-nums">
        {has ? (short ? formatRupiahShort(value) : formatRupiah(value)) : '—'}
      </span>
      {Number.isFinite(upside) && (
        <span
          className={cn(
            'text-xs font-medium tabular-nums',
            upside >= 0 ? 'text-positive' : 'text-negative',
          )}
        >
          {formatPercent(upside, 1, true)} vs harga saat ini
        </span>
      )}
    </div>
  )
}

function ResultCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-gold/10 text-gold">
          <Icon className="size-4" />
        </span>
        <CardTitle className="text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
    </Card>
  )
}

const VERDICT_COPY: Record<NonNullable<ValuationResult['verdict']>, string> = {
  UNDERVALUED: 'Harga saat ini di bawah estimasi nilai wajar — potensi diskon.',
  'FAIR VALUE': 'Harga saat ini mendekati estimasi nilai wajar.',
  OVERVALUED: 'Harga saat ini di atas estimasi nilai wajar — margin tipis.',
}

export function ValuationResults({
  result,
  financials,
}: {
  result: ValuationResult
  financials: FinancialData
}) {
  const price = financials.hargaSaham
  const hasAnything = result.fairValues.length > 0 || Number.isFinite(result.eps)
  const color = marginColor(result.marginOfSafety)

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Margin of Safety summary (most prominent) ---- */}
      <Card className="overflow-hidden border-gold/25">
        <div className="flex flex-col items-center gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-7">
          <MarginGauge result={result} />
          <div className="flex flex-1 flex-col items-center gap-3 text-center md:items-start md:text-left">
            {result.verdict ? (
              <>
                <Badge
                  variant={
                    result.verdict === 'UNDERVALUED'
                      ? 'positive'
                      : result.verdict === 'FAIR VALUE'
                        ? 'warning'
                        : 'negative'
                  }
                  className="text-xs"
                >
                  Kesimpulan
                </Badge>
                <span
                  className="font-serif text-3xl font-bold tracking-tight text-balance break-words md:text-4xl"
                  style={{ color }}
                >
                  {result.verdict}
                </span>
                <p className="max-w-md text-sm text-muted-foreground">
                  {VERDICT_COPY[result.verdict]}
                </p>
              </>
            ) : (
              <>
                <span className="font-serif text-3xl font-semibold text-muted-foreground">
                  Menunggu Data
                </span>
                <p className="max-w-md text-sm text-muted-foreground">
                  Isi laba bersih, jumlah saham, dan harga saham untuk mulai menghitung margin of
                  safety.
                </p>
              </>
            )}
            <div className="mt-2 grid w-full grid-cols-2 gap-3 border-t border-border pt-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Rata-rata Harga Wajar</span>
                <span className="font-serif text-lg font-semibold text-gold tabular-nums">
                  {formatRupiah(result.averageFairValue)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Harga Saat Ini</span>
                <span className="font-serif text-lg font-semibold text-foreground tabular-nums">
                  {formatRupiah(price)}
                </span>
              </div>
            </div>
            {result.fairValues.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Rata-rata dari {result.fairValues.length} metode:{' '}
                {result.fairValues.map((f) => f.label).join(', ')}.
              </p>
            )}
          </div>
        </div>
      </Card>

      {!hasAnything && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Sparkles className="size-6 text-gold" />
            <p className="text-sm text-muted-foreground">
              Isi atau impor data keuangan, lalu klik “Jalankan valuasi” untuk memperbarui seluruh hasil.
            </p>
          </CardContent>
        </Card>
      )}

      {hasAnything && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* EPS & BVPS */}
          <ResultCard title="EPS & BVPS" icon={Coins}>
            <div className="grid grid-cols-2 gap-4">
              <ValueLine label="Earnings per Share (EPS)" value={result.eps} />
              <ValueLine label="Book Value per Share (BVPS)" value={result.bvps} />
            </div>
          </ResultCard>

          {/* Graham Number */}
          <ResultCard title="Graham Number" icon={Gauge}>
            <ValueLine label="Estimasi Nilai Wajar" value={result.grahamNumber} price={price} />
            <p className="mt-3 text-xs text-muted-foreground">
              √(22,5 × EPS × BVPS) — batas harga wajar konservatif ala Benjamin Graham.
            </p>
          </ResultCard>

          {/* DCF */}
          <ResultCard title="Discounted Cash Flow (DCF)" icon={TrendingUp}>
            <ValueLine label="Harga Wajar per Saham" value={result.dcfPerShare} price={price} />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Free Cash Flow</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatRupiahShort(result.freeCashFlow)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Nilai Ekuitas</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatRupiahShort(result.equityValue)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">PV Arus Kas (5 thn)</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatRupiahShort(result.enterprisePV)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">PV Terminal Value</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatRupiahShort(result.terminalValuePV)}
                </span>
              </div>
            </div>
          </ResultCard>

          {/* DDM — only when dividend > 0 */}
          {Number.isFinite(result.ddmPerShare) && (
            <ResultCard title="Dividend Discount Model" icon={Scale}>
              <ValueLine label="Harga Wajar per Saham" value={result.ddmPerShare} price={price} />
              <p className="mt-3 text-xs text-muted-foreground">
                Model Gordon Growth: D₀ × (1 + g) / (r − g).
              </p>
            </ResultCard>
          )}

          {/* Relative valuation — only when PER/PBV supplied */}
          {(Number.isFinite(result.perValue) || Number.isFinite(result.pbvValue)) && (
            <ResultCard title="Relative Valuation" icon={LineChart}>
              <div className="grid grid-cols-2 gap-4">
                {Number.isFinite(result.perValue) && (
                  <ValueLine label="Harga Wajar (PER)" value={result.perValue} price={price} />
                )}
                {Number.isFinite(result.pbvValue) && (
                  <ValueLine label="Harga Wajar (PBV)" value={result.pbvValue} price={price} />
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Berdasarkan multiple rata-rata sektor terhadap EPS &amp; BVPS.
              </p>
            </ResultCard>
          )}
        </div>
      )}
    </div>
  )
}
