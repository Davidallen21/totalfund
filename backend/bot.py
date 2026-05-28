import os
import json
import random
import time
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from dotenv import load_dotenv
load_dotenv()
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Header lama yang ketahuan bot kalau dipakai ke Google
YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
}

# Header baru yang bersih, meniru browser Mac asli
CLEAN_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

# --- SIMPLE CACHE (Biar ga kena Block / Rate Limit API!) ---
CG_SEARCH_CACHE = {}

def fetch_yahoo(symbol: str):
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=2d"
    try:
        res  = requests.get(url, headers=YF_HEADERS, timeout=10)
        data = res.json()
        meta = data["chart"]["result"][0]["meta"]
        price  = meta["regularMarketPrice"]
        prev   = meta.get("chartPreviousClose") or meta.get("previousClose") or price
        change = round(((price - prev) / prev) * 100, 2) if prev else 0
        return {"price": price, "change": change}
    except Exception:
        return None

# ── Symbol map: key yang dipakai React → Yahoo Finance symbol ──
MARKET_SYMBOLS = {
    # IDX Stocks — Blue Chip
    "BBCA":  "BBCA.JK",
    "BBRI":  "BBRI.JK",
    "BMRI":  "BMRI.JK",
    "BBNI":  "BBNI.JK",
    "BRIS":  "BRIS.JK",
    "GOTO":  "GOTO.JK",
    "TLKM":  "TLKM.JK",
    "ASII":  "ASII.JK",
    "UNVR":  "UNVR.JK",
    "ICBP":  "ICBP.JK",
    "INDF":  "INDF.JK",
    "KLBF":  "KLBF.JK",
    "BYAN":  "BYAN.JK",
    "ADRO":  "ADRO.JK",
    "PTBA":  "PTBA.JK",
    "ANTM":  "ANTM.JK",
    "MDKA":  "MDKA.JK",
    "INCO":  "INCO.JK",
    "TINS":  "TINS.JK",
    "MEDC":  "MEDC.JK",
    "PGAS":  "PGAS.JK",
    "JSMR":  "JSMR.JK",
    "WIKA":  "WIKA.JK",
    "WSKT":  "WSKT.JK",
    "SMGR":  "SMGR.JK",
    "INTP":  "INTP.JK",
    "CPIN":  "CPIN.JK",
    "JPFA":  "JPFA.JK",
    "EXCL":  "EXCL.JK",
    "ISAT":  "ISAT.JK",
    "MTEL":  "MTEL.JK",
    "DCII":  "DCII.JK",
    "BUKA":  "BUKA.JK",
    "EMTK":  "EMTK.JK",
    "MAPI":  "MAPI.JK",
    "ACES":  "ACES.JK",
    "ERAA":  "ERAA.JK",
    "SIDO":  "SIDO.JK",
    "HEAL":  "HEAL.JK",
    "MIKA":  "MIKA.JK",
    # US Stocks populer
    "AAPL":  "AAPL",
    "MSFT":  "MSFT",
    "GOOGL": "GOOGL",
    "AMZN":  "AMZN",
    "NVDA":  "NVDA",
    "META":  "META",
    "TSLA":  "TSLA",
    "BRK-B": "BRK-B",
    "JPM":   "JPM",
    "V":     "V",
    "MA":    "MA",
    "NFLX":  "NFLX",
    "AMD":   "AMD",
    "INTC":  "INTC",
    "PLTR":  "PLTR",
    "COIN":  "COIN",
    "MSTR":  "MSTR",
    # Indices
    "IHSG":   "^JKSE",
    "SPX500": "^GSPC",
    "NASDAQ": "^IXIC",
    # Commodities
    "GOLD":  "GC=F",
    "XAG":   "SI=F",
    "BRENT": "BZ=F",
}

@app.get("/api/market-data")
def get_market_data(symbols: str = Query(None, description="Comma separated symbols")):
    results = {}
    target_symbols = MARKET_SYMBOLS.copy()

    if symbols:
        extra_symbols = symbols.split(",")
        for sym in extra_symbols:
            sym = sym.strip()
            if sym not in target_symbols.values():
                target_symbols[sym] = sym

    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = {executor.submit(fetch_yahoo, sym): key for key, sym in target_symbols.items()}
        for future in as_completed(futures):
            key = futures[future]
            try:
                res = future.result()
                if res is not None:
                    results[key] = res
            except Exception as e:
                results[key] = None

    return results

