import React, { useState, useEffect, useRef } from 'react';
import TradingViewWidget from '../components/common/TradingViewWidget';

function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

const API_BASE = process.env.REACT_APP_API_URL ?? '';
const WATCHLIST_KEY = 'totalfund_watchlist';
const SEEDED_KEY = 'totalfund_watchlist_seeded';

const TYPE_COLOR = {
  crypto: '#f59e0b',
  stock_idx: '#3b82f6',
  stock_us: '#ec4899',
  stock: '#ec4899',
  index: '#10b981',
  commodity: '#eab308',
};
const TYPE_LABEL = {
  crypto: 'Crypto',
  stock_idx: 'IDX',
  stock_us: 'US',
  stock: 'US',
  index: 'Index',
  commodity: 'Comdty',
};

const GROUPS = [
  { id: 'crypto',      label: 'Crypto',      icon: '◆', types: ['crypto'] },
  { id: 'saham_idx',   label: 'Saham IDX',   icon: '🇮🇩', types: ['stock_idx'] },
  { id: 'saham_us',    label: 'Saham US',    icon: '🇺🇸', types: ['stock_us', 'stock', 'index'] },
  { id: 'commodities', label: 'Commodities', icon: '●', types: ['commodity'] },
];

const DEFAULT_WATCHLIST = [
  { symbol: 'BTC',  name: 'Bitcoin',            tvSymbol: 'BINANCE:BTCUSDT', type: 'crypto' },
  { symbol: 'BBCA', name: 'Bank Central Asia',  tvSymbol: 'IDX:BBCA',        type: 'stock_idx' },
  { symbol: 'NVDA', name: 'NVIDIA Corp',        tvSymbol: 'NVDA',            type: 'stock_us' },
  { symbol: 'XAU',  name: 'Gold Spot / USD',    tvSymbol: 'OANDA:XAUUSD',    type: 'commodity' },
];

