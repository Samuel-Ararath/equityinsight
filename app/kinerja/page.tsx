'use client'

import { useMemo } from 'react'
import { PageHeader } from '@/components/page-header'
import { CollapsibleInputPanel } from '@/components/finance/input-panel'
import { PerformanceResults } from '@/components/performance/performance-results'
import { useFinance } from '@/components/finance/finance-context'
import { runPerformance } from '@/lib/performance'

export default function KinerjaPage() {
  const { model, derived } = useFinance()
  const result = useMemo(() => runPerformance(model, derived), [model, derived])

  const title = model.identity.nama
    ? `Kinerja — ${model.identity.nama}${model.identity.kode ? ` (${model.identity.kode})` : ''}`
    : 'Analisis Kinerja Perusahaan'

  return (
    <div>
      <PageHeader
        title={title}
        description="Menilai kesehatan bisnis: DuPont ROE, Altman Z-Score, Piotroski F-Score, dan rasio profitabilitas, likuiditas, solvabilitas, serta efisiensi. Fokus pada fundamental, bukan harga saham."
      />
      <div className="flex flex-col gap-6">
        <CollapsibleInputPanel />
        <PerformanceResults result={result} />
      </div>
    </div>
  )
}