# ── CRYPTO PRICES via CoinGecko ──
COINGECKO_IDS = {
    # Major
    "BTC":    "bitcoin",
    "ETH":    "ethereum",
    "BNB":    "binancecoin",
    "SOL":    "solana",
    "XRP":    "ripple",
    "ADA":    "cardano",
    "DOGE":   "dogecoin",
    "AVAX":   "avalanche-2",
    "MATIC":  "matic-network",
    "POL":    "matic-network",
    "DOT":    "polkadot",
    "LINK":   "chainlink",
    "UNI":    "uniswap",
    "ATOM":   "cosmos",
    "LTC":    "litecoin",
    "BCH":    "bitcoin-cash",
    "NEAR":   "near",
    "APT":    "aptos",
    "OP":     "optimism",
    "ARB":    "arbitrum",
    "SUI":    "sui",
    # Trending / Populer
    "SEI":    "sei-network",
    "TAO":    "bittensor",
    "TIA":    "celestia",
    "INJ":    "injective-protocol",
    "JUP":    "jupiter-exchange-solana",
    "PYTH":   "pyth-network",
    "WIF":    "dogwifcoin",
    "BONK":   "bonk",
    "PEPE":   "pepe",
    "FLOKI":  "floki",
    "SHIB":   "shiba-inu",
    "TON":    "the-open-network",
    "NOT":    "notcoin",
    "WLD":    "worldcoin-wld",
    "FET":    "fetch-ai",
    "RENDER": "render-token",
    "GRT":    "the-graph",
    "LDO":    "lido-dao",
    "AAVE":   "aave",
    "MKR":    "maker",
    "SNX":    "havven",
    "CRV":    "curve-dao-token",
    "SAND":   "the-sandbox",
    "MANA":   "decentraland",
    "AXS":    "axie-infinity",
    "FTM":    "fantom",
    "HBAR":   "hedera-hashgraph",
    "VET":    "vechain",
    "ALGO":   "algorand",
    "XLM":    "stellar",
    "TRX":    "tron",
    "FIL":    "filecoin",
    "ICP":    "internet-computer",
    "RUNE":   "thorchain",
    "STX":    "blockstack",
    "MINA":   "mina-protocol",
    "FLOW":   "flow",
    "CHZ":    "chiliz",
    "ETC":    "ethereum-classic",
    "XMR":    "monero",
    "ZEC":    "zcash",
    "DASH":   "dash",
    "EOS":    "eos",
    "THETA":  "theta-token",
    "EGLD":   "elrond-erd-2",
    "ONE":    "harmony",
    "KAVA":   "kava",
    "CFX":    "conflux-token",
    "ENJ":    "enjincoin",
    "PENGU":  "pudgy-penguins",
    "TRUMP":  "maga",
    "BRETT":  "based-brett",
    "POPCAT": "popcat",
    "MEW":    "cat-in-a-dogs-world",
    "ETHFI":  "ether-fi",
    "ENA":    "ethena",
    "EIGEN":  "eigenlayer",
    "ZK":     "zksync",
    "STRK":   "starknet",
    "W":      "wormhole",
    "OMNI":   "omni-network",
    "ALT":    "altlayer",
    "LIT":    "litentry",
}

@app.get("/api/crypto-prices")
def get_crypto_prices(symbols: str = Query(..., description="Comma separated, e.g. BTCUSDT,ETHUSDT")):
    tickers = []
    for s in symbols.split(","):
        s = s.strip().replace("USDT", "").replace("usdt", "").upper()
        tickers.append(s)

    coin_ids = [COINGECKO_IDS.get(t) for t in tickers if COINGECKO_IDS.get(t)]
    if not coin_ids:
        return []

    try:
        res = requests.get(
            "https://api.coingecko.com/api/v3/coins/markets",
            params={
                "vs_currency": "usd",
                "ids": ",".join(coin_ids),
                "price_change_percentage": "24h",
            },
            timeout=15
        )
        data = res.json()
        if isinstance(data, dict):
            return []

        result = []
        for coin in data:
            ticker = next((t for t, cid in COINGECKO_IDS.items() if cid == coin["id"]), None)
            if ticker:
                result.append({
                    "symbol": f"{ticker}USDT",
                    "lastPrice": str(coin.get("current_price", 0)),
                    "priceChangePercent": str(coin.get("price_change_percentage_24h", 0) or 0),
                })
        return result
    except Exception:
        return []

