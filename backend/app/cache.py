"""Redis cache with a short-lived in-process fallback for local development."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)


class CacheStore:
    def __init__(self, redis_url: str, default_ttl: int = 900) -> None:
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self.redis: Any = None
        self.memory: dict[str, tuple[float, str]] = {}
        self.backend = "memory"

    async def connect(self) -> None:
        try:
            from redis.asyncio import Redis

            client = Redis.from_url(self.redis_url, decode_responses=True, socket_connect_timeout=2)
            await client.ping()
            self.redis = client
            self.backend = "redis"
        except Exception as exc:  # Redis is optional for local development.
            logger.warning("Redis unavailable; using process-local cache: %s", exc)
            self.redis = None
            self.backend = "memory"

    async def close(self) -> None:
        if self.redis is not None:
            await self.redis.aclose()

    async def get(self, key: str) -> Any | None:
        if self.redis is not None:
            try:
                raw = await self.redis.get(key)
                return json.loads(raw) if raw else None
            except Exception as exc:
                logger.warning("Redis read failed; using process-local cache: %s", exc)
                self.backend = "memory"
                self.redis = None
        cached = self.memory.get(key)
        if not cached:
            return None
        expires_at, raw = cached
        if expires_at <= time.monotonic():
            self.memory.pop(key, None)
            return None
        return json.loads(raw)

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        raw = json.dumps(value, separators=(",", ":"), allow_nan=False)
        expiry = ttl or self.default_ttl
        if self.redis is not None:
            try:
                await self.redis.set(key, raw, ex=expiry)
                return
            except Exception as exc:
                logger.warning("Redis write failed; using process-local cache: %s", exc)
                self.backend = "memory"
                self.redis = None
        now = time.monotonic()
        self.memory = {name: item for name, item in self.memory.items() if item[0] > now}
        self.memory[key] = (now + expiry, raw)