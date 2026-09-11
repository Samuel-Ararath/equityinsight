'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Coins,
  Landmark,
  Pencil,
  RotateCcw,
  Scale,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { NumberField, SelectField, TextField, ToggleField } from '@/components/finance/fields'
import { useFinance } from '@/components/finance/finance-context'
import { formatRupiahShort } from '@/lib/format'
import { SECTORS, type Sector } from '@/lib/types'
import { cn } from '@/lib/utils'

type TabKey = 'neraca' | 'labarugi' | 'aruskas' | 'pasar' | 'pembanding'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'neraca', label: 'Neraca' },
  { key: 'labarugi', label: 'Laba Rugi' },
  { key: 'aruskas', label: 'Arus Kas' },
  { key: 'pasar', label: 'Data Pasar & Asumsi' },
  { key: 'pembanding', label: 'Data Pembanding' },
]

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full mt-2 flex items-center gap-2 first:mt-0">
      <span className="text-xs font-semibold tracking-wide text-gold uppercase">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function DerivedRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: number
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={cn('text-muted-foreground', strong && 'font-medium text-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums text-foreground',
          strong ? 'font-serif text-base font-semibold text-gold' : 'font-medium',
        )}
      >
        {formatRupiahShort(value)}
      </span>
    </div>
  )
}

