"""
Technical indicator calculations.

Responsibilities
----------------
- EMA (fast / slow)
- RSI
- MACD (line, signal, histogram)
- ATR
- Bollinger Bands
- Volume SMA

No trading decisions here — pure math on price/volume data.
All parameters come from ai_trade_config, never hardcoded locally.
"""

from typing import List
from ai_trade.types.ai_trade_types import OHLCVCandle, Indicators
from ai_trade.config.ai_trade_config import (
    EMA_FAST, EMA_SLOW,
    RSI_PERIOD, RSI_OVERBOUGHT, RSI_OVERSOLD,
    MACD_FAST, MACD_SLOW, MACD_SIGNAL,
    ATR_PERIOD,
    BB_PERIOD, BB_STD,
    VOLUME_SMA_PERIOD,
)


# ── Primitives ────────────────────────────────────────────────────────────────

def _ema(values: List[float], period: int) -> List[float]:
    k      = 2.0 / (period + 1)
    result = [values[0]]
    for v in values[1:]:
        result.append(v * k + result[-1] * (1 - k))
    return result


def _sma(values: List[float], period: int) -> float:
    window = values[-period:] if len(values) >= period else values
    return sum(window) / len(window)


# ── Public calculators ────────────────────────────────────────────────────────

def calc_ema(closes: List[float], period: int) -> List[float]:
    return _ema(closes, period)


def calc_rsi(closes: List[float]) -> float:
    if len(closes) < RSI_PERIOD + 1:
        return 50.0
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    recent = deltas[-RSI_PERIOD:]
    gains  = [max(d, 0) for d in recent]
    losses = [abs(min(d, 0)) for d in recent]
    avg_g  = sum(gains)  / RSI_PERIOD
    avg_l  = sum(losses) / RSI_PERIOD
    if avg_l == 0:
        return 100.0
    return round(100 - (100 / (1 + avg_g / avg_l)), 2)


def calc_macd(closes: List[float]) -> tuple[float, float, float]:
    """Returns (macd_line, signal_line, histogram)."""
    if len(closes) < MACD_SLOW + MACD_SIGNAL:
        return 0.0, 0.0, 0.0
    fast_ema  = _ema(closes, MACD_FAST)
    slow_ema  = _ema(closes, MACD_SLOW)
    macd_line = [f - s for f, s in zip(fast_ema, slow_ema)]
    sig_line  = _ema(macd_line, MACD_SIGNAL)
    macd_val  = macd_line[-1]
    sig_val   = sig_line[-1]
    return round(macd_val, 8), round(sig_val, 8), round(macd_val - sig_val, 8)


def calc_atr(candles: List[OHLCVCandle]) -> float:
    if len(candles) < ATR_PERIOD + 1:
        return 0.0
    trs = []
    for i in range(1, len(candles)):
        h, l, pc = candles[i].high, candles[i].low, candles[i - 1].close
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    return round(sum(trs[-ATR_PERIOD:]) / ATR_PERIOD, 8)


def calc_bollinger_bands(closes: List[float]) -> tuple[float, float, float]:
    """Returns (upper, middle, lower)."""
    if len(closes) < BB_PERIOD:
        mid = closes[-1]
        return mid, mid, mid
    window    = closes[-BB_PERIOD:]
    mid       = sum(window) / BB_PERIOD
    variance  = sum((x - mid) ** 2 for x in window) / BB_PERIOD
    std       = variance ** 0.5
    return round(mid + BB_STD * std, 8), round(mid, 8), round(mid - BB_STD * std, 8)


def calc_volume_sma(candles: List[OHLCVCandle]) -> float:
    vols   = [c.volume for c in candles]
    period = min(VOLUME_SMA_PERIOD, len(vols))
    return round(sum(vols[-period:]) / period, 4)


# ── Aggregate ────────────────────────────────────────────────────────────────

def calculate_all(candles: List[OHLCVCandle]) -> Indicators:
    """Calculate every indicator and return a single Indicators object."""
    closes = [c.close for c in candles]

    ema_f_series  = calc_ema(closes, EMA_FAST)
    ema_s_series  = calc_ema(closes, EMA_SLOW)
    macd, sig, hist = calc_macd(closes)
    bb_u, bb_m, bb_l = calc_bollinger_bands(closes)

    return Indicators(
        ema_fast       = round(ema_f_series[-1], 8),
        ema_slow       = round(ema_s_series[-1], 8),
        rsi            = calc_rsi(closes),
        macd           = macd,
        macd_signal    = sig,
        macd_hist      = hist,
        atr            = calc_atr(candles),
        bb_upper       = bb_u,
        bb_middle      = bb_m,
        bb_lower       = bb_l,
        volume_sma     = calc_volume_sma(candles),
        current_volume = round(candles[-1].volume, 4),
    )
