'use client'

import { AlertTriangle, Building2, CheckCircle2, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { NumberField, SelectField, TextField } from '@/components/finance/fields'
import { useFinancials } from '@/lib/financials-context'
import { formatPercent, formatRupiahShort } from '@/lib/format'
import { ok } from '@/lib/statements'
import { SECTORS, type Sector } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Judul sub-kelompok field. */
function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 flex items-center gap-3 text-xs font-semibold tracking-wider text-gold uppercase first:mt-0">
      {children}
      <span className="h-px flex-1 bg-border" />
    </h3>
  )
}

/** Baris nilai otomatis (sub-total). */
function AutoLine({
  label,
  value,
  emphasis = false,
  tooltip,
}: {
  label: string
  value: number
  emphasis?: boolean
  tooltip?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border border-dashed border-gold/30 bg-gold/5 px-3 py-2',
        emphasis && 'border-solid border-gold/40 bg-gold/10',
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <span
        className={cn(
          'font-serif text-sm font-semibold text-foreground tabular-nums',
          emphasis && 'text-base text-gold',
        )}
      >
        {formatRupiahShort(value)}
      </span>
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}

// ---------------------------------------------------------------------

function IdentityBlock() {
  const { inputs, setIdentity } = useFinancials()
  const v = inputs.identity
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TextField id="nama" label="Nama Emiten" placeholder="cth. PT Sinar Mas Tbk" value={v.nama} onChange={(x) => setIdentity({ nama: x })} />
      <TextField id="kode" label="Kode Saham" placeholder="cth. SMAR" value={v.kode} onChange={(x) => setIdentity({ kode: x.toUpperCase() })} />
      <SelectField<Sector> id="sektor" label="Sektor" value={v.sektor} options={SECTORS} onChange={(x) => setIdentity({ sektor: x })} />
      <TextField id="periode" label="Periode Laporan" placeholder="cth. FY 2025" value={v.periode} onChange={(x) => setIdentity({ periode: x })} />
    </div>
  )
}

function BalanceTab() {
  const { inputs, derived: d, setBalance } = useFinancials()
  const b = inputs.balance
  const f = (id: keyof typeof b, label: string, tooltip?: string) => (
    <NumberField id={`bs-${id}`} label={label} money tooltip={tooltip} value={b[id]} onChange={(v) => setBalance({ [id]: v })} />
  )
  return (
    <div className="flex flex-col gap-5">
      <GroupTitle>Aktiva Lancar</GroupTitle>
      <Grid>
        {f('kas', 'Kas & Setara Kas')}
        {f('piutangUsaha', 'Piutang Usaha')}
        {f('persediaan', 'Persediaan')}
        {f('asetLancarLain', 'Aktiva Lancar Lainnya')}
      </Grid>
      <AutoLine label="Total Aktiva Lancar" value={d.totalAsetLancar} />

      <GroupTitle>Aktiva Tidak Lancar</GroupTitle>
      <Grid>
        {f('asetTetap', 'Aset Tetap (PP&E)')}
        {f('asetTakBerwujud', 'Aset Tidak Berwujud')}
        {f('investasiJangkaPanjang', 'Investasi Jangka Panjang')}
        {f('asetTidakLancarLain', 'Aktiva Tidak Lancar Lainnya')}
      </Grid>
      <AutoLine label="Total Aktiva Tidak Lancar" value={d.totalAsetTidakLancar} />
      <AutoLine label="Total Aset" value={d.totalAset} emphasis />

      <GroupTitle>Liabilitas Lancar</GroupTitle>
      <Grid>
        {f('utangUsaha', 'Utang Usaha')}
        {f('utangBankPendek', 'Utang Bank Jangka Pendek', 'Utang berbunga jatuh tempo < 1 tahun. Masuk basis WACC & DER.')}
        {f('liabilitasLancarLain', 'Liabilitas Lancar Lainnya')}
      </Grid>
      <AutoLine label="Total Liabilitas Lancar" value={d.totalLiabilitasLancar} />

      <GroupTitle>Liabilitas Jangka Panjang</GroupTitle>
      <Grid>
        {f('utangBankPanjang', 'Utang Bank / Obligasi Jangka Panjang', 'Utang berbunga jatuh tempo > 1 tahun. Masuk basis WACC & DER.')}
        {f('liabilitasPanjangLain', 'Liabilitas Jangka Panjang Lainnya')}
      </Grid>
      <AutoLine label="Total Liabilitas" value={d.totalLiabilitas} emphasis />

      <GroupTitle>Ekuitas</GroupTitle>
      <Grid>
        {f('modalSaham', 'Modal Saham (termasuk agio)')}
        {f('saldoLaba', 'Saldo Laba (Retained Earnings)', 'Dipakai pada X2 Altman Z-Score.')}
        {f('ekuitasLain', 'Ekuitas Lainnya')}
      </Grid>
      <AutoLine label="Total Ekuitas" value={d.totalEkuitas} emphasis />

      {d.isBalanced !== null && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs',
            d.isBalanced
              ? 'border-positive/30 bg-positive/10 text-positive'
              : 'border-negative/30 bg-negative/10 text-negative',
          )}
          role="status"
        >
          {d.isBalanced ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
          <span>
            {d.isBalanced
              ? 'Neraca seimbang: Total Aset = Total Liabilitas + Ekuitas.'
              : `Neraca tidak balance — selisih ${formatRupiahShort(d.balanceDiff)}. Periksa kembali komponen yang diinput.`}
          </span>
        </div>
      )}
    </div>
  )
}

