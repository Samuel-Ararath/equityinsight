"""Authenticated historical-market API backed by OpenBB and Redis."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
import hashlib
import hmac
import json
import logging
import os
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.cache import CacheStore
from app.openbb_adapter import (
    Interval,
    Market,
    OpenBBUnavailable,
    SUPPORTED_PROVIDERS,
    fetch_history,
    validate_provider,
    validate_symbol,
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("equityinsight.api")

API_ACCESS_TOKEN = os.getenv("API_ACCESS_TOKEN", "").strip()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL_SECONDS = max(30, int(os.getenv("CACHE_TTL_SECONDS", "900")))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]


class Candle(BaseModel):
    candle_time: datetime
    open: float
    high: float
    low: float
    close: float
    adjusted_close: float | None = None
    volume: float | None = None
    provider: str
    is_delayed: bool = True


class HistoryResponse(BaseModel):
    market: Market
    symbol: str
    provider: str
    mode: Literal["historical"] = "historical"
    delayed: bool = True
    data_as_of: datetime | None
    candles: list[Candle]


@asynccontextmanager
async def lifespan(app: FastAPI):
    cache = CacheStore(REDIS_URL, CACHE_TTL_SECONDS)
    await cache.connect()
    app.state.cache = cache
    if not API_ACCESS_TOKEN:
        logger.warning("API_ACCESS_TOKEN is not set; protected endpoints will return 503.")
    yield
    await cache.close()


app = FastAPI(
    title="EquityInsight Market Data API",
    version="0.1.0",
    description="Historical market data gateway. Data is provider-sourced and is not a guaranteed real-time feed.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)


def require_api_token(authorization: Annotated[str | None, Header()] = None) -> None:
    if not API_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="API access token is not configured.")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required.")
    supplied = authorization[7:].strip()
    if not hmac.compare_digest(supplied.encode(), API_ACCESS_TOKEN.encode()):
        raise HTTPException(status_code=401, detail="Invalid API token.")


def cache_key(market: str, symbol: str, provider: str, start: date, end: date, interval: str) -> str:
    canonical = json.dumps(
        [market, symbol, provider, start.isoformat(), end.isoformat(), interval],
        separators=(",", ":"),
    )
    return "market:history:" + hashlib.sha256(canonical.encode()).hexdigest()


@app.get("/health")
async def health(request: Request) -> dict[str, str | bool]:
    cache: CacheStore | None = getattr(request.app.state, "cache", None)
    return {
        "status": "ok",
        "cache": cache.backend if cache else "unavailable",
        "api_auth_configured": bool(API_ACCESS_TOKEN),
        "data_mode": "historical",
    }


@app.get(
    "/api/v1/market/history",
    response_model=HistoryResponse,
    dependencies=[Depends(require_api_token)],
)
async def market_history(
    request: Request,
    response: Response,
    market: Market,
    symbol: Annotated[str, Query(min_length=1, max_length=40)],
    provider: Annotated[str, Query(min_length=2, max_length=32)] = "yfinance",
    interval: Interval = "1d",
    start_date: date | None = None,
    end_date: date | None = None,
) -> HistoryResponse:
    """Return normalized historical OHLCV candles; never advertises a live quote."""
    try:
        clean_symbol = validate_symbol(symbol)
        clean_provider = validate_provider(market, provider)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    today = datetime.now(timezone.utc).date()
    end = end_date or today
    start = start_date or (end - timedelta(days=365))
    if start > end:
        raise HTTPException(status_code=422, detail="start_date must be on or before end_date.")
    if end > today:
        raise HTTPException(status_code=422, detail="end_date cannot be in the future.")
    if (end - start).days > 3650:
        raise HTTPException(status_code=422, detail="A single request is limited to 10 years.")

    key = cache_key(market, clean_symbol, clean_provider, start, end, interval)
    cache: CacheStore = request.app.state.cache
    cached = await cache.get(key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return HistoryResponse.model_validate(cached)

    try:
        candles = await run_in_threadpool(
            fetch_history,
            market,
            clean_symbol,
            clean_provider,
            start,
            end,
            interval,
        )
    except OpenBBUnavailable as exc:
        logger.exception("OpenBB dependency is unavailable")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Historical provider request failed")
        raise HTTPException(status_code=502, detail=f"Historical provider request failed ({type(exc).__name__}: {str(exc)[:160]}).") from exc

    if not candles:
        raise HTTPException(status_code=404, detail="No historical candles were returned.")
    result = HistoryResponse(
        market=market,
        symbol=clean_symbol,
        provider=clean_provider,
        data_as_of=datetime.fromisoformat(candles[-1]["candle_time"]),
        candles=[Candle.model_validate(candle) for candle in candles],
    )
    await cache.set(key, result.model_dump(mode="json"), CACHE_TTL_SECONDS)
    response.headers["X-Cache"] = "MISS"
    return result


@app.get("/api/v1/providers")
async def providers() -> dict[str, dict[str, list[str]]]:
    """List supported router/provider combinations; this does not test entitlements."""
    return {
        market: {"historical": sorted(provider_names)}
        for market, provider_names in SUPPORTED_PROVIDERS.items()
    }