'use client'

import { useMemo } from 'react'
import { PageHeader } from '@/components/page-header'
import { CollapsibleInputPanel } from '@/components/finance/input-panel'
import { ValuationResults } from '@/components/valuation/valuation-results'
import { useFinance } from '@/components/finance/finance-context'
import { runValuation } from '@/lib/valuation'

export default function ValuasiPage() {
  const { model, derived } = useFinance()
  const result = useMemo(() => runValuation(model, derived), [model, derived])

  const title = model.identity.nama
    ? `Valuasi — ${model.identity.nama}${model.identity.kode ? ` (${model.identity.kode})` : ''}`
    : 'Valuasi Perusahaan'

  return (
    <div>
      <PageHeader
        title={title}
        description="Nilai wajar saham lewat Graham Number, WACC, DCF (FCFF), Dividend Discount Model, relative valuation, dan real options — lengkap dengan margin of safety. Setiap metode mencantumkan sumber teorinya."
      />
      <div className="flex flex-col gap-6">
        <CollapsibleInputPanel />
        <ValuationResults result={result} model={model} />
      </div>
    </div>
  )
}
