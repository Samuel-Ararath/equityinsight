'use client'

import { Clock3, RadioTower, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ResearchIntegrityCard() {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="flex-row items-center gap-3 pb-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-gold/10 text-gold"><ShieldCheck className="size-4" /></span>
        <div><CardTitle className="text-sm">Research integrity protocol</CardTitle><p className="mt-1 text-xs text-muted-foreground">EquityInsight tidak mengisi celah data dengan tebakan.</p></div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="flex gap-2"><Clock3 className="mt-0.5 size-3.5 shrink-0 text-primary" /><span>Laporan terbaru dicek otomatis saat simbol berubah dan setiap refresh.</span></div>
        <div className="flex gap-2"><RadioTower className="mt-0.5 size-3.5 shrink-0 text-primary" /><span>Sentimen hanya dihitung jika memiliki waktu publikasi, waktu ingest, sumber, dan alasan dampak harga.</span></div>
        <div className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" /><span>Jika feed bukan live atau data terlalu lama, sinyal menjadi <b className="text-foreground">NO SIGNAL</b>.</span></div>
      </CardContent>
    </Card>
  )
}
