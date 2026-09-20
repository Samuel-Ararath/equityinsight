'use client'

import { useState } from 'react'
import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DEFAULT_TOOLKIT, TOOL_GROUPS, type ToolKey, type ToolkitState } from '@/lib/indicators'

export function AnalysisToolkit({ value, onChange }: { value: ToolkitState; onChange: (next: ToolkitState) => void }) {
  const [open, setOpen] = useState<string | null>('trend')
  const activeCount = Object.values(value).filter(Boolean).length
  function toggle(key: ToolKey) { onChange({ ...value, [key]: !value[key] }) }
  return <CardShell>
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><SlidersHorizontal className="size-4" /></span><div><p className="text-sm font-semibold">Analysis Toolkit</p><p className="text-xs text-muted-foreground">Pilih beberapa overlay sekaligus</p></div>{activeCount > 0 && <Badge variant="gold">{activeCount} aktif</Badge>}</div><Button size="sm" variant="ghost" onClick={() => onChange({ ...DEFAULT_TOOLKIT })}><RotateCcw className="size-3.5" />Reset</Button></div>
    <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">{TOOL_GROUPS.map((group) => <div key={group.key} className="rounded-xl border border-border/70 bg-background/30"><button type="button" onClick={() => setOpen(open === group.key ? null : group.key)} className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</span><ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open === group.key && 'rotate-180')} /></button>{open === group.key && <div className="flex flex-wrap gap-2 border-t border-border/60 px-3 pb-3 pt-2">{group.items.map(([key, label, description]) => <button key={key} type="button" title={description} aria-pressed={value[key as ToolKey]} onClick={() => toggle(key as ToolKey)} className={cn('min-h-9 rounded-lg border px-2.5 text-xs font-medium transition-colors', value[key as ToolKey] ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground')}>{label}</button>)}</div>}</div>)}</div>
  </CardShell>
}

function CardShell({ children }: { children: React.ReactNode }) { return <div className="overflow-hidden rounded-xl border border-border bg-card premium-card">{children}</div> }
