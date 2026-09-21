'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Activity,
  Building2,
  ChartLine,
  Database,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  X,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }>; badge?: string }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  { label: 'Command center', items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Markets', items: [{ href: '/data-pasar', label: 'Market Terminal', icon: Database, badge: 'Live' }] },
  { label: 'Securities & research', items: [
    { href: '/saham', label: 'Analisis Saham', icon: TrendingUp },
    { href: '/kinerja', label: 'Fundamental & Kinerja', icon: Activity },
  ] },
  { label: 'Capital allocation', items: [{ href: '/valuasi', label: 'Lab Proyek & RAB', icon: Building2 }] },
]

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  valuasi: 'Lab Proyek & RAB',
  kinerja: 'Fundamental & Kinerja',
  saham: 'Analisis Saham',
  'data-pasar': 'Market Terminal',
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 font-serif text-lg font-semibold text-gold">A</span>
      {!collapsed && <span className="flex flex-col leading-tight"><span className="font-serif text-base font-semibold text-sidebar-foreground">EquityInsight</span><span className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">Fundamental Intelligence</span></span>}
    </Link>
  )
}

function NavLinks({ pathname, collapsed, onNavigate }: { pathname: string; collapsed?: boolean; onNavigate?: () => void }) {
  return <nav className="space-y-5">{NAV_GROUPS.map((group) => <div key={group.label}><p className={cn('mb-2 px-3 text-[0.62rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase', collapsed && 'sr-only')}>{group.label}</p><div className="flex flex-col gap-1">{group.items.map((item) => { const active = pathname === item.href || pathname.startsWith(item.href + '/'); const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined} className={cn('group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', collapsed && 'justify-center px-0', active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground')}><span className={cn('flex items-center justify-center transition-colors', active ? 'text-gold' : 'text-muted-foreground group-hover:text-sidebar-foreground')}><Icon className="size-[18px]" /></span>{!collapsed && <span className="flex flex-1 items-center justify-between gap-2">{item.label}{item.badge && <Badge variant="gold" className="px-1.5 py-0 text-[0.65rem]">{item.badge}</Badge>}</span>}</Link> })}</div></div>)}</nav>
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const segments = pathname.split('/').filter(Boolean)
  const currentLabel = BREADCRUMB_LABELS[segments[0]] ?? 'Dashboard'

  return <div className="flex min-h-screen">
    <aside className={cn('sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex', collapsed ? 'w-[76px]' : 'w-64')}>
      <div className={cn('flex h-16 items-center border-b border-sidebar-border px-4', collapsed && 'justify-center px-2')}><Brand collapsed={collapsed} /></div>
      <div className="flex-1 overflow-y-auto p-3"><NavLinks pathname={pathname} collapsed={collapsed} /></div>
      <div className="border-t border-sidebar-border p-3"><button type="button" onClick={() => setCollapsed((value) => !value)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground', collapsed && 'justify-center px-0')} aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}>{collapsed ? <PanelLeftOpen className="size-[18px]" /> : <><PanelLeftClose className="size-[18px]" /><span>Ciutkan</span></>}</button></div>
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden /><aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-sidebar-border bg-sidebar"><div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4"><Brand /><button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Tutup menu"><X className="size-5" /></button></div><div className="flex-1 overflow-y-auto p-3"><NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} /></div></aside></div>}
    <div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/75 px-4 backdrop-blur-xl md:px-6"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden" aria-label="Buka menu"><Menu className="size-5" /></button><nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm"><span className="hidden text-muted-foreground sm:inline">EquityInsight</span><ChartLine className="hidden size-3.5 text-muted-foreground/50 sm:inline" /><span className="font-medium text-foreground">{currentLabel}</span></nav><div className="ml-auto flex items-center gap-3"><span className="hidden items-center gap-1.5 text-[0.68rem] font-medium text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-positive shadow-[0_0_10px_var(--positive)]" />Research mode</span><ThemeToggle /></div></header><main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main></div>
  </div>
}
