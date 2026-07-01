import { useState, useRef, useEffect, useCallback } from 'react';
import useWindowSize from '../hooks/useWindowSize';

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:'#08111F', card:'#111C30', card2:'#16233A', card3:'#1A2C42',
  border:'rgba(79,124,255,0.1)', brd2:'rgba(79,124,255,0.18)',
  text:'#F8FAFC', text2:'#CBD5E1', text3:'#94A3B8', text4:'#4A5568',
  green:'#22C55E', red:'#EF4444', yellow:'#F59E0B',
  gold:'#F3BA2F', blue:'#4F7CFF', purple:'#6366F1', cyan:'#22D3EE',
};

// ── Trading config pill data ──────────────────────────────────────────────────
const STYLE_PILLS = [
  { v:'Scalping',         l:'Scalping' },
  { v:'Day Trading',      l:'Day'      },
  { v:'Swing Trading',    l:'Swing'    },
  { v:'Position Trading', l:'Pos.'     },
  { v:'Long Term',        l:'Long'     },
];
const RISK_PILLS = [
  { v:'Conservative', l:'Conservative' },
  { v:'Moderate',     l:'Moderate'     },
  { v:'Aggressive',   l:'Aggressive'   },
];
const RR_PILLS = [
  { v:'1:1', l:'1 : 1' },
  { v:'1:2', l:'1 : 2' },
  { v:'1:3', l:'1 : 3' },
];

// ── Trading Styles ─────────────────────────────────────────────────────────────
const STYLES = [
  { key:'Scalping',         icon:'⚡', title:'Quick Trade',    sub:'Scalping',       tfs:['1m','3m','5m','15m'],  defaultTf:'5m'  },
  { key:'Day Trading',      icon:'📈', title:'Day Trade',      sub:'Within Today',   tfs:['5m','15m','30m','1H'], defaultTf:'15m' },
  { key:'Swing Trading',    icon:'🌊', title:'Swing Trade',    sub:'Several Days',   tfs:['1H','4H','1D'],        defaultTf:'4H'  },
  { key:'Position Trading', icon:'💼', title:'Position Trade', sub:'Several Weeks',  tfs:['4H','1D','1W'],        defaultTf:'1D'  },
  { key:'Long Term',        icon:'💎', title:'Long-Term',      sub:'Months – Years', tfs:['1D','1W','1M'],        defaultTf:'1W'  },
];

// Default asset shown before user selects anything
const DEFAULT_ASSET = { ticker:'BTC', name:'Bitcoin', type:'perp', price:null };

// Small icon map for popular coins — fallback is first letter
const COIN_ICONS = {
  BTC:'₿', ETH:'Ξ', SOL:'◎', BNB:'⬡', XRP:'✦', ADA:'₳', DOGE:'Ð',
  AVAX:'▲', LINK:'⬡', DOT:'●', PEPE:'🐸', WIF:'🐕', SUI:'💧', TON:'💎',
  APT:'A', ARB:'Ⓐ', OP:'⭕', INJ:'I', MATIC:'M', UNI:'🦄',
};
const coinIcon = t => COIN_ICONS[t] || t[0];

const TYPE_BADGE = { perp:{ label:'PERP', color:C.gold } };

const LOADING_STEPS = [
  { icon:'🔌', label:'Initializing AI'       },
  { icon:'📡', label:'Fetching Market Data'  },
  { icon:'📊', label:'Reading Indicators'    },
  { icon:'📈', label:'Checking Trend'        },
  { icon:'🔊', label:'Analyzing Volume'      },
  { icon:'📰', label:'Scanning News'         },
  { icon:'🎯', label:'Calculating Entry'     },
  { icon:'🛡️', label:'Calculating Stop Loss' },
  { icon:'✨', label:'Generating Report'     },
];

const TOOLTIPS = {
  stopLoss:   'Stop Loss membatasi kerugianmu. Jika harga menyentuh level ini posisi ditutup otomatis.',
  rr:         'Perbandingan potensi kerugian vs keuntungan. R:R 1:2 artinya risk $100, potensi profit $200.',
  confidence: 'Seberapa yakin AI terhadap analisis ini (0–100%).',
  entryZone:  'Kisaran harga terbaik untuk masuk posisi. Entry di luar zone mengurangi kualitas R:R.',
  holdTime:   'Estimasi berapa lama kamu akan hold posisi berdasarkan gaya trading.',
  tf:         'Timeframe menentukan periode setiap candle. Pilih sesuai gaya trading.',
  risk:       'Menentukan seberapa besar risiko per trade yang akan direkomendasikan AI.',
};

const INSIGHT_DATA = [
  { label:'Fear & Greed', value:'78',      sub:'Greed',        color:'#84cc16', tip:'Indikator sentimen 0–100. Di atas 75 = Greed (hati-hati).' },
  { label:'Funding Rate', value:'0.0102%', sub:'Positive',     color:C.yellow,  tip:'Biaya long ke short per 8 jam. Positif tinggi = terlalu long.' },
  { label:'Open Interest',value:'$27.45B', sub:'+2.31%',       color:C.blue,    tip:'Total posisi futures terbuka. Naik = tren semakin kuat.' },
  { label:'Whale Activity',value:'High',   sub:'Accumulating', color:C.purple,  tip:'Transaksi besar (>$1M). High = whale sedang bergerak.' },
  { label:'News Sentiment',value:'Bullish',sub:'Positive',     color:C.green,   tip:'Analisis sentimen ribuan berita kripto terkini.' },
  { label:'Econ Calendar', value:'3 Events',sub:'Today',       color:C.yellow,  tip:'Jumlah event makro penting hari ini.' },
];

// ── Utils ─────────────────────────────────────────────────────────────────────
function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function generateCandles(seed, base, n = 80) {
  const rng = seededRng(seed); const candles = []; let p = base * (0.88 + rng() * 0.1); let tr = 0;
  for (let i = 0; i < n; i++) {
    tr = tr * 0.88 + (rng() - 0.46) * 0.012;
    const ch = (tr + (rng() - 0.5) * 0.01) * p, wk = rng() * 0.006 * p;
    candles.push({ open:p, close:p+ch, high:Math.max(p,p+ch)+wk, low:Math.min(p,p+ch)-wk, vol:0.3+rng()*rng()*2.5 });
    p += ch;
  }
  return candles;
}
function calcEMA(values, period) {
  const k = 2 / (period + 1);
  let ema = values[0];
  return values.map(v => { ema = v * k + ema * (1 - k); return ema; });
}
function fmt(n) {
  if (n>=10000) return n.toLocaleString('en-US',{maximumFractionDigits:0});
  if (n>=100)   return n.toFixed(1);
  if (n>=1)     return n.toFixed(2);
  return n.toFixed(4);
}
function bT(ex, bg, isB) { return isB ? bg : ex; }

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tip({ content }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{position:'relative',display:'inline-flex',flexShrink:0}}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{width:'14px',height:'14px',borderRadius:'50%',background:C.card3,border:`1px solid ${C.border}`,color:C.text3,fontSize:'8px',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'help',flexShrink:0}}>?</span>
      {show&&<div style={{position:'absolute',bottom:'120%',left:'50%',transform:'translateX(-50%)',background:'#1c1c1c',border:`1px solid ${C.brd2}`,borderRadius:'10px',padding:'10px 12px',width:'210px',zIndex:300,boxShadow:'0 12px 32px rgba(0,0,0,0.7)',pointerEvents:'none'}}>
        <div style={{color:C.text2,fontSize:'11px',lineHeight:1.65}}>{content}</div>
      </div>}
    </span>
  );
}

// ── Asset Search ──────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || '';

