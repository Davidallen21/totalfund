"""
Price level detection.

Responsibilities
----------------
- Support levels   (pivot lows, clustered)
- Resistance levels (pivot highs, clustered)
- Classic pivot point (PP = (H+L+C) / 3 of previous candle)
- Supply zones     (bearish impulse candles)
- Demand zones     (bullish impulse candles)

No AI, no trading decisions — purely structural market geometry.
"""

from typing import List, Dict, Tuple
from ai_trade.types.ai_trade_types import OHLCVCandle, Levels


_PIVOT_LOOKBACK   = 5      # candles each side for pivot detection
_CLUSTER_TOLERANCE = 0.003  # 0.3% — levels within this range are merged
_ZONE_ATR_MULT    = 0.5    # supply/demand zone width = ATR × this


# ── Pivot detection ───────────────────────────────────────────────────────────

def _pivot_highs(candles: List[OHLCVCandle], lookback: int = _PIVOT_LOOKBACK) -> List[float]:
    highs = []
    for i in range(lookback, len(candles) - lookback):
        if all(candles[i].high >= candles[j].high
               for j in range(i - lookback, i + lookback + 1) if j != i):
            highs.append(candles[i].high)
    return highs


def _pivot_lows(candles: List[OHLCVCandle], lookback: int = _PIVOT_LOOKBACK) -> List[float]:
    lows = []
    for i in range(lookback, len(candles) - lookback):
        if all(candles[i].low <= candles[j].low
               for j in range(i - lookback, i + lookback + 1) if j != i):
            lows.append(candles[i].low)
    return lows


# ── Level clustering ──────────────────────────────────────────────────────────

def _cluster(levels: List[float], tolerance: float = _CLUSTER_TOLERANCE) -> List[float]:
    """Merge nearby levels into single representative price."""
    if not levels:
        return []
    sorted_lvls = sorted(levels)
    clusters: List[List[float]] = [[sorted_lvls[0]]]
    for lvl in sorted_lvls[1:]:
        ref = clusters[-1][-1]
        if abs(lvl - ref) / ref < tolerance:
            clusters[-1].append(lvl)
        else:
            clusters.append([lvl])
    return [round(sum(c) / len(c), 8) for c in clusters]


# ── Supply / Demand zones ─────────────────────────────────────────────────────

def _supply_demand_zones(
    candles: List[OHLCVCandle], atr: float
) -> Tuple[List[Dict[str, float]], List[Dict[str, float]]]:
    zone_w = atr * _ZONE_ATR_MULT
    supply: List[Dict[str, float]] = []
    demand: List[Dict[str, float]] = []

    for c in candles[1:]:
        body = abs(c.close - c.open)
        if body < atr * 0.3:
            continue
        if c.close < c.open:  # bearish impulse → supply
            supply.append({"top": round(c.open, 8), "bottom": round(c.open - zone_w, 8)})
        else:                  # bullish impulse → demand
            demand.append({"top": round(c.close + zone_w, 8), "bottom": round(c.close, 8)})

    return supply[-5:], demand[-5:]


# ── Pivot point ───────────────────────────────────────────────────────────────

def _pivot_point(candles: List[OHLCVCandle]) -> float:
    prev = candles[-2]
    return round((prev.high + prev.low + prev.close) / 3, 8)


# ── Public API ────────────────────────────────────────────────────────────────

def detect_levels(candles: List[OHLCVCandle], atr: float) -> Levels:
    resistance   = _cluster(_pivot_highs(candles))[-5:]   # 5 nearest above
    support      = _cluster(_pivot_lows(candles))[:5]     # 5 nearest below
    supply, demand = _supply_demand_zones(candles, atr)

    return Levels(
        support      = support,
        resistance   = resistance,
        pivot        = _pivot_point(candles),
        supply_zones = supply,
        demand_zones = demand,
    )
