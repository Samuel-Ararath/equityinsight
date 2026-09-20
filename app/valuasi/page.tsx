'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { AutoFinancialImport } from '@/components/finance/auto-import'
import {
  AssumptionsSection,
  FinancialsSection,
  IdentitySection,
} from '@/components/finance/sections'
import { ValuationResults } from '@/components/valuation/valuation-results'
import { runValuation } from '@/lib/valuation'
import {
  DEFAULT_ASSUMPTIONS,
  EMPTY_FINANCIALS,
  EMPTY_IDENTITY,
  type CompanyIdentity,
  type FinancialData,
  type ValuationAssumptions,
} from '@/lib/types'

export default function ValuasiPage() {
  const [identity, setIdentity] = useState<CompanyIdentity>(EMPTY_IDENTITY)
  const [financials, setFinancials] = useState<FinancialData>(EMPTY_FINANCIALS)
  const [assumptions, setAssumptions] = useState<ValuationAssumptions>(DEFAULT_ASSUMPTIONS)

  // Reactive: recompute on every keystroke, no submit needed.
  const result = useMemo(() => runValuation(financials, assumptions), [financials, assumptions])

  const title = identity.nama
    ? `Valuasi — ${identity.nama}${identity.kode ? ` (${identity.kode})` : ''}`
    : 'Valuasi Perusahaan'

  return (
    <div>
      <PageHeader
        title={title}
        description="Hitung nilai wajar saham dengan Graham Number, DCF, Dividend Discount Model, dan relative valuation. Hasil diperbarui otomatis saat Anda mengetik."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:grid-cols-2">
        {/* Form column */}
        <div className="flex flex-col gap-4">
          <IdentitySection value={identity} onChange={(p) => setIdentity((s) => ({ ...s, ...p }))} />
          <AutoFinancialImport
            symbol={identity.kode}
            onApply={(patch) => setFinancials((current) => ({ ...current, ...patch }))}
          />
          <FinancialsSection
            value={financials}
            extended
            onChange={(p) => setFinancials((s) => ({ ...s, ...p }))}
          />
          <AssumptionsSection
            value={assumptions}
            onChange={(p) => setAssumptions((s) => ({ ...s, ...p }))}
          />
        </div>
        {/* Results column (sticky on large screens) */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ValuationResults result={result} financials={financials} />
        </div>
      </div>
    </div>
  )
}
