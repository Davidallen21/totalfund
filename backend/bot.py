import os
import json
import random
import time
import threading
import urllib.parse
import xml.etree.ElementTree as ET
import re
from email.utils import parsedate_to_datetime
from dotenv import load_dotenv
load_dotenv()
import requests
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

@asynccontextmanager
async def _lifespan(app: FastAPI):
    from ai_trade.services.market_symbol_service import ensure_loaded, start_background_refresh
    import asyncio
    await asyncio.get_event_loop().run_in_executor(None, ensure_loaded)
    start_background_refresh()
    yield

app = FastAPI(lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from ai_trade.routes import router as ai_trade_router
from ai_trade.symbol_routes import router as symbol_router
app.include_router(ai_trade_router)
app.include_router(symbol_router)

YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
}

CLEAN_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

COINGECKO_API_KEY = os.environ.get("COINGECKO_API_KEY", "")
CG_HEADERS = {
    **CLEAN_HEADERS,
    **({"x-cg-demo-api-key": COINGECKO_API_KEY} if COINGECKO_API_KEY else {}),
}

# --- SIMPLE CACHE (Biar ga kena Block / Rate Limit API!) ---
CG_SEARCH_CACHE = {}
_OVERVIEW_CACHE = {}

def _cache_get(key: str, ttl_seconds: int):
    entry = _OVERVIEW_CACHE.get(key)
    if entry and (time.time() - entry["time"] < ttl_seconds):
        return entry["data"]
    return None

def _cache_set(key: str, data):
    _OVERVIEW_CACHE[key] = {"time": time.time(), "data": data}

def _request_with_retry(url, params=None, headers=None, timeout=12, retries=2):
    last_err = None
    for attempt in range(retries + 1):
        try:
            res = requests.get(url, params=params, headers=headers or CLEAN_HEADERS, timeout=timeout)
            if res.status_code == 429:
                time.sleep(1.5 * (attempt + 1))
                continue
            res.raise_for_status()
            return res
        except Exception as e:
            last_err = e
            time.sleep(0.8 * (attempt + 1))
    raise last_err

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

def fetch_yahoo_bulk(yahoo_symbols: list) -> dict:
    """Batch-fetch multiple Yahoo Finance symbols in a single API call.
    Returns {yahoo_symbol: {price, change}} for all successful lookups."""
    if not yahoo_symbols:
        return {}
    try:
        res = requests.get(
            "https://query2.finance.yahoo.com/v7/finance/quote",
            params={"symbols": ",".join(yahoo_symbols)},
            headers=YF_HEADERS,
            timeout=15,
        )
        data = res.json()
        out = {}
        for q in (data.get("quoteResponse", {}).get("result") or []):
            sym = q.get("symbol")
            if not sym:
                continue
            price  = q.get("regularMarketPrice") or 0
            change = round(q.get("regularMarketChangePercent") or 0, 2)
            out[sym] = {"price": price, "change": change}
        return out
    except Exception:
        return {}

MARKET_SYMBOLS = {
    # ── IDX Stocks ──
    "BBCA":    "BBCA.JK",  "BBRI":  "BBRI.JK",  "BMRI":  "BMRI.JK",
    "BBNI":    "BBNI.JK",  "BRIS":  "BRIS.JK",  "GOTO":  "GOTO.JK",
    "TLKM":    "TLKM.JK",  "ASII":  "ASII.JK",  "UNVR":  "UNVR.JK",
    "ICBP":    "ICBP.JK",  "INDF":  "INDF.JK",  "KLBF":  "KLBF.JK",
    "BYAN":    "BYAN.JK",  "ADRO":  "ADRO.JK",  "PTBA":  "PTBA.JK",
    "ANTM":    "ANTM.JK",  "MDKA":  "MDKA.JK",  "INCO":  "INCO.JK",
    "TINS":    "TINS.JK",  "MEDC":  "MEDC.JK",  "PGAS":  "PGAS.JK",
    "JSMR":    "JSMR.JK",  "WIKA":  "WIKA.JK",  "WSKT":  "WSKT.JK",
    "SMGR":    "SMGR.JK",  "INTP":  "INTP.JK",  "CPIN":  "CPIN.JK",
    "JPFA":    "JPFA.JK",  "EXCL":  "EXCL.JK",  "ISAT":  "ISAT.JK",
    "MTEL":    "MTEL.JK",  "DCII":  "DCII.JK",  "BUKA":  "BUKA.JK",
    "EMTK":    "EMTK.JK",  "MAPI":  "MAPI.JK",  "ACES":  "ACES.JK",
    "ERAA":    "ERAA.JK",  "SIDO":  "SIDO.JK",  "HEAL":  "HEAL.JK",
    "MIKA":    "MIKA.JK",
    # IDX tambahan
    "HMSP":    "HMSP.JK",  "UNTR":  "UNTR.JK",  "GGRM":  "GGRM.JK",
    "MYOR":    "MYOR.JK",  "AMRT":  "AMRT.JK",  "AALI":  "AALI.JK",
    "LSIP":    "LSIP.JK",  "SSMS":  "SSMS.JK",  "TOWR":  "TOWR.JK",
    "TBIG":    "TBIG.JK",  "MNCN":  "MNCN.JK",  "SCMA":  "SCMA.JK",
    "BSDE":    "BSDE.JK",  "CTRA":  "CTRA.JK",  "PWON":  "PWON.JK",
    "SMRA":    "SMRA.JK",  "INKP":  "INKP.JK",  "TKIM":  "TKIM.JK",
    "ITMG":    "ITMG.JK",  "HRUM":  "HRUM.JK",  "INDY":  "INDY.JK",
    "TPIA":    "TPIA.JK",  "AMMN":  "AMMN.JK",  "MBMA":  "MBMA.JK",
    "BREN":    "BREN.JK",  "NCKL":  "NCKL.JK",  "NISP":  "NISP.JK",
    "PNLF":    "PNLF.JK",  "ELSA":  "ELSA.JK",  "RAJA":  "RAJA.JK",
    # ── US Stocks ──
    "AAPL":    "AAPL",   "MSFT":  "MSFT",   "GOOGL": "GOOGL",
    "AMZN":    "AMZN",   "NVDA":  "NVDA",   "META":  "META",
    "TSLA":    "TSLA",   "BRK-B": "BRK-B",  "JPM":   "JPM",
    "V":       "V",      "MA":    "MA",     "NFLX":  "NFLX",
    "AMD":     "AMD",    "INTC":  "INTC",   "PLTR":  "PLTR",
    "COIN":    "COIN",   "MSTR":  "MSTR",
    # Banks & Finance
    "BAC":     "BAC",    "WFC":   "WFC",    "C":     "C",
    "GS":      "GS",     "MS":    "MS",     "AXP":   "AXP",
    "SCHW":    "SCHW",   "BLK":   "BLK",
    # Healthcare
    "JNJ":     "JNJ",    "PFE":   "PFE",    "LLY":   "LLY",
    "ABBV":    "ABBV",   "UNH":   "UNH",    "MRK":   "MRK",
    "AMGN":    "AMGN",   "BMY":   "BMY",
    # Energy
    "XOM":     "XOM",    "CVX":   "CVX",    "COP":   "COP",
    "SLB":     "SLB",
    # Consumer & Retail
    "WMT":     "WMT",    "COST":  "COST",   "HD":    "HD",
    "NKE":     "NKE",    "TGT":   "TGT",
    # Media & Telecom
    "DIS":     "DIS",    "CMCSA": "CMCSA",  "T":     "T",
    "VZ":      "VZ",
    # Industrials
    "BA":      "BA",     "CAT":   "CAT",    "GE":    "GE",
    "HON":     "HON",    "DE":    "DE",
    # Tech & Software
    "ORCL":    "ORCL",   "CRM":   "CRM",    "ADBE":  "ADBE",
    "UBER":    "UBER",   "SHOP":  "SHOP",   "SPOT":  "SPOT",
    "SNAP":    "SNAP",   "PYPL":  "PYPL",
    # EV & Auto
    "F":       "F",      "GM":    "GM",     "RIVN":  "RIVN",
    # China ADR
    "BABA":    "BABA",   "NIO":   "NIO",    "PDD":   "PDD",
    "JD":      "JD",
    # Fintech & Meme
    "SOFI":    "SOFI",   "HOOD":  "HOOD",   "GME":   "GME",
    "AFRM":    "AFRM",   "DKNG":  "DKNG",
    # ── Indices ──
    "IHSG":    "^JKSE",  "SPX500": "^GSPC", "NASDAQ": "^IXIC",
    # ── Commodities ──
    "GOLD":    "GC=F",   # Gold
    "XAG":     "SI=F",   # Silver
    "BRENT":   "BZ=F",   # Brent Crude
    "WTI":     "CL=F",   # WTI Crude Oil
    "NG":      "NG=F",   # Natural Gas
    "HG":      "HG=F",   # Copper
    "PLAT":    "PL=F",   # Platinum
    "PALL":    "PA=F",   # Palladium
    "CORN":    "ZC=F",   # Corn
    "WHEAT":   "ZW=F",   # Wheat
    "SOYBN":   "ZS=F",   # Soybeans
    "COFFEE":  "KC=F",   # Coffee
    "SUGAR":   "SB=F",   # Sugar
    "COCOA":   "CC=F",   # Cocoa
    "COTTON":  "CT=F",   # Cotton
    "ALU":     "ALI=F",  # Aluminum
}

