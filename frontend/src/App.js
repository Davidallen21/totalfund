import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './App.css';

import { useLocalStorage } from './hooks/useLocalstorage';
import useWindowSize from './hooks/useWindowSize';
import { DICTIONARY, getDefaultLang } from './utils/i18n';
import { API_BASE, fetchWithRetry, PERIODS } from './utils/api';

import Sidebar from './components/common/Sidebar';
import AppHeader from './components/common/AppHeader';
import AIConsultant from './components/common/AIConsultant';

import { NetWorthDetailPage } from './components/dashboard/networthtrend';

import Dashboard from './pages/Dashboard';
import MarketExplorer from './pages/MarketExplorer';
import MarketOverview from './pages/MarketOverview';
import TopMovers from './pages/TopMovers';
import MultiChart from './pages/MultiChart';
import News from './pages/News';

import AITrade from './pages/AITrade';
import Calculator from './pages/Calculator';
import AddAssetModal from './components/modals/AddAssetModal';
import ConfirmDeleteModal from './components/modals/ConfirmDeleteModal';
import AccountSettingsModal from './components/modals/AccountSettingsModal';
import AssetActionMenu from './components/modals/AssetActionMenu';
import EditAssetModal from './components/modals/EditAssetModal';

function App({ onLogout }) {
  const [lang, setLang] = useLocalStorage('totalfund_lang', getDefaultLang());

  const t = useCallback((key) => {
    let safeLang = 'en';
    if (typeof lang === 'string') {
      safeLang = lang.replace(/[^a-zA-Z]/g, '').toLowerCase();
    }
    const validLang = ['id', 'en', 'zh'].includes(safeLang) ? safeLang : 'en';
    return DICTIONARY[validLang]?.[key] || DICTIONARY['en']?.[key] || key;
  }, [lang]);

  const [activePage, setActivePage]       = useState('portfolio');
  const [assets, setAssets]               = useLocalStorage('totalfund_portfolio', []);
  const [hargaMap, setHargaMap]           = useState({});
  const [hargaSaham, setHargaSaham]       = useState({});
  const [kursIdr, setKursIdr]             = useState(16200);
  const [period, setPeriod]               = useState(PERIODS[0]);
  const [chartData, setChartData]         = useState(null);
  const [chartError, setChartError]       = useState(false);
  const [pnlChart, setPnlChart]           = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [editingAsset, setEditingAsset]   = useState(null);
  const [editForm, setEditForm]           = useState({ harga: '', jumlah: '' });
  const [cryptoLoaded, setCryptoLoaded]   = useState(false);
  const [marketLoaded, setMarketLoaded]   = useState(false);

  const [actionMenuAsset, setActionMenuAsset] = useState(null);
  const [actionMenuPos, setActionMenuPos]     = useState({ x: 0, y: 0 });

  const [username, setUsername]           = useLocalStorage('totalfund_username', 'User123');
  const [profilePic, setProfilePic]       = useLocalStorage('totalfund_profile_pic', '');
  const [email, setEmail]                 = useLocalStorage('totalfund_email', '');
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showAiChat, setShowAiChat]                   = useState(false);
  const [hideBalance, setHideBalance]                 = useState(false);

  const [marketData, setMarketData] = useState({
    BTC:    { price: 0, change: 0, isUp: true,  type: 'usd' },
    ETH:    { price: 0, change: 0, isUp: true,  type: 'usd' },
    GOLD:   { price: 0, change: 0, isUp: true,  type: 'usd' },
    XAG:    { price: 0, change: 0, isUp: true,  type: 'usd' },
    SPX500: { price: 0, change: 0, isUp: true,  type: 'usd' },
    NASDAQ: { price: 0, change: 0, isUp: true,  type: 'usd' },
    IHSG:   { price: 0, change: 0, isUp: true,  type: 'idr' },
    BRENT:  { price: 0, change: 0, isUp: false, type: 'usd' },
  });

  const { width } = useWindowSize();
  const isMobileViewport = width <= 768;
  useEffect(() => { if (width >= 768) setSidebarOpen(false); }, [width]);

  const cryptoAssets = useMemo(() => assets.filter(a => a.type === 'crypto' && a.ticker), [assets]);

  const fetchCryptoPrices = useCallback(async () => {
    try {
      const baseSymbols      = ['BTCUSDT', 'ETHUSDT'];
      const portfolioSymbols = cryptoAssets.filter(a => a.ticker).map(a => `${a.ticker.toUpperCase()}USDT`);
      const allSymbols = [...new Set([...baseSymbols, ...portfolioSymbols])];
      const symbolsStr = allSymbols.join(',');

      const res  = await fetchWithRetry(`${API_BASE}/api/crypto-prices?symbols=${symbolsStr}`);
      const data = await res.json();

      if (cryptoAssets.length > 0) {
        setHargaMap(prev => {
          const newMap = { ...prev };
          data.forEach(d => {
            const ticker = d.symbol.replace('USDT', '').toUpperCase();
            const asset  = cryptoAssets.find(a => a.ticker.toUpperCase() === ticker);
            if (asset) {
              const key = asset.simbol || asset.ticker;
              newMap[key] = { usd: parseFloat(d.lastPrice), change: parseFloat(d.priceChangePercent) };
            }
          });
          return newMap;
        });
      }

      const btcRaw = data.find(d => d.symbol === 'BTCUSDT');
      const ethRaw = data.find(d => d.symbol === 'ETHUSDT');

      setMarketData(prev => ({
        ...prev,
        ...(btcRaw ? { BTC: { price: parseFloat(btcRaw.lastPrice), change: parseFloat(btcRaw.priceChangePercent), isUp: parseFloat(btcRaw.priceChangePercent) >= 0, type: 'usd' } } : {}),
        ...(ethRaw ? { ETH: { price: parseFloat(ethRaw.lastPrice), change: parseFloat(ethRaw.priceChangePercent), isUp: parseFloat(ethRaw.priceChangePercent) >= 0, type: 'usd' } } : {}),
      }));

      setCryptoLoaded(true);
    } catch (err) { setCryptoLoaded(true); }
  }, [cryptoAssets]);

  const nonCryptoSymbols = useMemo(() => {
    return assets.filter(a => ['saham', 'saham_us', 'komoditas'].includes(a.type)).map(a => a.simbol || a.ticker).filter(Boolean);
  }, [assets]);

  const fetchMarketData = useCallback(async () => {
    try {
      const symQuery = nonCryptoSymbols.length > 0 ? `?symbols=${encodeURIComponent(nonCryptoSymbols.join(','))}` : '';
      const res  = await fetchWithRetry(`${API_BASE}/api/market-data${symQuery}`);
      const data = await res.json();

      const stockUpdates = {};
      Object.keys(data).forEach(ticker => {
        if (data[ticker]?.price !== undefined && data[ticker]?.price !== null) stockUpdates[ticker] = data[ticker].price;
      });
      setHargaSaham(prev => ({ ...prev, ...stockUpdates }));

      const mk = (key, type) => {
        const entry = data[key];
        if (!entry || entry.price === undefined || entry.price === null) return null;
        return { price: parseFloat(entry.price), change: parseFloat(entry.change ?? 0), isUp: parseFloat(entry.change ?? 0) >= 0, type };
      };

      const updates = {};
      [['IHSG','idr'], ['SPX500','usd'], ['NASDAQ','usd'], ['GOLD','usd'], ['XAG','usd'], ['BRENT','usd']].forEach(([key, type]) => {
        const result = mk(key, type); if (result) updates[key] = result;
      });

      setMarketData(prev => ({ ...prev, ...updates }));
      setMarketLoaded(true);
    } catch (err) { setMarketLoaded(true); }

    try {
      const res  = await fetchWithRetry('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      if (data?.rates?.IDR) setKursIdr(data.rates.IDR);
    } catch (err) {}
  }, [nonCryptoSymbols]);

  useEffect(() => { fetchCryptoPrices(); }, [fetchCryptoPrices]);
  useEffect(() => { fetchMarketData(); const i = setInterval(fetchMarketData, 60000); return () => clearInterval(i); }, [fetchMarketData]);

  const _wsAssetsRef = useRef(cryptoAssets);
  useEffect(() => { _wsAssetsRef.current = cryptoAssets; }, [cryptoAssets]);

  const _wsTickers = useMemo(() =>
    [...new Set(['BTC', 'ETH', ...cryptoAssets.map(a => a.ticker?.toUpperCase()).filter(Boolean)])].sort().join(','),
    [cryptoAssets]
  );

  useEffect(() => {
    const PAIRS = {
      BTC:'btcusdt', ETH:'ethusdt', SOL:'solusdt', BNB:'bnbusdt', XRP:'xrpusdt',
      ADA:'adausdt', DOGE:'dogeusdt', AVAX:'avaxusdt', TON:'tonusdt', HYPE:'hypeusdt',
      LINK:'linkusdt', SUI:'suiusdt', DOT:'dotusdt', UNI:'uniusdt', NEAR:'nearusdt',
      ARB:'arbusdt', OP:'opusdt', APT:'aptusdt', ATOM:'atomusdt', LTC:'ltcusdt',
      BCH:'bchusdt', TRX:'trxusdt', INJ:'injusdt', SHIB:'shibusdt',
    };
    const pairs = _wsTickers.split(',').filter(s => PAIRS[s]).map(s => PAIRS[s]);
    if (!pairs.length) return;

    const streams = pairs.map(p => `${p}@ticker`).join('/');
    const latest = {};
    let ws, reconnTimer, flushTimer;

    const connect = () => {
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (!msg?.data?.s) return;
        const d = msg.data;
        latest[d.s.replace('USDT', '')] = { price: parseFloat(d.c), change: parseFloat(d.P) };
      };
      ws.onerror = () => ws.close();
      ws.onclose  = () => { reconnTimer = setTimeout(connect, 5000); };
    };

    connect();

    flushTimer = setInterval(() => {
      if (!Object.keys(latest).length) return;
      const cas = _wsAssetsRef.current;
      setHargaMap(prev => {
        const m = { ...prev };
        cas.forEach(a => {
          const tk = a.ticker?.toUpperCase();
          if (tk && latest[tk]) m[a.simbol || a.ticker] = { usd: latest[tk].price, change: latest[tk].change };
        });
        return m;
      });
      setMarketData(prev => {
        const u = {};
        ['BTC', 'ETH'].forEach(s => {
          if (latest[s]) u[s] = { price: latest[s].price, change: latest[s].change, isUp: latest[s].change >= 0, type: 'usd' };
        });
        return Object.keys(u).length ? { ...prev, ...u } : prev;
      });
    }, 3000);

    return () => { clearTimeout(reconnTimer); clearInterval(flushTimer); ws?.close(); };
  }, [_wsTickers]);

  const getLivePrice = useCallback((asset) => {
    const key = asset.simbol || asset.ticker;
    if (asset.type === 'crypto')    return hargaMap[key]?.usd || hargaMap[asset.ticker]?.usd || asset.avg;
    if (asset.type === 'saham')     return hargaSaham[key] || hargaSaham[asset.ticker] || asset.avg;
    if (asset.type === 'saham_us' || asset.type === 'komoditas') return hargaSaham[key] || hargaSaham[asset.ticker] || asset.avg;
    return asset.avg;
  }, [hargaMap, hargaSaham]);

  const valCryptoUSD    = useMemo(() => assets.filter(a => a.type === 'crypto').reduce((s, a) => s + getLivePrice(a) * a.jumlah, 0), [assets, getLivePrice]);
  const modCryptoUSD    = useMemo(() => assets.filter(a => a.type === 'crypto').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valKomoditasUSD = useMemo(() => assets.filter(a => a.type === 'komoditas').reduce((s, a) => s + getLivePrice(a) * a.jumlah, 0), [assets, getLivePrice]);
  const modKomoditasUSD = useMemo(() => assets.filter(a => a.type === 'komoditas').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valSahamUS_USD  = useMemo(() => assets.filter(a => a.type === 'saham_us').reduce((s, a) => s + getLivePrice(a) * a.jumlah, 0), [assets, getLivePrice]);
  const modSahamUS_USD  = useMemo(() => assets.filter(a => a.type === 'saham_us').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valSahamIDX_IDR = useMemo(() => assets.filter(a => a.type === 'saham').reduce((s, a) => s + getLivePrice(a) * a.jumlah, 0), [assets, getLivePrice]);
  const modSahamIDX_IDR = useMemo(() => assets.filter(a => a.type === 'saham').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valStableUSD    = useMemo(() => assets.filter(a => a.type === 'stable').reduce((s, a) => s + a.avg * a.jumlah, 0), [assets]);
  const valCashIDR      = useMemo(() => assets.filter(a => a.type === 'cash_idr').reduce((s, a) => s + a.jumlah, 0), [assets]);

  const valSahamIDX_USD = valSahamIDX_IDR / kursIdr;
  const valCashUSD      = valCashIDR / kursIdr;

  const grandTotalUSD    = valCryptoUSD + valKomoditasUSD + valSahamUS_USD + valSahamIDX_USD + valStableUSD + valCashUSD;
  const grandTotalIDR    = grandTotalUSD * kursIdr;
  const grandModalUSD    = modCryptoUSD + modKomoditasUSD + modSahamUS_USD + (modSahamIDX_IDR / kursIdr) + valStableUSD + valCashUSD;
  const overallPnlUSD    = grandTotalUSD - grandModalUSD;
  const overallPnlPersen = grandModalUSD > 0 ? (overallPnlUSD / grandModalUSD) * 100 : 0;

  const pnlCryptoUSD    = valCryptoUSD - modCryptoUSD;
  const pnlKomoditasUSD = valKomoditasUSD - modKomoditasUSD;
  const pnlSahamUS_USD  = valSahamUS_USD - modSahamUS_USD;
  const pnlSahamIDX_IDR = valSahamIDX_IDR - modSahamIDX_IDR;

  const { dailyPnlUSD, dailyPnlPersen } = useMemo(() => {
    let pnl = 0, modal = 0;
    assets.forEach(a => {
      let valUSD = 0, change24h = 0;
      if (a.type === 'crypto') {
        const key = a.simbol || a.ticker;
        valUSD = (hargaMap[key]?.usd || a.avg) * a.jumlah; change24h = hargaMap[key]?.change || 0;
      } else if (a.type === 'komoditas') {
        const key = a.simbol || a.ticker;
        valUSD = (hargaSaham[key] || a.avg) * a.jumlah;
        change24h = a.simbol === 'GC=F' ? (marketData.GOLD?.change || 0) : a.simbol === 'SI=F' ? (marketData.XAG?.change || 0) : 0;
      } else if (a.type === 'saham_us') {
        const key = a.simbol || a.ticker;
        valUSD = (hargaSaham[key] || a.avg) * a.jumlah; change24h = marketData.SPX500?.change || 0;
      } else if (a.type === 'saham') {
        const key = a.simbol || a.ticker;
        valUSD = ((hargaSaham[key] || a.avg) * a.jumlah) / kursIdr; change24h = marketData.IHSG?.change || 0;
      } else {
        valUSD = a.type === 'cash_idr' ? a.jumlah / kursIdr : a.avg * a.jumlah;
      }
      const denom = 1 + change24h / 100;
      const val0  = denom !== 0 ? valUSD / denom : valUSD;
      pnl += valUSD - val0; modal += val0;
    });
    return { dailyPnlUSD: pnl, dailyPnlPersen: modal > 0 ? (pnl / modal) * 100 : 0 };
  }, [assets, hargaMap, hargaSaham, marketData, kursIdr]);

  const baselineNonCrypto = valStableUSD + valSahamIDX_USD + valSahamUS_USD + valKomoditasUSD + valCashUSD;
  const baselineRef = useRef(baselineNonCrypto);
  baselineRef.current = baselineNonCrypto;

  useEffect(() => {
    setChartData(null); setChartError(false);
    const fetchChart = async () => {
      const cryptos  = assets.filter(a => a.type === 'crypto' && a.simbol);
      const baseline = baselineRef.current || 0;
      const fetchDays = 1825; const now = Date.now();

      const createDummyData = (baseVal) => {
        const arr = [];
        for (let i = fetchDays; i >= 0; i--) { arr.push([now - (i * 86400000), baseVal]); }
        return arr;
      };

      if (cryptos.length === 0) {
        setChartData(createDummyData(baseline)); setPnlChart({ selisih: 0, persen: 0 }); return;
      }

      const process = (results) => {
        const validResult = results.find(r => r && r.prices && r.prices.length > 0);
        if (!validResult) return null;
        return validResult.prices.map((pt, i) => [
          pt[0],
          cryptos.reduce((s, a, j) => {
            const price = results[j]?.prices?.[i]?.[1] ?? (hargaMap[a.simbol]?.usd || a.avg || 0);
            return s + (price * a.jumlah);
          }, 0) + baseline
        ]);
      };

      try {
        const results = await Promise.all(cryptos.map(a => fetchWithRetry(`${API_BASE}/api/chart?simbol=${a.simbol}&days=${fetchDays}`).then(r => r.json()).catch(() => null)));
        if (results.some(r => r && r.prices)) {
          const combined = process(results);
          if (combined?.length >= 2) {
            setChartData(combined); const diff = combined[combined.length-1][1] - combined[0][1];
            setPnlChart({ selisih: diff, persen: (diff / combined[0][1]) * 100 }); return;
          }
        }
      } catch (e) {}

      setChartData(createDummyData(grandTotalUSD)); setPnlChart({ selisih: 0, persen: 0 }); setChartError(true);
    };
    fetchChart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  const chartColor = pnlChart?.selisih >= 0 ? '#10B981' : '#EF4444';

  const handleAddAsset = useCallback((newAsset, livePrice) => {
    setAssets(prev => [...prev, { ...newAsset, id: Date.now() }]);
    setShowAddModal(false);
    if (livePrice) {
      const key = newAsset.simbol || newAsset.ticker;
      if (newAsset.type === 'crypto') setHargaMap(prev => ({ ...prev, [key]: { usd: livePrice, change: 0 } }));
      else if (['saham', 'saham_us', 'komoditas'].includes(newAsset.type)) setHargaSaham(prev => ({ ...prev, [key]: livePrice }));
    }
  }, [setAssets]);

  const handleDeleteAsset = useCallback((id) => { setAssets(prev => prev.filter(a => a.id !== id)); }, [setAssets]);
  const openEdit          = useCallback((asset) => { setEditingAsset(asset); setEditForm({ harga: '', jumlah: '' }); }, []);

  const handleRowClick = useCallback((asset, pos) => {
    setActionMenuAsset(asset);
    setActionMenuPos(pos);
  }, []);

  const holdingsRef = useRef(null);
  const scrollToHoldings = useCallback(() => {
    holdingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const closeActionMenu = useCallback(() => setActionMenuAsset(null), []);

  const handleSaveAccountSettings = useCallback(({ username: newName, email: newEmail, profilePic: newPic }) => {
    setUsername(newName);
    setEmail(newEmail);
    setProfilePic(newPic);
    setShowAccountSettings(false);
  }, [setUsername, setEmail, setProfilePic]);

  function handleSave(id, hargaBaru, jumlahTambah) {
    setAssets(prev => prev.map(a => {
      if (a.id !== id) return a;
      const totalKoin = a.jumlah + jumlahTambah;
      if (totalKoin <= 0) return { ...a, jumlah: 0, avg: 0 };
      return { ...a, avg: (a.avg * a.jumlah + hargaBaru * jumlahTambah) / totalKoin, jumlah: totalKoin };
    }));
    setEditingAsset(null);
  }

  return (
    <div className="app-wrapper">
      <div className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <Sidebar activePage={activePage} setActivePage={setActivePage} onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} t={t} />

      <div className="app-main">
        <div className="max-container">

          <AppHeader
            setSidebarOpen={setSidebarOpen}
            setActivePage={setActivePage}
            lang={lang}
            setLang={setLang}
            username={username}
            profilePic={profilePic}
            setShowAccountSettings={setShowAccountSettings}
            t={t}
            onLogout={onLogout}
          />

          {activePage === 'portfolio' && (
            <Dashboard
              grandTotalUSD={grandTotalUSD} grandTotalIDR={grandTotalIDR} kursIdr={kursIdr}
              overallPnlUSD={overallPnlUSD} overallPnlPersen={overallPnlPersen}
              dailyPnlUSD={dailyPnlUSD} dailyPnlPersen={dailyPnlPersen}
              cryptoLoaded={cryptoLoaded} marketLoaded={marketLoaded}
              hideBalance={hideBalance} setHideBalance={setHideBalance}
              isMobileViewport={isMobileViewport} scrollToHoldings={scrollToHoldings}
              holdingsRef={holdingsRef} pnlCryptoUSD={pnlCryptoUSD}
              pnlKomoditasUSD={pnlKomoditasUSD} pnlSahamIDX_IDR={pnlSahamIDX_IDR}
              pnlSahamUS_USD={pnlSahamUS_USD} chartData={chartData}
              chartColor={chartColor} chartError={chartError}
              period={period} setPeriod={setPeriod}
              marketData={marketData} assets={assets}
              getLivePrice={getLivePrice} hargaMap={hargaMap}
              hargaSaham={hargaSaham} handleRowClick={handleRowClick}
              setShowAddModal={setShowAddModal} setActivePage={setActivePage} t={t}
            />
          )}

          {activePage === 'market-explorer' && <MarketExplorer t={t} />}

          {activePage === 'market-overview' && <MarketOverview t={t} />}

          {activePage === 'watchlist' && <TopMovers />}

          {activePage === 'networth-detail' && (
            <NetWorthDetailPage
              onBack={() => setActivePage('portfolio')}
              chartData={chartData}
              currentNetWorth={grandTotalUSD}
              overallPnlUSD={overallPnlUSD}
              overallPnlPersen={overallPnlPersen}
              assets={assets}
              dailyPnlUSD={dailyPnlUSD}
              hargaMap={hargaMap}
              hargaSaham={hargaSaham}
              kursIdr={kursIdr}
              marketData={marketData}
              t={t}
            />
          )}

          {activePage === 'news' && <News assets={assets} t={t} />}

          {activePage === 'multi-chart' && <MultiChart />}

          {activePage === 'ai-trade' && <AITrade />}

          {activePage === 'calculator' && <Calculator />}

          {(activePage === 'mod-users' || activePage === 'mod-content' || activePage === 'mod-settings') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div style={{ color: '#4A5568', fontSize: '13px', fontWeight: 600 }}>Coming Soon</div>
              <div style={{ color: '#1A2C42', fontSize: '11px' }}>Halaman ini sedang dalam pengembangan</div>
            </div>
          )}

        </div>
      </div>

      {showAddModal && <AddAssetModal onSave={handleAddAsset} onClose={() => setShowAddModal(false)} t={t} />}
      {deleteConfirm && <ConfirmDeleteModal asset={deleteConfirm} onConfirm={() => { handleDeleteAsset(deleteConfirm.id); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} t={t} />}

      {showAccountSettings && (
        <AccountSettingsModal
          username={username}
          profilePic={profilePic}
          email={email}
          onSave={handleSaveAccountSettings}
          onClose={() => setShowAccountSettings(false)}
          t={t}
        />
      )}

      {actionMenuAsset && (
        <AssetActionMenu
          asset={actionMenuAsset}
          anchorPos={actionMenuPos}
          isMobile={isMobileViewport}
          onEdit={openEdit}
          onDelete={setDeleteConfirm}
          onClose={closeActionMenu}
          t={t}
        />
      )}

      {editingAsset && (
        <EditAssetModal
          editingAsset={editingAsset}
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={(h, j) => { handleSave(editingAsset.id, h, j); setEditingAsset(null); }}
          onClose={() => setEditingAsset(null)}
          t={t}
        />
      )}

      {showAiChat && (
        <div style={{
          position: 'fixed',
          bottom: isMobileViewport ? 0 : '92px',
          right: isMobileViewport ? 0 : '24px',
          left: isMobileViewport ? 0 : 'auto',
          width: isMobileViewport ? '100%' : '400px',
          height: isMobileViewport ? '82vh' : '580px',
          zIndex: 250,
          borderRadius: isMobileViewport ? '20px 20px 0 0' : '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          animation: 'aiPanelIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <AIConsultant
            assets={assets}
            hargaMap={hargaMap}
            hargaSaham={hargaSaham}
            kursIdr={kursIdr}
            grandTotalUSD={grandTotalUSD}
            grandTotalIDR={grandTotalIDR}
            overallPnlUSD={overallPnlUSD}
            overallPnlPersen={overallPnlPersen}
            marketData={marketData}
            t={t}
          />
        </div>
      )}

      <button
        onClick={() => setShowAiChat(prev => !prev)}
        title={t('ai_consultant')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          background: showAiChat
            ? '#111C30'
            : 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
          border: showAiChat ? '1px solid rgba(79,124,255,0.2)' : 'none',
          cursor: 'pointer',
          zIndex: 260,
          boxShadow: showAiChat
            ? '0 4px 20px rgba(0,0,0,0.5)'
            : '0 8px 28px rgba(6,182,212,0.4), 0 2px 8px rgba(79,124,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.22s cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {showAiChat ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L13.4 9.6L20 11L13.4 12.4L12 19L10.6 12.4L4 11L10.6 9.6L12 3Z" fill="white" opacity="0.95"/>
            <path d="M5.5 4.5L6.1 7.1L8.5 7.5L6.1 7.9L5.5 10.5L4.9 7.9L2.5 7.5L4.9 7.1L5.5 4.5Z" fill="white" opacity="0.5"/>
            <path d="M19 15L19.4 17L21 17.5L19.4 18L19 20L18.6 18L17 17.5L18.6 17L19 15Z" fill="white" opacity="0.35"/>
          </svg>
        )}
      </button>
    </div>
  );
}
export default App;