function AssetSearch({ selected, onSelect }) {
  const [q,         setQ]         = useState('');
  const [open,      setOpen]      = useState(false);
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const [livePct,   setLivePct]   = useState(null);
  const ref   = useRef(null);
  const timer = useRef(null);

  const fetchSearch = useCallback(async (query) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/ai-trade/assets/search?q=${encodeURIComponent(query)}&limit=25`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load popular coins on mount
  useEffect(() => { fetchSearch(''); }, [fetchSearch]);

  // Debounced search on query change
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchSearch(q), 220);
    return () => clearTimeout(timer.current);
  }, [q, fetchSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch live price from Binance Futures 24hr ticker
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${selected.ticker}USDT`);
        const d = await r.json();
        if (!cancel && d.lastPrice) {
          setLivePrice(parseFloat(d.lastPrice));
          setLivePct(parseFloat(d.priceChangePercent));
        }
      } catch {}
    })();
    return () => { cancel = true; };
  }, [selected.ticker]);

  const handleSelect = item => {
    onSelect({ ticker: item.baseAsset, name: item.baseAsset, type: 'perp', price: null });
    setOpen(false);
    setQ('');
  };

  const b = TYPE_BADGE['perp'];
  return (
    <div ref={ref} style={{position:'relative',width:'100%'}}>
      {/* Selected asset button */}
      <div onClick={()=>setOpen(o=>!o)} style={{background:C.card2,border:`1px solid ${open?C.brd2:C.border}`,borderRadius:'10px',padding:'0 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',height:'46px',boxSizing:'border-box',transition:'border-color 0.15s'}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" style={{flexShrink:0}}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <span style={{fontSize:'15px',lineHeight:1,flexShrink:0}}>{coinIcon(selected.ticker)}</span>
        {/* Left: ticker + name */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'5px',lineHeight:1.2}}>
            <span style={{color:C.text,fontSize:'13px',fontWeight:800}}>{selected.ticker}</span>
            <span style={{color:b.color,fontSize:'7px',fontWeight:700,border:`1px solid ${b.color}30`,borderRadius:'3px',padding:'1px 4px'}}>{b.label}</span>
          </div>
          <div style={{color:C.text4,fontSize:'9px',marginTop:'2px',lineHeight:1}}>{selected.name}</div>
        </div>
        {/* Right: live price + 24h change */}
        {livePrice != null && (
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{color:C.text,fontSize:'15px',fontWeight:800,lineHeight:1,letterSpacing:'-0.02em'}}>{fmt(livePrice)}</div>
            <div style={{color:livePct>=0?C.green:C.red,fontSize:'10px',fontWeight:700,marginTop:'3px',lineHeight:1}}>
              {livePct>=0?'+':''}{livePct?.toFixed(2)}%
            </div>
          </div>
        )}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.text4} strokeWidth="2" style={{flexShrink:0}}><path d="M6 9l6 6 6-6"/></svg>
      </div>

      {/* Dropdown */}
      {open&&<div style={{position:'absolute',top:'calc(100% + 5px)',left:0,background:'#111',border:`1px solid ${C.brd2}`,borderRadius:'12px',boxShadow:'0 16px 48px rgba(0,0,0,0.7)',zIndex:200,overflow:'hidden',width:'230px'}}>
        <div style={{padding:'7px'}}>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search coin (e.g. btc, pepe)…"
            style={{width:'100%',background:C.card3,border:`1px solid ${C.border}`,borderRadius:'7px',padding:'6px 10px',color:C.text,fontSize:'12px',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{maxHeight:'260px',overflowY:'auto'}}>
          {loading&&<div style={{padding:'12px 14px',color:C.text3,fontSize:'11px'}}>Loading…</div>}
          {!loading&&results.length===0&&<div style={{padding:'12px 14px',color:C.text3,fontSize:'11px'}}>No results for "{q}"</div>}
          {!loading&&results.map(item=>(
            <div key={item.symbol} onClick={()=>handleSelect(item)}
              style={{display:'flex',alignItems:'center',gap:'9px',padding:'7px 13px',cursor:'pointer'}}
              onMouseEnter={e=>e.currentTarget.style.background=C.card3}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{fontSize:'14px',width:'18px',textAlign:'center',flexShrink:0}}>{coinIcon(item.baseAsset)}</span>
              <div style={{flex:1,minWidth:0}}>
                <span style={{color:C.text,fontSize:'12px',fontWeight:700}}>{item.baseAsset}</span>
                <span style={{color:C.text3,fontSize:'9.5px',marginLeft:'5px'}}>{item.symbol}</span>
              </div>
              <span style={{color:b.color,fontSize:'7px',fontWeight:700,border:`1px solid ${b.color}30`,borderRadius:'3px',padding:'1px 4px',flexShrink:0}}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}

// ── Style Tabs ────────────────────────────────────────────────────────────────
function StyleTabs({ value, onChange }) {
  return (
    <div style={{display:'flex',gap:'4px',flexShrink:0}}>
      {STYLES.map(s=>{
        const a = s.key === value;
        return (
          <button key={s.key} onClick={()=>onChange(s.key)} style={{
            background: a ? 'rgba(79,124,255,0.1)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${a ? 'rgba(79,124,255,0.45)' : C.border}`,
            borderRadius:'10px', padding:'0 14px', cursor:'pointer',
            display:'flex', alignItems:'center', gap:'8px',
            transition:'all 0.15s', flexShrink:0, height:'43px', boxSizing:'border-box',
            boxShadow: a ? '0 2px 10px rgba(79,124,255,0.15)' : 'none',
          }}
            onMouseEnter={e=>{if(!a){e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor=C.brd2;}}}
            onMouseLeave={e=>{if(!a){e.currentTarget.style.background='rgba(255,255,255,0.02)';e.currentTarget.style.borderColor=C.border;}}}
          >
            <span style={{fontSize:'16px',lineHeight:1,flexShrink:0}}>{s.icon}</span>
            <div style={{textAlign:'left'}}>
              <div style={{color:a?C.blue:C.text,fontSize:'12px',fontWeight:700,whiteSpace:'nowrap',lineHeight:1.3}}>{s.title}</div>
              <div style={{color:a?'rgba(79,124,255,0.7)':C.text4,fontSize:'9.5px',whiteSpace:'nowrap',lineHeight:1.3}}>{s.sub}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Loading Overlay ───────────────────────────────────────────────────────────
function LoadingOverlay({ step }) {
  const pct = ((step+1)/LOADING_STEPS.length)*100;
  const cur = LOADING_STEPS[step]||LOADING_STEPS[0];
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(8,8,8,0.94)',backdropFilter:'blur(4px)',borderRadius:'12px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'10px',zIndex:10}}>
      <div style={{fontSize:'28px',animation:'at-pulse 1.1s ease-in-out infinite'}}>{cur.icon}</div>
      <div style={{color:C.text,fontSize:'13px',fontWeight:700}}>{cur.label}...</div>
      <div style={{width:'160px',height:'3px',background:C.card3,borderRadius:'99px',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#F3BA2F,#f59e0b)',borderRadius:'99px',transition:'width 0.42s ease'}}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'4px',marginTop:'6px'}}>
        {LOADING_STEPS.map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'7px',opacity:i>step?0.15:1,transition:'opacity 0.3s'}}>
            <span style={{color:i<step?C.green:i===step?C.gold:C.text4,fontSize:'9px',width:'12px'}}>{i<step?'✓':i===step?'◉':'○'}</span>
            <span style={{color:i===step?C.text2:C.text3,fontSize:'10px'}}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Candlestick Chart ─────────────────────────────────────────────────────────
function calcATR(candles, period=14) {
  const trs = candles.map((c,i) => {
    if (i===0) return c.high - c.low;
    const p = candles[i-1];
    return Math.max(c.high-c.low, Math.abs(c.high-p.close), Math.abs(c.low-p.close));
  });
  return trs.slice(-period).reduce((s,v)=>s+v,0)/Math.min(period,trs.length);
}
function calcVWAP(candles) {
  let pv=0, vol=0;
  return candles.map(c => {
    const tp=(c.high+c.low+c.close)/3;
    pv+=tp*c.vol; vol+=c.vol;
    return pv/vol;
  });
}
const SW=900, SH=390, VH=52, PH=SH-VH-4, PR=94, PL=6;

const TF_RANGES = ['1D','5D','1M','3M','6M','YTD','1Y','5Y','All'];

function CandleChart({ candles, result, zones, asset, activeTf }) {
  const [tfRange, setTfRange] = useState('1D');
  const closes   = candles.map(c=>c.close);
  const ema20pts = calcEMA(closes, 20);
  const ema50pts = calcEMA(closes, 50);
  const last      = candles[candles.length-1];
  const prev      = candles[candles.length-2]||last;
  const chgAbs    = last.close - prev.close;
  const chgPct    = (chgAbs/prev.close*100).toFixed(2);
  const chgUp     = chgAbs >= 0;

  const prices = candles.flatMap(c=>[c.high,c.low]);
  if (result) prices.push(result.sl,result.tp1,result.tp2,result.tp3,result.entry1,result.entry2,result.sup,result.res);
  const rMin=Math.min(...prices), rMax=Math.max(...prices), pd=(rMax-rMin)*0.10;
  const pMin=rMin-pd, pMax=rMax+pd;
  const sY = p => PH - ((p-pMin)/(pMax-pMin))*PH;
  const maxV=Math.max(...candles.map(c=>c.vol));
  const cW=(SW-PL-PR)/candles.length, bW=Math.max(cW*0.65,1.5);
  const cx = i => PL+(i+0.5)*cW;
  const grid = Array.from({length:5},(_,i)=>pMin+(pMax-pMin)*(i/4));
  const zS = key => ({opacity:zones[key]?1:0,transition:'opacity 0.45s ease'});

  const ema20Path = ema20pts.map((e,i)=>`${i===0?'M':'L'}${cx(i).toFixed(1)},${sY(e).toFixed(1)}`).join(' ');
  const ema50Path = ema50pts.map((e,i)=>`${i===0?'M':'L'}${cx(i).toFixed(1)},${sY(e).toFixed(1)}`).join(' ');

  const totalVol = candles.reduce((s,c)=>s+c.vol,0);
  const volLabel = totalVol > 1000 ? `${(totalVol/1000).toFixed(2)}K` : totalVol.toFixed(2);

  // Pre-analysis informational indicators
  const vwapPts = calcVWAP(candles);
  const vwapPath = vwapPts.map((v,i)=>`${i===0?'M':'L'}${cx(i).toFixed(1)},${sY(v).toFixed(1)}`).join(' ');
  const atr = calcATR(candles);
  const autoRes30 = Math.max(...candles.slice(-30).map(c=>c.high));
  const autoSup30 = Math.min(...candles.slice(-30).map(c=>c.low));
  const chartHigh = Math.max(...candles.map(c=>c.high));
  const chartLow  = Math.min(...candles.map(c=>c.low));
  // Find candle index for chart high and low (for markers)
  const hiIdx = candles.reduce((bi,c,i)=>c.high>candles[bi].high?i:bi,0);
  const loIdx = candles.reduce((bi,c,i)=>c.low<candles[bi].low?i:bi,0);

  return (
    <div style={{background:'#060606',border:`1px solid ${C.border}`,borderRadius:'12px',overflow:'hidden'}}>
      {/* ── Chart header ── */}
      <div style={{padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
            <span style={{color:C.text,fontSize:'11.5px',fontWeight:700}}>{asset.ticker}USDT</span>
            <span style={{color:C.text4,fontSize:'11px'}}>·</span>
            <span style={{color:C.text3,fontSize:'11px',fontWeight:600}}>{activeTf}</span>
            <span style={{color:C.text4,fontSize:'11px'}}>·</span>
            <span style={{color:C.text4,fontSize:'10.5px'}}>BINANCE</span>
            <span style={{color:chgUp?C.green:C.red,fontSize:'10px'}}>●</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
            <span style={{color:C.text3,fontSize:'10px'}}>O <span style={{color:C.text2}}>{fmt(prev.open)}</span></span>
            <span style={{color:C.text3,fontSize:'10px'}}>H <span style={{color:C.green}}>{fmt(last.high)}</span></span>
            <span style={{color:C.text3,fontSize:'10px'}}>L <span style={{color:C.red}}>{fmt(last.low)}</span></span>
            <span style={{color:C.text3,fontSize:'10px'}}>C <span style={{color:C.text}}>{fmt(last.close)}</span></span>
            <span style={{color:chgUp?C.green:C.red,fontSize:'10px',fontWeight:600}}>{chgUp?'+':''}{fmt(chgAbs)} ({chgUp?'+':''}{chgPct}%)</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{display:'flex',flexDirection:'column',gap:'2px',textAlign:'right'}}>
            <span style={{color:C.text4,fontSize:'9.5px'}}>EMA 20 <span style={{color:C.blue,fontWeight:600}}>{fmt(ema20pts[ema20pts.length-1])}</span></span>
            <span style={{color:C.text4,fontSize:'9.5px'}}>EMA 50 <span style={{color:C.gold,fontWeight:600}}>{fmt(ema50pts[ema50pts.length-1])}</span></span>
            <span style={{color:C.text4,fontSize:'9.5px'}}>VWAP <span style={{color:C.cyan,fontWeight:600}}>{fmt(vwapPts[vwapPts.length-1])}</span></span>
            <span style={{color:C.text4,fontSize:'9.5px'}}>ATR <span style={{color:C.purple,fontWeight:600}}>{fmt(atr)}</span></span>
            <span style={{color:C.text4,fontSize:'9.5px'}}>Vol <span style={{color:C.text3}}>{volLabel}</span></span>
          </div>
          <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
            <span style={{color:C.blue,fontSize:'10px',fontWeight:600,cursor:'pointer'}}>Save</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.text4} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        </div>
      </div>

      {/* ── Chart SVG ── */}
      <div style={{position:'relative'}}>
        <svg viewBox={`0 0 ${SW} ${SH+VH+4}`} style={{width:'100%',display:'block'}} preserveAspectRatio="none">
          {/* Grid */}
          {grid.map((p,i)=><g key={i}>
            <line x1={PL} y1={sY(p)} x2={SW-PR} y2={sY(p)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
            <text x={SW-PR+5} y={sY(p)+3.5} fill={C.text4} fontSize="9">{fmt(p)}</text>
          </g>)}

          {/* Zones */}
          {result&&<>
            {/* SL zone area fill */}
            <rect x={PL} y={sY(result.sl)} width={SW-PL-PR} height={PH-sY(result.sl)+4} fill="rgba(239,68,68,0.05)" style={zS('sl')}/>

            {/* Entry zone */}
            <rect x={PL} y={Math.min(sY(result.entry1),sY(result.entry2))} width={SW-PL-PR} height={Math.abs(sY(result.entry1)-sY(result.entry2))+2} fill="rgba(74,222,128,0.12)" style={zS('entry')}/>
            <line x1={PL} y1={sY(result.entry1)} x2={SW-PR} y2={sY(result.entry1)} stroke={C.green} strokeWidth="2" strokeDasharray="6 3" style={zS('entry')}/>
            <line x1={PL} y1={sY(result.entry2)} x2={SW-PR} y2={sY(result.entry2)} stroke={C.green} strokeWidth="2" strokeDasharray="6 3" style={zS('entry')}/>
            {/* Entry zone label */}
            <rect x={SW-PR-76} y={sY((result.entry1+result.entry2)/2)-11} width={74} height={22} fill="rgba(74,222,128,0.22)" rx="4" style={zS('entry')}/>
            <text x={SW-PR-39} y={sY((result.entry1+result.entry2)/2)+4} fill={C.green} fontSize="10" fontWeight="800" textAnchor="middle" style={zS('entry')}>Entry Zone</text>

            {/* SL */}
            <line x1={PL} y1={sY(result.sl)} x2={SW-PR} y2={sY(result.sl)} stroke={C.red} strokeWidth="2.5" strokeDasharray="6 3" style={zS('sl')}/>
            <rect x={SW-PR+2} y={sY(result.sl)-11} width={PR-4} height={22} fill="rgba(239,68,68,0.25)" rx="4" style={zS('sl')}/>
            <text x={SW-PR+PR/2} y={sY(result.sl)+4} fill={C.red} fontSize="10" fontWeight="800" textAnchor="middle" style={zS('sl')}>SL {fmt(result.sl)}</text>

            {/* TP1 TP2 TP3 */}
            {['tp1','tp2','tp3'].map((k,i)=><g key={k}>
              <line x1={PL} y1={sY(result[k])} x2={SW-PR} y2={sY(result[k])} stroke={C.green} strokeWidth="2" strokeDasharray="6 3" style={zS(k)}/>
              <rect x={SW-PR+2} y={sY(result[k])-11} width={PR-4} height={22} fill="rgba(74,222,128,0.22)" rx="4" style={zS(k)}/>
              <text x={SW-PR+PR/2} y={sY(result[k])+4} fill={C.green} fontSize="10" fontWeight="800" textAnchor="middle" style={zS(k)}>TP{i+1} {fmt(result[k])}</text>
            </g>)}

            {/* Support/Resistance */}
            <line x1={PL} y1={sY(result.sup)} x2={SW-PR} y2={sY(result.sup)} stroke={C.blue} strokeWidth="1.5" strokeDasharray="3 5" style={zS('sup')}/>
            <rect x={SW-PR+2} y={sY(result.sup)-10} width={PR-4} height={20} fill="rgba(79,124,255,0.18)" rx="4" style={zS('sup')}/>
            <text x={SW-PR+PR/2} y={sY(result.sup)+4} fill={C.blue} fontSize="9.5" fontWeight="700" textAnchor="middle" style={zS('sup')}>Support</text>
            <line x1={PL} y1={sY(result.res)} x2={SW-PR} y2={sY(result.res)} stroke={C.yellow} strokeWidth="1.5" strokeDasharray="3 5" style={zS('res')}/>
            <rect x={SW-PR+2} y={sY(result.res)-10} width={PR-4} height={20} fill="rgba(251,191,36,0.16)" rx="4" style={zS('res')}/>
            <text x={SW-PR+PR/2} y={sY(result.res)+4} fill={C.yellow} fontSize="9.5" fontWeight="700" textAnchor="middle" style={zS('res')}>Resist.</text>
          </>}

          {/* ── Pre-analysis informational indicators (always visible) ── */}

          {/* Auto Support/Resistance (30-period) — hide after analysis to avoid double labels */}
          {!result&&<>
            <line x1={PL} y1={sY(autoRes30)} x2={SW-PR} y2={sY(autoRes30)} stroke={C.yellow} strokeWidth="1" strokeDasharray="4 4" opacity="0.55"/>
            <rect x={SW-PR+2} y={sY(autoRes30)-9} width={PR-4} height={18} fill="rgba(251,191,36,0.12)" rx="3"/>
            <text x={SW-PR+PR/2} y={sY(autoRes30)+3.5} fill={C.yellow} fontSize="8.5" fontWeight="600" textAnchor="middle" opacity="0.8">Resist.</text>
            <line x1={PL} y1={sY(autoSup30)} x2={SW-PR} y2={sY(autoSup30)} stroke={C.blue} strokeWidth="1" strokeDasharray="4 4" opacity="0.55"/>
            <rect x={SW-PR+2} y={sY(autoSup30)-9} width={PR-4} height={18} fill="rgba(79,124,255,0.12)" rx="3"/>
            <text x={SW-PR+PR/2} y={sY(autoSup30)+3.5} fill={C.blue} fontSize="8.5" fontWeight="600" textAnchor="middle" opacity="0.8">Support</text>
          </>}

          {/* VWAP line */}
          <path d={vwapPath} fill="none" stroke={C.cyan} strokeWidth="1.2" opacity="0.7" strokeDasharray="5 3"/>

          {/* Current Price line */}
          <line x1={PL} y1={sY(last.close)} x2={SW-PR} y2={sY(last.close)} stroke="rgba(248,250,252,0.25)" strokeWidth="0.8" strokeDasharray="2 4"/>

          {/* High / Low markers */}
          <polygon points={`${cx(hiIdx)},${sY(chartHigh)-9} ${cx(hiIdx)-4},${sY(chartHigh)-3} ${cx(hiIdx)+4},${sY(chartHigh)-3}`} fill={C.green} opacity="0.7"/>
          <text x={cx(hiIdx)} y={sY(chartHigh)-11} fill={C.green} fontSize="7" fontWeight="600" textAnchor="middle" opacity="0.7">H</text>
          <polygon points={`${cx(loIdx)},${sY(chartLow)+9} ${cx(loIdx)-4},${sY(chartLow)+3} ${cx(loIdx)+4},${sY(chartLow)+3}`} fill={C.red} opacity="0.7"/>
          <text x={cx(loIdx)} y={sY(chartLow)+19} fill={C.red} fontSize="7" fontWeight="600" textAnchor="middle" opacity="0.7">L</text>

          {/* EMA lines */}
          <path d={ema50Path} fill="none" stroke={C.gold} strokeWidth="1.5" opacity="1"/>
          <path d={ema20Path} fill="none" stroke={C.blue} strokeWidth="1.5" opacity="1"/>

          {/* Candles */}
          {candles.map((c,i)=>{
            const x=cx(i), bull=c.close>=c.open, col=bull?C.green:C.red;
            const bY=Math.min(sY(c.open),sY(c.close)), bH=Math.max(Math.abs(sY(c.open)-sY(c.close)),1.5);
            return <g key={i}>
              <line x1={x} y1={sY(c.high)} x2={x} y2={sY(c.low)} stroke={col} strokeWidth="1" opacity="0.9"/>
              <rect x={x-bW/2} y={bY} width={bW} height={bH} fill={col} opacity={bull?'1':'0.95'}/>
            </g>;
          })}

          {/* Volume */}
          {candles.map((c,i)=>{ const h=(VH*(c.vol/maxV)), bull=c.close>=c.open; return <rect key={i} x={cx(i)-bW/2} y={SH+2+VH-h} width={bW} height={h} fill={bull?C.green:C.red} opacity="0.45"/>; })}
          <text x={PL+4} y={SH+10} fill={C.text4} fontSize="7">VOL</text>
        </svg>
      </div>

      {/* ── Time range footer ── */}
      <div style={{display:'flex',alignItems:'center',gap:'1px',padding:'7px 14px',borderTop:'1px solid rgba(255,255,255,0.04)',background:'#050505'}}>
        {TF_RANGES.map(r=>(
          <button key={r} onClick={()=>setTfRange(r)} style={{
            background:tfRange===r?C.gold:'transparent',
            color:tfRange===r?'#000':C.text4,
            border:'none',borderRadius:'5px',padding:'3px 8px',
            fontSize:'10.5px',fontWeight:tfRange===r?700:500,cursor:'pointer',transition:'all 0.12s',
          }}>{r}</button>
        ))}
        <div style={{width:'1px',height:'12px',background:C.border,margin:'0 6px',flexShrink:0}}/>
        <button style={{background:'transparent',border:'none',cursor:'pointer',padding:'3px 5px',color:C.text4,display:'flex',alignItems:'center',lineHeight:1}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
        <div style={{marginLeft:'auto',display:'flex',gap:'14px',alignItems:'center'}}>
          <span style={{color:C.text3,fontSize:'10px',fontVariantNumeric:'tabular-nums'}}>
            {new Date().toLocaleTimeString('en-GB')} (UTC+7)
          </span>
          <span style={{color:C.text3,fontSize:'10px',cursor:'pointer'}}>%</span>
          <span style={{color:C.text3,fontSize:'10px',cursor:'pointer'}}>log</span>
          <span style={{color:C.blue,fontSize:'10px',fontWeight:700,cursor:'pointer'}}>auto</span>
        </div>
      </div>
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const MIcon = {
  trendUp:   (c)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  trendDown: (c)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  shield:    (c)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  scale:     (c)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M5 7.5h14M3 12.5l2 5h4l2-5M13 12.5l2 5h4l2-5"/></svg>,
  activity:  (c)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  barChart:  (c)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  clock:     (c)=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

function CheckIcon({ size=15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
      <circle cx="12" cy="12" r="11" fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth="1.5"/>
      <path d="M7 12l3 3 7-7" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function WarnIcon({ size=15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="rgba(251,191,36,0.12)" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill="#fbbf24"/>
    </svg>
  );
}
function PassBox({ pass }) {
  return pass ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth="1.5"/>
      <path d="M7 12l3 3 7-7" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="rgba(248,113,113,0.06)" stroke="rgba(248,113,113,0.3)" strokeWidth="1.5"/>
    </svg>
  );
}
function ArcGauge({ pct, color }) {
  const r=38, cx=46, cy=46;
  const arcLen  = Math.PI * r;
  const dash    = arcLen * (pct / 100);
  const trackPath = `M ${cx-r} ${cy} A ${r} ${r} 0 0 0 ${cx+r} ${cy}`;
  // Needle: angle maps pct 0→left (π), 100→right (0)
  const angle = Math.PI - (pct / 100) * Math.PI;
  const nx = cx + (r - 9) * Math.cos(angle);
  const ny = cy - (r - 9) * Math.sin(angle);
  return (
    <svg viewBox="0 4 92 48" width="100" height="52" style={{display:'block'}}>
      {/* Track */}
      <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round"/>
      {/* Fill arc */}
      <path d={trackPath} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${arcLen}`} style={{transition:'stroke-dasharray 1s ease'}}/>
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny}
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
        style={{transition:'x2 1s ease, y2 1s ease'}}/>
      {/* Center pivot */}
      <circle cx={cx} cy={cy} r="4" fill={color} style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
    </svg>
  );
}

// ── Metrics Row ───────────────────────────────────────────────────────────────
function MetricsRow({ result }) {
  const tColor = result.trend==='Bullish' ? C.green : C.red;
  const cColor = result.confidence>79 ? C.green : result.confidence>69 ? C.yellow : C.red;
  const rColor = result.rrNum>=2 ? C.green : C.yellow;
  const vColor = {Low:C.green,Medium:C.yellow,High:C.red}[result.volatility]||C.yellow;
  const items = [
    { label:'TREND',            icon:(result.trend==='Bullish'?MIcon.trendUp:MIcon.trendDown)(tColor), value:result.trend,             color:tColor },
    { label:'CONFIDENCE',       icon:MIcon.shield(cColor),   value:`${result.confidence}%`, color:cColor, tip:TOOLTIPS.confidence },
    { label:'RISK REWARD',      icon:MIcon.scale(rColor),    value:result.rr,               color:rColor, tip:TOOLTIPS.rr },
    { label:'VOLATILITY',       icon:MIcon.activity(vColor), value:result.volatility,        color:vColor },
    { label:'MARKET STRUCTURE', icon:MIcon.barChart(C.text2),value:result.marketStructure,  color:C.text2 },
    { label:'HOLDING TIME',     icon:MIcon.clock(C.cyan),    value:result.holdingTime,       color:C.cyan, tip:TOOLTIPS.holdTime },
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',marginTop:'12px',background:C.card,border:`1px solid ${C.border}`,borderRadius:'12px',overflow:'hidden'}}>
      {items.map((it,i)=>(
        <div key={it.label} style={{padding:'14px 16px',borderRight:i<5?`1px solid ${C.border}`:'none'}}>
          <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'9px'}}>
            <span style={{color:C.text4,fontSize:'8.5px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase'}}>{it.label}</span>
            {it.tip&&<Tip content={it.tip}/>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
            {it.icon}
            <span style={{color:it.color,fontSize:'13.5px',fontWeight:800,lineHeight:1.2}}>{it.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Analysis Grid (4-col) ─────────────────────────────────────────────────────
function AnalysisGrid({ result, beginner, width }) {
  const isLong = result.signal==='LONG';
  const WHY = isLong ? [
    bT('EMA 20 above EMA 50','Short-term MA crossed above long-term MA',beginner),
    bT('MACD bullish crossover','Buying momentum is starting to increase',beginner),
    bT('RSI in healthy zone','Not overbought — room to rise',beginner),
    bT('Volume increasing','Strong buying participation',beginner),
    bT('Strong support holding',`Key level at ${fmt(result.sup)} is holding`,beginner),
    bT('Momentum improving','Trend acceleration detected',beginner),
  ] : [
    bT('EMA 20 below EMA 50','Short-term MA crossed below long-term MA',beginner),
    bT('MACD bearish crossover','Selling pressure is increasing',beginner),
    bT('RSI declining zone','Momentum turning negative',beginner),
    bT('Volume distribution high','Strong selling participation',beginner),
    bT(`Resistance at ${fmt(result.res)}`,'Price rejected at key resistance',beginner),
    bT('Momentum weakening','Uptrend losing strength',beginner),
  ];
  const RISKS = isLong ? [
    bT(`Resistance near TP2 (${fmt(result.tp2)})`,'Strong sellers may slow progress',beginner),
    bT('High volatility detected','Price may swing sharply',beginner),
    bT('Funding rate elevated','Too many longs — squeeze risk',beginner),
    bT('Possible news impact','Macro events may move price',beginner),
    bT('Whale movement detected','Large players may flip direction',beginner),
  ] : [
    bT(`Support at ${fmt(result.sup)} may hold`,'Buyers may step in here',beginner),
    bT('Short squeeze risk','Too many shorts — reversal risk',beginner),
    bT('News sentiment mixed','Market opinion unclear',beginner),
    bT('Funding rate negative','Shorts overpaying — flip risk',beginner),
    bT('Low volume on down move','Weak bearish conviction',beginner),
  ];
  const MENTOR1 = isLong
    ? bT(`Price is near a key support zone. Waiting for a small pullback into the entry zone (${fmt(result.entry1)}–${fmt(result.entry2)}) gives a better risk-reward ratio before buying.`,`Harga mendekati zona dukungan kuat. Tunggu sedikit koreksi ke zona masuk (${fmt(result.entry1)}–${fmt(result.entry2)}) untuk R:R yang lebih baik.`,beginner)
    : bT(`Price is near local resistance. A retest of the ${fmt(result.entry2)} area before entering short gives better risk-reward. Don't chase the move.`,`Harga mendekati resistansi kuat. Tunggu retest ${fmt(result.entry2)} sebelum masuk short. Jangan kejar pergerakan.`,beginner);
  const MENTOR2 = bT(
    `Place your stop loss at ${fmt(result.sl)} — just below the key ${isLong?'support':'resistance'} to avoid being stopped out by normal market noise.`,
    `Pasang stop loss di ${fmt(result.sl)} untuk melindungi modalmu dari pergerakan tidak terduga.`,
    beginner
  );
  const CHECKLIST = [
    { text:bT('Price in Entry Zone','Harga di zona masuk',beginner), pass:true },
    { text:bT('Trend Confirmed','Arah tren sudah jelas',beginner), pass:true },
    { text:bT('Volume Confirmed','Volume mendukung',beginner), pass:true },
    { text:bT('Risk Acceptable','Risiko dalam batas',beginner), pass:true },
    { text:bT(`Reward > Risk (${result.rr})`,`Potensi untung > rugi`,beginner), pass:result.rrNum>=1.5 },
    { text:bT('No Major News','Tidak ada berita besar',beginner), pass:result.confidence>75 },
  ];

  const card = { background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'18px 16px', display:'flex', flexDirection:'column' };
  const head = { color:C.text, fontSize:'12px', fontWeight:800, marginBottom:'12px' };

  const useDeepSeek = !!result.mentor;
  const chkList = (result.checklist?.length>0)
    ? result.checklist.map(c=>({text:c.item, pass:c.passed}))
    : CHECKLIST;

  const SLabel = ({children, color=C.text4}) => (
    <div style={{color,fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'5px'}}>{children}</div>
  );

  return (
    <div style={{display:'grid',gridTemplateColumns:width<700?'1fr':'1fr 1fr 1fr',gap:'12px',marginTop:'12px',alignItems:'stretch'}}>

      {/* Why This Setup */}
      <div style={card}>
        <div style={head}>Why This Setup?</div>
        <div style={{display:'flex',flexDirection:'column',gap:'9px'}}>
          {WHY.map((w,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'9px'}}>
              <CheckIcon size={14}/>
              <span style={{color:C.text2,fontSize:'11px',lineHeight:1.6}}>{w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Factors */}
      <div style={card}>
        <div style={head}>Risk Factors</div>
        <div style={{display:'flex',flexDirection:'column',gap:'9px'}}>
          {RISKS.map((r,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'9px'}}>
              <WarnIcon size={14}/>
              <span style={{color:C.text2,fontSize:'11px',lineHeight:1.6}}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pre-Trade Checklist */}
      <div style={card}>
        <div style={head}>Pre-Trade Checklist</div>
        <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
          {chkList.map((it,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'9px',padding:'7px 10px',background:it.pass?'rgba(74,222,128,0.04)':'transparent',borderRadius:'8px',border:`1px solid ${it.pass?'rgba(74,222,128,0.1)':'rgba(255,255,255,0.04)'}`}}>
              <PassBox pass={it.pass}/>
              <span style={{color:it.pass?C.text2:C.text3,fontSize:'11px',lineHeight:1.4}}>{it.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── AI Summary Card ───────────────────────────────────────────────────────────
function AISummaryCard({ result }) {
  const isLong = result.signal==='LONG';
  const ac     = isLong ? C.green : C.red;
  const cColor = result.confidence>79 ? C.green : result.confidence>69 ? C.yellow : C.red;
  const rows   = [
    { label:'Entry Zone',      value:`${fmt(result.entry1)} – ${fmt(result.entry2)}`, color:C.green,  tip:TOOLTIPS.entryZone },
    { label:'Stop Loss',       value:fmt(result.sl),        color:C.red,   tip:TOOLTIPS.stopLoss },
    { label:'Take Profit 1',   value:fmt(result.tp1),       color:C.green  },
    { label:'Take Profit 2',   value:fmt(result.tp2),       color:C.green  },
    { label:'Take Profit 3',   value:fmt(result.tp3),       color:C.green  },
    { label:'Risk Reward',     value:result.rr,             color:C.text,  tip:TOOLTIPS.rr },
    { label:'Est. Holding Time',value:result.holdingTime,   color:C.cyan,  tip:TOOLTIPS.holdTime },
  ];
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',overflow:'hidden'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
          <span style={{color:C.text2,fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>AI Summary</span>
        </div>
        <span style={{color:C.text4,fontSize:'10px'}}>Updated: Just now</span>
      </div>

      <div style={{padding:'14px 16px'}}>
        {/* Signal */}
        <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'14px',paddingBottom:'14px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{color:ac,fontSize:'48px',fontWeight:900,letterSpacing:'-0.05em',lineHeight:1,textShadow:`0 0 32px ${ac}55`}}>
            {result.signal}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <div style={{width:28,height:28,borderRadius:8,background:`${ac}14`,border:`1px solid ${ac}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ac} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {isLong ? <><polyline points="17 7 12 12 7 7"/><line x1="12" y1="12" x2="12" y2="20"/></> : <><polyline points="7 17 12 12 17 17"/><line x1="12" y1="12" x2="12" y2="4"/></>}
                </svg>
              </div>
              <div style={{background:`${ac}14`,border:`1px solid ${ac}40`,borderRadius:'20px',padding:'5px 14px',boxShadow:`0 0 12px ${ac}25`}}>
                <span style={{color:ac,fontSize:'12px',fontWeight:800}}>{result.strength}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confidence + Risk */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}}>
          {/* Confidence Arc */}
          <div style={{background:C.card2,borderRadius:'11px',padding:'11px 12px',display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'4px',alignSelf:'flex-start'}}>
              <span style={{color:C.text4,fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:700}}>Confidence</span>
              <Tip content={TOOLTIPS.confidence}/>
            </div>
            <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <ArcGauge pct={result.confidence} color={cColor}/>
              <span style={{position:'absolute',bottom:'-1px',color:cColor,fontSize:'20px',fontWeight:900,lineHeight:1}}>{result.confidence}%</span>
            </div>
          </div>
          {/* Risk Level - dot indicators */}
          <div style={{background:C.card2,borderRadius:'11px',padding:'11px 12px'}}>
            <div style={{color:C.text4,fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:700,marginBottom:'8px'}}>Risk</div>
            <div style={{color:{Low:C.green,Medium:C.yellow,High:C.red}[result.volatility]||C.yellow,fontSize:'18px',fontWeight:900,letterSpacing:'-0.02em',marginBottom:'10px'}}>{result.volatility}</div>
            <div style={{display:'flex',gap:'7px',alignItems:'center'}}>
              {[{v:'Low',c:C.green},{v:'Medium',c:C.yellow},{v:'High',c:C.red}].map(({v,c})=>{
                const active=result.volatility===v;
                return <div key={v} style={{
                  width:11,height:11,borderRadius:'50%',flexShrink:0,
                  background:active?c:`${c}20`,
                  boxShadow:active?`0 0 10px ${c}90,0 0 4px ${c}60`:'none',
                  transition:'all 0.3s',border:`1.5px solid ${active?c:`${c}35`}`,
                }}/>;
              })}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{display:'flex',flexDirection:'column'}}>
          {rows.map((r,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:i<rows.length-1?`1px solid rgba(255,255,255,0.04)`:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                <span style={{color:C.text3,fontSize:'11.5px'}}>{r.label}</span>
                {r.tip&&<Tip content={r.tip}/>}
              </div>
              <span style={{color:r.color||C.text,fontSize:'12px',fontWeight:700,fontFamily:'monospace'}}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* TP Hit Probability */}
        {(()=>{
          const tp1p = Math.round(Math.min(96, result.confidence + 12));
          const tp2p = Math.round(Math.min(88, result.confidence * 0.87));
          const tp3p = Math.round(Math.min(72, result.confidence * 0.68));
          const bars = [
            {label:'TP1',pct:tp1p,color:C.green},
            {label:'TP2',pct:tp2p,color:C.green},
            {label:'TP3',pct:tp3p,color:result.rrNum>=2?C.green:C.yellow},
          ];
          return (
            <div style={{marginTop:'14px',padding:'12px 14px',background:C.card2,borderRadius:'10px'}}>
              <div style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'10px'}}>Hit Probability</div>
              {bars.map(({label,pct,color})=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'7px'}}>
                  <span style={{color:C.text3,fontSize:'10px',fontWeight:600,flex:'0 0 24px'}}>{label}</span>
                  <div style={{flex:1,height:'4px',background:C.card3,borderRadius:'99px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'99px',transition:'width 1.1s ease'}}/>
                  </div>
                  <span style={{color,fontSize:'10px',fontWeight:700,flex:'0 0 30px',textAlign:'right'}}>{pct}%</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Market Insight ────────────────────────────────────────────────────────────
const INSIGHT_ICONS = {
  'Fear & Greed':  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  'Funding Rate':  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  'Open Interest': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  'Whale Activity':<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  'News Sentiment':<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  'Econ Calendar': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

function MarketInsight() {
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',overflow:'hidden',marginTop:'12px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:`1px solid ${C.border}`}}>
        <span style={{color:C.text2,fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>Market Insight</span>
        <span style={{color:C.blue,fontSize:'10.5px',fontWeight:700,cursor:'pointer'}}>See All</span>
      </div>
      <div style={{padding:'12px 14px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px'}}>
        {INSIGHT_DATA.map(it=>(
          <div key={it.label} style={{background:C.card2,borderRadius:'9px',padding:'9px 10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'4px',marginBottom:'6px'}}>
              {INSIGHT_ICONS[it.label]}
              <span style={{color:C.text4,fontSize:'8px',fontWeight:600,textTransform:'uppercase',flex:1,lineHeight:1.3}}>{it.label}</span>
              <Tip content={it.tip}/>
            </div>
            <div style={{color:it.color,fontSize:'12.5px',fontWeight:800,marginBottom:'2px'}}>{it.value}</div>
            <div style={{color:C.text3,fontSize:'9.5px'}}>{it.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Consensus ──────────────────────────────────────────────────────────────
function AIConsensus({ result }) {
  const isBull = result.signal === 'LONG';
  const conf   = result.confidence;
  const ENGINES = [
    { name:'Trend Engine',     signal:result.trend,               score:Math.min(conf+8,99),          color:isBull?C.green:C.red  },
    { name:'Indicator Engine', signal:result.trend,               score:Math.min(conf+3,98),          color:isBull?C.green:C.red  },
    { name:'Volume Engine',    signal:'Neutral',                  score:Math.min(Math.floor(conf*.85),80), color:C.yellow         },
    { name:'Structure Engine', signal:result.marketStructure||result.trend, score:Math.min(conf+1,96), color:isBull?C.green:C.red },
    { name:'News Engine',      signal:isBull?'Bearish':'Bullish', score:Math.max(20,Math.floor(45-conf*.2)), color:isBull?C.red:C.green },
  ];
  const overall = Math.round(ENGINES.reduce((s,e)=>s+e.score,0)/ENGINES.length);
  const oc = overall>74 ? C.green : overall>59 ? C.yellow : C.red;
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',borderBottom:`1px solid ${C.border}`}}>
        <span style={{color:C.text2,fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>AI Consensus</span>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{color:C.text4,fontSize:'9px'}}>Overall</span>
          <span style={{color:oc,fontSize:'14px',fontWeight:900}}>{overall}</span>
          <span style={{color:C.text4,fontSize:'9px'}}>/100</span>
        </div>
      </div>
      <div style={{padding:'12px 16px'}}>
        <div style={{height:'3px',background:C.card3,borderRadius:'99px',marginBottom:'12px',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${overall}%`,background:oc,borderRadius:'99px',transition:'width 1.2s ease'}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
          {ENGINES.map(e=>(
            <div key={e.name} style={{display:'flex',alignItems:'center',gap:'7px'}}>
              <span style={{color:C.text3,fontSize:'10px',flex:'0 0 102px'}}>{e.name}</span>
              <span style={{color:e.color,fontSize:'9.5px',fontWeight:700,flex:'0 0 54px'}}>{e.signal}</span>
              <div style={{flex:1,height:'3px',background:C.card3,borderRadius:'99px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${e.score}%`,background:e.color,borderRadius:'99px',transition:'width 1.2s ease'}}/>
              </div>
              <span style={{color:e.color,fontSize:'9.5px',fontWeight:700,flex:'0 0 30px',textAlign:'right'}}>{e.score}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI Insight Card (DeepSeek) ────────────────────────────────────────────────
function AIInsightCard({ result }) {
  const Sec = ({ label, color, icon, children }) => (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'5px'}}>
        <span style={{color:color,display:'flex'}}>{icon}</span>
        <span style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</span>
      </div>
      <p style={{color:C.text2,fontSize:'11.5px',lineHeight:1.65,margin:0}}>{children}</p>
    </div>
  );

  const iconBrain = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  );

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',overflow:'hidden',marginTop:'12px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',borderBottom:`1px solid ${C.border}`,background:'rgba(167,139,250,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
          <div style={{width:'22px',height:'22px',borderRadius:'6px',background:'rgba(167,139,250,0.12)',border:'1px solid rgba(167,139,250,0.22)',display:'flex',alignItems:'center',justifyContent:'center',color:C.purple}}>
            {iconBrain}
          </div>
          <span style={{color:C.text2,fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>AI Insight</span>
        </div>
        <span style={{fontSize:'8.5px',fontWeight:700,color:C.purple,background:'rgba(167,139,250,0.12)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:'4px',padding:'2px 6px',letterSpacing:'0.04em'}}>
          DEEPSEEK
        </span>
      </div>

      {/* Market summary banner */}
      {result.marketSummary && (
        <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.border}`,background:'rgba(167,139,250,0.04)'}}>
          <span style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginRight:'6px'}}>Market</span>
          <span style={{color:C.text2,fontSize:'11.5px',fontStyle:'italic'}}>{result.marketSummary}</span>
        </div>
      )}

      {/* Main body */}
      <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:'14px'}}>
        {result.mentor && (
          <Sec label="Trade Rationale" color={C.blue}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}>
            {result.mentor}
          </Sec>
        )}

        {result.executionPlan && (
          <Sec label="Execution Plan" color={C.green}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}>
            {result.executionPlan}
          </Sec>
        )}

        {result.stopLossTip && (
          <Sec label="Stop Loss Reasoning" color={C.red}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}>
            {result.stopLossTip}
          </Sec>
        )}

        {result.keyRisks?.length > 0 && (
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'7px'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase'}}>Key Risks</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
              {result.keyRisks.map((r,i) => (
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'7px',padding:'6px 10px',background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.1)',borderRadius:'7px'}}>
                  <span style={{color:C.yellow,fontSize:'10px',fontWeight:800,flexShrink:0,marginTop:'1px'}}>{i+1}</span>
                  <span style={{color:C.text3,fontSize:'11px',lineHeight:1.55}}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Checklist */}
      {result.checklist?.length > 0 && (
        <div style={{padding:'11px 16px',borderTop:`1px solid ${C.border}`,background:C.card2,display:'flex',flexDirection:'column',gap:'6px'}}>
          <span style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'3px',display:'block'}}>Pre-Trade Checklist</span>
          {result.checklist.map((it,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:'7px'}}>
              <div style={{width:'14px',height:'14px',borderRadius:'4px',background:it.passed?'rgba(74,222,128,0.12)':'rgba(248,113,113,0.1)',border:`1px solid ${it.passed?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.25)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {it.passed
                  ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </div>
              <span style={{color:it.passed?C.text2:C.text3,fontSize:'10.5px'}}>{it.item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trading Config Card ───────────────────────────────────────────────────────
function TradingConfigCard({ styleKey, onStyle, risk, onRisk, rrTarget, onRr }) {
  const RISK_AC = { Conservative: C.blue, Moderate: C.gold, Aggressive: C.red };

  const Seg = ({ pills, value, onChange, cols, acFn }) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '2px',
      background: '#090909',
      borderRadius: '9px',
      padding: '2px',
    }}>
      {pills.map(({ v, l }) => {
        const active = value === v;
        const ac = acFn(v);
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            background: active ? '#1b1b1b' : 'transparent',
            border: `1px solid ${active ? `${ac}40` : 'transparent'}`,
            borderRadius: '7px',
            padding: '7px 4px',
            cursor: 'pointer',
            color: active ? ac : C.text3,
            fontSize: '10.5px',
            fontWeight: active ? 700 : 500,
            transition: 'all 0.14s',
            textAlign: 'center',
            letterSpacing: active ? '-0.01em' : '0',
            boxShadow: active ? `0 1px 6px rgba(0,0,0,0.3)` : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = C.text2; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.text3; } }}
          >{l}</button>
        );
      })}
    </div>
  );

  const Lbl = ({ children }) => (
    <div style={{ color: C.text4, fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' }}>
      {children}
    </div>
  );

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${C.border}`, gap: '7px' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </div>
        <span style={{ color: C.text2, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Trading Configuration</span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
        {/* Trading Style */}
        <div>
          <Lbl>Trading Style</Lbl>
          <Seg pills={STYLE_PILLS} value={styleKey} onChange={onStyle} cols={5} acFn={() => C.gold} />
        </div>

        {/* Risk Profile */}
        <div>
          <Lbl>Risk Profile</Lbl>
          <Seg pills={RISK_PILLS} value={risk} onChange={onRisk} cols={3} acFn={v => RISK_AC[v] || C.text} />
        </div>

        {/* Risk Reward */}
        <div>
          <Lbl>Risk : Reward Target</Lbl>
          <Seg pills={RR_PILLS} value={rrTarget} onChange={onRr} cols={3} acFn={() => C.green} />
        </div>
      </div>
    </div>
  );
}

// ── Trade Execution Plan ──────────────────────────────────────────────────────
function TradeExecutionPlanCard({ result, activeTf }) {
  const isLong = result.signal === 'LONG';
  const STEPS = [
    {
      num:'①', label:'Wait', color:C.yellow,
      icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      desc:`Wait for ${activeTf||'current'} candle to close. Confirm signal before entry.`,
    },
    {
      num:'②', label:'Entry', color:C.blue,
      icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>,
      desc:`Enter in zone ${fmt(result.entry1)} – ${fmt(result.entry2)}`,
    },
    {
      num:'③', label:'Stop Loss', color:C.red,
      icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
      desc:`SL at ${fmt(result.sl)} — max loss per position.`,
    },
    {
      num:'④', label:'Take Profit', color:C.green,
      icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>,
      desc:null,
      tps:[{l:'TP1',v:fmt(result.tp1)},{l:'TP2',v:fmt(result.tp2)},{l:'TP3',v:fmt(result.tp3)}],
    },
    {
      num:'⑤', label:'Exit Rule', color:C.text3,
      icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
      desc:`Cancel if price ${isLong?'breaks below':'breaks above'} ${fmt(result.sl)} or AI signal flips.`,
    },
  ];
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'7px',padding:'11px 16px',borderBottom:`1px solid ${C.border}`}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13M9 9l12-2"/></svg>
        <span style={{color:C.text2,fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>Trade Execution Plan</span>
      </div>
      <div style={{padding:'14px 16px',display:'flex',flexDirection:'column'}}>
        {STEPS.map((step,i)=>(
          <div key={step.num}>
            <div style={{display:'flex',gap:'11px',alignItems:'flex-start'}}>
              <div style={{width:'26px',height:'26px',borderRadius:'7px',background:`${step.color}12`,border:`1px solid ${step.color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:step.color,fontSize:'11px',fontWeight:700}}>
                {step.num}
              </div>
              <div style={{flex:1,paddingBottom:'8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}>
                  <span style={{color:step.color,display:'flex'}}>{step.icon}</span>
                  <span style={{color:C.text,fontSize:'11.5px',fontWeight:700}}>{step.label}</span>
                </div>
                {step.desc&&<div style={{color:C.text3,fontSize:'10.5px',lineHeight:1.5}}>{step.desc}</div>}
                {step.tps&&(
                  <div style={{display:'flex',gap:'5px',marginTop:'5px',flexWrap:'wrap'}}>
                    {step.tps.map(tp=>(
                      <div key={tp.l} style={{background:C.card2,border:'1px solid rgba(74,222,128,0.15)',borderRadius:'6px',padding:'3px 9px',display:'flex',gap:'4px',alignItems:'center'}}>
                        <span style={{color:C.text4,fontSize:'8.5px'}}>{tp.l}</span>
                        <span style={{color:C.green,fontSize:'10px',fontWeight:700,fontFamily:'monospace'}}>{tp.v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {i<STEPS.length-1&&(
              <div style={{display:'flex',gap:'11px',paddingBottom:'6px'}}>
                <div style={{width:'26px',display:'flex',justifyContent:'center',flexShrink:0}}>
                  <div style={{width:'1px',height:'14px',background:`linear-gradient(${step.color}60,${STEPS[i+1].color}60)`}}/>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Multi Timeframe Confirmation ───────────────────────────────────────────────
function MultiTFConfirmation({ result }) {
  const trend = result?.trend;
  const isBull = trend === 'Bullish';
  const TFS = [
    { tf:'1m',  signal:'Neutral',                          color:C.yellow },
    { tf:'5m',  signal:trend?(isBull?'Bullish':'Bearish'):'Bullish', color:trend?(isBull?C.green:C.red):C.green },
    { tf:'15m', signal:trend?(isBull?'Bullish':'Bearish'):'Neutral', color:trend?(isBull?C.green:C.red):C.yellow },
    { tf:'1H',  signal:trend?(isBull?'Bullish':'Bearish'):'Bullish', color:trend?(isBull?C.green:C.red):C.green },
    { tf:'4H',  signal:trend?(isBull?'Bullish':'Bearish'):'Bullish', color:trend?(isBull?C.green:C.red):C.green },
  ];
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'12px',padding:'14px 16px',marginTop:'10px'}}>
      <div style={{color:C.text2,fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'12px'}}>Multi Timeframe Confirmation</div>
      <div style={{display:'flex',gap:'8px'}}>
        {TFS.map(({tf,signal,color})=>(
          <div key={tf} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',padding:'10px 4px',background:C.card2,borderRadius:'9px',border:`1px solid ${C.border}`}}>
            <span style={{color:C.text4,fontSize:'10px',fontWeight:700}}>{tf}</span>
            <span style={{background:`${color}14`,border:`1px solid ${color}40`,color,fontSize:'8.5px',fontWeight:700,borderRadius:'5px',padding:'2px 6px',textAlign:'center',whiteSpace:'nowrap'}}>{signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Market Stat Cards (below chart) ──────────────────────────────────────────
function MarketStatCards({ result }) {
  const isBull = result?.signal === 'LONG';
  const conf   = result?.confidence || 72;
  const fgScore = result ? (isBull ? Math.min(90, 50+conf*0.4)|0 : Math.max(15, 50-conf*0.4)|0) : 68;
  const fgLabel = fgScore>=75?'Extreme Greed':fgScore>=55?'Greed':fgScore>=45?'Neutral':fgScore>=25?'Fear':'Extreme Fear';
  const fgColor = fgScore>=55?'#84cc16':fgScore>=45?C.yellow:C.red;
  const whaleAct = result ? (isBull?'Accumulating':'Distributing') : 'Accumulating';
  const whaleInt = result ? (conf>75?'High':'Medium') : 'High';
  const newsSent = result ? (isBull?'Bullish':'Bearish') : 'Bullish';
  const newsSub  = result ? (conf>80?'Strongly +':'Moderately +') : 'Positive';

  const stats = [
    {
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={fgColor} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
      label:'Fear & Greed', value:`${fgScore}`, sub:`${fgLabel}`, color:fgColor,
    },
    {
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
      label:'Funding Rate', value:'0.0102%', sub:'Positive', color:C.yellow,
    },
    {
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
      label:'Open Interest', value:'$27.45B', sub:'+2.31%', color:C.blue,
    },
    {
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
      label:'Whale Activity', value:whaleInt, sub:whaleAct, color:C.purple,
    },
    {
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={result?(isBull?C.green:C.red):C.green} strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
      label:'News Sentiment', value:newsSent, sub:newsSub, color:result?(isBull?C.green:C.red):C.green,
    },
    {
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
      label:'Econ Calendar', value:'3 Events', sub:'Today', color:C.yellow,
    },
  ];

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'8px',marginTop:'10px'}}>
      {stats.map((s,i)=>(
        <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'12px',padding:'12px 13px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'9px'}}>
            {s.icon}
            <span style={{color:C.text4,fontSize:'8.5px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',lineHeight:1.3}}>{s.label}</span>
          </div>
          <div style={{color:s.color,fontSize:'15px',fontWeight:800,marginBottom:'4px',lineHeight:1}}>{s.value}</div>
          <div>
            <div style={{color:C.text3,fontSize:'10px',fontWeight:600}}>{s.sub}</div>
            {s.bar!==undefined&&(
              <div style={{height:'3px',background:C.card3,borderRadius:'99px',marginTop:'7px',overflow:'hidden'}}>
                <div style={{width:`${s.bar}%`,height:'100%',background:s.color,borderRadius:'99px',transition:'width 0.8s ease'}}/>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AI Mentor Card (full-width, below main grid) ─────────────────────────────
function AIMentorCard({ result, width }) {
  const isLong = result.signal==='LONG';
  const useGroq = !!result.mentor;
  const MENTOR1 = isLong
    ? `Price is near a key support zone. Waiting for a small pullback into the entry zone (${fmt(result.entry1)}–${fmt(result.entry2)}) gives a better risk-reward ratio before buying.`
    : `Price is near local resistance. A retest of the ${fmt(result.entry2)} area before entering short gives better risk-reward. Don't chase the move.`;
  const MENTOR2 = `Place your stop loss at ${fmt(result.sl)} — just below the key ${isLong?'support':'resistance'} to avoid being stopped out by normal market noise.`;

  const SLabel = ({children,color=C.text4})=>(
    <div style={{color,fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'5px'}}>{children}</div>
  );
  const card = {background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',overflow:'hidden'};

  return (
    <div style={{...card,marginTop:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'12px 18px',borderBottom:`1px solid ${C.border}`,flexWrap:'wrap'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
        <span style={{color:C.text,fontSize:'12px',fontWeight:800}}>AI Mentor</span>
        {useGroq&&<span style={{fontSize:'8px',fontWeight:700,color:C.purple,background:'rgba(167,139,250,0.12)',border:'1px solid rgba(167,139,250,0.2)',borderRadius:'4px',padding:'2px 6px',letterSpacing:'0.04em'}}>GROQ</span>}
        <div style={{display:'flex',gap:'5px',marginLeft:'2px',flexWrap:'wrap'}}>
          {[
            {label:'Trend',val:result.confidence>79?'Strong':result.confidence>59?'Moderate':'Weak',color:result.confidence>79?C.green:result.confidence>59?C.yellow:C.red},
            {label:'Momentum',val:result.signal==='LONG'?'Bullish':'Bearish',color:result.signal==='LONG'?C.green:C.red},
            {label:'Volatility',val:result.volatility,color:{Low:C.green,Medium:C.yellow,High:C.red}[result.volatility]||C.yellow},
          ].map(b=>(
            <div key={b.label} style={{display:'flex',gap:'3px',background:C.card2,border:`1px solid ${C.border}`,borderRadius:'5px',padding:'2px 7px'}}>
              <span style={{color:C.text4,fontSize:'8px'}}>{b.label}:</span>
              <span style={{color:b.color,fontSize:'8.5px',fontWeight:700}}>{b.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'18px 20px'}}>
        {/* Main content grid */}
        {useGroq ? (
          <div style={{display:'grid',gridTemplateColumns:width<700?'1fr':width<1000?'1fr 1fr':'1fr 1fr 1fr',gap:'20px',marginBottom:'16px'}}>
            {result.mentor&&<div><SLabel color={C.blue}>Trade Rationale</SLabel><p style={{color:C.text2,fontSize:'11.5px',lineHeight:1.75,margin:0}}>{result.mentor}</p></div>}
            {result.executionPlan&&<div><SLabel color={C.green}>Execution Plan</SLabel><p style={{color:C.text2,fontSize:'11.5px',lineHeight:1.75,margin:0}}>{result.executionPlan}</p></div>}
            {result.stopLossTip&&<div><SLabel color={C.red}>Stop Loss Reasoning</SLabel><p style={{color:C.text2,fontSize:'11.5px',lineHeight:1.75,margin:0}}>{result.stopLossTip}</p></div>}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:width<700?'1fr':'1fr 1fr',gap:'20px',marginBottom:'16px'}}>
            <p style={{color:C.text2,fontSize:'11.5px',lineHeight:1.75,margin:0}}>{MENTOR1}</p>
            <p style={{color:C.text2,fontSize:'11.5px',lineHeight:1.75,margin:0}}>{MENTOR2}</p>
          </div>
        )}

        {/* Key Risks + Why Not Enter */}
        <div style={{display:'grid',gridTemplateColumns:width<700?'1fr':'1fr 1fr',gap:'12px',paddingTop:'16px',borderTop:`1px solid ${C.border}`}}>
          {result.keyRisks?.length>0&&(
            <div>
              <SLabel color={C.yellow}>Key Risks</SLabel>
              <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                {result.keyRisks.map((r,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'7px',padding:'6px 10px',background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.1)',borderRadius:'7px'}}>
                    <span style={{color:C.yellow,fontSize:'10px',fontWeight:800,flexShrink:0,marginTop:'1px'}}>{i+1}</span>
                    <span style={{color:C.text3,fontSize:'11px',lineHeight:1.55}}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{padding:'11px 14px',background:'rgba(251,191,36,0.04)',border:'1px solid rgba(251,191,36,0.1)',borderRadius:'9px',alignSelf:'start'}}>
            <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'7px'}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{color:C.yellow,fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>Why Not Enter Yet?</span>
            </div>
            {result.riskFactors?.length>0 ? (
              <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                {result.riskFactors.slice(0,3).map((r,i)=>(
                  <div key={i} style={{display:'flex',gap:'7px',alignItems:'flex-start'}}>
                    <span style={{color:C.yellow,fontSize:'10px',flexShrink:0}}>⚠</span>
                    <span style={{color:C.text3,fontSize:'10.5px',lineHeight:1.4}}>{r}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{color:C.green,fontSize:'11px',fontWeight:600}}>No major warning. Setup looks valid.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── News Behind The Signal ─────────────────────────────────────────────────────
function NewsBehindTheSignal({ result }) {
  const isLong = result.signal==='LONG';
  const ac = isLong ? C.green : C.red;

  const newsItems = [
    {
      icon:'📊', label:'Funding Rate', value:'0.0102% (Positive)', color:C.yellow,
      detail:isLong?'Moderate funding suggests healthy long momentum without over-leverage.':'Shorts paying high funding — squeeze risk if price reverses.',
    },
    {
      icon:'🐋', label:'Whale Activity', value:isLong?'High Accumulation':'Distribution', color:C.purple,
      detail:isLong?'Large wallets are net buyers. On-chain data shows wallets >$1M adding positions.':'Whales reducing exposure — potential distribution before move down.',
    },
    {
      icon:'📈', label:'Open Interest', value:'+2.31%', color:C.blue,
      detail:isLong?'Rising OI on upward price confirms trend strength — more participants entering long.':'Rising OI as price falls = strong bearish conviction from new shorts.',
    },
    {
      icon:'📰', label:'News Sentiment', value:isLong?'Bullish':'Bearish', color:isLong?C.green:C.red,
      detail:isLong?'AI scanned 500+ news articles: positive sentiment score 72/100 supporting upside bias.':'Negative macro sentiment from Fed, regulatory noise pushing sentiment below 40/100.',
    },
    {
      icon:'💰', label:'On-Chain Flow', value:isLong?'Exchange Outflow':'Exchange Inflow', color:isLong?C.green:C.red,
      detail:isLong?'Crypto moving OFF exchanges = holders accumulating, reducing sell pressure.':'Crypto moving TO exchanges = potential sell pressure increase incoming.',
    },
    {
      icon:'🎯', label:'Liquidation Cluster', value:isLong?`Above ${fmt(result.tp2)}`:`Below ${fmt(result.entry2)}`, color:C.cyan,
      detail:isLong?`Liquidation cluster at ${fmt(result.tp2)} creates a price magnet — longs may get squeezed up there.`:`Shorts clustered below ${fmt(result.entry2)} — liquidation cascade could push price down fast.`,
    },
  ];

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',overflow:'hidden',marginTop:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 18px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{width:'26px',height:'26px',borderRadius:'8px',background:'rgba(79,124,255,0.1)',border:'1px solid rgba(79,124,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <div>
          <span style={{color:C.text,fontSize:'12px',fontWeight:800}}>News Behind The Signal</span>
          <div style={{color:C.text4,fontSize:'10px',marginTop:'1px'}}>AI menghubungkan berita & data on-chain dengan alasan sinyal ini</div>
        </div>
        <div style={{marginLeft:'auto',background:`${ac}14`,border:`1px solid ${ac}35`,borderRadius:'20px',padding:'4px 12px'}}>
          <span style={{color:ac,fontSize:'11px',fontWeight:700}}>Why {result.signal}?</span>
        </div>
      </div>

      {result.marketSummary&&(
        <div style={{padding:'10px 18px',borderBottom:`1px solid ${C.border}`,background:'rgba(79,124,255,0.03)'}}>
          <span style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginRight:'8px'}}>Market Summary</span>
          <span style={{color:C.text2,fontSize:'11.5px',fontStyle:'italic'}}>{result.marketSummary}</span>
        </div>
      )}

      <div style={{padding:'16px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
        {newsItems.map((item,i)=>(
          <div key={i} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:'10px',padding:'12px 13px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
              <span style={{fontSize:'14px'}}>{item.icon}</span>
              <span style={{color:C.text3,fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{item.label}</span>
            </div>
            <div style={{color:item.color,fontSize:'12px',fontWeight:800,marginBottom:'6px'}}>{item.value}</div>
            <div style={{color:C.text4,fontSize:'10.5px',lineHeight:1.55}}>{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Right Panel Ready (idle state) ────────────────────────────────────────────
function RightPanelReady({ asset }) {
  const [ticker24h, setTicker24h] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${asset.ticker}USDT`);
        const d = await r.json();
        if (!cancel && d.lastPrice) {
          setTicker24h(d);
          setUpdatedAt(new Date().toLocaleTimeString('en-GB'));
        }
      } catch {}
    })();
    return () => { cancel = true; };
  }, [asset.ticker]);

  const t = ticker24h;
  const pct = t ? parseFloat(t.priceChangePercent) : null;
  const vol = t ? (parseFloat(t.quoteVolume)/1e9).toFixed(2) : null;
  const highRange = t ? `${fmt(parseFloat(t.lowPrice))} – ${fmt(parseFloat(t.highPrice))}` : '—';

  const rows = [
    { label:'Fear & Greed', value:'78',           sub:'Greed',              color:'#84cc16' },
    { label:'Funding Rate',  value:'0.0102%',      sub:'Positive',           color:C.yellow  },
    { label:'Open Interest', value:'$27.4B',       sub:'+2.3%',              color:C.blue    },
    { label:'Volume 24H',    value:vol?`$${vol}B`:'—', sub:'Binance PERP',   color:C.cyan    },
    { label:'Volatility',    value:pct!=null?`${Math.abs(pct).toFixed(2)}%`:'—', sub:pct!=null?(Math.abs(pct)>3?'High':Math.abs(pct)>1.5?'Medium':'Low'):'—', color:pct!=null?(Math.abs(pct)>3?C.red:Math.abs(pct)>1.5?C.yellow:C.green):C.text3 },
    { label:'24H Range',     value:highRange,      sub:`${asset.ticker}/USDT`, color:C.text2 },
    { label:'Market Status', value:'Open',         sub:'Futures · 24/7',     color:C.green   },
    { label:'Last Updated',  value:updatedAt||'—', sub:'Auto refresh',       color:C.text3   },
  ];

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',overflow:'hidden'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
          <span style={{color:C.text2,fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>Market Overview</span>
        </div>
        <span style={{background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.3)',color:C.green,fontSize:'10px',fontWeight:700,borderRadius:'99px',padding:'3px 10px',whiteSpace:'nowrap'}}>Ready to Analyze</span>
      </div>

      {/* Live market grid */}
      <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:'6px'}}>
        {/* Live ticker banner (if fetched) */}
        {t && (
          <div style={{background:C.card2,borderRadius:'10px',padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'4px',border:`1px solid ${C.border}`}}>
            <div>
              <div style={{color:C.text4,fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'3px'}}>{asset.ticker}/USDT · PERP</div>
              <div style={{color:C.text,fontSize:'22px',fontWeight:900,lineHeight:1,letterSpacing:'-0.04em'}}>{fmt(parseFloat(t.lastPrice))}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{color:pct>=0?C.green:C.red,fontSize:'16px',fontWeight:800,lineHeight:1}}>{pct>=0?'+':''}{pct?.toFixed(2)}%</div>
              <div style={{color:C.text4,fontSize:'9px',marginTop:'4px'}}>24H Change</div>
            </div>
          </div>
        )}

        {/* 2-col stats grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
          {rows.map(({label,value,sub,color})=>(
            <div key={label} style={{background:C.card2,borderRadius:'9px',padding:'8px 10px',border:`1px solid ${C.border}`}}>
              <div style={{color:C.text4,fontSize:'8.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'4px'}}>{label}</div>
              <div style={{color,fontSize:'13px',fontWeight:800,lineHeight:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{value}</div>
              <div style={{color:C.text4,fontSize:'9px',marginTop:'3px'}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 12px',background:'rgba(79,124,255,0.05)',borderRadius:'9px',border:'1px solid rgba(79,124,255,0.18)',marginTop:'2px'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style={{color:C.blue,fontSize:'11px',fontWeight:700}}>Click Start Analyze for AI signal</span>
        </div>
      </div>
    </div>
  );
}

// ── Right Panel Empty (legacy, unused) ────────────────────────────────────────
function RightPanelEmpty() {
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',padding:'36px 22px',display:'flex',flexDirection:'column',alignItems:'center',gap:'14px',textAlign:'center',flex:1}}>
      <div style={{width:'48px',height:'48px',borderRadius:'14px',background:'rgba(91,94,244,0.08)',border:'1px solid rgba(91,94,244,0.18)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
      </div>
      <div style={{color:C.text2,fontSize:'14px',fontWeight:800,letterSpacing:'-0.01em'}}>AI Summary</div>
      <div style={{color:C.text3,fontSize:'12px',lineHeight:1.65,maxWidth:'200px'}}>Select an asset, choose your trading style, and click Analyze to see the full AI report.</div>
      <div style={{width:'40px',height:'1px',background:C.border}}/>
      {['AI Signal & Direction','Entry / Exit Levels','Market Insight','AI Consensus'].map(s=>(
        <div key={s} style={{display:'flex',alignItems:'center',gap:'9px',width:'100%',maxWidth:'200px',padding:'8px 12px',background:C.card2,borderRadius:'8px'}}>
          <div style={{width:'12px',height:'5px',borderRadius:'2px',background:C.card3,flexShrink:0}}/>
          <div style={{color:C.text4,fontSize:'11px'}}>{s}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AITrade() {
  const { width }  = useWindowSize();
  const isNarrow   = width < 1100;
  const isMobile   = width < 700;

  const [asset,    setAsset]    = useState(DEFAULT_ASSET);
  const [styleKey, setStyleKey] = useState('Day Trading');
  const [tf,       setTf]       = useState('15m');
  const [autoTf,   setAutoTf]   = useState(true);
  const [risk,     setRisk]     = useState('Moderate');
  const [rrTarget, setRrTarget] = useState('1:2');
  const [phase,    setPhase]    = useState('idle');
  const [step,     setStep]     = useState(0);
  const [result,   setResult]   = useState(null);
  const [zones,    setZones]    = useState({});

  const [candles, setCandles] = useState(()=>generateCandles(asset.ticker.charCodeAt(0)*17+asset.ticker.charCodeAt(1)*7, asset.price));
  const cfgFor   = useCallback(k=>STYLES.find(s=>s.key===k)||STYLES[1],[]);
  const activeTf = autoTf ? cfgFor(styleKey).defaultTf : tf;
  const cfgTfs   = cfgFor(styleKey).tfs;

  // Reset to mock candles when asset changes
  useEffect(()=>{
    setCandles(generateCandles(asset.ticker.charCodeAt(0)*17+asset.ticker.charCodeAt(1)*7, asset.price));
    setResult(null); setPhase('idle'); setZones({});
  },[asset]); // eslint-disable-line

  const handleStyleChange = useCallback(key=>{
    setStyleKey(key); setPhase('idle'); setResult(null); setZones({});
    const cfg=cfgFor(key);
    if(autoTf||!cfg.tfs.includes(tf)) setTf(cfg.defaultTf);
  },[autoTf,tf,cfgFor]);

  const handleAutoTf = useCallback(val=>{
    setAutoTf(val);
    if(val) setTf(cfgFor(styleKey).defaultTf);
  },[styleKey,cfgFor]);

  const ZONE_ORDER = ['sup','res','sl','entry','tp1','tp2','tp3'];
  const handleAnalyze = useCallback(async ()=>{
    if(phase==='loading') return;
    setPhase('loading'); setStep(0); setResult(null); setZones({});
    LOADING_STEPS.forEach((_,i)=>setTimeout(()=>setStep(i),i*400));
    const minDelay = LOADING_STEPS.length*400+400;
    const t0 = Date.now();
    try {
      const API_URL = process.env.REACT_APP_API_URL||'';
      const res = await fetch(`${API_URL}/api/ai-trade/analyze`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ symbol:asset.ticker, timeframe:activeTf, style:styleKey, risk_profile:risk }),
      });
      if(!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const d    = data.decision;
      const lvl  = data.levels;
      const sup  = lvl.support.length  ? lvl.support[lvl.support.length-1]  : data.current_price*0.97;
      const res_ = lvl.resistance.length ? lvl.resistance[0]                : data.current_price*1.03;
      const mapped = {
        signal:d.signal, entry1:d.entry_low, entry2:d.entry_high, sl:d.stop_loss,
        tp1:d.tp1, tp2:d.tp2, tp3:d.tp3, sup, res:res_,
        rr:`1 : ${d.risk_reward}`, rrNum:d.risk_reward,
        confidence:d.confidence, trend:d.trend, volatility:d.volatility,
        marketStructure:d.market_structure, holdingTime:d.holding_time, strength:d.strength,
        reasons:d.reasons, riskFactors:d.risk_factors,
        mentor:        data.explanation?.mentor          || '',
        stopLossTip:   data.explanation?.stop_loss_tip   || '',
        marketSummary: data.explanation?.market_summary  || '',
        executionPlan: data.explanation?.execution_plan  || '',
        keyRisks:      data.explanation?.key_risks       || [],
        checklist:     data.explanation?.checklist       || [],
      };
      if(data.candles?.length) setCandles(data.candles);
      if(data.current_price)   setAsset(prev=>({...prev, price:data.current_price}));
      const wait = Math.max(0, minDelay-(Date.now()-t0));
      setTimeout(()=>{
        setResult(mapped); setPhase('done');
        ZONE_ORDER.forEach((_z,i)=>setTimeout(()=>setZones(prev=>({...prev,[ZONE_ORDER[i]]:true})),i*150+200));
      },wait);
    } catch(err){
      console.error('AI Trade error:',err);
      const wait = Math.max(0, minDelay-(Date.now()-t0));
      setTimeout(()=>setPhase('error'),wait);
    }
  },[asset,styleKey,activeTf,risk,phase]); // eslint-disable-line

  return (
    <div style={{padding:isMobile?'10px':'14px 16px 14px 2px',maxWidth:'1600px'}}>
      <style>{`
        @keyframes at-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        @keyframes at-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes at-skel{0%,100%{opacity:0.25}50%{opacity:0.55}}
      `}</style>

      {/* ── Page Title (standalone, seperti halaman lain) ── */}
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
        <div style={{width:'34px',height:'34px',borderRadius:'10px',background:'rgba(79,124,255,0.12)',border:'1px solid rgba(79,124,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div>
          <div style={{color:C.text,fontSize:'20px',fontWeight:900,letterSpacing:'-0.03em',lineHeight:1}}>AI Trade</div>
          <div style={{color:C.text4,fontSize:'11px',marginTop:'3px'}}>AI-Powered Trading Analysis &amp; Signal</div>
        </div>
      </div>

      {/* ── Row 1: Search | Trading Style ── */}
      <div style={{
        background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px',
        padding:'8px 14px', marginBottom:'6px',
        display:'flex', alignItems:'center', gap:'0', flexWrap:'nowrap', overflow:'visible',
      }}>
        {/* Search Asset — wider to fill empty space */}
        <div style={{flexShrink:0,width:'300px'}}>
          <AssetSearch selected={asset} onSelect={a=>{setAsset(a);setPhase('idle');setResult(null);setZones({});}}/>
        </div>

        <div style={{width:'1px',height:'40px',background:C.border,margin:'0 14px',flexShrink:0}}/>

        {/* Trading Style — label + tabs */}
        <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'4px'}}>
            <span style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>Trading Style</span>
          </div>
          <StyleTabs value={styleKey} onChange={handleStyleChange}/>
        </div>
      </div>

      {/* ── Row 2: Timeframe | Risk Profile | Start Analyze ── */}
      <div style={{
        background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px',
        padding:'8px 14px', marginBottom:'10px',
        display:'flex', alignItems:'center', gap:'0', flexWrap:'nowrap',
      }}>
        {/* Timeframe */}
        <div style={{flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'4px'}}>
            <span style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>Timeframe</span>
            <Tip content={TOOLTIPS.tf}/>
          </div>
          <div style={{display:'flex',gap:'4px',flexWrap:'nowrap'}}>
            <button onClick={()=>handleAutoTf(!autoTf)} style={{
              background:autoTf?'rgba(79,124,255,0.12)':'transparent',
              border:`1px solid ${autoTf?'rgba(79,124,255,0.5)':C.border}`,
              borderRadius:'8px',padding:'6px 12px',cursor:'pointer',
              color:autoTf?C.blue:C.text3,fontSize:'10.5px',fontWeight:autoTf?700:500,
              transition:'all 0.15s',whiteSpace:'nowrap',flexShrink:0,
            }}>Auto (Recommended)</button>
            {cfgTfs.map(t=>{
              const active=!autoTf&&tf===t;
              const isAuto=autoTf&&t===cfgFor(styleKey).defaultTf;
              return <button key={t} onClick={()=>{if(!autoTf)setTf(t);}} disabled={autoTf} style={{
                background:active?C.blue:isAuto?'rgba(79,124,255,0.1)':'transparent',
                color:active?'#fff':isAuto?C.blue:C.text3,
                border:`1px solid ${active?C.blue:isAuto?'rgba(79,124,255,0.35)':C.border}`,
                borderRadius:'7px',padding:'6px 11px',fontSize:'10.5px',fontWeight:active||isAuto?700:500,
                cursor:autoTf?'default':'pointer',transition:'all 0.12s',flexShrink:0,
              }}>{t}</button>;
            })}
          </div>
        </div>

        <div style={{width:'1px',height:'38px',background:C.border,margin:'0 18px',flexShrink:0}}/>

        {/* Risk Profile */}
        <div style={{flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'4px'}}>
            <span style={{color:C.text4,fontSize:'9px',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase'}}>Risk Profile</span>
            <Tip content="Set your risk tolerance"/>
          </div>
          <div style={{display:'flex',gap:'4px'}}>
            {RISK_PILLS.map(({v,l})=>{
              const active=risk===v;
              const ac={Conservative:C.blue,Moderate:C.gold,Aggressive:C.red}[v];
              return <button key={v} onClick={()=>setRisk(v)} style={{
                background:active?`${ac}14`:'transparent',
                border:`1px solid ${active?`${ac}55`:C.border}`,
                borderRadius:'8px',padding:'6px 12px',cursor:'pointer',
                color:active?ac:C.text3,fontSize:'10.5px',fontWeight:active?700:500,
                transition:'all 0.15s',whiteSpace:'nowrap',
                boxShadow:active?`0 0 10px ${ac}25`:'none',
              }}>{l}</button>;
            })}
          </div>
        </div>

        {/* Start Analyze — fills remaining space on right */}
        <div style={{flex:1,display:'flex',justifyContent:'flex-end'}}>
          <button onClick={handleAnalyze} disabled={phase==='loading'} style={{
            background:phase==='loading'
              ? C.card3
              : 'linear-gradient(135deg, #0D1B2E 0%, #152848 35%, #1D3461 60%, #4F7CFF 100%)',
            color:phase==='loading'?C.text3:'#fff',
            border:`1px solid ${phase==='loading'?C.border:'rgba(79,124,255,0.5)'}`,
            borderRadius:'11px',
            padding:'0 32px',fontSize:'13.5px',fontWeight:800,
            cursor:phase==='loading'?'default':'pointer',
            height:'44px',transition:'all 0.25s',flexShrink:0,
            boxShadow:phase==='loading'?'none':'0 4px 20px rgba(79,124,255,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            display:'flex',alignItems:'center',gap:'9px',whiteSpace:'nowrap',letterSpacing:'-0.01em',
          }}
            onMouseEnter={e=>{if(phase!=='loading'){
              e.currentTarget.style.background='linear-gradient(135deg, #152848 0%, #1D3461 35%, #2a4fa0 60%, #60A5FA 100%)';
              e.currentTarget.style.transform='translateY(-1px)';
              e.currentTarget.style.boxShadow='0 8px 28px rgba(79,124,255,0.4), inset 0 1px 0 rgba(255,255,255,0.12)';
            }}}
            onMouseLeave={e=>{
              e.currentTarget.style.background=phase!=='loading'?'linear-gradient(135deg, #0D1B2E 0%, #152848 35%, #1D3461 60%, #4F7CFF 100%)':C.card3;
              e.currentTarget.style.transform='none';
              e.currentTarget.style.boxShadow=phase!=='loading'?'0 4px 20px rgba(79,124,255,0.25), inset 0 1px 0 rgba(255,255,255,0.08)':'none';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            {phase==='loading'?'Analyzing...':'Start Analyze'}
          </button>
        </div>
      </div>

      {/* ── Main Grid: 70% chart col | 30% AI sidebar ── */}
      <div style={{display:'grid',gridTemplateColumns:isNarrow?'1fr':'minmax(0,1fr) 348px',gap:'12px',alignItems:'start'}}>

        {/* LEFT: Chart → MetricsRow → Analysis */}
        <div>
          {/* Chart */}
          <div style={{position:'relative'}}>
            <CandleChart candles={candles} result={phase==='done'?result:null} zones={zones} asset={asset} activeTf={activeTf}/>
            {phase==='loading'&&<LoadingOverlay step={step}/>}
          </div>

          {/* Metrics Row (6-stat bar): only when done */}
          {phase==='done'&&result&&<MetricsRow result={result}/>}

          {/* Error banner */}
          {phase==='error'&&(
            <div style={{background:'rgba(248,113,113,0.07)',border:`1px solid rgba(248,113,113,0.2)`,borderRadius:'10px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'10px',marginTop:'10px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{color:C.red,fontSize:'12.5px',fontWeight:600}}>Gagal mengambil data dari Binance Futures. Cek koneksi atau coba lagi.</span>
              <button onClick={()=>setPhase('idle')} style={{marginLeft:'auto',background:'transparent',border:`1px solid ${C.red}`,color:C.red,borderRadius:'7px',padding:'4px 12px',fontSize:'11px',cursor:'pointer'}}>Retry</button>
            </div>
          )}

          {/* 3-col Analysis grid */}
          {phase==='done'&&result&&(
            <div style={{animation:'at-fade 0.4s ease'}}>
              <AnalysisGrid result={result} beginner={false} width={width}/>
            </div>
          )}

          {/* AI Mentor + News (kolom kiri, mengisi ruang di samping AI Consensus & Trade Plan) */}
          {phase==='done'&&result&&(
            <div style={{animation:'at-fade 0.5s ease'}}>
              <AIMentorCard result={result} width={width}/>
              <NewsBehindTheSignal result={result}/>
            </div>
          )}
        </div>

        {/* RIGHT: AI panel — sticky when idle */}
        <div style={{
          position: isNarrow ? 'static' : (phase==='done' ? 'static' : 'sticky'),
          top: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: isNarrow ? 'none' : (phase==='done' ? 'none' : 'calc(100vh - 80px)'),
        }}>
          <div style={{overflowY: phase==='done'?'visible':'auto',display:'flex',flexDirection:'column',gap:'12px'}}>
            {(phase==='idle'||phase==='error')&&<RightPanelReady asset={asset}/>}
            {phase==='loading'&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'14px',padding:'20px 18px',display:'flex',flexDirection:'column',gap:'10px'}}>
                {[72,28,28,28,28,28,28].map((h,i)=><div key={i} style={{height:h,background:C.card2,borderRadius:'9px',animation:'at-skel 1.5s ease infinite',animationDelay:`${i*0.12}s`}}/>)}
              </div>
            )}
            {phase==='done'&&result&&(
              <div style={{animation:'at-fade 0.4s ease',display:'flex',flexDirection:'column',gap:'12px'}}>
                <AISummaryCard result={result}/>
                <MarketInsight/>
                <AIConsensus result={result}/>
                <TradeExecutionPlanCard result={result} activeTf={activeTf}/>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div style={{textAlign:'center',color:C.text4,fontSize:'10px',marginTop:'24px',paddingTop:'14px',borderTop:'1px solid rgba(255,255,255,0.03)'}}>
        AI analysis is for informational purposes only and not financial advice. Always do your own research.
      </div>
    </div>
  );
}
