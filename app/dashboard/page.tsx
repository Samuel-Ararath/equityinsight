import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  Building2,
  Calculator,
  Plus,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPercent, formatRupiah } from '@/lib/format'

// Illustrative summary figures for the overview. The analysis modules
// themselves compute live values from user input.
const STATS = [
  { label: 'Perusahaan Dianalisis', value: '12', icon: Building2, hint: 'Total sesi valuasi' },
  { label: 'Dalam Watchlist', value: '5', icon: TrendingUp, hint: 'Dipantau aktif' },
  { label: 'Rata-rata Margin of Safety', value: '+18,4%', icon: ShieldCheck, hint: 'Portofolio pantauan' },
  { label: 'Sinyal Undervalued', value: '3', icon: Activity, hint: 'Diskon > 30%' },
]

type WatchItem = {
  nama: string
  kode: string
  sektor: string
  harga: number
  wajar: number
  mos: number
  verdict: 'UNDERVALUED' | 'FAIR VALUE' | 'OVERVALUED'
}

const WATCHLIST: WatchItem[] = [
  { nama: 'Bank Nusantara', kode: 'BNUS', sektor: 'Perbankan', harga: 4200, wajar: 6350, mos: 33.9, verdict: 'UNDERVALUED' },
  { nama: 'Sinar Konsumer', kode: 'SKON', sektor: 'Konsumer', harga: 1850, wajar: 2050, mos: 9.8, verdict: 'OVERVALUED' },
  { nama: 'Energi Prima', kode: 'ENPR', sektor: 'Energi', harga: 3120, wajar: 3980, mos: 21.6, verdict: 'FAIR VALUE' },
  { nama: 'Tekno Digital', kode: 'TKND', sektor: 'Teknologi', harga: 9800, wajar: 15100, mos: 35.1, verdict: 'UNDERVALUED' },
  { nama: 'Griya Properti', kode: 'GRYA', sektor: 'Properti', harga: 640, wajar: 590, mos: -8.5, verdict: 'OVERVALUED' },
]

const MODULES = [
  {
    href: '/valuasi',
    title: 'Valuasi Perusahaan',
    desc: 'Graham Number, DCF, DDM & relative valuation dengan margin of safety.',
    icon: Calculator,
  },
  {
    href: '/kinerja',
    title: 'Analisis Kinerja',
    desc: 'Rasio profitabilitas, solvabilitas, likuiditas & efisiensi.',
    icon: Activity,
  },
  {
    href: '/saham',
    title: 'Analisis Saham',
    desc: 'Gabungan valuasi dan kinerja dalam satu tampilan menyeluruh.',
    icon: TrendingUp,
  },
]

function verdictBadge(v: WatchItem['verdict']) {
  if (v === 'UNDERVALUED') return <Badge variant="positive">Undervalued</Badge>
  if (v === 'FAIR VALUE') return <Badge variant="warning">Fair Value</Badge>
  return <Badge variant="negative">Overvalued</Badge>
}

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan aktivitas analisis, watchlist, dan pintasan ke modul valuasi serta kinerja."
        action={
          <Button size="lg" nativeButton={false} render={<Link href="/valuasi" />}>
            <Plus className="size-4" />
            Analisis Perusahaan Baru
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="flex size-8 items-center justify-center rounded-md bg-gold/10 text-gold">
                    <Icon className="size-4" />
                  </span>
                </div>
                <span className="font-serif text-3xl font-semibold text-foreground tabular-nums">
                  {s.value}
                </span>
                <span className="text-xs text-muted-foreground">{s.hint}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Watchlist + modules */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex flex-col">
                <h2 className="font-serif text-lg font-semibold text-foreground">Watchlist</h2>
                <span className="text-xs text-muted-foreground">Data ilustrasi pemantauan</span>
              </div>
              <Badge variant="gold">{WATCHLIST.length} emiten</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-5 py-3 font-medium">Emiten</th>
                    <th className="px-5 py-3 text-right font-medium">Harga</th>
                    <th className="px-5 py-3 text-right font-medium">Nilai Wajar</th>
                    <th className="px-5 py-3 text-right font-medium">MoS</th>
                    <th className="px-5 py-3 text-right font-medium">Sinyal</th>
                  </tr>
                </thead>
                <tbody>
                  {WATCHLIST.map((w) => (
                    <tr key={w.kode} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{w.kode}</span>
                          <span className="text-xs text-muted-foreground">
                            {w.nama} · {w.sektor}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-foreground">
                        {formatRupiah(w.harga)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gold">
                        {formatRupiah(w.wajar)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-medium tabular-nums ${
                          w.mos >= 0 ? 'text-positive' : 'text-negative'
                        }`}
                      >
                        {formatPercent(w.mos, 1, true)}
                      </td>
                      <td className="px-5 py-3 text-right">{verdictBadge(w.verdict)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
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
    </div>
  )
}
