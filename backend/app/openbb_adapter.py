"""Thin, normalized adapter around OpenBB's historical-price routers."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from math import isfinite
import json
import logging
import re
from typing import Any, Literal
from urllib.parse import quote, urlencode
from urllib.request import Request as UrlRequest, urlopen

import pandas as pd

Market = Literal["equity", "index", "crypto", "currency"]
Interval = Literal["1d", "1wk", "1mo"]

ROUTERS: dict[str, tuple[str, str]] = {
    "equity": ("equity", "price"),
    "index": ("index", "price"),
    "crypto": ("crypto", "price"),
    "currency": ("currency", "price"),
}

SUPPORTED_PROVIDERS: dict[str, set[str]] = {
    "equity": {"alpha_vantage", "cboe", "fmp", "intrinio", "tiingo", "tmx", "tradier", "yfinance"},
    "index": {"cboe", "fmp", "intrinio", "yfinance"},
    "crypto": {"fmp", "tiingo", "yfinance"},
    "currency": {"fmp", "tiingo", "yfinance"},
}

_SYMBOL_RE = re.compile(r"^[A-Za-z0-9^.=:/_-]{1,40}$")


class OpenBBUnavailable(RuntimeError):
    """Raised when OpenBB or the requested provider extension is not installed."""


def validate_symbol(symbol: str) -> str:
    cleaned = symbol.strip()
    if not _SYMBOL_RE.fullmatch(cleaned):
        raise ValueError("Invalid symbol format.")
    return cleaned.upper()


def validate_provider(market: str, provider: str) -> str:
    cleaned = provider.strip().lower()
    if cleaned not in SUPPORTED_PROVIDERS.get(market, set()):
        raise ValueError(f"Provider '{provider}' is not supported for market '{market}'.")
    return cleaned


def _column_key(value: Any) -> str:
    if isinstance(value, tuple):
        value = "_".join(str(part) for part in value if part not in (None, ""))
    return re.sub(r"[^a-z0-9]+", "_", str(value).strip().lower()).strip("_")


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        converted = float(value)
    except (TypeError, ValueError):
        return None
    return converted if isfinite(converted) else None


def _as_utc_iso(value: Any) -> str | None:
    if value is None:
        return None
    try:
        timestamp = pd.Timestamp(value)
    except (TypeError, ValueError, OverflowError):
        return None
    if pd.isna(timestamp):
        return None
    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize(timezone.utc)
    else:
        timestamp = timestamp.tz_convert(timezone.utc)
    return timestamp.isoformat()


def normalize_history_frame(frame: Any, provider: str) -> list[dict[str, Any]]:
    """Convert OpenBB's tabular result to the site's stable candle contract."""
    if frame is None:
        return []
    if not isinstance(frame, pd.DataFrame):
        frame = pd.DataFrame(frame)
    if frame.empty:
        return []

    frame = frame.copy()
    frame.columns = [_column_key(column) for column in frame.columns]
    date_columns = {"date", "datetime", "time", "timestamp"}
    if not date_columns.intersection(frame.columns):
        frame = frame.reset_index()
        frame.columns = [_column_key(column) for column in frame.columns]

    aliases = {
        "candle_time": ("date", "datetime", "time", "timestamp", "index"),
        "open": ("open", "px_open"),
        "high": ("high", "px_high"),
        "low": ("low", "px_low"),
        "close": ("close", "px_last", "last"),
        "adjusted_close": ("adjusted_close", "adj_close", "adjclose", "adjustedclose"),
        "volume": ("volume", "px_volume"),
    }
    records: list[dict[str, Any]] = []
    for row in frame.to_dict(orient="records"):
        values = {_column_key(key): value for key, value in row.items()}

        def first(key: str) -> Any:
            return next((values[name] for name in aliases[key] if name in values), None)

        candle_time = _as_utc_iso(first("candle_time"))
        open_price, high, low, close = (_as_float(first(name)) for name in ("open", "high", "low", "close"))
        if candle_time is None or None in (open_price, high, low, close) or close <= 0:
            continue
        adjusted_close = _as_float(first("adjusted_close"))
        if adjusted_close is not None and adjusted_close <= 0:
            adjusted_close = None
        records.append(
            {
                "candle_time": candle_time,
                "open": open_price,
                "high": high,
                "low": low,
                "close": close,
                "adjusted_close": adjusted_close,
                "volume": _as_float(first("volume")),
                "provider": provider,
                # Historical pulls are not advertised as a real-time feed.
                "is_delayed": True,
            }
        )
    records.sort(key=lambda item: item["candle_time"])
    return records


def _to_frame(result: Any) -> pd.DataFrame:
    if callable(getattr(result, "to_df", None)):
        frame = result.to_df()
        if isinstance(frame, pd.DataFrame):
            return frame
    rows = getattr(result, "results", None)
    if rows is not None:
        serialized = [
            item.model_dump(mode="python") if callable(getattr(item, "model_dump", None)) else item
            for item in rows
        ]
        return pd.DataFrame(serialized)
    raise TypeError("OpenBB returned an unsupported historical-data response.")


def _fetch_yahoo_chart(
    symbol: str,
    start_date: date,
    end_date: date,
    interval: Interval,
) -> list[dict[str, Any]]:
    """Fetch normalized daily history from Yahoo's public chart endpoint as a fallback."""
    start_epoch = int(datetime.combine(start_date, time.min, tzinfo=timezone.utc).timestamp())
    # Yahoo treats period2 as exclusive; include the requested final calendar day.
    end_epoch = int(datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc).timestamp())
    query = urlencode({
        "period1": start_epoch,
        "period2": end_epoch,
        "interval": interval,
        "events": "div,splits",
        "includeAdjustedClose": "true",
    })
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol, safe='.^=.-')}?{query}"
    request = UrlRequest(url, headers={"User-Agent": "Mozilla/5.0 (compatible; EquityInsight/1.0)", "Accept": "application/json"})
    with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    chart = payload.get("chart", {})
    result = (chart.get("result") or [None])[0]
    if not result:
        raise RuntimeError("Yahoo Finance did not return historical candles.")
    timestamps = result.get("timestamp") or []
    indicators = result.get("indicators") or {}
    quote_rows = indicators.get("quote") or [{}]
    quote_data = quote_rows[0] or {}
    adjusted_rows = indicators.get("adjclose") or [{}]
    adjusted_data = adjusted_rows[0].get("adjclose") or []
    length = len(timestamps)

    def column(name: str) -> list[Any]:
        values = quote_data.get(name) or []
        return values if len(values) == length else [None] * length

    opens, highs, lows = (column(name) for name in ("open", "high", "low"))
    closes, volumes = column("close"), column("volume")
    if len(adjusted_data) != length:
        adjusted_data = [None] * length

    candles: list[dict[str, Any]] = []
    for stamp, open_price, high, low, close, volume, adjusted in zip(
        timestamps, opens, highs, lows, closes, volumes, adjusted_data
    ):
        open_value, high_value, low_value, close_value = (
            _as_float(value) for value in (open_price, high, low, close)
        )
        if None in (open_value, high_value, low_value, close_value) or close_value <= 0:
            continue
        candles.append({
            "candle_time": datetime.fromtimestamp(int(stamp), timezone.utc).isoformat(),
            "open": open_value,
            "high": high_value,
            "low": low_value,
            "close": close_value,
            "adjusted_close": _as_float(adjusted),
            "volume": _as_float(volume),
            "provider": "yfinance",
            "is_delayed": True,
        })
    return candles


