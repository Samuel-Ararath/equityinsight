import type { FinancialInputs } from '@/lib/types'

// =====================================================================
//  DERIVED FINANCIAL STATEMENT
//  Menghitung sub-total & total dari komponen mentah sehingga modul
//  valuasi/kinerja bekerja dari satu set angka yang konsisten.
// =====================================================================

export const ok = (n: number): boolean => Number.isFinite(n)

/** NaN dianggap 0 untuk komponen opsional (mis. beban lain-lain). */
export const n0 = (n: number): number => (ok(n) ? n : 0)

/** Jumlahkan komponen; NaN bila tidak ada satu pun yang terisi. */
export function sumDefined(values: number[]): number {
  const filled = values.filter(ok)
  if (filled.length === 0) return NaN
  return filled.reduce((s, v) => s + v, 0)
}

export type RateSource = 'manual' | 'auto' | 'default'

export type DerivedStatement = {
  // Neraca
  totalAsetLancar: number
  totalAsetTidakLancar: number
  totalAset: number
  totalLiabilitasLancar: number
  totalLiabilitasPanjang: number
  totalLiabilitas: number
  totalEkuitas: number
  /** Utang berbunga (bank/obligasi) — basis WACC & DER. */
  utangBerbunga: number
  /** null bila neraca belum cukup terisi untuk diuji. */
  isBalanced: boolean | null
  balanceDiff: number
  modalKerja: number
  // Laba Rugi
  labaKotor: number
  ebit: number
  ebt: number
  labaBersih: number
  // Turunan pasar
  dividenPerSaham: number
  marketCap: number
  // Tarif & biaya utang efektif (persen) beserta sumbernya
  taxRateAuto: number
  taxRate: number
  taxRateSource: RateSource
  costOfDebtAuto: number
  costOfDebt: number
  costOfDebtSource: RateSource
}

/** Tarif PPh Badan Indonesia (UU HPP 2021) — fallback bila data pajak tidak tersedia. */
export const DEFAULT_TAX_RATE = 22

export function deriveStatement(inp: FinancialInputs): DerivedStatement {
  const b = inp.balance
  const i = inp.income
  const c = inp.cashflow
  const m = inp.market

  // ---- Neraca ----
  const totalAsetLancar = sumDefined([b.kas, b.piutangUsaha, b.persediaan, b.asetLancarLain])
  const totalAsetTidakLancar = sumDefined([
    b.asetTetap,
    b.asetTakBerwujud,
    b.investasiJangkaPanjang,
    b.asetTidakLancarLain,
  ])
  const totalAset = sumDefined([totalAsetLancar, totalAsetTidakLancar])
  const totalLiabilitasLancar = sumDefined([b.utangUsaha, b.utangBankPendek, b.liabilitasLancarLain])
  const totalLiabilitasPanjang = sumDefined([b.utangBankPanjang, b.liabilitasPanjangLain])
  const totalLiabilitas = sumDefined([totalLiabilitasLancar, totalLiabilitasPanjang])
  const totalEkuitas = sumDefined([b.modalSaham, b.saldoLaba, b.ekuitasLain])
  const utangBerbunga = sumDefined([b.utangBankPendek, b.utangBankPanjang])

  const balanceDiff =
    ok(totalAset) && ok(totalLiabilitas) && ok(totalEkuitas)
      ? totalAset - (totalLiabilitas + totalEkuitas)
      : NaN
  // Toleransi 0,5% dari total aset untuk pembulatan laporan.
  const isBalanced = ok(balanceDiff)
    ? Math.abs(balanceDiff) <= Math.max(1, Math.abs(totalAset) * 0.005)
    : null

  const modalKerja =
    ok(totalAsetLancar) && ok(totalLiabilitasLancar) ? totalAsetLancar - totalLiabilitasLancar : NaN

  // ---- Laba Rugi ----
  const labaKotor = ok(i.pendapatan) ? i.pendapatan - n0(i.hpp) : NaN
  const ebit = ok(labaKotor) ? labaKotor - n0(i.bebanPenjualan) - n0(i.bebanUmumAdmin) : NaN
  const ebt = ok(ebit) ? ebit + n0(i.pendapatanLain) - n0(i.bebanLain) - n0(i.bebanBunga) : NaN
  const labaBersih = ok(ebt) ? ebt - n0(i.bebanPajak) : NaN

  // ---- Turunan pasar ----
  const dividenPerSaham =
    ok(c.dividenDibayar) && ok(i.sahamBeredar) && i.sahamBeredar > 0
      ? c.dividenDibayar / i.sahamBeredar
      : NaN
  const marketCap =
    ok(m.hargaSaham) && ok(i.sahamBeredar) ? m.hargaSaham * i.sahamBeredar : NaN

  // ---- Tarif pajak efektif ----
  const taxRateAuto =
    ok(i.bebanPajak) && ok(ebt) && ebt > 0 ? Math.min(Math.max((i.bebanPajak / ebt) * 100, 0), 60) : NaN
  let taxRate = DEFAULT_TAX_RATE
  let taxRateSource: RateSource = 'default'
  if (ok(m.taxRateOverride)) {
    taxRate = m.taxRateOverride
    taxRateSource = 'manual'
  } else if (ok(taxRateAuto)) {
    taxRate = taxRateAuto
    taxRateSource = 'auto'
  }

  // ---- Biaya utang sebelum pajak ----
  const costOfDebtAuto =
    ok(i.bebanBunga) && ok(utangBerbunga) && utangBerbunga > 0
      ? (i.bebanBunga / utangBerbunga) * 100
      : NaN
  // Fallback: risk-free + spread kredit 2% (proksi kasar obligasi korporasi investment grade).
  let costOfDebt = n0(m.riskFreeRate) + 2
  let costOfDebtSource: RateSource = 'default'
  if (ok(m.costOfDebtOverride)) {
    costOfDebt = m.costOfDebtOverride
    costOfDebtSource = 'manual'
  } else if (ok(costOfDebtAuto)) {
    costOfDebt = costOfDebtAuto
    costOfDebtSource = 'auto'
  }

  return {
    totalAsetLancar,
    totalAsetTidakLancar,
    totalAset,
    totalLiabilitasLancar,
    totalLiabilitasPanjang,
    totalLiabilitas,
    totalEkuitas,
    utangBerbunga,
    isBalanced,
    balanceDiff,
    modalKerja,
    labaKotor,
    ebit,
    ebt,
    labaBersih,
    dividenPerSaham,
    marketCap,
    taxRateAuto,
    taxRate,
    taxRateSource,
    costOfDebtAuto,
    costOfDebt,
    costOfDebtSource,
  }
}

/** Jumlah field terisi vs total, untuk indikator kelengkapan data. */
export function completeness(inp: FinancialInputs): { filled: number; total: number } {
  const groups = [inp.balance, inp.income, inp.cashflow] as Record<string, number>[]
  let filled = 0
  let total = 0
  for (const g of groups) {
    for (const v of Object.values(g)) {
      total++
      if (ok(v)) filled++
    }
  }
  total++
  if (ok(inp.market.hargaSaham)) filled++
  return { filled, total }
}
