// Shared domain types used across Valuasi, Kinerja, and Saham modules.
// Monetary values are in Rupiah. Empty inputs are represented by NaN so the
// calculation layer can decide whether a result can be produced.

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

export type CompanyIdentity = {
  nama: string
  kode: string
  sektor: Sector
  periode: string
}

/** Neraca (Balance Sheet) — komponen mentah, total dihitung otomatis. */
export type BalanceSheet = {
  // Aktiva Lancar
  kas: number
  piutangUsaha: number
  persediaan: number
  asetLancarLain: number
  // Aktiva Tidak Lancar
  asetTetap: number
  asetTakBerwujud: number
  investasiJangkaPanjang: number
  asetTidakLancarLain: number
  // Liabilitas Lancar
  utangUsaha: number
  utangBankPendek: number
  liabilitasLancarLain: number
  // Liabilitas Jangka Panjang
  utangBankPanjang: number
  liabilitasPanjangLain: number
  // Ekuitas
  modalSaham: number
  saldoLaba: number
  ekuitasLain: number
}

/** Laba Rugi (Income Statement) — sub-total dihitung otomatis. */
export type IncomeStatement = {
  pendapatan: number
  hpp: number
  bebanPenjualan: number
  bebanUmumAdmin: number
  pendapatanLain: number
  bebanLain: number
  bebanBunga: number
  bebanPajak: number
  sahamBeredar: number
}

/** Arus Kas (Cash Flow Statement). */
export type CashFlowStatement = {
  arusKasOperasi: number
  arusKasInvestasi: number
  capex: number
  arusKasPendanaan: number
  dividenDibayar: number
}

/** Data pasar & asumsi valuasi. Persentase disimpan sebagai angka persen (6 = 6%). */
export type MarketData = {
  hargaSaham: number
  beta: number
  riskFreeRate: number
  equityRiskPremium: number
  /** NaN = hitung otomatis dari Beban Bunga / Utang Berbunga */
  costOfDebtOverride: number
  /** NaN = hitung otomatis dari Beban Pajak / EBT */
  taxRateOverride: number
  growthRate: number
  terminalGrowth: number
  perSektor: number
  pbvSektor: number
  roeSektor: number
  // Real Options (hanya bila perusahaan pra-profitabilitas)
  preProfit: boolean
  optS: number
  optX: number
  optSigma: number
  optT: number
}

/** Data pembanding periode lalu — opsional, untuk Piotroski F-Score penuh. */
export type PriorPeriod = {
  totalAset: number
  labaBersih: number
  roa: number
  leverage: number
  currentRatio: number
  sahamBeredar: number
  grossMargin: number
  assetTurnover: number
}

export type FinancialInputs = {
  identity: CompanyIdentity
  balance: BalanceSheet
  income: IncomeStatement
  cashflow: CashFlowStatement
  market: MarketData
  prior: PriorPeriod
}

export const EMPTY_IDENTITY: CompanyIdentity = {
  nama: '',
  kode: '',
  sektor: 'Perbankan',
  periode: '',
}

export const EMPTY_BALANCE: BalanceSheet = {
  kas: NaN,
  piutangUsaha: NaN,
  persediaan: NaN,
  asetLancarLain: NaN,
  asetTetap: NaN,
  asetTakBerwujud: NaN,
  investasiJangkaPanjang: NaN,
  asetTidakLancarLain: NaN,
  utangUsaha: NaN,
  utangBankPendek: NaN,
  liabilitasLancarLain: NaN,
  utangBankPanjang: NaN,
  liabilitasPanjangLain: NaN,
  modalSaham: NaN,
  saldoLaba: NaN,
  ekuitasLain: NaN,
}

export const EMPTY_INCOME: IncomeStatement = {
  pendapatan: NaN,
  hpp: NaN,
  bebanPenjualan: NaN,
  bebanUmumAdmin: NaN,
  pendapatanLain: NaN,
  bebanLain: NaN,
  bebanBunga: NaN,
  bebanPajak: NaN,
  sahamBeredar: NaN,
}

export const EMPTY_CASHFLOW: CashFlowStatement = {
  arusKasOperasi: NaN,
  arusKasInvestasi: NaN,
  capex: NaN,
  arusKasPendanaan: NaN,
  dividenDibayar: NaN,
}

export const DEFAULT_MARKET: MarketData = {
  hargaSaham: NaN,
  beta: 1,
  riskFreeRate: 6,
  equityRiskPremium: 6.5,
  costOfDebtOverride: NaN,
  taxRateOverride: NaN,
  growthRate: 8,
  terminalGrowth: 3,
  perSektor: NaN,
  pbvSektor: NaN,
  roeSektor: NaN,
  preProfit: false,
  optS: NaN,
  optX: NaN,
  optSigma: 40,
  optT: 5,
}

export const EMPTY_PRIOR: PriorPeriod = {
  totalAset: NaN,
  labaBersih: NaN,
  roa: NaN,
  leverage: NaN,
  currentRatio: NaN,
  sahamBeredar: NaN,
  grossMargin: NaN,
  assetTurnover: NaN,
}

export const EMPTY_INPUTS: FinancialInputs = {
  identity: EMPTY_IDENTITY,
  balance: EMPTY_BALANCE,
  income: EMPTY_INCOME,
  cashflow: EMPTY_CASHFLOW,
  market: DEFAULT_MARKET,
  prior: EMPTY_PRIOR,
}
