// Shared domain model used across Valuasi, Kinerja, and Saham modules.
// One complete financial statement is entered once (via the Input panel) and
// consumed by every analysis module through the shared FinanceContext.
//
// All monetary values are in Rupiah. Empty inputs are represented by NaN so
// the calculation layer can decide whether a result can be produced.

export const SECTORS = [
  'Perbankan',
  'Konsumer',
  'Energi',
  'Teknologi',
  'Infrastruktur',
  'Properti',
  'Kesehatan',
  'Lainnya',
] as const

export type Sector = (typeof SECTORS)[number]

// ---- Company identity ----
export type CompanyIdentity = {
  nama: string
  kode: string
  sektor: Sector
  periode: string
}

// ---- Balance sheet (Neraca) ----
export type BalanceSheet = {
  // Aktiva Lancar
  kas: number
  piutang: number
  persediaan: number
  aktivaLancarLain: number
  // Aktiva Tidak Lancar
  asetTetap: number
  asetTakBerwujud: number
  investasiJangkaPanjang: number
  aktivaTidakLancarLain: number
  // Liabilitas Lancar
  utangUsaha: number
  utangBankPendek: number
  liabilitasLancarLain: number
  // Liabilitas Jangka Panjang
  utangJangkaPanjang: number
  liabilitasJangkaPanjangLain: number
  // Ekuitas
  modalSaham: number
  saldoLaba: number
  ekuitasLain: number
}

// ---- Income statement (Laba Rugi) ----
export type IncomeStatement = {
  pendapatan: number
  cogs: number
  bebanPenjualan: number
  bebanAdmin: number
  pendapatanLain: number
  bebanLain: number
  bebanBunga: number
  bebanPajak: number
  sahamBeredar: number // weighted average shares outstanding
}

// ---- Cash flow (Arus Kas) ----
export type CashFlow = {
  arusKasOperasi: number
  arusKasInvestasi: number
  capex: number
  arusKasPendanaan: number
  dividenDibayar: number // total dividends paid (optional)
}

// ---- Market data & assumptions ----
export type MarketAssumptions = {
  hargaSaham: number
  dividenPerSaham: number // for the Dividend Discount Model
  beta: number
  riskFreeRate: number // %
  equityRiskPremium: number // %
  costOfDebtManual: number // %, optional manual override (NaN = auto from interest / debt)
  taxRateManual: number // %, optional manual override (NaN = auto from tax / EBT)
  growthShort: number // % short-term (5y) growth
  growthTerminal: number // % perpetuity growth
  perSektor: number // sector average P/E (optional)
  pbvSektor: number // sector average P/BV (optional)
  // Pre-profitability / growth-stage real options inputs
  preProfit: boolean
  optionS: number // present value of the expansion opportunity
  optionX: number // investment cost to execute
  optionSigma: number // volatility estimate, %
  optionT: number // option life, years
}

// ---- Prior-period comparison data (for Piotroski F-Score) ----
export type PriorPeriod = {
  totalAsetLalu: number
  labaBersihLalu: number
  arusKasOperasiLalu: number
  leverageLalu: number // long-term debt / total assets (ratio)
  currentRatioLalu: number
  sahamBeredarLalu: number
  grossMarginLalu: number // %
  assetTurnoverLalu: number // ×
}

// ---- The full model held in shared context ----
export type FinancialModel = {
  identity: CompanyIdentity
  balance: BalanceSheet
  income: IncomeStatement
  cashflow: CashFlow
  market: MarketAssumptions
  prior: PriorPeriod
}

// =====================================================================
//  Empty / default values
// =====================================================================

const emptyBalance: BalanceSheet = {
  kas: NaN,
  piutang: NaN,
  persediaan: NaN,
  aktivaLancarLain: NaN,
  asetTetap: NaN,
  asetTakBerwujud: NaN,
  investasiJangkaPanjang: NaN,
  aktivaTidakLancarLain: NaN,
  utangUsaha: NaN,
  utangBankPendek: NaN,
  liabilitasLancarLain: NaN,
  utangJangkaPanjang: NaN,
  liabilitasJangkaPanjangLain: NaN,
  modalSaham: NaN,
  saldoLaba: NaN,
  ekuitasLain: NaN,
}

const emptyIncome: IncomeStatement = {
  pendapatan: NaN,
  cogs: NaN,
  bebanPenjualan: NaN,
  bebanAdmin: NaN,
  pendapatanLain: NaN,
  bebanLain: NaN,
  bebanBunga: NaN,
  bebanPajak: NaN,
  sahamBeredar: NaN,
}

const emptyCashFlow: CashFlow = {
  arusKasOperasi: NaN,
  arusKasInvestasi: NaN,
  capex: NaN,
  arusKasPendanaan: NaN,
  dividenDibayar: NaN,
}

const defaultMarket: MarketAssumptions = {
  hargaSaham: NaN,
  dividenPerSaham: NaN,
  beta: 1.0,
  riskFreeRate: 6,
  equityRiskPremium: 6.5,
  costOfDebtManual: NaN,
  taxRateManual: NaN,
  growthShort: 8,
  growthTerminal: 3,
  perSektor: NaN,
  pbvSektor: NaN,
  preProfit: false,
  optionS: NaN,
  optionX: NaN,
  optionSigma: 40,
  optionT: 5,
}

