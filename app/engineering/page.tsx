'use client'

import { useMemo, useState } from 'react'
import { Activity, Calculator, Gauge, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function parseSeries(value: string) {
  return value.trim() ? value.split(/[\s,;]+/).map(Number).filter(Number.isFinite) : []
}

function solveLinear(matrix: number[][], rhs: number[]) {
  const n = rhs.length
  const a = matrix.map((row, i) => [...row, rhs[i]])
  for (let col = 0; col < n; col += 1) {
    let pivot = col
    for (let row = col + 1; row < n; row += 1) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row
    if (Math.abs(a[pivot][col]) < 1e-12) return { solution: null as number[] | null, message: 'Matriks singular atau tidak memiliki solusi unik.' }
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    const divisor = a[col][col]
    for (let j = col; j <= n; j += 1) a[col][j] /= divisor
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue
      const factor = a[row][col]
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j]
    }
  }
  return { solution: a.map((row) => row[n]), message: 'Diselesaikan dengan eliminasi Gauss-Jordan dan partial pivoting.' }
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-xs text-muted-foreground">{label}<textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="mt-1.5 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-gold/60" /></label>
}

export default function EngineeringPage() {
  const [matrixText, setMatrixText] = useState('3, 2\n1, -1')
  const [rhsText, setRhsText] = useState('12, 1')
  const [seriesText, setSeriesText] = useState('12, 14, 13, 15, 16, 14, 17, 18, 16, 19')
  const result = useMemo(() => {
    const rows = matrixText.trim().split(/\n+/).map((line) => parseSeries(line))
    const rhs = parseSeries(rhsText)
    if (!rows.length || rows.some((row) => row.length !== rows.length) || rhs.length !== rows.length) return { solution: null, message: 'Masukkan matriks persegi dan satu nilai ruas kanan per baris.' }
    return solveLinear(rows, rhs)
  }, [matrixText, rhsText])
  const stats = useMemo(() => {
    const x = parseSeries(seriesText).sort((a, b) => a - b)
    if (!x.length) return null
    const mean = x.reduce((a, b) => a + b, 0) / x.length
    const variance = x.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, x.length - 1)
    const median = x.length % 2 ? x[(x.length - 1) / 2] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2
    const sigma = Math.sqrt(variance)
    return { n: x.length, mean, median, sigma, min: x[0], max: x.at(-1)!, lcl: mean - 3 * sigma, ucl: mean + 3 * sigma }
  }, [seriesText])
  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 }).format(n)

  return <div className="space-y-6">
    <PageHeader title="Engineering Workbench" description="Kalkulator teknik dan analitik yang dibuat khusus untuk Elmesia. Input diproses di browser; data tidak dikirim atau disimpan." />
    <div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="size-4 text-gold" />Penyelesaian sistem linear</CardTitle><p className="text-xs text-muted-foreground">Ax = b · matriks persegi, metode Gauss-Jordan dengan pemilihan pivot.</p></CardHeader><CardContent className="space-y-4"><Field label="Matriks A · satu baris per baris matriks" value={matrixText} onChange={setMatrixText} placeholder={'3, 2\n1, -1'} /><Field label="Vektor b" value={rhsText} onChange={setRhsText} placeholder="12, 1" />{result.solution ? <div className="rounded-xl border border-gold/20 bg-gold/5 p-4"><p className="text-xs text-muted-foreground">Solusi x</p><div className="mt-2 flex flex-wrap gap-2">{result.solution.map((n, i) => <span key={i} className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm">x{i + 1} = {fmt(n)}</span>)}</div><p className="mt-3 text-[0.68rem] text-muted-foreground">{result.message} Periksa kembali satuan, kondisi matriks, dan residu sebelum memakai untuk keputusan desain.</p></div> : <p className="rounded-lg bg-muted/50 p-3 text-xs text-amber-600">{result.message}</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-gold" />Statistik deskriptif & kendali proses</CardTitle><p className="text-xs text-muted-foreground">Ringkasan sampel dan batas kendali 3σ sederhana. Pisahkan subgrup bila proses memerlukannya.</p></CardHeader><CardContent className="space-y-4"><Field label="Observasi · pisahkan dengan koma, spasi, titik koma, atau baris baru" value={seriesText} onChange={setSeriesText} />{stats ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[['n', stats.n], ['Rata-rata', fmt(stats.mean)], ['Median', fmt(stats.median)], ['Simpangan baku sampel', fmt(stats.sigma)], ['Minimum / maksimum', `${fmt(stats.min)} / ${fmt(stats.max)}`], ['Batas kendali LCL / UCL', `${fmt(stats.lcl)} / ${fmt(stats.ucl)}`]].map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-background/40 p-3"><p className="text-[0.68rem] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>)}</div> : <p className="text-xs text-muted-foreground">Masukkan angka untuk menghitung.</p>}<p className="text-[0.68rem] leading-relaxed text-muted-foreground">Batas 3σ di atas dihitung dari seluruh data sebagai ringkasan eksploratif, bukan peta kendali tervalidasi. Untuk peta X̄-R, X̄-S, p, np, c, atau u dibutuhkan data subgrup dan asumsi sampling yang tepat.</p></CardContent></Card>
      <Card className="xl:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gauge className="size-4 text-gold" />Ruang kerja berikutnya</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3">{[['Optimisasi', 'Linear programming, kendala, objective dan analisis sensitivitas.'], ['DOE & regresi', 'Desain eksperimen, ANOVA, regresi dengan diagnostik residual.'], ['Engineering economics', 'NPV, annual worth, penggantian aset, depresiasi dan skenario.']].map(([title, copy]) => <div key={title} className="rounded-xl border border-border p-4"><Wrench className="size-4 text-gold"/><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p><span className="mt-3 inline-block text-[0.65rem] uppercase tracking-wider text-muted-foreground">Dalam pengembangan</span></div>)}</div></CardContent></Card>
    </div>
  </div>
}

