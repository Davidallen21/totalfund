"""
AI Trade controller.

Responsibilities
----------------
- Receive validated requests from routes.py
- Orchestrate service calls in the correct order
- Handle cache read/write
- Return final response dict

No business logic here — all decisions delegated to services.
"""

from fastapi import HTTPException

from ai_trade.types.ai_trade_types import AnalyzeRequest
from ai_trade.services.cache_service import cache
from ai_trade.services import (
    market_data_service,
    indicator_service,
    level_detection_service,
    trade_decision_service,
    ai_explanation_service,
)
from ai_trade.config.ai_trade_config import CACHE_TTL
from ai_trade.utils.timeframe_helper import get_candle_limit
from ai_trade.services import market_symbol_service


async def analyze(req: AnalyzeRequest) -> dict:
    cache_key = cache.make_key("analysis", req.symbol, req.timeframe, req.style, req.risk_profile)
    cached = cache.get(cache_key)
    if cached:
        return {**cached, "cached": True}

    # 1 — Market data
    limit   = get_candle_limit(req.style)
    candles = market_data_service.fetch_klines(req.symbol, req.timeframe, limit)
    if len(candles) < 30:
        raise HTTPException(
            status_code=502,
            detail=f"Insufficient data for {req.symbol}. Got {len(candles)} candles, need at least 30.",
        )

    price = market_data_service.fetch_current_price(req.symbol)
    if price is None:
        price = candles[-1].close

    # 2 — Indicators
    indicators = indicator_service.calculate_all(candles)

    # 3 — Levels
    levels = level_detection_service.detect_levels(candles, indicators.atr)

    # 4 — Trade decision
    decision = trade_decision_service.decide(
        candles, indicators, levels, req.style, req.risk_profile, price
    )

    # 5 — AI explanation (DeepSeek)
    explanation = ai_explanation_service.generate_explanation(
        decision, indicators, levels,
        symbol=req.symbol, timeframe=req.timeframe,
        style=req.style, risk_profile=req.risk_profile,
        price=price,
    )

    # Return last 100 candles for the chart (enough for display, smaller payload)
    chart_candles = [
        {"open": c.open, "high": c.high, "low": c.low, "close": c.close,
         "vol": c.volume, "timestamp": c.timestamp}
        for c in candles[-100:]
    ]

    result = {
        "symbol":        req.symbol.upper(),
        "timeframe":     req.timeframe,
        "style":         req.style,
        "current_price": price,
        "candles":       chart_candles,
        "indicators":    indicators.model_dump(),
        "levels":        levels.model_dump(),
        "decision":      decision.model_dump(),
        "explanation":   explanation.model_dump(),
        "cached":        False,
    }

    cache.set(cache_key, result, CACHE_TTL["analysis"])
    return result


async def get_symbols() -> dict:
    return {"symbols": market_symbol_service.get_popular(50)}


async def health() -> dict:
    return {"status": "ok", "service": "ai-trade"}
