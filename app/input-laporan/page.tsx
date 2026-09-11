'use client'

import Link from 'next/link'
import { Activity, Calculator, FlaskConical, RotateCcw, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InputPanel } from '@/components/finance/input-panel'
import { useFinancials } from '@/lib/financials-context'

const MODULES = [
  { href: '/valuasi', label: 'Valuasi', icon: Calculator },
  { href: '/kinerja', label: 'Kinerja', icon: Activity },
  { href: '/saham', label: 'Analisis Saham', icon: TrendingUp },
]

export default function InputLaporanPage() {
  const { reset, loadExample } = useFinancials()
  return (
    <div>
      <PageHeader
        title="Input Laporan Keuangan"
        description="Satu formulir untuk ketiga modul. Isi sekali per emiten per periode; Valuasi, Kinerja, dan Analisis Saham membaca data yang sama."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadExample}>
              <FlaskConical className="size-4" />
              Muat contoh
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <InputPanel />
        <div className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Lanjut ke modul</span>
              {MODULES.map((m) => {
                const Icon = m.icon
                return (
                  <Button key={m.href} variant="outline" className="justify-start" nativeButton={false} render={<Link href={m.href} />}>
                    <Icon className="size-4 text-gold" />
                    {m.label}
                  </Button>
                )
              })}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2 p-5 text-xs leading-relaxed text-muted-foreground">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Catatan</span>
              <p>Total & sub-total dihitung otomatis dari komponen. Neraca divalidasi: Total Aset harus sama dengan Total Liabilitas + Ekuitas.</p>
              <p>Data tersimpan di memori sesi browser (belum ada database) dan akan hilang saat halaman dimuat ulang.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
