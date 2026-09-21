'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CloudDownload, ExternalLink, FileWarning, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FINANCIAL_FACT_LABELS, getFinancialHistory, getLatestFinancialSnapshot, syncFinancialData, FACT_TO_FINANCIAL_FIELD, REQUIRED_FINANCIAL_FACTS, type FinancialDataQuality, type FinancialSnapshot } from '@/lib/financial-data'
import type { FinancialData } from '@/lib/types'
import { getAssetBySymbol, getLatestQuote } from '@/lib/market-data'

function formatDate(value: string | null | undefined) {
  if (!value) return 'Belum tersedia'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

export function AutoFinancialImport({ symbol, onApply, onQuality }: { symbol: string; onApply: (patch: Partial<FinancialData>) => void; onQuality: (quality: FinancialDataQuality) => void }) {
  const [loading, setLoading] = useState(false)
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null)
  const [history, setHistory] = useState<FinancialSnapshot[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function importLatest(silent = false) {
    const normalized = symbol.trim().toUpperCase()
    if (!normalized) { setError('Masukkan kode saham terlebih dahulu.'); return }
    setLoading(true); setError(null); setMessage(null)
    try {
      await syncFinancialData(normalized)
      const [next, nextHistory] = await Promise.all([getLatestFinancialSnapshot(normalized), getFinancialHistory(normalized)])
      if (!next) throw new Error('Laporan tersimpan tetapi belum dapat dibaca dari database.')
      const patch: Partial<FinancialData> = {}
      let applied = 0
      for (const fact of next.facts) {
        const field = FACT_TO_FINANCIAL_FIELD[fact.metric_key] as keyof FinancialData | undefined
        if (field && typeof fact.value === 'number' && Number.isFinite(fact.value)) { patch[field] = fact.value as never; applied += 1 }
      }
      const asset = await getAssetBySymbol(normalized)
      const quote = asset ? await getLatestQuote(asset.id) : null
      if (quote?.price !== null && quote?.price !== undefined) { patch.hargaSaham = quote.price; applied += 1 }
      const missingKeys = REQUIRED_FINANCIAL_FACTS.filter((key) => !next.facts.some((fact) => fact.metric_key === key))
      onQuality({ complete: missingKeys.length === 0, missingFields: missingKeys.map((key) => FINANCIAL_FACT_LABELS[key] ?? key), confidence: next.confidence, source: next.source, periodEnd: next.period_end, fetchedAt: new Date().toISOString() })
      onApply(patch)
      setSnapshot(next)
      setHistory(nextHistory)
      setMessage(`${applied} pos laporan dan harga pasar dipetakan ke formulir valuasi${silent ? ' (pemeriksaan otomatis)' : ''}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Laporan belum dapat diambil.') }
    finally { setLoading(false) }
  }

  const missingFacts = snapshot ? REQUIRED_FINANCIAL_FACTS.filter((key) => !snapshot.facts.some((fact) => fact.metric_key === key)).map((key) => FINANCIAL_FACT_LABELS[key] ?? key) : []

  useEffect(() => {
    const normalized = symbol.trim()
    if (normalized.length < 2) return
    const timer = window.setTimeout(() => { void importLatest(true) }, 1200)
    return () => window.clearTimeout(timer)
    // The symbol is the only trigger; importLatest intentionally reads the current form symbol.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader className="flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><CloudDownload className="size-5" /></span><div><CardTitle className="text-base">Ambil laporan terbaru</CardTitle><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Cari otomatis dari SEC EDGAR untuk saham AS atau provider publik untuk saham IDX.</p></div></div>
        <Button type="button" size="sm" onClick={() => void importLatest()} disabled={loading || !symbol.trim()}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <CloudDownload className="size-4" />}{loading ? 'Mengambil…' : 'Ambil data'}</Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {error && <div className="flex items-start gap-2 rounded-lg border border-negative/30 bg-negative/10 p-3 text-xs text-negative"><FileWarning className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
        {message && <div className="flex items-start gap-2 rounded-lg border border-positive/30 bg-positive/10 p-3 text-xs text-positive"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><span>{message}</span></div>}
        {snapshot ? <div className="rounded-lg border border-border/80 bg-background/35 p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={snapshot.confidence === 'verified' ? 'positive' : 'warning'}>{snapshot.confidence === 'verified' ? 'Verified' : 'Estimated'}</Badge><span className="text-sm font-medium">{snapshot.period_label}</span><span className="text-xs text-muted-foreground">{snapshot.facts.length} pos</span></div><div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><span>Periode berakhir: <b className="text-foreground">{formatDate(snapshot.period_end)}</b></span><span>Diambil: <b className="text-foreground">{formatDate(snapshot.filed_at)}</b></span></div><div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" />{snapshot.source}{snapshot.source_url && <a href={snapshot.source_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">Buka sumber <ExternalLink className="size-3" /></a>}</div>{missingFacts.length > 0 && <div className="mt-3 rounded-md border border-yellow-500/25 bg-yellow-500/5 p-2 text-xs text-yellow-200">Belum tersedia dari sumber ini: {missingFacts.join(', ')}. Angka tersebut tetap bisa diisi manual atau diambil dari sumber alternatif.</div>}{history.length > 1 && <div className="mt-4 overflow-x-auto"><p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Riwayat laporan yang tersimpan</p><table className="w-full min-w-[520px] text-xs"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2 pr-4 font-medium">Periode</th><th className="py-2 pr-4 font-medium">Revenue</th><th className="py-2 pr-4 font-medium">Net income</th><th className="py-2 pr-4 font-medium">EPS</th><th className="py-2 font-medium">Sumber</th></tr></thead><tbody>{history.map((item) => { const byKey = Object.fromEntries(item.facts.map((fact) => [fact.metric_key, fact.value])); return <tr key={item.id} className="border-b border-border/60 last:border-0"><td className="py-2 pr-4 font-medium text-foreground">{item.period_label}</td><td className="py-2 pr-4 tabular-nums">{typeof byKey.revenue === 'number' ? new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(byKey.revenue) : '—'}</td><td className="py-2 pr-4 tabular-nums">{typeof byKey.net_income === 'number' ? new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(byKey.net_income) : '—'}</td><td className="py-2 pr-4 tabular-nums">{typeof byKey.eps === 'number' ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(byKey.eps) : '—'}</td><td className="py-2 text-muted-foreground">{item.confidence}</td></tr> })}</tbody></table></div>}</div> : <p className={cn('text-xs text-muted-foreground', !symbol.trim() && 'opacity-60')}>Isi kode saham, lalu klik Ambil data. Angka otomatis tetap dapat dikoreksi manual.</p>}
      </CardContent>
    </Card>
  )
}
