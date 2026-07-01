# ── Indicator defaults ────────────────────────────────────────────────────────
EMA_FAST   = 20
EMA_SLOW   = 50
RSI_PERIOD = 14
RSI_OVERBOUGHT = 70
RSI_OVERSOLD   = 30

MACD_FAST   = 12
MACD_SLOW   = 26
MACD_SIGNAL = 9

ATR_PERIOD = 14

BB_PERIOD = 20
BB_STD    = 2.0

VOLUME_SMA_PERIOD = 20

# ── Trade quality thresholds ──────────────────────────────────────────────────
MIN_CONFIDENCE  = 55   # below this, signal is flagged as Weak
MIN_RISK_REWARD = 1.5  # minimum acceptable R:R

# ATR multipliers for SL / TP
SL_ATR_MULT  = 1.5
TP1_ATR_MULT = 1.0
TP2_ATR_MULT = 2.0
TP3_ATR_MULT = 3.5

# ── Timeframe mapping (frontend label → Binance interval string) ──────────────
TIMEFRAME_MAP: dict[str, str] = {
    "1m":  "1m",
    "3m":  "3m",
    "5m":  "5m",
    "15m": "15m",
    "30m": "30m",
    "1H":  "1h",
    "4H":  "4h",
    "1D":  "1d",
    "1W":  "1w",
    "1M":  "1M",
}

# ── Style configuration ────────────────────────────────────────────────────────
STYLE_CONFIG: dict[str, dict] = {
    "Scalping": {
        "timeframes":    ["1m", "3m", "5m", "15m"],
        "default_tf":    "5m",
        "candle_limit":  200,
        "holding_time":  "30–60 Minutes",
    },
    "Day Trading": {
        "timeframes":    ["5m", "15m", "30m", "1H"],
        "default_tf":    "15m",
        "candle_limit":  200,
        "holding_time":  "2–8 Hours",
    },
    "Swing Trading": {
        "timeframes":    ["1H", "4H", "1D"],
        "default_tf":    "4H",
        "candle_limit":  300,
        "holding_time":  "3–10 Days",
    },
    "Position Trading": {
        "timeframes":    ["4H", "1D", "1W"],
        "default_tf":    "1D",
        "candle_limit":  300,
        "holding_time":  "2–8 Weeks",
    },
    "Long Term": {
        "timeframes":    ["1D", "1W", "1M"],
        "default_tf":    "1W",
        "candle_limit":  300,
        "holding_time":  "3–18 Months",
    },
}

# ── Cache TTL (seconds) ────────────────────────────────────────────────────────
CACHE_TTL: dict[str, int] = {
    "market_data": 30,
    "indicators":  60,
    "analysis":    300,
}

# ── Groq AI (primary) ────────────────────────────────────────────────────────────
GROQ_API_URL         = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL           = "llama-3.3-70b-versatile"
GROQ_MAX_TOKENS      = 700
GROQ_TEMPERATURE     = 0.35

# ── DeepSeek AI (fallback, kept for reference) ───────────────────────────────────
DEEPSEEK_API_URL     = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL       = "deepseek-chat"
DEEPSEEK_MAX_TOKENS  = 700
DEEPSEEK_TEMPERATURE = 0.35

# ── Binance API base (data-api.binance.vision works globally without SSL issues) ──
BINANCE_API_BASE          = "https://data-api.binance.vision/api/v3"
BINANCE_EXCHANGE_INFO_URL = f"{BINANCE_API_BASE}/exchangeInfo"

# Filters applied to exchange info response (spot fields)
SYMBOL_FILTER_QUOTE              = "USDT"
SYMBOL_FILTER_STATUS             = "TRADING"
SYMBOL_FILTER_SPOT_ALLOWED       = True    # isSpotTradingAllowed must be True

# Auto-refresh interval for the symbol cache (12 hours)
SYMBOL_CACHE_REFRESH_INTERVAL = 12 * 3600

# Max results returned from search endpoint
SYMBOL_SEARCH_LIMIT = 30

# Popular coins shown when search query is empty — ordered by preference
POPULAR_BASE_ASSETS: list[str] = [
    "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX",
    "LINK", "DOT", "MATIC", "UNI", "PEPE", "WIF", "SUI", "TON",
    "APT", "ARB", "OP", "INJ",
]
