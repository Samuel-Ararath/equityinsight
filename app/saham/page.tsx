'use client'

import { useMemo, useState } from 'react'
import { Activity, Calculator } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import {
  AssumptionsSection,
  FinancialsSection,
  IdentitySection,
} from '@/components/finance/sections'
import { ValuationResults } from '@/components/valuation/valuation-results'
import { PerformanceResults } from '@/components/performance/performance-results'
import { runValuation } from '@/lib/valuation'
import { runPerformance } from '@/lib/performance'
import { cn } from '@/lib/utils'
import {
  DEFAULT_ASSUMPTIONS,
  EMPTY_FINANCIALS,
  EMPTY_IDENTITY,
  type CompanyIdentity,
  type FinancialData,
  type ValuationAssumptions,
} from '@/lib/types'

type Tab = 'valuasi' | 'kinerja'

export default function SahamPage() {
  const [identity, setIdentity] = useState<CompanyIdentity>(EMPTY_IDENTITY)
  const [financials, setFinancials] = useState<FinancialData>(EMPTY_FINANCIALS)
  const [assumptions, setAssumptions] = useState<ValuationAssumptions>(DEFAULT_ASSUMPTIONS)
  const [tab, setTab] = useState<Tab>('valuasi')

  // One shared dataset drives both the valuation and the performance analysis.
  const valuation = useMemo(() => runValuation(financials, assumptions), [financials, assumptions])
  const performance = useMemo(() => runPerformance(financials), [financials])

  const title = identity.nama
    ? `Saham — ${identity.nama}${identity.kode ? ` (${identity.kode})` : ''}`
    : 'Analisis Saham'

  return (
    <div>
      <PageHeader
        title={title}
        description="Analisis menyeluruh: satu set data laporan keuangan menghasilkan valuasi nilai wajar sekaligus penilaian rasio kinerja."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <IdentitySection value={identity} onChange={(p) => setIdentity((s) => ({ ...s, ...p }))} />
          <FinancialsSection
            value={financials}
            onChange={(p) => setFinancials((s) => ({ ...s, ...p }))}
            extended
          />
          <AssumptionsSection
            value={assumptions}
            onChange={(p) => setAssumptions((s) => ({ ...s, ...p }))}
          />
        </div>

        <div className="flex flex-col gap-4">
          {/* Tab switch */}
          <div className="inline-flex w-full rounded-lg border border-border bg-card p-1 sm:w-auto">
            {(
              [
                { key: 'valuasi', label: 'Valuasi', icon: Calculator },
                { key: 'kinerja', label: 'Kinerja', icon: Activity },
              ] as const
            ).map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none',
                    active
                      ? 'bg-gold/15 text-gold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {tab === 'valuasi' ? (
            <ValuationResults result={valuation} financials={financials} />
          ) : (
            <PerformanceResults categories={performance} />
          )}
        </div>
      </div>
    </div>
  )
}
