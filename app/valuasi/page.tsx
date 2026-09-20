'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { AutoFinancialImport } from '@/components/finance/auto-import'
import { ResearchIntegrityCard } from '@/components/finance/research-integrity-card'
import { Button } from '@/components/ui/button'
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
  const [calculation, setCalculation] = useState({ financials: EMPTY_FINANCIALS, assumptions: DEFAULT_ASSUMPTIONS })

  const result = useMemo(() => runValuation(calculation.financials, calculation.assumptions), [calculation])

  function runCalculation() {
    setCalculation({ financials: { ...financials }, assumptions: { ...assumptions } })
  }

  const title = identity.nama
    ? `Valuasi — ${identity.nama}${identity.kode ? ` (${identity.kode})` : ''}`
    : 'Valuasi Perusahaan'

  return (
    <div>
      <PageHeader
        title={title}
        description="Ambil laporan terbaru, periksa mapping angka, lalu jalankan Graham Number, DCF, Dividend Discount Model, dan relative valuation dengan transparan."
      />
      <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Form column */}
        <div className="flex flex-col gap-4">
          <IdentitySection value={identity} onChange={(p) => setIdentity((s) => ({ ...s, ...p }))} />
          <AutoFinancialImport
            symbol={identity.kode}
            onApply={(patch) => setFinancials((current) => ({ ...current, ...patch }))}
          />
          <ResearchIntegrityCard />
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
        <div className="min-w-0 2xl:sticky 2xl:top-20 2xl:self-start">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Siap menghitung?</p>
              <p className="mt-1 text-xs text-muted-foreground">Periksa angka yang terisi, lalu jalankan model valuasi dengan satu klik.</p>
            </div>
            <Button type="button" onClick={runCalculation}>Jalankan valuasi</Button>
          </div>
          <ValuationResults result={result} financials={calculation.financials} />
        </div>
      </div>
    </div>
  )
}
