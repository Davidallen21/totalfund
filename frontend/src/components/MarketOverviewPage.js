import React, { useState, useEffect, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL ?? '';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:     '#080808',
  card:   '#0f0f0f',
  card2:  '#141414',
  card3:  '#1a1a1a',
  border: 'rgba(255,255,255,0.06)',
  brd2:   'rgba(255,255,255,0.10)',
  text:   '#e5e5e5',
  text2:  '#a3a3a3',
  text3:  '#737373',
  text4:  '#3a3a3a',
  green:  '#4ade80',
  red:    '#f87171',
  yellow: '#fbbf24',
  crypto: '#f59e0b',
  idx:    '#3b82f6',
  us:     '#a78bfa',
  comm:   '#34d399',
};

const TABS = [
  { key: 'crypto', label: 'Crypto',      color: C.crypto, icon: '◆' },
  { key: 'idx',    label: 'IDX Stocks',  color: C.idx,    icon: '🇮🇩' },
  { key: 'us',     label: 'US Stocks',   color: C.us,     icon: '🇺🇸' },
  { key: 'commod', label: 'Commodities', color: C.comm,   icon: '🏅' },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
const fmtPrice = (n, decimals = 2) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  : n >= 1   ? n.toFixed(decimals)
  : n.toFixed(4);

const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const changeColor = (n) => (n >= 0 ? C.green : C.red);

const cellColor = (chg) => {
  if (chg >=  8) return '#166534';
  if (chg >=  4) return '#15803d';
  if (chg >=  1) return '#16a34a';
  if (chg >   0) return '#166534aa';
  if (chg > - 1) return '#7f1d1daa';
  if (chg > - 4) return '#991b1b';
  if (chg > - 8) return '#b91c1c';
  return '#7f1d1d';
};

const impactColor = (s) =>
  s === 'high' ? C.red : s === 'medium' ? C.yellow : C.text3;

// ── Realtime data hook ────────────────────────────────────────────────────────
function useRealtime() {
  const [rt, setRt] = useState({
    fearGreed:    null,
    derivatives:  null,
    cryptoMovers: null,
    idxMovers:    null,
    usMovers:     null,
    commodMovers: null,
    ticker:       null,
  });

  useEffect(() => {
    const set = (key) => (data) => setRt(p => ({ ...p, [key]: data }));

    fetch(`${API_BASE}/api/market-overview-summary`)
      .then(r => r.json())
      .then(d => set('fearGreed')(d.fear_greed))
      .catch(() => {});

    fetch(`${API_BASE}/api/crypto-futures-data`)
      .then(r => r.json())
      .then(set('derivatives'))
      .catch(() => {});

    [
      ['crypto',    'cryptoMovers'],
      ['saham_idx', 'idxMovers'],
      ['saham_us',  'usMovers'],
      ['komoditas', 'commodMovers'],
    ].forEach(([cat, key]) => {
      fetch(`${API_BASE}/api/market-movers?category=${cat}&limit=20`)
        .then(r => r.json())
        .then(set(key))
        .catch(() => {});
    });
  }, []);

  // Binance WebSocket — replaces /api/ticker entirely, real-time, no rate limits
  useEffect(() => {
    const COINS  = ['BTC','ETH','SOL','BNB','XRP','AVAX','DOGE','TON','ADA','HYPE','LINK','SUI'];
    const streams = COINS.map(s => `${s.toLowerCase()}usdt@ticker`).join('/');
    const tickerMap = {};
    let ws, reconnTimer, flushTimer;

    const flush = () => {
      const ordered = COINS.filter(s => tickerMap[s]).map(s => tickerMap[s]);
      if (ordered.length) setRt(prev => ({ ...prev, ticker: ordered }));
    };

    const connect = () => {
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (!msg?.data?.s) return;
        const d = msg.data;
        const sym = d.s.replace('USDT', '');
        tickerMap[sym] = { s: sym, p: parseFloat(d.c), c: parseFloat(d.P) };
      };
      ws.onerror = () => ws.close();
      ws.onclose  = () => { reconnTimer = setTimeout(connect, 5000); };
    };

    connect();
    flushTimer = setInterval(flush, 3000);

    return () => { clearTimeout(reconnTimer); clearInterval(flushTimer); ws?.close(); };
  }, []);

  return rt;
}

// Convert backend movers item → MoverList format
const toMover = (m) => ({ s: m.symbol, name: m.name, c: m.change, p: m.price, thumb: m.thumb });

// Build running ticker items from movers data
const toTickerItems = (movers) => {
  if (!movers) return [];
  const all = [
    ...(movers.gainers || []).slice(0, 8),
    ...(movers.losers  || []).slice(0, 6),
  ];
  return all.map(m => ({ s: m.symbol, p: m.price, c: m.change }));
};

