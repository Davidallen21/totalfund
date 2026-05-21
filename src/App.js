import { useState, useEffect } from 'react';

// ============================================
// KONFIGURASI ASET & KURS AWAL
// ============================================
const INITIAL_ASSETS = [
  { id: 1, nama: 'Bitcoin',  ticker: 'BTC',  simbol: 'bitcoin',  avg: 60000, jumlah: 0.5,  type: 'crypto' },
  { id: 2, nama: 'Ethereum', ticker: 'ETH',  simbol: 'ethereum', avg: 3000,  jumlah: 2,    type: 'crypto' },
  { id: 3, nama: 'Lighter',  ticker: 'LIT',  simbol: 'litentry', avg: 1,     jumlah: 2,    type: 'crypto' },
  { id: 4, nama: 'Bank Central Asia', ticker: 'BBCA', simbol: 'BBCA.JK', avg: 9200,  jumlah: 5000,   type: 'saham' },
  { id: 5, nama: 'Bank Rakyat Indo',  ticker: 'BBRI', simbol: 'BBRI.JK', avg: 4500,  jumlah: 10000,  type: 'saham' },
  { id: 6, nama: 'Bank Mandiri',      ticker: 'BMRI', simbol: 'BMRI.JK', avg: 6200,  jumlah: 5000,   type: 'saham' },
  { id: 7, nama: 'GoTo Gojek Toko',   ticker: 'GOTO', simbol: 'GOTO.JK', avg: 65,    jumlah: 100000, type: 'saham' },
  { id: 8, nama: 'Tether USD',  ticker: 'USDT', simbol: null, avg: 1, jumlah: 500,      type: 'stable'   },
  { id: 9, nama: 'Rupiah Cash', ticker: 'IDR',  simbol: null, avg: 1, jumlah: 15000000, type: 'cash_idr' },
];

const PERIODS = [
  { label: '1D', days: 1 }, { label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }, { label: '1Y', days: 365 },
];

const formatUSD = (val) => '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatIDR = (val) => 'Rp ' + val.toLocaleString('id-ID', { maximumFractionDigits: 0 });
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b', '#84cc16'];

// ============================================
// HELPER: Fetch saham Yahoo Finance via proxy
// ============================================
async function fetchYahooPrice(symbol) {
  try {
    const url = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
    const res  = await fetch(`https://api.allorigins.win/get?url=${url}`);
    const outer = await res.json();
    const data  = JSON.parse(outer.contents);
    const meta  = data.chart.result[0].meta;
    const price  = meta.regularMarketPrice;
    const prev   = meta.chartPreviousClose || meta.previousClose || price;
    const change = prev ? ((price - prev) / prev) * 100 : 0;
    return { price, change };
  } catch { return null; }
}

// ============================================
// KOMPONEN: SIDEBAR
// ============================================
function Sidebar({ activePage, setActivePage }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarLogo}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #4ade80 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '18px' }}>D</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '0.5px' }}>David<span style={{ color: '#4ade80' }}>Hedge</span></h2>
      </div>
      <div style={styles.sidebarMenu}>
        <div style={activePage === 'portfolio' ? styles.menuItemActive : styles.menuItem} onClick={() => setActivePage('portfolio')}><span style={{ fontWeight: activePage === 'portfolio' ? 600 : 500, fontSize: '15px' }}>Portfolio Live</span></div>
        <div style={activePage === 'news' ? styles.menuItemActive : styles.menuItem} onClick={() => setActivePage('news')}><span style={{ fontWeight: activePage === 'news' ? 600 : 500, fontSize: '15px' }}>Market News</span></div>
        <div style={activePage === 'bot' ? styles.menuItemActive : styles.menuItem} onClick={() => setActivePage('bot')}><span style={{ fontWeight: activePage === 'bot' ? 600 : 500, fontSize: '15px' }}>AI Bot Trading</span></div>
      </div>
      <div style={{ padding: '24px', borderTop: '1px solid #1f1f1f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%' }}></div>
          <span style={{ color: '#a3a3a3', fontSize: 13, fontWeight: 500 }}>System Online</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER: CHARTS
