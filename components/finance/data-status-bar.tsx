'use client'

import Link from 'next/link'
import { ChevronDown, Database, FlaskConical, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useFinancials } from '@/lib/financials-context'
import { completeness } from '@/lib/statements'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Bar ringkas di atas setiap modul: emiten aktif, kelengkapan data, dan
 * kontrol untuk membuka form input bersama.
 */
export function DataStatusBar({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  const { inputs, reset, loadExample } = useFinancials()
  const { filled, total } = completeness(inputs)
  const pct = Math.round((filled / total) * 100)
  const id = inputs.identity
  const hasIdentity = id.nama || id.kode

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gold/25 bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <Database className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">
            {hasIdentity ? (
              <>
                {id.nama || 'Emiten'}
                {id.kode && <span className="text-gold"> · {id.kode}</span>}
              </>
            ) : (
              'Belum ada emiten dipilih'
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {id.periode && <span>{id.periode}</span>}
            {id.periode && <span aria-hidden>·</span>}
            <span>{id.sektor}</span>
            <span aria-hidden>·</span>
            <span>Harga {formatRupiah(inputs.market.hargaSaham)}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2" title={`${filled} dari ${total} field terisi`}>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <Badge variant={pct === 100 ? 'positive' : pct > 0 ? 'gold' : 'outline'}>{pct}% data</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={loadExample} title="Muat data contoh ilustratif">
          <FlaskConical className="size-4" />
          <span className="hidden sm:inline">Contoh</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} title="Kosongkan semua data">
          <RotateCcw className="size-4" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/input-laporan" />}>
          Halaman input
        </Button>
        <Button size="sm" onClick={onToggle} aria-expanded={open}>
          {open ? 'Sembunyikan form' : 'Input data'}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
    </div>
  )
}
