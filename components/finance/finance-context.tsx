'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import {
  computeDerived,
  EMPTY_MODEL,
  type BalanceSheet,
  type CashFlow,
  type CompanyIdentity,
  type Derived,
  type FinancialModel,
  type IncomeStatement,
  type MarketAssumptions,
  type PriorPeriod,
} from '@/lib/types'

type FinanceContextValue = {
  model: FinancialModel
  derived: Derived
  setIdentity: (patch: Partial<CompanyIdentity>) => void
  setBalance: (patch: Partial<BalanceSheet>) => void
  setIncome: (patch: Partial<IncomeStatement>) => void
  setCashFlow: (patch: Partial<CashFlow>) => void
  setMarket: (patch: Partial<MarketAssumptions>) => void
  setPrior: (patch: Partial<PriorPeriod>) => void
  loadSample: () => void
  reset: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

// A realistic illustrative dataset (a mid-cap consumer company) so users can
// explore every module immediately without typing a full statement.
const SAMPLE: FinancialModel = {
  identity: { nama: 'PT Sinar Konsumer Tbk', kode: 'SKON', sektor: 'Konsumer', periode: 'FY 2025' },
  balance: {
    kas: 3_200_000_000_000,
    piutang: 2_100_000_000_000,
    persediaan: 2_800_000_000_000,
    aktivaLancarLain: 900_000_000_000,
    asetTetap: 9_400_000_000_000,
    asetTakBerwujud: 1_200_000_000_000,
    investasiJangkaPanjang: 1_500_000_000_000,
    aktivaTidakLancarLain: 700_000_000_000,
    utangUsaha: 1_800_000_000_000,
    utangBankPendek: 1_200_000_000_000,
    liabilitasLancarLain: 700_000_000_000,
    utangJangkaPanjang: 3_500_000_000_000,
    liabilitasJangkaPanjangLain: 600_000_000_000,
    modalSaham: 5_000_000_000_000,
    saldoLaba: 10_100_000_000_000,
    ekuitasLain: 1_600_000_000_000,
  },
  income: {
    pendapatan: 24_000_000_000_000,
    cogs: 14_400_000_000_000,
    bebanPenjualan: 2_600_000_000_000,
    bebanAdmin: 2_100_000_000_000,
    pendapatanLain: 350_000_000_000,
    bebanLain: 200_000_000_000,
    bebanBunga: 470_000_000_000,
    bebanPajak: 1_050_000_000_000,
    sahamBeredar: 12_000_000_000,
  },
  cashflow: {
    arusKasOperasi: 4_600_000_000_000,
    arusKasInvestasi: -1_900_000_000_000,
    capex: 1_700_000_000_000,
    arusKasPendanaan: -1_200_000_000_000,
    dividenDibayar: 1_320_000_000_000,
  },
  market: {
    hargaSaham: 1_850,
    dividenPerSaham: 110,
    beta: 0.95,
    riskFreeRate: 6,
    equityRiskPremium: 6.5,
    costOfDebtManual: NaN,
    taxRateManual: NaN,
    growthShort: 9,
    growthTerminal: 3,
    perSektor: 15,
    pbvSektor: 2.4,
    preProfit: false,
    optionS: NaN,
    optionX: NaN,
    optionSigma: 40,
    optionT: 5,
  },
  prior: {
    totalAsetLalu: 21_800_000_000_000,
    labaBersihLalu: 2_650_000_000_000,
    arusKasOperasiLalu: 4_100_000_000_000,
    leverageLalu: 0.2,
    currentRatioLalu: 1.9,
    sahamBeredarLalu: 12_000_000_000,
    grossMarginLalu: 39,
    assetTurnoverLalu: 1.02,
  },
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [model, setModel] = useState<FinancialModel>(EMPTY_MODEL)

  const value = useMemo<FinanceContextValue>(() => {
    return {
      model,
      derived: computeDerived(model),
      setIdentity: (patch) => setModel((s) => ({ ...s, identity: { ...s.identity, ...patch } })),
      setBalance: (patch) => setModel((s) => ({ ...s, balance: { ...s.balance, ...patch } })),
      setIncome: (patch) => setModel((s) => ({ ...s, income: { ...s.income, ...patch } })),
      setCashFlow: (patch) => setModel((s) => ({ ...s, cashflow: { ...s.cashflow, ...patch } })),
      setMarket: (patch) => setModel((s) => ({ ...s, market: { ...s.market, ...patch } })),
      setPrior: (patch) => setModel((s) => ({ ...s, prior: { ...s.prior, ...patch } })),
      loadSample: () => setModel(SAMPLE),
      reset: () => setModel(EMPTY_MODEL),
    }
  }, [model])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within a FinanceProvider')
  return ctx
}
