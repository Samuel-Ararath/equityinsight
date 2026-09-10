'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { FinancialsSection, IdentitySection } from '@/components/finance/sections'
import { PerformanceResults } from '@/components/performance/performance-results'
import { runPerformance } from '@/lib/performance'
import {
  EMPTY_FINANCIALS,
  EMPTY_IDENTITY,
  type CompanyIdentity,
  type FinancialData,
} from '@/lib/types'

export default function KinerjaPage() {
  const [identity, setIdentity] = useState<CompanyIdentity>(EMPTY_IDENTITY)
  const [financials, setFinancials] = useState<FinancialData>(EMPTY_FINANCIALS)

  // Reactive ratio computation on every keystroke.
  const categories = useMemo(() => runPerformance(financials), [financials])

  const title = identity.nama
    ? `Kinerja — ${identity.nama}${identity.kode ? ` (${identity.kode})` : ''}`
    : 'Analisis Kinerja Perusahaan'

  return (
    <div>
      <PageHeader
        title={title}
        description="Ukur profitabilitas, solvabilitas, likuiditas, dan efisiensi lewat rasio keuangan standar. Setiap rasio dinilai otomatis terhadap rule of thumb industri."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <IdentitySection value={identity} onChange={(p) => setIdentity((s) => ({ ...s, ...p }))} />
          <FinancialsSection
            value={financials}
            onChange={(p) => setFinancials((s) => ({ ...s, ...p }))}
            extended
          />
        </div>
        <div>
          <PerformanceResults categories={categories} />
        </div>
      </div>
    </div>
  )
}
