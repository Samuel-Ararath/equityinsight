import { Database, LineChart, Newspaper, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const PLANNED = [
  { icon: LineChart, title: 'Indeks & Harga Real-time', desc: 'Pantau IHSG, indeks sektoral, dan harga saham terkini.' },
  { icon: TrendingUp, title: 'Data Makroekonomi', desc: 'Suku bunga, inflasi, dan nilai tukar sebagai konteks valuasi.' },
  { icon: Newspaper, title: 'Berita & Sentimen', desc: 'Ringkasan berita emiten dan sentimen pasar terkurasi.' },
]

export default function DataPasarPage() {
  return (
    <div>
      <PageHeader
        title="Data Pelengkap Pasar"
        description="Modul data pasar untuk melengkapi analisis fundamental Anda."
      />

      <Card className="mb-8 border-gold/25 bg-gradient-to-br from-card to-accent/40">
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
            <Database className="size-6" />
          </span>
          <Badge variant="gold">Segera Hadir</Badge>
          <h2 className="font-serif text-2xl font-semibold text-foreground text-balance">
            Data Pasar Sedang Kami Siapkan
          </h2>
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            Fitur ini akan menghadirkan data pasar real-time dan konteks makro untuk memperkaya
            keputusan investasi value investing Anda.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANNED.map((p) => {
          const Icon = p.icon
          return (
            <Card key={p.title}>
              <CardContent className="flex flex-col gap-3 p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="font-medium text-foreground">{p.title}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">{p.desc}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
