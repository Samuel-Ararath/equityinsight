# EquityInsight market-data backend (phase 1)

This service is a separate Python/FastAPI gateway for **historical** OHLCV requests. It uses OpenBB's equity, index, crypto, and currency historical routers, a provider-specific extension, and Redis caching.

It is not a Bloomberg replacement or a guaranteed real-time feed. OpenBB supplies provider connectors, not the underlying data; provider coverage, API keys, rate limits, delay, and redistribution rights remain provider-specific. The default `yfinance` path is explicitly labelled historical/delayed by this API.

## Local run

```bash
cd backend
cp .env.example .env
# Set API_ACCESS_TOKEN to a long random value in .env.
docker compose up --build
```

Health is available at `http://localhost:8000/health`; interactive API docs are at `http://localhost:8000/docs`.

Example:

```bash
curl \
  -H "Authorization: Bearer $API_ACCESS_TOKEN" \
  "http://localhost:8000/api/v1/market/history?market=equity&symbol=AAPL&provider=yfinance&interval=1d"
```

Supported markets: `equity`, `index`, `crypto`, and `currency`. The response is normalized to the site's candle fields (`candle_time`, OHLC, optional `adjusted_close`, `volume`, `provider`, and `is_delayed`). A cache hit is indicated by `X-Cache: HIT`.

## Security and deployment

- `API_ACCESS_TOKEN` is required for market-history requests. Do not expose it in the static Next.js app or any `NEXT_PUBLIC_*` variable.
- `CORS_ORIGINS` should list the actual frontend origins, but CORS is not authentication. Put a private server-side proxy (for example, a Supabase Edge Function with a secret) in front of the API before connecting the public website.
- Redis is used for shared TTL caching. If Redis is unavailable, the service falls back to a process-local cache for development; that fallback is not shared between replicas.
- Add provider credentials only to the backend's secret environment. Never commit `.env`.
- No WebSocket feed, Finnhub/Massive integration, news ingestion, FinNLP, or automated trading is included in this phase; those require provider/hosting choices and should be added as separate adapters.

## OpenBB licensing

The OpenBB repository declares AGPL-3.0. Review the applicable license obligations for public network use and any modifications before deploying. This README is not legal advice. See the [OpenBB license](https://github.com/OpenBB-finance/OpenBB/blob/develop/LICENSE).

## Data/provider documentation

- [OpenBB historical equity prices](https://docs.openbb.co/odp/python/reference/equity/price/historical)
- [OpenBB provider extensions and API-key requirements](https://docs.openbb.co/odp/python/extensions/providers)