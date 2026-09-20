// Shared domain types used across Valuasi, Kinerja, and Saham modules.

export const SECTORS = [
  'Perbankan',
  'Konsumer',
  'Energi',
  'Teknologi',
  'Infrastruktur',
  'Properti',
  'Lainnya',
] as const

export type Sector = (typeof SECTORS)[number]

// Company identity (shared)
export type CompanyIdentity = {
  nama: string
  kode: string
  sektor: Sector
  periode: string
}

// Financial statement figures. All monetary values in Rupiah.
// Fields are stored as numbers; empty inputs are represented by NaN so the
// calculation layer can decide whether a result can be produced.
export type FinancialData = {
  labaBersih: number
  sahamBeredar: number
  totalEkuitas: number
  totalAset: number
  totalUtang: number
  kas: number
  arusKasOperasi: number
  capex: number
  dividenPerSaham: number
  hargaSaham: number
  // Extra fields used by the performance (kinerja) module
  labaKotor: number
  labaOperasi: number
  pendapatan: number
  bebanBunga: number
  asetLancar: number
  liabilitasLancar: number
  persediaan: number
}

export type ValuationAssumptions = {
  growthRate: number // annual growth, percent (e.g. 8)
  discountRate: number // WACC / discount rate, percent (e.g. 12)
  grahamBondYield: number // Graham reference bond yield, percent (e.g. 4.4)
  perSektor: number // sector average P/E (optional, NaN if empty)
  pbvSektor: number // sector average P/BV (optional, NaN if empty)
}

export const EMPTY_IDENTITY: CompanyIdentity = {
  nama: '',
  kode: '',
  sektor: 'Perbankan',
  periode: '',
}

export const EMPTY_FINANCIALS: FinancialData = {
  labaBersih: NaN,
  sahamBeredar: NaN,
  totalEkuitas: NaN,
  totalAset: NaN,
  totalUtang: NaN,
  kas: NaN,
  arusKasOperasi: NaN,
  capex: NaN,
  dividenPerSaham: NaN,
  hargaSaham: NaN,
  labaKotor: NaN,
  labaOperasi: NaN,
  pendapatan: NaN,
  bebanBunga: NaN,
  asetLancar: NaN,
  liabilitasLancar: NaN,
  persediaan: NaN,
}

export const DEFAULT_ASSUMPTIONS: ValuationAssumptions = {
  growthRate: 8,
  discountRate: 12,
  grahamBondYield: 4.4,
  perSektor: NaN,
  pbvSektor: NaN,
}
