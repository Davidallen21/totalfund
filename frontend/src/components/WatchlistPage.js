import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const CATEGORIES = [
  { key: 'crypto',    label: 'Crypto',    color: '#f59e0b', icon: '◆',  bg: 'rgba(245,158,11,0.12)'  },
  { key: 'saham_idx', label: 'IDX Stock', color: '#3b82f6', icon: '🇮🇩', bg: 'rgba(59,130,246,0.12)'  },
  { key: 'saham_us',  label: 'US Stock',  color: '#8b5cf6', icon: '🇺🇸', bg: 'rgba(139,92,246,0.12)'  },
  { key: 'komoditas', label: 'Komoditas', color: '#10b981', icon: '🏅', bg: 'rgba(16,185,129,0.12)'  },
];

const CURRENCY = {
  crypto:    'USD',
  saham_idx: 'IDR',
  saham_us:  'USD',
  komoditas: 'USD',
};

function fmt(price, cat) {
  if (price == null || isNaN(price)) return '-';
  if (cat === 'saham_idx') {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
  }
  if (price >= 1000) return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
  if (price >= 1)    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(price);
  return price.toFixed(6);
}

function fmtChange(c) {
  if (c == null) return '-';
  const sign = c >= 0 ? '+' : '';
  return `${sign}${c.toFixed(2)}%`;
}

function Skeleton({ width = '100%', height = 14, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      flexShrink: 0,
      ...style,
    }} />
  );
}