// ============================================
function MiniChart({ data, color }) {
  if (!data || data.length < 2) return (
    <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#555', fontSize: 13 }}>Memuat chart...</span>
    </div>
  );
  const W = 400, H = 100;
  const prices = data.map(d => d[1]);
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - ((d[1] - min) / range) * (H - 4) - 2}`).join(' ');
  const gradientId = `grad-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', minHeight: '100px' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DonutChart({ data }) {
  let cumulativePercent = 0;
  function getCoordinatesForPercent(percent) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }
  return (
    <svg viewBox="-1 -1 2 2" style={{ width: '130px', height: '130px', transform: 'rotate(-90deg)' }}>
      {data.map(slice => {
        if (slice.pct <= 0) return null;
        if (slice.pct >= 99.9) return <circle key={slice.ticker} r="0.8" fill="transparent" stroke={slice.color} strokeWidth="0.4" />;
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += slice.pct / 100;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = slice.pct > 50 ? 1 : 0;
        const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
        return <path key={slice.ticker} d={pathData} fill={slice.color} />;
      })}
      <circle r="0.6" cx="0" cy="0" fill="#141414" />
    </svg>
  );
}

// ============================================
// KOMPONEN: BARIS DATA (TABLE ROW)
// ============================================
function DataRow({ asset, hargaLiveUSD, hargaLiveIDR, kursIdr, totalNetWorthUSD, onEdit }) {
  const isCrypto  = asset.type === 'crypto';
  const isSaham   = asset.type === 'saham';
  const isStable  = asset.type === 'stable';
  const isCashIDR = asset.type === 'cash_idr';

  const hargaAcuan    = isCrypto ? hargaLiveUSD : isSaham ? hargaLiveIDR : 1;
  const nilaiModal    = asset.avg * asset.jumlah;
  const nilaiSekarang = hargaAcuan ? hargaAcuan * asset.jumlah : isCashIDR ? asset.jumlah : null;
  const pnl           = nilaiSekarang && !isStable && !isCashIDR ? nilaiSekarang - nilaiModal : null;
  const pnlPersen     = nilaiModal > 0 && pnl ? (pnl / nilaiModal) * 100 : 0;
  const profit        = pnl >= 0;
  const nilaiDalamUSD = isSaham || isCashIDR ? (nilaiSekarang ?? 0) / kursIdr : (nilaiSekarang ?? 0);
  const pct           = totalNetWorthUSD > 0 ? ((nilaiDalamUSD / totalNetWorthUSD) * 100).toFixed(1) : 0;

  const badgeColor = isCrypto ? '#f59e0b' : isSaham ? '#3b82f6' : '#10b981';
  const badgeBg    = isCrypto ? 'rgba(245, 158, 11, 0.15)' : isSaham ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)';

  return (
    <div style={styles.modernRow}>
      <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: badgeBg, color: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
          {asset.ticker.substring(0,3)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>{asset.ticker}</span>
          <span style={{ color: '#888', fontSize: '13px' }}>{asset.nama}</span>
        </div>
      </div>

      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {isCashIDR ? (
          <><span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>Rp 1</span><span style={{ color: '#737373', fontSize: '13px' }}>Pegged</span></>
        ) : (
          <><span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{hargaAcuan ? (isSaham ? formatIDR(hargaAcuan) : formatUSD(hargaAcuan)) : '—'}</span><span style={{ color: '#737373', fontSize: '13px' }}>{hargaAcuan ? (isSaham ? formatUSD(hargaAcuan / kursIdr) : formatIDR(hargaAcuan * kursIdr)) : '—'}</span></>
        )}
      </div>

      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {isCashIDR ? (
          <span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{formatIDR(asset.jumlah).replace('Rp ', '')} <span style={{ fontSize: '12px', color: '#737373', fontWeight: 'normal' }}>IDR</span></span>
        ) : (
          <><span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{(isSaham ? asset.jumlah / 100 : asset.jumlah).toLocaleString()} <span style={{ fontSize: '12px', color: '#737373', fontWeight: 'normal' }}>{isSaham ? 'Lot' : asset.ticker}</span></span><span style={{ color: '#737373', fontSize: '13px' }}>Avg: {isSaham ? formatIDR(asset.avg) : formatUSD(asset.avg)}</span></>
        )}
      </div>

      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatIDR(nilaiSekarang) : formatUSD(nilaiSekarang)) : '—'}</span>
        <span style={{ color: '#737373', fontSize: '13px' }}>{nilaiSekarang ? (isSaham || isCashIDR ? formatUSD(nilaiSekarang / kursIdr) : formatIDR(nilaiSekarang * kursIdr)) : '—'}</span>
        <div style={{ width: '85px', height: '4px', backgroundColor: '#262626', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#4ade80' }}></div>
        </div>
        <span style={{ fontSize: '10px', color: '#737373', fontWeight: 600 }}>{pct}% of portfolio</span>
      </div>

      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {!isStable && !isCashIDR ? (
          <><span style={{ color: profit ? '#4ade80' : '#f87171', fontWeight: '700', fontSize: '16px' }}>{pnl ? `${profit ? '+' : ''}${isSaham ? formatIDR(pnl) : formatUSD(pnl)}` : '—'}</span><span style={{ color: profit ? '#166534' : '#991b1b', fontSize: '13px', fontWeight: '500' }}>{pnl ? `${profit ? '+' : ''}${isSaham ? formatUSD(pnl / kursIdr) : formatIDR(pnl * kursIdr)}` : '—'} ({pnlPersen.toFixed(2)}%)</span></>
        ) : <span style={{ color: '#555', fontSize: '15px' }}>—</span>}
      </div>

      <div style={{ width: '40px', textAlign: 'right' }}>
        <button onClick={() => onEdit(asset)} style={styles.actionBtn}>Edit</button>
      </div>
    </div>
  );
}

