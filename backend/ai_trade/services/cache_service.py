"""
In-memory cache with TTL.

Redis migration path
--------------------
1. pip install redis
2. Replace _CacheService with:
       import redis, json
       _client = redis.Redis(host=REDIS_URL, decode_responses=True)

3. Swap get/set:
       def get(key):  raw = _client.get(key); return json.loads(raw) if raw else None
       def set(key, data, ttl):  _client.setex(key, ttl, json.dumps(data))
       def delete(key):  _client.delete(key)

The rest of the codebase (controller, services) stays unchanged
because they only call cache.get / cache.set / cache.delete / cache.make_key.
"""

import time
from typing import Any, Optional


class _CacheService:
    def __init__(self) -> None:
        self._store: dict = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.time() - entry["ts"] >= entry["ttl"]:
            del self._store[key]
            return None
        return entry["data"]

    def set(self, key: str, data: Any, ttl: int) -> None:
        self._store[key] = {"data": data, "ts": time.time(), "ttl": ttl}

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def make_key(self, *parts: str) -> str:
        """Build a namespaced cache key from parts."""
        return ":".join(parts)


# Singleton — import this everywhere
cache = _CacheService()
