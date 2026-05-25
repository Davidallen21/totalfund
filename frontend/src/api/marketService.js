const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ✅ FIX 1: Pakai try/finally biar clearTimeout SELALU dipanggil,
//    bahkan kalau fetch error atau di-abort
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response;
  } finally {
    clearTimeout(id); // selalu jalan, apapun yang terjadi
  }
};

export const MarketService = {
  // 1. Ambil Harga Kripto (Auto Fallback ke CoinGecko kalau Binance error)
  async getCryptoPrice(ticker, coinName) {
    try {
      const res = await fetchWithTimeout(
        `https://api.binance.com/api/v3/ticker/price?symbol=${ticker.toUpperCase()}USDT`
      );
      const data = await res.json();
      return { price: parseFloat(data.price), source: 'binance', symbol: ticker.toLowerCase() };
    } catch (error) {
      console.warn(`Binance gagal untuk ${ticker}, fallback ke CoinGecko...`);
      try {
        const coinId = coinName.toLowerCase().replace(/\s/g, '-');
        const cgRes = await fetchWithTimeout(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
        );
        const cgData = await cgRes.json();
        if (!cgData[coinId]?.usd) throw new Error('Koin tidak ditemukan di CoinGecko');
        return { price: cgData[coinId].usd, source: 'coingecko', symbol: coinId };
      } catch (fallbackError) {
        // ✅ FIX 2: Sertakan pesan error asli biar gampang debug
        throw new Error(`Gagal mengambil harga ${ticker}: ${fallbackError.message}`);
      }
    }
  },

  // 2. Ambil Harga Saham / Komoditas dari API Backend
  async getStockPrice(ticker) {
    // ✅ FIX 2: Pisah try/catch biar error asli tidak hilang
    let data;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/market-data`);
      data = await res.json();
    } catch (error) {
      throw new Error(`Gagal terhubung ke API Backend: ${error.message}`);
    }

    const symbolUpper = ticker.toUpperCase();
    if (data[symbolUpper]?.price) {
      return { price: parseFloat(data[symbolUpper].price) };
    }
    throw new Error(`Ticker ${symbolUpper} tidak ada di database backend`);
  },

  // ✅ TAMBAHAN: Ambil data historis harga kripto untuk chart
  //    Dipanggil di App.js untuk fitur Net Worth Trend
  async getCryptoHistory(coinId = 'bitcoin', days = 7) {
    try {
      const res = await fetchWithTimeout(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
        {},
        10000 // timeout lebih lama (10 detik) karena data historis lebih besar
      );
      const data = await res.json();
      // Format: [[timestamp, price], ...] — langsung kompatibel sama MiniChart
      return data.prices;
    } catch (error) {
      throw new Error(`Gagal mengambil data historis ${coinId}: ${error.message}`);
    }
  },
};