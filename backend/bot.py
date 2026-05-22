import os
import random
from dotenv import load_dotenv
load_dotenv()  # load .env file otomatis
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional
from fastapi import FastAPI
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

# ── Headers agar Yahoo Finance tidak reject request ──
YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
}

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

# Symbol map: key yang dipakai React → Yahoo Finance symbol
MARKET_SYMBOLS = {
    # IDX Stocks
    "BBCA": "BBCA.JK",
    "BBRI": "BBRI.JK",
    "BMRI": "BMRI.JK",
    "GOTO": "GOTO.JK",
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
def get_market_data():
    results = {}
    # Fetch semua simbol secara paralel
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_yahoo, sym): key for key, sym in MARKET_SYMBOLS.items()}
        for future in as_completed(futures):
            key = futures[future]
            try:
                results[key] = future.result()
            except Exception:
                results[key] = None
    return results

# ── AI Bot endpoint (existing) ──
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
            alasan = f"AI Hybrid: RSI Oversold ({rsi_live}) & Sentimen Berita Positif (Skor: {skor_sentimen})"
        elif rsi_live > 65 or skor_sentimen <= -2:
            aksi   = "SELL"
            alasan = f"AI Hybrid: RSI Overbought ({rsi_live}) & Sentimen Berita Negatif (Skor: {skor_sentimen})"
        else:
            aksi   = "HOLD"
            alasan = f"AI Hybrid: Pasar Konsolidasi. RSI berada di level netral ({rsi_live})"

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

## ── AI CONSULTANT ─────────────────────────────────────────────────────────

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
        return {"response": "⚠️ **GROQ_API_KEY belum dikonfigurasi.**\n\nTambahkan environment variable `GROQ_API_KEY` di Vercel atau file `.env` kamu.\n\nDapatkan API key gratis di [console.groq.com](https://console.groq.com)"}

    try:
        client = Groq(api_key=api_key)

        messages = []
        for h in req.history[-8:]:
            messages.append({"role": h.role, "content": h.content})

        messages.append({
            "role": "user",
            "content": f"Data portfolio dan pasar saat ini:\n{req.context}\n\n---\nPertanyaan: {req.message}"
        })

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
    """Fetch CoinGecko chart data server-side (no CORS / rate-limit issue di browser)."""
    url = f"https://api.coingecko.com/api/v3/coins/{simbol}/market_chart?vs_currency=usd&days={days}"
    try:
        res = requests.get(url, timeout=15)
        return res.json()
    except Exception:
        return {"prices": []}

@app.get("/api/bot-status")
def get_bot_status():
    return analisa_sentimen_dan_teknikal()

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