// ============================================
// KOMPONEN UTAMA: APP
// ============================================
function App() {
  const [activePage, setActivePage]     = useState('portfolio');
  const [assets, setAssets]             = useState(INITIAL_ASSETS);
  const [hargaMap, setHargaMap]         = useState({});
  const [editingAsset, setEditingAsset] = useState(null);
  const [kursIdr, setKursIdr]           = useState(16200);
  const [period, setPeriod]             = useState(PERIODS[0]);
  const [chartData, setChartData]       = useState(null);
  const [pnlChart, setPnlChart]         = useState(null);

  const [hargaSaham, setHargaSaham] = useState({
    BBCA: 9450, BBRI: 4620, BMRI: 6350, GOTO: 68
  });

  const [marketData, setMarketData] = useState({
    BTC:    { price: 0,       change: 0,     isUp: true,  type: 'usd' },
    ETH:    { price: 0,       change: 0,     isUp: true,  type: 'usd' },
    GOLD:   { price: 3320.5,  change: 0,     isUp: true,  type: 'usd' },
    XAG:    { price: 33.15,   change: 0,     isUp: true,  type: 'usd' },
    SPX500: { price: 5310.50, change: 0.22,  isUp: true,  type: 'usd' },
    NASDAQ: { price: 16820.1, change: 0.54,  isUp: true,  type: 'usd' },
    IHSG:   { price: 7215.30, change: 0.12,  isUp: true,  type: 'idr' },
    BRENT:  { price: 82.95,   change: -0.85, isUp: false, type: 'usd' },
  });

  // ── FETCH SEMUA DATA REALTIME ──
  useEffect(() => {
    const fetchAll = async () => {

      // 1. CRYPTO via CoinGecko (works di Indonesia, no CORS issue)
      try {
        const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,litentry&vs_currencies=usd&include_24hr_change=true');
        const data = await res.json();

        const btcPrice  = data.bitcoin?.usd  ?? 0;
        const btcChange = data.bitcoin?.usd_24h_change  ?? 0;
        const ethPrice  = data.ethereum?.usd ?? 0;
        const ethChange = data.ethereum?.usd_24h_change ?? 0;
        const litPrice  = data.litentry?.usd ?? 0;

        setHargaMap({
          bitcoin:  { usd: btcPrice  },
          ethereum: { usd: ethPrice  },
          litentry: { usd: litPrice  },
        });

        setMarketData(prev => ({
          ...prev,
          BTC: { price: btcPrice, change: btcChange, isUp: btcChange >= 0, type: 'usd' },
          ETH: { price: ethPrice, change: ethChange, isUp: ethChange >= 0, type: 'usd' },
        }));
      } catch (e) { console.warn('CoinGecko error:', e); }

      // 2. XAU & XAG via metals.live (free, no API key, no CORS)
      try {
        const res    = await fetch('https://api.metals.live/v1/spot');
        const data   = await res.json();
        // Response: [{gold:3320},{silver:33},{platinum:...},...]
        const goldObj   = data.find(d => d.gold   !== undefined);
        const silverObj = data.find(d => d.silver !== undefined);
        const gold   = goldObj?.gold   ?? null;
        const silver = silverObj?.silver ?? null;

        setMarketData(prev => ({
          ...prev,
          ...(gold   ? { GOLD: { price: gold,   change: prev.GOLD.change,  isUp: prev.GOLD.isUp,  type: 'usd' } } : {}),
          ...(silver ? { XAG:  { price: silver, change: prev.XAG.change,   isUp: prev.XAG.isUp,   type: 'usd' } } : {}),
        }));
      } catch (e) { console.warn('Metals.live error:', e); }

      // 3. SAHAM IDX via Yahoo Finance + allorigins proxy (CORS workaround)
      try {
        const sahamList = ['BBCA.JK', 'BBRI.JK', 'BMRI.JK', 'GOTO.JK'];
        const results   = await Promise.all(sahamList.map(s => fetchYahooPrice(s)));

        const newHarga = { ...hargaSaham };
        const tickerMap = { 'BBCA.JK': 'BBCA', 'BBRI.JK': 'BBRI', 'BMRI.JK': 'BMRI', 'GOTO.JK': 'GOTO' };

        sahamList.forEach((sym, i) => {
          if (results[i]?.price) {
            const ticker = tickerMap[sym];
            newHarga[ticker] = results[i].price;
          }
        });

        setHargaSaham(newHarga);

        // Update IHSG change dari BBCA sebagai proxy pasar
        const ihsgResult = await fetchYahooPrice('^JKSE');
        if (ihsgResult) {
          setMarketData(prev => ({
            ...prev,
            IHSG: { price: ihsgResult.price, change: ihsgResult.change, isUp: ihsgResult.change >= 0, type: 'idr' },
          }));
        }
      } catch (e) { console.warn('Yahoo Finance error:', e); }

      // 4. KURS USD/IDR
      try {
        const res  = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data?.rates?.IDR) setKursIdr(data.rates.IDR);
      } catch (e) { console.warn('Exchange rate error:', e); }
    };

    fetchAll();
    // Refresh tiap 60 detik (CoinGecko rate limit = 30 req/menit)
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [hargaSaham]);

  // Chart baseline (nilai non-crypto konstan)
  const valStableUSD       = assets.filter(a => a.type === 'stable').reduce((s, a) => s + a.avg * a.jumlah, 0);
  const valSahamIDR        = assets.filter(a => a.type === 'saham').reduce((s, a) => s + (hargaSaham[a.ticker] ?? 0) * a.jumlah, 0);
  const valCashIDR         = assets.filter(a => a.type === 'cash_idr').reduce((s, a) => s + a.jumlah, 0);
  const baselineNonCrypto  = valStableUSD + valSahamIDR / kursIdr + valCashIDR / kursIdr;

  // Chart historis dari CoinGecko
  useEffect(() => {
    const fetchChart = async () => {
      const cryptoAssets = assets.filter(a => a.type === 'crypto' && a.simbol);
      try {
        const results = await Promise.all(
          cryptoAssets.map(a => fetch(`https://api.coingecko.com/api/v3/coins/${a.simbol}/market_chart?vs_currency=usd&days=${period.days}`).then(r => r.json()))
        );
        const base = results[0]?.prices ?? [];
        const combined = base.map((pt, i) => [
          pt[0],
          cryptoAssets.reduce((s, a, j) => s + (results[j]?.prices?.[i]?.[1] ?? 0) * a.jumlah, 0) + baselineNonCrypto,
        ]);
        setChartData(combined);
        if (combined.length >= 2) {
          const awal = combined[0][1], akhir = combined[combined.length - 1][1], diff = akhir - awal;
          setPnlChart({ selisih: diff, persen: (diff / awal) * 100 });
        }
      } catch { setChartData([]); }
    };
    fetchChart();
  }, [period, assets, baselineNonCrypto]);

  function handleSave(id, avgBaru, jumlahBaru) {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, avg: avgBaru, jumlah: jumlahBaru } : a));
    setEditingAsset(null);
  }

  // Kalkulasi grand total
  const valCryptoUSD   = assets.filter(a => a.type === 'crypto').reduce((s, a) => s + (hargaMap[a.simbol]?.usd ?? 0) * a.jumlah, 0);
  const modCryptoUSD   = assets.filter(a => a.type === 'crypto').reduce((s, a) => s + a.avg * a.jumlah, 0);
  const modSahamIDR    = assets.filter(a => a.type === 'saham').reduce((s, a) => s + a.avg * a.jumlah, 0);
  const valSahamUSD    = valSahamIDR / kursIdr;
  const modSahamUSD    = modSahamIDR / kursIdr;
  const valCashUSD     = valCashIDR / kursIdr;

  const grandTotalUSD   = valCryptoUSD + valStableUSD + valSahamUSD + valCashUSD;
  const grandTotalIDR   = grandTotalUSD * kursIdr;
  const grandModalUSD   = modCryptoUSD + valStableUSD + modSahamUSD + valCashUSD;
  const overallPnlUSD   = grandTotalUSD - grandModalUSD;
  const overallPnlIDR   = overallPnlUSD * kursIdr;
  const overallPnlPersen = grandModalUSD > 0 ? (overallPnlUSD / grandModalUSD) * 100 : 0;
  const isOverallProfit  = overallPnlUSD >= 0;
  const pnlCryptoUSD     = valCryptoUSD - modCryptoUSD;
  const pnlSahamIDR      = valSahamIDR - modSahamIDR;
  const chartColor       = pnlChart?.selisih >= 0 ? '#4ade80' : '#f87171';

  // Pie data
  const pieData = assets.map((a, i) => {
    let valUSD = 0;
    if (a.type === 'crypto')   valUSD = (hargaMap[a.simbol]?.usd ?? 0) * a.jumlah;
    if (a.type === 'saham')    valUSD = ((hargaSaham[a.ticker] ?? 0) * a.jumlah) / kursIdr;
    if (a.type === 'stable')   valUSD = a.avg * a.jumlah;
    if (a.type === 'cash_idr') valUSD = a.jumlah / kursIdr;
    return { ticker: a.ticker, val: valUSD, pct: grandTotalUSD > 0 ? (valUSD / grandTotalUSD) * 100 : 0, color: COLORS[i % COLORS.length] };
  }).filter(d => d.val > 0).sort((a, b) => b.val - a.val);

  const renderSingleCard = (key, displayName) => {
    const data = marketData[key];
    return (
      <div style={styles.marketCardMini} key={key}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#a3a3a3', fontWeight: '700', fontSize: '13px' }}>{displayName}</span>
          <span style={{ color: data.isUp ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 'bold' }}>
            {data.isUp ? '+' : ''}{data.change.toFixed(2)}%
          </span>
        </div>
        <div style={{ color: 'white', fontWeight: '800', fontSize: '16px', marginTop: '6px' }}>
          {data.type === 'usd' ? '$' : ''}{data.price > 0 ? data.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#050505', width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', maxHeight: '100vh' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

          <div style={styles.header}>
            <h1 style={styles.headerTitle}>
              {activePage === 'portfolio' && 'Overview'}
              {activePage === 'news'      && 'Market Intelligence'}
              {activePage === 'bot'       && 'AI Algo Engine'}
            </h1>
          </div>

          {activePage === 'portfolio' && (
            <>
              {/* ROW 1: NET WORTH | PNL | CHART */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>

                <div style={styles.summaryCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3', fontSize: '14px', fontWeight: 500 }}>Total Net Worth</span>
                    <span style={{ color: '#4ade80', fontSize: '12px', backgroundColor: 'rgba(74,222,128,0.1)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>IDR: {kursIdr.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ color: 'white', fontSize: '36px', fontWeight: 800, letterSpacing: '-1px' }}>{formatUSD(grandTotalUSD)}</div>
                  <div style={{ color: '#737373', fontSize: '18px', fontWeight: 500, marginTop: '4px' }}>{formatIDR(grandTotalIDR)}</div>
                </div>

                <div style={styles.summaryCard}>
                  <span style={{ color: '#a3a3a3', fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '12px' }}>Overall PNL (All Assets)</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                    <div style={{ color: isOverallProfit ? '#4ade80' : '#f87171', fontSize: '30px', fontWeight: 800, letterSpacing: '-1px' }}>
                      {isOverallProfit ? '+' : ''}{formatUSD(overallPnlUSD)}
                    </div>
                    <span style={{ backgroundColor: isOverallProfit ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: isOverallProfit ? '#4ade80' : '#f87171', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
                      {isOverallProfit ? '+' : ''}{overallPnlPersen.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ color: isOverallProfit ? '#166534' : '#991b1b', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                    {isOverallProfit ? '+' : ''}{formatIDR(overallPnlIDR)}
                  </div>
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #262626', display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#737373', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Kripto (USD)</span>
                      <span style={{ color: pnlCryptoUSD >= 0 ? '#4ade80' : '#f87171', fontSize: '14px', fontWeight: 'bold' }}>
                        {pnlCryptoUSD >= 0 ? '+' : ''}{formatUSD(pnlCryptoUSD)}
                      </span>
                    </div>
                    <div style={{ width: '1px', backgroundColor: '#262626' }}></div>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#737373', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Saham (IDR)</span>
                      <span style={{ color: pnlSahamIDR >= 0 ? '#4ade80' : '#f87171', fontSize: '14px', fontWeight: 'bold' }}>
                        {pnlSahamIDR >= 0 ? '+' : ''}{formatIDR(pnlSahamIDR)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ ...styles.summaryCard, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ color: '#a3a3a3', fontSize: '14px', fontWeight: 500 }}>Net Worth Trend</span>
                    <div style={styles.periodRow}>
                      {PERIODS.map(p => (
                        <button key={p.label} onClick={() => setPeriod(p)} style={{ ...styles.periodBtn, ...(period.label === p.label ? styles.periodBtnActive : {}) }}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}><MiniChart data={chartData} color={chartColor} /></div>
                </div>
              </div>

              {/* ROW 2: 8 MARKET CARDS + DONUT CHART */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'stretch' }}>

                <div style={{ flex: 1.6, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '14px' }}>
                  {renderSingleCard('BTC',    'BTC')}
                  {renderSingleCard('GOLD',   'Gold XAU')}
                  {renderSingleCard('SPX500', 'S&P 500')}
                  {renderSingleCard('IHSG',   'IHSG')}
                  {renderSingleCard('ETH',    'ETH')}
                  {renderSingleCard('XAG',    'Silver XAG')}
                  {renderSingleCard('NASDAQ', 'Nasdaq')}
                  {renderSingleCard('BRENT',  'Oil Brent')}
                </div>

                <div style={{ flex: 1, minWidth: '340px', backgroundColor: '#141414', borderRadius: '12px', padding: '16px 20px', border: '1px solid #262626', display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ width: '130px', height: '130px', flexShrink: 0 }}>
                    <DonutChart data={pieData} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '115px', overflowY: 'auto', paddingRight: '4px' }}>
                    {pieData.map(d => (
                      <div key={d.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }}></div>
                          <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{d.ticker}</span>
                        </div>
                        <span style={{ color: '#a3a3a3', fontSize: '12px', fontWeight: 500 }}>{d.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* TABEL ASET */}
              <div style={{ backgroundColor: '#121212', borderRadius: '16px', border: '1px solid #262626', overflow: 'hidden' }}>
                <div style={{ display: 'flex', padding: '16px 24px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #262626' }}>
                  {['Aset', 'Harga Live', 'Holdings / AVG', 'Nilai Aset', 'Unrealized PNL', ''].map((h, i) => (
                    <div key={i} style={{ flex: i === 5 ? '0 0 40px' : 1.5, color: '#737373', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</div>
                  ))}
                </div>

                <div style={{ padding: '20px 24px 8px', color: 'white', fontSize: '18px', fontWeight: '700' }}>Crypto</div>
                <div style={{ display: 'flex', flexDirection: 'column', padding: '0 12px' }}>
                  {assets.filter(a => a.type === 'crypto').map(asset => (
                    <DataRow key={asset.id} asset={asset} hargaLiveUSD={hargaMap[asset.simbol]?.usd} kursIdr={kursIdr} totalNetWorthUSD={grandTotalUSD} onEdit={setEditingAsset} />
                  ))}
                </div>

                <div style={{ padding: '24px 24px 8px', color: 'white', fontSize: '18px', fontWeight: '700' }}>Saham (IDX)</div>
                <div style={{ display: 'flex', flexDirection: 'column', padding: '0 12px' }}>
                  {assets.filter(a => a.type === 'saham').map(asset => (
                    <DataRow key={asset.id} asset={asset} hargaLiveIDR={hargaSaham[asset.ticker]} kursIdr={kursIdr} totalNetWorthUSD={grandTotalUSD} onEdit={setEditingAsset} />
                  ))}
                </div>

                <div style={{ padding: '24px 24px 8px', color: 'white', fontSize: '18px', fontWeight: '700' }}>Cash & Stable</div>
                <div style={{ display: 'flex', flexDirection: 'column', padding: '0 12px 20px' }}>
                  {assets.filter(a => a.type === 'stable' || a.type === 'cash_idr').map(asset => (
                    <DataRow key={asset.id} asset={asset} kursIdr={kursIdr} totalNetWorthUSD={grandTotalUSD} onEdit={setEditingAsset} />
                  ))}
                </div>
              </div>
            </>
          )}

          {activePage === 'news' && <div style={{ color: 'white', fontSize: '16px', padding: '24px' }}>Modul Market News Sedang Disempurnakan...</div>}
          {activePage === 'bot'  && <div style={{ color: 'white', fontSize: '16px', padding: '24px' }}>Modul AI Bot Trading Sedang Disempurnakan...</div>}
        </div>
      </div>

      {/* MODAL EDIT */}
      {editingAsset && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '16px', padding: '32px', width: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: '0 0 24px' }}>Edit {editingAsset.ticker}</h2>
            {editingAsset.type !== 'cash_idr' && (
              <>
                <label style={{ color: '#a3a3a3', fontSize: '13px', fontWeight: 500 }}>Average Beli ({editingAsset.type === 'saham' ? 'IDR' : 'USD'})</label>
                <input type="number" defaultValue={editingAsset.avg} id="editAvg" style={styles.modalInput} />
              </>
            )}
            <label style={{ color: '#a3a3a3', fontSize: '13px', fontWeight: 500, marginTop: '16px', display: 'block' }}>
              Jumlah ({editingAsset.type === 'saham' ? 'Lembar' : editingAsset.type === 'cash_idr' ? 'IDR' : 'Koin'})
            </label>
            <input type="number" defaultValue={editingAsset.jumlah} id="editJumlah" style={styles.modalInput} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setEditingAsset(null)} style={{ flex: 1, backgroundColor: '#262626', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Batal</button>
              <button
                onClick={() => handleSave(
                  editingAsset.id,
                  parseFloat(document.getElementById('editAvg')?.value || editingAsset.avg),
                  parseFloat(document.getElementById('editJumlah').value)
                )}
                style={{ flex: 1, backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STYLES
// ============================================
const styles = {
  sidebar: { width: 260, backgroundColor: '#0a0a0a', borderRight: '1px solid #1f1f1f', display: 'flex', flexDirection: 'column' },
  sidebarLogo: { height: 88, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 24px', borderBottom: '1px solid #1f1f1f' },
  sidebarMenu: { padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  menuItemActive: { padding: '14px 16px', backgroundColor: '#1a1a1a', color: 'white', borderRadius: '10px', cursor: 'pointer' },
  menuItem: { padding: '14px 16px', color: '#737373', borderRadius: '10px', cursor: 'pointer' },
  header: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 32 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' },
  summaryCard: { backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  periodRow: { display: 'flex', gap: 4, backgroundColor: '#1a1a1a', padding: '4px', borderRadius: '8px' },
  periodBtn: { backgroundColor: 'transparent', color: '#737373', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
  periodBtnActive: { backgroundColor: '#333', color: 'white' },
  marketCardMini: { backgroundColor: '#141414', borderRadius: '12px', padding: '12px 16px', border: '1px solid #262626', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  modernRow: { display: 'flex', padding: '16px 12px', alignItems: 'center', borderBottom: '1px solid #1f1f1f', borderRadius: '10px', margin: '4px 0' },
  actionBtn: { backgroundColor: '#1a1a1a', color: 'white', border: '1px solid #333', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  modalInput: { width: '100%', backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '10px', padding: '12px 16px', color: 'white', fontSize: '16px', outline: 'none', marginTop: '8px', boxSizing: 'border-box', fontWeight: 500 },
};

export default App;