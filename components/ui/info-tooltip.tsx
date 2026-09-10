'use client'

import { Info } from 'lucide-react'

// Lightweight hover/focus tooltip using a CSS group — no external dependency.
function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="Penjelasan"
        className="inline-flex text-muted-foreground/70 transition-colors hover:text-gold focus-visible:text-gold focus-visible:outline-none"
      >
        <Info className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}

export { InfoTooltip }
