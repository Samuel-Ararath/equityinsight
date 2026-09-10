'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Activity,
  Calculator,
  ChartLine,
  Database,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/valuasi', label: 'Valuasi Perusahaan', icon: Calculator },
  { href: '/kinerja', label: 'Analisis Kinerja', icon: Activity },
  { href: '/saham', label: 'Analisis Saham', icon: TrendingUp },
  { href: '/data-pasar', label: 'Data Pasar', icon: Database, badge: 'Segera' },
]

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  valuasi: 'Valuasi Perusahaan',
  kinerja: 'Analisis Kinerja',
  saham: 'Analisis Saham',
  'data-pasar': 'Data Pasar',
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 font-serif text-lg font-semibold text-gold">
        A
      </span>
      {!collapsed && (
        <span className="flex flex-col leading-tight">
          <span className="font-serif text-base font-semibold text-sidebar-foreground">
            Asyurian
          </span>
          <span className="text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
            Investment
          </span>
        </span>
      )}
    </Link>
  )
}

function NavLinks({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              collapsed && 'justify-center px-0',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center transition-colors',
                active ? 'text-gold' : 'text-muted-foreground group-hover:text-sidebar-foreground',
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            {!collapsed && (
              <span className="flex flex-1 items-center justify-between gap-2">
                {item.label}
                {item.badge && (
                  <Badge variant="gold" className="px-1.5 py-0 text-[0.65rem]">
                    {item.badge}
                  </Badge>
                )}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const segments = pathname.split('/').filter(Boolean)
  const currentLabel = BREADCRUMB_LABELS[segments[0]] ?? 'Dashboard'

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b border-sidebar-border px-4',
            collapsed && 'justify-center px-2',
          )}
        >
          <Brand collapsed={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} collapsed={collapsed} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              collapsed && 'justify-center px-0',
            )}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <>
                <PanelLeftClose className="size-[18px]" />
                <span>Ciutkan</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label="Tutup menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Asyurian</span>
            <ChartLine className="hidden size-3.5 text-muted-foreground/50 sm:inline" />
            <span className="font-medium text-foreground">{currentLabel}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
