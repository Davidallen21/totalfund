"""
AI Explanation Service — DeepSeek integration.

Responsibilities
----------------
- Build a structured prompt from all analysis results (indicators, levels, decision)
- Call DeepSeek chat API and parse JSON response
- Fall back to static text if API fails or key is missing
- Return Explanation object (unchanged interface for controller)

Environment variable required
------------------------------
DEEPSEEK_API_KEY=sk-...
"""

import os
import json
import logging
import requests

from ai_trade.types.ai_trade_types import (
    Indicators, Levels, TradeDecision, Explanation, ChecklistItem,
)
from ai_trade.utils.formatter import fmt_price, fmt_rr
from ai_trade.config.ai_trade_config import (
    GROQ_API_URL, GROQ_MODEL, GROQ_MAX_TOKENS, GROQ_TEMPERATURE,
    RSI_OVERBOUGHT, RSI_OVERSOLD, MIN_RISK_REWARD, MIN_CONFIDENCE,
)

logger = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are a professional cryptocurrency trading analyst with deep expertise in "
    "technical analysis. Analyze the provided trade setup data and return a JSON "
    "insight object.\n\n"
    "Rules:\n"
    "- Respond ONLY with valid JSON, no markdown fences, no text outside JSON.\n"
    "- Be specific to the numbers provided — do NOT give generic advice.\n"
    "- Use precise price levels from the data.\n"
    "- Keep each field concise.\n\n"
    "Required JSON format:\n"
    "{\n"
    '  "mentor": "2-3 sentences: WHY this setup is valid, what confirms it, how strong it is",\n'
    '  "stop_loss_tip": "1-2 sentences: WHY stop loss at that level, what it protects against",\n'
    '  "market_summary": "1 sentence: current market condition and momentum",\n'
    '  "execution_plan": "2-3 sentences: WHEN to enter, what trigger to wait for, how to manage",\n'
    '  "key_risks": ["risk specific to this exact setup", "second risk", "third risk"]\n'
    "}"
)


# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(
    symbol: str, timeframe: str, style: str, risk_profile: str, price: float,
    decision: TradeDecision, indicators: Indicators, levels: Levels,
) -> str:
    vol_ratio = (
        indicators.current_volume / indicators.volume_sma
        if indicators.volume_sma > 0 else 1.0
    )
    ema_bias = "Bullish" if indicators.ema_fast > indicators.ema_slow else "Bearish"
    rsi_label = (
        "overbought" if indicators.rsi > RSI_OVERBOUGHT
        else "oversold" if indicators.rsi < RSI_OVERSOLD
        else "neutral zone"
    )
    macd_label = "bullish momentum" if indicators.macd_hist > 0 else "bearish momentum"

    sup_str = ", ".join(fmt_price(s) for s in levels.support[-3:]) or "none detected"
    res_str = ", ".join(fmt_price(r) for r in levels.resistance[:3]) or "none detected"

    return f"""=== TRADE SETUP ===
Pair: {symbol}USDT  |  Timeframe: {timeframe}  |  Style: {style}  |  Risk Profile: {risk_profile}

Signal: {decision.signal} — {decision.strength}
Confidence: {decision.confidence}%
Trend: {decision.trend}  |  Structure: {decision.market_structure}
Volatility: {decision.volatility}  |  Holding Period: {decision.holding_time}

=== PRICE LEVELS ===
Current Price : {fmt_price(price)}
Entry Zone    : {fmt_price(decision.entry_low)} – {fmt_price(decision.entry_high)}
Stop Loss     : {fmt_price(decision.stop_loss)}
TP1 / TP2 / TP3 : {fmt_price(decision.tp1)} / {fmt_price(decision.tp2)} / {fmt_price(decision.tp3)}
Risk : Reward : {fmt_rr(decision.risk_reward)}

=== INDICATORS ===
EMA 20 = {fmt_price(indicators.ema_fast)}  |  EMA 50 = {fmt_price(indicators.ema_slow)}  →  {ema_bias}
RSI    = {indicators.rsi:.1f}  ({rsi_label})
MACD hist = {indicators.macd_hist:+.6f}  ({macd_label})
ATR    = {fmt_price(indicators.atr)}
Volume = {vol_ratio:.2f}× average  ({'above' if vol_ratio >= 1.0 else 'below'} average)
BB Upper = {fmt_price(indicators.bb_upper)}  |  Middle = {fmt_price(indicators.bb_middle)}  |  Lower = {fmt_price(indicators.bb_lower)}
Pivot Point = {fmt_price(levels.pivot)}

=== KEY LEVELS ===
Support    : {sup_str}
Resistance : {res_str}

=== SIGNAL REASONS ===
{chr(10).join(f"- {r}" for r in decision.reasons)}

=== RISK FACTORS ===
{chr(10).join(f"- {r}" for r in decision.risk_factors)}"""