function IncomeTab() {
  const { inputs, derived: d, setIncome } = useFinancials()
  const i = inputs.income
  const f = (id: keyof typeof i, label: string, tooltip?: string) => (
    <NumberField id={`is-${id}`} label={label} money tooltip={tooltip} value={i[id]} onChange={(v) => setIncome({ [id]: v })} />
  )
  return (
    <div className="flex flex-col gap-5">
      <GroupTitle>Pendapatan &amp; Laba Kotor</GroupTitle>
      <Grid>
        {f('pendapatan', 'Pendapatan (Revenue)')}
        {f('hpp', 'Harga Pokok Penjualan (COGS)')}
      </Grid>
      <AutoLine label="Laba Kotor" value={d.labaKotor} tooltip="Pendapatan − HPP" />

      <GroupTitle>Beban Operasional</GroupTitle>
      <Grid>
        {f('bebanPenjualan', 'Beban Penjualan')}
        {f('bebanUmumAdmin', 'Beban Umum & Administrasi')}
      </Grid>
      <AutoLine label="Laba Usaha / EBIT" value={d.ebit} emphasis tooltip="Laba Kotor − Beban Penjualan − Beban G&A" />

      <GroupTitle>Non-Operasional</GroupTitle>
      <Grid>
        {f('pendapatanLain', 'Pendapatan Lain-lain')}
        {f('bebanLain', 'Beban Lain-lain')}
        {f('bebanBunga', 'Beban Bunga', 'Dipakai untuk Interest Coverage & estimasi Cost of Debt.')}
      </Grid>
      <AutoLine label="Laba Sebelum Pajak (EBT)" value={d.ebt} tooltip="EBIT + Pendapatan Lain − Beban Lain − Beban Bunga" />

      <GroupTitle>Pajak &amp; Laba Bersih</GroupTitle>
      <Grid>
        {f('bebanPajak', 'Beban Pajak Penghasilan')}
        <NumberField
          id="is-sahamBeredar"
          label="Jumlah Saham Beredar"
          tooltip="Weighted average shares outstanding — pembagi EPS, BVPS, dan nilai wajar per saham."
          placeholder="cth. 11600000000"
          value={i.sahamBeredar}
          onChange={(v) => setIncome({ sahamBeredar: v })}
        />
      </Grid>
      <AutoLine label="Laba Bersih" value={d.labaBersih} emphasis tooltip="EBT − Beban Pajak" />
    </div>
  )
}

