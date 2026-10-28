import Link from 'next/link'
import { ArrowRight, BarChart3, CircleDollarSign, LineChart, ShieldCheck } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0b0d] text-[#f0ede6]">
      <div className="absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(circle_at_75%_5%,rgba(200,173,114,0.18),transparent_28%),radial-gradient(circle_at_10%_28%,rgba(49,95,229,0.13),transparent_30%)]" />
      <header className="relative mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg border border-[#c8ad72]/50 bg-[#c8ad72]/10 font-serif text-lg font-semibold text-[#c8ad72]">A</span>
          <span><span className="block font-serif text-base font-semibold">EquityInsight</span><span className="block text-[0.6rem] uppercase tracking-[0.2em] text-[#98958e]">Fundamental intelligence</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[#98958e] md:flex" aria-label="Primary navigation">
          <a href="#approach" className="transition-colors hover:text-[#f0ede6]">Approach</a>
          <a href="#modules" className="transition-colors hover:text-[#f0ede6]">Modules</a>
          <Link href="/dashboard" className="rounded-full border border-[#c8ad72]/45 px-4 py-2 text-[#ecd49c] transition-colors hover:bg-[#c8ad72]/10">Open workspace <ArrowRight className="ml-2 inline size-3.5" /></Link>
        </nav>
        <Link href="/dashboard" className="text-sm text-[#ecd49c] md:hidden">Enter <ArrowRight className="ml-1 inline size-4" /></Link>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-16 px-6 pb-28 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-40 lg:pt-28">
        <div>
          <p className="mb-7 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#c8ad72]">A calmer way to read the market</p>
          <h1 className="max-w-3xl font-serif text-5xl leading-[1.02] tracking-[-0.045em] text-balance sm:text-7xl lg:text-[6.7rem]">Research with <em className="text-[#c8ad72]">conviction.</em></h1>
          <p className="mt-8 max-w-xl text-base leading-8 text-[#98958e] sm:text-lg">EquityInsight brings market context, company fundamentals, and valuation scenarios into one considered workspace for long-term investors.</p>
          <div className="mt-10 flex flex-wrap items-center gap-5"><Link href="/dashboard" className="rounded-lg bg-[#c8ad72] px-5 py-3.5 text-sm font-semibold text-[#17130b] transition-transform hover:-translate-y-0.5">Enter the workspace <ArrowRight className="ml-2 inline size-4" /></Link><a href="#approach" className="text-sm text-[#d4d0c6] underline decoration-[#c8ad72]/50 underline-offset-8">See how it works</a></div>
          <div className="mt-14 flex items-center gap-3 text-xs text-[#98958e]"><span className="size-2 rounded-full bg-[#62c79a] shadow-[0_0_14px_#62c79a]" />Built for patient, evidence-led decisions</div>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-8 rounded-full bg-[#c8ad72]/[0.06] blur-3xl" />
          <div className="relative rounded-2xl border border-[#e2d7bb]/15 bg-[#121417]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between border-b border-[#e2d7bb]/10 pb-5"><div><p className="text-xs text-[#98958e]">Research overview</p><p className="mt-1 font-serif text-xl">Astra International</p></div><span className="rounded-full bg-[#62c79a]/10 px-2.5 py-1 text-[0.65rem] text-[#62c79a]">In focus</span></div>
            <div className="grid grid-cols-3 gap-3 py-6"><div><p className="text-[0.6rem] uppercase tracking-wider text-[#98958e]">Last price</p><p className="mt-2 font-serif text-xl">Rp 6,425</p></div><div><p className="text-[0.6rem] uppercase tracking-wider text-[#98958e]">Fair value</p><p className="mt-2 font-serif text-xl text-[#62c79a]">Rp 8,120</p></div><div><p className="text-[0.6rem] uppercase tracking-wider text-[#98958e]">Margin</p><p className="mt-2 font-serif text-xl text-[#c8ad72]">26.4%</p></div></div>
            <div className="h-36 overflow-hidden rounded-xl border border-[#e2d7bb]/10 bg-[#0a0b0d] p-4"><svg viewBox="0 0 500 140" className="h-full w-full" role="img" aria-label="Illustrative rising price chart"><path d="M0 114 C48 110 58 84 96 95 S145 78 176 91 S216 54 254 69 S290 42 326 58 S360 36 394 45 S430 18 500 25" fill="none" stroke="#c8ad72" strokeWidth="3" /><path d="M0 114 C48 110 58 84 96 95 S145 78 176 91 S216 54 254 69 S290 42 326 58 S360 36 394 45 S430 18 500 25 V140 H0Z" fill="url(#chartFill)" opacity=".35" /><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#c8ad72" /><stop offset="1" stopColor="#c8ad72" stopOpacity="0" /></linearGradient></defs></svg></div>
            <p className="mt-4 text-[0.65rem] text-[#98958e]">Illustrative workspace preview · delayed market data</p>
          </div>
        </div>
      </section>

      <section id="approach" className="relative border-y border-[#e2d7bb]/10 bg-[#0d0f11] px-6 py-24 lg:px-10 lg:py-32"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]"><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#c8ad72]">The EquityInsight approach</p><h2 className="mt-5 max-w-md font-serif text-4xl leading-tight tracking-[-.035em] sm:text-5xl">Less noise. <span className="text-[#98958e]">More signal.</span></h2></div><div className="grid gap-8 sm:grid-cols-3"><div><BarChart3 className="mb-5 size-5 text-[#c8ad72]" /><h3 className="font-serif text-xl">Context first</h3><p className="mt-3 text-sm leading-7 text-[#98958e]">Read price movement alongside macro indicators, yields, and commodities.</p></div><div><CircleDollarSign className="mb-5 size-5 text-[#c8ad72]" /><h3 className="font-serif text-xl">Value by scenario</h3><p className="mt-3 text-sm leading-7 text-[#98958e]">Make assumptions visible with DCF, Graham, DDM, PER, and PBV models.</p></div><div><ShieldCheck className="mb-5 size-5 text-[#c8ad72]" /><h3 className="font-serif text-xl">Integrity built in</h3><p className="mt-3 text-sm leading-7 text-[#98958e]">Keep estimates honest with transparent inputs, delayed-data labels, and clear caveats.</p></div></div></div></div></section>

      <section id="modules" className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#c8ad72]">Inside the workspace</p><h2 className="mt-4 font-serif text-4xl tracking-[-.035em] sm:text-5xl">A focused set of tools.</h2></div><Link href="/dashboard" className="text-sm text-[#ecd49c]">Explore all modules <ArrowRight className="ml-2 inline size-4" /></Link></div><div className="mt-12 grid gap-4 md:grid-cols-3"><Link href="/data-pasar" className="group rounded-xl border border-[#e2d7bb]/12 bg-[#121417] p-6 transition-colors hover:border-[#c8ad72]/50"><LineChart className="size-5 text-[#c8ad72]" /><h3 className="mt-14 font-serif text-2xl">Market Terminal</h3><p className="mt-3 text-sm leading-7 text-[#98958e]">IDX assets, US indices, Treasury yields, and commodities in one view.</p><span className="mt-8 block text-sm text-[#c8ad72] opacity-0 transition-opacity group-hover:opacity-100">Open module <ArrowRight className="ml-1 inline size-3.5" /></span></Link><Link href="/valuasi" className="group rounded-xl border border-[#e2d7bb]/12 bg-[#121417] p-6 transition-colors hover:border-[#c8ad72]/50"><CircleDollarSign className="size-5 text-[#c8ad72]" /><h3 className="mt-14 font-serif text-2xl">Valuation Lab</h3><p className="mt-3 text-sm leading-7 text-[#98958e]">Model intrinsic value and margin of safety across multiple methods.</p><span className="mt-8 block text-sm text-[#c8ad72] opacity-0 transition-opacity group-hover:opacity-100">Open module <ArrowRight className="ml-1 inline size-3.5" /></span></Link><Link href="/kinerja" className="group rounded-xl border border-[#e2d7bb]/12 bg-[#121417] p-6 transition-colors hover:border-[#c8ad72]/50"><BarChart3 className="size-5 text-[#c8ad72]" /><h3 className="mt-14 font-serif text-2xl">Fundamental Performance</h3><p className="mt-3 text-sm leading-7 text-[#98958e]">Make profitability, solvency, liquidity, and efficiency easier to read.</p><span className="mt-8 block text-sm text-[#c8ad72] opacity-0 transition-opacity group-hover:opacity-100">Open module <ArrowRight className="ml-1 inline size-3.5" /></span></Link></div></section>
      <footer className="border-t border-[#e2d7bb]/10 px-6 py-8 text-xs text-[#98958e] lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row"><span>© 2026 EquityInsight</span><span>Analytical estimates, not investment advice.</span></div></footer>
    </main>
  )
}
