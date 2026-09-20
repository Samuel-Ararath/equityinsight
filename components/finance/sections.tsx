'use client'

import { Building2, FileText, Scale } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { NumberField, SelectField, TextField } from '@/components/finance/fields'
import {
  SECTORS,
  type CompanyIdentity,
  type FinancialData,
  type Sector,
  type ValuationAssumptions,
} from '@/lib/types'

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-gold/10 text-gold">
          <Icon className="size-4" />
        </span>
        <CardTitle className="text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
    </Card>
  )
}

export function IdentitySection({
  value,
  onChange,
}: {
  value: CompanyIdentity
  onChange: (patch: Partial<CompanyIdentity>) => void
}) {
  return (
    <SectionCard title="Identitas Perusahaan" icon={Building2}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="nama"
          label="Nama Perusahaan"
          placeholder="cth. PT Sinar Mas Tbk"
          value={value.nama}
          onChange={(v) => onChange({ nama: v })}
        />
        <TextField
          id="kode"
          label="Kode Saham"
          placeholder="cth. SMAR"
          value={value.kode}
          onChange={(v) => onChange({ kode: v.toUpperCase() })}
        />
        <SelectField<Sector>
          id="sektor"
          label="Sektor"
          value={value.sektor}
          options={SECTORS}
          onChange={(v) => onChange({ sektor: v })}
        />
        <TextField
          id="periode"
          label="Periode Laporan"
          placeholder="cth. Q2 2026"
          value={value.periode}
          onChange={(v) => onChange({ periode: v })}
        />
      </div>
    </SectionCard>
  )
}

export function FinancialsSection({
  value,
  onChange,
  extended = false,
}: {
  value: FinancialData
  onChange: (patch: Partial<FinancialData>) => void
  extended?: boolean
}) {
  return (
    <SectionCard title="Data Laporan Keuangan" icon={FileText}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField id="labaBersih" label="Laba Bersih" money value={value.labaBersih} onChange={(v) => onChange({ labaBersih: v })} />
        <NumberField id="sahamBeredar" label="Jumlah Saham Beredar" value={value.sahamBeredar} onChange={(v) => onChange({ sahamBeredar: v })} placeholder="cth. 1000000000" />

        {extended && (
          <>
            <NumberField id="pendapatan" label="Pendapatan / Revenue" money value={value.pendapatan} onChange={(v) => onChange({ pendapatan: v })} />
            <NumberField id="labaKotor" label="Laba Kotor" money value={value.labaKotor} onChange={(v) => onChange({ labaKotor: v })} />
            <NumberField id="labaOperasi" label="Laba Operasi" money value={value.labaOperasi} onChange={(v) => onChange({ labaOperasi: v })} />
            <NumberField id="bebanBunga" label="Beban Bunga" money value={value.bebanBunga} onChange={(v) => onChange({ bebanBunga: v })} />
          </>
        )}

        <NumberField id="totalEkuitas" label="Total Ekuitas" money value={value.totalEkuitas} onChange={(v) => onChange({ totalEkuitas: v })} />
        <NumberField id="totalAset" label="Total Aset" money value={value.totalAset} onChange={(v) => onChange({ totalAset: v })} />
        <NumberField id="totalUtang" label="Total Utang" money value={value.totalUtang} onChange={(v) => onChange({ totalUtang: v })} />
        <NumberField id="kas" label="Kas & Setara Kas" money value={value.kas} onChange={(v) => onChange({ kas: v })} />

        {extended && (
          <>
            <NumberField id="asetLancar" label="Aset Lancar" money value={value.asetLancar} onChange={(v) => onChange({ asetLancar: v })} />
            <NumberField id="liabilitasLancar" label="Liabilitas Lancar" money value={value.liabilitasLancar} onChange={(v) => onChange({ liabilitasLancar: v })} />
            <NumberField id="persediaan" label="Persediaan" money value={value.persediaan} onChange={(v) => onChange({ persediaan: v })} />
          </>
        )}

        <NumberField id="arusKasOperasi" label="Arus Kas Operasi" money value={value.arusKasOperasi} onChange={(v) => onChange({ arusKasOperasi: v })} />
        <NumberField id="capex" label="Capex / Belanja Modal" money value={value.capex} onChange={(v) => onChange({ capex: v })} />
        <NumberField id="dividenPerSaham" label="Dividen per Saham" money optional value={value.dividenPerSaham} onChange={(v) => onChange({ dividenPerSaham: v })} />
        <NumberField id="hargaSaham" label="Harga Saham Saat Ini" money value={value.hargaSaham} onChange={(v) => onChange({ hargaSaham: v })} />
      </div>
    </SectionCard>
  )
}

function AssumptionSlider({
  id,
  label,
  tooltip,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string
  label: string
  tooltip: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          <span className="flex items-center gap-1.5">
            {label}
            <InfoTooltip text={tooltip} />
          </span>
        </Label>
        <div className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-0.5 dark:bg-input/30">
          <input
            id={id}
            type="number"
            value={Number.isFinite(value) ? value : ''}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
            className="w-14 bg-transparent text-right text-sm tabular-nums outline-none"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
      <Slider
        aria-label={label}
        value={Number.isFinite(value) ? value : min}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
    </div>
  )
}

export function AssumptionsSection({
  value,
  onChange,
}: {
  value: ValuationAssumptions
  onChange: (patch: Partial<ValuationAssumptions>) => void
}) {
  return (
    <SectionCard title="Asumsi Valuasi" icon={Scale}>
      <div className="flex flex-col gap-6">
        <AssumptionSlider
          id="growthRate"
          label="Estimasi Pertumbuhan Tahunan"
          tooltip="Perkiraan laju pertumbuhan Free Cash Flow & dividen per tahun selama periode proyeksi. Umumnya 5-15% untuk perusahaan mapan."
          value={value.growthRate}
          min={0}
          max={30}
          step={0.5}
          onChange={(v) => onChange({ growthRate: v })}
        />
        <AssumptionSlider
          id="discountRate"
          label="Discount Rate / WACC"
          tooltip="Tingkat diskonto (biaya modal) untuk memotong arus kas masa depan ke nilai sekarang. Harus lebih tinggi dari terminal growth (3%)."
          value={value.discountRate}
          min={4}
          max={25}
          step={0.5}
          onChange={(v) => onChange({ discountRate: v })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            id="grahamBondYield"
            label="Graham Bond Yield"
            suffix="%"
            value={value.grahamBondYield}
            onChange={(v) => onChange({ grahamBondYield: v })}
            tooltip="Yield referensi pada formula Graham Defensive. Jangan samakan otomatis dengan WACC; gunakan referensi obligasi yang Anda pilih."
            placeholder="cth. 4.4"
          />
          <NumberField
            id="perSektor"
            label="PER Rata-rata Sektor"
            optional
            value={value.perSektor}
            onChange={(v) => onChange({ perSektor: v })}
            tooltip="Price to Earnings Ratio rata-rata industri sejenis. Digunakan untuk relative valuation (PER × EPS)."
            placeholder="cth. 12"
          />
          <NumberField
            id="pbvSektor"
            label="PBV Rata-rata Sektor"
            optional
            value={value.pbvSektor}
            onChange={(v) => onChange({ pbvSektor: v })}
            tooltip="Price to Book Value rata-rata industri sejenis. Digunakan untuk relative valuation (PBV × BVPS)."
            placeholder="cth. 1.5"
          />
        </div>
      </div>
    </SectionCard>
  )
}
