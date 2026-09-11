'use client'

import {
  CheckCircle2,
  Circle,
  Coins,
  Gauge,
  HelpCircle,
  LineChart,
  Percent,
  Scale,
  Sparkles,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { MarginGauge, marginColor } from '@/components/valuation/margin-gauge'
import { formatNumber, formatPercent, formatRupiah, formatRupiahShort } from '@/lib/format'
import { upsideVsPrice, type CriterionStatus, type ValuationResult } from '@/lib/valuation'
import type { FinancialModel } from '@/lib/types'
import { cn } from '@/lib/utils'

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
        <span className={cn('text-xs font-medium tabular-nums', upside >= 0 ? 'text-positive' : 'text-negative')}>
          {formatPercent(upside, 1, true)} vs harga saat ini
        </span>
      )}
    </div>
  )
}

function ResultCard({
  title,
  icon: Icon,
  tooltip,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  tooltip?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-gold/10 text-gold">
          <Icon className="size-4" />
        </span>
        <CardTitle className="flex items-center gap-1.5 text-foreground">
          {title}
          {tooltip && <InfoTooltip text={tooltip} />}
        </CardTitle>
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

function CriterionIcon({ status }: { status: CriterionStatus }) {
  if (status === 'pass') return <CheckCircle2 className="size-4 shrink-0 text-positive" />
  if (status === 'fail') return <XCircle className="size-4 shrink-0 text-negative" />
  return <HelpCircle className="size-4 shrink-0 text-muted-foreground" />
}

function StatRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  )
}

