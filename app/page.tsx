'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Atom, BarChart3, Blocks, Building2, Calculator, ChartNoAxesCombined, ChevronDown, Command, Cpu, Database, LineChart, Menu, ShieldCheck, Sparkles, X } from 'lucide-react'

const domains = [
  { id: 'markets', label: 'Markets', title: 'See the whole system.', description: 'Explore markets, companies, and the forces that shape them with a clearer view of the data.', icon: ChartNoAxesCombined, stat: 'Markets & research', change: '+2.4%', positive: true, bars: [35, 48, 42, 61, 53, 70, 65, 84, 73, 92, 81, 100] },
  { id: 'companies', label: 'Companies', title: 'Build with intention.', description: 'Turn an idea into a plan with project budgets, financial scenarios, and decision-ready models.', icon: Building2, stat: 'Company builder', change: '5-year plan', positive: true, bars: [32, 37, 45, 43, 58, 54, 62, 69, 65, 82, 88, 96] },
  { id: 'engineering', label: 'Engineering', title: 'Make complexity useful.', description: 'Bring data analysis, statistical methods, and optimization tools into one practical workspace.', icon: Atom, stat: 'Engineering analytics', change: '12 tools', positive: true, bars: [42, 39, 50, 47, 60, 58, 74, 69, 82, 78, 91, 100] },
]

const modules = [
  { icon: Database, title: 'Market intelligence', detail: 'Markets, assets, macro context' },
  { icon: Calculator, title: 'Company & finance', detail: 'Valuation, RAB, financial models' },
  { icon: Cpu, title: 'Engineering tools', detail: 'Statistics, optimization, analysis' },
]

