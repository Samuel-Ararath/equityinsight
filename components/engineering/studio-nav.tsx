'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChartNoAxesCombined, FlaskConical, Gauge, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const tools = [
  { href: '/engineering/solver', title: 'Solver', subtitle: 'Optimisasi keputusan', icon: Gauge, number: '01' },
  { href: '/engineering/quality', title: 'Quality & Statistics', subtitle: 'SPC dan kapabilitas proses', icon: FlaskConical, number: '02' },
  { href: '/engineering/data', title: 'Data Analysis', subtitle: 'Eksplorasi dan pemodelan', icon: ChartNoAxesCombined, number: '03' },
]

export function StudioNav() {
  const pathname = usePathname()
  return <div className="mb-6 overflow-x-auto rounded-2xl border border-border bg-card/60 p-1.5"><nav className="flex min-w-max gap-1" aria-label="Engineering tools">{tools.map(({ href, title, subtitle, icon: Icon, number }) => <Link key={href} href={href} className={cn('flex min-w-[220px] items-center gap-3 rounded-xl px-4 py-3 transition-colors', pathname === href ? 'bg-gold/12 text-gold' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground')}><span className="grid size-10 place-items-center rounded-xl border border-current/15"><Icon className="size-[18px]" /></span><span className="text-left"><span className="block text-sm font-semibold">{title}</span><span className="block text-[0.68rem] opacity-70">{subtitle}</span></span><span className="ml-auto self-start font-mono text-[0.6rem] opacity-50">{number}</span></Link>)}</nav></div>
}

export function ToolIntro({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-gold/[0.06] p-6 md:p-8"><div className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-[0.2em] text-gold uppercase"><Sparkles className="size-3.5" />Elmesia Engineering · {eyebrow}</div><h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{detail}</p></div>
}