function CashflowTab() {
  const { inputs, derived: d, setCashflow } = useFinancials()
  const c = inputs.cashflow
  return (
    <div className="flex flex-col gap-5">
      <GroupTitle>Aktivitas Operasi</GroupTitle>
      <Grid>
        <NumberField id="cf-op" label="Arus Kas dari Aktivitas Operasi" money value={c.arusKasOperasi} onChange={(v) => setCashflow({ arusKasOperasi: v })} />
      </Grid>
      <GroupTitle>Aktivitas Investasi</GroupTitle>
      <Grid>
        <NumberField id="cf-inv" label="Arus Kas dari Aktivitas Investasi" money tooltip="Biasanya negatif (kas keluar untuk investasi)." value={c.arusKasInvestasi} onChange={(v) => setCashflow({ arusKasInvestasi: v })} />
        <NumberField id="cf-capex" label="Capex (Belanja Modal)" money tooltip="Sub-komponen arus kas investasi: pembelian aset tetap. FCFF = CFO − Capex." value={c.capex} onChange={(v) => setCashflow({ capex: v })} />
      </Grid>
      <GroupTitle>Aktivitas Pendanaan</GroupTitle>
      <Grid>
        <NumberField id="cf-fin" label="Arus Kas dari Aktivitas Pendanaan" money value={c.arusKasPendanaan} onChange={(v) => setCashflow({ arusKasPendanaan: v })} />
        <NumberField id="cf-div" label="Dividen Dibayarkan" money optional tooltip="Total dividen tunai. DPS = Dividen / Saham Beredar — memicu Dividend Discount Model." value={c.dividenDibayar} onChange={(v) => setCashflow({ dividenDibayar: v })} />
      </Grid>
      <AutoLine label="Dividen per Saham (DPS)" value={d.dividenPerSaham} />
    </div>
  )
}