function MoverRow({ item, rank, isGainer, cat, isMobile }) {
  const change   = item.change ?? 0;
  const color    = isGainer ? '#4ade80' : '#f87171';
  const bgBadge  = isGainer ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)';
  const currency = CURRENCY[cat];
  const prefix   = currency === 'IDR' ? 'Rp ' : '$';

  if (isMobile) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <span style={{ color: '#444', fontSize: 11, width: 22, textAlign: 'right', flexShrink: 0 }}>{rank}</span>
        {item.thumb ? (
          <img src={item.thumb} alt="" width={26} height={26}
            style={{ borderRadius: '50%', flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1f1f1f', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, color: '#555' }}>{(item.symbol || '').slice(0, 2)}</span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#e5e5e5', fontWeight: 700, fontSize: 13 }}>{item.symbol}</span>
            <span style={{ color, fontWeight: 700, fontSize: 13 }}>{fmtChange(change)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ color: '#555', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{item.name}</span>
            <span style={{ color: '#737373', fontSize: 11 }}>{prefix}{fmt(item.price, cat)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 26px 1fr 1.2fr 1fr',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderBottom: '1px solid #141414',
      borderRadius: 6,
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color: '#3a3a3a', fontSize: 11, textAlign: 'right' }}>{rank}</span>
      {item.thumb ? (
        <img src={item.thumb} alt="" width={22} height={22}
          style={{ borderRadius: '50%' }}
          onError={e => { e.target.style.display = 'none'; }} />
      ) : (
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 8, color: '#444' }}>{(item.symbol || '').slice(0, 2)}</span>
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#e5e5e5', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.symbol}</div>
        <div style={{ color: '#404040', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
      </div>
      <div style={{ textAlign: 'right', color: '#a3a3a3', fontSize: 12 }}>
        {prefix}{fmt(item.price, cat)}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 8px', borderRadius: 5,
          background: bgBadge, color,
          fontWeight: 700, fontSize: 12,
        }}>{fmtChange(change)}</span>
      </div>
    </div>
  );
}

function MoverPanel({ title, items, isGainer, cat, isMobile, loading, scanned }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 20);

  const headerColor = isGainer ? '#4ade80' : '#f87171';
  const borderColor = isGainer ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)';
  const headerBg    = isGainer ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)';

  return (
    <div style={{
      background: '#111',
      borderRadius: 14,
      border: `1px solid ${borderColor}`,
      overflow: 'hidden',
      flex: 1,
      minWidth: 0,
    }}>
      {/* Panel header */}
      <div style={{
        background: headerBg,
        borderBottom: `1px solid ${borderColor}`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>{isGainer ? '🟢' : '🔴'}</span>
          <span style={{ color: headerColor, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>{title}</span>
        </div>
        {scanned > 0 && (
          <span style={{ color: '#333', fontSize: 11 }}>dari {scanned.toLocaleString()} aset</span>
        )}
      </div>

      {/* Column header (desktop) */}
      {!isMobile && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 26px 1fr 1.2fr 1fr',
          gap: 10,
          padding: '6px 12px',
          borderBottom: '1px solid #1a1a1a',
        }}>
          {['#', '', 'Aset', 'Harga', '24h %'].map((h, i) => (
            <span key={i} style={{
              color: '#2e2e2e', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              textAlign: i >= 3 ? 'right' : i === 0 ? 'right' : 'left',
            }}>{h}</span>
          ))}
        </div>
      )}

      {/* Rows */}
      <div>
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ padding: '9px 14px', borderBottom: '1px solid #141414', display: 'flex', gap: 10, alignItems: 'center' }}>
              <Skeleton width={20} height={11} />
              <Skeleton width={22} height={22} style={{ borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton width="50%" height={12} />
                <Skeleton width="35%" height={10} />
              </div>
              <Skeleton width={60} height={12} />
            </div>
          ))
        ) : items.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#333', fontSize: 13 }}>
            Tidak ada data
          </div>
        ) : (
          shown.map((item, i) => (
            <MoverRow
              key={(item.symbol || '') + i}
              item={item}
              rank={i + 1}
              isGainer={isGainer}
              cat={cat}
              isMobile={isMobile}
            />
          ))
        )}
      </div>

      {/* Expand / collapse */}
      {!loading && items.length > 20 && (
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            padding: '10px 16px',
            textAlign: 'center',
            color: '#3a3a3a',
            fontSize: 12,
            cursor: 'pointer',
            borderTop: '1px solid #1a1a1a',
            transition: 'color 0.15s',
            userSelect: 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#737373'}
          onMouseLeave={e => e.currentTarget.style.color = '#3a3a3a'}
        >
          {expanded ? '▲ Sembunyikan' : `▼ Lihat semua ${items.length} aset`}
        </div>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  const [activeTab, setActiveTab]   = useState('crypto');
  const [data, setData]             = useState({});
  const [loading, setLoading]       = useState({ crypto: true, saham_idx: true, saham_us: true, komoditas: true });
  const [lastUpdate, setLastUpdate] = useState({});
  const [isMobile, setIsMobile]     = useState(window.innerWidth <= 768);
  const timerRef                    = useRef(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // tick every 30s to update "X menit yang lalu"
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchCategory = useCallback(async (cat) => {
    setLoading(prev => ({ ...prev, [cat]: true }));
    try {
      const res  = await fetch(`${API_BASE}/api/market-movers?category=${cat}&limit=50`);
      const json = await res.json();
      setData(prev => ({ ...prev, [cat]: json }));
      setLastUpdate(prev => ({ ...prev, [cat]: new Date() }));
    } catch (e) {
      console.error('fetch movers', cat, e);
    } finally {
      setLoading(prev => ({ ...prev, [cat]: false }));
    }
  }, []);

  useEffect(() => {
    CATEGORIES.forEach(c => fetchCategory(c.key));
  }, [fetchCategory]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    timerRef.current = setInterval(() => {
      CATEGORIES.forEach(c => fetchCategory(c.key));
    }, 5 * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [fetchCategory]);

  const catData   = data[activeTab] || {};
  const gainers   = catData.gainers || [];
  const losers    = catData.losers  || [];
  const scanned   = catData.total_scanned || 0;
  const isLoading = loading[activeTab] ?? true;
  const updatedAt = lastUpdate[activeTab];

  function timeAgo(d) {
    if (!d) return null;
    const sec = Math.floor((new Date() - d) / 1000);
    if (sec < 60)  return `${sec}d yang lalu`;
    const min = Math.floor(sec / 60);
    if (min < 60)  return `${min}m yang lalu`;
    return `${Math.floor(min / 60)}j yang lalu`;
  }

  const avgGainer = gainers.length > 0
    ? gainers.slice(0, 10).reduce((a, b) => a + (b.change || 0), 0) / Math.min(gainers.length, 10)
    : null;
  const avgLoser = losers.length > 0
    ? losers.slice(0, 10).reduce((a, b) => a + (b.change || 0), 0) / Math.min(losers.length, 10)
    : null;

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: '#e5e5e5', fontWeight: 800, fontSize: isMobile ? 20 : 26, margin: 0, letterSpacing: '-0.02em' }}>
            Top Movers
          </h1>
          <p style={{ color: '#444', fontSize: 12, margin: '4px 0 0', fontWeight: 400 }}>
            Gainers &amp; losers terbesar hari ini — diperbarui setiap 5 menit
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {updatedAt && (
            <span style={{ color: '#333', fontSize: 11 }}>{timeAgo(updatedAt)}</span>
          )}
          <button
            onClick={() => CATEGORIES.forEach(c => fetchCategory(c.key))}
            style={{
              background: '#151515',
              border: '1px solid #222',
              borderRadius: 8,
              color: '#555',
              fontSize: 12,
              padding: '6px 13px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = '#333'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#222'; }}
          >
            ↺ Refresh Semua
          </button>
        </div>
      </div>

      {/* Category tabs — same style as MarketOverview (underline) */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 18,
        borderBottom: '1px solid #1f1f1f',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(cat => {
          const isActive   = activeTab === cat.key;
          const isSpinning = loading[cat.key];
          const count      = data[cat.key]?.total_scanned || 0;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              style={{
                background:   'transparent',
                border:       'none',
                color:        isActive ? cat.color : '#484848',
                fontWeight:   isActive ? 700 : 500,
                fontSize:     13,
                cursor:       'pointer',
                padding:      '8px 18px 10px',
                borderBottom: isActive ? `2px solid ${cat.color}` : '2px solid transparent',
                marginBottom: -1,
                transition:   'all 0.15s',
                whiteSpace:   'nowrap',
                display:      'flex',
                alignItems:   'center',
                gap:          6,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#aaa'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#484848'; }}
            >
              <span style={{ fontSize: 14 }}>{cat.icon}</span>
              {cat.label}
              {isSpinning ? (
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  border: `2px solid ${isActive ? cat.color : '#333'}`,
                  borderTopColor: 'transparent',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : count > 0 && (
                <span style={{
                  background:   isActive ? cat.color + '18' : '#1a1a1a',
                  color:        isActive ? cat.color : '#444',
                  fontSize:     10,
                  padding:      '1px 6px',
                  borderRadius: 10,
                  fontWeight:   600,
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {[
          { label: 'Aset Dipindai', value: scanned > 0 ? `${scanned.toLocaleString()} aset` : '-', color: '#555' },
          { label: 'Rata-rata Top-10 Gainers', value: avgGainer != null ? fmtChange(avgGainer) : '-', color: '#4ade80' },
          { label: 'Rata-rata Top-10 Losers',  value: avgLoser  != null ? fmtChange(avgLoser)  : '-', color: '#f87171' },
          { label: 'Best Gainer',  value: gainers[0] ? `${gainers[0].symbol} ${fmtChange(gainers[0].change)}` : '-', color: '#4ade80' },
          { label: 'Worst Loser',  value: losers[0]  ? `${losers[0].symbol} ${fmtChange(losers[0].change)}`  : '-', color: '#f87171' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#0f0f0f', border: '1px solid #1a1a1a',
            borderRadius: 10, padding: '10px 16px', minWidth: 120,
          }}>
            <div style={{ color: '#2e2e2e', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{s.label}</div>
            <div style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>
              {isLoading ? <Skeleton width={64} height={14} /> : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Gainers / Losers panels */}
      <div style={{
        display: 'flex', gap: 14,
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'stretch',
      }}>
        <MoverPanel
          title="TOP GAINERS"
          items={gainers}
          isGainer={true}
          cat={activeTab}
          isMobile={isMobile}
          loading={isLoading}
          scanned={scanned}
        />
        <MoverPanel
          title="TOP LOSERS"
          items={losers}
          isGainer={false}
          cat={activeTab}
          isMobile={isMobile}
          loading={isLoading}
          scanned={scanned}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