export default function MarketExplorer({ t }) {
  const [query, setQuery]               = useState('');
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [activeAsset, setActiveAsset]   = useState(null);
  const [results, setResults]           = useState([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [activeTab, setActiveTab]       = useState(GROUPS[0].id);
  const [watchlist, setWatchlist]       = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY));
      if (saved && saved.length > 0) return saved;
      const alreadySeeded = localStorage.getItem(SEEDED_KEY);
      if (!alreadySeeded) return DEFAULT_WATCHLIST;
      return saved || [];
    } catch {
      return DEFAULT_WATCHLIST;
    }
  });
  const searchTimeout = useRef(null);
  const width          = useWindowSize();
  const isMobile        = width <= 480;

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    localStorage.setItem(SEEDED_KEY, '1');
  }, [watchlist]);

  useEffect(() => {
    if (!activeSymbol && watchlist.length > 0) {
      const firstInTab = watchlist.find(w => GROUPS.find(g => g.id === activeTab)?.types.includes(w.type));
      const fallback = firstInTab || watchlist[0];
      setActiveSymbol(fallback.tvSymbol);
      setActiveAsset(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const group = GROUPS.find(g => g.id === tabId);
    const firstInGroup = watchlist.find(w => group?.types.includes(w.type));
    if (firstInGroup) {
      setActiveSymbol(firstInGroup.tvSymbol);
      setActiveAsset(firstInGroup);
    }
  };

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res  = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const mapped = (data.results || []).map(item => {
          let tvSymbol = item.symbol;
          if (item.type === 'crypto')                                 tvSymbol = `BINANCE:${item.symbol}USDT`;
          else if (item.symbol.endsWith('.JK'))                       tvSymbol = `IDX:${item.symbol.replace('.JK', '')}`;
          else if (item.type === 'commodity')                         tvSymbol = item.tvSymbol || `OANDA:${item.symbol}USD`;
          else if (item.type === 'stock_us' || item.type === 'stock') tvSymbol = item.symbol;
          return { ...item, tvSymbol };
        });
        setResults(mapped);
      } catch { setResults([]); }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  const selectAsset = (item) => {
    setActiveSymbol(item.tvSymbol);
    setActiveAsset(item);
    setQuery('');
    setResults([]);
  };

  const addToWatchlist = (item) => {
    if (watchlist.find(w => w.tvSymbol === item.tvSymbol)) return;
    setWatchlist(prev => [...prev, {
      symbol: item.symbol, name: item.name,
      tvSymbol: item.tvSymbol, type: item.type
    }]);
    setQuery('');
    setResults([]);
  };

  const removeFromWatchlist = (tvSymbol) => {
    const newList = watchlist.filter(w => w.tvSymbol !== tvSymbol);
    setWatchlist(newList);
    if (activeSymbol === tvSymbol) {
      setActiveSymbol(newList.length > 0 ? newList[0].tvSymbol : null);
      setActiveAsset(newList.length > 0 ? newList[0] : null);
    }
  };

  const groupCounts = GROUPS.reduce((acc, g) => {
    acc[g.id] = watchlist.filter(w => g.types.includes(w.type)).length;
    return acc;
  }, {});

  const currentGroup = GROUPS.find(g => g.id === activeTab);
  const currentItems = watchlist.filter(w => currentGroup.types.includes(w.type));
  const totalAssets = watchlist.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '16px', paddingBottom: '20px' }}>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          {t('market_explorer') || 'Market Explorer'}
        </h2>
        <span style={{ color: '#525252', fontSize: '12px', fontWeight: 600 }}>
          {totalAssets} aset dipantau
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari aset... (BTC, AAPL, BBCA, Gold)"
          style={{
            width: '100%', padding: '13px 40px 13px 16px', borderRadius: '12px',
            background: '#16233A', border: '1px solid rgba(79,124,255,0.12)',
            color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer'
          }}>✕</button>
        )}

        {query && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
            backgroundColor: '#16233A', border: '1px solid #2a2a2a', borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.7)', maxHeight: '300px', overflowY: 'auto'
          }}>
            {isSearching ? (
              <div style={{ padding: '14px 16px', color: '#555', fontSize: '13px' }}>⏳ Mencari...</div>
            ) : results.length === 0 ? (
              <div style={{ padding: '14px 16px', color: '#555', fontSize: '13px' }}>Tidak ditemukan</div>
            ) : results.map((item, i) => {
              const alreadyAdded = !!watchlist.find(w => w.tvSymbol === item.tvSymbol);
              const col = TYPE_COLOR[item.type] || '#94A3B8';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderBottom: '1px solid #1a1a1a', transition: 'background 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1A2C42'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div onClick={() => selectAsset(item)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: col + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: col, fontWeight: 800, flexShrink: 0 }}>
                      {item.symbol?.substring(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{item.symbol}</div>
                      <div style={{ color: '#555', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: col, backgroundColor: col + '22', padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>
                      {TYPE_LABEL[item.type] || item.type}
                    </span>
                  </div>
                  <button
                    onClick={() => addToWatchlist(item)}
                    disabled={alreadyAdded}
                    style={{
                      width: 28, height: 28, borderRadius: '7px', border: 'none', flexShrink: 0,
                      backgroundColor: alreadyAdded ? 'rgba(74,222,128,0.08)' : 'rgba(74,222,128,0.15)',
                      color: '#22C55E', fontSize: '16px',
                      cursor: alreadyAdded ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                    }}
                    title={alreadyAdded ? 'Sudah di watchlist' : 'Tambah ke watchlist'}
                  >
                    {alreadyAdded ? '✓' : '+'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', gap: isMobile ? '5px' : '6px', flexShrink: 0,
        overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch',
        paddingBottom: isMobile ? '2px' : 0
      }}>
        {GROUPS.map(g => {
          const isActive = activeTab === g.id;
          const col = TYPE_COLOR[g.types[0]] || '#94A3B8';
          const count = groupCounts[g.id] || 0;
          const mobileLabel = { crypto: 'Crypto', saham_idx: 'IDX', saham_us: 'US', commodities: 'Comdty' }[g.id] || g.label;
          return (
            <button
              key={g.id}
              onClick={() => handleTabChange(g.id)}
              style={{
                flex: isMobile ? '0 0 auto' : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '5px' : '6px',
                padding: isMobile ? '8px 12px' : '10px 12px', borderRadius: '10px', cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: `1px solid ${isActive ? col : 'rgba(79,124,255,0.1)'}`,
                background: isActive ? `linear-gradient(180deg, ${col}22, ${col}0d)` : '#16233A',
                color: isActive ? '#fff' : '#94A3B8',
                fontSize: isMobile ? '12px' : '12.5px', fontWeight: 700, letterSpacing: '0.1px',
                transition: 'all 0.18s', boxShadow: isActive ? `0 0 0 1px ${col}33, 0 4px 12px ${col}1a` : 'none'
              }}
            >
              {!isMobile && <span style={{ fontSize: '11px', opacity: isActive ? 1 : 0.6 }}>{g.icon}</span>}
              {isMobile && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: col, flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />}
              <span>{isMobile ? mobileLabel : g.label}</span>
              <span style={{
                fontSize: '10px', fontWeight: 700, minWidth: '16px', textAlign: 'center',
                color: isActive ? col : '#444',
                backgroundColor: isActive ? '#0E1A2D' : 'rgba(79,124,255,0.07)',
                borderRadius: '5px', padding: '1px 5px'
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {currentItems.length === 0 && !query ? (
        <div style={{
          padding: '18px', borderRadius: '12px', border: '1px dashed rgba(79,124,255,0.12)',
          backgroundColor: '#0d0d0d', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0
        }}>
          <span style={{ fontSize: '22px' }}>{currentGroup.icon}</span>
          <div>
            <div style={{ color: '#F8FAFC', fontSize: '14px', fontWeight: 600 }}>
              Belum ada aset {currentGroup.label} di watchlist
            </div>
            <div style={{ color: '#555', fontSize: '12px', marginTop: '3px' }}>
              Cari aset di atas lalu tekan <b style={{ color: '#22C55E' }}>+</b> untuk tambahkan
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
            {currentItems.map((item, idx) => {
              const isActive = activeSymbol === item.tvSymbol;
              const col = TYPE_COLOR[item.type] || '#94A3B8';
              const displaySymbol = item.symbol.replace('.JK', '');
              return (
                <div
                  key={idx}
                  onClick={() => selectAsset(item)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '130px', flexShrink: 0,
                    background: isActive ? `linear-gradient(180deg, ${col}1f, #161616)` : '#16233A',
                    border: `1px solid ${isActive ? col : 'rgba(79,124,255,0.1)'}`,
                    padding: '9px 9px 9px 11px', borderRadius: '10px',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: isActive ? `0 0 0 1px ${col}33, 0 6px 16px ${col}1a` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: col, flexShrink: 0, boxShadow: isActive ? `0 0 6px ${col}` : 'none' }} />
                      <span style={{ color: isActive ? '#fff' : '#d4d4d4', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displaySymbol}</span>
                    </div>
                    <span style={{ color: '#555', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: '10px' }}>{item.name}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeFromWatchlist(item.tvSymbol); }}
                    style={{
                      width: 17, height: 17, borderRadius: '5px', border: 'none', flexShrink: 0,
                      backgroundColor: 'transparent', color: '#383838', fontSize: '11px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginLeft: '4px', transition: 'color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#383838'}
                    title="Hapus dari watchlist"
                  >✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activeAsset && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              backgroundColor: TYPE_COLOR[activeAsset.type] || '#94A3B8',
              boxShadow: `0 0 8px ${TYPE_COLOR[activeAsset.type] || '#94A3B8'}66`
            }} />
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              {activeAsset.symbol.replace('.JK', '')}
            </span>
            <span style={{ color: '#606060', fontSize: '13px', fontWeight: 500 }}>
              {activeAsset.name}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, marginLeft: '2px',
              color: TYPE_COLOR[activeAsset.type] || '#94A3B8',
              backgroundColor: (TYPE_COLOR[activeAsset.type] || '#94A3B8') + '22',
              padding: '3px 8px', borderRadius: '5px'
            }}>
              {TYPE_LABEL[activeAsset.type] || activeAsset.type}
            </span>
          </div>
        )}

        {activeSymbol ? (
          <div style={{ flex: 1, minHeight: '380px' }}>
            <TradingViewWidget symbol={activeSymbol} theme="dark" />
          </div>
        ) : (
          <div style={{
            flex: 1, minHeight: '380px', borderRadius: '16px',
            border: '1px solid rgba(79,124,255,0.1)', backgroundColor: '#16233A',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '40px' }}>📈</span>
            <span style={{ color: '#CBD5E1', fontSize: '14px', fontWeight: 600 }}>
              Tambah aset ke watchlist untuk melihat chart
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
