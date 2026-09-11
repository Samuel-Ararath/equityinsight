'use client'

import {
  Activity,
  CheckCircle2,
  HelpCircle,
  Layers,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { formatNumber } from '@/lib/format'
import {
  ALTMAN_ZONE_LABEL,
  HEALTH_LABEL,
  piotroskiVerdict,
  type Health,
  type PerformanceResult,
  type PiotroskiSignal,
  type RatioResult,
} from '@/lib/performance'
import { cn } from '@/lib/utils'

function healthVariant(health: Health): 'positive' | 'warning' | 'negative' {
  if (health === 'healthy') return 'positive'
  if (health === 'watch') return 'warning'
  return 'negative'
}

function SectionCard({
  title,
  icon: Icon,
  tooltip,
  right,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  tooltip?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-gold/10 text-gold">
          <Icon className="size-4" />
        </span>
        <CardTitle className="flex flex-1 items-center gap-1.5 text-foreground">
          {title}
          {tooltip && <InfoTooltip text={tooltip} />}
        </CardTitle>
        {right}
      </CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
    </Card>
  )
}

// ---- DuPont ----
function DuPontBox({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-border bg-secondary/40 px-3 py-4 text-center">
      <span className="text-[0.7rem] leading-tight tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="font-serif text-xl font-semibold tabular-nums text-foreground">
        {Number.isFinite(value) ? `${formatNumber(value, 2)}${unit}` : '—'}
      </span>
    </div>
  )
}

function DuPontCard({ dupont }: { dupont: PerformanceResult['dupont'] }) {
  return (
    <SectionCard
      title="DuPont Analysis — Dekomposisi ROE"
      icon={Layers}
      tooltip="DuPont System of Financial Analysis (DuPont Corp., 1920-an). ROE dipecah menjadi margin, perputaran aset, dan leverage."
    >
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <DuPontBox label="Net Profit Margin" value={dupont.netProfitMargin} unit="%" />
        <span className="text-center font-serif text-xl text-muted-foreground">×</span>
        <DuPontBox label="Asset Turnover" value={dupont.assetTurnover} unit="×" />
        <span className="text-center font-serif text-xl text-muted-foreground">×</span>
        <DuPontBox label="Equity Multiplier" value={dupont.equityMultiplier} unit="×" />
        <span className="text-center font-serif text-xl text-gold">=</span>
        <div className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 px-3 py-4 text-center">
          <span className="text-[0.7rem] tracking-wide text-gold uppercase">ROE</span>
          <span className="font-serif text-2xl font-bold tabular-nums text-gold">
            {Number.isFinite(dupont.roe) ? `${formatNumber(dupont.roe, 2)}%` : '—'}
          </span>
        </div>
      </div>
    </SectionCard>
  )
}

// ---- Altman ----
function altmanVariant(zone: PerformanceResult['altman']['zone']): 'positive' | 'warning' | 'negative' | 'default' {
  if (zone === 'safe') return 'positive'
  if (zone === 'grey') return 'warning'
  if (zone === 'distress') return 'negative'
  return 'default'
}

function AltmanCard({ altman }: { altman: PerformanceResult['altman'] }) {
  const rows: { key: string; label: string; value: number; weight: string }[] = [
    { key: 'x1', label: 'X1 · Modal Kerja / Total Aset', value: altman.x1, weight: '1,2' },
    { key: 'x2', label: 'X2 · Saldo Laba / Total Aset', value: altman.x2, weight: '1,4' },
    { key: 'x3', label: 'X3 · EBIT / Total Aset', value: altman.x3, weight: '3,3' },
    { key: 'x4', label: 'X4 · Nilai Pasar Ekuitas / Total Liabilitas', value: altman.x4, weight: '0,6' },
    { key: 'x5', label: 'X5 · Pendapatan / Total Aset', value: altman.x5, weight: '1,0' },
  ]
  return (
    <SectionCard
      title="Altman Z-Score"
      icon={ShieldAlert}
      tooltip="Altman Z-Score (Edward Altman, 1968) — prediksi risiko kebangkrutan. Z = 1,2·X1 + 1,4·X2 + 3,3·X3 + 0,6·X4 + 1,0·X5."
      right={
        altman.zone ? (
          <Badge variant={altmanVariant(altman.zone)}>{ALTMAN_ZONE_LABEL[altman.zone]}</Badge>
        ) : undefined
      }
    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-xs text-muted-foreground">Z-Score</span>
        <span className="font-serif text-3xl font-semibold tabular-nums text-foreground">
          {Number.isFinite(altman.z) ? formatNumber(altman.z, 2) : '—'}
        </span>
        <span className="text-xs text-muted-foreground">
          Aman &gt; 2,99 · Abu-abu 1,81–2,99 · Distress &lt; 1,81
        </span>
      </div>
      <div className="mt-3 border-t border-border pt-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-2 py-1 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="tabular-nums text-foreground">
              <span className="text-muted-foreground/60">×{r.weight} </span>
              {Number.isFinite(r.value) ? formatNumber(r.value, 3) : '—'}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ---- Piotroski ----
function SignalIcon({ status }: { status: PiotroskiSignal['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="size-4 shrink-0 text-positive" />
  if (status === 'fail') return <XCircle className="size-4 shrink-0 text-negative" />
  return <HelpCircle className="size-4 shrink-0 text-muted-foreground" />
}

function PiotroskiCard({ piotroski }: { piotroski: PerformanceResult['piotroski'] }) {
  const { signals, score, computable } = piotroski
  return (
    <SectionCard
      title="Piotroski F-Score"
      icon={Activity}
      tooltip="Piotroski F-Score (Joseph Piotroski, 2000) — sembilan sinyal fundamental, skor 0–9."
      right={<Badge variant="gold">{score}/9</Badge>}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif text-lg font-semibold text-foreground">{piotroskiVerdict(score)}</span>
        {computable < 9 && (
          <span className="text-xs text-muted-foreground">{computable} dari 9 kriteria dapat dihitung</span>
        )}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-1.5 border-t border-border pt-3 sm:grid-cols-2">
        {signals.map((s) => (
          <li key={s.key} className="flex items-start gap-2 text-sm">
            <SignalIcon status={s.status} />
            <span className="flex items-center gap-1.5 text-foreground">
              {s.label}
              <InfoTooltip text={s.detail} />
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

// ---- Standard ratios ----
function RatioTile({ ratio }: { ratio: RatioResult }) {
  const has = Number.isFinite(ratio.value)
  const display = has ? `${formatNumber(ratio.value, 2)}${ratio.unit === '%' ? '%' : '×'}` : '—'
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            {ratio.name}
            <InfoTooltip text={`${ratio.formula}. ${ratio.source}`} />
          </span>
          {ratio.health && (
            <Badge variant={healthVariant(ratio.health)} className="shrink-0">
              {HEALTH_LABEL[ratio.health]}
            </Badge>
          )}
        </div>
        <span className="font-serif text-3xl font-semibold tabular-nums text-foreground">{display}</span>
        <span className="mt-auto text-xs text-muted-foreground">{ratio.formula}</span>
      </CardContent>
    </Card>
  )
}

export function PerformanceResults({ result }: { result: PerformanceResult }) {
  const hasData =
    Number.isFinite(result.dupont.roe) ||
    Number.isFinite(result.altman.z) ||
    result.ratios.some((c) => c.ratios.some((r) => Number.isFinite(r.value)))

  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Sparkles className="size-6 text-gold" />
          <p className="text-sm text-muted-foreground">
            Analisis kinerja akan muncul di sini secara otomatis saat Anda mengisi data laporan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <DuPontCard dupont={result.dupont} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AltmanCard altman={result.altman} />
        <PiotroskiCard piotroski={result.piotroski} />
      </div>

      {result.ratios.map((cat) => (
        <section key={cat.key}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-serif text-lg font-semibold text-foreground">{cat.title}</h2>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.ratios.map((r) => (
              <RatioTile key={r.key} ratio={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
