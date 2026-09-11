'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  EMPTY_INPUTS,
  type BalanceSheet,
  type CashFlowStatement,
  type CompanyIdentity,
  type FinancialInputs,
  type IncomeStatement,
  type MarketData,
  type PriorPeriod,
} from '@/lib/types'
import { deriveStatement, type DerivedStatement } from '@/lib/statements'

// Satu sumber kebenaran untuk laporan keuangan yang dipakai bersama oleh
// /valuasi, /kinerja, dan /saham. Disimpan in-memory (belum ada database).

type FinancialsContextValue = {
  inputs: FinancialInputs
  derived: DerivedStatement
  setIdentity: (patch: Partial<CompanyIdentity>) => void
  setBalance: (patch: Partial<BalanceSheet>) => void
  setIncome: (patch: Partial<IncomeStatement>) => void
  setCashflow: (patch: Partial<CashFlowStatement>) => void
  setMarket: (patch: Partial<MarketData>) => void
  setPrior: (patch: Partial<PriorPeriod>) => void
  reset: () => void
  loadExample: () => void
}

const FinancialsContext = createContext<FinancialsContextValue | null>(null)

/** Contoh data ilustratif (perusahaan konsumer mapan) untuk mencoba modul. */
export const EXAMPLE_INPUTS: FinancialInputs = {
  identity: { nama: 'PT Sinar Konsumer Tbk', kode: 'SKON', sektor: 'Konsumer', periode: 'FY 2025' },
  balance: {
    kas: 4.2e12,
    piutangUsaha: 3.1e12,
    persediaan: 2.6e12,
    asetLancarLain: 0.9e12,
    asetTetap: 9.8e12,
    asetTakBerwujud: 0.7e12,
    investasiJangkaPanjang: 1.1e12,
    asetTidakLancarLain: 0.6e12,
    utangUsaha: 2.4e12,
    utangBankPendek: 1.2e12,
    liabilitasLancarLain: 0.8e12,
    utangBankPanjang: 3.5e12,
    liabilitasPanjangLain: 0.6e12,
    modalSaham: 5.0e12,
    saldoLaba: 8.9e12,
    ekuitasLain: 0.6e12,
  },
  income: {
    pendapatan: 28.5e12,
    hpp: 18.2e12,
    bebanPenjualan: 3.1e12,
    bebanUmumAdmin: 2.2e12,
    pendapatanLain: 0.3e12,
    bebanLain: 0.15e12,
    bebanBunga: 0.42e12,
    bebanPajak: 1.05e12,
    sahamBeredar: 11.6e9,
  },
  cashflow: {
    arusKasOperasi: 4.6e12,
    arusKasInvestasi: -2.1e12,
    capex: 1.8e12,
    arusKasPendanaan: -1.9e12,
    dividenDibayar: 1.6e12,
  },
  market: {
    ...EMPTY_INPUTS.market,
    hargaSaham: 2150,
    beta: 0.9,
    perSektor: 16,
    pbvSektor: 2.4,
    roeSektor: 18,
  },
  prior: {
    totalAset: 21.4e12,
    labaBersih: 3.2e12,
    roa: 15.0,
    leverage: 0.24,
    currentRatio: 2.3,
    sahamBeredar: 11.6e9,
    grossMargin: 35.2,
    assetTurnover: 1.22,
  },
}

export function FinancialsProvider({ children }: { children: React.ReactNode }) {
  const [inputs, setInputs] = useState<FinancialInputs>(EMPTY_INPUTS)

  const patch = useCallback(
    <K extends keyof FinancialInputs>(key: K) =>
      (p: Partial<FinancialInputs[K]>) =>
        setInputs((s) => ({ ...s, [key]: { ...s[key], ...p } })),
    [],
  )

  const value = useMemo<FinancialsContextValue>(
    () => ({
      inputs,
      derived: deriveStatement(inputs),
      setIdentity: patch('identity'),
      setBalance: patch('balance'),
      setIncome: patch('income'),
      setCashflow: patch('cashflow'),
      setMarket: patch('market'),
      setPrior: patch('prior'),
      reset: () => setInputs(EMPTY_INPUTS),
      loadExample: () => setInputs(EXAMPLE_INPUTS),
    }),
    [inputs, patch],
  )

  return <FinancialsContext.Provider value={value}>{children}</FinancialsContext.Provider>
}

export function useFinancials(): FinancialsContextValue {
  const ctx = useContext(FinancialsContext)
  if (!ctx) throw new Error('useFinancials harus dipakai di dalam FinancialsProvider')
  return ctx
}