// ── Mock data (used for sections with no backend support) ─────────────────────
const MOCK = {
  crypto: {
    heatmap: [
      { s:'BTC',  c:+2.34, w:9 },{ s:'ETH',  c:+1.87, w:7 },{ s:'XRP',  c:-0.34, w:5 },
      { s:'BNB',  c:+0.95, w:4 },{ s:'SOL',  c:+4.12, w:4 },{ s:'TRX',  c:+0.12, w:3 },
      { s:'DOGE', c:+5.67, w:3 },{ s:'ADA',  c:+3.21, w:3 },{ s:'SHIB', c:+8.34, w:2 },
      { s:'AVAX', c:-1.23, w:2 },{ s:'TON',  c:+2.87, w:2 },{ s:'LINK', c:+0.87, w:2 },
      { s:'DOT',  c:-0.56, w:2 },{ s:'MATIC',c:+2.11, w:2 },{ s:'UNI',  c:+1.43, w:2 },
      { s:'ATOM', c:+0.45, w:1 },{ s:'LTC',  c:-2.34, w:1 },{ s:'NEAR', c:+3.87, w:1 },
      { s:'FIL',  c:-1.87, w:1 },{ s:'APT',  c:+2.56, w:1 },{ s:'OP',   c:+1.23, w:1 },
      { s:'ARB',  c:-0.78, w:1 },{ s:'SUI',  c:+6.34, w:1 },{ s:'HBAR', c:-1.45, w:1 },
    ],
    funding: [
      { s:'BTC', r:0.0102 },{ s:'ETH', r:0.0087 },{ s:'SOL', r:-0.0023 },{ s:'BNB', r:0.0034 },
      { s:'XRP', r:0.0156 },{ s:'DOGE',r:-0.0089 },{ s:'AVAX',r:0.0045 },{ s:'ARB', r:-0.0012 },
    ],
  },
  idx: {
    tickers: [
      { s:'IHSG', p:7234.56, c:+0.87 },{ s:'LQ45', p:1024.32, c:+0.54 },
      { s:'BBCA', p:10875,   c:+1.15 },{ s:'BBRI', p:4520,    c:-0.22 },
      { s:'BMRI', p:6875,    c:+0.73 },{ s:'BREN', p:11275,   c:+2.34 },
      { s:'TLKM', p:3120,    c:-0.96 },{ s:'ASII', p:4750,    c:+0.42 },
    ],
    foreignFlow: [
      { d:'Jun 17', v:+45.2 },{ d:'Jun 18', v:-23.4 },{ d:'Jun 19', v:+67.8 },
      { d:'Jun 20', v:+12.1 },{ d:'Jun 21', v:-34.5 },{ d:'Jun 22', v:+89.3 },{ d:'Jun 23', v:+45.1 },
    ],
    turnover: { value: 12.87, volume: 24.3, tx: 1.87 },
    sectors: [
      { name:'Finance',    c:+1.23, w:28 },{ name:'Energy',    c:+2.45, w:15 },
      { name:'Consumer',   c:-0.34, w:12 },{ name:'Technology', c:+3.21, w:8  },
      { name:'Healthcare', c:+0.87, w:7  },{ name:'Mining',     c:+1.56, w:10 },
      { name:'Telco',      c:-0.89, w:6  },{ name:'Property',   c:-1.23, w:4  },
    ],
  },
  us: {
    tickers: [
      { s:'SPX',  p:5892.43,  c:+0.43 },{ s:'NDX', p:19234.56, c:+0.78 },
      { s:'AAPL', p:234.87,   c:+1.23 },{ s:'NVDA', p:138.42,  c:+3.87 },
      { s:'TSLA', p:342.10,   c:+2.14 },{ s:'META', p:613.45,  c:+0.87 },
      { s:'MSFT', p:445.23,   c:+0.45 },{ s:'AMZN', p:215.67,  c:+1.12 },
    ],
    heatmap: [
      { s:'NVDA', c:+3.87,w:8 },{ s:'AAPL', c:+1.23,w:7 },{ s:'MSFT', c:+0.45,w:7 },
      { s:'META', c:+0.87,w:5 },{ s:'GOOGL',c:+0.67,w:5 },{ s:'AMZN', c:+1.12,w:5 },
      { s:'TSLA', c:+2.14,w:4 },{ s:'JPM',  c:-0.34,w:3 },{ s:'LLY',  c:+1.45,w:3 },
      { s:'UNH',  c:-1.23,w:3 },{ s:'XOM',  c:-0.87,w:2 },{ s:'PLTR', c:+5.67,w:2 },
      { s:'AMD',  c:+2.34,w:2 },{ s:'BA',   c:-1.45,w:2 },{ s:'NFLX', c:+0.34,w:1 },
    ],
    earnings: [
      { co:'FedEx Corp.',    tk:'FDX',  date:'Jun 24', eps:'5.34',  time:'AMC', beat:null  },
      { co:'Carnival Corp.', tk:'CCL',  date:'Jun 24', eps:'0.12',  time:'BMO', beat:true  },
      { co:'Nike Inc.',      tk:'NKE',  date:'Jun 26', eps:'0.89',  time:'AMC', beat:null  },
      { co:'Micron Tech.',   tk:'MU',   date:'Jun 25', eps:'1.48',  time:'AMC', beat:null  },
      { co:'General Mills',  tk:'GIS',  date:'Jun 25', eps:'0.98',  time:'BMO', beat:true  },
      { co:'Paychex Inc.',   tk:'PAYX', date:'Jun 25', eps:'1.14',  time:'BMO', beat:false },
    ],
  },
  commod: {
    tickers: [
      { s:'GOLD',    p:3324.50, c:+0.45, u:'/oz'    },
      { s:'SILVER',  p:36.72,   c:+1.23, u:'/oz'    },
      { s:'WTI',     p:78.43,   c:-0.87, u:'/bbl'   },
      { s:'BRENT',   p:82.17,   c:-0.65, u:'/bbl'   },
      { s:'NAT GAS', p:2.847,   c:-2.34, u:'/MMBtu' },
      { s:'COPPER',  p:4.523,   c:+1.87, u:'/lb'    },
    ],
    dxy: [
      {x:0,d:104.2,g:3180},{x:1,d:103.8,g:3220},{x:2,d:104.5,g:3198},
      {x:3,d:103.2,g:3254},{x:4,d:102.8,g:3287},{x:5,d:103.4,g:3312},
      {x:6,d:102.5,g:3345},{x:7,d:101.9,g:3378},{x:8,d:102.3,g:3356},
      {x:9,d:101.7,g:3401},{x:10,d:101.2,g:3445},{x:11,d:100.8,g:3487},
      {x:12,d:101.4,g:3467},{x:13,d:100.5,g:3498},{x:14,d:100.1,g:3524},
    ],
    macro: [
      { date:'Jun 25',event:'US GDP (Q1 Final)',   impact:'high',   prev:'+2.4%',exp:'+2.3%' },
      { date:'Jun 27',event:'US PCE Price Index',  impact:'high',   prev:'+2.8%',exp:'+2.7%' },
      { date:'Jul 9', event:'FOMC Meeting Minutes',impact:'high',   prev:'-',    exp:'-'     },
      { date:'Jul 11',event:'CPI (YoY)',           impact:'high',   prev:'+3.2%',exp:'+3.1%' },
      { date:'Jul 14',event:'Retail Sales (MoM)',  impact:'medium', prev:'+0.1%',exp:'+0.3%' },
      { date:'Jul 30',event:'FOMC Rate Decision',  impact:'high',   prev:'4.25%',exp:'Hold'  },
    ],
    perf: [
      { name:'Gold',       d1:+0.45,w1:+1.87,m1:+4.23,ytd:+18.7  },
      { name:'Silver',     d1:+1.23,w1:+3.45,m1:+6.78,ytd:+22.3  },
      { name:'Brent Crude',d1:-0.65,w1:-2.34,m1:-3.87,ytd:-8.4   },
      { name:'WTI Crude',  d1:-0.87,w1:-2.67,m1:-4.12,ytd:-9.1   },
      { name:'Natural Gas',d1:-2.34,w1:+1.23,m1:-8.45,ytd:-15.2  },
      { name:'Copper',     d1:+1.87,w1:+4.23,m1:+7.56,ytd:+12.4  },
      { name:'Platinum',   d1:+0.34,w1:+1.12,m1:+2.34,ytd:+5.6   },
    ],
  },
};

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionBox({ title, badge, extra, children, style = {} }) {
  return (
    <div style={{
      background: C.card2, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: 'hidden', ...style,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
        background: C.card,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</span>
          {badge && <span style={{ background: C.card3, color: C.text3, fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>{badge}</span>}
        </div>
        {extra && <span style={{ color: C.text3, fontSize: 11 }}>{extra}</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function ChgBadge({ value, size = 12 }) {
  return (
    <span style={{ color: changeColor(value), fontSize: size, fontWeight: 700, fontFamily: 'monospace' }}>
      {fmtPct(value)}
    </span>
  );
}

// ── TradingView Mini Chart ────────────────────────────────────────────────────
function TVMiniChart({ symbol, color, height = 220 }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.cssText = `height:${height}px;width:100%;`;
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.cssText = 'height:100%;width:100%;';
    container.appendChild(widget);
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      width:                 '100%',
      height,
      locale:                'en',
      dateRange:             '3M',
      colorTheme:            'dark',
      trendLineColor:        color,
      underLineColor:        `${color}30`,
      underLineBottomColor:  'rgba(0,0,0,0)',
      isTransparent:         true,
      autosize:              false,
      largeChartUrl:         '',
    });
    container.appendChild(script);
    node.appendChild(container);
    return () => { if (node) node.innerHTML = ''; };
  }, [symbol, color, height]);

  return <div ref={ref} style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden' }} />;
}

// ── Running Ticker ────────────────────────────────────────────────────────────
function RunningTicker({ items, color }) {
  if (!items || items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{
      overflow: 'hidden', background: C.card, borderBottom: `1px solid ${C.border}`,
      padding: '8px 0', position: 'relative',
    }}>
      <div style={{ display: 'flex', gap: 0, animation: 'ticker-scroll 35s linear infinite', width: 'max-content' }}>
        {doubled.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px',
            borderRight: `1px solid ${C.border}`,
          }}>
            <span style={{ color: C.text3, fontWeight: 700, fontSize: 11, letterSpacing: '0.05em' }}>{item.s}</span>
            <span style={{ color: C.text, fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>
              {item.u ? `$${fmtPrice(item.p)}${item.u}` : (item.p > 1000 ? item.p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : fmtPrice(item.p))}
            </span>
            <ChgBadge value={item.c} size={11} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Fear & Greed Gauge ───────────────────────────────────────────────────────
function GaugeGfx({ value, label }) {
  const W = 220, H = 130;
  const cx = W / 2, cy = H - 10;
  const R1 = 95, R2 = 62;

  const segs = [
    [0,  20,  '#ef4444', 'Ext. Fear' ],
    [20, 40,  '#f97316', 'Fear'      ],
    [40, 60,  '#eab308', 'Neutral'   ],
    [60, 80,  '#84cc16', 'Greed'     ],
    [80, 100, '#22c55e', 'Ext. Greed'],
  ];

  const toRad = (v) => Math.PI - (v / 100) * Math.PI;
  const arcPath = (sv, ev) => {
    const a1 = toRad(sv), a2 = toRad(ev);
    const ox1 = cx + R1 * Math.cos(a1), oy1 = cy - R1 * Math.sin(a1);
    const ox2 = cx + R1 * Math.cos(a2), oy2 = cy - R1 * Math.sin(a2);
    const ix1 = cx + R2 * Math.cos(a1), iy1 = cy - R2 * Math.sin(a1);
    const ix2 = cx + R2 * Math.cos(a2), iy2 = cy - R2 * Math.sin(a2);
    return `M${ox1},${oy1} A${R1},${R1} 0 0,1 ${ox2},${oy2} L${ix2},${iy2} A${R2},${R2} 0 0,0 ${ix1},${iy1}Z`;
  };

  const needleAngle = toRad(Math.min(100, Math.max(0, value)));
  const nLen = R1 - 6;
  const nx = cx + nLen * Math.cos(needleAngle);
  const ny = cy - nLen * Math.sin(needleAngle);
  const segColor = segs.find(([sv, ev]) => value >= sv && value < ev)?.[2] || '#22c55e';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {segs.map(([sv, ev, col]) => (
        <path key={sv} d={arcPath(sv, ev)} fill={col} opacity={0.85} />
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth={2.5} strokeLinecap="round" filter="url(#glow)" />
      <circle cx={cx} cy={cy} r={7} fill={C.card2} stroke="white" strokeWidth={2} />
      <text x={cx} y={cy - 14} textAnchor="middle" fill="white" fontSize={26} fontWeight="800" fontFamily="monospace">{value}</text>
      <text x={cx} y={cy - 34} textAnchor="middle" fill={segColor} fontSize={11} fontWeight="700" letterSpacing="1">{label?.toUpperCase()}</text>
    </svg>
  );
}

// ── Liquidation Heatmap (simulated) ──────────────────────────────────────────
function LiqHeatmap() {
  const W = 560, H = 220, cols = 48, rows = 20;
  const cw = W / cols, rh = H / rows;
  const currentPriceRow = 7;
  const hotZones = [[5,8,0.4,0.7],[14,18,0.5,0.85],[25,32,0.3,0.6]];
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      let intensity = Math.random() * 0.12;
      hotZones.forEach(([c1,c2,base,peak]) => {
        if (col >= c1 && col <= c2) {
          const center = (c1+c2)/2, dist = Math.abs(col-center)/((c2-c1)/2);
          const rowFactor = 1 - Math.abs(r-currentPriceRow+1)/rows*0.8;
          intensity = Math.max(intensity, base+(peak-base)*(1-dist)*rowFactor+Math.random()*0.08);
        }
      });
      intensity = Math.min(1, intensity);
      let fill;
      if (intensity < 0.15) fill = `rgba(30,10,30,${intensity*4})`;
      else if (intensity < 0.35) fill = `rgba(120,20,40,${intensity})`;
      else if (intensity < 0.55) fill = `rgba(220,80,10,${intensity})`;
      else if (intensity < 0.75) fill = `rgba(255,150,10,${intensity})`;
      else fill = `rgba(255,220,50,${intensity})`;
      cells.push({ r, col, fill });
    }
  }
  const prices = Array.from({ length: rows }, (_, i) => `$${(110-i*2).toFixed(0)}k`);
  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${W+40} ${H+24}`} style={{ display: 'block' }}>
        <rect x={0} y={0} width={W+40} height={H+24} fill={C.card2} />
        {cells.map(({ r, col, fill }) => (
          <rect key={`${r}-${col}`} x={col*cw+38} y={r*rh+2} width={cw-0.5} height={rh-0.5} fill={fill} />
        ))}
        <line x1={38} y1={currentPriceRow*rh+rh/2+2} x2={W+38} y2={currentPriceRow*rh+rh/2+2} stroke="#ffffff44" strokeWidth={1} strokeDasharray="4,3" />
        <text x={W+40} y={currentPriceRow*rh+rh/2+6} fill="#ffffff66" fontSize={7} textAnchor="end">NOW</text>
        {prices.filter((_,i) => i%4===0).map((p, idx) => (
          <text key={p} x={34} y={idx*4*rh+6} fill="#555" fontSize={7} textAnchor="end">{p}</text>
        ))}
      </svg>
      <div style={{ position:'absolute', bottom:8, right:8, display:'flex', gap:4, alignItems:'center' }}>
        {['Low','Med','High','Extreme'].map((l,i) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:3 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:['rgba(120,20,40,0.7)','rgba(220,80,10,0.8)','rgba(255,150,10,0.9)','rgba(255,220,50,1)'][i] }} />
            <span style={{ fontSize:9, color:C.text3 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Market cap weight for sizing heatmap cells (bigger = more dominant coin)
const CAP_WEIGHT = {
  BTC:9, ETH:7, XRP:5, BNB:4, SOL:4, DOGE:3, ADA:3, TRX:3,
  SHIB:2, AVAX:2, TON:2, LINK:2, DOT:2, SUI:2, HYPE:2,
  UNI:1, NEAR:1, LTC:1, APT:1, OP:1, ARB:1, HBAR:1, FIL:1, ATOM:1,
};

function buildHeatmapData(ticker, movers) {
  const changes = {};
  // Layer 1: movers from backend (CoinGecko, broader coverage)
  if (movers) {
    [...(movers.gainers || []), ...(movers.losers || [])].forEach(m => {
      changes[m.symbol] = m.change;
    });
  }
  // Layer 2: WebSocket ticker (more real-time, overrides movers)
  if (ticker) {
    ticker.forEach(t => { changes[t.s] = t.c; });
  }
  return Object.entries(CAP_WEIGHT)
    .map(([s, w]) => ({ s, c: changes[s] ?? 0, w }))
    .sort((a, b) => b.w - a.w);
}

// ── Crypto Market Heatmap ─────────────────────────────────────────────────────
function CryptoHeatmap({ data }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {data.map((item) => {
        const sz = 28 + item.w * 16;
        return (
          <div key={item.s} style={{
            width: sz, height: sz/1.1,
            background: cellColor(item.c), borderRadius: 5,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.3)', cursor: 'default',
          }}>
            <span style={{ color:'rgba(255,255,255,0.9)', fontSize:Math.max(8,sz/7), fontWeight:700, lineHeight:1 }}>{item.s}</span>
            {sz > 48 && <span style={{ color:'rgba(255,255,255,0.7)', fontSize:Math.max(7,sz/9), marginTop:2 }}>{fmtPct(item.c)}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Foreign Flow Bar Chart ────────────────────────────────────────────────────
function ForeignFlowChart({ data }) {
  const max = Math.max(...data.map(d => Math.abs(d.v)));
  const H = 100, W = 260, barW = W / data.length - 4;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H+24}`}>
      <line x1={0} y1={H/2} x2={W} y2={H/2} stroke={C.border} strokeWidth={1} />
      {data.map((d, i) => {
        const barH = (Math.abs(d.v)/max)*(H/2-4), isPos = d.v >= 0;
        const x = i*(W/data.length)+2, y = isPos ? H/2-barH : H/2;
        return (
          <g key={d.d}>
            <rect x={x} y={y} width={barW} height={barH}
              fill={isPos ? '#22c55e88' : '#ef444488'} stroke={isPos ? '#22c55e' : '#ef4444'} strokeWidth={0.5} rx={2} />
            <text x={x+barW/2} y={H+16} textAnchor="middle" fill={C.text4} fontSize={7}>{d.d.slice(4)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── DXY vs Gold Chart ─────────────────────────────────────────────────────────
function DXYGoldChart({ data }) {
  const W = 380, H = 160, pad = 36;
  const dxyMin = Math.min(...data.map(d => d.d)) - 0.5;
  const dxyMax = Math.max(...data.map(d => d.d)) + 0.5;
  const gMin   = Math.min(...data.map(d => d.g)) - 50;
  const gMax   = Math.max(...data.map(d => d.g)) + 50;
  const toX  = (i) => pad + (i/(data.length-1))*(W-pad*1.5);
  const toYd = (v) => H-pad+10-((v-dxyMin)/(dxyMax-dxyMin))*(H-pad*1.2);
  const toYg = (v) => H-pad+10-((v-gMin)/(gMax-gMin))*(H-pad*1.2);
  const dPath = data.map((d,i) => `${i===0?'M':'L'}${toX(i)},${toYd(d.d)}`).join(' ');
  const gPath = data.map((d,i) => `${i===0?'M':'L'}${toX(i)},${toYg(d.g)}`).join(' ');
  const gFill = `${gPath} L${toX(data.length-1)},${H-pad+10} L${toX(0)},${H-pad+10}Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.yellow} stopOpacity={0.25} />
          <stop offset="100%" stopColor={C.yellow} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.25,0.5,0.75].map(f => (
        <line key={f} x1={pad} y1={pad+f*(H-pad*1.5)} x2={W-10} y2={pad+f*(H-pad*1.5)} stroke={C.border} strokeWidth={1} strokeDasharray="3,4" />
      ))}
      <path d={gFill} fill="url(#goldFill)" />
      <path d={gPath} stroke={C.yellow} strokeWidth={2} fill="none" />
      <path d={dPath} stroke="#60a5fa" strokeWidth={1.5} fill="none" strokeDasharray="5,3" />
      <text x={pad} y={12} fill={C.yellow} fontSize={9} fontWeight="700">Gold ▲</text>
      <text x={pad+55} y={12} fill="#60a5fa" fontSize={9} fontWeight="700">DXY ─ ─</text>
      {[gMin,(gMin+gMax)/2,gMax].map((v,i) => (
        <text key={v} x={pad-4} y={i===0?H-pad+10:i===1?(H/2):pad+4} fill={C.text4} fontSize={7} textAnchor="end">{Math.round(v)}</text>
      ))}
    </svg>
  );
}

// ── S&P 500 Heatmap ───────────────────────────────────────────────────────────
function SP500Heatmap({ data }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {data.map((item) => {
        const sz = 26 + item.w * 14;
        return (
          <div key={item.s} style={{
            width: sz, height: sz/1.1, background: cellColor(item.c), borderRadius: 5,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.3)',
          }}>
            <span style={{ color:'rgba(255,255,255,0.9)', fontSize:Math.max(7,sz/6.5), fontWeight:700, lineHeight:1 }}>{item.s}</span>
            {sz > 44 && <span style={{ color:'rgba(255,255,255,0.65)', fontSize:Math.max(6,sz/9) }}>{fmtPct(item.c)}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Generic Mover List ────────────────────────────────────────────────────────
function MoverList({ items, currency = 'USD' }) {
  if (!items || items.length === 0) {
    return <div style={{ color: C.text4, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Loading…</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.slice(0, 8).map((item, i) => (
        <div key={item.s} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          transition: 'background 0.1s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = i%2===0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
        >
          <span style={{ color:C.text4, fontSize:10, width:14, textAlign:'right', fontFamily:'monospace' }}>{i+1}</span>
          {item.thumb && (
            <img src={item.thumb} alt="" style={{ width:20, height:20, borderRadius:'50%', flexShrink:0 }} onError={e => e.target.style.display='none'} />
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:C.text, fontSize:12, fontWeight:700 }}>{item.s}</div>
            <div style={{ color:C.text3, fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <ChgBadge value={item.c} size={13} />
            {item.p != null && (
              <div style={{ color:C.text3, fontSize:10, fontFamily:'monospace', marginTop:1 }}>
                {currency === 'IDR' ? `Rp ${item.p.toLocaleString('id-ID')}` : `$${fmtPrice(item.p)}`}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TAB: CRYPTO ───────────────────────────────────────────────────────────────
function CryptoTab({ isMobile, rt }) {
  const { fearGreed, derivatives, cryptoMovers, ticker: wsTicker } = rt;
  const d = MOCK.crypto;
  const heatmapData = buildHeatmapData(wsTicker, cryptoMovers);

  const fgVal   = fearGreed?.value    ?? 50;
  const fgLabel = fearGreed?.label    ?? 'Neutral';
  const fgYest  = fearGreed?.yesterday ?? null;
  const fgWeek  = fearGreed?.last_week ?? null;

  const oi        = derivatives?.openInterestUSD ?? null;
  const longRatio = derivatives?.longPct         ?? 52;
  const shortRatio = derivatives?.shortPct       ?? 48;

  const gainers = (cryptoMovers?.gainers || []).map(toMover);
  const losers  = (cryptoMovers?.losers  || []).map(toMover);
  const ticker  = (rt.ticker && rt.ticker.length > 0)
    ? rt.ticker
    : toTickerItems(cryptoMovers).length > 0
      ? toTickerItems(cryptoMovers)
      : [];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <RunningTicker items={ticker} color={C.crypto} />

      {/* Derivatives */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 0.65fr', gap:14 }}>
        <SectionBox title="Liquidation Heatmap" badge="24H" extra="Simulated">
          <LiqHeatmap />
          <div style={{ display:'flex', gap:16, marginTop:10 }}>
            {[['$104k–$106k','#22c55e','Long Liq Zone'],['$108k–$110k','#ef4444','Short Liq Zone']].map(([label,color,sub]) => (
              <div key={label}>
                <div style={{ color, fontSize:11, fontWeight:700 }}>{label}</div>
                <div style={{ color:C.text3, fontSize:10 }}>{sub}</div>
              </div>
            ))}
          </div>
        </SectionBox>

        <SectionBox title="Derivatives" badge="LIVE">
          <div style={{ marginBottom:14 }}>
            <div style={{ color:C.text3, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Total Open Interest</div>
            <div style={{ color:C.text, fontSize:22, fontWeight:800, fontFamily:'monospace', letterSpacing:'-0.02em' }}>
              {oi ? `$${(oi/1e9).toFixed(2)}B` : '—'}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ color:C.green, fontSize:11, fontWeight:700 }}>LONG {longRatio.toFixed(1)}%</span>
              <span style={{ color:C.red, fontSize:11, fontWeight:700 }}>SHORT {shortRatio.toFixed(1)}%</span>
            </div>
            <div style={{ height:10, borderRadius:5, overflow:'hidden', background:C.card3, display:'flex' }}>
              <div style={{ width:`${longRatio}%`, background:'linear-gradient(90deg, #16a34a, #4ade80)' }} />
              <div style={{ flex:1, background:'linear-gradient(90deg, #f87171, #b91c1c)' }} />
            </div>
          </div>
          <div>
            <div style={{ color:C.text3, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Funding Rate (8h)</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {d.funding.map(f => (
                <div key={f.s} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:C.text3, fontSize:11, fontFamily:'monospace', width:44 }}>{f.s}</span>
                  <div style={{ flex:1, height:4, borderRadius:2, background:C.card3, margin:'0 8px', overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(100,Math.abs(f.r)/0.025*100)}%`, height:'100%', background:f.r>=0?C.green:C.red, float:f.r>=0?'right':'left' }} />
                  </div>
                  <span style={{ color:f.r>=0?C.green:C.red, fontSize:11, fontFamily:'monospace', width:52, textAlign:'right' }}>
                    {f.r>=0?'+':''}{(f.r*100).toFixed(4)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionBox>
      </div>

      {/* Heatmap + Fear & Greed */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 0.7fr', gap:14 }}>
        <SectionBox title="Crypto Market Heatmap" badge="LIVE" extra="By Market Cap">
          <CryptoHeatmap data={heatmapData} />
        </SectionBox>
        <SectionBox title="Fear & Greed Index" badge="LIVE">
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <GaugeGfx value={fgVal} label={fgLabel} />
            <div style={{ display:'flex', gap:20, marginTop:4 }}>
              {[['Yesterday', fgYest],['Last Week', fgWeek]].map(([lbl, val]) => (
                <div key={lbl} style={{ textAlign:'center' }}>
                  <div style={{ color:C.text3, fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>{lbl}</div>
                  <div style={{ color:C.text, fontSize:14, fontWeight:700, fontFamily:'monospace' }}>{val ?? '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center', marginTop:4 }}>
              {[['Ext. Fear','#ef4444'],['Fear','#f97316'],['Neutral','#eab308'],['Greed','#84cc16'],['Ext. Greed','#22c55e']].map(([l,c]) => (
                <span key={l} style={{ fontSize:9, color:c, fontWeight:600 }}>{l}</span>
              ))}
            </div>
          </div>
        </SectionBox>
      </div>

      {/* Gainers / Losers */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
        <SectionBox title="🟢 Top Gainers" badge="LIVE 24H">
          <MoverList items={gainers} />
        </SectionBox>
        <SectionBox title="🔴 Top Losers" badge="LIVE 24H">
          <MoverList items={losers} />
        </SectionBox>
      </div>
    </div>
  );
}

// ── TAB: IDX STOCKS ───────────────────────────────────────────────────────────
function IDXTab({ isMobile, rt }) {
  const { idxMovers } = rt;
  const d = MOCK.idx;
  const ff = d.foreignFlow;
  const netVal = ff.reduce((s, x) => s + x.v, 0);

  const gainers = (idxMovers?.gainers || []).map(toMover);
  const losers  = (idxMovers?.losers  || []).map(toMover);
  const ticker  = toTickerItems(idxMovers).length > 0 ? toTickerItems(idxMovers) : d.tickers;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <RunningTicker items={ticker} color={C.idx} />

      {/* IHSG Chart */}
      <SectionBox title="IHSG — Composite Index" badge="LIVE" extra="IDX:COMPOSITE · 3M">
        <TVMiniChart symbol="IDX:COMPOSITE" color={C.idx} height={220} />
      </SectionBox>

      {/* Foreign Flow + Turnover */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
        <SectionBox title="Foreign Flow" badge="7D" extra={`Net: ${netVal>=0?'+':''}Rp ${netVal.toFixed(1)}B`}>
          <div style={{ display:'flex', gap:16, marginBottom:10 }}>
            {[['Net Buy','Rp 234.5B','green'],['Net Sell','Rp 189.2B','red']].map(([l,v,col]) => (
              <div key={l}>
                <div style={{ color:C.text3, fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>{l}</div>
                <div style={{ color:col==='green'?C.green:C.red, fontSize:15, fontWeight:800, fontFamily:'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
          <ForeignFlowChart data={ff} />
        </SectionBox>
        <SectionBox title="Market Turnover" badge="Today">
          {[
            { label:'Transaction Value', value:`Rp ${d.turnover.value}T`, sub:'Total hari ini' },
            { label:'Volume',            value:`${d.turnover.volume}B lot`, sub:'Saham berpindah' },
            { label:'Transactions',      value:`${d.turnover.tx}M`,        sub:'Jumlah transaksi' },
          ].map((row,i) => (
            <div key={row.label} style={{ padding:'12px 0', borderBottom:i<2?`1px solid ${C.border}`:'none' }}>
              <div style={{ color:C.text3, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{row.label}</div>
              <div style={{ color:C.text, fontSize:20, fontWeight:800, fontFamily:'monospace' }}>{row.value}</div>
              <div style={{ color:C.text4, fontSize:10, marginTop:2 }}>{row.sub}</div>
            </div>
          ))}
        </SectionBox>
      </div>

      {/* Sectoral Heatmap */}
      <SectionBox title="Sectoral Performance" badge="IDX" extra="Today">
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {d.sectors.map(sec => {
            const sz = Math.max(70, sec.w*9);
            return (
              <div key={sec.name} style={{ width:sz+30, height:60, background:cellColor(sec.c), borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'1px solid rgba(0,0,0,0.3)' }}>
                <div style={{ color:'rgba(255,255,255,0.9)', fontSize:11, fontWeight:700 }}>{sec.name}</div>
                <div style={{ color:'rgba(255,255,255,0.8)', fontSize:12, fontWeight:800, fontFamily:'monospace', marginTop:2 }}>{fmtPct(sec.c)}</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:9 }}>{sec.w}% weight</div>
              </div>
            );
          })}
        </div>
      </SectionBox>

      {/* Gainers / Losers */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
        <SectionBox title="🟢 Top Gainers" badge="LIVE Today">
          <MoverList items={gainers} currency="IDR" />
        </SectionBox>
        <SectionBox title="🔴 Top Losers" badge="LIVE Today">
          <MoverList items={losers} currency="IDR" />
        </SectionBox>
      </div>
    </div>
  );
}

// ── TAB: US STOCKS ────────────────────────────────────────────────────────────
function USTab({ isMobile, rt }) {
  const { usMovers } = rt;
  const d = MOCK.us;

  const gainers = (usMovers?.gainers || []).map(toMover);
  const losers  = (usMovers?.losers  || []).map(toMover);
  const ticker  = toTickerItems(usMovers).length > 0 ? toTickerItems(usMovers) : d.tickers;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <RunningTicker items={ticker} color={C.us} />

      {/* S&P 500 Chart */}
      <SectionBox title="S&P 500 — SPX" badge="LIVE" extra="SP:SPX · 3M">
        <TVMiniChart symbol="SP:SPX" color={C.us} height={220} />
      </SectionBox>

      {/* S&P 500 Heatmap + Earnings */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap:14 }}>
        <SectionBox title="S&P 500 Heatmap" badge="By Sector">
          <SP500Heatmap data={d.heatmap} />
        </SectionBox>
        <SectionBox title="Earnings Calendar" badge="Upcoming">
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'70px 1fr 60px 40px 32px', gap:6, padding:'4px 6px', marginBottom:4 }}>
              {['Date','Company','EPS Est','Time',''].map(h => (
                <span key={h} style={{ color:C.text4, fontSize:9, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</span>
              ))}
            </div>
            {d.earnings.map((e, i) => (
              <div key={e.tk} style={{ display:'grid', gridTemplateColumns:'70px 1fr 60px 40px 32px', gap:6, padding:'8px 6px', borderRadius:6, borderBottom:`1px solid ${C.border}`, background:i%2===0?'transparent':'rgba(255,255,255,0.015)' }}>
                <span style={{ color:C.text3, fontSize:11, fontFamily:'monospace' }}>{e.date}</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ color:C.text, fontSize:11, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.co}</div>
                  <div style={{ color:C.text3, fontSize:10 }}>{e.tk}</div>
                </div>
                <span style={{ color:C.text2, fontSize:11, fontFamily:'monospace' }}>${e.eps}</span>
                <span style={{ color:e.time==='AMC'?C.yellow:C.crypto, fontSize:10, fontWeight:700 }}>{e.time}</span>
                <span style={{ fontSize:14 }}>{e.beat===true?'✅':e.beat===false?'❌':'⏳'}</span>
              </div>
            ))}
          </div>
        </SectionBox>
      </div>

      {/* Gainers / Losers */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
        <SectionBox title="🟢 Top Gainers" badge="LIVE Today">
          <MoverList items={gainers} />
        </SectionBox>
        <SectionBox title="🔴 Top Losers" badge="LIVE Today">
          <MoverList items={losers} />
        </SectionBox>
      </div>
    </div>
  );
}

// ── TAB: COMMODITIES ─────────────────────────────────────────────────────────
function CommoditiesTab({ isMobile, rt }) {
  const { commodMovers } = rt;
  const d = MOCK.commod;

  const gainers = (commodMovers?.gainers || []).map(toMover);
  const losers  = (commodMovers?.losers  || []).map(toMover);
  const ticker  = toTickerItems(commodMovers).length > 0 ? toTickerItems(commodMovers) : d.tickers;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <RunningTicker items={ticker} color={C.comm} />

      {/* DXY vs Gold + Macro Events */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap:14 }}>
        <SectionBox title="DXY vs Gold Correlation" badge="90D" extra="Inverse Relationship">
          <DXYGoldChart data={d.dxy} />
          <div style={{ display:'flex', gap:20, marginTop:8 }}>
            {[
              { label:'Gold', value:'$3,324.50', chg:+0.45, col:C.yellow },
              { label:'DXY',  value:'100.12',    chg:-0.23, col:'#60a5fa' },
            ].map(row => (
              <div key={row.label}>
                <div style={{ color:C.text3, fontSize:10 }}>{row.label}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ color:row.col, fontSize:15, fontWeight:800, fontFamily:'monospace' }}>{row.value}</span>
                  <ChgBadge value={row.chg} size={11} />
                </div>
              </div>
            ))}
          </div>
        </SectionBox>
        <SectionBox title="Key Macro Events" badge="Calendar">
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {d.macro.map((ev, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'52px 1fr 48px', gap:8, padding:'8px 4px', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ color:C.text3, fontSize:10, fontFamily:'monospace' }}>{ev.date}</div>
                <div>
                  <div style={{ color:C.text, fontSize:11, fontWeight:600 }}>{ev.event}</div>
                  <div style={{ color:C.text4, fontSize:10, marginTop:1 }}>
                    Prev: <span style={{ color:C.text3 }}>{ev.prev}</span>
                    {ev.exp !== '-' && <> · Est: <span style={{ color:C.text2 }}>{ev.exp}</span></>}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:impactColor(ev.impact), padding:'2px 5px', borderRadius:3, background:`${impactColor(ev.impact)}18` }}>{ev.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionBox>
      </div>

      {/* Gainers / Losers */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
        <SectionBox title="🟢 Top Gainers" badge="LIVE Today">
          <MoverList items={gainers} />
        </SectionBox>
        <SectionBox title="🔴 Top Losers" badge="LIVE Today">
          <MoverList items={losers} />
        </SectionBox>
      </div>

      {/* Performance Matrix */}
      <SectionBox title="Performance Matrix" badge="Price Return">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>
                {['Commodity','1D','1W','1M','YTD'].map((h,i) => (
                  <th key={h} style={{ padding:'6px 10px', textAlign:i===0?'left':'right', color:C.text4, fontSize:9, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.perf.map((row, i) => (
                <tr key={row.name} style={{ background:i%2===0?'transparent':'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding:'8px 10px', color:C.text, fontWeight:600, whiteSpace:'nowrap' }}>{row.name}</td>
                  {[row.d1,row.w1,row.m1,row.ytd].map((v,j) => (
                    <td key={j} style={{ padding:'8px 10px', textAlign:'right' }}>
                      <span style={{ color:changeColor(v), fontFamily:'monospace', fontSize:12, fontWeight:700, background:`${changeColor(v)}15`, padding:'2px 7px', borderRadius:4 }}>{fmtPct(v)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBox>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MarketOverviewPage({ t = (k) => k }) {
  const [activeTab, setActiveTab] = useState('crypto');
  const [isMobile,  setIsMobile]  = useState(window.innerWidth <= 768);
  const [now,       setNow]       = useState(new Date());
  const rt = useRealtime();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const tab = TABS.find(tb => tb.key === activeTab);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: isMobile ? '14px 14px 0' : '18px 24px 0', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color:tab.color, fontSize:18 }}>{tab.icon}</span>
            <h1 style={{ color:C.text, fontWeight:800, fontSize: isMobile ? 18 : 22, margin:0, letterSpacing:'-0.02em' }}>Market Overview</h1>
            <span style={{ background:'#1a1a1a', border:`1px solid ${C.border}`, color:C.text3, fontSize:10, padding:'2px 8px', borderRadius:5, fontFamily:'monospace' }}>LIVE</span>
          </div>
          <p style={{ color:C.text4, fontSize:11, margin:'3px 0 0' }}>
            {now.toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display:'flex', gap:2, padding: isMobile ? '12px 14px 0' : '14px 24px 0', borderBottom:`1px solid ${C.border}`, overflowX:'auto', scrollbarWidth:'none' }}>
        {TABS.map(tb => {
          const isActive = activeTab === tb.key;
          return (
            <button key={tb.key} onClick={() => setActiveTab(tb.key)} style={{
              background:'transparent', border:'none',
              color: isActive ? tb.color : C.text3,
              fontWeight: isActive ? 700 : 500,
              fontSize:13, cursor:'pointer', padding:'8px 18px 10px',
              borderBottom: isActive ? `2px solid ${tb.color}` : '2px solid transparent',
              marginBottom:-1, transition:'all 0.15s', whiteSpace:'nowrap',
              display:'flex', alignItems:'center', gap:6,
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.text2; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.text3; }}
            >
              <span style={{ fontSize:14 }}>{tb.icon}</span>
              {tb.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ padding: isMobile ? '14px' : '18px 24px', maxWidth:1440, margin:'0 auto' }}>
        {activeTab === 'crypto' && <CryptoTab isMobile={isMobile} rt={rt} />}
        {activeTab === 'idx'    && <IDXTab    isMobile={isMobile} rt={rt} />}
        {activeTab === 'us'     && <USTab     isMobile={isMobile} rt={rt} />}
        {activeTab === 'commod' && <CommoditiesTab isMobile={isMobile} rt={rt} />}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        div::-webkit-scrollbar { height: 4px; width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
      `}</style>
    </div>
  );
}
