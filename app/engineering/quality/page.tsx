'use client'

import { useMemo, useState } from 'react'
import { Activity, FileUp, Info, RotateCcw, Sigma } from 'lucide-react'
import { StudioNav, ToolIntro } from '@/components/engineering/studio-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const initial = '24.8\n25.1\n24.9\n25.2\n25.0\n25.3\n24.7\n25.1\n25.0\n24.9\n25.2\n25.1\n24.8\n25.0\n25.2\n24.9\n25.1\n25.0\n24.8\n25.3'
function numbers(input: string) { return input.trim() ? input.split(/[\s,;]+/).map(Number).filter(Number.isFinite) : [] }
const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 })

function Metric({ label, value, note }: { label: string; value: string; note?: string }) { return <div className="rounded-xl border border-border bg-background/50 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>{note&&<p className="mt-1 text-[0.65rem] text-muted-foreground">{note}</p>}</div> }

export default function QualityPage() {
  const [text, setText] = useState(initial)
  const [lsl, setLsl] = useState('24')
  const [target, setTarget] = useState('25')
  const [usl, setUsl] = useState('26')
  const data = useMemo(() => {
    const x = numbers(text)
    if (x.length < 2) return null
    const n = x.length, mean = x.reduce((a,b)=>a+b,0)/n
    const overall = Math.sqrt(x.reduce((s,v)=>s+(v-mean)**2,0)/(n-1))
    const moving = x.slice(1).map((v,i)=>Math.abs(v-x[i]))
    const mrBar = moving.reduce((a,b)=>a+b,0)/moving.length
    const within = mrBar/1.128
    const lcl = mean-3*within, ucl=mean+3*within
    const mrUcl=3.267*mrBar
    const low=Number(lsl), high=Number(usl), center=Number(target)
    const specs = Number.isFinite(low)&&Number.isFinite(high)&&high>low
    const cp=specs&&within>0?(high-low)/(6*within):NaN
    const cpk=specs&&within>0?Math.min((high-mean)/(3*within),(mean-low)/(3*within)):NaN
    const pp=specs&&overall>0?(high-low)/(6*overall):NaN
    const ppk=specs&&overall>0?Math.min((high-mean)/(3*overall),(mean-low)/(3*overall)):NaN
    const cpm=specs&&overall>0&&Number.isFinite(center)?(high-low)/(6*Math.sqrt(overall**2+(mean-center)**2)):NaN
    const outliers=x.map((v,i)=>({v,i})).filter(({v})=>v<lcl||v>ucl)
    const mrOutliers=moving.filter(v=>v>mrUcl).length
    return {x,n,mean,overall,mrBar,within,lcl,ucl,mrUcl,cp,cpk,pp,ppk,cpm,outliers,mrOutliers}
  },[text,lsl,target,usl])
  const chart = useMemo(()=>{
    if(!data) return null
    const width=700,height=190,pad=26,min=Math.min(...data.x,data.lcl),max=Math.max(...data.x,data.ucl),span=max-min||1
    const points=data.x.map((v,i)=>`${pad+i*(width-2*pad)/(data.n-1)},${height-pad-(v-min)*(height-2*pad)/span}`).join(' ')
    const y=(v:number)=>height-pad-(v-min)*(height-2*pad)/span
    return {width,height,pad,points,y}
  },[data])
  async function importFile(file?: File) { if(file) { const lines=await file.text(); const firstNumericColumn=lines.split(/\r?\n/).map((line)=>line.split(/[;,\t]+/).map((cell)=>Number(cell.trim())).find(Number.isFinite)).filter((value): value is number=>value!==undefined); setText(firstNumericColumn.join('\n')) } }
  const pretty=(v:number)=>Number.isFinite(v)?nf.format(v):'—'

  return <div className="mx-auto max-w-[1500px]"><ToolIntro eyebrow="Process quality" title="Quality & Statistics" detail="Baca kestabilan proses dan kapabilitasnya. Tempel observasi berurutan atau impor CSV, lalu tetapkan batas spesifikasi dari kebutuhan produk."/><StudioNav/><div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]"><div className="space-y-4"><Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Data pengukuran berurutan</CardTitle><p className="mt-1 text-xs text-muted-foreground">Satu karakteristik per analisis · baris berurutan dari waktu pengambilan.</p></div><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:border-gold/40"><FileUp className="size-3.5"/>Impor CSV<input type="file" accept=".csv,.txt,text/plain,text/csv" className="hidden" onChange={(e)=>void importFile(e.target.files?.[0])}/></label></div></CardHeader><CardContent><textarea value={text} onChange={(e)=>setText(e.target.value)} rows={10} className="w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-gold/60" placeholder="Tempel pengukuran di sini, satu nilai per baris"/><p className="mt-2 text-[0.68rem] text-muted-foreground">Tempel satu kolom nilai. Saat impor CSV, kolom numerik pertama dipilih otomatis; baris header dilewati.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{[{label:'LSL',value:lsl,set:setLsl},{label:'Target',value:target,set:setTarget},{label:'USL',value:usl,set:setUsl}].map(({label,value,set})=><label key={label} className="text-xs text-muted-foreground">Batas {label}<input type="number" value={value} onChange={(e)=>set(e.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm tabular-nums text-foreground"/></label>)}</div><button type="button" onClick={()=>{setText(initial);setLsl('24');setTarget('25');setUsl('26')}} className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><RotateCcw className="size-3.5"/>Pulihkan data contoh</button></CardContent></Card>
      {chart&&data&&<Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-gold"/>Individuals chart (I)</CardTitle><p className="text-xs text-muted-foreground">Garis tengah dan batas kendali dihitung dari moving range dua observasi.</p></CardHeader><CardContent><div className="overflow-x-auto"><svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-auto min-w-[600px] w-full" role="img" aria-label="Individuals control chart"><line x1={chart.pad} x2={chart.width-chart.pad} y1={chart.y(data.ucl)} y2={chart.y(data.ucl)} stroke="#e45b5b" strokeDasharray="6 5"/><line x1={chart.pad} x2={chart.width-chart.pad} y1={chart.y(data.mean)} y2={chart.y(data.mean)} stroke="#c9a45a" strokeDasharray="5 5"/><line x1={chart.pad} x2={chart.width-chart.pad} y1={chart.y(data.lcl)} y2={chart.y(data.lcl)} stroke="#e45b5b" strokeDasharray="6 5"/><polyline points={chart.points} fill="none" stroke="#6db8b0" strokeWidth="2"/>{data.x.map((v,i)=>{const x=chart.pad+i*(chart.width-2*chart.pad)/(data.n-1);const flagged=v<data.lcl||v>data.ucl;return <circle key={i} cx={x} cy={chart.y(v)} r={flagged?4:2.6} fill={flagged?'#ef6565':'#6db8b0'}/>})}<text x={chart.pad+4} y={chart.y(data.ucl)-6} fill="#ef7777" fontSize="10">UCL {pretty(data.ucl)}</text><text x={chart.pad+4} y={chart.y(data.mean)-6} fill="#c9a45a" fontSize="10">CL {pretty(data.mean)}</text><text x={chart.pad+4} y={chart.y(data.lcl)-6} fill="#ef7777" fontSize="10">LCL {pretty(data.lcl)}</text></svg></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric label="Observasi" value={String(data.n)}/><Metric label="Rata-rata proses" value={pretty(data.mean)}/><Metric label="Poin di luar batas" value={String(data.outliers.length)} note="Sinyal titik 3σ sederhana"/></div></CardContent></Card>}</div>
      <div className="space-y-4 xl:sticky xl:top-20"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sigma className="size-4 text-gold"/>Kapabilitas proses</CardTitle><p className="text-xs text-muted-foreground">Indeks dalam-proses memakai estimasi σ dari moving range; kinerja keseluruhan memakai simpangan baku sampel.</p></CardHeader><CardContent>{data?<><div className="grid grid-cols-2 gap-2"><Metric label="Cp" value={pretty(data.cp)} note="Potensi, proses terpusat"/><Metric label="Cpk" value={pretty(data.cpk)} note="Potensi, memperhitungkan posisi"/><Metric label="Pp" value={pretty(data.pp)} note="Kinerja keseluruhan"/><Metric label="Ppk" value={pretty(data.ppk)} note="Kinerja & posisi keseluruhan"/></div><div className="mt-3 rounded-xl border border-border bg-background/50 p-4"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Indeks Cpm (target)</span><b className="tabular-nums">{pretty(data.cpm)}</b></div><div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs"><span className="text-muted-foreground">Rata-rata moving range</span><b className="tabular-nums">{pretty(data.mrBar)}</b></div><div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Moving range di atas UCL</span><b className="tabular-nums">{data.mrOutliers}</b></div></div><div className="mt-3 flex gap-2 rounded-xl bg-gold/5 p-3 text-[0.68rem] leading-relaxed text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0 text-gold"/>Batas kapabilitas sebaiknya ditafsirkan setelah proses terbukti stabil dan asumsi distribusi diperiksa. Indeks ini mengasumsikan pendekatan normal; bukan jaminan tingkat cacat.</div></>:<p className="text-sm text-muted-foreground">Masukkan sedikitnya dua pengukuran untuk memulai.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Cara membaca cepat</CardTitle></CardHeader><CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground"><p><b className="text-foreground">Cp vs Cpk:</b> Cp membandingkan lebar spesifikasi dengan variasi proses; Cpk juga menghukum proses yang tidak berada di tengah target.</p><p><b className="text-foreground">Pp vs Ppk:</b> memakai variasi keseluruhan dan menangkap pergeseran antarwaktu.</p><p><b className="text-foreground">Titik di luar batas:</b> periksa urutan waktu, subgroup, perubahan bahan/mesin, dan sistem pengukuran sebelum mengubah proses.</p></CardContent></Card></div></div></div>
}

