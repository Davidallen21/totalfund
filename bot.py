import random
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Izinkan React (localhost:3000) untuk mengakses data dari Python ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Di produksi, ganti dengan URL spesifik
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def analisa_sentimen_dan_teknikal():
    """
    Simulasi logika kecerdasan buatan (AI Hybrid)
    Membaca berita live dari CryptoCompare & mencocokkannya dengan indikator
    """
    try:
        # 1. Ambil Berita Terbaru secara Live untuk Analisis Sentimen
        url = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN"
        response = requests.get(url).json()
        berita_list = response.get("Data", [])[:3] # Ambil 3 berita teratas
        
        # Kata kunci positif & negatif sederhana (NLP Dasar)
        kata_positif = ["bull", "surge", "high", "gain", "adopt", "success", "buy", "growth"]
        kata_negatif = ["bear", "drop", "low", "loss", "ban", "crash", "sell", "risk"]
        
        skor_sentimen = 0
        for b in berita_list:
            text = b.get("title", "").lower()
            for kata in kata_positif:
                if kata in text: skor_sentimen += 1
            for kata in kata_negatif:
                if kata in text: skor_sentimen -= 1
                
        # 2. Simulasi Indikator Teknikal (RSI & MACD)
        rsi_live = random.randint(25, 75) # Simulasi nilai RSI nyata
        
        # 3. Pengambilan Keputusan Akhir oleh AI (Hybrid Logic)
        if rsi_live < 35 or skor_sentimen >= 2:
            aksi = "BUY"
            alasan = f"AI Hybrid: RSI Oversold ({rsi_live}) & Sentimen Berita Positif (Skor: {skor_sentimen})"
        elif rsi_live > 65 or skor_sentimen <= -2:
            aksi = "SELL"
            alasan = f"AI Hybrid: RSI Overbought ({rsi_live}) & Sentimen Berita Negatif (Skor: {skor_sentimen})"
        else:
            aksi = "HOLD"
            alasan = f"AI Hybrid: Pasar Konsolidasi. RSI berada di level netral ({rsi_live})"
            
        return {
            "status": "AKTIF",
            "strategi": "Teknikal (RSI/MACD) + NLP Sentimen Berita",
            "modal": 5000.00,
            "profit_today": round(random.uniform(50, 150), 2),
            "total_trades": random.randint(8, 15),
            "current_decision": {
                "pair": "BTC/USDT",
                "action": aksi,
                "reason": alasan,
                "price": "$77,650"
            }
        }
    except Exception as e:
        # Jika koneksi gagal, berikan data aman
        return {
            "status": "OFFLINE MODE",
            "strategi": "Data simulasi gagal terhubung ke server berita",
            "modal": 5000.00,
            "profit_today": 0.00,
            "total_trades": 0,
            "current_decision": {
                "pair": "BTC/USDT",
                "action": "HOLD",
                "reason": "Sistem sedang memeriksa jaringan internet...",
                "price": "—"
            }
        }

@app.get("/api/bot-status")
def get_bot_status():
    return analisa_sentimen_dan_teknikal()

# Menjalankan server Python di port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)