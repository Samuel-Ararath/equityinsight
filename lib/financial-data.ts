export type FinancialFact = {
  id: string
  metric_key: string
  metric_label: string | null
  value: number | null
  unit: string
  source_tag: string | null
  confidence: 'verified' | 'estimated' | 'needs_review'
  notes: string | null
}

export type FinancialSnapshot = {
  id: string
  asset_id: string
  symbol: string
  period_label: string
  period_end: string
  statement_type: string
  currency: string
  source: string
  source_url: string | null
  filed_at: string | null
  confidence: 'verified' | 'estimated' | 'needs_review'
  facts: FinancialFact[]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase belum terhubung. Periksa GitHub Actions Variables/Secrets.')
}

async function rest<T>(path: string): Promise<T> {
  assertConfig()
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Financial data request gagal (${response.status})`)
  return response.json() as Promise<T>
}

export async function syncFinancialData(symbol: string) {
  assertConfig()
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ingest-financial-data?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`, { cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `Gagal mengambil laporan keuangan (${response.status})`)
  return payload as { ok: true; asset: string; source: string; source_url: string | null; period_label: string; period_end: string; facts: number; confidence: FinancialSnapshot['confidence']; fallback?: string | null }
}

async function loadSnapshots(path: string): Promise<FinancialSnapshot[]> {
  const snapshots = await rest<Omit<FinancialSnapshot, 'facts'>[]>(path)
  return Promise.all(snapshots.map(async (snapshot) => ({
    ...snapshot,
    facts: await rest<FinancialFact[]>(`financial_facts?select=id,metric_key,metric_label,value,unit,source_tag,confidence,notes&snapshot_id=eq.${encodeURIComponent(snapshot.id)}&order=metric_key.asc`),
  })))
}

export async function getLatestFinancialSnapshot(symbol: string): Promise<FinancialSnapshot | null> {
  const snapshots = await loadSnapshots(`latest_financial_snapshots?select=id,asset_id,symbol,period_label,period_end,statement_type,currency,source,source_url,filed_at,confidence&symbol=eq.${encodeURIComponent(symbol.trim().toUpperCase())}&limit=1`)
  return snapshots[0] ?? null
}

export async function getFinancialHistory(symbol: string): Promise<FinancialSnapshot[]> {
  return loadSnapshots(`financial_snapshots?select=id,asset_id,symbol,period_label,period_end,statement_type,currency,source,source_url,filed_at,confidence&symbol=eq.${encodeURIComponent(symbol.trim().toUpperCase())}&order=period_end.desc&limit=10`)
}

export const FACT_TO_FINANCIAL_FIELD: Record<string, string> = {
  net_income: 'labaBersih', shares: 'sahamBeredar', total_equity: 'totalEkuitas', total_assets: 'totalAset', total_debt: 'totalUtang', cash: 'kas', operating_cash_flow: 'arusKasOperasi', capex: 'capex', dividends_per_share: 'dividenPerSaham', revenue: 'pendapatan', gross_profit: 'labaKotor', operating_income: 'labaOperasi', interest_expense: 'bebanBunga', current_assets: 'asetLancar', current_liabilities: 'liabilitasLancar',
}