const emptyPrior: PriorPeriod = {
  totalAsetLalu: NaN,
  labaBersihLalu: NaN,
  arusKasOperasiLalu: NaN,
  leverageLalu: NaN,
  currentRatioLalu: NaN,
  sahamBeredarLalu: NaN,
  grossMarginLalu: NaN,
  assetTurnoverLalu: NaN,
}

export const EMPTY_IDENTITY: CompanyIdentity = {
  nama: '',
  kode: '',
  sektor: 'Perbankan',
  periode: '',
}

export const EMPTY_MODEL: FinancialModel = {
  identity: EMPTY_IDENTITY,
  balance: emptyBalance,
  income: emptyIncome,
  cashflow: emptyCashFlow,
  market: defaultMarket,
  prior: emptyPrior,
}

// =====================================================================
//  Derived aggregates — computed from the raw model.
//  These are the figures every calculation module consumes.
// =====================================================================

const ok = (n: number) => Number.isFinite(n)
/** Sum treating NaN (empty) as 0, but return NaN if every term is empty. */
function sum(...vals: number[]): number {
  const present = vals.filter(ok)
  if (present.length === 0) return NaN
  return present.reduce((a, b) => a + b, 0)
}

export type Derived = {
  // Balance sheet totals
  totalAktivaLancar: number
  totalAktivaTidakLancar: number
  totalAset: number
  totalLiabilitasLancar: number
  totalLiabilitasJangkaPanjang: number
  totalLiabilitas: number
  totalUtangBerbunga: number // interest-bearing debt (short + long bank/bond)
  totalEkuitas: number
  kas: number
  persediaan: number
  // Balance validation
  balanceDiff: number // Total Aset − (Total Liabilitas + Ekuitas)
  balanceOk: boolean
  // Income statement subtotals
  labaKotor: number
  ebit: number // laba usaha / operating profit
  ebt: number // laba sebelum pajak
  labaBersih: number
  pendapatan: number
  bebanBunga: number
  sahamBeredar: number
  // Cash flow
  arusKasOperasi: number
  capex: number
  freeCashFlow: number // FCFF = arus kas operasi − capex
}

/** Compute all derived subtotals and validation flags from a raw model. */
export function computeDerived(m: FinancialModel): Derived {
  const b = m.balance
  const i = m.income
  const c = m.cashflow

  const totalAktivaLancar = sum(b.kas, b.piutang, b.persediaan, b.aktivaLancarLain)
  const totalAktivaTidakLancar = sum(
    b.asetTetap,
    b.asetTakBerwujud,
    b.investasiJangkaPanjang,
    b.aktivaTidakLancarLain,
  )
  const totalAset = sum(totalAktivaLancar, totalAktivaTidakLancar)

  const totalLiabilitasLancar = sum(b.utangUsaha, b.utangBankPendek, b.liabilitasLancarLain)
  const totalLiabilitasJangkaPanjang = sum(b.utangJangkaPanjang, b.liabilitasJangkaPanjangLain)
  const totalLiabilitas = sum(totalLiabilitasLancar, totalLiabilitasJangkaPanjang)
  const totalUtangBerbunga = sum(b.utangBankPendek, b.utangJangkaPanjang)
  const totalEkuitas = sum(b.modalSaham, b.saldoLaba, b.ekuitasLain)

  const balanceDiff =
    ok(totalAset) && ok(totalLiabilitas) && ok(totalEkuitas)
      ? totalAset - (totalLiabilitas + totalEkuitas)
      : NaN
  // Tolerate rounding within 0.5% of total assets.
  const balanceOk = ok(balanceDiff) && ok(totalAset) && totalAset !== 0
    ? Math.abs(balanceDiff) <= Math.abs(totalAset) * 0.005
    : false

  const labaKotor = ok(i.pendapatan) || ok(i.cogs) ? sum(i.pendapatan, -(ok(i.cogs) ? i.cogs : 0)) : NaN
  const opex = sum(i.bebanPenjualan, i.bebanAdmin)
  const ebit = ok(labaKotor) ? labaKotor - (ok(opex) ? opex : 0) : NaN
  const ebt = ok(ebit)
    ? ebit +
      (ok(i.pendapatanLain) ? i.pendapatanLain : 0) -
      (ok(i.bebanLain) ? i.bebanLain : 0) -
      (ok(i.bebanBunga) ? i.bebanBunga : 0)
    : NaN
  const labaBersih = ok(ebt) ? ebt - (ok(i.bebanPajak) ? i.bebanPajak : 0) : NaN

  const capex = ok(c.capex) ? c.capex : NaN
  const freeCashFlow =
    ok(c.arusKasOperasi) ? c.arusKasOperasi - (ok(capex) ? capex : 0) : NaN

  return {
    totalAktivaLancar,
    totalAktivaTidakLancar,
    totalAset,
    totalLiabilitasLancar,
    totalLiabilitasJangkaPanjang,
    totalLiabilitas,
    totalUtangBerbunga,
    totalEkuitas,
    kas: b.kas,
    persediaan: b.persediaan,
    balanceDiff,
    balanceOk,
    labaKotor,
    ebit,
    ebt,
    labaBersih,
    pendapatan: i.pendapatan,
    bebanBunga: i.bebanBunga,
    sahamBeredar: i.sahamBeredar,
    arusKasOperasi: c.arusKasOperasi,
    capex,
    freeCashFlow,
  }
}