def fetch_history(
    market: Market,
    symbol: str,
    provider: str,
    start_date: date,
    end_date: date,
    interval: Interval,
) -> list[dict[str, Any]]:
    """Perform the provider request synchronously; callers should use a worker thread."""
    provider = validate_provider(market, provider)
    symbol = validate_symbol(symbol)
    try:
        from openbb import obb
    except ImportError as exc:
        if provider == "yfinance":
            return _fetch_yahoo_chart(symbol, start_date, end_date, interval)
        raise OpenBBUnavailable("Install the OpenBB package and the selected provider extension.") from exc

    try:
        router_name, endpoint_name = ROUTERS[market]
        router = getattr(getattr(obb, router_name), endpoint_name)
        request = getattr(router, "historical")
        result = request(
            symbol=symbol,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            interval=interval,
            provider=provider,
        )
        candles = normalize_history_frame(_to_frame(result), provider)
        if candles:
            return candles
        if provider != "yfinance":
            return candles
    except Exception as exc:
        if provider != "yfinance":
            raise
        logging.getLogger("equityinsight.market").warning(
            "OpenBB %s history failed; trying Yahoo chart fallback (%s)", market, type(exc).__name__
        )

    # Some serverless environments cannot use the provider extension's transport;
    # this keeps free Yahoo history available without exposing a credential.
    return _fetch_yahoo_chart(symbol, start_date, end_date, interval)