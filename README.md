# EquityInsight

EquityInsight is a fundamental-investing workspace for Indonesian equities, US market context, Treasury yields, commodities, and company valuation scenarios.

## Current modules

- **Dashboard** — overview and analysis shortcuts.
- **Data Pasar** — Supabase-backed market terminal with IDX assets, US indices, US Treasury yields, and commodities.
- **Valuasi Perusahaan** — Graham Number, DCF/NPV, DDM, PER/PBV, and margin of safety.
- **Analisis Kinerja** — profitability, solvency, liquidity, and efficiency ratios.
- **Analisis Saham** — shared financial inputs powering valuation and performance analysis.

## Stack

- Next.js 16 + React 19
- TypeScript
- Tailwind CSS
- Supabase Database + Edge Functions
- Yahoo Finance-compatible chart ingestion for market assets
- FRED series ingestion for US Treasury yields

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Set these variables in `.env.local` and in the deployment environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ubjljepundgttrohrwou.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The dedicated Supabase project is `equityinsight-db` in the Singapore region. It is separate from the existing Personal Web Database project used by the resume site.

## Market data flow

```text
Market terminal
  -> Supabase REST / latest_market_quotes + market_candles
  -> ingest-market-data Edge Function
  -> Yahoo-compatible market endpoint / FRED public series
  -> Supabase cache
```

The UI intentionally labels data as delayed/EOD when the provider is not a licensed real-time feed. A paid exchange-licensed provider can be added later without changing the UI because assets store their provider and provider symbol separately.

## Important disclaimer

Valuation outputs are analytical estimates, not investment advice. Graham, DCF, NPV, ratio benchmarks, and scenario assumptions are models with different assumptions and should not be treated as interchangeable truth.
