import Link from 'next/link'
import { Activity, ArrowUpRight, BarChart3, Calculator, ChevronRight, CircleDollarSign, Database, Plus, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPercent, formatRupiah } from '@/lib/format'

const WATCHLIST = [
  { name: 'Bank Central Asia', ticker: 'BBCA', sector: 'Perbankan', price: 8650, fair: 10125, mos: 14.6, signal: 'Fair value' },
  { name: 'Bank Rakyat Indonesia', ticker: 'BBRI', sector: 'Perbankan', price: 4120, fair: 4980, mos: 17.3, signal: 'Accumulation' },
  { name: 'Telkom Indonesia', ticker: 'TLKM', sector: 'Infrastruktur', price: 2840, fair: 3150, mos: 9.8, signal: 'Watch' },
  { name: 'Astra International', ticker: 'ASII', sector: 'Konglomerasi', price: 4760, fair: 5425, mos: 12.3, signal: 'Fair value' },
]

const PULSE = [
  { label: 'IHSG', value: '6.384,21', change: '+0,42%', positive: true },
  { label: 'Dow Jones', value: '45.532,87', change: '+0,70%', positive: true },
  { label: 'U.S. 10Y', value: '4,77%', change: '-0,03%', positive: false },
  { label: 'Gold', value: '$3.681', change: '+0,88%', positive: true },
]

function signalBadge(signal: string) {
  if (signal === 'Accumulation') return <Badge variant="positive">{signal}</Badge>
  if (signal === 'Watch') return <Badge variant="warning">{signal}</Badge>
  return <Badge variant="outline">{signal}</Badge>
}

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="A calmer way to read the market."
        description="Satu workspace untuk memahami harga, kualitas bisnis, dan nilai intrinsik—tanpa noise yang tidak perlu."
        action={<Button size="lg" nativeButton={false} render={<Link href="/valuasi" />}><Plus className="size-4" />Mulai analisis</Button>}
      />

      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-gold/10 p-6 premium-glow md:p-8">
        <div className="premium-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Sparkles className="size-4" /></span><span className="eyebrow">Your investment cockpit</span></div>
            <h2 className="max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-tight md:text-5xl">Research with a thesis.<br /><span className="text-primary">Invest with a margin.</span></h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">Pantau market context, bangun model valuasi, lalu simpan pemikiranmu dalam satu alur yang jernih.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button nativeButton={false} render={<Link href="/data-pasar" />}>Open market terminal <ArrowUpRight className="size-4" /></Button><Button variant="outline" nativeButton={false} render={<Link href="/saham" />}>Full stock analysis <ChevronRight className="size-4" /></Button></div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:ml-auto lg:max-w-sm">
            {[{label:'Ideas tracked', value:'12'}, {label:'Avg. margin', value:'+18,4%'}, {label:'Undervalued', value:'03'}, {label:'Models saved', value:'08'}].map((item) => <div key={item.label} className="rounded-xl border border-border/70 bg-background/35 p-4 backdrop-blur-md"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">{item.value}</p></div>)}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PULSE.map((item) => <Card key={item.label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{item.value}</p></div><span className={item.positive ? 'text-positive' : 'text-negative'}>{item.change}</span></CardContent></Card>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-5 md:px-6"><div><p className="eyebrow">Conviction board</p><h2 className="mt-1 font-serif text-xl font-semibold">Watchlist</h2></div><Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/data-pasar" />}>View terminal <ArrowUpRight className="size-4" /></Button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground"><th className="px-5 py-4 font-medium md:px-6">Company</th><th className="px-5 py-4 text-right font-medium">Price</th><th className="px-5 py-4 text-right font-medium">Fair value</th><th className="px-5 py-4 text-right font-medium">MoS</th><th className="px-5 py-4 text-right font-medium">Signal</th></tr></thead><tbody>{WATCHLIST.map((item) => <tr key={item.ticker} className="border-b border-border/60 last:border-0 hover:bg-accent/35"><td className="px-5 py-4 md:px-6"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{item.ticker.slice(0, 2)}</span><span><span className="block font-medium">{item.name}</span><span className="text-xs text-muted-foreground">{item.ticker} · {item.sector}</span></span></div></td><td className="px-5 py-4 text-right tabular-nums">{formatRupiah(item.price)}</td><td className="px-5 py-4 text-right tabular-nums text-gold">{formatRupiah(item.fair)}</td><td className={`px-5 py-4 text-right font-semibold tabular-nums ${item.mos >= 0 ? 'text-positive' : 'text-negative'}`}>{formatPercent(item.mos, 1, true)}</td><td className="px-5 py-4 text-right">{signalBadge(item.signal)}</td></tr>)}</tbody></table></div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5"><CardContent className="p-5"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><ShieldCheck className="size-5" /></span><div><p className="font-semibold">Built for discipline</p><p className="text-xs text-muted-foreground">One thesis at a time.</p></div></div><p className="mt-5 text-sm leading-6 text-muted-foreground">Gunakan margin of safety sebagai guardrail—bukan sebagai ramalan harga.</p><Button className="mt-4 w-full" variant="outline" nativeButton={false} render={<Link href="/valuasi" />}>Open valuation lab</Button></CardContent></Card>
          <Card><CardContent className="p-5"><p className="eyebrow">Research stack</p><div className="mt-4 space-y-3">{[{icon: Database, title:'Market context', href:'/data-pasar'}, {icon: Calculator, title:'Valuation lab', href:'/valuasi'}, {icon: Activity, title:'Performance review', href:'/kinerja'}, {icon: BarChart3, title:'Stock synthesis', href:'/saham'}].map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent"><Icon className="size-4 text-primary" /><span className="flex-1 text-sm font-medium">{item.title}</span><ArrowUpRight className="size-3.5 text-muted-foreground" /></Link> })}</div></CardContent></Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><CircleDollarSign className="size-5 text-gold" /><h3 className="mt-4 font-serif text-lg font-semibold">Intrinsic value</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Bandingkan harga dengan beberapa metode valuasi, bukan satu angka sakral.</p></CardContent></Card><Card><CardContent className="p-5"><TrendingUp className="size-5 text-positive" /><h3 className="mt-4 font-serif text-lg font-semibold">Business quality</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Baca profitabilitas, leverage, likuiditas, dan efisiensi dalam satu layar.</p></CardContent></Card><Card><CardContent className="p-5"><BarChart3 className="size-5 text-primary" /><h3 className="mt-4 font-serif text-lg font-semibold">Market context</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Harga tetap dibaca bersama indeks, yield, dan komoditas yang menggerakkannya.</p></CardContent></Card></section>
    </div>
  )
}
