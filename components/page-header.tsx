export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card/70 px-6 py-7 premium-card md:px-8 md:py-8">
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <span className="eyebrow">EquityInsight / research workspace</span>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title}</h1>
          {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground text-pretty">{description}</p>}
        </div>
        {action && <div className="relative shrink-0">{action}</div>}
      </div>
    </div>
  )
}
