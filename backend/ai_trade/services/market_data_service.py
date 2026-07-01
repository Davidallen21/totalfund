"""
Fetches raw market data from Binance.

Responsibilities
----------------
- OHLCV klines
- Current ticker price
- No trading logic here — only data retrieval.
"""

import time
import requests
from typing import List, Optional

from ai_trade.types.ai_trade_types import OHLCVCandle
from ai_trade.config.ai_trade_config import TIMEFRAME_MAP, BINANCE_API_BASE

_BINANCE_BASE = BINANCE_API_BASE  # data-api.binance.vision/api/v3

_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}


def _get(url: str, params: dict = None, retries: int = 2) -> Optional[dict | list]:
    """HTTP GET with retry + 429 back-off — mirrors bot.py _request_with_retry."""
    last_err = None
    for attempt in range(retries + 1):
        try:
            res = requests.get(url, params=params, headers=_HEADERS, timeout=12)
            if res.status_code == 429:
                time.sleep(1.5 * (attempt + 1))
                continue
            res.raise_for_status()
            return res.json()
        except Exception as e:
            last_err = e
            time.sleep(0.8 * (attempt + 1))
    raise last_err or RuntimeError(f"Request failed: {url}")


def fetch_klines(symbol: str, timeframe: str, limit: int = 200) -> List[OHLCVCandle]:
    """
    Fetch OHLCV candlestick data from Binance.

    Parameters
    ----------
    symbol    : base ticker, e.g. "BTC" (USDT pair added automatically)
    timeframe : frontend label, e.g. "15m" or "4H"
    limit     : number of candles to fetch
    """
    interval = TIMEFRAME_MAP.get(timeframe, "15m")
    pair     = symbol.upper() + "USDT"
    raw      = _get(f"{_BINANCE_BASE}/klines", {"symbol": pair, "interval": interval, "limit": limit})
    if not raw:
        return []
    return [
        OHLCVCandle(
            timestamp=int(k[0]),
            open=float(k[1]),
            high=float(k[2]),
            low=float(k[3]),
            close=float(k[4]),
            volume=float(k[5]),
        )
        for k in raw
    ]


def fetch_current_price(symbol: str) -> Optional[float]:
    """Fetch latest price from Binance ticker/price endpoint."""
    try:
        data = _get(f"{_BINANCE_BASE}/ticker/price", {"symbol": symbol.upper() + "USDT"})
        if data and "price" in data:
            return float(data["price"])
    except Exception:
        pass
    return None