export function FinancialInputPanel() {
  const { model, derived, setIdentity, setBalance, setIncome, setCashFlow, setMarket, setPrior, loadSample, reset } =
    useFinance()
  const [tab, setTab] = useState<TabKey>('neraca')

  const b = model.balance
  const i = model.income
  const c = model.cashflow
  const mk = model.market
  const p = model.prior

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5">
        {/* Header + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-gold/10 text-gold">
              <Landmark className="size-4" />
            </span>
            <div className="flex flex-col">
              <h2 className="font-serif text-lg font-semibold text-foreground">Input Laporan Keuangan</h2>
              <span className="text-xs text-muted-foreground">
                Isi sekali — dipakai bersama oleh Valuasi, Kinerja, dan Saham.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadSample}>
              <Sparkles className="size-3.5" />
              Contoh
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Identity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField id="nama" label="Nama Perusahaan" placeholder="cth. PT Sinar Mas Tbk" value={model.identity.nama} onChange={(v) => setIdentity({ nama: v })} />
          <TextField id="kode" label="Kode Saham" placeholder="cth. SMAR" value={model.identity.kode} onChange={(v) => setIdentity({ kode: v.toUpperCase() })} />
          <SelectField<Sector> id="sektor" label="Sektor" value={model.identity.sektor} options={SECTORS} onChange={(v) => setIdentity({ sektor: v })} />
          <TextField id="periode" label="Periode" placeholder="cth. FY 2025" value={model.identity.periode} onChange={(v) => setIdentity({ periode: v })} />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/40 p-1">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm',
                  active ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ---- NERACA ---- */}
        {tab === 'neraca' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GroupLabel>Aktiva Lancar</GroupLabel>
            <NumberField id="kas" label="Kas & Setara Kas" money value={b.kas} onChange={(v) => setBalance({ kas: v })} />
            <NumberField id="piutang" label="Piutang Usaha" money value={b.piutang} onChange={(v) => setBalance({ piutang: v })} />
            <NumberField id="persediaan" label="Persediaan" money value={b.persediaan} onChange={(v) => setBalance({ persediaan: v })} />
            <NumberField id="aktivaLancarLain" label="Aktiva Lancar Lainnya" money value={b.aktivaLancarLain} onChange={(v) => setBalance({ aktivaLancarLain: v })} />

            <GroupLabel>Aktiva Tidak Lancar</GroupLabel>
            <NumberField id="asetTetap" label="Aset Tetap (PP&E)" money value={b.asetTetap} onChange={(v) => setBalance({ asetTetap: v })} />
            <NumberField id="asetTakBerwujud" label="Aset Tidak Berwujud" money value={b.asetTakBerwujud} onChange={(v) => setBalance({ asetTakBerwujud: v })} />
            <NumberField id="investasiJangkaPanjang" label="Investasi Jangka Panjang" money value={b.investasiJangkaPanjang} onChange={(v) => setBalance({ investasiJangkaPanjang: v })} />
            <NumberField id="aktivaTidakLancarLain" label="Aktiva Tidak Lancar Lainnya" money value={b.aktivaTidakLancarLain} onChange={(v) => setBalance({ aktivaTidakLancarLain: v })} />

            <GroupLabel>Liabilitas Lancar</GroupLabel>
            <NumberField id="utangUsaha" label="Utang Usaha" money value={b.utangUsaha} onChange={(v) => setBalance({ utangUsaha: v })} />
            <NumberField id="utangBankPendek" label="Utang Bank Jangka Pendek" money value={b.utangBankPendek} onChange={(v) => setBalance({ utangBankPendek: v })} />
            <NumberField id="liabilitasLancarLain" label="Liabilitas Lancar Lainnya" money value={b.liabilitasLancarLain} onChange={(v) => setBalance({ liabilitasLancarLain: v })} />

            <GroupLabel>Liabilitas Jangka Panjang</GroupLabel>
            <NumberField id="utangJangkaPanjang" label="Utang Bank/Obligasi Jangka Panjang" money value={b.utangJangkaPanjang} onChange={(v) => setBalance({ utangJangkaPanjang: v })} />
            <NumberField id="liabilitasJangkaPanjangLain" label="Liabilitas Jangka Panjang Lainnya" money value={b.liabilitasJangkaPanjangLain} onChange={(v) => setBalance({ liabilitasJangkaPanjangLain: v })} />

            <GroupLabel>Ekuitas</GroupLabel>
            <NumberField id="modalSaham" label="Modal Saham" money value={b.modalSaham} onChange={(v) => setBalance({ modalSaham: v })} />
            <NumberField id="saldoLaba" label="Saldo Laba (Retained Earnings)" money value={b.saldoLaba} onChange={(v) => setBalance({ saldoLaba: v })} />
            <NumberField id="ekuitasLain" label="Ekuitas Lainnya" money value={b.ekuitasLain} onChange={(v) => setBalance({ ekuitasLain: v })} />

            {/* Derived totals + balance check */}
            <div className="col-span-full mt-2 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <DerivedRow label="Total Aktiva Lancar" value={derived.totalAktivaLancar} />
                <DerivedRow label="Total Aktiva Tidak Lancar" value={derived.totalAktivaTidakLancar} />
                <DerivedRow label="Total Liabilitas" value={derived.totalLiabilitas} />
                <DerivedRow label="Total Ekuitas" value={derived.totalEkuitas} />
                <DerivedRow label="Total Aset" value={derived.totalAset} strong />
                <DerivedRow label="Liabilitas + Ekuitas" value={derived.totalLiabilitas + derived.totalEkuitas} strong />
              </div>
              <div className="mt-3 border-t border-border pt-3">
                {Number.isFinite(derived.balanceDiff) ? (
                  derived.balanceOk ? (
                    <div className="flex items-center gap-2 text-sm text-positive">
                      <CheckCircle2 className="size-4" />
                      Neraca seimbang: Total Aset = Liabilitas + Ekuitas.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-negative">
                      <AlertTriangle className="size-4" />
                      Tidak seimbang — selisih {formatRupiahShort(derived.balanceDiff)}.
                    </div>
                  )
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Lengkapi komponen aset, liabilitas, dan ekuitas untuk memvalidasi neraca.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- LABA RUGI ---- */}
        {tab === 'labarugi' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField id="pendapatan" label="Pendapatan (Revenue)" money value={i.pendapatan} onChange={(v) => setIncome({ pendapatan: v })} />
            <NumberField id="cogs" label="Harga Pokok Penjualan (COGS)" money value={i.cogs} onChange={(v) => setIncome({ cogs: v })} />
            <DerivedInline label="Laba Kotor" value={derived.labaKotor} />
            <NumberField id="bebanPenjualan" label="Beban Penjualan" money value={i.bebanPenjualan} onChange={(v) => setIncome({ bebanPenjualan: v })} />
            <NumberField id="bebanAdmin" label="Beban Umum & Administrasi" money value={i.bebanAdmin} onChange={(v) => setIncome({ bebanAdmin: v })} />
            <DerivedInline label="Laba Usaha / EBIT" value={derived.ebit} />
            <NumberField id="pendapatanLain" label="Pendapatan Lain-lain" money optional value={i.pendapatanLain} onChange={(v) => setIncome({ pendapatanLain: v })} />
            <NumberField id="bebanLain" label="Beban Lain-lain" money optional value={i.bebanLain} onChange={(v) => setIncome({ bebanLain: v })} />
            <NumberField id="bebanBunga" label="Beban Bunga" money value={i.bebanBunga} onChange={(v) => setIncome({ bebanBunga: v })} />
            <DerivedInline label="Laba Sebelum Pajak (EBT)" value={derived.ebt} />
            <NumberField id="bebanPajak" label="Beban Pajak Penghasilan" money value={i.bebanPajak} onChange={(v) => setIncome({ bebanPajak: v })} />
            <DerivedInline label="Laba Bersih" value={derived.labaBersih} strong />
            <NumberField id="sahamBeredar" label="Jumlah Saham Beredar (rata-rata tertimbang)" value={i.sahamBeredar} onChange={(v) => setIncome({ sahamBeredar: v })} placeholder="cth. 12000000000" />
          </div>
        )}

        {/* ---- ARUS KAS ---- */}
        {tab === 'aruskas' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField id="arusKasOperasi" label="Arus Kas Aktivitas Operasi" money value={c.arusKasOperasi} onChange={(v) => setCashFlow({ arusKasOperasi: v })} />
            <NumberField id="arusKasInvestasi" label="Arus Kas Aktivitas Investasi" money value={c.arusKasInvestasi} onChange={(v) => setCashFlow({ arusKasInvestasi: v })} tooltip="Total arus kas investasi (biasanya negatif). Capex diisi terpisah di bawah." />
            <NumberField id="capex" label="Capex / Belanja Modal" money value={c.capex} onChange={(v) => setCashFlow({ capex: v })} tooltip="Belanja modal — dikurangkan dari arus kas operasi untuk menghitung Free Cash Flow to Firm." />
            <NumberField id="arusKasPendanaan" label="Arus Kas Aktivitas Pendanaan" money value={c.arusKasPendanaan} onChange={(v) => setCashFlow({ arusKasPendanaan: v })} />
            <NumberField id="dividenDibayar" label="Dividen Dibayarkan" money optional value={c.dividenDibayar} onChange={(v) => setCashFlow({ dividenDibayar: v })} />
            <div className="col-span-full mt-1 rounded-lg border border-border bg-secondary/30 p-4">
              <DerivedRow label="Free Cash Flow to Firm (Operasi − Capex)" value={derived.freeCashFlow} strong />
            </div>
          </div>
        )}

        {/* ---- DATA PASAR & ASUMSI ---- */}
        {tab === 'pasar' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GroupLabel>Pasar</GroupLabel>
            <NumberField id="hargaSaham" label="Harga Saham Saat Ini" money value={mk.hargaSaham} onChange={(v) => setMarket({ hargaSaham: v })} />
            <NumberField id="dividenPerSaham" label="Dividen per Saham" money optional value={mk.dividenPerSaham} onChange={(v) => setMarket({ dividenPerSaham: v })} tooltip="Dividen tunai per lembar. Dipakai Dividend Discount Model (Gordon Growth)." />

            <GroupLabel>Biaya Modal & Pajak</GroupLabel>
            <NumberField id="beta" label="Beta Saham" value={mk.beta} onChange={(v) => setMarket({ beta: v })} tooltip="Sensitivitas harga saham terhadap pasar. β = 1 bergerak seiring pasar; > 1 lebih volatil. Dipakai di CAPM." placeholder="1.0" />
            <NumberField id="riskFreeRate" label="Risk-Free Rate / BI Rate" suffix="%" value={mk.riskFreeRate} onChange={(v) => setMarket({ riskFreeRate: v })} tooltip="Imbal hasil bebas risiko, umumnya yield SBN 10 tahun atau BI Rate." />
            <NumberField id="equityRiskPremium" label="Equity Risk Premium" suffix="%" value={mk.equityRiskPremium} onChange={(v) => setMarket({ equityRiskPremium: v })} tooltip="Premi risiko ekuitas atas aset bebas risiko. Estimasi Damodaran untuk pasar berkembang ± 6–8%." />
            <NumberField id="costOfDebtManual" label="Cost of Debt sebelum pajak" suffix="%" optional value={mk.costOfDebtManual} onChange={(v) => setMarket({ costOfDebtManual: v })} tooltip="Kosongkan untuk hitung otomatis = Beban Bunga / Total Utang Berbunga." />
            <NumberField id="taxRateManual" label="Tarif Pajak Efektif" suffix="%" optional value={mk.taxRateManual} onChange={(v) => setMarket({ taxRateManual: v })} tooltip="Kosongkan untuk hitung otomatis = Beban Pajak / Laba Sebelum Pajak." />

            <GroupLabel>Pertumbuhan</GroupLabel>
            <NumberField id="growthShort" label="Growth Jangka Pendek (5 thn)" suffix="%" value={mk.growthShort} onChange={(v) => setMarket({ growthShort: v })} tooltip="Perkiraan pertumbuhan FCFF & dividen selama periode proyeksi 5 tahun." />
            <div className="flex flex-col gap-1">
              <NumberField id="growthTerminal" label="Growth Terminal / Perpetuitas" suffix="%" value={mk.growthTerminal} onChange={(v) => setMarket({ growthTerminal: v })} tooltip="Pertumbuhan abadi setelah tahun ke-5. Idealnya ≤ pertumbuhan ekonomi jangka panjang." />
              {Number.isFinite(mk.growthTerminal) && mk.growthTerminal > 5 && (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <AlertTriangle className="size-3.5" />
                  Growth terminal &gt; 5% jarang realistis untuk perpetuitas.
                </span>
              )}
            </div>

            <GroupLabel>Relative Valuation (opsional)</GroupLabel>
            <NumberField id="perSektor" label="PER Rata-rata Sektor" optional value={mk.perSektor} onChange={(v) => setMarket({ perSektor: v })} placeholder="cth. 15" />
            <NumberField id="pbvSektor" label="PBV Rata-rata Sektor" optional value={mk.pbvSektor} onChange={(v) => setMarket({ pbvSektor: v })} placeholder="cth. 2.4" />

            <div className="col-span-full">
              <ToggleField
                id="preProfit"
                label="Perusahaan Pra-Profitabilitas / Growth Stage"
                description="Aktifkan untuk perusahaan tanpa arus kas positif stabil. Valuasi memakai Real Options (Black-Scholes) + Relative, bukan DCF/DDM."
                checked={mk.preProfit}
                onChange={(v) => setMarket({ preProfit: v })}
              />
            </div>

            {mk.preProfit && (
              <>
                <GroupLabel>Real Options (Black-Scholes)</GroupLabel>
                <NumberField id="optionS" label="Nilai Proyek / Peluang Ekspansi (S)" money value={mk.optionS} onChange={(v) => setMarket({ optionS: v })} tooltip="Present value peluang/ekspansi — analog harga aset dasar pada opsi." />
                <NumberField id="optionX" label="Biaya Investasi Eksekusi (X)" money value={mk.optionX} onChange={(v) => setMarket({ optionX: v })} tooltip="Biaya untuk mengeksekusi opsi — analog strike price." />
                <NumberField id="optionSigma" label="Volatilitas Estimasi (σ)" suffix="%" value={mk.optionSigma} onChange={(v) => setMarket({ optionSigma: v })} tooltip="Estimasi volatilitas nilai proyek per tahun." />
                <NumberField id="optionT" label="Jangka Waktu Opsi (tahun)" value={mk.optionT} onChange={(v) => setMarket({ optionT: v })} tooltip="Berapa lama peluang ekspansi tetap terbuka." />
              </>
            )}
          </div>
        )}

        {/* ---- DATA PEMBANDING ---- */}
        {tab === 'pembanding' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Data periode sebelumnya (opsional) untuk menghitung Piotroski F-Score secara penuh. Tanpa
              data ini, skor tetap dihitung parsial dari kriteria yang tersedia.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField id="totalAsetLalu" label="Total Aset Tahun Lalu" money optional value={p.totalAsetLalu} onChange={(v) => setPrior({ totalAsetLalu: v })} />
              <NumberField id="labaBersihLalu" label="Laba Bersih Tahun Lalu" money optional value={p.labaBersihLalu} onChange={(v) => setPrior({ labaBersihLalu: v })} />
              <NumberField id="arusKasOperasiLalu" label="Arus Kas Operasi Tahun Lalu" money optional value={p.arusKasOperasiLalu} onChange={(v) => setPrior({ arusKasOperasiLalu: v })} />
              <NumberField id="leverageLalu" label="Leverage Tahun Lalu (Utang JP / Aset)" optional value={p.leverageLalu} onChange={(v) => setPrior({ leverageLalu: v })} placeholder="cth. 0.20" tooltip="Rasio liabilitas jangka panjang terhadap total aset tahun lalu." />
              <NumberField id="currentRatioLalu" label="Current Ratio Tahun Lalu" optional value={p.currentRatioLalu} onChange={(v) => setPrior({ currentRatioLalu: v })} placeholder="cth. 1.9" />
              <NumberField id="sahamBeredarLalu" label="Jumlah Saham Beredar Tahun Lalu" optional value={p.sahamBeredarLalu} onChange={(v) => setPrior({ sahamBeredarLalu: v })} />
              <NumberField id="grossMarginLalu" label="Gross Margin Tahun Lalu" suffix="%" optional value={p.grossMarginLalu} onChange={(v) => setPrior({ grossMarginLalu: v })} />
              <NumberField id="assetTurnoverLalu" label="Asset Turnover Tahun Lalu" optional value={p.assetTurnoverLalu} onChange={(v) => setPrior({ assetTurnoverLalu: v })} placeholder="cth. 1.02" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Inline read-only subtotal shown between income-statement inputs. */
function DerivedInline({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2.5',
        strong ? 'bg-gold/10' : 'bg-secondary/30',
      )}
    >
      <span className={cn('flex items-center gap-1.5 text-sm', strong ? 'font-medium text-foreground' : 'text-muted-foreground')}>
        {strong ? <Coins className="size-3.5 text-gold" /> : <Scale className="size-3.5 text-muted-foreground" />}
        {label}
      </span>
      <span className={cn('tabular-nums', strong ? 'font-serif text-base font-semibold text-gold' : 'font-medium text-foreground')}>
        {formatRupiahShort(value)}
      </span>
    </div>
  )
}