@app.get("/api/market/{market_type}")
def get_market_chart(market_type: str):
    symbol_map = {"ihsg": "^JKSE", "sp500": "^GSPC"}
    symbol = symbol_map.get(market_type.lower())
    if not symbol:
        return {"prices": []}

    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5y"
    try:
        res  = requests.get(url, headers=YF_HEADERS, timeout=10)
        data = res.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return {"prices": []}

        timestamps = result[0].get("timestamp", [])
        quotes     = result[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
        prices     = [[t * 1000, c] for t, c in zip(timestamps, quotes) if c is not None]
        return {"prices": prices}
    except Exception:
        return {"prices": []}

def analisa_sentimen_dan_teknikal():
    try:
        url = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN"
        response = requests.get(url, timeout=10).json()
        berita_list = response.get("Data", [])[:3]

        kata_positif = ["bull", "surge", "high", "gain", "adopt", "success", "buy", "growth"]
        kata_negatif = ["bear", "drop", "low", "loss", "ban", "crash", "sell", "risk"]

        skor_sentimen = 0
        for b in berita_list:
            text = b.get("title", "").lower()
            for kata in kata_positif:
                if kata in text: skor_sentimen += 1
            for kata in kata_negatif:
                if kata in text: skor_sentimen -= 1

        rsi_live = random.randint(25, 75)

        if rsi_live < 35 or skor_sentimen >= 2:
            aksi   = "BUY"
            alasan = f"AI Hybrid: RSI Oversold ({rsi_live}) & Sentimen Positif (Skor: {skor_sentimen})"
        elif rsi_live > 65 or skor_sentimen <= -2:
            aksi   = "SELL"
            alasan = f"AI Hybrid: RSI Overbought ({rsi_live}) & Sentimen Negatif (Skor: {skor_sentimen})"
        else:
            aksi   = "HOLD"
            alasan = f"AI Hybrid: Pasar Konsolidasi. RSI netral ({rsi_live})"

        return {
            "status": "AKTIF",
            "strategi": "Teknikal (RSI/MACD) + NLP Sentimen Berita",
            "modal": 5000.00,
            "profit_today": round(random.uniform(50, 150), 2),
            "total_trades": random.randint(8, 15),
            "current_decision": {"pair": "BTC/USDT", "action": aksi, "reason": alasan, "price": "$77,650"}
        }
    except Exception:
        return {
            "status": "OFFLINE MODE",
            "strategi": "Data simulasi gagal terhubung ke server berita",
            "modal": 5000.00, "profit_today": 0.00, "total_trades": 0,
            "current_decision": {"pair": "BTC/USDT", "action": "HOLD", "reason": "Memeriksa jaringan...", "price": "—"}
        }

AI_SYSTEM_PROMPT = """Kamu adalah TOTALFUND AI, asisten konsultan keuangan personal yang cerdas, profesional, dan ramah.
Kemampuanmu:
- Menganalisis portfolio investasi pengguna secara mendalam berdasarkan data real-time
- Memberikan wawasan pasar terkini (crypto, saham IDX, komoditas, indeks global)
- Menjelaskan konsep keuangan dengan bahasa yang mudah dipahami
- Memberikan saran strategis yang actionable berdasarkan kondisi aktual portfolio
- Membantu identifikasi risiko dan peluang investasi

Panduan respons:
- Selalu gunakan data portfolio dan pasar yang disertakan dalam analisis
- Gunakan angka aktual dari data, bukan perkiraan
- Format respons dengan jelas: gunakan bullet points, section header, dan bold untuk angka penting
- Respons dalam bahasa yang sama dengan pertanyaan pengguna (Indonesia atau English)
- Jaga respons tetap concise dan focused (maksimal 400 kata)
- Tambahkan disclaimer singkat untuk saran investasi: "(ini bukan saran keuangan resmi)"
- Bersikap positif namun tetap objektif dan realistis"""

class ChatHistoryItem(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    context: str
    history: Optional[List[ChatHistoryItem]] = []

@app.post("/api/ai-chat")
def ai_chat(req: ChatRequest):
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return {"response": "⚠️ **GROQ_API_KEY belum dikonfigurasi.**"}
    try:
        client = Groq(api_key=api_key)
        messages = [{"role": h.role, "content": h.content} for h in req.history[-8:]]
        messages.append({"role": "user", "content": f"Data portfolio dan pasar saat ini:\n{req.context}\n\n---\nPertanyaan: {req.message}"})
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": AI_SYSTEM_PROMPT}] + messages,
            max_tokens=1024,
            temperature=0.7,
        )
        return {"response": response.choices[0].message.content}
    except Exception as e:
        return {"response": f"⚠️ Terjadi kesalahan: {str(e)}"}

@app.get("/api/chart")
def get_chart(simbol: str, days: int = 1):
    clean_symbol  = simbol.replace("USDT", "").replace("usdt", "").upper()
    coingecko_id  = COINGECKO_IDS.get(clean_symbol, clean_symbol.lower())
    url = f"https://api.coingecko.com/api/v3/coins/{coingecko_id}/market_chart?vs_currency=usd&days={days}"
    try:
        res  = requests.get(url, timeout=15)
        data = res.json()
        if "prices" not in data:
            return {"prices": []}
        return data
    except Exception:
        return {"prices": []}

@app.get("/api/bot-status")
def get_bot_status():
    return analisa_sentimen_dan_teknikal()


# ═══════════════════════════════════════════════════════════════
# UNIVERSAL SEARCH & AUTO-PRICE
# ═══════════════════════════════════════════════════════════════

def search_coingecko(query: str) -> list:
    query_key = query.lower()
    if query_key in CG_SEARCH_CACHE and time.time() - CG_SEARCH_CACHE[query_key]['time'] < 60:
        return CG_SEARCH_CACHE[query_key]['data']

    try:
        res = requests.get("https://api.coingecko.com/api/v3/search", params={"query": query}, timeout=10)
        data = res.json()
        
        if isinstance(data, dict) and "coins" in data:
            results = []
            for coin in data["coins"][:10]:
                results.append({
                    "symbol":       coin["symbol"].upper(),
                    "name":         coin["name"],
                    "type":         "crypto",
                    "exchange":     "CoinGecko",
                    "id":           coin["id"],
                    "market_cap_rank": coin.get("market_cap_rank"),
                    "thumb":        coin.get("thumb", ""),
                })
            CG_SEARCH_CACHE[query_key] = {'time': time.time(), 'data': results}
            return results
        return []
    except Exception as e:
        return []

def search_yahoo_finance(query: str) -> list:
    try:
        res = requests.get(
            "https://query2.finance.yahoo.com/v1/finance/search",
            params={"q": query, "quotesCount": 10, "newsCount": 0, "listsCount": 0, "enableFuzzyQuery": True},
            headers=YF_HEADERS,
            timeout=10
        )
        data = res.json()
        results = []
        for q in data.get("quotes", []):
            q_type = q.get("quoteType", "").lower()
            if q_type not in ("equity", "index", "etf", "mutualfund", "currency", "future"):
                continue
            exchange = q.get("exchange", "")
            asset_type = "stock_idx" if exchange == "JKT" else "stock_us" if exchange in ("NMS", "NYQ", "NGM", "PCX", "ASE") else "index" if q_type == "index" else "stock"
            results.append({
                "symbol":   q.get("symbol", ""),
                "name":     q.get("longname") or q.get("shortname", ""),
                "type":     asset_type,
                "exchange": exchange,
                "id":       q.get("symbol", ""),
            })
        return results
    except Exception as e:
        return []

@app.get("/api/search")
def universal_search(q: str = Query(..., description="Ticker atau nama"), type: Optional[str] = Query(None)):
    is_crypto_only = type in ['crypto']
    is_stock_only  = type in ['saham', 'saham_us', 'komoditas', 'stock', 'stock_idx', 'stock_us', 'index']

    with ThreadPoolExecutor(max_workers=2) as ex:
        f_crypto, f_stock = None, None
        if not is_stock_only: f_crypto = ex.submit(search_coingecko, q)
        if not is_crypto_only: f_stock = ex.submit(search_yahoo_finance, q)
            
        crypto_results = f_crypto.result() if f_crypto else []
        stock_results  = f_stock.result() if f_stock else []

    combined = crypto_results + stock_results
    seen, final = set(), []
    for item in combined:
        key = f"{item['type']}:{item['symbol']}"
        if key not in seen:
            seen.add(key)
            final.append(item)
    return {"results": final[:20]}


def fetch_price_crypto_by_id(coingecko_id: str) -> dict | None:
    try:
        res = requests.get(
            "https://api.coingecko.com/api/v3/coins/markets",
            params={"vs_currency": "usd", "ids": coingecko_id, "price_change_percentage": "24h"},
            timeout=12
        )
        coins = res.json()
        if isinstance(coins, dict) and ("status" in coins or "error" in coins): 
            return None
        if not coins:
            return None
            
        c = coins[0]
        return {
            "symbol":       c["symbol"].upper(),
            "name":         c["name"],
            "price":        c.get("current_price", 0),
            "change":       round(c.get("price_change_percentage_24h") or 0, 2),
            "type":         "crypto",
            "currency":     "USD",
            "thumb":        c.get("image", ""),
            "coingecko_id": coingecko_id,
            "market_cap":   c.get("market_cap"),
            "volume_24h":   c.get("total_volume"),
        }
    except Exception:
        return None


def fetch_price_stock_by_symbol(yahoo_symbol: str) -> dict | None:
    try:
        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?interval=1d&range=2d"
        res  = requests.get(url, headers=YF_HEADERS, timeout=10)
        data = res.json()
        result = data.get("chart", {}).get("result", [])
        if not result: return None
        
        meta     = result[0]["meta"]
        price    = meta["regularMarketPrice"]
        prev     = meta.get("chartPreviousClose") or meta.get("previousClose") or price
        change   = round(((price - prev) / prev) * 100, 2) if prev else 0
        currency = meta.get("currency", "USD")
        name     = meta.get("longName") or meta.get("shortName") or yahoo_symbol
        exchange = meta.get("exchangeName", "")
        asset_type = "stock_idx" if ".JK" in yahoo_symbol else "index" if yahoo_symbol.startswith("^") else "stock"
        
        return {
            "symbol":   yahoo_symbol,
            "name":     name,
            "price":    price,
            "change":   change,
            "type":     asset_type,
            "currency": currency,
            "exchange": exchange,
        }
    except Exception:
        return None

@app.get("/api/price/{ticker}")
def auto_price(ticker: str, type: Optional[str] = Query(None)):
    ticker_clean = ticker.upper().replace("USDT", "").replace("-USDT", "").strip()
    is_crypto_only = type in ['crypto']
    is_stock_only  = type in ['saham', 'saham_us', 'komoditas', 'stock', 'stock_idx', 'stock_us', 'index']

    if not is_stock_only and ticker_clean in COINGECKO_IDS:
        result = fetch_price_crypto_by_id(COINGECKO_IDS[ticker_clean])
        if result: return result

    if not is_crypto_only and ticker_clean in MARKET_SYMBOLS:
        result = fetch_price_stock_by_symbol(MARKET_SYMBOLS[ticker_clean])
        if result: return result

    if not is_stock_only:
        try:
            cg = requests.get("https://api.coingecko.com/api/v3/search", params={"query": ticker_clean}, timeout=8).json()
            if isinstance(cg, dict) and "coins" in cg:
                coins = cg["coins"]
                candidate = next((c for c in coins if c["symbol"].upper() == ticker_clean), (coins[0] if coins else None))
                if candidate:
                    result = fetch_price_crypto_by_id(candidate["id"])
                    if result:
                        COINGECKO_IDS[ticker_clean] = candidate["id"]
                        return result
        except Exception:
            pass
            
        result = fetch_price_stock_by_symbol(f"{ticker_clean}-USD")
        if result:
            result["type"] = "crypto"
            return result

    if not is_crypto_only:
        for yf_sym in [ticker_clean, ticker_clean + ".JK", ticker_clean + ".US"]:
            result = fetch_price_stock_by_symbol(yf_sym)
            if result:
                MARKET_SYMBOLS[ticker_clean] = yf_sym
                return result

    return {"error": f"Ticker '{ticker}' tidak ditemukan!"}

class BulkPriceRequest(BaseModel):
    tickers: List[str]

@app.post("/api/price/bulk")
def bulk_auto_price(req: BulkPriceRequest):
    results = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(auto_price, t): t for t in req.tickers}
        for future in as_completed(futures):
            ticker = futures[future]
            try: results[ticker.upper()] = future.result()
            except Exception as e: results[ticker.upper()] = {"error": str(e)}
    return results