export default function Home() {
  const [active, setActive] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const domain = domains[active]
  const Icon = domain.icon

  return (
    <main className="min-h-screen overflow-hidden bg-[#090b0d] text-[#f2f0e9] selection:bg-[#c8ad72]/30">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(ellipse_at_72%_16%,rgba(137,117,75,0.2),transparent_32%),radial-gradient(ellipse_at_12%_38%,rgba(68,95,122,0.14),transparent_30%)]" />
      <header className="relative z-20 mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-14">
        <Link href="/" aria-label="Elmesia home" className="group flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-[#c8ad72]/35 bg-[#c8ad72]/10 font-serif text-lg text-[#d8c18d] transition duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">E</span>
          <span><span className="block font-serif text-[17px] font-semibold tracking-wide">Elmesia</span><span className="block text-[9px] uppercase tracking-[.24em] text-[#8d8d88]">Ideas into intelligence</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-[13px] text-[#a8a8a1] md:flex" aria-label="Navigasi utama">
          <a href="#platform" className="transition hover:text-white">Platform</a><a href="#domains" className="transition hover:text-white">Bidang</a><a href="#principles" className="transition hover:text-white">Tentang</a>
          <Link href="/dashboard" className="group inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-white transition hover:border-[#c8ad72]/60 hover:bg-white/[.04]">Masuk workspace <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
        </nav>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="grid size-10 place-items-center rounded-full border border-white/10 md:hidden" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}>{menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}</button>
        {menuOpen && <nav className="absolute inset-x-4 top-[68px] rounded-2xl border border-white/10 bg-[#111416] p-3 shadow-2xl md:hidden">{[['Platform','#platform'],['Bidang','#domains'],['Tentang','#principles'],['Masuk workspace','/dashboard']].map(([label,href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-white/80 hover:bg-white/5">{label}</a>)}</nav>}
      </header>

      <section className="relative mx-auto grid max-w-[1440px] gap-12 px-5 pb-24 pt-16 sm:px-8 md:pt-24 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-14 lg:pb-36 lg:pt-28">
        <div className="animate-[rise-in_.8s_cubic-bezier(.2,.7,.2,1)_both]">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[10px] uppercase tracking-[.2em] text-[#c8c6bd]"><Sparkles className="size-3.5 text-[#d8c18d]" />An adaptable intelligence platform</div>
          <h1 className="max-w-3xl font-serif text-[3.35rem] leading-[.99] tracking-[-.055em] text-balance sm:text-7xl lg:text-[6.2rem]">A place to <span className="bg-gradient-to-r from-[#f2eee4] via-[#d9c897] to-[#a98d52] bg-clip-text text-transparent">think</span><br />beyond boundaries.</h1>
          <p className="mt-7 max-w-xl text-[15px] leading-7 text-[#a3a49f] sm:text-[17px] sm:leading-8">Elmesia brings markets, company building, and engineering analysis into one considered environment—so complex ideas can become clear decisions.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4"><Link href="/dashboard" className="group inline-flex items-center gap-3 rounded-xl bg-[#d3bd88] px-5 py-3.5 text-sm font-semibold text-[#17150f] shadow-[0_8px_34px_rgba(200,173,114,.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e2d09f]">Enter workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link><a href="#platform" className="inline-flex items-center gap-2 px-2 py-3 text-sm text-[#d2d0c8] transition hover:text-white">Explore the platform <ChevronDown className="size-4" /></a></div>
          <div className="mt-12 flex items-center gap-3 text-xs text-[#8f918c]"><span className="grid size-7 place-items-center rounded-full border border-white/10"><Command className="size-3.5 text-[#d4c18f]" /></span>One workspace. Many disciplines.</div>
        </div>

        <div className="relative mx-auto w-full max-w-[590px] animate-[rise-in_.9s_.12s_cubic-bezier(.2,.7,.2,1)_both] lg:justify-self-end">
          <div className="absolute -inset-8 rounded-[40%] bg-[#b8a36e]/[.07] blur-[70px]" />
          <div className="relative overflow-hidden rounded-[22px] border border-white/[.12] bg-[#111416]/90 p-4 shadow-[0_40px_120px_rgba(0,0,0,.5)] backdrop-blur-2xl sm:p-5">
            <div className="flex items-center justify-between border-b border-white/[.08] pb-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl border border-[#d3bd88]/20 bg-[#d3bd88]/[.08] text-[#d3bd88]"><Icon className="size-4" /></span><div><p className="text-[10px] uppercase tracking-[.18em] text-[#92938e]">Elmesia / preview</p><p className="mt-1 text-sm font-medium">{domain.stat}</p></div></div><span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-[#b7b8b1]"><span className="size-1.5 animate-pulse rounded-full bg-[#b8c69c]" />Workspace concept</span></div>
            <div className="mt-5 flex items-end justify-between gap-4"><div key={domain.id} className="animate-[rise-in_.35s_ease-out_both]"><p className="text-xs text-[#9a9b95]">Explore a discipline</p><p className="mt-1 font-serif text-2xl tracking-tight sm:text-3xl">{domain.title}</p></div><div className="flex items-center gap-1.5 rounded-lg bg-white/[.04] px-2.5 py-1.5 text-xs text-[#c8d7b0]">{domain.positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{domain.change}</div></div>
            <div className="mt-5 flex h-[190px] items-end gap-2 overflow-hidden rounded-xl border border-white/[.07] bg-[linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.005))] px-4 pb-4 pt-8 sm:h-[220px] sm:px-6">{domain.bars.map((height,index)=><div key={`${domain.id}-${index}`} style={{height:`${height}%`,animationDelay:`${index*35}ms`}} className="group relative flex-1 animate-[bar-in_.65s_cubic-bezier(.2,.7,.2,1)_both] rounded-t-[4px] bg-gradient-to-t from-[#796843]/20 via-[#b59c62]/60 to-[#e2d09f]/90 transition duration-300 hover:brightness-125"><span className="absolute inset-x-0 top-0 h-px bg-white/70 opacity-60" /></div>)}</div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-[#777a76]"><span>Illustrative interface preview</span><span>Concept data · not live</span></div>
            <div className="mt-5 grid grid-cols-3 gap-2">{domains.map((item,index)=>{const DomainIcon=item.icon;return <button key={item.id} type="button" onClick={()=>setActive(index)} aria-pressed={active===index} className={`group flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-3 text-left transition duration-300 sm:px-3 ${active===index?'border-[#d3bd88]/35 bg-[#d3bd88]/[.08] text-[#e4d3a4]':'border-white/[.07] bg-white/[.015] text-[#92938e] hover:border-white/20 hover:bg-white/[.04]'}`}><DomainIcon className="size-3.5 shrink-0 transition-transform group-hover:scale-110"/><span className="truncate text-[10px] sm:text-xs">{item.label}</span></button>})}</div>
          </div>
          <div className="absolute -right-3 -top-4 hidden animate-[float_5s_ease-in-out_infinite] rounded-xl border border-white/10 bg-[#181b1d]/90 p-3 shadow-xl sm:block"><Blocks className="size-4 text-[#d5c28e]" /></div>
        </div>
      </section>

      <section id="platform" className="relative border-y border-white/[.08] bg-[#0d1012] px-5 py-16 sm:px-8 lg:px-14"><div className="mx-auto grid max-w-[1280px] gap-8 sm:grid-cols-3 sm:gap-4">{modules.map((item,index)=>{const ModuleIcon=item.icon;return <div key={item.title} style={{animationDelay:`${index*100}ms`}} className="group flex items-center gap-4 rounded-2xl border border-transparent p-4 transition duration-300 hover:-translate-y-1 hover:border-white/[.08] hover:bg-white/[.025]"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#d3bd88]/15 bg-[#d3bd88]/[.055] text-[#d3bd88] transition duration-300 group-hover:scale-105 group-hover:bg-[#d3bd88]/10"><ModuleIcon className="size-[18px]" /></span><div><h2 className="text-sm font-medium">{item.title}</h2><p className="mt-1 text-xs leading-5 text-[#898b86]">{item.detail}</p></div></div>})}</div></section>

      <section id="domains" className="relative mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-14 lg:py-32"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20"><div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#cdb984]">A wider field of view</p><h2 className="mt-5 max-w-md font-serif text-4xl leading-tight tracking-[-.04em] sm:text-5xl">Tools for the questions worth asking.</h2><p className="mt-5 max-w-sm text-sm leading-7 text-[#999b95]">Start in one discipline. Follow the question wherever it leads.</p><Link href="/dashboard" className="group mt-7 inline-flex items-center gap-2 text-sm text-[#e0d0a4]">Enter the workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link></div><div className="grid gap-3 sm:grid-cols-3">{domains.map((item,index)=>{const DomainIcon=item.icon;return <button type="button" key={item.id} onMouseEnter={()=>setActive(index)} onFocus={()=>setActive(index)} onClick={()=>setActive(index)} className={`group min-h-[210px] rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 ${active===index?'border-[#cdb984]/30 bg-gradient-to-br from-[#cdb984]/[.09] to-white/[.015]':'border-white/[.08] bg-white/[.015] hover:border-white/20'}`}><DomainIcon className={`size-5 transition-colors ${active===index?'text-[#d6c28c]':'text-[#8c8d87] group-hover:text-[#d6c28c]'}/><h3 className="mt-10 font-serif text-xl">{item.label}</h3><p className="mt-2 text-xs leading-5 text-[#92938e]">{item.description}</p></button>})}</div></div></section>

      <section id="principles" className="border-t border-white/[.08] bg-[radial-gradient(ellipse_at_50%_100%,rgba(168,145,90,.09),transparent_55%)] px-5 py-20 text-center sm:px-8 lg:py-28"><ShieldCheck className="mx-auto size-5 text-[#cdb984]"/><p className="mt-5 text-[10px] font-semibold uppercase tracking-[.24em] text-[#cdb984]">Thoughtful by design</p><h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl leading-tight tracking-[-.035em] sm:text-5xl">Clarity for work that crosses disciplines.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#989a94]">Elmesia is growing into a connected platform for research, planning, and analysis—built around transparent methods and useful tools.</p><Link href="/dashboard" className="group mt-8 inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm transition hover:border-[#cdb984]/50 hover:bg-white/[.03]">Explore workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-1"/></Link></section>

      <footer className="border-t border-white/[.08] px-5 py-7 text-[11px] text-[#858782] sm:px-8 lg:px-14"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-3 sm:flex-row"><Link href="/" className="font-serif text-sm text-[#d4d1c7]">Elmesia</Link><span>One environment for ideas, analysis, and decisions.</span><span>© 2026 Elmesia</span></div></footer>
    </main>
  )
}
