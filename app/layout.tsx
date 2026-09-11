import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { AppShell } from '@/components/app-shell'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FinancialsProvider } from '@/lib/financials-context'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Asyurian Investment — Equity Insight',
  description:
    'Platform analisis valuasi dan kinerja perusahaan berbasis teori investasi: Graham Number, WACC/CAPM, DCF, DDM, Real Options, DuPont, Altman Z-Score, Piotroski F-Score, dan margin of safety.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

// Prevents theme flash: applies the stored (or default dark) theme before paint.
const themeScript = `(function(){try{var t=localStorage.getItem('asyurian-theme')||'dark';var d=document.documentElement;d.classList.remove('dark','light');d.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <TooltipProvider delay={150}>
            <FinancialsProvider>
              <AppShell>{children}</AppShell>
            </FinancialsProvider>
          </TooltipProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
