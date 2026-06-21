import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

const TYPE_COLOR = { crypto: '#f59e0b', saham_idx: '#3b82f6', saham_us: '#ec4899', komoditas: '#eab308' };

const CATEGORIES = [
  { id: 'crypto',     label: 'Crypto',      shortLabel: 'Crypto',  icon: '◆', currency: 'usd' },
  { id: 'saham_idx',  label: 'Saham IDX',   shortLabel: 'IDX',     icon: '🇮🇩', currency: 'idr' },
  { id: 'saham_us',   label: 'Saham US',    shortLabel: 'US',      icon: '🇺🇸', currency: 'usd' },
  { id: 'komoditas',  label: 'Commodities', shortLabel: 'Comdty',  icon: '●', currency: 'usd' },
];

function formatPrice(price, currency) {
  if (price === null || price === undefined) return '—';
  if (currency === 'idr') {
    return 'Rp' + price.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  }
  if (price < 1) return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return '$' + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// ── KOMPONEN UI SHARED ──
function CardSkeleton() {
  return (
    <div style={{ backgroundColor: '#141414', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '180px' }}>
      <div className="skeleton" style={{ width: '60%', height: '70px', borderRadius: '70px 70px 0 0' }} />
      <div className="skeleton" style={{ width: '40%', height: '20px' }} />
    </div>
  );
}

function SentimentGauge({ value, label, sublabel, colorStops }) {
  const size = 150;
  const hasValue = typeof value === 'number';
  const pct = hasValue ? Math.min(Math.max(value, 0), 100) : 0;

  const angle = -90 + (pct / 100) * 180;
  const needleRad = (angle * Math.PI) / 180;
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 12;
  const needleX = cx + r * 0.78 * Math.sin(needleRad);
  const needleY = cy - r * 0.78 * Math.cos(needleRad);

  const describeArc = (startAngle, endAngle) => {
    const toRad = (a) => ((a - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'center' }}>
      <svg width={size} height={size / 1.8} viewBox={`0 0 ${size} ${size / 1.8 + 5}`}>
        {colorStops.map((seg, i) => (
          <path key={i} d={describeArc(seg.from * 1.8, seg.to * 1.8)} stroke={seg.color} strokeWidth="8" fill="none" strokeLinecap="round" opacity={hasValue ? 1 : 0.25} />
        ))}
        {hasValue && (
          <>
            <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r="4" fill="#fff" />
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', marginTop: '-6px' }}>
        <div style={{ color: hasValue ? '#fff' : '#454545', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          {hasValue ? value : '—'}
        </div>
        <div style={{ color: '#a3a3a3', fontSize: '11px', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>{label}</div>
        {sublabel && <div style={{ color: '#555', fontSize: '10px', marginTop: '2px' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function MoverRow({ item, currency, color }) {
  const isUp = item.change >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, flexShrink: 0, overflow: 'hidden' }}>
        {item.thumb ? <img src={item.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : item.symbol?.substring(0, 2)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{item.symbol?.replace('.JK', '')}</div>
        {item.name && <div style={{ color: '#555', fontSize: '10.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: '#d4d4d4', fontSize: '12px', fontWeight: 600 }}>{formatPrice(item.price, currency)}</div>
        <div style={{ color: isUp ? '#4ade80' : '#f87171', fontSize: '11.5px', fontWeight: 700, marginTop: '1px' }}>
          {isUp ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function MoversSkeleton() {
  return (
    <div style={{ padding: '8px 14px' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
          <div className="skeleton" style={{ width: 26, height: 26, borderRadius: '50%' }} />
          <div className="skeleton" style={{ flex: 1, height: 14 }} />
          <div className="skeleton" style={{ width: 60, height: 14 }} />
        </div>
      ))}
    </div>
  );
}

// ── WIDGETS KHUSUS CRYPTO ──

// Widget baru menggunakan endpoint prices yang udah terbukti WORK!
function MarketLeaders({ data }) {
  const btc = data?.find(d => d.symbol === 'BTCUSDT') || { lastPrice: 0, priceChangePercent: 0 };
  const eth = data?.find(d => d.symbol === 'ETHUSDT') || { lastPrice: 0, priceChangePercent: 0 };

  const renderCoinCard = (title, coinData) => {
    const isUp = Number(coinData.priceChangePercent) >= 0;
    const color = isUp ? '#4ade80' : '#f87171';
    const bg = isUp ? `linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(74,222,128,0.02) 100%)` 
                    : `linear-gradient(135deg, rgba(248,113,113,0.12) 0%, rgba(248,113,113,0.02) 100%)`;

    return (
      <div style={{ flex: 1, background: bg, border: `1px solid ${color}30`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#fff', fontSize: '15px', fontWeight: 800 }}>{title}</span>
          <span style={{ color: color, fontSize: '11px', fontWeight: 700, backgroundColor: `${color}15`, padding: '2px 6px', borderRadius: '4px' }}>
            {isUp ? '+' : ''}{Number(coinData.priceChangePercent).toFixed(2)}%
          </span>
        </div>
        <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          ${Number(coinData.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ color: '#a3a3a3', fontSize: '11px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>Market Leaders</div>
      <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
        {renderCoinCard('BTC', btc)}
        {renderCoinCard('ETH', eth)}
      </div>
    </div>
  );
}

function LongShortRatio({ data }) {
  const longPct = data?.longPct || 50;
  const shortPct = data?.shortPct || 50;
  
  const formatOI = (val) => {
    if (!val) return '—';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    return `$${(val / 1e6).toFixed(2)}M`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
      <div style={{ color: '#a3a3a3', fontSize: '11px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
        <span>Long/Short Ratio</span>
        <span style={{ color: '#555' }}>Binance (BTC)</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <div style={{ color: '#4ade80', fontSize: '22px', fontWeight: 800 }}>{longPct}% <span style={{fontSize:'12px', color:'#a3a3a3'}}>Long</span></div>
        <div style={{ color: '#f87171', fontSize: '16px', fontWeight: 700 }}><span style={{fontSize:'11px', color:'#a3a3a3'}}>Short</span> {shortPct}%</div>
      </div>

      <div style={{ width: '100%', height: '8px', backgroundColor: '#1e1e1e', borderRadius: '4px', display: 'flex', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ width: `${longPct}%`, height: '100%', backgroundColor: '#4ade80' }} />
        <div style={{ width: `${shortPct}%`, height: '100%', backgroundColor: '#f87171' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#737373', backgroundColor: '#1a1a1a', padding: '8px', borderRadius: '6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>Total Open Interest</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '12px' }}>{formatOI(data?.openInterestUSD)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span>Live Data</span>
          <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '12px' }}>Active ●</span>
        </div>
      </div>
    </div>
  );
}

// ── HALAMAN UTAMA ──
export default function MarketOverviewPage({ t }) {
  const getText = (key, fallback) => (t && t(key) !== key) ? t(key) : fallback;

  const width = useWindowSize();
  const isMobile = width <= 768;

  const [activeTab, setActiveTab] = useState(CATEGORIES[0].id);

  // State Sentimen General
  const [fearGreed, setFearGreed]   = useState(null);
  const [altseason, setAltseason]   = useState(null);
  const [btcDom, setBtcDom]         = useState(null);
  const [sentimentLoaded, setSentimentLoaded] = useState(false);

  // State Fitur Pro Crypto (Market Leaders & Futures)
  const [leadersData, setLeadersData] = useState([]);
  const [futuresData, setFuturesData] = useState(null);

  // State Movers
  const [moversByCategory, setMoversByCategory] = useState({});
  const [moversLoading, setMoversLoading]       = useState({});

  // 1. Fetch Data Sentimen & Fitur Pro Crypto
  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/market-overview-summary`);
        const data = await res.json();
        setFearGreed(data.fear_greed || null);
        setAltseason(data.altseason || null);
        setBtcDom(data.btc_dominance || null);
      } catch (e) {}
      setSentimentLoaded(true);
    };

    const fetchProCrypto = async () => {
      try {
        // Panggil endpoint yang udah terbukti 200 OK di terminal lu
        const resLeaders = await fetch(`${API_BASE}/api/crypto-prices?symbols=BTCUSDT,ETHUSDT`);
        if(resLeaders.ok) {
          setLeadersData(await resLeaders.json());
        }
        
        // Panggil endpoint futures yang baru ditambahin ke bot.py
        const resFut = await fetch(`${API_BASE}/api/crypto-futures-data`);
        if(resFut.ok) {
          setFuturesData(await resFut.json());
        }
      } catch (e) {}
    };

    fetchSentiment();
    fetchProCrypto();
    
    // Refresh tiap 5 menit
    const int1 = setInterval(fetchSentiment, 5 * 60 * 1000);
    const int2 = setInterval(fetchProCrypto, 5 * 60 * 1000);
    return () => { clearInterval(int1); clearInterval(int2); };
  }, []);

  // 2. Fetch Data Movers secara Lazy
  const fetchMovers = useCallback(async (category) => {
    setMoversLoading(prev => ({ ...prev, [category]: true }));
    try {
      const res  = await fetch(`${API_BASE}/api/market-movers?category=${category}&limit=6`);
      const data = await res.json();
      setMoversByCategory(prev => ({ ...prev, [category]: data }));
    } catch (e) {
      setMoversByCategory(prev => ({ ...prev, [category]: { gainers: [], losers: [], error: true } }));
    }
    setMoversLoading(prev => ({ ...prev, [category]: false }));
  }, []);

  useEffect(() => {
    if (!moversByCategory[activeTab] && !moversLoading[activeTab]) {
      fetchMovers(activeTab);
    }
  }, [activeTab, moversByCategory, moversLoading, fetchMovers]);

  const currentCategory = CATEGORIES.find(c => c.id === activeTab);
  const currentMovers    = moversByCategory[activeTab];
  const isCurrentLoading = moversLoading[activeTab];

  // Kalkulasi Market Heat untuk Non-Crypto
  let marketHeatValue = 50, marketHeatLabel = 'Neutral', topGainerPct = 0;
  if (activeTab !== 'crypto' && currentMovers?.gainers && currentMovers?.losers) {
    const sumGain = currentMovers.gainers.reduce((acc, v) => acc + v.change, 0);
    const sumLoss = Math.abs(currentMovers.losers.reduce((acc, v) => acc + v.change, 0));
    if (sumGain + sumLoss > 0) {
      marketHeatValue = Math.round((sumGain / (sumGain + sumLoss)) * 100);
      marketHeatLabel = marketHeatValue >= 60 ? 'Bullish' : marketHeatValue <= 40 ? 'Bearish' : 'Neutral';
    }
    if (currentMovers.gainers.length > 0) topGainerPct = currentMovers.gainers[0].change;
  }

  // ── RENDER DYNAMIC WIDGETS DENGAN GRID STACKING ──
  const renderDynamicWidgets = () => {
    const gridStyle = {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
      gap: '16px',
      width: '100%'
    };

    const cardStyle = {
      backgroundColor: '#141414', borderRadius: '16px', padding: '18px',
      border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
      minHeight: '180px'
    };

    if (!sentimentLoaded && activeTab === 'crypto') {
      return <div style={gridStyle}><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>;
    }

    if (activeTab === 'crypto') {
      return (
        <div style={gridStyle}>
          {/* BARIS 1 */}
          <div style={cardStyle}>
            <SentimentGauge
              value={fearGreed?.value ?? null}
              label="Fear & Greed"
              sublabel={fearGreed?.classification || '—'}
              colorStops={[{ from: 0, to: 20, color: '#dc2626' }, { from: 20, to: 40, color: '#f97316' }, { from: 40, to: 60, color: '#eab308' }, { from: 60, to: 80, color: '#84cc16' }, { from: 80, to: 100, color: '#16a34a' }]}
            />
          </div>
          <div style={cardStyle}>
            <SentimentGauge
              value={altseason?.value ?? null}
              label="Altseason Index"
              sublabel={altseason?.classification || '—'}
              colorStops={[{ from: 0, to: 25, color: '#f59e0b' }, { from: 25, to: 75, color: '#6b7280' }, { from: 75, to: 100, color: '#8b5cf6' }]}
            />
          </div>
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#a3a3a3', fontSize: '11px', fontWeight: 700, marginBottom: '10px', textTransform:'uppercase' }}>BTC Dominance</div>
            <div style={{ color: '#f59e0b', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '12px' }}>
              {btcDom?.btc_dominance ?? '—'}{btcDom?.btc_dominance ? '%' : ''}
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#252525', borderRadius: '999px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ width: `${btcDom?.btc_dominance || 0}%`, height: '100%', backgroundColor: '#f59e0b' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', backgroundColor: '#1a1a1a', padding: '8px', borderRadius:'6px' }}>
              <span>ETH Dom: <b style={{color:'#d4d4d4'}}>{btcDom?.eth_dominance ?? '—'}%</b></span>
              {btcDom?.total_market_cap_usd && <span>Cap: <b style={{color:'#d4d4d4'}}>${(btcDom.total_market_cap_usd / 1e12).toFixed(2)}T</b></span>}
            </div>
          </div>

          {/* BARIS 2: Fitur Pro */}
          <div style={{ ...cardStyle, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
            <MarketLeaders data={leadersData} />
          </div>
          <div style={cardStyle}>
            <LongShortRatio data={futuresData} />
          </div>
        </div>
      );
    } else {
      // Saham & Komoditas
      return (
        <div style={gridStyle}>
          <div style={cardStyle}>
            <SentimentGauge
              value={marketHeatValue} label={`${currentCategory.shortLabel} Sector Heat`} sublabel={marketHeatLabel}
              colorStops={[{ from: 0, to: 40, color: '#dc2626' }, { from: 40, to: 60, color: '#eab308' }, { from: 60, to: 100, color: '#16a34a' }]}
            />
          </div>
          <div style={cardStyle}>
            <SentimentGauge
              value={Math.min(Math.round(topGainerPct * 5), 100)} label="Top Mover Strength" sublabel={`Max Gain: +${topGainerPct.toFixed(1)}%`}
              colorStops={[{ from: 0, to: 33, color: '#3b82f6' }, { from: 33, to: 66, color: '#8b5cf6' }, { from: 66, to: 100, color: '#ec4899' }]}
            />
          </div>
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#a3a3a3', fontSize: '11px', fontWeight: 700, marginBottom: '10px', textTransform:'uppercase' }}>Market Breadth Scan</div>
            <div style={{ color: TYPE_COLOR[activeTab], fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>
              {currentMovers?.total_scanned ?? '—'}
            </div>
            <div style={{ color: '#d4d4d4', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>Assets Monitored</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', backgroundColor: '#1a1a1a', padding: '8px', borderRadius:'6px' }}>
              <span>Live Scanning Mode</span>
              <span style={{ color: '#4ade80', fontWeight:'bold' }}>● Active</span>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>

      {/* ── Header ── */}
      <div>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Market Overview
        </h2>
        <div style={{ color: '#737373', fontSize: '13px', fontWeight: 500 }}>
          Analisis sentimen, pergerakan dana, dan aset penggerak pasar
        </div>
      </div>

      {/* ── TAB KATEGORI ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeTab === cat.id;
          const col = TYPE_COLOR[cat.id];
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              style={{
                flex: isMobile ? '1 1 calc(50% - 8px)' : '0 1 auto', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${isActive ? col : 'rgba(255,255,255,0.06)'}`,
                background: isActive ? `linear-gradient(180deg, ${col}22, ${col}0d)` : '#141414',
                color: isActive ? '#fff' : '#737373',
                fontSize: '13px', fontWeight: 700,
                transition: 'all 0.15s', boxShadow: isActive ? `0 0 0 1px ${col}33` : 'none'
              }}
            >
              {!isMobile && <span style={{ fontSize: '11px', opacity: isActive ? 1 : 0.6 }}>{cat.icon}</span>}
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: col, opacity: isActive ? 1 : 0.5, display: isMobile ? 'block' : 'none' }} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── WIDGETS AREA ── */}
      {renderDynamicWidgets()}

      {/* ── TOP GAINERS / LOSERS AREA ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
        <div style={{ backgroundColor: '#141414', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#4ade80', fontSize: '13px' }}>▲</span>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Top Gainers</span>
            <span style={{ color: '#454545', fontSize: '11px', marginLeft: 'auto' }}>24h</span>
          </div>
          {isCurrentLoading ? <MoversSkeleton /> : currentMovers?.gainers?.length > 0 ? (
            currentMovers.gainers.map((item, i) => <MoverRow key={i} item={item} currency={currentCategory.currency} color={TYPE_COLOR[activeTab]} />)
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#555', fontSize: '12px' }}>Data tidak tersedia</div>
          )}
        </div>

        <div style={{ backgroundColor: '#141414', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#f87171', fontSize: '13px' }}>▼</span>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Top Losers</span>
            <span style={{ color: '#454545', fontSize: '11px', marginLeft: 'auto' }}>24h</span>
          </div>
          {isCurrentLoading ? <MoversSkeleton /> : currentMovers?.losers?.length > 0 ? (
            currentMovers.losers.map((item, i) => <MoverRow key={i} item={item} currency={currentCategory.currency} color={TYPE_COLOR[activeTab]} />)
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#555', fontSize: '12px' }}>Data tidak tersedia</div>
          )}
        </div>
      </div>

    </div>
  );
}