import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const recentRequests = new Map<string, number>();
const dbHeaders = {
  "Content-Type": "application/json",
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" | "1mo";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

const yahooConfig: Record<Timeframe, { range: string; interval: string }> = {
  "1m": { range: "7d", interval: "1m" },
  "5m": { range: "60d", interval: "5m" },
  "15m": { range: "60d", interval: "15m" },
  "30m": { range: "60d", interval: "30m" },
  "1h": { range: "730d", interval: "1h" },
  "4h": { range: "730d", interval: "1h" },
  "1d": { range: "2y", interval: "1d" },
  "1w": { range: "10y", interval: "1wk" },
  "1mo": { range: "max", interval: "1mo" },
};

function validTimeframe(value: string | null): Timeframe {
  return (value && value in yahooConfig ? value : "1d") as Timeframe;
}

async function loadAssets(symbol?: string) {
  const query = new URLSearchParams({ select: "id,symbol,provider,provider_symbol,market,asset_class", is_active: "eq.true", limit: "100" });
  if (symbol) {
    const symbols = [...new Set(symbol.split(",").map((value) => value.trim().toUpperCase()).filter((value) => /^[A-Z0-9.^=_-]+$/.test(value)))];
    if (!symbols.length) return [];
    query.set("symbol", symbols.length === 1 ? `eq.${symbols[0]}` : `in.(${symbols.join(",")})`);
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/market_assets?${query}`, { headers: dbHeaders });
  if (!response.ok) throw new Error(`Asset query failed (${response.status})`);
  return await response.json();
}

async function upsert(table: string, rows: unknown[], onConflict: string) {
  if (!rows.length) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { ...dbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`${table} write failed (${response.status}): ${await response.text()}`);
}


let idxCookie = "";
let idxSessionAt = 0;
let idxUnavailableUntil = 0;
const IDX_SESSION_TTL_MS = 10 * 60_000;
const IDX_BLOCK_BACKOFF_MS = 5 * 60_000;

const idxBrowserHeaders = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  Referer: "https://www.idx.co.id/",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getIdxCookie(force = false) {
  if (!force && idxCookie && Date.now() - idxSessionAt < IDX_SESSION_TTL_MS) return idxCookie;
  if (!force && Date.now() < idxUnavailableUntil) throw new Error("IDX temporarily unavailable (Cloudflare/session protection)");
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch("https://www.idx.co.id/id", { headers: { ...idxBrowserHeaders, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" } });
    if (response.ok) {
      const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
      idxCookie = cookies.join("; ");
      idxSessionAt = Date.now();
      const validation = await fetch("https://www.idx.co.id/primary/home/GetIndexList", { headers: { ...idxBrowserHeaders, ...(idxCookie ? { Cookie: idxCookie } : {}) } });
      if (validation.ok) return idxCookie;
    }
    idxCookie = "";
    idxSessionAt = 0;
    if (attempt < 2) await wait(500);
  }
  idxUnavailableUntil = Date.now() + IDX_BLOCK_BACKOFF_MS;
  throw new Error("IDX session unavailable (Cloudflare/session protection)");
}

async function fetchIdxJson(endpoint: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const cookie = await getIdxCookie(attempt > 0);
    const response = await fetch(endpoint, { headers: { ...idxBrowserHeaders, ...(cookie ? { Cookie: cookie } : {}) } });
    if (response.ok) return response.json();
    if (response.status === 403 && attempt === 0) {
      idxCookie = "";
      idxSessionAt = 0;
      idxUnavailableUntil = 0;
      await wait(500);
      continue;
    }
    throw new Error(`IDX trading endpoint returned ${response.status}`);
  }
  throw new Error("IDX endpoint retry exhausted");
}

async function ingestIdxDaily(asset: any) {
  const endpoint = `https://www.idx.co.id/primary/ListedCompany/GetTradingInfoDaily?code=${encodeURIComponent(asset.symbol)}`;
  const item = await fetchIdxJson(endpoint);
  if (!item?.SecurityCode || !Number.isFinite(Number(item.ClosingPrice))) throw new Error("IDX returned no daily trading record");
  const candleTime = item.DTCreate ? new Date(item.DTCreate).toISOString() : new Date().toISOString();
  const close = Number(item.ClosingPrice);
  const previous = Number(item.PreviousPrice);
  const candle = { asset_id: asset.id, provider: "idx", timeframe: "1d", candle_time: candleTime, open: Number(item.OpeningPrice ?? close), high: Number(item.HighestPrice ?? close), low: Number(item.LowestPrice ?? close), close, adjusted_close: close, volume: Number(item.TradedVolume ?? 0), is_delayed: false };
  await upsert("market_candles", [candle], "asset_id,provider,timeframe,candle_time");
  await upsert("market_quotes", [{ asset_id: asset.id, provider: "idx", price: close, change_absolute: Number(item.Change ?? (close - previous)), change_percent: previous ? ((close - previous) / previous) * 100 : null, volume: Number(item.TradedVolume ?? 0), market_time: candleTime, is_delayed: false, raw_payload: { source: "IDX", symbol: asset.symbol, board: item.BoardCode ?? null, updated_at: item.DTCreate ?? null } }], "asset_id,provider,market_time");
  return { symbol: asset.symbol, provider: "idx", timeframe: "1d", candles: 1, price: close, source_status: "live_candidate", market_time: candleTime };
}

function iso(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toISOString();
}

function aggregateFourHour(candles: any[]) {
  const buckets = new Map<number, any>();
  for (const candle of candles) {
    const bucket = Math.floor(candle.timestamp / 14400) * 14400;
    const existing = buckets.get(bucket);
    if (!existing) buckets.set(bucket, { ...candle, timestamp: bucket });
    else {
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
      existing.adjustedClose = candle.adjustedClose;
      existing.volume = (existing.volume ?? 0) + (candle.volume ?? 0);
    }
  }
  return [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp);
}

async function ingestYahoo(asset: any, timeframe: Timeframe) {
  const config = yahooConfig[timeframe];
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.provider_symbol)}?range=${config.range}&interval=${config.interval}&events=div%2Csplits`;
  const response = await fetch(endpoint, { headers: { "User-Agent": "EquityInsight/1.0" } });
  if (!response.ok) throw new Error(`Yahoo returned ${response.status}`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  if (!result) throw new Error("Yahoo returned no chart result");
  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const adjustedCloses: Array<number | null> = result.indicators?.adjclose?.[0]?.adjclose ?? [];
  const raw = timestamps.flatMap((timestamp, index) => {
    const open = quote.open?.[index];
    const high = quote.high?.[index];
    const low = quote.low?.[index];
    const close = quote.close?.[index];
    if (![open, high, low, close].every((value) => typeof value === "number" && Number.isFinite(value))) return [];
    const adjustedClose = adjustedCloses[index];
    return [{ timestamp, open, high, low, close, adjustedClose: typeof adjustedClose === "number" && Number.isFinite(adjustedClose) && adjustedClose > 0 ? adjustedClose : close, volume: quote.volume?.[index] ?? null }];
  });
  const normalized = timeframe === "4h" ? aggregateFourHour(raw) : raw;
  const candles = normalized.map((candle) => ({ asset_id: asset.id, provider: "yahoo", timeframe, candle_time: iso(candle.timestamp), open: candle.open, high: candle.high, low: candle.low, close: candle.close, adjusted_close: candle.adjustedClose, volume: candle.volume, is_delayed: true }));
  await upsert("market_candles", candles, "asset_id,provider,timeframe,candle_time");
  const meta = result.meta ?? {};
  const price = Number(meta.regularMarketPrice ?? normalized.at(-1)?.close);
  const previous = Number(meta.previousClose ?? meta.chartPreviousClose);
  await upsert("market_quotes", [{ asset_id: asset.id, provider: "yahoo", price: Number.isFinite(price) ? price : null, change_absolute: Number.isFinite(price) && Number.isFinite(previous) ? price - previous : null, change_percent: Number.isFinite(price) && Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : null, volume: meta.regularMarketVolume ?? normalized.at(-1)?.volume ?? null, market_time: meta.regularMarketTime ? iso(meta.regularMarketTime) : candles.at(-1)?.candle_time ?? new Date().toISOString(), is_delayed: true, raw_payload: { source: "yahoo", symbol: asset.provider_symbol, timeframe } }], "asset_id,provider,market_time");
  return { symbol: asset.symbol, provider: "yahoo", timeframe, candles: candles.length, price };
}

async function ingestFred(asset: any, timeframe: Timeframe) {
  if (!["1d", "1w", "1mo"].includes(timeframe)) return { symbol: asset.symbol, provider: "fred", timeframe, candles: 0, skipped: "FRED Treasury series are daily" };
  const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(asset.provider_symbol)}`);
  if (!response.ok) throw new Error(`FRED returned ${response.status}`);
  const text = await response.text();
  const observations = text.trim().split("\n").slice(1).flatMap((line) => {
    const [date, rawValue] = line.split(",");
    const value = Number(rawValue);
    return date && Number.isFinite(value) ? [{ date, value }] : [];
  });
  if (!observations.length) throw new Error("FRED returned no observations");
  const candles = observations.slice(-365).map(({ date, value }) => ({ asset_id: asset.id, provider: "fred", timeframe: "1d", candle_time: `${date}T00:00:00.000Z`, open: value, high: value, low: value, close: value, adjusted_close: value, volume: null, is_delayed: true }));
  await upsert("market_candles", candles, "asset_id,provider,timeframe,candle_time");
  const last = observations.at(-1)!;
  await upsert("market_quotes", [{ asset_id: asset.id, provider: "fred", price: last.value, change_absolute: null, change_percent: null, volume: null, market_time: `${last.date}T00:00:00.000Z`, is_delayed: true, raw_payload: { source: "fred", series: asset.provider_symbol } }], "asset_id,provider,market_time");
  return { symbol: asset.symbol, provider: "fred", timeframe: "1d", candles: candles.length, value: last.value };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders });
  try {
    const clientId = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "anonymous";
    const lastRequest = recentRequests.get(clientId) ?? 0;
    if (Date.now() - lastRequest < 15000) return reply({ error: "Please wait before refreshing market data again." }, 429);
    recentRequests.set(clientId, Date.now());
    if (!["GET", "POST"].includes(request.method)) return reply({ error: "Use GET or POST" }, 405);
    const url = new URL(request.url);
    const timeframe = validTimeframe(url.searchParams.get("timeframe"));
    const assets = await loadAssets(url.searchParams.get("symbol") ?? undefined);
    if (!assets.length) return reply({ error: "Asset not found" }, 404);
    const results = [];
    const errors = [];
    for (const asset of assets) {
      try {
        if (asset.market === "IDX" && asset.asset_class === "IDX_STOCK" && timeframe === "1d") {
          let history: any = null;
          let historyError: unknown = null;
          try {
            history = await ingestYahoo(asset, timeframe);
          } catch (error) {
            historyError = error;
          }
          try {
            results.push(await ingestIdxDaily(asset));
            if (history) results.push({ ...history, source_status: "yahoo_adjusted_history" });
            else if (historyError) results.push({ symbol: asset.symbol, provider: "idx", source_status: "idx_only", history_error: historyError instanceof Error ? historyError.message : String(historyError) });
          } catch (idxError) {
            if (history) results.push({ ...history, source_status: "fallback_yahoo", idx_error: idxError instanceof Error ? idxError.message : String(idxError) });
            else throw new Error(`IDX and Yahoo history failed: ${idxError instanceof Error ? idxError.message : String(idxError)}; ${historyError instanceof Error ? historyError.message : String(historyError)}`);
          }
        } else {
          results.push(asset.provider === "fred" ? await ingestFred(asset, timeframe) : await ingestYahoo(asset, timeframe));
        }
      } catch (error) { errors.push({ symbol: asset.symbol, error: error instanceof Error ? error.message : String(error) }); }
    }
    return reply({ ok: errors.length === 0, results, errors, timeframe, fetched_at: new Date().toISOString() }, errors.length && !results.length ? 502 : 200);
  } catch (error) { return reply({ error: error instanceof Error ? error.message : String(error) }, 500); }
});
