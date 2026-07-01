"""
Helpers for trading style ↔ timeframe mapping.
"""

from ai_trade.config.ai_trade_config import STYLE_CONFIG, TIMEFRAME_MAP


def get_binance_interval(timeframe: str) -> str:
    return TIMEFRAME_MAP.get(timeframe, "15m")


def get_candle_limit(style: str) -> int:
    return STYLE_CONFIG.get(style, {}).get("candle_limit", 200)


def get_default_timeframe(style: str) -> str:
    return STYLE_CONFIG.get(style, {}).get("default_tf", "15m")


def get_valid_timeframes(style: str) -> list[str]:
    return STYLE_CONFIG.get(style, {}).get("timeframes", ["15m"])


def get_holding_time(style: str) -> str:
    return STYLE_CONFIG.get(style, {}).get("holding_time", "2–8 Hours")
