"""
Risk / reward math helpers.

Pure functions — no external dependencies.
"""

from ai_trade.config.ai_trade_config import MIN_RISK_REWARD


def calc_risk_reward(entry: float, stop_loss: float, target: float) -> float:
    """R:R = |target - entry| / |entry - stop_loss|."""
    risk   = abs(entry - stop_loss)
    reward = abs(target - entry)
    if risk == 0:
        return 0.0
    return round(reward / risk, 2)


def is_rr_acceptable(entry: float, stop_loss: float, target: float) -> bool:
    return calc_risk_reward(entry, stop_loss, target) >= MIN_RISK_REWARD


def calc_position_size(capital: float, risk_pct: float, entry: float, stop_loss: float) -> float:
    """
    How many units to buy given a capital, risk %, entry, and stop loss.
    risk_pct is expressed as a percentage (e.g. 1.0 = 1%).
    """
    risk_amount  = capital * (risk_pct / 100)
    risk_per_unit = abs(entry - stop_loss)
    if risk_per_unit == 0:
        return 0.0
    return round(risk_amount / risk_per_unit, 6)
