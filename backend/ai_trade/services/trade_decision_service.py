"""
Trade decision engine — the brain of AI Trade.

Responsibilities
----------------
- Read indicator & level results
- Produce: LONG/SHORT signal, entry zone, SL, TP1/2/3, R:R, confidence, reasons

No AI calls here. No data fetching. Pure decision logic.
All numeric constants come from ai_trade_config.
"""

from typing import List, Tuple
from ai_trade.types.ai_trade_types import OHLCVCandle, Indicators, Levels, TradeDecision
from ai_trade.config.ai_trade_config import (
    RSI_OVERBOUGHT, RSI_OVERSOLD, MIN_CONFIDENCE,
    SL_ATR_MULT, TP1_ATR_MULT, TP2_ATR_MULT, TP3_ATR_MULT,
)
from ai_trade.utils.risk_calculator import calc_risk_reward
from ai_trade.utils.timeframe_helper import get_holding_time


# ── Scoring sub-components ────────────────────────────────────────────────────

def _score_trend(indicators: Indicators) -> Tuple[int, str, List[str]]:
    """Trend alignment: max 40 pts."""
    score   = 0
    reasons = []

    is_bull = indicators.ema_fast > indicators.ema_slow
    if is_bull:
        score += 20
        reasons.append("EMA 20 above EMA 50")
    else:
        reasons.append("EMA 20 below EMA 50")

    if indicators.macd_hist > 0:
        score += 10
        reasons.append("MACD bullish crossover")
    else:
        reasons.append("MACD bearish crossover")

    if RSI_OVERSOLD <= indicators.rsi <= 65:
        score += 10
        reasons.append("RSI in healthy zone")
    elif indicators.rsi < RSI_OVERSOLD:
        score += 5
        reasons.append("RSI oversold — potential reversal")
    else:
        reasons.append("RSI overbought — caution")

    return score, "Bullish" if is_bull else "Bearish", reasons


def _score_volume(indicators: Indicators) -> Tuple[int, str]:
    """Volume confirmation: max 15 pts."""
    ratio = indicators.current_volume / indicators.volume_sma if indicators.volume_sma > 0 else 1
    if ratio >= 1.3:
        return 15, "Volume increasing"
    if ratio >= 0.8:
        return 10, "Volume neutral"
    return 5, "Volume declining — weak signal"


def _score_structure(candles: List[OHLCVCandle]) -> Tuple[int, str]:
    """Market structure: max 15 pts."""
    recent = candles[-20:]
    highs  = [c.high for c in recent]
    lows   = [c.low  for c in recent]

    hh = highs[-1] > max(highs[:-1])
    hl = lows[-1]  > min(lows[:-1])
    if hh and hl:
        return 15, "Higher Highs & Lows"

    ll = lows[-1]  < min(lows[:-1])
    lh = highs[-1] < max(highs[:-1])
    if ll and lh:
        return 5, "Lower Highs & Lows"

    return 10, "Ranging Market"


def _volatility_label(indicators: Indicators, price: float) -> str:
    atr_pct = (indicators.atr / price) * 100 if price > 0 else 0
    if atr_pct < 0.5:
        return "Low"
    if atr_pct < 1.5:
        return "Medium"
    return "High"


def _build_risk_factors(indicators: Indicators, levels: Levels) -> List[str]:
    risks = []
    if indicators.rsi > RSI_OVERBOUGHT:
        risks.append("RSI overbought — reversal risk")
    if indicators.rsi < RSI_OVERSOLD:
        risks.append("RSI oversold — short squeeze risk")
    if indicators.atr / indicators.ema_slow * 100 > 1.5:
        risks.append("High volatility — wider swings expected")
    if indicators.macd_hist < 0 and indicators.ema_fast > indicators.ema_slow:
        risks.append("MACD diverging — momentum weakening")
    if levels.resistance:
        risks.append("Resistance zone near TP range")
    risks.append("Possible macro / news impact")
    return risks[:5]


# ── Public API ────────────────────────────────────────────────────────────────

def decide(
    candles:      List[OHLCVCandle],
    indicators:   Indicators,
    levels:       Levels,
    style:        str,
    risk_profile: str,
    price:        float,
) -> TradeDecision:

    trend_score, trend, reasons = _score_trend(indicators)
    vol_score,   vol_reason     = _score_volume(indicators)
    struct_score, structure     = _score_structure(candles)

    # Base confidence (max ~70) + fixed 30 floor = range 30–100
    rp_mod = {"Conservative": -5, "Moderate": 0, "Aggressive": 5}.get(risk_profile, 0)
    confidence = min(max(trend_score + vol_score + struct_score + 30 + rp_mod, 0), 99)

    is_long = trend == "Bullish"
    signal  = "LONG" if is_long else "SHORT"
    atr     = indicators.atr

    entry_low  = round(price * 0.998, 8)
    entry_high = round(price * 1.002, 8)

    if is_long:
        sl  = round(price - atr * SL_ATR_MULT,  8)
        tp1 = round(price + atr * TP1_ATR_MULT, 8)
        tp2 = round(price + atr * TP2_ATR_MULT, 8)
        tp3 = round(price + atr * TP3_ATR_MULT, 8)
    else:
        sl  = round(price + atr * SL_ATR_MULT,  8)
        tp1 = round(price - atr * TP1_ATR_MULT, 8)
        tp2 = round(price - atr * TP2_ATR_MULT, 8)
        tp3 = round(price - atr * TP3_ATR_MULT, 8)

    rr = calc_risk_reward(price, sl, tp2)

    strength = (
        "Strong Opportunity" if confidence > 80
        else "Moderate Setup" if confidence > MIN_CONFIDENCE
        else "Weak Signal"
    )

    return TradeDecision(
        signal           = signal,
        confidence       = confidence,
        entry_low        = entry_low,
        entry_high       = entry_high,
        stop_loss        = sl,
        tp1              = tp1,
        tp2              = tp2,
        tp3              = tp3,
        risk_reward      = rr,
        trend            = trend,
        market_structure = structure,
        volatility       = _volatility_label(indicators, price),
        holding_time     = get_holding_time(style),
        strength         = strength,
        reasons          = reasons + [vol_reason],
        risk_factors     = _build_risk_factors(indicators, levels),
    )