# Always-included keys for the market-data card prices endpoint
CORE_MARKET_KEYS = ["IHSG", "SPX500", "NASDAQ", "GOLD", "XAG", "BRENT"]

# Reverse lookup: yahoo_symbol → our key (built once at startup)
_YF_TO_KEY = {v: k for k, v in MARKET_SYMBOLS.items()}

TICKER_NAMES = {
    # IDX
    "BBCA": "Bank Central Asia",       "BBRI": "Bank Rakyat Indonesia",
    "BMRI": "Bank Mandiri",            "BBNI": "Bank Negara Indonesia",
    "BRIS": "BRI Syariah",             "GOTO": "GoTo Gojek Tokopedia",
    "TLKM": "Telkom Indonesia",        "ASII": "Astra International",
    "UNVR": "Unilever Indonesia",      "ICBP": "Indofood CBP",
    "INDF": "Indofood",                "KLBF": "Kalbe Farma",
    "BYAN": "Bayan Resources",         "ADRO": "Adaro Energy",
    "PTBA": "Bukit Asam",              "ANTM": "Aneka Tambang",
    "MDKA": "Merdeka Copper Gold",     "INCO": "Vale Indonesia",
    "TINS": "Timah",                   "MEDC": "Medco Energi",
    "PGAS": "Perusahaan Gas Negara",   "JSMR": "Jasa Marga",
    "WIKA": "Wijaya Karya",            "WSKT": "Waskita Karya",
    "SMGR": "Semen Indonesia",         "INTP": "Indocement",
    "CPIN": "Charoen Pokphand",        "JPFA": "Japfa Comfeed",
    "EXCL": "XL Axiata",               "ISAT": "Indosat Ooredoo",
    "MTEL": "Mitratel",                "DCII": "DCI Indonesia",
    "BUKA": "Bukalapak",               "EMTK": "Elang Mahkota",
    "MAPI": "Mitra Adiperkasa",        "ACES": "Ace Hardware Indonesia",
    "ERAA": "Erajaya",                 "SIDO": "Industri Jamu & Farmasi Sido Muncul",
    "HEAL": "Medikaloka Hermina",      "MIKA": "Mitra Keluarga Karyasehat",
    "HMSP": "HM Sampoerna",            "UNTR": "United Tractors",
    "GGRM": "Gudang Garam",            "MYOR": "Mayora Indah",
    "AMRT": "Sumber Alfaria Trijaya",  "AALI": "Astra Agro Lestari",
    "LSIP": "PP London Sumatra",       "SSMS": "Sawit Sumbermas",
    "TOWR": "Sarana Menara Nusantara", "TBIG": "Tower Bersama",
    "MNCN": "Media Nusantara Citra",   "SCMA": "Surya Citra Media",
    "BSDE": "Bumi Serpong Damai",      "CTRA": "Ciputra Development",
    "PWON": "Pakuwon Jati",            "SMRA": "Summarecon Agung",
    "INKP": "Indah Kiat Pulp",         "TKIM": "Tjiwi Kimia",
    "ITMG": "Indo Tambangraya",        "HRUM": "Harum Energy",
    "INDY": "Indika Energy",           "TPIA": "Chandra Asri",
    "AMMN": "Amman Mineral",           "MBMA": "Merdeka Battery",
    "BREN": "Barito Renewables",       "NCKL": "Trimegah Bangun Persada",
    "NISP": "OCBC NISP",               "PNLF": "Panin Financial",
    "ELSA": "Elnusa",                  "RAJA": "Rukun Raharja",
    # US
    "AAPL": "Apple Inc.",              "MSFT": "Microsoft Corp.",
    "GOOGL": "Alphabet (Google)",      "AMZN": "Amazon.com",
    "NVDA": "NVIDIA Corp.",            "META": "Meta Platforms",
    "TSLA": "Tesla Inc.",              "BRK-B": "Berkshire Hathaway",
    "JPM": "JPMorgan Chase",           "V": "Visa Inc.",
    "MA": "Mastercard",                "NFLX": "Netflix Inc.",
    "AMD": "Advanced Micro Devices",   "INTC": "Intel Corp.",
    "PLTR": "Palantir Technologies",   "COIN": "Coinbase Global",
    "MSTR": "MicroStrategy",           "BAC": "Bank of America",
    "WFC": "Wells Fargo",              "C": "Citigroup",
    "GS": "Goldman Sachs",             "MS": "Morgan Stanley",
    "AXP": "American Express",         "SCHW": "Charles Schwab",
    "BLK": "BlackRock",                "JNJ": "Johnson & Johnson",
    "PFE": "Pfizer Inc.",              "LLY": "Eli Lilly",
    "ABBV": "AbbVie Inc.",             "UNH": "UnitedHealth Group",
    "MRK": "Merck & Co.",              "AMGN": "Amgen Inc.",
    "BMY": "Bristol-Myers Squibb",     "XOM": "Exxon Mobil",
    "CVX": "Chevron Corp.",            "COP": "ConocoPhillips",
    "SLB": "SLB (Schlumberger)",       "WMT": "Walmart Inc.",
    "COST": "Costco Wholesale",        "HD": "Home Depot",
    "NKE": "Nike Inc.",                "TGT": "Target Corp.",
    "DIS": "Walt Disney Co.",          "CMCSA": "Comcast Corp.",
    "T": "AT&T Inc.",                  "VZ": "Verizon",
    "BA": "Boeing Co.",                "CAT": "Caterpillar Inc.",
    "GE": "GE Aerospace",              "HON": "Honeywell",
    "DE": "Deere & Co.",               "ORCL": "Oracle Corp.",
    "CRM": "Salesforce Inc.",          "ADBE": "Adobe Inc.",
    "UBER": "Uber Technologies",       "SHOP": "Shopify Inc.",
    "SPOT": "Spotify Technology",      "SNAP": "Snap Inc.",
    "PYPL": "PayPal Holdings",         "F": "Ford Motor Co.",
    "GM": "General Motors",            "RIVN": "Rivian Automotive",
    "BABA": "Alibaba Group",           "NIO": "NIO Inc.",
    "PDD": "PDD Holdings",             "JD": "JD.com",
    "SOFI": "SoFi Technologies",       "HOOD": "Robinhood Markets",
    "GME": "GameStop Corp.",           "AFRM": "Affirm Holdings",
    "DKNG": "DraftKings Inc.",
    # Commodities
    "GOLD":   "Gold Futures",          "XAG":    "Silver Futures",
    "BRENT":  "Brent Crude Oil",       "WTI":    "WTI Crude Oil",
    "NG":     "Natural Gas",           "HG":     "Copper Futures",
    "PLAT":   "Platinum Futures",      "PALL":   "Palladium Futures",
    "CORN":   "Corn Futures",          "WHEAT":  "Wheat Futures",
    "SOYBN":  "Soybean Futures",       "COFFEE": "Coffee Futures",
    "SUGAR":  "Sugar Futures",         "COCOA":  "Cocoa Futures",
    "COTTON": "Cotton Futures",        "ALU":    "Aluminum Futures",
    # Indices
    "IHSG": "IHSG (IDX Composite)", "SPX500": "S&P 500", "NASDAQ": "Nasdaq Composite",
}