function PercentField({
  id,
  label,
  value,
  onChange,
  tooltip,
  placeholder,
  optional,
  hint,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  tooltip?: string
  placeholder?: string
  optional?: boolean
  hint?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <NumberField id={id} label={label} suffix="%" value={value} onChange={onChange} tooltip={tooltip} placeholder={placeholder} optional={optional} />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function MarketTab() {
  const { inputs, derived: d, setMarket } = useFinancials()
  const m = inputs.market
  const sourceLabel = (s: typeof d.taxRateSource) =>
    s === 'manual' ? 'override manual' : s === 'auto' ? 'dihitung otomatis' : 'nilai default'

  return (
    <div className="flex flex-col gap-5">
      <GroupTitle>Data Pasar</GroupTitle>
      <Grid>
        <NumberField id="mk-harga" label="Harga Saham Saat Ini" money value={m.hargaSaham} onChange={(v) => setMarket({ hargaSaham: v })} />
        <NumberField
          id="mk-beta"
          label="Beta Saham"
          value={m.beta}
          onChange={(v) => setMarket({ beta: v })}
          tooltip="Sensitivitas return saham terhadap pasar (IHSG). β = 1 setara risiko pasar; β > 1 lebih volatil. Default 1,0. Sumber: CAPM (Sharpe, 1964)."
          placeholder="1.0"
        />
      </Grid>

      <GroupTitle>Biaya Modal</GroupTitle>
      <Grid>
        <PercentField id="mk-rf" label="Risk-Free Rate / BI Rate" value={m.riskFreeRate} onChange={(v) => setMarket({ riskFreeRate: v })} tooltip="Imbal hasil bebas risiko — proksi BI Rate atau yield SBN 10 tahun. Default 6%." />
        <PercentField id="mk-erp" label="Equity Risk Premium" value={m.equityRiskPremium} onChange={(v) => setMarket({ equityRiskPremium: v })} tooltip="Premi risiko ekuitas di atas risk-free. Default 6,5% mengacu estimasi Damodaran untuk Indonesia (mature market premium + country risk premium)." />
        <PercentField
          id="mk-kd"
          label="Cost of Debt (sebelum pajak)"
          value={m.costOfDebtOverride}
          onChange={(v) => setMarket({ costOfDebtOverride: v })}
          optional
          placeholder={ok(d.costOfDebtAuto) ? d.costOfDebtAuto.toFixed(2) : 'otomatis'}
          tooltip="Kosongkan untuk hitung otomatis = Beban Bunga / Utang Berbunga. Isi untuk override."
          hint={<>Dipakai: <span className="text-foreground tabular-nums">{formatPercent(d.costOfDebt, 2)}</span> ({sourceLabel(d.costOfDebtSource)})</>}
        />
        <PercentField
          id="mk-tax"
          label="Tarif Pajak Efektif"
          value={m.taxRateOverride}
          onChange={(v) => setMarket({ taxRateOverride: v })}
          optional
          placeholder={ok(d.taxRateAuto) ? d.taxRateAuto.toFixed(2) : 'otomatis'}
          tooltip="Kosongkan untuk hitung otomatis = Beban Pajak / EBT. Fallback 22% (tarif PPh Badan)."
          hint={<>Dipakai: <span className="text-foreground tabular-nums">{formatPercent(d.taxRate, 2)}</span> ({sourceLabel(d.taxRateSource)})</>}
        />
      </Grid>

      <GroupTitle>Pertumbuhan</GroupTitle>
      <Grid>
        <PercentField id="mk-g" label="Growth Rate Jangka Pendek (5 thn)" value={m.growthRate} onChange={(v) => setMarket({ growthRate: v })} tooltip="Laju pertumbuhan FCFF/dividen tahunan selama periode proyeksi eksplisit. Default 8%." />
        <PercentField
          id="mk-gt"
          label="Growth Rate Terminal (perpetuitas)"
          value={m.terminalGrowth}
          onChange={(v) => setMarket({ terminalGrowth: v })}
          tooltip="Pertumbuhan abadi setelah tahun ke-5. Tidak boleh melebihi pertumbuhan nominal ekonomi jangka panjang (Damodaran). Default 3%."
          hint={
            ok(m.terminalGrowth) && m.terminalGrowth > 5 ? (
              <span className="flex items-center gap-1 text-warning">
                <AlertTriangle className="size-3" /> Growth terminal &gt; 5% melampaui asumsi pertumbuhan ekonomi jangka panjang — hasil DCF cenderung terlalu optimis.
              </span>
            ) : undefined
          }
        />
      </Grid>

      <GroupTitle>Pembanding Sektor (opsional)</GroupTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberField id="mk-per" label="PER Rata-rata Sektor" optional placeholder="cth. 15" value={m.perSektor} onChange={(v) => setMarket({ perSektor: v })} tooltip="Memicu Relative Valuation: Harga Wajar = PER Sektor × EPS." />
        <NumberField id="mk-pbv" label="PBV Rata-rata Sektor" optional placeholder="cth. 2" value={m.pbvSektor} onChange={(v) => setMarket({ pbvSektor: v })} tooltip="Memicu Relative Valuation: Harga Wajar = PBV Sektor × BVPS." />
        <PercentField id="mk-roe" label="ROE Rata-rata Sektor" optional placeholder="cth. 15" value={m.roeSektor} onChange={(v) => setMarket({ roeSektor: v })} tooltip="Dipakai dimensi Profitabilitas pada Skor Komposit /saham." />
      </div>

      <GroupTitle>Perusahaan Pra-Profitabilitas</GroupTitle>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="mk-preprofit" className="flex items-center gap-1.5">
            Perusahaan Pra-Profitabilitas / Growth Stage
            <InfoTooltip text="Aktifkan bila arus kas belum positif stabil. Valuasi beralih ke Real Options (Black–Scholes) + multiple sektor; DCF/DDM/Graham tidak dipakai dalam rata-rata nilai wajar." />
          </Label>
          <span className="text-xs text-muted-foreground">
            Menilai flexibility value opsi ekspansi mengikuti kerangka Damodaran.
          </span>
        </div>
        <Switch id="mk-preprofit" checked={m.preProfit} onCheckedChange={(c) => setMarket({ preProfit: c })} />
      </div>
      {m.preProfit && (
        <Grid>
          <NumberField id="opt-s" label="Nilai Proyek / Peluang Ekspansi (S)" money value={m.optS} onChange={(v) => setMarket({ optS: v })} tooltip="Present value arus kas yang diharapkan dari proyek/ekspansi bila dieksekusi — underlying asset opsi." />
          <NumberField id="opt-x" label="Biaya Investasi untuk Eksekusi (X)" money value={m.optX} onChange={(v) => setMarket({ optX: v })} tooltip="Investasi yang harus dikeluarkan untuk mengeksekusi peluang — strike price opsi." />
          <PercentField id="opt-sigma" label="Volatilitas Estimasi (σ)" value={m.optSigma} onChange={(v) => setMarket({ optSigma: v })} tooltip="Deviasi standar tahunan nilai proyek. Perusahaan teknologi/growth umumnya 30–60%." />
          <NumberField id="opt-t" label="Jangka Waktu Opsi (tahun)" suffix="thn" value={m.optT} onChange={(v) => setMarket({ optT: v })} tooltip="Berapa lama peluang ekspansi masih terbuka sebelum kedaluwarsa/direbut pesaing." />
        </Grid>
      )}
    </div>
  )
}

function PriorTab() {
  const { inputs, setPrior } = useFinancials()
  const p = inputs.prior
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
        <History className="mt-0.5 size-4 shrink-0 text-gold" />
        <span>
          Opsional. Dipakai untuk 6 dari 9 kriteria Piotroski F-Score yang membandingkan tahun ini vs tahun lalu. Tanpa data ini, skor ditampilkan parsial.
        </span>
      </div>
      <Grid>
        <NumberField id="pr-aset" label="Total Aset Tahun Lalu" money optional value={p.totalAset} onChange={(v) => setPrior({ totalAset: v })} />
        <NumberField id="pr-laba" label="Laba Bersih Tahun Lalu" money optional value={p.labaBersih} onChange={(v) => setPrior({ labaBersih: v })} />
        <NumberField id="pr-roa" label="ROA Tahun Lalu" suffix="%" optional value={p.roa} onChange={(v) => setPrior({ roa: v })} />
        <NumberField id="pr-lev" label="Leverage Tahun Lalu" optional placeholder="Utang Berbunga / Total Aset, cth. 0.25" value={p.leverage} onChange={(v) => setPrior({ leverage: v })} tooltip="Rasio utang berbunga jangka panjang terhadap total aset (Piotroski memakai long-term debt / average assets)." />
        <NumberField id="pr-cr" label="Current Ratio Tahun Lalu" suffix="×" optional value={p.currentRatio} onChange={(v) => setPrior({ currentRatio: v })} />
        <NumberField id="pr-shares" label="Jumlah Saham Beredar Tahun Lalu" optional value={p.sahamBeredar} onChange={(v) => setPrior({ sahamBeredar: v })} />
        <NumberField id="pr-gm" label="Gross Margin Tahun Lalu" suffix="%" optional value={p.grossMargin} onChange={(v) => setPrior({ grossMargin: v })} />
        <NumberField id="pr-ato" label="Asset Turnover Tahun Lalu" suffix="×" optional value={p.assetTurnover} onChange={(v) => setPrior({ assetTurnover: v })} />
      </Grid>
    </div>
  )
}

// ---------------------------------------------------------------------

const TAB_ITEMS = [
  { value: 'neraca', label: 'Neraca' },
  { value: 'labarugi', label: 'Laba Rugi' },
  { value: 'aruskas', label: 'Arus Kas' },
  { value: 'pasar', label: 'Pasar & Asumsi' },
  { value: 'lalu', label: 'Periode Lalu' },
] as const

export function InputPanel({ className }: { className?: string }) {
  const { derived } = useFinancials()
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-gold/10 text-gold">
          <Building2 className="size-4" />
        </span>
        <CardTitle className="text-foreground">Input Laporan Keuangan</CardTitle>
        {derived.isBalanced === false && (
          <Badge variant="negative" className="ml-auto">
            Neraca tidak balance
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-2">
        <IdentityBlock />
        <Tabs defaultValue="neraca">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-background/60 p-1 sm:w-auto">
            {TAB_ITEMS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="h-8 flex-none px-3 data-active:bg-gold/15 data-active:text-gold dark:data-active:bg-gold/15 dark:data-active:text-gold">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="neraca" className="pt-3"><BalanceTab /></TabsContent>
          <TabsContent value="labarugi" className="pt-3"><IncomeTab /></TabsContent>
          <TabsContent value="aruskas" className="pt-3"><CashflowTab /></TabsContent>
          <TabsContent value="pasar" className="pt-3"><MarketTab /></TabsContent>
          <TabsContent value="lalu" className="pt-3"><PriorTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
