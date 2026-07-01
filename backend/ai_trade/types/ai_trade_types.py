from pydantic import BaseModel
from typing import List, Dict, Any, Optional


# ── Symbol search ─────────────────────────────────────────────────────────────

class SymbolInfo(BaseModel):
    symbol:    str   # "BTCUSDT"
    baseAsset: str   # "BTC"
    quoteAsset: str  # "USDT"


# ── Request ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    symbol:       str   # e.g. "BTC"
    timeframe:    str   # e.g. "15m", "1H", "4H"
    style:        str   # e.g. "Day Trading", "Swing Trading"
    risk_profile: str   # "Conservative" | "Moderate" | "Aggressive"


# ── Market data ───────────────────────────────────────────────────────────────

class OHLCVCandle(BaseModel):
    timestamp: int
    open:      float
    high:      float
    low:       float
    close:     float
    volume:    float


# ── Indicators ────────────────────────────────────────────────────────────────

class Indicators(BaseModel):
    ema_fast:       float
    ema_slow:       float
    rsi:            float
    macd:           float
    macd_signal:    float
    macd_hist:      float
    atr:            float
    bb_upper:       float
    bb_middle:      float
    bb_lower:       float
    volume_sma:     float
    current_volume: float


# ── Levels ────────────────────────────────────────────────────────────────────

class Levels(BaseModel):
    support:      List[float]
    resistance:   List[float]
    pivot:        float
    supply_zones: List[Dict[str, float]]
    demand_zones: List[Dict[str, float]]


# ── Trade decision ────────────────────────────────────────────────────────────

class TradeDecision(BaseModel):
    signal:           str    # "LONG" | "SHORT"
    confidence:       int    # 0–100
    entry_low:        float
    entry_high:       float
    stop_loss:        float
    tp1:              float
    tp2:              float
    tp3:              float
    risk_reward:      float
    trend:            str    # "Bullish" | "Bearish"
    market_structure: str
    volatility:       str    # "Low" | "Medium" | "High"
    holding_time:     str
    strength:         str    # "Strong Opportunity" | "Moderate Setup" | "Weak Signal"
    reasons:          List[str]
    risk_factors:     List[str]


# ── AI explanation ────────────────────────────────────────────────────────────

class ChecklistItem(BaseModel):
    item:   str
    passed: bool


class Explanation(BaseModel):
    mentor:         str            # main trade rationale (DeepSeek)
    stop_loss_tip:  str            # SL reasoning (DeepSeek)
    market_summary: str            # 1-sentence market condition (DeepSeek)
    execution_plan: str            # how to enter & manage (DeepSeek)
    key_risks:      List[str]      # 3 specific trade risks (DeepSeek)
    checklist:      List[ChecklistItem]


# ── Final response ────────────────────────────────────────────────────────────

class AnalysisResponse(BaseModel):
    symbol:        str
    timeframe:     str
    style:         str
    current_price: float
    indicators:    Indicators
    levels:        Levels
    decision:      TradeDecision
    explanation:   Explanation
    cached:        bool = False