/**
 * Wraps the input panel in a toggle so analysis pages keep the focus on
 * results. Opens by default when no data has been entered yet.
 */
export function CollapsibleInputPanel() {
  const { model, derived } = useFinance()
  const hasData = Number.isFinite(derived.totalAset) || Number.isFinite(derived.labaBersih)
  const [open, setOpen] = useState(!hasData)

  const label = model.identity.nama
    ? `${model.identity.nama}${model.identity.kode ? ` · ${model.identity.kode}` : ''}${
        model.identity.periode ? ` · ${model.identity.periode}` : ''
      }`
    : 'Belum ada data laporan keuangan'

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3 text-left transition-colors hover:border-gold/40"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-md bg-gold/10 text-gold">
            <Pencil className="size-4" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Data Laporan Keuangan</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <FinancialInputPanel />}
    </div>
  )
}

/** Compact "no data yet" prompt with a link to load the sample dataset. */
export function EmptyDataPrompt({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  const { loadSample } = useFinance()
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Icon className="size-6 text-gold" />
        <p className="max-w-sm text-sm text-muted-foreground">
          Hasil akan muncul otomatis begitu Anda mengisi Laporan Keuangan di panel input.
        </p>
        <Button variant="outline" size="sm" onClick={loadSample}>
          <Sparkles className="size-3.5" />
          Muat Data Contoh
        </Button>
      </CardContent>
    </Card>
  )
}
