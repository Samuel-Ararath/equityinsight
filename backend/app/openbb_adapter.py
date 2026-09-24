"""Thin, normalized adapter around OpenBB's historical-price routers."""

from __future__ import annotations

from datetime import date, datetime, timezone
from math import isfinite
import re
from typing import Any, Literal

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
        raise OpenBBUnavailable("Install the OpenBB package and the selected provider extension.") from exc

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
    return normalize_history_frame(_to_frame(result), provider)