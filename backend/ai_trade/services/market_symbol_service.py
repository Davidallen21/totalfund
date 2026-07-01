"""
Market Symbol Service

Responsibilities
----------------
- Fetch Binance Exchange Info at startup (via data-api.binance.vision)
- Filter valid USDT spot symbols (status=TRADING, isSpotTradingAllowed=True)
- Store filtered list in thread-safe in-memory cache
- Provide ranked search: exact > starts-with > contains
- Auto-refresh cache every SYMBOL_CACHE_REFRESH_INTERVAL seconds via daemon thread

Redis migration path
---------------------
Replace _SymbolStore with a Redis client:
    import redis, json
    client = redis.Redis(...)
    def get_all():  raw = client.get("ai_trade:symbols"); return json.loads(raw) if raw else []
    def set(syms):  client.set("ai_trade:symbols", json.dumps([s.dict() for s in syms]))

The rest of the module (search, get_popular, refresh, start_background_refresh) stays unchanged.
"""

import time
import threading
import logging
import requests
from typing import List, Optional

from ai_trade.types.ai_trade_types import SymbolInfo
from ai_trade.config.ai_trade_config import (
    BINANCE_EXCHANGE_INFO_URL,
    SYMBOL_FILTER_QUOTE,
    SYMBOL_FILTER_STATUS,
    SYMBOL_FILTER_SPOT_ALLOWED,
    SYMBOL_CACHE_REFRESH_INTERVAL,
    SYMBOL_SEARCH_LIMIT,
    POPULAR_BASE_ASSETS,
)

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}


# ── Thread-safe in-memory symbol store ───────────────────────────────────────

class _SymbolStore:
    """Holds the filtered symbol list. Swap internals for Redis with no API change."""

    def __init__(self) -> None:
        self._symbols: List[SymbolInfo] = []
        self._last_refresh: float = 0.0
        self._lock = threading.RLock()

    def set(self, symbols: List[SymbolInfo]) -> None:
        with self._lock:
            self._symbols = symbols
            self._last_refresh = time.time()

    def get_all(self) -> List[SymbolInfo]:
        with self._lock:
            return list(self._symbols)

    def is_empty(self) -> bool:
        with self._lock:
            return len(self._symbols) == 0

    def age_seconds(self) -> float:
        with self._lock:
            return time.time() - self._last_refresh if self._last_refresh else float("inf")

    def total(self) -> int:
        with self._lock:
            return len(self._symbols)


_store = _SymbolStore()


# ── Fetch + filter ────────────────────────────────────────────────────────────

def _fetch_and_filter() -> List[SymbolInfo]:
    """Pull exchange info from Binance Futures and return valid perpetual symbols."""
    try:
        res = requests.get(BINANCE_EXCHANGE_INFO_URL, headers=_HEADERS, timeout=15)
        res.raise_for_status()
        data = res.json()
    except Exception as exc:
        raise RuntimeError(f"Binance exchange info fetch failed: {exc}") from exc

    result: List[SymbolInfo] = []
    for s in data.get("symbols", []):
        if (
            s.get("status")                == SYMBOL_FILTER_STATUS
            and s.get("quoteAsset")        == SYMBOL_FILTER_QUOTE
            and s.get("isSpotTradingAllowed") == SYMBOL_FILTER_SPOT_ALLOWED
        ):
            result.append(SymbolInfo(
                symbol    = s["symbol"],
                baseAsset = s["baseAsset"],
                quoteAsset= s["quoteAsset"],
            ))
    return result


# ── Public API ────────────────────────────────────────────────────────────────

def refresh() -> int:
    """Fetch fresh data from Binance, update the store. Returns symbol count."""
    symbols = _fetch_and_filter()
    _store.set(symbols)
    logger.info("market_symbol_service: loaded %d symbols", len(symbols))
    return len(symbols)


def ensure_loaded() -> None:
    """Guarantee the store has data. Called once at server startup."""
    if _store.is_empty():
        try:
            refresh()
        except Exception as exc:
            logger.error("market_symbol_service: initial load failed: %s", exc)


def search(query: str, limit: int = SYMBOL_SEARCH_LIMIT) -> List[SymbolInfo]:
    """
    Search symbols by base asset name (case-insensitive, partial match).

    Ranking: exact match → starts-with → contains.
    Empty query returns the popular coins list instead.
    """
    q = query.strip().upper()
    if not q:
        return get_popular(limit)

    all_symbols = _store.get_all()
    exact:    List[SymbolInfo] = []
    starts:   List[SymbolInfo] = []
    contains: List[SymbolInfo] = []

    for sym in all_symbols:
        base = sym.baseAsset.upper()
        if base == q:
            exact.append(sym)
        elif base.startswith(q):
            starts.append(sym)
        elif q in base:
            contains.append(sym)

    return (exact + starts + contains)[:limit]


def get_popular(limit: int = SYMBOL_SEARCH_LIMIT) -> List[SymbolInfo]:
    """Return popular symbols ordered by POPULAR_BASE_ASSETS, then any remaining."""
    all_symbols  = {s.baseAsset: s for s in _store.get_all()}
    ordered: List[SymbolInfo] = []

    for base in POPULAR_BASE_ASSETS:
        if base in all_symbols:
            ordered.append(all_symbols[base])

    # Fill remaining slots with other symbols not already in the list
    popular_set = set(POPULAR_BASE_ASSETS)
    for sym in _store.get_all():
        if sym.baseAsset not in popular_set:
            ordered.append(sym)
        if len(ordered) >= limit:
            break

    return ordered[:limit]


def get_cache_status() -> dict:
    return {
        "total":       _store.total(),
        "age_seconds": round(_store.age_seconds(), 1),
        "refresh_interval_hours": SYMBOL_CACHE_REFRESH_INTERVAL // 3600,
    }


# ── Background refresh daemon ─────────────────────────────────────────────────

def _refresh_loop() -> None:
    while True:
        time.sleep(SYMBOL_CACHE_REFRESH_INTERVAL)
        try:
            count = refresh()
            logger.info("market_symbol_service: auto-refreshed %d symbols", count)
        except Exception as exc:
            logger.warning("market_symbol_service: auto-refresh failed (stale cache kept): %s", exc)


def start_background_refresh() -> None:
    """Start the auto-refresh daemon. Call once at server startup."""
    t = threading.Thread(target=_refresh_loop, daemon=True, name="symbol-refresh")
    t.start()
    logger.info("market_symbol_service: background refresh started (interval=%dh)",
                SYMBOL_CACHE_REFRESH_INTERVAL // 3600)
