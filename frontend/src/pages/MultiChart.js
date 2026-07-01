import React, { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL ?? '';

// ── Design tokens — matches TotalFund design system ──────────────────────────
const C = {
  bg:     '#08111F',
  card:   '#111C30',
  card2:  '#16233A',
  card3:  '#1A2C42',
  border: 'rgba(79,124,255,0.1)',
  brd2:   'rgba(79,124,255,0.22)',
  text:   '#F8FAFC',
  text2:  '#CBD5E1',
  text3:  '#94A3B8',
  text4:  '#4A5568',
  blue:   '#3B82F6',
  green:  '#22C55E',
  red:    '#EF4444',
  yellow: '#F59E0B',
};

// ── Popular assets by category ────────────────────────────────────────────────
const POPULAR = {
  Crypto: [
    { s:'BINANCE:BTCUSDT',  n:'Bitcoin',    t:'BTC'  },
    { s:'BINANCE:ETHUSDT',  n:'Ethereum',   t:'ETH'  },
    { s:'BINANCE:SOLUSDT',  n:'Solana',     t:'SOL'  },
    { s:'BINANCE:BNBUSDT',  n:'BNB',        t:'BNB'  },
    { s:'BINANCE:XRPUSDT',  n:'XRP',        t:'XRP'  },
    { s:'BINANCE:ADAUSDT',  n:'Cardano',    t:'ADA'  },
  ],
  Stocks: [
    { s:'AMEX:SPY',         n:'S&P 500 ETF',t:'SPY'  },
    { s:'NASDAQ:AAPL',      n:'Apple',      t:'AAPL' },
    { s:'NASDAQ:MSFT',      n:'Microsoft',  t:'MSFT' },
    { s:'NASDAQ:NVDA',      n:'NVIDIA',     t:'NVDA' },
    { s:'NASDAQ:TSLA',      n:'Tesla',      t:'TSLA' },
    { s:'NASDAQ:META',      n:'Meta',       t:'META' },
  ],
  Commodity: [
    { s:'OANDA:XAUUSD',     n:'Gold',       t:'XAU'  },
    { s:'OANDA:XAGUSD',     n:'Silver',     t:'XAG'  },
    { s:'NYMEX:CL1!',       n:'Crude Oil',  t:'WTI'  },
    { s:'NYMEX:NG1!',       n:'Nat. Gas',   t:'NG'   },
    { s:'COMEX:GC1!',       n:'Gold Futures',t:'GC'  },
  ],
  Index: [
    { s:'FOREXCOM:SPXUSD',  n:'S&P 500',    t:'SPX'  },
    { s:'TVC:DJI',          n:'Dow Jones',  t:'DJI'  },
    { s:'NASDAQ:NDX',       n:'NASDAQ 100', t:'NDX'  },
    { s:'TVC:NI225',        n:'Nikkei 225', t:'N225' },
    { s:'TVC:HSI',          n:'Hang Seng',  t:'HSI'  },
  ],
  Forex: [
    { s:'FX:EURUSD',        n:'EUR/USD',    t:'EUR'  },
    { s:'FX:GBPUSD',        n:'GBP/USD',    t:'GBP'  },
    { s:'FX:USDJPY',        n:'USD/JPY',    t:'JPY'  },
    { s:'FX:AUDUSD',        n:'AUD/USD',    t:'AUD'  },
  ],
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function toTV(r) {
  const t    = (r.ticker || r.id || '').toUpperCase().replace(/\.JK$/i,'').replace(/USDT$|USD$/i,'');
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

function parseSym(tvSym) {
  if (!tvSym) return { exchange: '', ticker: tvSym || '' };
  if (tvSym.includes(':')) {
    const [ex, tk] = tvSym.split(':', 2);
    return { exchange: ex, ticker: tk };
  }
  return { exchange: '', ticker: tvSym };
}

function fmtP(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 100)   return n.toFixed(2);
  if (n >= 1)     return n.toFixed(3);
  return n.toFixed(5);
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

// ── Search Modal ──────────────────────────────────────────────────────────────
function SearchModal({ onPick, onClose }) {
  const [q,       setQ]      = useState('');
  const [results, setRes]    = useState([]);
  const [loading, setLoad]   = useState(false);
  const [tab,     setTab]    = useState('Crypto');
  const [recent,  setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mc_recent') || '[]'); } catch { return []; }
  });
  const inputRef = useRef(null);
  const timer    = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = (val) => {
    setQ(val);
    clearTimeout(timer.current);
    if (!val.trim()) { setRes([]); return; }
    setLoad(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(val)}`);
        setRes(((await r.json()).results || []).slice(0, 10));
      } catch { setRes([]); }
      finally { setLoad(false); }
    }, 280);
  };

  const pick = (sym, name) => {
    const newR = [{ sym, name }, ...recent.filter(r => r.sym !== sym)].slice(0, 6);
    try { localStorage.setItem('mc_recent', JSON.stringify(newR)); } catch {}
    setRecent(newR);
    onPick(sym, name);
    onClose();
  };

  const TABS = ['Crypto', 'Stocks', 'Commodity', 'Index', 'Forex'];

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'520px', maxWidth:'92vw', background:C.card, border:`1px solid ${C.brd2}`, borderRadius:'18px', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(79,124,255,0.08)' }}>

        {/* Search bar */}
        <div style={{ display:'flex', alignItems:'center', padding:'16px 20px', gap:'12px', borderBottom:`1px solid ${C.border}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => doSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
            placeholder="Search asset, ticker, or symbol…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:C.text, fontSize:'14px', fontWeight:500 }}
          />
          {q && <button onClick={() => doSearch('')} style={{ background:'none', border:'none', color:C.text4, cursor:'pointer', fontSize:'20px', lineHeight:1, padding:0 }}>×</button>}
          <button onClick={onClose} style={{ background:C.card3, border:`1px solid ${C.border}`, borderRadius:'6px', color:C.text3, cursor:'pointer', padding:'3px 9px', fontSize:'10px', fontWeight:700, letterSpacing:'0.05em' }}>ESC</button>
        </div>

        {/* Category tabs — only when not searching */}
        {!q && (
          <div style={{ display:'flex', gap:'4px', padding:'10px 16px', borderBottom:`1px solid ${C.border}`, overflowX:'auto' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background:    tab===t ? 'rgba(59,130,246,0.12)' : 'transparent',
                border:        `1px solid ${tab===t ? 'rgba(59,130,246,0.4)' : C.border}`,
                borderRadius:  '8px',
                padding:       '5px 14px',
                cursor:        'pointer',
                color:         tab===t ? C.blue : C.text3,
                fontSize:      '11px',
                fontWeight:    tab===t ? 700 : 500,
                transition:    'all 0.15s',
                whiteSpace:    'nowrap',
                flexShrink:    0,
              }}>{t}</button>
            ))}
          </div>
        )}

        <div style={{ maxHeight:'400px', overflowY:'auto' }}>

          {/* Search results */}
          {q && loading && <div style={{ padding:'18px 20px', color:C.text3, fontSize:'12px' }}>Searching…</div>}
          {q && !loading && results.length === 0 && <div style={{ padding:'18px 20px', color:C.text3, fontSize:'12px' }}>No results for "{q}"</div>}
          {q && results.map((r, i) => {
            const tvSym = toTV(r);
            const tkr = (r.ticker || r.id || '').toUpperCase();
            return (
              <div key={i} onClick={() => pick(tvSym, r.name || tkr)}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 20px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.card2}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {r.thumb
                  ? <img src={r.thumb} alt="" style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0 }}/>
                  : <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:C.card3, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:C.blue, fontSize:'11px', fontWeight:800 }}>{(tkr[0]||'?')}</div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:C.text, fontSize:'13px', fontWeight:600 }}>{tkr}</div>
                  <div style={{ color:C.text3, fontSize:'11px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</div>
                </div>
                <div style={{ color:C.text4, fontSize:'10px', flexShrink:0, fontFamily:'monospace' }}>{tvSym}</div>
              </div>
            );
          })}

          {/* Recent */}
          {!q && recent.length > 0 && (
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ color:C.text4, fontSize:'9.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px' }}>Recent</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {recent.map(({ sym, name }) => (
                  <button key={sym} onClick={() => pick(sym, name)} style={{
                    background:   C.card2,
                    border:       `1px solid ${C.border}`,
                    borderRadius: '8px',
                    padding:      '5px 14px',
                    cursor:       'pointer',
                    color:        C.text2,
                    fontSize:     '11px',
                    fontWeight:   600,
                    transition:   'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}
                  >
                    {sym.includes(':') ? sym.split(':')[1] : sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular by category */}
          {!q && (
            <div style={{ padding:'12px 20px 18px' }}>
              <div style={{ color:C.text4, fontSize:'9.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'10px' }}>Popular {tab}</div>
              {(POPULAR[tab] || []).map(({ s, n, t }) => (
                <div key={s} onClick={() => pick(s, n)}
                  style={{ display:'flex', alignItems:'center', gap:'12px', padding:'9px 0', cursor:'pointer', borderBottom:`1px solid ${C.border}`, transition:'opacity 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.72'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:C.card3, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:C.blue, fontSize:'11px', fontWeight:800 }}>{t[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:C.text, fontSize:'12px', fontWeight:600 }}>{t}</div>
                    <div style={{ color:C.text3, fontSize:'10.5px', marginTop:'1px' }}>{n}</div>
                  </div>
                  <div style={{ color:C.text4, fontSize:'9.5px', fontFamily:'monospace' }}>{s}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Single TradingView Panel ───────────────────────────────────────────────────
function TVPanel({ sym, name, onOpen, isActive, onActivate, mobile }) {
  const wrapRef = useRef(null);
  const [live, setLive] = useState(null);

  // Fetch live price (Binance Futures for crypto, skip others)
  useEffect(() => {
    if (!sym) return;
    let cancel = false;
    const fetch24h = async () => {
      try {
        const m = sym.match(/^BINANCE:([A-Z0-9]+)$/);
        if (!m) return;
        const r = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${m[1]}`);
        const d = await r.json();
        if (!cancel && d.lastPrice) {
          setLive({
            price:  parseFloat(d.lastPrice),
            change: parseFloat(d.priceChangePercent),
            vol:    (parseFloat(d.quoteVolume) / 1e9).toFixed(2),
          });
        }
      } catch {}
    };
    fetch24h();
    const iv = setInterval(fetch24h, 30000);
    return () => { cancel = true; clearInterval(iv); };
  }, [sym]);

  // Embed TradingView
  useEffect(() => {
    const node = wrapRef.current;
    if (!node || !sym) return;
    node.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%;"></div>';
    const s = document.createElement('script');
    s.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.type  = 'text/javascript';
    s.async = true;
    s.innerHTML = JSON.stringify({
      autosize:          true,
      symbol:            sym,
      interval:          'D',
      timezone:          'Etc/UTC',
      theme:             'dark',
      style:             '1',
      locale:            'en',
      enable_publishing: false,
      backgroundColor:   'rgba(8, 17, 31, 1)',
      gridColor:         'rgba(255, 255, 255, 0.04)',
      save_image:        false,
    });
    node.appendChild(s);
    return () => { if (node) node.innerHTML = ''; };
  // eslint-disable-next-line
  }, [sym]);

  const { exchange, ticker } = parseSym(sym);
  const pct      = live?.change;
  const pctColor = pct == null ? C.text3 : pct >= 0 ? C.green : C.red;

  // Empty state
  if (!sym) {
    return (
      <div onClick={onOpen} style={{
        height:         mobile ? '340px' : '100%',
        borderRadius:   '12px',
        border:         `1px solid ${C.border}`,
        background:     C.card,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '14px',
        cursor:         'pointer',
        transition:     'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(59,130,246,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:C.text2, fontSize:'13px', fontWeight:600 }}>Select Asset</div>
          <div style={{ color:C.text4, fontSize:'11px', marginTop:'4px' }}>Choose an asset to begin monitoring.</div>
        </div>
        <button style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.28)', borderRadius:'8px', padding:'7px 20px', color:C.blue, fontSize:'11px', fontWeight:700, cursor:'pointer' }}>Browse Assets</button>
      </div>
    );
  }

  return (
    <div
      onClick={onActivate}
      style={{
        position:      'relative',
        display:       'flex',
        flexDirection: 'column',
        height:        mobile ? '380px' : '100%',
        borderRadius:  '12px',
        overflow:      'hidden',
        border:        `1px solid ${isActive ? 'rgba(59,130,246,0.5)' : C.border}`,
        background:    C.card,
        boxShadow:     isActive
          ? '0 0 0 1px rgba(59,130,246,0.12), 0 6px 28px rgba(0,0,0,0.35)'
          : '0 2px 10px rgba(0,0,0,0.2)',
        transition:    'border-color 0.15s ease, box-shadow 0.15s ease',
        cursor:        'pointer',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)';
          e.currentTarget.style.boxShadow   = '0 4px 20px rgba(0,0,0,0.32)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.boxShadow   = '0 2px 10px rgba(0,0,0,0.2)';
        }
      }}
    >
      {/* Active top accent */}
      {isActive && <div style={{ height:'2px', background:'linear-gradient(90deg, #3B82F6, rgba(59,130,246,0) 70%)', flexShrink:0 }}/>}

      {/* Custom chart header */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        padding:       '8px 12px',
        borderBottom:  `1px solid ${C.border}`,
        background:    C.card2,
        flexShrink:    0,
        gap:           '10px',
      }}>
        {/* Left: asset info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', lineHeight:1 }}>
            <span style={{ color:C.text, fontSize:'12px', fontWeight:600, letterSpacing:'-0.01em' }}>{ticker}</span>
            {exchange && <span style={{ color:C.text4, fontSize:'8.5px', background:C.card3, borderRadius:'3px', padding:'1px 5px', fontWeight:500 }}>{exchange}</span>}
          </div>
          <div style={{ color:C.text4, fontSize:'9.5px', marginTop:'3px', fontWeight:400 }}>{name || ticker} · Daily</div>
        </div>

        {/* Right: live price (crypto only) */}
        {live && (
          <div style={{ display:'flex', alignItems:'center', gap:'14px', flexShrink:0 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:C.text, fontSize:'13px', fontWeight:700, lineHeight:1 }}>{fmtP(live.price)}</div>
              <div style={{ color:pctColor, fontSize:'10px', fontWeight:600, marginTop:'2px' }}>{pct >= 0 ? '+' : ''}{pct?.toFixed(2)}%</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:C.text4, fontSize:'9px' }}>Volume</div>
              <div style={{ color:C.text3, fontSize:'10px', fontWeight:600 }}>${live.vol}B</div>
            </div>
          </div>
        )}

        {/* Change Asset button */}
        <button
          onClick={e => { e.stopPropagation(); onOpen(); }}
          style={{
            background:   C.card3,
            border:       `1px solid ${C.border}`,
            borderRadius: '7px',
            padding:      '5px 11px',
            color:        C.text3,
            fontSize:     '10px',
            fontWeight:   600,
            cursor:       'pointer',
            whiteSpace:   'nowrap',
            flexShrink:   0,
            transition:   'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.color = C.blue; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}
        >
          Change
        </button>
      </div>

      {/* TradingView embed */}
      <div ref={wrapRef} className="tradingview-widget-container" style={{ flex:1, minHeight:0 }}/>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MultiChart() {
  const w      = useWidth();
  const mobile = w < 640;
  const cols   = mobile ? 1 : 2;

  const [panels, setPanels] = useState([
    { symbol:'BINANCE:BTCUSDT', name:'Bitcoin'  },
    { symbol:'OANDA:XAUUSD',    name:'Gold'     },
    { symbol:'AMEX:SPY',        name:'S&P 500'  },
    { symbol:'BINANCE:ETHUSDT', name:'Ethereum' },
  ]);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [editIdx,     setEditIdx]     = useState(null);
  const [lastUpdate,  setLastUpdate]  = useState(new Date().toLocaleTimeString('en-GB'));
  const [refreshKey,  setRefreshKey]  = useState(0);

  const handleRefresh = () => {
    setLastUpdate(new Date().toLocaleTimeString('en-GB'));
    setRefreshKey(k => k + 1);
  };

  // Reserve viewport height for the 2×2 grid
  const gridH = mobile ? undefined : 'calc(100vh - 210px)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* ── Page Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        {/* Icon + title */}
        <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div>
          <div style={{ color:C.text, fontSize:'18px', fontWeight:800, letterSpacing:'-0.03em', lineHeight:1 }}>Multi Chart</div>
          <div style={{ color:C.text4, fontSize:'11px', marginTop:'3px' }}>Monitor multiple assets simultaneously</div>
        </div>

        {/* Right controls */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px' }}>
          {/* Last update */}
          <div style={{ color:C.text4, fontSize:'10px', display:'flex', alignItems:'center', gap:'5px', padding:'0 4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.text4} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {lastUpdate}
          </div>

          {/* Refresh */}
          <button onClick={handleRefresh} style={{
            background:   C.card,
            border:       `1px solid ${C.border}`,
            borderRadius: '8px',
            padding:      '6px 12px',
            cursor:       'pointer',
            color:        C.text3,
            display:      'flex',
            alignItems:   'center',
            gap:          '6px',
            fontSize:     '11px',
            fontWeight:   600,
            transition:   'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
            Refresh
          </button>

          {/* Sync Layout */}
          <button style={{
            background:   C.card,
            border:       `1px solid ${C.border}`,
            borderRadius: '8px',
            padding:      '6px 12px',
            cursor:       'pointer',
            color:        C.text3,
            display:      'flex',
            alignItems:   'center',
            gap:          '6px',
            fontSize:     '11px',
            fontWeight:   600,
            transition:   'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
            Sync Layout
          </button>
        </div>
      </div>

      {/* ── 2×2 Chart Grid ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows:    mobile ? undefined : '1fr 1fr',
        gap:                 '8px',
        height:              gridH,
      }}>
        {panels.map((panel, i) => (
          <TVPanel
            key={`${refreshKey}-${i}`}
            sym={panel.symbol}
            name={panel.name}
            isActive={activeIdx === i}
            onActivate={() => setActiveIdx(i)}
            onOpen={() => setEditIdx(i)}
            mobile={mobile}
          />
        ))}
      </div>

      {/* ── Search Modal ── */}
      {editIdx !== null && (
        <SearchModal
          onPick={(sym, name) => {
            setPanels(p => p.map((panel, i) => i === editIdx ? { symbol: sym, name } : panel));
            setActiveIdx(editIdx);
          }}
          onClose={() => setEditIdx(null)}
        />
      )}
    </div>
  );
}
