'use client'

import { Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/format'
import { HEALTH_LABEL, type Health, type RatioCategory, type RatioResult } from '@/lib/performance'

function healthVariant(health: Health): 'positive' | 'warning' | 'negative' {
  if (health === 'healthy') return 'positive'
  if (health === 'watch') return 'warning'
  return 'negative'
}

function RatioTile({ ratio }: { ratio: RatioResult }) {
  const has = Number.isFinite(ratio.value)
  const display = has
    ? `${formatNumber(ratio.value, 2)}${ratio.unit === '%' ? '%' : '×'}`
    : '—'

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{ratio.name}</span>
          {ratio.health && (
            <Badge variant={healthVariant(ratio.health)} className="shrink-0">
              {HEALTH_LABEL[ratio.health]}
            </Badge>
          )}
        </div>
        <span className="font-serif text-3xl font-semibold text-foreground tabular-nums">
          {display}
        </span>
        <span className="mt-auto text-xs text-muted-foreground">{ratio.formula}</span>
      </CardContent>
    </Card>
  )
}

export function PerformanceResults({ categories }: { categories: RatioCategory[] }) {
  const hasData = categories.some((c) => c.ratios.some((r) => Number.isFinite(r.value)))

  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Activity className="size-6 text-gold" />
          <p className="text-sm text-muted-foreground">
            Rasio keuangan akan muncul di sini secara otomatis saat Anda mengisi data laporan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {categories.map((cat) => (
        <section key={cat.key}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-serif text-xl font-semibold text-foreground">{cat.title}</h2>
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
