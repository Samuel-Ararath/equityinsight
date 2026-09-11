'use client'

import { BookOpen, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Ikon info kecil dengan tooltip shadcn — untuk penjelasan field/asumsi. */
function InfoTooltip({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="Penjelasan"
        className={cn(
          'inline-flex text-muted-foreground/70 transition-colors hover:text-gold focus-visible:text-gold focus-visible:outline-none',
          className,
        )}
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{text}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Referensi teori: ikon buku dengan tooltip yang menyebutkan sumber akademik.
 * Dipakai di setiap hasil kalkulasi.
 */
function TheoryRef({ source, className }: { source: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="Sumber teori"
        className={cn(
          'inline-flex items-center gap-1 rounded-md text-muted-foreground/70 transition-colors hover:text-gold focus-visible:text-gold focus-visible:outline-none',
          className,
        )}
      >
        <BookOpen className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <span className="flex flex-col gap-0.5">
          <span className="text-[0.65rem] font-semibold tracking-wider text-gold uppercase">Sumber teori</span>
          <span>{source}</span>
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

/** Footnote kecil di bawah kartu hasil, dengan ikon buku. */
function TheoryFootnote({ source, className }: { source: string; className?: string }) {
  return (
    <p className={cn('flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-muted-foreground', className)}>
      <BookOpen className="mt-0.5 size-3 shrink-0 text-gold/70" />
      <span>{source}</span>
    </p>
  )
}

export { InfoTooltip, TheoryRef, TheoryFootnote }