export function ValuationResults({
  result,
  model,
}: {
  result: ValuationResult
  model: FinancialModel
}) {
  const price = model.market.hargaSaham
  const color = marginColor(result.marginOfSafety)
  const hasAnything = result.fairValues.length > 0 || Number.isFinite(result.eps)
  const { wacc, dcf, sensitivity, relative, realOption, graham } = result

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
                  Margin of Safety
                  <InfoTooltip text="Margin of Safety — Benjamin Graham, The Intelligent Investor (1949). Selisih antara nilai wajar rata-rata dan harga pasar sebagai bantalan risiko." />
                </Badge>
                <span
                  className="font-serif text-3xl font-bold tracking-tight text-balance break-words md:text-4xl"
                  style={{ color }}
                >
                  {result.verdict}
                </span>
                <p className="max-w-md text-sm text-muted-foreground">{VERDICT_COPY[result.verdict]}</p>
              </>
            ) : (
              <>
                <span className="font-serif text-3xl font-semibold text-muted-foreground">Menunggu Data</span>
                <p className="max-w-md text-sm text-muted-foreground">
                  Isi laporan keuangan, harga saham, dan asumsi untuk mulai menghitung margin of safety.
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
                {result.preProfit ? 'Basis pra-profitabilitas' : 'Rata-rata'} dari{' '}
                {result.fairValues.length} metode: {result.fairValues.map((f) => f.label).join(', ')}.
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
              Hasil kalkulasi akan muncul di sini secara otomatis saat Anda mengisi data keuangan.
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

          {/* Graham Number + checklist */}
          {!result.preProfit && (
            <ResultCard
              title="Graham Number"
              icon={Gauge}
              tooltip="Graham Number — Benjamin Graham, The Intelligent Investor (1949). √(22,5 × EPS × BVPS)."
            >
              <ValueLine label="Estimasi Nilai Wajar" value={result.grahamNumber} price={price} />
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    7 Kriteria Defensive Investor
                    <InfoTooltip text="Tujuh kriteria investor defensif — The Intelligent Investor, bab 14." />
                  </span>
                  <Badge variant="gold">{graham.passed}/{graham.total} terpenuhi</Badge>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {graham.criteria.map((cr) => (
                    <li key={cr.key} className="flex items-start gap-2 text-sm">
                      <CriterionIcon status={cr.status} />
                      <span className="flex items-center gap-1.5 text-foreground">
                        {cr.label}
                        <InfoTooltip text={cr.detail} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </ResultCard>
          )}

          {/* WACC breakdown */}
          {!result.preProfit && (
            <ResultCard
              title="Cost of Capital (WACC)"
              icon={Percent}
              tooltip="WACC menggabungkan biaya ekuitas (CAPM) dan biaya utang setelah pajak, ditimbang proporsi modal. Dipakai sebagai discount rate DCF."
            >
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs text-muted-foreground">Weighted Average Cost of Capital</span>
                <span className="font-serif text-3xl font-semibold tabular-nums text-gold">
                  {Number.isFinite(wacc.wacc) ? formatPercent(wacc.wacc, 2) : '—'}
                </span>
              </div>
              <div className="mt-3 border-t border-border pt-2">
                <StatRow
                  label="Cost of Equity (CAPM)"
                  value={Number.isFinite(wacc.costOfEquity) ? formatPercent(wacc.costOfEquity, 2) : '—'}
                  tooltip="CAPM — Sharpe (1964): Rf + β × Equity Risk Premium."
                />
                <StatRow
                  label="Cost of Debt (after-tax)"
                  value={Number.isFinite(wacc.costOfDebtAfterTax) ? formatPercent(wacc.costOfDebtAfterTax, 2) : '—'}
                  tooltip="Cost of Debt × (1 − tarif pajak). Tax shield sesuai Modigliani–Miller."
                />
                <StatRow label="Tarif Pajak Efektif" value={Number.isFinite(wacc.taxRate) ? formatPercent(wacc.taxRate, 1) : '—'} />
                <StatRow label="Bobot Ekuitas" value={Number.isFinite(wacc.weightEquity) ? formatPercent(wacc.weightEquity * 100, 1) : '—'} />
                <StatRow label="Bobot Utang" value={Number.isFinite(wacc.weightDebt) ? formatPercent(wacc.weightDebt * 100, 1) : '—'} />
              </div>
            </ResultCard>
          )}

          {/* DCF */}
          {!result.preProfit && (
            <ResultCard
              title="Discounted Cash Flow"
              icon={TrendingUp}
              tooltip="DCF FCFF — Damodaran, Investment Valuation. Nilai perusahaan dari proyeksi Free Cash Flow to Firm didiskon pada WACC."
            >
              {dcf ? (
                <>
                  <ValueLine label="Harga Wajar per Saham" value={dcf.perShare} price={price} />
                  <div className="mt-4 overflow-x-auto border-t border-border pt-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Tahun</th>
                          <th className="pb-2 text-right font-medium">FCFF</th>
                          <th className="pb-2 text-right font-medium">PV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dcf.years.map((y) => (
                          <tr key={y.year} className="border-t border-border/50">
                            <td className="py-1.5 text-foreground">Thn {y.year}</td>
                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                              {formatRupiahShort(y.fcff)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums font-medium text-foreground">
                              {formatRupiahShort(y.presentValue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">PV Arus Kas (5 thn)</span>
                      <span className="font-medium tabular-nums text-foreground">{formatRupiahShort(dcf.sumPvFcff)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">PV Terminal Value</span>
                      <span className="font-medium tabular-nums text-foreground">{formatRupiahShort(dcf.terminalValuePV)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Enterprise Value</span>
                      <span className="font-medium tabular-nums text-foreground">{formatRupiahShort(dcf.enterpriseValue)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Equity Value</span>
                      <span className="font-medium tabular-nums text-foreground">{formatRupiahShort(dcf.equityValue)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  Lengkapi arus kas operasi, capex, jumlah saham, dan pastikan WACC &gt; growth terminal.
                </p>
              )}
            </ResultCard>
          )}

          {/* DCF sensitivity */}
          {!result.preProfit && sensitivity && dcf && (
            <ResultCard
              title="Sensitivity — Harga Wajar DCF"
              icon={Scale}
              tooltip="Harga wajar DCF pada kombinasi WACC ±1% (baris) dan growth terminal ±1% (kolom)."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-1.5 text-left text-muted-foreground">WACC \ g∞</th>
                      {sensitivity.terminalAxis.map((t, ti) => (
                        <th key={ti} className="p-1.5 text-right font-medium text-muted-foreground">
                          {formatPercent(t, 1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.values.map((row, wi) => (
                      <tr key={wi} className="border-t border-border/50">
                        <td className="p-1.5 font-medium text-muted-foreground">
                          {formatPercent(sensitivity.waccAxis[wi], 1)}
                        </td>
                        {row.map((v, ti) => {
                          const center = wi === 1 && ti === 1
                          return (
                            <td
                              key={ti}
                              className={cn(
                                'p-1.5 text-right tabular-nums',
                                center ? 'rounded bg-gold/15 font-semibold text-gold' : 'text-foreground',
                              )}
                            >
                              {Number.isFinite(v) ? formatRupiah(v) : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ResultCard>
          )}

          {/* DDM */}
          {!result.preProfit && Number.isFinite(result.ddmPerShare) && (
            <ResultCard
              title="Dividend Discount Model"
              icon={Coins}
              tooltip="Gordon Growth Model — Gordon & Shapiro (1956). Mendiskon dividen pada Cost of Equity (CAPM)."
            >
              <ValueLine label="Harga Wajar per Saham" value={result.ddmPerShare} price={price} />
              <p className="mt-3 text-xs text-muted-foreground">
                D₀ × (1 + g) / (Cost of Equity − g), memakai Cost of Equity {formatPercent(wacc.costOfEquity, 2)}.
              </p>
            </ResultCard>
          )}

          {/* Relative valuation */}
          {(Number.isFinite(relative.perValue) || Number.isFinite(relative.pbvValue)) && (
            <ResultCard
              title="Relative Valuation"
              icon={LineChart}
              tooltip="Valuasi relatif dari multiple rata-rata sektor terhadap EPS & BVPS. PEG mengikuti Peter Lynch, One Up on Wall Street."
            >
              <div className="grid grid-cols-2 gap-4">
                {Number.isFinite(relative.perValue) && (
                  <ValueLine label="Harga Wajar (PER × EPS)" value={relative.perValue} price={price} />
                )}
                {Number.isFinite(relative.pbvValue) && (
                  <ValueLine label="Harga Wajar (PBV × BVPS)" value={relative.pbvValue} price={price} />
                )}
              </div>
              {Number.isFinite(relative.peg) && (
                <div className="mt-3 border-t border-border pt-3">
                  <StatRow
                    label="PEG Ratio (PER / growth%)"
                    value={formatNumber(relative.peg, 2)}
                    tooltip="PEG < 1 menandakan valuasi murah relatif terhadap pertumbuhan (Lynch)."
                  />
                </div>
              )}
            </ResultCard>
          )}

          {/* Real Options */}
          {result.preProfit && (
            <ResultCard
              title="Real Options Valuation"
              icon={Sparkles}
              tooltip="Real Options — Damodaran, Investment Valuation. Menilai flexibility value opsi ekspansi dengan Black-Scholes, yang diabaikan DCF tradisional pada perusahaan growth."
            >
              {realOption ? (
                <>
                  <ValueLine label="Nilai Opsi per Saham" value={realOption.perShare} price={price} />
                  <div className="mt-3 border-t border-border pt-2">
                    <StatRow label="Nilai Opsi Total" value={formatRupiahShort(realOption.optionValue)} />
                    <StatRow label="d₁" value={formatNumber(realOption.d1, 4)} />
                    <StatRow label="d₂" value={formatNumber(realOption.d2, 4)} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Nilai Opsi = S·N(d₁) − X·e^(−r·t)·N(d₂). Pendekatan ini menilai fleksibilitas strategis
                    perusahaan growth/teknologi yang cenderung di-undervalue oleh DCF karena mengabaikan opsi ekspansi.
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-2 py-4 text-sm text-muted-foreground">
                  <Circle className="mt-0.5 size-4 shrink-0" />
                  Isi Nilai Proyek (S), Biaya Investasi (X), Volatilitas (σ), dan Jangka Waktu di tab Data Pasar &amp; Asumsi.
                </div>
              )}
            </ResultCard>
          )}
        </div>
      )}
    </div>
  )
}
