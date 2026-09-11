'use client'

import Link from 'next/link'
import { Activity, ArrowUpRight, Calculator, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { FinancialInputPanel } from '@/components/finance/input-panel'
import { useFinance } from '@/components/finance/finance-context'

const MODULES = [
  { href: '/valuasi', title: 'Valuasi', desc: 'Nilai wajar & margin of safety', icon: Calculator },
  { href: '/kinerja', title: 'Kinerja', desc: 'Kesehatan & rasio bisnis', icon: Activity },
  { href: '/saham', title: 'Saham', desc: 'Skor komposit & rekomendasi', icon: TrendingUp },
]

export default function InputPage() {
  const { model } = useFinance()
  const title = model.identity.nama
    ? `Input — ${model.identity.nama}${model.identity.kode ? ` (${model.identity.kode})` : ''}`
    : 'Input Laporan Keuangan'

  return (
    <div>
      <PageHeader
        title={title}
        description="Masukkan satu set laporan keuangan lengkap. Data dibagikan otomatis ke seluruh modul analisis — cukup isi sekali per emiten per periode."
      />

      <FinancialInputPanel />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.href} href={m.href} className="group">
              <Card className="transition-colors group-hover:border-gold/40">
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      {m.title}
                      <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold" />
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">{m.desc}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
