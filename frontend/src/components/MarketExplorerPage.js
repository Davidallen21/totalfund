import React, { useState, useEffect, useRef } from 'react';
import TradingViewWidget from './TradingViewWidget';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WATCHLIST_KEY = 'totalfund_watchlist';

const TYPE_COLOR = { crypto: '#f59e0b', stock_idx: '#3b82f6', stock_us: '#ec4899', stock: '#ec4899', index: '#10b981' };
const TYPE_LABEL = { crypto: 'Crypto', stock_idx: 'IDX', stock_us: 'US', stock: 'US', index: 'Index' };

const GROUPS = [
  { id: 'crypto',    label: 'Crypto',    types: ['crypto'] },
  { id: 'saham_idx', label: 'Saham IDX', types: ['stock_idx'] },
  { id: 'saham_us',  label: 'US Stock',  types: ['stock_us', 'stock', 'index'] },
];

export default function MarketExplorerPage({ t }) {
  const [query, setQuery]               = useState('');
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [activeAsset, setActiveAsset]   = useState(null); // { symbol, name, type }
  const [results, setResults]           = useState([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [watchlist, setWatchlist]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []; }
    catch { return []; }
  });
  const searchTimeout = useRef(null);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    if (!activeSymbol && watchlist.length > 0) {
      setActiveSymbol(watchlist[0].tvSymbol);
      setActiveAsset(watchlist[0]);
    }
  }, [watchlist, activeSymbol]);

  // Search debounce
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

  // Kelompokkan watchlist per grup
  const groupedWatchlist = GROUPS.map(g => ({
    ...g,
    items: watchlist.filter(w => g.types.includes(w.type))
  })).filter(g => g.items.length > 0);

  const totalAssets = watchlist.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '16px', paddingBottom: '20px' }}>

      {/* ── Header ── */}
      <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
        {t('market_explorer') || 'Market Explorer'}
      </h2>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari aset... (BTC, AAPL, BBCA)"
          style={{
            width: '100%', padding: '13px 40px 13px 16px', borderRadius: '12px',
            background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer'
          }}>✕</button>
        )}

        {/* ── Dropdown search ── */}
        {query && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
            backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.7)', maxHeight: '300px', overflowY: 'auto'
          }}>
            {isSearching ? (
              <div style={{ padding: '14px 16px', color: '#555', fontSize: '13px' }}>⏳ Mencari...</div>
            ) : results.length === 0 ? (
              <div style={{ padding: '14px 16px', color: '#555', fontSize: '13px' }}>Tidak ditemukan</div>
            ) : results.map((item, i) => {
              const alreadyAdded = !!watchlist.find(w => w.tvSymbol === item.tvSymbol);
              const col = TYPE_COLOR[item.type] || '#737373';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderBottom: '1px solid #1a1a1a', transition: 'background 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
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
                      color: '#4ade80', fontSize: '16px',
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

      {/* ── Watchlist grouped ── */}
      {totalAssets === 0 && !query ? (
        <div style={{
          padding: '18px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)',
          backgroundColor: '#0d0d0d', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0
        }}>
          <span style={{ fontSize: '22px' }}>⭐</span>
          <div>
            <div style={{ color: '#e5e5e5', fontSize: '14px', fontWeight: 600 }}>Watchlist kosong</div>
            <div style={{ color: '#555', fontSize: '12px', marginTop: '3px' }}>
              Cari aset di atas lalu tekan <b style={{ color: '#4ade80' }}>+</b> untuk tambahkan
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          {groupedWatchlist.map(group => (
            <div key={group.id}>
              {/* Label group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: TYPE_COLOR[group.types[0]] || '#737373' }} />
                <span style={{ color: '#606060', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {group.label}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.05), transparent)' }} />
                <span style={{ color: '#404040', fontSize: '10px', fontWeight: 600 }}>{group.items.length}</span>
              </div>

              {/* Chip aset — lebar fixed 120px, konsisten */}
              <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
                {group.items.map((item, idx) => {
                  const isActive = activeSymbol === item.tvSymbol;
                  const col = TYPE_COLOR[item.type] || '#737373';
                  const displaySymbol = item.symbol.replace('.JK', '');
                  return (
                    <div
                      key={idx}
                      onClick={() => selectAsset(item)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '120px', flexShrink: 0,
                        background: isActive ? '#1a1a1a' : '#141414',
                        border: `1px solid ${isActive ? col : 'rgba(255,255,255,0.06)'}`,
                        padding: '8px 8px 8px 11px', borderRadius: '10px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isActive ? `0 0 0 1px ${col}33` : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <span style={{ color: isActive ? '#fff' : '#d4d4d4', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displaySymbol}</span>
                        <span style={{ color: '#555', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removeFromWatchlist(item.tvSymbol); }}
                        style={{
                          width: 17, height: 17, borderRadius: '5px', border: 'none', flexShrink: 0,
                          backgroundColor: 'transparent', color: '#383838', fontSize: '11px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginLeft: '4px', transition: 'color 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = '#383838'}
                        title="Hapus dari watchlist"
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Chart area dengan label aset aktif ── */}
      <div style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Label aset aktif di atas chart */}
        {activeAsset && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              backgroundColor: TYPE_COLOR[activeAsset.type] || '#737373'
            }} />
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              {activeAsset.symbol.replace('.JK', '')}
            </span>
            <span style={{ color: '#606060', fontSize: '13px', fontWeight: 500 }}>
              {activeAsset.name}
            </span>
            <span style={{
              fontSize: '10px', fontWeight: 700, marginLeft: '2px',
              color: TYPE_COLOR[activeAsset.type] || '#737373',
              backgroundColor: (TYPE_COLOR[activeAsset.type] || '#737373') + '22',
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
            border: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#141414',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '40px' }}>📈</span>
            <span style={{ color: '#a3a3a3', fontSize: '14px', fontWeight: 600 }}>
              Tambah aset ke watchlist untuk melihat chart
            </span>
          </div>
        )}
      </div>
    </div>
  );
}