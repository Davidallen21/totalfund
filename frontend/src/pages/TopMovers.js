import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL ?? '';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:      '#08111F',
  card:    '#101827',
  card2:   '#16233A',
  card3:   '#1A2C42',
  border:  'rgba(79,124,255,0.09)',
  brd2:    'rgba(79,124,255,0.16)',
  title:   '#F8FAFC',
  text:    '#CBD5E1',
  muted:   '#94A3B8',
  dim:     '#4A5568',
  green:   '#22C55E',
  red:     '#EF4444',
  blue:    '#4F7CFF',
  gold:    '#F59E0B',
  purple:  '#6366F1',
};

const SHADOW_CARD   = '0 2px 12px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.025)';
const SHADOW_HOVER  = '0 8px 28px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.03)';
const RADIUS        = 14;

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'crypto',    label: 'Crypto',    color: T.gold,   icon: '◆',  bg: 'rgba(245,158,11,0.1)'  },
  { key: 'saham_idx', label: 'IDX Stock', color: T.blue,   icon: '🇮🇩', bg: 'rgba(79,124,255,0.1)'  },
  { key: 'saham_us',  label: 'US Stock',  color: T.purple, icon: '🇺🇸', bg: 'rgba(99,102,241,0.1)'  },
  { key: 'komoditas', label: 'Komoditas', color: T.green,  icon: '🏅',  bg: 'rgba(34,197,94,0.1)'   },
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

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 14, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: `linear-gradient(90deg, ${T.card} 25%, ${T.card2} 50%, ${T.card} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'tm-shimmer 1.4s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }} />
  );
}

// ── Change Badge ──────────────────────────────────────────────────────────────
function ChangeBadge({ change, isGainer }) {
  const color  = isGainer ? T.green : T.red;
  const gbg    = isGainer ? 'rgba(34,197,94,0.14)'  : 'rgba(239,68,68,0.14)';
  const gbdr   = isGainer ? 'rgba(34,197,94,0.22)'  : 'rgba(239,68,68,0.22)';
  const glow   = isGainer ? 'rgba(34,197,94,0.08)'  : 'rgba(239,68,68,0.08)';
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      padding:      '3px 10px',
      borderRadius: 7,
      background:   `linear-gradient(135deg, ${gbg}, ${gbg}99)`,
      border:       `1px solid ${gbdr}`,
      color,
      fontWeight:   700,
      fontSize:     11.5,
      letterSpacing: '0.01em',
      boxShadow:    `0 0 10px ${glow}`,
      whiteSpace:   'nowrap',
      transition:   'all 0.18s',
    }}>
      {fmtChange(change)}
    </span>
  );
}

// ── Mover Row ─────────────────────────────────────────────────────────────────
function MoverRow({ item, rank, isGainer, cat, isMobile }) {
  const change   = item.change ?? 0;
  const currency = CURRENCY[cat];
  const prefix   = currency === 'IDR' ? 'Rp ' : '$';

  const avatarFallback = (
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: T.card2,
      border: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 8, color: T.dim, fontWeight: 700 }}>{(item.symbol || '').slice(0, 2)}</span>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 16px',
        borderBottom: `1px solid ${T.border}`,
        transition: 'background 0.18s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.background = T.card2}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ color: T.dim, fontSize: 11, width: 22, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{rank}</span>
        {item.thumb
          ? <img src={item.thumb} alt="" width={26} height={26} style={{ borderRadius: '50%', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
          : avatarFallback}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: T.title, fontWeight: 700, fontSize: 13 }}>{item.symbol}</span>
            <ChangeBadge change={change} isGainer={isGainer} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ color: T.dim, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{item.name}</span>
            <span style={{ color: T.muted, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{prefix}{fmt(item.price, cat)}</span>
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
      padding: '8px 14px',
      borderBottom: `1px solid ${T.border}`,
      transition: 'background 0.18s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => e.currentTarget.style.background = `rgba(79,124,255,0.05)`}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color: T.dim, fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{rank}</span>
      {item.thumb
        ? <img src={item.thumb} alt="" width={22} height={22} style={{ borderRadius: '50%' }} onError={e => { e.target.style.display = 'none'; }} />
        : avatarFallback}
      <div style={{ minWidth: 0 }}>
        <div style={{ color: T.title, fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.symbol}</div>
        <div style={{ color: T.dim, fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{item.name}</div>
      </div>
      <div style={{ textAlign: 'right', color: T.text, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        {prefix}{fmt(item.price, cat)}
      </div>
      <div style={{ textAlign: 'right' }}>
        <ChangeBadge change={change} isGainer={isGainer} />
      </div>
    </div>
  );
}

// ── Mover Panel ───────────────────────────────────────────────────────────────
function MoverPanel({ title, items, isGainer, cat, isMobile, loading, scanned }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 20);

  const color    = isGainer ? T.green : T.red;
  const bdrColor = isGainer ? 'rgba(34,197,94,0.18)'  : 'rgba(239,68,68,0.18)';
  const headerBg = isGainer
    ? 'linear-gradient(90deg, rgba(34,197,94,0.07) 0%, rgba(34,197,94,0.02) 100%)'
    : 'linear-gradient(90deg, rgba(239,68,68,0.07) 0%, rgba(239,68,68,0.02) 100%)';

  return (
    <div style={{
      background: T.card,
      borderRadius: RADIUS,
      border: `1px solid ${bdrColor}`,
      boxShadow: SHADOW_CARD,
      overflow: 'hidden',
      flex: 1,
      minWidth: 0,
      transition: 'box-shadow 0.2s',
    }}>
      {/* Panel header */}
      <div style={{
        background: headerBg,
        borderBottom: `1px solid ${bdrColor}`,
        padding: '13px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: isGainer ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${isGainer ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>
            {isGainer ? '▲' : '▼'}
          </div>
          <div>
            <div style={{ color, fontWeight: 800, fontSize: 12.5, letterSpacing: '0.06em' }}>{title}</div>
            {scanned > 0 && (
              <div style={{ color: T.dim, fontSize: 10, marginTop: 1 }}>dari {scanned.toLocaleString()} aset</div>
            )}
          </div>
        </div>
        <div style={{
          background: isGainer ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isGainer ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
          borderRadius: 6, padding: '3px 9px',
        }}>
          <span style={{ color, fontSize: 10, fontWeight: 700 }}>{items.length} assets</span>
        </div>
      </div>

      {/* Column headers (desktop) */}
      {!isMobile && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 26px 1fr 1.2fr 1fr',
          gap: 10,
          padding: '7px 14px',
          borderBottom: `1px solid ${T.border}`,
          background: `rgba(79,124,255,0.02)`,
        }}>
          {['#', '', 'Aset', 'Harga', '24h %'].map((h, i) => (
            <span key={i} style={{
              color: T.dim,
              fontSize: 9.5,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontWeight: 700,
              textAlign: i >= 3 ? 'right' : i === 0 ? 'right' : 'left',
            }}>{h}</span>
          ))}
        </div>
      )}

      {/* Rows */}
      <div>
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Skeleton width={20} height={11} />
              <Skeleton width={22} height={22} style={{ borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton width="50%" height={12} />
                <Skeleton width="35%" height={10} />
              </div>
              <Skeleton width={64} height={22} style={{ borderRadius: 7 }} />
            </div>
          ))
        ) : items.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: T.dim, fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>{isGainer ? '📈' : '📉'}</div>
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
            padding: '11px 16px',
            textAlign: 'center',
            color: T.dim,
            fontSize: 12,
            cursor: 'pointer',
            borderTop: `1px solid ${T.border}`,
            background: `rgba(79,124,255,0.02)`,
            transition: 'all 0.18s',
            userSelect: 'none',
            fontWeight: 600,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = `rgba(79,124,255,0.05)`; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.dim; e.currentTarget.style.background = `rgba(79,124,255,0.02)`; }}
        >
          {expanded ? '▲ Sembunyikan' : `▼ Lihat semua ${items.length} aset`}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TopMovers() {
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

  const activeCat = CATEGORIES.find(c => c.key === activeTab);

  return (
    <div style={{ padding: isMobile ? '14px 12px' : '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ color: T.title, fontWeight: 800, fontSize: isMobile ? 20 : 24, margin: 0, letterSpacing: '-0.03em' }}>
            Top Movers
          </h1>
          <p style={{ color: T.dim, fontSize: 12, margin: '4px 0 0', fontWeight: 400 }}>
            Gainers &amp; losers terbesar hari ini — diperbarui setiap 5 menit
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Meta info chips — always visible */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {[
                { icon: '🕐', label: updatedAt ? timeAgo(updatedAt) : 'Fetching...' },
                { icon: '📊', label: scanned > 0 ? `${scanned.toLocaleString()} Assets` : '282 Tickers' },
                { icon: '⚡', label: activeTab === 'crypto' ? 'CoinGecko' : activeTab === 'saham_us' ? 'Yahoo Finance' : activeTab === 'saham_idx' ? 'BEI / IDX' : 'Yahoo Futures' },
                { icon: '🔄', label: 'Auto 5m' },
              ].map((chip, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px',
                  background: T.card2,
                  border: `1px solid rgba(79,124,255,0.14)`,
                  borderRadius: 8,
                  color: T.muted,
                  fontSize: 10.5,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.01em',
                }}>
                  <span style={{ fontSize: 11 }}>{chip.icon}</span>
                  {chip.label}
                </div>
              ))}
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={() => CATEGORIES.forEach(c => fetchCategory(c.key))}
            style={{
              background: T.card2,
              border: `1px solid rgba(79,124,255,0.28)`,
              borderRadius: 9,
              color: T.text,
              fontSize: 12,
              padding: '7px 14px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.18s',
              fontWeight: 600,
              boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = T.title;
              e.currentTarget.style.borderColor = 'rgba(79,124,255,0.55)';
              e.currentTarget.style.background = T.card3;
              e.currentTarget.style.boxShadow = `0 0 14px rgba(79,124,255,0.15), 0 2px 8px rgba(0,0,0,0.25)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = T.text;
              e.currentTarget.style.borderColor = 'rgba(79,124,255,0.28)';
              e.currentTarget.style.background = T.card2;
              e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.25)';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh Semua
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 16,
        borderBottom: `1px solid ${T.border}`,
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
                background:   isActive ? `rgba(${cat.color === T.gold ? '245,158,11' : cat.color === T.blue ? '79,124,255' : cat.color === T.purple ? '99,102,241' : '34,197,94'},0.06)` : 'transparent',
                border:       'none',
                color:        isActive ? cat.color : T.dim,
                fontWeight:   isActive ? 700 : 500,
                fontSize:     13,
                cursor:       'pointer',
                padding:      '9px 20px 11px',
                borderBottom: isActive ? `2.5px solid ${cat.color}` : '2.5px solid transparent',
                marginBottom: -1,
                transition:   'all 0.18s',
                whiteSpace:   'nowrap',
                display:      'flex',
                alignItems:   'center',
                gap:          7,
                borderRadius: '6px 6px 0 0',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = T.muted;
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = T.dim;
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{cat.icon}</span>
              {cat.label}
              {isSpinning ? (
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  border: `2px solid ${isActive ? cat.color : T.dim}`,
                  borderTopColor: 'transparent',
                  display: 'inline-block',
                  animation: 'tm-spin 0.7s linear infinite',
                  flexShrink: 0,
                }} />
              ) : count > 0 && (
                <span style={{
                  background:   isActive ? `${cat.color}20` : T.card2,
                  color:        isActive ? cat.color : T.dim,
                  border:       `1px solid ${isActive ? cat.color + '35' : T.border}`,
                  fontSize:     9.5,
                  padding:      '2px 7px',
                  borderRadius: 10,
                  fontWeight:   700,
                  letterSpacing: '0.02em',
                }}>{count.toLocaleString()}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary stat strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Aset Dipindai',          value: scanned > 0 ? `${scanned.toLocaleString()}` : '-', unit: 'aset', color: activeCat?.color || T.blue },
          { label: 'Avg Top-10 Gainers',     value: avgGainer != null ? fmtChange(avgGainer) : '-',    unit: '',     color: T.green  },
          { label: 'Avg Top-10 Losers',      value: avgLoser  != null ? fmtChange(avgLoser)  : '-',    unit: '',     color: T.red    },
          { label: 'Best Gainer',            value: gainers[0] ? gainers[0].symbol : '-',              unit: gainers[0] ? fmtChange(gainers[0].change) : '', color: T.green },
          { label: 'Worst Loser',            value: losers[0]  ? losers[0].symbol  : '-',              unit: losers[0]  ? fmtChange(losers[0].change)  : '', color: T.red   },
        ].map(s => (
          <div key={s.label} style={{
            background: `linear-gradient(135deg, ${T.card} 0%, ${T.card}EE 100%)`,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: '11px 16px',
            minWidth: 120,
            boxShadow: SHADOW_CARD,
            transition: 'all 0.2s ease',
            cursor: 'default',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = SHADOW_HOVER;
              e.currentTarget.style.borderColor = `rgba(79,124,255,0.2)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = SHADOW_CARD;
              e.currentTarget.style.borderColor = T.border;
            }}
          >
            <div style={{ color: T.dim, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ color: s.color, fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>
                {isLoading ? <Skeleton width={64} height={15} /> : s.value}
              </span>
              {!isLoading && s.unit && (
                <span style={{ color: s.color, fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{s.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Gainers / Losers panels */}
      <div style={{
        display: 'flex',
        gap: 14,
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
        @keyframes tm-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes tm-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
