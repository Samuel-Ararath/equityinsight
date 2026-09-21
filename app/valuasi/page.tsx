'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Building2, Calculator, CircleDollarSign, Landmark, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ProjectInputs = {
  name: string
  business: string
  location: string
  horizon: string
  land: string
  construction: string
  machinery: string
  licensing: string
  preOpening: string
  workingCapital: string
  contingency: string
  revenue: string
  growth: string
  cogs: string
  opex: string
  tax: string
  discount: string
}

const INITIAL: ProjectInputs = {
  name: '', business: '', location: '', horizon: '5', land: '', construction: '', machinery: '', licensing: '', preOpening: '', workingCapital: '', contingency: '10', revenue: '', growth: '5', cogs: '45', opex: '', tax: '22', discount: '12',
}

const money = (value: number) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(value || 0))}`
const number = (value: string) => Number(value.replace(/[^0-9.-]/g, '')) || 0
const npvAt = (rate: number, flows: number[]) => flows.reduce((sum, flow, index) => sum + flow / Math.pow(1 + rate, index), 0)

function irr(flows: number[]) {
  let low = -0.99
  let high = 10
  let lowValue = npvAt(low, flows)
  let highValue = npvAt(high, flows)
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) return null
  for (let index = 0; index < 100; index += 1) {
    const middle = (low + high) / 2
    const value = npvAt(middle, flows)
    if (Math.abs(value) < 0.0001) return middle
    if (lowValue * value <= 0) { high = middle; highValue = value } else { low = middle; lowValue = value }
  }
  return (low + high) / 2
}

function ProjectField({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span><div className="flex items-center rounded-lg border border-input bg-background/70 px-3 focus-within:border-gold/60"><input value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" placeholder="0" />{suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}</div></label>
}

export default function ValuasiPage() {
  const [inputs, setInputs] = useState<ProjectInputs>(INITIAL)
  const set = (key: keyof ProjectInputs) => (value: string) => setInputs((current) => ({ ...current, [key]: value }))
  const result = useMemo(() => {
    const directCapex = ['land', 'construction', 'machinery', 'licensing', 'preOpening', 'workingCapital'].reduce((sum, key) => sum + number(inputs[key as keyof ProjectInputs]), 0)
    const contingency = directCapex * number(inputs.contingency) / 100
    const investment = directCapex + contingency
    const horizon = Math.max(1, Math.min(30, Math.round(number(inputs.horizon) || 5)))
    const revenue = number(inputs.revenue)
    const growth = number(inputs.growth) / 100
    const cogs = number(inputs.cogs) / 100
    const opex = number(inputs.opex)
    const tax = number(inputs.tax) / 100
    const discount = number(inputs.discount) / 100
    const contributionMargin = 1 - cogs
    const cashFlows = [-investment]
    for (let year = 1; year <= horizon; year += 1) {
      const yearRevenue = revenue * Math.pow(1 + growth, year - 1)
      const ebit = yearRevenue * contributionMargin - opex * Math.pow(1 + growth, year - 1)
      cashFlows.push(ebit - Math.max(0, ebit * tax))
    }
    const npv = npvAt(discount, cashFlows)
    const irrValue = irr(cashFlows)
    const financeRate = discount
    const positiveFuture = cashFlows.slice(1).reduce((sum, flow, index) => sum + Math.max(0, flow) * Math.pow(1 + financeRate, horizon - index - 1), 0)
    const negativePresent = Math.abs(cashFlows[0])
    const mirr = positiveFuture > 0 && negativePresent > 0 ? Math.pow(positiveFuture / negativePresent, 1 / horizon) - 1 : null
    const breakEvenRevenue = contributionMargin > 0 ? opex / contributionMargin : 0
    let cumulative = -investment
    let payback: number | null = null
    for (let year = 1; year < cashFlows.length; year += 1) { const before = cumulative; cumulative += cashFlows[year]; if (cumulative >= 0 && cashFlows[year] > 0) { payback = year - 1 + Math.abs(before) / cashFlows[year]; break } }
    return { directCapex, contingency, investment, horizon, cashFlows, npv, irr: irrValue, mirr, breakEvenRevenue, payback, contributionMargin }
  }, [inputs])

  return <div className="space-y-6"><PageHeader title="Lab Proyek & RAB" description="Bangun model kelayakan usaha dari RAB, CAPEX, OPEX, arus kas, sampai keputusan alokasi modal—tanpa kode saham." />
    <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="space-y-4">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-gold" />Identitas proyek</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><ProjectField label="Nama usaha / proyek" value={inputs.name} onChange={set('name')} /><ProjectField label="Jenis usaha" value={inputs.business} onChange={set('business')} /><ProjectField label="Lokasi" value={inputs.location} onChange={set('location')} /><ProjectField label="Horizon model" value={inputs.horizon} onChange={set('horizon')} suffix="tahun" /></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Landmark className="size-4 text-gold" />RAB & kebutuhan investasi</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><ProjectField label="Tanah / sewa awal" value={inputs.land} onChange={set('land')} suffix="Rp" /><ProjectField label="Konstruksi / renovasi" value={inputs.construction} onChange={set('construction')} suffix="Rp" /><ProjectField label="Mesin & peralatan" value={inputs.machinery} onChange={set('machinery')} suffix="Rp" /><ProjectField label="Perizinan & legal" value={inputs.licensing} onChange={set('licensing')} suffix="Rp" /><ProjectField label="Pre-opening & IT" value={inputs.preOpening} onChange={set('preOpening')} suffix="Rp" /><ProjectField label="Modal kerja awal" value={inputs.workingCapital} onChange={set('workingCapital')} suffix="Rp" /><ProjectField label="Cadangan kontinjensi" value={inputs.contingency} onChange={set('contingency')} suffix="%" /></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CircleDollarSign className="size-4 text-gold" />Model operasi & asumsi</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><ProjectField label="Pendapatan tahun pertama" value={inputs.revenue} onChange={set('revenue')} suffix="Rp" /><ProjectField label="Pertumbuhan pendapatan" value={inputs.growth} onChange={set('growth')} suffix="%" /><ProjectField label="COGS / biaya variabel" value={inputs.cogs} onChange={set('cogs')} suffix="%" /><ProjectField label="OPEX tahunan" value={inputs.opex} onChange={set('opex')} suffix="Rp" /><ProjectField label="Pajak efektif" value={inputs.tax} onChange={set('tax')} suffix="%" /><ProjectField label="Discount rate / WACC" value={inputs.discount} onChange={set('discount')} suffix="%" /></CardContent></Card>
      </div>
      <div className="space-y-4 2xl:sticky 2xl:top-20 2xl:self-start"><Card className="border-gold/25 bg-gradient-to-br from-card to-gold/5"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="size-4 text-gold" />Hasil kelayakan proyek</CardTitle><p className="text-xs text-muted-foreground">Model diperbarui otomatis setiap perubahan input.</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Metric label="Total investasi" value={money(result.investment)} /><Metric label="NPV" value={money(result.npv)} positive={result.npv >= 0} /><Metric label="IRR" value={result.irr === null ? '—' : `${(result.irr * 100).toFixed(1)}%`} positive={result.irr !== null && result.irr >= number(inputs.discount) / 100} /><Metric label="MIRR" value={result.mirr === null ? '—' : `${(result.mirr * 100).toFixed(1)}%`} /><Metric label="BEP pendapatan / tahun" value={money(result.breakEvenRevenue)} /><Metric label="Payback" value={result.payback === null ? '—' : `${result.payback.toFixed(1)} tahun`} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Proyeksi arus kas</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="pb-2">Tahun</th><th className="pb-2 text-right">Arus kas</th><th className="pb-2 text-right">PV arus kas</th></tr></thead><tbody>{result.cashFlows.map((flow, index) => <tr key={index} className="border-b border-border/60"><td className="py-2">{index === 0 ? 'Investasi awal' : `Tahun ${index}`}</td><td className={cn('py-2 text-right tabular-nums', flow >= 0 ? 'text-positive' : 'text-negative')}>{money(flow)}</td><td className="py-2 text-right tabular-nums">{money(flow / Math.pow(1 + number(inputs.discount) / 100, index))}</td></tr>)}</tbody></table></div></CardContent></Card>
        <Card><CardContent className="flex gap-3 p-4"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" /><div><p className="text-sm font-medium">Batasan model</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Hasil ini adalah screening awal. Tambahkan volume unit, pembiayaan utang, DSCR, depresiasi, working capital tahunan, skenario, dan Monte Carlo sebelum keputusan investasi.</p></div></CardContent></Card>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">Valuasi saham dan analisis emiten tersedia di <span className="font-medium text-gold">Analisis Saham</span><ArrowRight className="size-3" /></p>
      </div>
    </div>
  </div>
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="rounded-lg border border-border bg-background/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={cn('mt-1 text-lg font-semibold tabular-nums', positive === true && 'text-positive', positive === false && 'text-negative')}>{value}</p></div>
}