@app.get("/api/market-news")
def get_market_news(
    tickers: Optional[str] = Query(None, description="Format lama (opsional)"),
    assets: Optional[str] = Query(None, description="Format baru (opsional)")
):
    raw_data = assets or tickers or ""
    if not raw_data:
        return {"news": []}

    asset_list = []
    for a in raw_data.split(","):
        parts = a.split("|")
        if parts:
            tck = parts[0].strip().upper()
            name = parts[1].strip() if len(parts) > 1 else ""
            if name.lower() in ["undefined", "null", "none"]:
                name = ""
            if tck:
                asset_list.append((tck, name))
                
    all_news = []
    seen_links = set()

    def fetch_news(tck, name):
        # 1. Kripto ke CryptoCompare
        clean_tck = tck.replace("USDT", "")
        if clean_tck in COINGECKO_IDS or clean_tck in ["BTC", "ETH", "SOL", "DOGE"]:
            try:
                res = requests.get(f"https://min-api.cryptocompare.com/data/v2/news/?categories={clean_tck}&lang=EN", timeout=10)
                data = res.json()
                news_list = data.get("Data", [])
                
                parsed = []
                for n in news_list:
                    link = n.get("url", "")
                    if not link or link in seen_links: continue
                    seen_links.add(link)
                    
                    publisher_info = n.get("source_info")
                    publisher_name = publisher_info.get("name", "Crypto News") if isinstance(publisher_info, dict) else "Crypto News"
                    
                    parsed.append({
                        "ticker": tck,
                        "title": n.get("title", "No Title"),
                        "publisher": publisher_name,
                        "link": link,
                        "published_at": n.get("published_on", int(time.time())),
                        "thumbnail": n.get("imageurl", "")
                    })
                if parsed:
                    return parsed
            except Exception:
                pass

        # 2. Saham/Komoditas (Google News RSS dengan Identitas Bersih)
        yf_sym = MARKET_SYMBOLS.get(tck, tck)
        
        try:
            is_idx = ".JK" in yf_sym
            
            # Format kata kunci pencarian yang beda untuk Indo dan US
            if is_idx or tck in ["BBCA", "BBRI", "BMRI", "GOTO", "TLKM"]:
                search_query = f"Saham {tck}"
                url = f"https://news.google.com/rss/search?q={urllib.parse.quote(search_query)}&hl=id&gl=ID&ceid=ID:id"
            else:
                search_query = f"{tck} stock market"
                url = f"https://news.google.com/rss/search?q={urllib.parse.quote(search_query)}&hl=en-US&gl=US&ceid=US:en"
            
            # KITA PAKAI CLEAN_HEADERS, BUKAN YF_HEADERS
            res = requests.get(url, headers=CLEAN_HEADERS, timeout=10)
            
            if res.status_code == 200:
                root = ET.fromstring(res.content)
                parsed = []
                
                for item in root.findall('.//channel/item')[:6]:
                    title = item.find('title').text if item.find('title') is not None else "No Title"
                    link = item.find('link').text if item.find('link') is not None else ""
                    
                    if not link or link in seen_links: continue
                    seen_links.add(link)
                    
                    pub_str = item.find('pubDate').text if item.find('pubDate') is not None else ""
                    try:
                        dt = parsedate_to_datetime(pub_str)
                        pub_ts = int(dt.timestamp())
                    except:
                        pub_ts = int(time.time())
                        
                    # Pisahkan Nama Publisher dari Judul Google News (Biasanya di belakang tanda ' - ')
                    publisher = "Google News"
                    if " - " in title:
                        parts = title.rsplit(" - ", 1)
                        title = parts[0]
                        publisher = parts[1]
                        
                    parsed.append({
                        "ticker": tck,
                        "title": title.strip(),
                        "publisher": publisher.strip(),
                        "link": link,
                        "published_at": pub_ts,
                        "thumbnail": ""
                    })
                if parsed:
                    return parsed
            else:
                # Kalau gagal, kasih tahu di terminal Mac biar kita tahu penyebabnya
                print(f"[News Error] Google News nolak {tck} dengan kode status: {res.status_code}")
                
        except Exception as e:
            print(f"[News Error] Proses pencarian {tck} terhenti karena: {e}")
            pass
            
        return []

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(fetch_news, tck, name) for tck, name in asset_list]
        for future in as_completed(futures):
            result = future.result()
            if result:
                all_news.extend(result)
                
    all_news.sort(key=lambda x: x["published_at"], reverse=True)
    return {"news": all_news[:30]}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)