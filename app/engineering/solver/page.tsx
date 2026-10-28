'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, CircleHelp, CirclePlus, Play, RotateCcw, Sparkles } from 'lucide-react'
import { StudioNav, ToolIntro } from '@/components/engineering/studio-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Variable = { name: string; objective: string; upper: string; integer: boolean }
type Constraint = { name: string; coefficients: string[]; operator: '<=' | '>=' | '='; rhs: string }
const starterVariables: Variable[] = [{ name: 'chairs', objective: '30', upper: '', integer: true }, { name: 'tables', objective: '50', upper: '', integer: true }]
const starterConstraints: Constraint[] = [
  { name: 'carpentry', coefficients: ['1', '2'], operator: '<=', rhs: '40' },
  { name: 'finishing', coefficients: ['2', '1'], operator: '<=', rhs: '50' },
]
type SolveResult = { Status: string; ObjectiveValue?: number; Columns?: Record<string, { Primal?: number; Dual?: number }> }
const fmt = (value: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 5 }).format(value)
const cleanName = (value: string, fallback: string) => /^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(value) ? value : fallback

function term(value: number, name: string, first: boolean) {
  const sign = value < 0 ? '- ' : first ? '' : '+ '
  return `${sign}${Math.abs(value)} ${name}`
}

export default function SolverPage() {
  const [variables, setVariables] = useState(starterVariables)
  const [constraints, setConstraints] = useState(starterConstraints)
  const [sense, setSense] = useState<'Maximize' | 'Minimize'>('Maximize')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SolveResult | null>(null)
  const [error, setError] = useState('')
  const [showModel, setShowModel] = useState(false)

  const model = useMemo(() => {
    const vars = variables.map((v, i) => ({ ...v, safe: cleanName(v.name, `x${i + 1}`) }))
    const objective = vars.map((v) => Number(v.objective) || 0).map((value, i) => term(value, vars[i].safe, i === 0)).join(' ')
    const rows = constraints.map((row, ri) => {
      const expression = vars.map((v, vi) => term(Number(row.coefficients[vi]) || 0, v.safe, vi === 0)).join(' ')
      return ` ${cleanName(row.name, `c${ri + 1}`)}: ${expression} ${row.operator} ${Number(row.rhs) || 0}`
    })
    const bounds = vars.map((v) => Number.isFinite(Number(v.upper)) && v.upper !== '' ? ` ${v.safe} <= ${Math.max(0, Number(v.upper))}` : '').filter(Boolean)
    const integers = vars.filter((v) => v.integer).map((v) => v.safe)
    return `${sense}\n obj: ${objective || '0'}\nSubject To\n${rows.join('\n')}\nBounds\n ${vars.map((v) => `${v.safe} >= 0`).join('\n ')}${bounds.length ? `\n${bounds.join('\n')}` : ''}${integers.length ? `\nGenerals\n ${integers.join(' ')}` : ''}\nEnd`
  }, [variables, constraints, sense])

  function setVariable(index: number, key: keyof Variable, value: string | boolean) {
    setVariables((current) => current.map((v, i) => i === index ? { ...v, [key]: value } : v))
  }
  function updateConstraint(index: number, key: keyof Constraint, value: string, variableIndex?: number) {
    setConstraints((current) => current.map((row, i) => {
      if (i !== index) return row
      if (key === 'coefficients' && variableIndex !== undefined) return { ...row, coefficients: row.coefficients.map((coefficient, j) => j === variableIndex ? value : coefficient) }
      return { ...row, [key]: value }
    }))
  }
  function addVariable() {
    if (variables.length >= 8) return
    setVariables((current) => [...current, { name: `x${current.length + 1}`, objective: '0', upper: '', integer: false }])
    setConstraints((current) => current.map((row) => ({ ...row, coefficients: [...row.coefficients, '0'] })))
  }
  function addConstraint() {
    if (constraints.length >= 20) return
    setConstraints((current) => [...current, { name: `constraint${current.length + 1}`, coefficients: variables.map(() => '0'), operator: '<=', rhs: '0' }])
  }
  function loadExample() { setVariables(starterVariables); setConstraints(starterConstraints); setSense('Maximize'); setResult(null); setError('') }
  function solve() {
    setBusy(true); setError(''); setResult(null)
    const base = window.location.pathname.startsWith('/equityinsight/') ? '/equityinsight' : ''
    const worker = new Worker(new URL('./solver.worker.ts', import.meta.url))
    worker.onmessage = (event: MessageEvent<{ ok: boolean; solution?: SolveResult; error?: string }>) => {
      worker.terminate(); setBusy(false)
      if (event.data.ok && event.data.solution) setResult(event.data.solution)
      else setError(event.data.error || 'Solver gagal menyelesaikan model.')
    }
    worker.onerror = () => { worker.terminate(); setBusy(false); setError('Worker Solver tidak dapat dimulai. Muat ulang halaman lalu coba lagi.') }
    worker.postMessage({ model, wasmUrl: `${window.location.origin}${base}/engineering/highs.wasm` })
  }

  const isNumberOrBlank = (value: string) => value.trim() === '' || Number.isFinite(Number(value))
  const valid = variables.length > 0 && variables.every((v) => /^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(v.name) && isNumberOrBlank(v.objective) && isNumberOrBlank(v.upper)) && new Set(variables.map((v) => v.name.toLowerCase())).size === variables.length && constraints.every((row) => row.coefficients.length === variables.length && Number.isFinite(Number(row.rhs)) && row.coefficients.every(isNumberOrBlank))
  return <div className="mx-auto max-w-[1500px]"><ToolIntro eyebrow="Optimization workspace" title="Solver" detail="Susun keputusan sebagai variabel, tetapkan tujuan, lalu tambahkan batas sumber daya. HiGHS menyelesaikan model linear dan mixed-integer langsung di browser."/><StudioNav/><div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.8fr)]"><div className="space-y-4"><Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base">1 · Variabel keputusan & sasaran</CardTitle><p className="mt-1 text-xs text-muted-foreground">Apa yang boleh dipilih model, dan nilai apa yang ingin dioptimalkan?</p></div><button type="button" onClick={loadExample} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><RotateCcw className="size-3.5"/>Muat contoh</button></div></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Tujuan</span><select value={sense} onChange={(e) => setSense(e.target.value as typeof sense)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="Maximize">Maksimalkan</option><option value="Minimize">Minimalkan</option></select><span className="text-xs text-muted-foreground">Nilai sasaran = koefisien × jumlah variabel</span></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-border text-left text-[0.68rem] text-muted-foreground"><th className="p-2">Nama variabel</th><th className="p-2">Kontribusi sasaran</th><th className="p-2">Batas maksimum</th><th className="p-2 text-center">Bilangan bulat</th><th/></tr></thead><tbody>{variables.map((v, i) => <tr key={i} className="border-b border-border/60"><td className="p-2"><input aria-label={`Nama variabel ${i + 1}`} value={v.name} onChange={(e) => setVariable(i, 'name', e.target.value)} className="w-full rounded-md border border-input bg-background px-2.5 py-2 font-mono text-sm"/></td><td className="p-2"><input aria-label={`Koefisien sasaran ${i + 1}`} type="number" value={v.objective} onChange={(e) => setVariable(i, 'objective', e.target.value)} className="w-32 rounded-md border border-input bg-background px-2.5 py-2 tabular-nums"/></td><td className="p-2"><input aria-label={`Batas maksimum ${i + 1}`} type="number" min="0" placeholder="Tak terbatas" value={v.upper} onChange={(e) => setVariable(i, 'upper', e.target.value)} className="w-36 rounded-md border border-input bg-background px-2.5 py-2 tabular-nums"/></td><td className="p-2 text-center"><input aria-label={`Integer ${i + 1}`} type="checkbox" checked={v.integer} onChange={(e) => setVariable(i, 'integer', e.target.checked)} className="size-4 accent-amber-500"/></td><td>{variables.length > 1 && <button type="button" onClick={() => {setVariables((x) => x.filter((_, j) => j !== i));setConstraints((rows) => rows.map((r) => ({...r, coefficients:r.coefficients.filter((_,j)=>j!==i)})))}} className="px-2 text-muted-foreground hover:text-red-400" aria-label="Hapus variabel">×</button>}</td></tr>)}</tbody></table></div><button type="button" disabled={variables.length>=8} onClick={addVariable} className="inline-flex items-center gap-1.5 text-xs font-medium text-gold disabled:opacity-40"><CirclePlus className="size-4"/>Tambah variabel</button></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">2 · Batasan sumber daya</CardTitle><p className="text-xs text-muted-foreground">Satu baris untuk satu batasan. Contoh: 1 jam kerja meja + 2 jam kursi ≤ 40 jam.</p></CardHeader><CardContent className="space-y-4"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b border-border text-left text-[0.68rem] text-muted-foreground"><th className="p-2">Nama batasan</th>{variables.map((v,i)=><th key={i} className="p-2">Koef. {v.name||`x${i+1}`}</th>)}<th className="p-2">Relasi</th><th className="p-2">Kapasitas</th><th/></tr></thead><tbody>{constraints.map((row,ri)=><tr key={ri} className="border-b border-border/60"><td className="p-2"><input aria-label="Nama batasan" value={row.name} onChange={(e)=>updateConstraint(ri,'name',e.target.value)} className="w-32 rounded-md border border-input bg-background px-2 py-2 font-mono text-xs"/></td>{variables.map((v,vi)=><td key={vi} className="p-2"><input aria-label={`${row.name}: koefisien ${v.name}`} type="number" value={row.coefficients[vi]??'0'} onChange={(e)=>updateConstraint(ri,'coefficients',e.target.value,vi)} className="w-24 rounded-md border border-input bg-background px-2 py-2 tabular-nums"/></td>)}<td className="p-2"><select value={row.operator} onChange={(e)=>updateConstraint(ri,'operator',e.target.value)} className="rounded-md border border-input bg-background px-2 py-2"><option value="<=">≤</option><option value=">=">≥</option><option value="=">=</option></select></td><td className="p-2"><input aria-label={`Kapasitas ${row.name}`} type="number" value={row.rhs} onChange={(e)=>updateConstraint(ri,'rhs',e.target.value)} className="w-28 rounded-md border border-input bg-background px-2 py-2 tabular-nums"/></td><td>{constraints.length>1&&<button type="button" onClick={()=>setConstraints((x)=>x.filter((_,j)=>j!==ri))} className="px-2 text-muted-foreground hover:text-red-400" aria-label="Hapus batasan">×</button>}</td></tr>)}</tbody></table></div><button type="button" disabled={constraints.length>=20} onClick={addConstraint} className="inline-flex items-center gap-1.5 text-xs font-medium text-gold disabled:opacity-40"><CirclePlus className="size-4"/>Tambah batasan</button><div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="max-w-md text-[0.68rem] leading-relaxed text-muted-foreground">Integer aktif berarti solusi variabel berupa bilangan bulat. Batas maksimum yang kosong berarti tak terbatas. Solver mendukung LP dan MILP; model nonlinear belum didukung.</p><Button type="button" onClick={solve} disabled={!valid||busy} className="min-w-40"><Play className="size-4"/>{busy?'Mengoptimalkan…':'Jalankan Solver'}</Button></div></CardContent></Card></div>
      <div className="space-y-4 xl:sticky xl:top-20"><Card className="overflow-hidden"><div className="border-b border-border bg-gradient-to-r from-gold/10 to-transparent p-5"><p className="text-[0.62rem] font-semibold tracking-[0.18em] text-gold uppercase">Solver output</p><h2 className="mt-1 font-serif text-xl font-semibold">Hasil optimisasi</h2></div><CardContent className="p-5">{busy?<div className="space-y-3 py-5 text-sm text-muted-foreground"><div className="mx-auto size-7 animate-spin rounded-full border-2 border-gold/20 border-t-gold"/>Menginisialisasi mesin HiGHS…</div>:error?<div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"><AlertTriangle className="mb-2 size-4"/>{error}</div>:result?<div className="space-y-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Status solusi</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${result.Status==='Optimal'?'bg-emerald-500/10 text-emerald-400':'bg-amber-500/10 text-amber-400'}`}>{result.Status}</span></div>{result.Status==='Optimal'&&<><div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-4"><p className="text-xs text-muted-foreground">Nilai sasaran optimum</p><p className="mt-1 font-serif text-3xl font-semibold tabular-nums text-gold">{fmt(result.ObjectiveValue??NaN)}</p></div><div><p className="mb-2 text-xs font-medium text-muted-foreground">Keputusan tiap variabel</p>{variables.map((v,i)=>{const key=cleanName(v.name,`x${i+1}`);return <div key={key} className="flex justify-between border-b border-border/60 py-2 text-sm"><span className="font-mono">{key}</span><b className="tabular-nums">{fmt(result.Columns?.[key]?.Primal??NaN)}</b></div>})}</div><p className="text-[0.68rem] leading-relaxed text-muted-foreground">Solusi matematis untuk model dan data yang dimasukkan. Validasi asumsi, satuan, dan kelayakan operasional sebelum dipakai.</p></>}</div>:<div className="py-5 text-center"><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground"><CircleHelp className="size-5"/></span><p className="mt-3 text-sm font-medium">Siap menyelesaikan model</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Isi variabel dan batasan, lalu pilih Jalankan Solver. Gunakan contoh kursi dan meja untuk mencoba.</p></div>}<button type="button" onClick={()=>setShowModel((x)=>!x)} className="mt-4 flex w-full items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground hover:text-foreground">Tinjau model LP yang dikirim {showModel?<ArrowUp className="size-3.5"/>:<ArrowDown className="size-3.5"/>}</button>{showModel&&<pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-background p-3 text-[0.68rem] leading-relaxed text-muted-foreground">{model}</pre>}</CardContent></Card><div className="rounded-xl border border-border bg-card/50 p-4"><div className="flex items-center gap-2 text-xs font-medium"><Sparkles className="size-3.5 text-gold"/>Contoh interpretasi</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Jika suatu batasan mengikat pada kapasitas penuh, kapasitas itu dapat membatasi hasil optimum. Jalankan ulang dengan kapasitas berbeda untuk mengeksplorasi dampak perubahan sumber daya.</p></div></div></div></div>
}

