import React, { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL ?? '';
const COLORS   = ['#f59e0b', '#3b82f6', '#10b981', '#e879f9'];
const DEFAULTS = [
  'BINANCE:BTCUSDT',
  'OANDA:XAUUSD',
  'AMEX:SPY',
  'BINANCE:ETHUSDT',
];

function toTV(r) {
  const t    = (r.ticker || r.id || '').toUpperCase().replace(/\.JK$/i, '').replace(/USDT$|USD$/i, '');
  const type = (r.type || '').toLowerCase();
  if (type === 'crypto')    return `BINANCE:${t}USDT`;
  if (type === 'stock_idx') return `IDX:${t}`;
  if (type === 'commodity') {
    if (/^(GC|XAU|GOLD)/.test(t))   return 'OANDA:XAUUSD';
    if (/^(SI|XAG|SILVER)/.test(t)) return 'OANDA:XAGUSD';
    if (/^(CL|BZ|OIL)/.test(t))     return 'NYMEX:CL1!';
  }
  return r.yahoo_symbol || t;
}

function TVPanel({ color, defaultSymbol, mobile }) {
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);
  const tmrRef   = useRef(null);

  const [symbol,  setSymbol]  = useState(defaultSymbol);
  const [editing, setEditing] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    node.innerHTML = '<div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%;"></div>';
    const s = document.createElement('script');
    s.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.type  = 'text/javascript';
    s.async = true;
    s.innerHTML = JSON.stringify({
      autosize:          true,
      symbol,
      interval:          'D',
      timezone:          'Etc/UTC',
      theme:             'dark',
      style:             '1',
      locale:            'en',
      enable_publishing: false,
      backgroundColor:   'rgba(11, 12, 17, 1)',
      gridColor:         'rgba(255, 255, 255, 0.04)',
      save_image:        false,
    });
    node.appendChild(s);
    return () => { if (node) node.innerHTML = ''; };
  }, [symbol]);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const doSearch = (q) => {
    setSearchQ(q);
    clearTimeout(tmrRef.current);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    tmrRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
        setResults(((await r.json()).results || []).slice(0, 8));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 280);
  };

  const pick    = (r)  => { setSymbol(toTV(r)); closeEdit(); };
  const pickRaw = ()   => { if (searchQ.trim()) { setSymbol(searchQ.trim().toUpperCase()); closeEdit(); } };
  const closeEdit = () => { setEditing(false); setSearchQ(''); setResults([]); };

  const ticker = symbol.includes(':') ? symbol.split(':')[1] : symbol;

  return (
    <div style={{
      position:      'relative',
      display:       'flex',
      flexDirection: 'column',
      height:        mobile ? '370px' : '100%',
      borderRadius:  '8px',
      overflow:      'hidden',
      border:        '1px solid rgba(255,255,255,0.07)',
      background:    '#0b0c11',
    }}>
      {/* 2px accent */}
      <div style={{ height: '2px', background: `linear-gradient(90deg, ${color}, transparent 55%)`, flexShrink: 0 }} />

      {/* Slim control strip */}
      <div style={{
        height:        '26px',
        display:       'flex',
        alignItems:    'center',
        padding:       '0 8px',
        gap:           '6px',
        background:    '#0c0d13',
        borderBottom:  '1px solid rgba(255,255,255,0.04)',
        flexShrink:    0,
      }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ color: '#2e2e2e', fontSize: '9px', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticker}</span>
        <button
          onClick={() => setEditing(true)}
          style={{
            background:    '#181818',
            border:        '1px solid #2a2a2a',
            borderRadius:  '3px',
            color:         '#555',
            fontSize:      '9px',
            padding:       '1px 7px',
            cursor:        'pointer',
            fontFamily:    'monospace',
            letterSpacing: '0.04em',
            flexShrink:    0,
          }}
        >
          change
        </button>
      </div>

      {/* TradingView chart — fills remaining height */}
      <div ref={wrapRef} className="tradingview-widget-container" style={{ flex: 1, minHeight: 0 }} />

      {/* Search overlay */}
      {editing && (
        <div
          onClick={closeEdit}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '76%', maxWidth: '320px', background: '#141418', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}>
            {/* Input row */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '8px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                value={searchQ}
                onChange={e => doSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') pickRaw(); if (e.key === 'Escape') closeEdit(); }}
                placeholder="Search or type TradingView symbol…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ddd', fontSize: '12px', fontFamily: 'monospace' }}
              />
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>✕</button>
            </div>

            {loading && <div style={{ padding: '10px 14px', color: '#333', fontSize: '9px', fontFamily: 'monospace' }}>SEARCHING…</div>}

            {results.length > 0 && (
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {results.map((r, i) => (
                  <div key={i} onClick={() => pick(r)}
                    style={{ padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {r.thumb && <img src={r.thumb} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#ddd', fontWeight: 700, fontSize: '11px', fontFamily: 'monospace' }}>{(r.ticker || r.id || '').toUpperCase()}</div>
                      <div style={{ color: '#3a3a3a', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    </div>
                    <div style={{ color: '#252525', fontSize: '8px', fontFamily: 'monospace', flexShrink: 0 }}>{toTV(r)}</div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results.length === 0 && searchQ.trim() && (
              <div style={{ padding: '10px 14px', color: '#333', fontSize: '10px', fontFamily: 'monospace' }}>
                No results — press Enter to use "{searchQ.trim().toUpperCase()}"
              </div>
            )}

            {!searchQ && (
              <div style={{ padding: '9px 14px', color: '#1e1e1e', fontSize: '9px', fontFamily: 'monospace', lineHeight: 1.9 }}>
                BTCUSDT · AAPL · TSLA · IDX:BBCA · OANDA:XAUUSD
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

export default function MultiChartPage() {
  const w      = useWidth();
  const mobile = w < 700;
  const cols   = mobile ? 1 : 2;

  // app-main: padding 32px top + 32px bottom = 64px
  // page-header: ~60px height + 28px margin-bottom = 88px
  // this component header: 26px + 6px gap = 32px
  // total ~= 184px; use 190px for safety
  const gridH = mobile ? undefined : 'calc(100vh - 190px)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

      {/* Minimal page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', gap: '3px' }}>
          {COLORS.map((c, i) => <div key={i} style={{ width: '5px', height: '5px', background: c, borderRadius: '1.5px' }} />)}
        </div>
        <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', fontFamily: 'monospace' }}>MULTI CHART</span>
        <span style={{ color: '#1a1a1a', fontSize: '9px', fontFamily: 'monospace' }}>
          {mobile ? '↓ scroll for all panels' : 'click "change" to switch symbol · timeframes & tools from TradingView toolbar'}
        </span>
      </div>

      {/* Grid */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows:    mobile ? undefined : '1fr 1fr',
        gap:                 '4px',
        height:              gridH,
      }}>
        {DEFAULTS.map((sym, i) => (
          <TVPanel key={i} color={COLORS[i]} defaultSymbol={sym} mobile={mobile} />
        ))}
      </div>
    </div>
  );
}