# ── Groq API call ─────────────────────────────────────────────────────────────

def _call_groq(prompt: str) -> dict:
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable not set")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        "temperature":   GROQ_TEMPERATURE,
        "max_tokens":    GROQ_MAX_TOKENS,
        "response_format": {"type": "json_object"},
    }

    resp = requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=28)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return json.loads(content)


# ── Checklist (programmatic, not AI) ─────────────────────────────────────────

def _build_checklist(decision: TradeDecision, indicators: Indicators) -> list[ChecklistItem]:
    return [
        ChecklistItem(
            item="Entry zone identified",
            passed=True,
        ),
        ChecklistItem(
            item=f"Trend confirmed ({decision.trend})",
            passed=decision.trend in ("Bullish", "Bearish"),
        ),
        ChecklistItem(
            item="Volume confirmed (≥ average)",
            passed=indicators.current_volume >= indicators.volume_sma,
        ),
        ChecklistItem(
            item=f"R:R ≥ {MIN_RISK_REWARD} (actual {fmt_rr(decision.risk_reward)})",
            passed=decision.risk_reward >= MIN_RISK_REWARD,
        ),
        ChecklistItem(
            item=f"Confidence ≥ {MIN_CONFIDENCE}% (actual {decision.confidence}%)",
            passed=decision.confidence >= MIN_CONFIDENCE,
        ),
    ]


# ── Static fallback ───────────────────────────────────────────────────────────

def _static_fallback(
    decision: TradeDecision,
    indicators: Indicators,
    levels: Levels,
) -> Explanation:
    direction   = "long" if decision.signal == "LONG" else "short"
    entry_range = f"{fmt_price(decision.entry_low)} – {fmt_price(decision.entry_high)}"

    return Explanation(
        mentor=(
            f"The market is showing a {decision.trend.lower()} trend with "
            f"{decision.market_structure.lower()} structure. "
            f"Wait for price to enter the zone ({entry_range}) before opening a "
            f"{direction} position. Current confidence: {decision.confidence}%."
        ),
        stop_loss_tip=(
            f"Stop loss is placed at {fmt_price(decision.stop_loss)}, calculated from "
            f"ATR ({fmt_price(indicators.atr)}) × {1.5} to stay outside normal market noise. "
            "Do not widen the stop loss after entering the trade."
        ),
        market_summary=(
            f"{decision.trend} market with {decision.volatility.lower()} volatility. "
            f"Structure: {decision.market_structure}."
        ),
        execution_plan=(
            f"Enter near {entry_range} on candle confirmation. "
            f"Primary target is TP2 at {fmt_price(decision.tp2)}. "
            f"Risk:Reward = {fmt_rr(decision.risk_reward)}."
        ),
        key_risks=decision.risk_factors[:3],
        checklist=_build_checklist(decision, indicators),
    )


# ── Public API ────────────────────────────────────────────────────────────────

def generate_explanation(
    decision:     TradeDecision,
    indicators:   Indicators,
    levels:       Levels,
    symbol:       str = "BTC",
    timeframe:    str = "15m",
    style:        str = "Day Trading",
    risk_profile: str = "Moderate",
    price:        float = 0.0,
) -> Explanation:
    checklist = _build_checklist(decision, indicators)

    try:
        prompt  = _build_prompt(symbol, timeframe, style, risk_profile, price,
                                decision, indicators, levels)
        ai_data = _call_groq(prompt)

        return Explanation(
            mentor        = ai_data.get("mentor", "").strip(),
            stop_loss_tip = ai_data.get("stop_loss_tip", "").strip(),
            market_summary= ai_data.get("market_summary", "").strip(),
            execution_plan= ai_data.get("execution_plan", "").strip(),
            key_risks     = [r.strip() for r in ai_data.get("key_risks", [])[:3]],
            checklist     = checklist,
        )

    except Exception as exc:
        logger.warning("DeepSeek explanation failed — using static fallback: %s", exc)
        fb = _static_fallback(decision, indicators, levels)
        fb.checklist = checklist
        return fb