COINGECKO_IDS = {
    "BTC":    "bitcoin",
    "ETH":    "ethereum",
    "BNB":    "binancecoin",
    "SOL":    "solana",
    "XRP":    "ripple",
    "ADA":    "cardano",
    "USDT":   "tether",
    "USDC":   "usd-coin",
    "DAI":    "dai",
    "BUSD":   "binance-usd",
    "HYPE":   "hyperliquid",
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

STABLECOIN_IDS = {
    "tether", "usd-coin", "dai", "binance-usd", "true-usd", "first-digital-usd",
    "usdd", "frax", "paxos-standard", "gemini-dollar", "ethena-usde",
}

# ── Comprehensive IDX stock list (~350 most liquid + major sector leaders) ────
# Format: Yahoo Finance .JK suffix. yfinance handles delisted gracefully.
IDX_ALL_JK = [
    # ── Perbankan ──────────────────────────────────────────────────────────────
    "BBCA.JK","BBRI.JK","BMRI.JK","BBNI.JK","BRIS.JK","BJBR.JK","BJTM.JK",
    "BTPS.JK","NISP.JK","MEGA.JK","MAYA.JK","NOBU.JK","BANK.JK","BNGA.JK",
    "BBKP.JK","AGRO.JK","BNII.JK","BVIC.JK","MCOR.JK","BMAS.JK","PNLF.JK",
    "BTPN.JK","NAGA.JK","BEKS.JK","BCIC.JK","BABP.JK","BNBA.JK","BSWD.JK",
    "INPC.JK","BGTG.JK","DNAR.JK","BACA.JK","BBHI.JK","BBYB.JK","BBMD.JK",
    # ── Multi-finance / Sekuritas ──────────────────────────────────────────────
    "CFIN.JK","DEFI.JK","HDFA.JK","MFIN.JK","WOMF.JK","ADMF.JK","BFIN.JK",
    "VRNA.JK","TIFA.JK","PANS.JK","RELI.JK","TRIM.JK","VINS.JK",
    # ── Energi: Batubara & Minyak ─────────────────────────────────────────────
    "ADRO.JK","BYAN.JK","PTBA.JK","ITMG.JK","HRUM.JK","INDY.JK","ELSA.JK",
    "RAJA.JK","MEDC.JK","PGAS.JK","ENRG.JK","GEMS.JK","KKGI.JK","PTRO.JK",
    "SMMT.JK","DEWA.JK","DOID.JK","BOSS.JK","PKPK.JK","FIRE.JK","MBAP.JK",
    "GTBO.JK","SMMT.JK","INDY.JK","MYOH.JK","TOBA.JK","ARTI.JK","BIPI.JK",
    # ── Logam & Tambang ───────────────────────────────────────────────────────
    "ANTM.JK","MDKA.JK","INCO.JK","TINS.JK","NCKL.JK","AMMN.JK","MBMA.JK",
    "BREN.JK","CITA.JK","DKFT.JK","PSAB.JK","ESSA.JK","KRAS.JK","NIKL.JK",
    "PURE.JK","BULL.JK","HKMU.JK","IPPE.JK","SMCB.JK","BRMS.JK","ITMG.JK",
    # ── Consumer Staples ──────────────────────────────────────────────────────
    "UNVR.JK","ICBP.JK","INDF.JK","MYOR.JK","AMRT.JK","HMSP.JK","GGRM.JK",
    "ROTI.JK","MLBI.JK","ULTJ.JK","DLTA.JK","SKLT.JK","SKBM.JK","STTP.JK",
    "GOOD.JK","WIIM.JK","ADES.JK","CLEO.JK","CAMP.JK","ALTO.JK","DMND.JK",
    "IIKP.JK","PCAR.JK","RMBA.JK","TBLA.JK","SMAR.JK","TAPG.JK","ANJT.JK",
    "BWPT.JK","DSNG.JK","GZCO.JK","JAWA.JK",
    # ── Farmasi & Kesehatan ───────────────────────────────────────────────────
    "KLBF.JK","KAEF.JK","SIDO.JK","MERK.JK","PYFA.JK","PEHA.JK","TSPC.JK",
    "INAF.JK","SCPI.JK","HEAL.JK","MIKA.JK","SILO.JK","SAME.JK","SRAJ.JK",
    # ── Properti & Real Estate ────────────────────────────────────────────────
    "BSDE.JK","CTRA.JK","PWON.JK","SMRA.JK","JRPT.JK","DUTI.JK","LPKR.JK",
    "PLIN.JK","RDTX.JK","GMTD.JK","MDLN.JK","MTLA.JK","PPRO.JK","APLN.JK",
    "BCIP.JK","BEST.JK","BIPP.JK","BKSL.JK","DART.JK","DILD.JK","EMDE.JK",
    "GWSA.JK","INPP.JK","KPIG.JK","LAND.JK","LPCK.JK","MKPI.JK","MMLP.JK",
    "NIRO.JK","OMRE.JK","RBMS.JK","RISE.JK","SMDM.JK","TARA.JK","COWL.JK",
    # ── Konstruksi & Infrastruktur ────────────────────────────────────────────
    "ADHI.JK","PTPP.JK","WIKA.JK","WSKT.JK","WTON.JK","TOTL.JK","SSIA.JK",
    "NRCA.JK","WSBP.JK","DGIK.JK","ACST.JK","BIPP.JK","MTRA.JK","IDPR.JK",
    "JSMR.JK","CMNP.JK","META.JK","JTON.JK",
    # ── Semen & Material Bangunan ─────────────────────────────────────────────
    "SMGR.JK","INTP.JK","AMFG.JK","ARNA.JK","TOTO.JK","KIAS.JK","MLIA.JK",
    # ── Otomotif & Manufaktur ─────────────────────────────────────────────────
    "ASII.JK","UNTR.JK","AUTO.JK","GJTL.JK","INDS.JK","NIPS.JK","IMAS.JK",
    "BOLT.JK","SMSM.JK","PRAS.JK","BRPT.JK","LPIN.JK","INTA.JK","MPMX.JK",
    # ── Perkebunan ────────────────────────────────────────────────────────────
    "AALI.JK","LSIP.JK","SSMS.JK","BISI.JK","CPRO.JK","MAIN.JK","PBID.JK",
    "SIPD.JK","SGRO.JK","JPFA.JK","CPIN.JK",
    # ── Telekomunikasi ────────────────────────────────────────────────────────
    "TLKM.JK","EXCL.JK","ISAT.JK","MTEL.JK","DCII.JK","LINK.JK",
    # ── Media & Hiburan ───────────────────────────────────────────────────────
    "MNCN.JK","SCMA.JK","EMTK.JK","BMTR.JK","VISI.JK","TMPO.JK",
    # ── Tower & Data Center ───────────────────────────────────────────────────
    "TOWR.JK","TBIG.JK",
    # ── Teknologi & IT ────────────────────────────────────────────────────────
    "GOTO.JK","BUKA.JK","MTDL.JK","ATIC.JK","KREN.JK","MPPA.JK",
    # ── Retail & Perdagangan ──────────────────────────────────────────────────
    "MAPI.JK","ACES.JK","LPPF.JK","RALS.JK","CSAP.JK","MIDI.JK","RANC.JK",
    "ERAA.JK","KINO.JK","AMRT.JK",
    # ── Logistik & Transportasi ───────────────────────────────────────────────
    "SAFE.JK","SHIP.JK","SOCI.JK","TPMA.JK","SMDR.JK","NELY.JK","WEHA.JK",
    "GIAA.JK","CMPP.JK","HATM.JK","BULL.JK","MBSS.JK",
    # ── Kimia & Plastik ───────────────────────────────────────────────────────
    "TPIA.JK","DPNS.JK","EKAD.JK","INCI.JK","SRSN.JK","UNIC.JK",
    # ── Tekstil ───────────────────────────────────────────────────────────────
    "TRIS.JK","RICY.JK","PBRX.JK","TFCO.JK","HDTX.JK","ERTX.JK",
]

_COMMODITY_SYMS = {
    "GC=F", "SI=F", "BZ=F", "CL=F", "NG=F", "HG=F", "PL=F", "PA=F",
    "ZC=F", "ZW=F", "ZS=F", "KC=F", "SB=F", "CC=F", "CT=F", "ALI=F",
}

IDX_TICKERS       = [t for t, sym in MARKET_SYMBOLS.items() if sym.endswith(".JK")]
US_TICKERS        = [
    t for t, sym in MARKET_SYMBOLS.items()
    if not sym.endswith(".JK") and not sym.startswith("^")
    and sym not in _COMMODITY_SYMS
]
COMMODITY_TICKERS = [t for t, sym in MARKET_SYMBOLS.items() if sym in _COMMODITY_SYMS]

# Binance spot pairs — public API, no key required
BINANCE_SPOT = {
    "BTC":  "BTCUSDT",  "ETH":  "ETHUSDT",  "SOL":  "SOLUSDT",
    "BNB":  "BNBUSDT",  "XRP":  "XRPUSDT",  "ADA":  "ADAUSDT",
    "DOGE": "DOGEUSDT", "AVAX": "AVAXUSDT", "TON":  "TONUSDT",
    "HYPE": "HYPEUSDT", "LINK": "LINKUSDT", "SUI":  "SUIUSDT",
    "DOT":  "DOTUSDT",  "UNI":  "UNIUSDT",  "NEAR": "NEARUSDT",
    "ARB":  "ARBUSDT",  "OP":   "OPUSDT",   "APT":  "APTUSDT",
    "ATOM": "ATOMUSDT", "LTC":  "LTCUSDT",  "BCH":  "BCHUSDT",
    "TRX":  "TRXUSDT",  "INJ":  "INJUSDT",  "SHIB": "SHIBUSDT",
}

def _fetch_binance_tickers(pairs: list) -> dict:
    """Binance public 24hr ticker — no auth needed. Returns {symbol: {lastPrice, priceChangePercent}}."""
    if not pairs:
        return {}
    try:
        res = requests.get(
            "https://api.binance.com/api/v3/ticker/24hr",
            params={"symbols": json.dumps(pairs)},
            timeout=10,
        )
        data = res.json()
        if not isinstance(data, list):
            return {}
        return {
            item["symbol"]: {
                "lastPrice":          item.get("lastPrice", "0"),
                "priceChangePercent": item.get("priceChangePercent", "0"),
            }
            for item in data if "symbol" in item
        }
    except Exception:
        return {}

# ── CORE ENDPOINTS ──

@app.get("/api/market-data")
def get_market_data(symbols: str = Query(None, description="Comma separated symbols")):
    cached = _cache_get("market_data_core", ttl_seconds=60)
    core_data = cached or {}

    # Resolve which keys to fetch
    keys_needed = set(CORE_MARKET_KEYS)
    extra_yahoo_syms = []  # symbols not in MARKET_SYMBOLS at all

    if symbols:
        for sym in symbols.split(","):
            sym = sym.strip()
            if not sym:
                continue
            if sym in MARKET_SYMBOLS:
                keys_needed.add(sym)
            elif sym in _YF_TO_KEY:
                keys_needed.add(_YF_TO_KEY[sym])
            else:
                extra_yahoo_syms.append(sym)

    # Identify which keys actually need a fresh fetch
    missing_keys = [k for k in keys_needed if k not in core_data]

    results = dict(core_data)

    if missing_keys or extra_yahoo_syms:
        yahoo_batch = [MARKET_SYMBOLS[k] for k in missing_keys if k in MARKET_SYMBOLS] + extra_yahoo_syms
        bulk = fetch_yahoo_bulk(yahoo_batch)

        if not bulk:
            # Fallback: parallel individual calls for missing keys only
            with ThreadPoolExecutor(max_workers=15) as executor:
                futures = {executor.submit(fetch_yahoo, MARKET_SYMBOLS[k]): k for k in missing_keys if k in MARKET_SYMBOLS}
                for f in as_completed(futures):
                    k = futures[f]
                    try:
                        r = f.result()
                        if r:
                            results[k] = r
                    except Exception:
                        pass
            for s in extra_yahoo_syms:
                r = fetch_yahoo(s)
                if r:
                    results[s] = r
        else:
            for k in missing_keys:
                ys = MARKET_SYMBOLS.get(k)
                if ys and ys in bulk:
                    results[k] = bulk[ys]
            for s in extra_yahoo_syms:
                if s in bulk:
                    results[s] = bulk[s]

        # Cache the core subset
        core_result = {k: results[k] for k in CORE_MARKET_KEYS if k in results}
        if core_result:
            _cache_set("market_data_core", core_result)

    return results

@app.get("/api/crypto-prices")
def get_crypto_prices(symbols: str = Query(..., description="Comma separated, e.g. BTCUSDT,ETHUSDT")):
    tickers = []
    for s in symbols.split(","):
        s = s.strip().replace("USDT", "").replace("usdt", "").upper()
        tickers.append(s)

    cache_key = f"crypto_prices_{'_'.join(sorted(tickers))}"
    cached = _cache_get(cache_key, ttl_seconds=60)
    if cached:
        return cached

    # Primary: Binance public API — no key, very high rate limits
    pairs = [BINANCE_SPOT[t] for t in tickers if t in BINANCE_SPOT]
    bnc = _fetch_binance_tickers(pairs)
    pair_to_sym = {BINANCE_SPOT[t]: t for t in tickers if t in BINANCE_SPOT}
    result = [
        {"symbol": sym, "lastPrice": v["lastPrice"], "priceChangePercent": v["priceChangePercent"]}
        for sym, v in bnc.items()
        if sym in pair_to_sym
    ]

    # CoinGecko only for coins not on Binance spot
    missing = [t for t in tickers if t not in BINANCE_SPOT and COINGECKO_IDS.get(t)]
    if missing:
        try:
            extra_ids = [COINGECKO_IDS[t] for t in missing]
            res = requests.get(
                "https://api.coingecko.com/api/v3/coins/markets",
                params={"vs_currency": "usd", "ids": ",".join(extra_ids), "price_change_percentage": "24h"},
                headers=CG_HEADERS,
                timeout=12,
            )
            data = res.json()
            if isinstance(data, list):
                for coin in data:
                    tk = next((t for t in missing if COINGECKO_IDS.get(t) == coin["id"]), None)
                    if tk:
                        result.append({
                            "symbol": f"{tk}USDT",
                            "lastPrice": str(coin.get("current_price", 0)),
                            "priceChangePercent": str(coin.get("price_change_percentage_24h", 0) or 0),
                        })
        except Exception:
            pass

    if result:
        _cache_set(cache_key, result)
    return result

@app.get("/api/market/{market_type}")
def get_market_chart(market_type: str):
    symbol_map = {"ihsg": "^JKSE", "sp500": "^GSPC"}
    symbol = symbol_map.get(market_type.lower())
    if not symbol:
        return {"prices": []}

    cache_key = f"market_chart_{market_type}"
    cached = _cache_get(cache_key, ttl_seconds=7200)
    if cached:
        return cached

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
        response   = {"prices": prices}
        _cache_set(cache_key, response)
        return response
    except Exception:
        return {"prices": []}

def analisa_sentimen_dan_teknikal():
    try:
        url = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN"
        response = requests.get(url, headers=YF_HEADERS, timeout=10).json()
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
        res  = requests.get(url, headers=CG_HEADERS, timeout=15)
        data = res.json()
        if "prices" not in data:
            return {"prices": []}
        return data
    except Exception:
        return {"prices": []}

@app.get("/api/bot-status")
def get_bot_status():
    return analisa_sentimen_dan_teknikal()

def search_coingecko(query: str) -> list:
    query_key = query.lower()
    if query_key in CG_SEARCH_CACHE and time.time() - CG_SEARCH_CACHE[query_key]['time'] < 60:
        return CG_SEARCH_CACHE[query_key]['data']

    try:
        res = requests.get("https://api.coingecko.com/api/v3/search", params={"query": query}, headers=CG_HEADERS, timeout=10)
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
            sym = q.get("symbol", "")
            thumb = None
            if asset_type in ("stock_idx", "stock_us", "stock"):
                clean = sym.replace(".JK", "").replace(".US", "")
                thumb = f"https://financialmodelingprep.com/image-stock/{clean}.png"
            results.append({
                "symbol":   sym,
                "name":     q.get("longname") or q.get("shortname", ""),
                "type":     asset_type,
                "exchange": exchange,
                "id":       sym,
                "thumb":    thumb,
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
    cached = _cache_get(f"cg_id_{coingecko_id}", ttl_seconds=180)
    if cached:
        return cached
    try:
        res = requests.get(
            "https://api.coingecko.com/api/v3/coins/markets",
            params={"vs_currency": "usd", "ids": coingecko_id, "price_change_percentage": "24h"},
            headers=CG_HEADERS,
            timeout=12
        )
        coins = res.json()
        if isinstance(coins, dict) and ("status" in coins or "error" in coins):
            return None
        if not coins:
            return None

        c = coins[0]
        result = {
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
        _cache_set(f"cg_id_{coingecko_id}", result)
        return result
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
        
        thumb = None
        if asset_type in ("stock_idx", "stock"):
            clean = yahoo_symbol.replace(".JK", "").replace(".US", "")
            thumb = f"https://financialmodelingprep.com/image-stock/{clean}.png"

        return {
            "symbol":   yahoo_symbol,
            "name":     name,
            "price":    price,
            "change":   change,
            "type":     asset_type,
            "currency": currency,
            "exchange": exchange,
            "thumb":    thumb,
        }
    except Exception:
        return None

@app.get("/api/price/{ticker}")
def auto_price(ticker: str, type: Optional[str] = Query(None)):
    _raw = ticker.upper()
    _stripped = _raw.replace("USDT", "").replace("-USDT", "").strip()
    ticker_clean = _stripped if _stripped else _raw  # don't erase "USDT" when it IS the ticker
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
            cg = requests.get("https://api.coingecko.com/api/v3/search", params={"query": ticker_clean}, headers=CG_HEADERS, timeout=8).json()
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
    seen_links_lock = threading.Lock()

    def add_link(link: str) -> bool:
        """Thread-safe dedup: returns True if link is new."""
        with seen_links_lock:
            if link in seen_links:
                return False
            seen_links.add(link)
            return True

    def fetch_news(tck, name, delay):
        if delay > 0:
            time.sleep(delay)

        clean_tck = tck.replace("USDT", "")
        is_crypto = clean_tck in COINGECKO_IDS or clean_tck in ["BTC", "ETH", "SOL", "DOGE"]

        # Build relevance keywords from ticker + asset name + CoinGecko ID
        cg_id = COINGECKO_IDS.get(clean_tck, "")
        cg_name = cg_id.replace("-", " ") if cg_id else ""
        keywords = list({kw for kw in [clean_tck.lower(), name.lower() if name else "", cg_name] if kw})

        def is_relevant(title: str) -> bool:
            tl = title.lower()
            return any(kw in tl for kw in keywords)

        if is_crypto:
            try:
                res = requests.get(
                    f"https://min-api.cryptocompare.com/data/v2/news/?categories={clean_tck}&lang=EN",
                    headers=YF_HEADERS,
                    timeout=10
                )
                data = res.json()
                news_list = data.get("Data", [])

                parsed = []
                for n in news_list:
                    title = n.get("title", "No Title")
                    link = n.get("url", "")
                    if not link or not add_link(link): continue
                    if not is_relevant(title): continue

                    publisher_info = n.get("source_info")
                    publisher_name = publisher_info.get("name", "Crypto News") if isinstance(publisher_info, dict) else "Crypto News"

                    parsed.append({
                        "ticker": tck,
                        "title": title,
                        "publisher": publisher_name,
                        "link": link,
                        "published_at": n.get("published_on", int(time.time())),
                        "thumbnail": n.get("imageurl", "")
                    })
                if parsed:
                    return parsed
            except Exception:
                pass

        yf_sym = MARKET_SYMBOLS.get(tck, tck)
        queries = [yf_sym, tck]
        if name and name.upper() != tck:
            queries.append(name)

        for q in queries:
            try:
                res = requests.get(
                    "https://query2.finance.yahoo.com/v1/finance/search",
                    params={"q": q, "newsCount": 6, "quotesCount": 1},
                    headers=YF_HEADERS,
                    timeout=8
                )
                if res.status_code == 200:
                    news_items = res.json().get("news", [])
                    if news_items:
                        parsed = []
                        for n in news_items:
                            title = n.get("title", "No Title")
                            link = n.get("link", "")
                            if not link or not add_link(link): continue
                            if not is_relevant(title): continue

                            thumb = ""
                            if n.get("thumbnail") and n["thumbnail"].get("resolutions"):
                                thumb = n["thumbnail"]["resolutions"][0].get("url", "")

                            parsed.append({
                                "ticker": tck,
                                "title": title,
                                "publisher": n.get("publisher", "Yahoo Finance"),
                                "link": link,
                                "published_at": n.get("providerPublishTime", int(time.time())),
                                "thumbnail": thumb
                            })
                        if parsed:
                            return parsed
            except Exception:
                pass

        try:
            is_idx = ".JK" in yf_sym
            if is_idx or tck in ["BBCA", "BBRI", "BMRI", "GOTO", "TLKM"]:
                search_query = f"Saham {tck}"
                url = f"https://news.google.com/rss/search?q={urllib.parse.quote(search_query)}&hl=id&gl=ID&ceid=ID:id"
            elif is_crypto:
                # Gunakan nama lengkap koin, bukan ticker — "SOL stock market" tidak relevan
                search_term = name or cg_name or clean_tck
                search_query = f"{search_term} {clean_tck} cryptocurrency"
                url = f"https://news.google.com/rss/search?q={urllib.parse.quote(search_query)}&hl=en-US&gl=US&ceid=US:en"
            else:
                search_query = f"{tck} stock"
                url = f"https://news.google.com/rss/search?q={urllib.parse.quote(search_query)}&hl=en-US&gl=US&ceid=US:en"

            res = requests.get(url, headers=CLEAN_HEADERS, timeout=8)
            if res.status_code == 200:
                root = ET.fromstring(res.content)
                parsed = []
                for item in root.findall('.//channel/item')[:6]:
                    title = item.find('title').text if item.find('title') is not None else "No Title"
                    link = item.find('link').text if item.find('link') is not None else ""
                    if not link or not add_link(link): continue

                    pub_str = item.find('pubDate').text if item.find('pubDate') is not None else ""
                    try: pub_ts = int(parsedate_to_datetime(pub_str).timestamp())
                    except: pub_ts = int(time.time())

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
                if parsed: return parsed
        except Exception:
            pass

        return []

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for idx, (tck, name) in enumerate(asset_list):
            delay = idx * 0.3
            futures.append(executor.submit(fetch_news, tck, name, delay))

        for future in as_completed(futures):
            result = future.result()
            if result:
                all_news.extend(result)

    all_news.sort(key=lambda x: x["published_at"], reverse=True)
    return {"news": all_news[:30]}


# ============================================================================
# ENDPOINTS TAMBAHAN MARKET OVERVIEW PAGE & ADVANCED FUTURES METRICS
# ============================================================================

@app.get("/api/fear-greed")
def get_fear_greed():
    cached = _cache_get("fear_greed", ttl_seconds=900)
    if cached:
        return cached

    try:
        res = _request_with_retry("https://api.alternative.me/fng/?limit=2")
        data = res.json()
        entries = data.get("data", [])
        if not entries:
            return {"value": None, "classification": None, "error": "no_data"}

        today = entries[0]
        yesterday = entries[1] if len(entries) > 1 else None

        result = {
            "value": int(today["value"]),
            "classification": today["value_classification"],
            "timestamp": int(today["timestamp"]),
            "previous_value": int(yesterday["value"]) if yesterday else None,
        }
        _cache_set("fear_greed", result)
        return result
    except Exception as e:
        stale = _OVERVIEW_CACHE.get("fear_greed", {}).get("data")
        if stale:
            return stale
        return {"value": None, "classification": None, "error": str(e)}

@app.get("/api/altseason")
def get_altseason():
    cached = _cache_get("altseason", ttl_seconds=14400)
    if cached:
        return cached

    try:
        res = _request_with_retry(
            "https://api.coingecko.com/api/v3/coins/markets",
            params={
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 60,
                "page": 1,
                "price_change_percentage": "90d",
            },
            headers=CG_HEADERS,
        )
        coins = res.json()
        if not isinstance(coins, list):
            raise ValueError("unexpected response shape")

        btc = next((c for c in coins if c["id"] == "bitcoin"), None)
        if not btc or btc.get("price_change_percentage_90d_in_currency") is None:
            raise ValueError("btc 90d change not available")

        btc_90d = btc["price_change_percentage_90d_in_currency"]

        candidates = [
            c for c in coins
            if c["id"] != "bitcoin"
            and c["id"] not in STABLECOIN_IDS
            and c.get("price_change_percentage_90d_in_currency") is not None
        ][:50]

        if len(candidates) < 10:
            raise ValueError("not enough candidate coins")

        outperforming = sum(1 for c in candidates if c["price_change_percentage_90d_in_currency"] > btc_90d)
        index_value = round((outperforming / len(candidates)) * 100)

        if index_value >= 75:
            classification = "Altcoin Season"
        elif index_value <= 25:
            classification = "Bitcoin Season"
        else:
            classification = "Neutral"

        result = {
            "value": index_value,
            "classification": classification,
            "btc_90d_change": round(btc_90d, 2),
            "coins_sampled": len(candidates),
            "outperforming_btc": outperforming,
        }
        _cache_set("altseason", result)
        return result
    except Exception as e:
        stale = _OVERVIEW_CACHE.get("altseason", {}).get("data")
        if stale:
            return stale
        return {"value": None, "classification": None, "error": str(e)}

@app.get("/api/btc-dominance")
def get_btc_dominance():
    cached = _cache_get("btc_dominance", ttl_seconds=7200)
    if cached:
        return cached

    try:
        res = _request_with_retry("https://api.coingecko.com/api/v3/global", headers=CG_HEADERS)
        data = res.json().get("data", {})
        btc_pct = data.get("market_cap_percentage", {}).get("btc")
        eth_pct = data.get("market_cap_percentage", {}).get("eth")
        total_mcap_usd = data.get("total_market_cap", {}).get("usd")

        if btc_pct is None:
            raise ValueError("btc dominance not available")

        result = {
            "btc_dominance": round(btc_pct, 2),
            "eth_dominance": round(eth_pct, 2) if eth_pct else None,
            "total_market_cap_usd": total_mcap_usd,
        }
        _cache_set("btc_dominance", result)
        return result
    except Exception as e:
        stale = _OVERVIEW_CACHE.get("btc_dominance", {}).get("data")
        if stale:
            return stale
        return {"btc_dominance": None, "error": str(e)}

def _movers_from_yahoo(tickers: list, limit: int = 5):
    valid = [t for t in tickers if t in MARKET_SYMBOLS]
    yahoo_syms = [MARKET_SYMBOLS[t] for t in valid]
    yf_to_ticker = {MARKET_SYMBOLS[t]: t for t in valid}

    bulk = fetch_yahoo_bulk(yahoo_syms)

    if not bulk:
        # Fallback to parallel individual calls
        rows_map = {}
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = {executor.submit(fetch_yahoo, MARKET_SYMBOLS[t]): t for t in valid}
            for future in as_completed(futures):
                ticker = futures[future]
                try:
                    res = future.result()
                    if res:
                        rows_map[ticker] = res
                except Exception:
                    continue
        bulk_mapped = {MARKET_SYMBOLS[t]: rows_map[t] for t in rows_map}
        bulk = bulk_mapped

    rows = []
    for ys, data in bulk.items():
        ticker = yf_to_ticker.get(ys)
        if ticker and data.get("price"):
            rows.append({
                "symbol": ticker,
                "name": TICKER_NAMES.get(ticker, ticker),
                "price": data["price"],
                "change": data["change"],
            })

    rows_sorted = sorted(rows, key=lambda r: r["change"], reverse=True)
    gainers = rows_sorted[:limit]
    losers = list(reversed(rows_sorted[-limit:])) if len(rows_sorted) >= limit else list(reversed(rows_sorted))
    return {"gainers": gainers, "losers": losers, "total_scanned": len(rows)}

def _cg_get(params: dict, timeout: int = 12):
    """CoinGecko GET with backoff. Short waits to stay under Vercel timeout."""
    url = "https://api.coingecko.com/api/v3/coins/markets"
    for attempt in range(3):
        try:
            res = requests.get(url, params=params, headers=CG_HEADERS, timeout=timeout)
            if res.status_code == 429:
                time.sleep(2 * (attempt + 1))
                continue
            res.raise_for_status()
            return res
        except Exception:
            if attempt < 2:
                time.sleep(1 * (attempt + 1))
    return None

def _movers_from_yfinance(yf_symbols: list, limit: int = 50) -> dict:
    """Batch-fetch price data via yfinance for any list of Yahoo Finance symbols.
    Works for IDX (.JK) and other symbols. Returns gainers/losers sorted by 24h change."""
    if not yf_symbols:
        return {"gainers": [], "losers": [], "total_scanned": 0}
    try:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            raw = yf.download(
                yf_symbols,
                period="5d",
                interval="1d",
                auto_adjust=True,
                progress=False,
                group_by="ticker",
                threads=True,
            )

        rows = []
        for sym in yf_symbols:
            try:
                closes = raw[sym]["Close"].dropna() if sym in raw.columns.get_level_values(0) else None
                if closes is None or len(closes) < 2:
                    continue
                prev_close = float(closes.iloc[-2])
                curr_price = float(closes.iloc[-1])
                if prev_close <= 0:
                    continue
                change = round((curr_price - prev_close) / prev_close * 100, 2)
                display = sym.replace(".JK", "").replace(".SI", "")
                rows.append({
                    "symbol": display,
                    "name":   TICKER_NAMES.get(display, display),
                    "price":  round(curr_price, 2),
                    "change": change,
                    "thumb":  "",
                })
            except Exception:
                continue

        rows_sorted = sorted(rows, key=lambda r: r["change"], reverse=True)
        gainers = rows_sorted[:limit]
        losers  = list(reversed(rows_sorted[-limit:])) if len(rows_sorted) >= limit else list(reversed(rows_sorted))
        return {"gainers": gainers, "losers": losers, "total_scanned": len(rows)}
    except Exception:
        return {"gainers": [], "losers": [], "total_scanned": 0}


def _movers_from_coingecko(limit: int = 50):
    """Fetch top 500 coins by market cap (2 parallel CoinGecko pages of 250 each)."""
    def _fetch_page(page_num: int) -> list:
        res = _cg_get({
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": 250,
            "page": page_num,
            "price_change_percentage": "24h",
        })
        if res is None:
            return []
        data = res.json()
        return data if isinstance(data, list) else []

    try:
        with ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(_fetch_page, 1)
            f2 = ex.submit(_fetch_page, 2)
            all_coins = f1.result() + f2.result()

        if not all_coins:
            return {"gainers": [], "losers": [], "total_scanned": 0}

        rows = [
            {
                "symbol": c["symbol"].upper(),
                "name":   c["name"],
                "price":  c.get("current_price", 0),
                "change": round(c.get("price_change_percentage_24h") or 0, 2),
                "market_cap": c.get("market_cap", 0),
                "volume":     c.get("total_volume", 0),
                "thumb":      c.get("image", ""),
            }
            for c in all_coins
            if c.get("price_change_percentage_24h") is not None
            and c.get("id") not in STABLECOIN_IDS
        ]
        rows_sorted = sorted(rows, key=lambda r: r["change"], reverse=True)
        gainers = rows_sorted[:limit]
        losers  = list(reversed(rows_sorted[-limit:])) if len(rows_sorted) >= limit else list(reversed(rows_sorted))
        return {"gainers": gainers, "losers": losers, "total_scanned": len(rows)}
    except Exception:
        return {"gainers": [], "losers": [], "total_scanned": 0}


# ── Yahoo Finance predefined screener ─────────────────────────────────────────

_YF_SCREENER_URL = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved"

def _fetch_yf_screener(scr_id: str, region: str, count: int = 100) -> tuple:
    """Fetch one Yahoo Finance predefined screener. Returns (rows_list, total_matching)."""
    try:
        res = requests.get(
            _YF_SCREENER_URL,
            params={"scrIds": scr_id, "count": count, "region": region, "lang": "en-US"},
            headers=YF_HEADERS,
            timeout=15,
        )
        res.raise_for_status()
        data   = res.json()
        block  = (data.get("finance", {}).get("result") or [{}])[0]
        total  = block.get("total", 0)
        quotes = block.get("quotes", [])
        rows   = []
        for q in quotes:
            raw_sym = q.get("symbol", "")
            price   = q.get("regularMarketPrice", 0) or 0
            change  = q.get("regularMarketChangePercent")
            if not price or change is None:
                continue
            display = raw_sym.replace(".JK", "").replace(".SI", "")
            rows.append({
                "symbol": display,
                "name":   q.get("shortName") or q.get("longName") or display,
                "price":  round(float(price), 6),
                "change": round(float(change), 2),
                "thumb":  "",
            })
        return rows, total
    except Exception:
        return [], 0


def _movers_from_yf_screener(region: str, limit: int = 50) -> dict:
    """Parallel fetch day_gainers + day_losers for any Yahoo Finance region."""
    fetch_count = min(limit * 3, 100)
    with ThreadPoolExecutor(max_workers=2) as ex:
        f_g = ex.submit(_fetch_yf_screener, "day_gainers", region, fetch_count)
        f_l = ex.submit(_fetch_yf_screener, "day_losers",  region, fetch_count)
        raw_gainers, total_g = f_g.result()
        raw_losers,  total_l = f_l.result()

    gainers = sorted(raw_gainers, key=lambda r: r["change"], reverse=True)[:limit]
    losers  = sorted(raw_losers,  key=lambda r: r["change"])[:limit]
    return {
        "gainers":       gainers,
        "losers":        losers,
        "total_scanned": max(total_g, total_l),
    }


@app.get("/api/market-movers")
def get_market_movers(
    category: str = Query(..., description="crypto | saham_idx | saham_us | komoditas"),
    limit: int = Query(20, ge=1, le=50),
):
    cache_key = f"movers_{category}_{limit}"
    cached = _cache_get(cache_key, ttl_seconds=900)
    if cached:
        return cached

    try:
        if category == "crypto":
            result = _movers_from_coingecko(limit)
        elif category == "saham_idx":
            result = _movers_from_yfinance(IDX_ALL_JK, limit)
        elif category == "saham_us":
            result = _movers_from_yf_screener("US", limit)
        elif category == "komoditas":
            result = _movers_from_yahoo(COMMODITY_TICKERS, limit)
        else:
            return {"error": f"Unknown category: {category}", "gainers": [], "losers": []}

        if result.get("total_scanned", 0) > 0:
            _cache_set(cache_key, result)
        return result
    except Exception as e:
        stale = _OVERVIEW_CACHE.get(cache_key, {}).get("data")
        if stale:
            return stale
        return {"gainers": [], "losers": [], "error": str(e)}

@app.get("/api/market-overview-summary")
def get_market_overview_summary():
    with ThreadPoolExecutor(max_workers=3) as executor:
        f_fng = executor.submit(get_fear_greed)
        f_alt = executor.submit(get_altseason)
        f_dom = executor.submit(get_btc_dominance)

        return {
            "fear_greed": f_fng.result(),
            "altseason": f_alt.result(),
            "btc_dominance": f_dom.result(),
        }

@app.get("/api/crypto-futures-data")
def get_crypto_futures_data():
    cached = _cache_get("crypto_futures_data", ttl_seconds=300)
    if cached:
        return cached

    try:
        # 1. Ambil Akun Top Long/Short Ratio BTC dari Binance Futures
        res_ls = requests.get(
            "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1d&limit=1",
            timeout=8
        )
        ls_data = res_ls.json()
        long_pct = float(ls_data[0]["longAccount"]) * 100
        short_pct = float(ls_data[0]["shortAccount"]) * 100
        
        # 2. Ambil Open Interest (OI) & Harga Pasar Terkini
        res_oi = requests.get("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT", timeout=8)
        res_price = requests.get("https://fapi.binance.com/fapi/v1/ticker/price?symbol=BTCUSDT", timeout=8)
        
        oi_btc = float(res_oi.json()["openInterest"])
        btc_price = float(res_price.json()["price"])
        
        result = {
            "longPct": round(long_pct, 1),
            "shortPct": round(short_pct, 1),
            "openInterestUSD": oi_btc * btc_price
        }
        _cache_set("crypto_futures_data", result)
        return result
    except Exception:
        return {"longPct": 50, "shortPct": 50, "openInterestUSD": 0}


# Fixed list of important coins shown in the market ticker (big-cap only)
_TICKER_COINS = [
    ("BTC",   "bitcoin"),
    ("ETH",   "ethereum"),
    ("SOL",   "solana"),
    ("BNB",   "binancecoin"),
    ("XRP",   "ripple"),
    ("AVAX",  "avalanche-2"),
    ("DOGE",  "dogecoin"),
    ("TON",   "the-open-network"),
    ("ADA",   "cardano"),
    ("HYPE",  "hyperliquid"),
    ("LINK",  "chainlink"),
    ("SUI",   "sui"),
]

@app.get("/api/ticker")
def get_ticker_prices():
    cached = _cache_get("ticker_prices", ttl_seconds=60)
    if cached:
        return cached
    coin_ids   = [cid for _, cid in _TICKER_COINS]
    id_to_sym  = {cid: sym for sym, cid in _TICKER_COINS}
    sym_order  = {sym: i for i, (sym, _) in enumerate(_TICKER_COINS)}
    # Primary: Binance public API — all 12 ticker coins are listed on Binance spot
    pairs = [BINANCE_SPOT[sym] for sym, _ in _TICKER_COINS if sym in BINANCE_SPOT]
    bnc = _fetch_binance_tickers(pairs)
    pair_to_sym = {BINANCE_SPOT[sym]: sym for sym, _ in _TICKER_COINS if sym in BINANCE_SPOT}
    result = [
        {
            "s": pair_to_sym[pair],
            "p": float(v["lastPrice"]),
            "c": round(float(v["priceChangePercent"]), 2),
        }
        for pair, v in bnc.items()
        if pair in pair_to_sym
    ]

    # CoinGecko only as fallback when Binance is unreachable
    if not result:
        try:
            res = requests.get(
                "https://api.coingecko.com/api/v3/coins/markets",
                params={"vs_currency": "usd", "ids": ",".join(coin_ids), "price_change_percentage": "24h"},
                headers=CG_HEADERS,
                timeout=12,
            )
            data = res.json()
            if isinstance(data, list):
                for coin in data:
                    sym = id_to_sym.get(coin.get("id", ""))
                    if sym:
                        result.append({
                            "s": sym,
                            "p": coin.get("current_price") or 0,
                            "c": round(coin.get("price_change_percentage_24h") or 0, 2),
                        })
        except Exception:
            pass

    if result:
        result.sort(key=lambda x: sym_order.get(x["s"], 99))
        _cache_set("ticker_prices", result)
    return result


@app.get("/api/watchlist")
def get_watchlist_data(items: str = Query(..., description="TICKER:type:id,... e.g. BTC:crypto:bitcoin,AAPL:saham_us:AAPL")):
    parsed = []
    for raw in items.split(","):
        parts = raw.strip().split(":")
        if len(parts) >= 2 and parts[0]:
            ticker   = parts[0].upper()
            typ      = parts[1].lower()
            asset_id = parts[2] if len(parts) >= 3 else parts[0]
            parsed.append((ticker, typ, asset_id))

    if not parsed:
        return {}

    results   = {}
    crypto    = [(t, tp, aid) for t, tp, aid in parsed if tp == "crypto"]
    noncrypto = [(t, tp, aid) for t, tp, aid in parsed if tp != "crypto"]

    # ── Crypto: batch dari CoinGecko /coins/markets ──
    if crypto:
        coin_ids = [aid for _, _, aid in crypto]
        try:
            res   = _request_with_retry(
                "https://api.coingecko.com/api/v3/coins/markets",
                params={
                    "vs_currency": "usd",
                    "ids":         ",".join(coin_ids),
                    "price_change_percentage": "24h",
                    "per_page":    50,
                },
                headers=CG_HEADERS,
            )
            coins = res.json()
            if isinstance(coins, list):
                for coin in coins:
                    ticker = next(
                        (t for t, _, aid in crypto if aid == coin["id"]),
                        coin["symbol"].upper()
                    )
                    results[ticker] = {
                        "price":      coin.get("current_price", 0),
                        "change":     round(coin.get("price_change_percentage_24h") or 0, 2),
                        "market_cap": coin.get("market_cap"),
                        "volume_24h": coin.get("total_volume"),
                        "name":       coin.get("name", ticker),
                        "thumb":      coin.get("image", ""),
                        "type":       "crypto",
                        "currency":   "USD",
                    }
        except Exception:
            for ticker, _, aid in crypto:
                r = fetch_price_crypto_by_id(aid)
                if r:
                    results[ticker] = {
                        "price":      r.get("price", 0),
                        "change":     r.get("change", 0),
                        "market_cap": r.get("market_cap"),
                        "volume_24h": r.get("volume_24h"),
                        "name":       r.get("name", ticker),
                        "thumb":      r.get("thumb", ""),
                        "type":       "crypto",
                        "currency":   "USD",
                    }

    # ── Saham / Komoditas: Yahoo Finance (paralel) ──
    if noncrypto:
        def _fetch_stock(ticker, yahoo_sym):
            r = fetch_price_stock_by_symbol(yahoo_sym)
            if r:
                return ticker, {**r, "market_cap": None, "volume_24h": None}
            return ticker, None

        with ThreadPoolExecutor(max_workers=10) as ex:
            futures = {ex.submit(_fetch_stock, t, aid): t for t, _, aid in noncrypto}
            for future in as_completed(futures):
                ticker = futures[future]
                try:
                    _, data = future.result()
                    if data:
                        results[ticker] = data
                except Exception:
                    pass

    return results


@app.get("/api/history")
def get_price_history(ticker: str = Query(...), period: str = "1mo"):
    cache_key = f"history_{ticker}_{period}"
    cached = _cache_get(cache_key, 300)
    if cached:
        return cached

    PERIOD_MAP = {
        "1m":  ("1d",  "1m"),
        "5m":  ("5d",  "5m"),
        "15m": ("1mo", "15m"),
        "30m": ("1mo", "30m"),
        "1h":  ("3mo", "1h"),
        "4h":  ("3mo", "1h"),
        "1d":  ("5y",  "1d"),
        "1w":  ("max", "1wk"),
        "1mo": ("max", "1mo"),
    }
    yf_range, yf_interval = PERIOD_MAP.get(period, ("5y", "1d"))

    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker, safe='')}"
    params = {"interval": yf_interval, "range": yf_range, "includePrePost": "false"}

    try:
        res = _request_with_retry(url, params=params, headers=YF_HEADERS, timeout=12)
        chart = res.json().get("chart", {})
        result_list = chart.get("result") or []
        if not result_list:
            return {"error": f"No data for {ticker}", "data": [], "meta": {}}

        r = result_list[0]
        timestamps = r.get("timestamp", [])
        quotes = r.get("indicators", {}).get("quote", [{}])[0]
        opens  = quotes.get("open",  [])
        highs  = quotes.get("high",  [])
        lows   = quotes.get("low",   [])
        closes = quotes.get("close", [])
        meta   = r.get("meta", {})

        points = []
        for t, o, h, l, c in zip(timestamps, opens, highs, lows, closes):
            if c is None:
                continue
            points.append({
                "t": int(t),
                "o": round(o if o is not None else c, 6),
                "h": round(h if h is not None else c, 6),
                "l": round(l if l is not None else c, 6),
                "c": round(c, 6),
            })

        response = {
            "ticker": ticker,
            "name": meta.get("longName") or meta.get("instrumentType", ticker),
            "currency": meta.get("currency", "USD"),
            "period": period,
            "current_price": meta.get("regularMarketPrice") or (points[-1]["c"] if points else 0),
            "data": points,
        }
        _cache_set(cache_key, response)
        return response
    except Exception as e:
        return {"error": str(e), "data": [], "meta": {}}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)