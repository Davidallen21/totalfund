import { useState } from 'react';
import useWindowSize from '../hooks/useWindowSize';

const C = {
  bg:'#08111F', card:'#111C30', card2:'#16233A', card3:'#1A2C42',
  border:'rgba(79,124,255,0.1)', brd2:'rgba(79,124,255,0.18)',
  text:'#F8FAFC', text2:'#CBD5E1', text3:'#94A3B8', text4:'#4A5568',
  green:'#22C55E', red:'#EF4444', yellow:'#F59E0B',
  gold:'#F3BA2F', blue:'#4F7CFF', purple:'#6366F1', cyan:'#22d3ee',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const pN  = s => parseFloat(String(s).replace(/[^0-9.-]/g, '')) || 0;
const fN  = (n, d = 2) => (!isFinite(n) || isNaN(n)) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fP  = (n, sign = true) => (!isFinite(n) || isNaN(n)) ? '—' : (sign && n >= 0 ? '+' : '') + fN(n, 2) + '%';
const pos = n => n > 0;

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, suffix, placeholder, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '9px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <label style={{ color: C.text3, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
        {hint && <span style={{ color: C.text4, fontSize: '9px' }}>{hint}</span>}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder={placeholder || '0'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', background: C.card3,
            border: `1px solid ${focused ? C.brd2 : C.border}`,
            borderRadius: '8px',
            padding: `9px ${suffix ? '38px' : '12px'} 9px 12px`,
            color: C.text, fontSize: '13px', fontWeight: 600,
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: C.text4, fontSize: '10.5px', fontWeight: 700, pointerEvents: 'none' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ResRow({ label, value, color, large, divider }) {
  return (
    <>
      {divider && <div style={{ height: '1px', background: C.border, margin: '8px 0' }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
        <span style={{ color: C.text3, fontSize: large ? '11.5px' : '11px', fontWeight: 500 }}>{label}</span>
        <span style={{ color: color || C.text, fontSize: large ? '17px' : '13px', fontWeight: large ? 800 : 600, letterSpacing: '-0.02em' }}>{value}</span>
      </div>
    </>
  );
}

function Btns({ onCalc, onReset }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '13px' }}>
      <button onClick={onReset} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text3, fontSize: '12px', fontWeight: 600, padding: '9px 0', cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.brd2; e.currentTarget.style.color = C.text; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}>
        Reset
      </button>
      <button onClick={onCalc} style={{ flex: 2, background: 'linear-gradient(135deg,rgba(96,165,250,0.14),rgba(96,165,250,0.07))', border: '1px solid rgba(96,165,250,0.28)', borderRadius: '8px', color: C.blue, fontSize: '12px', fontWeight: 700, padding: '9px 0', cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.2)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(96,165,250,0.14),rgba(96,165,250,0.07))'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.28)'; }}>
        Calculate
      </button>
    </div>
  );
}

function CalcCard({ title, icon, accent, children }) {
  const ac = accent || C.blue;
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: C.card, border: `1px solid ${hov ? C.brd2 : C.border}`, borderRadius: '16px', padding: '20px 18px', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: hov ? '0 8px 40px rgba(0,0,0,0.3)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${ac}18`, border: `1px solid ${ac}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ color: C.text, fontSize: '13.5px', fontWeight: 700 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── 1. Average Down ───────────────────────────────────────────────────────────
function AverageDownCalc() {
  const [f, setF] = useState({ p1:'', q1:'', p2:'', q2:'' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const p1=pN(f.p1), q1=pN(f.q1), p2=pN(f.p2), q2=pN(f.q2);
    if (!pos(p1)||!pos(q1)||!pos(p2)||!pos(q2)) return;
    const totalCap = p1*q1 + p2*q2, totalQty = q1+q2;
    setRes({ avg: totalCap/totalQty, totalCap, totalQty }); setK(k=>k+1);
  };
  const reset = () => { setF({ p1:'', q1:'', p2:'', q2:'' }); setRes(null); };
  return (
    <CalcCard title="Average Down" accent={C.cyan}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2.2" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}>
      <Field label="Harga Beli 1" value={f.p1} onChange={set('p1')} placeholder="5000"/>
      <Field label="Jumlah Saham 1" value={f.q1} onChange={set('q1')} placeholder="1000"/>
      <Field label="Harga Beli 2 (lebih rendah)" value={f.p2} onChange={set('p2')} placeholder="4200"/>
      <Field label="Jumlah Saham 2" value={f.q2} onChange={set('q2')} placeholder="1500"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Average Price Baru" value={fN(res.avg)} color={C.cyan} large/>
        <ResRow label="Total Modal" value={fN(res.totalCap, 0)} divider/>
        <ResRow label="Total Saham" value={fN(res.totalQty, 0)}/>
      </div>}
    </CalcCard>
  );
}

// ── 2. Average Up ─────────────────────────────────────────────────────────────
function AverageUpCalc() {
  const [f, setF] = useState({ p1:'', q1:'', p2:'', q2:'' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const p1=pN(f.p1), q1=pN(f.q1), p2=pN(f.p2), q2=pN(f.q2);
    if (!pos(p1)||!pos(q1)||!pos(p2)||!pos(q2)) return;
    const totalCap = p1*q1 + p2*q2, totalQty = q1+q2;
    setRes({ avg: totalCap/totalQty, totalCap, totalQty }); setK(k=>k+1);
  };
  const reset = () => { setF({ p1:'', q1:'', p2:'', q2:'' }); setRes(null); };
  return (
    <CalcCard title="Average Up" accent={C.green}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}>
      <Field label="Harga Beli 1" value={f.p1} onChange={set('p1')} placeholder="3000"/>
      <Field label="Jumlah Saham 1" value={f.q1} onChange={set('q1')} placeholder="1000"/>
      <Field label="Harga Beli 2 (lebih tinggi)" value={f.p2} onChange={set('p2')} placeholder="3500"/>
      <Field label="Jumlah Saham 2" value={f.q2} onChange={set('q2')} placeholder="500"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Average Price Baru" value={fN(res.avg)} color={C.green} large/>
        <ResRow label="Total Modal" value={fN(res.totalCap, 0)} divider/>
        <ResRow label="Total Saham" value={fN(res.totalQty, 0)}/>
      </div>}
    </CalcCard>
  );
}

// ── 3. Profit & Loss ─────────────────────────────────────────────────────────
function PnLCalc() {
  const [f, setF] = useState({ buy:'', sell:'', qty:'', feeBuy:'0.15', feeSell:'0.25' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const buy=pN(f.buy), sell=pN(f.sell), qty=pN(f.qty), fb=pN(f.feeBuy), fs=pN(f.feeSell);
    if (!pos(buy)||!pos(sell)||!pos(qty)) return;
    const buyTotal=buy*qty, sellTotal=sell*qty;
    const feeBuyAmt=buyTotal*(fb/100), feeSellAmt=sellTotal*(fs/100);
    const totalFee=feeBuyAmt+feeSellAmt, gross=(sell-buy)*qty;
    const net=gross-totalFee, pct=(net/(buyTotal+feeBuyAmt))*100;
    setRes({ net, pct, totalFee, gross, buyTotal, sellTotal }); setK(k=>k+1);
  };
  const reset = () => { setF({ buy:'', sell:'', qty:'', feeBuy:'0.15', feeSell:'0.25' }); setRes(null); };
  const profit = res ? res.net >= 0 : null;
  return (
    <CalcCard title="Profit & Loss" accent={C.gold}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}>
      <Field label="Harga Beli" value={f.buy} onChange={set('buy')} placeholder="1000"/>
      <Field label="Harga Jual" value={f.sell} onChange={set('sell')} placeholder="1250"/>
      <Field label="Jumlah Saham" value={f.qty} onChange={set('qty')} placeholder="1000"/>
      <Field label="Fee Beli" value={f.feeBuy} onChange={set('feeBuy')} suffix="%" placeholder="0.15"/>
      <Field label="Fee Jual" value={f.feeSell} onChange={set('feeSell')} suffix="%" placeholder="0.25"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:`1px solid ${profit ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`, borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Net Profit/Loss" value={fN(res.net, 0)} color={profit ? C.green : C.red} large/>
        <ResRow label="Return" value={fP(res.pct)} color={profit ? C.green : C.red}/>
        <ResRow label="Total Fee" value={fN(res.totalFee, 0)} color={C.text3} divider/>
        <ResRow label="Gross P&L" value={fN(res.gross, 0)} color={res.gross >= 0 ? C.green : C.red}/>
      </div>}
    </CalcCard>
  );
}

// ── 4. Break Even ────────────────────────────────────────────────────────────
function BreakEvenCalc() {
  const [f, setF] = useState({ buy:'', feeBuy:'0.15', feeSell:'0.25' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const buy=pN(f.buy), fb=pN(f.feeBuy), fs=pN(f.feeSell);
    if (!pos(buy)) return;
    const denom = 1 - fs/100;
    if (denom <= 0) return;
    const be = buy * (1 + fb/100) / denom;
    const bePct = ((be - buy) / buy) * 100;
    setRes({ be, bePct, diff: be - buy }); setK(k=>k+1);
  };
  const reset = () => { setF({ buy:'', feeBuy:'0.15', feeSell:'0.25' }); setRes(null); };
  return (
    <CalcCard title="Break Even" accent={C.yellow}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2.2" strokeLinecap="round"><path d="M22 12H2"/><path d="M12 2v4M12 18v4"/></svg>}>
      <Field label="Harga Beli" value={f.buy} onChange={set('buy')} placeholder="2500"/>
      <Field label="Fee Beli" value={f.feeBuy} onChange={set('feeBuy')} suffix="%" placeholder="0.15"/>
      <Field label="Fee Jual" value={f.feeSell} onChange={set('feeSell')} suffix="%" placeholder="0.25"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Harga Break Even" value={fN(res.be)} color={C.yellow} large/>
        <ResRow label="Selisih dari Harga Beli" value={`+${fN(res.diff)}`} divider/>
        <ResRow label="Kenaikan Minimal" value={fP(res.bePct, false)} color={C.yellow}/>
      </div>}
    </CalcCard>
  );
}

// ── 5. Risk Reward ────────────────────────────────────────────────────────────
function RiskRewardCalc() {
  const [f, setF] = useState({ entry:'', sl:'', tp:'' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const entry=pN(f.entry), sl=pN(f.sl), tp=pN(f.tp);
    if (!pos(entry)||!pos(sl)||!pos(tp)) return;
    const risk=Math.abs(entry-sl), reward=Math.abs(tp-entry);
    if (!pos(risk)) return;
    const ratio=reward/risk, rPct=(risk/entry)*100, rwPct=(reward/entry)*100;
    setRes({ risk, reward, ratio, rPct, rwPct }); setK(k=>k+1);
  };
  const reset = () => { setF({ entry:'', sl:'', tp:'' }); setRes(null); };
  const rrColor = res ? (res.ratio >= 2 ? C.green : res.ratio >= 1 ? C.yellow : C.red) : C.text;
  return (
    <CalcCard title="Risk Reward Ratio" accent={C.purple}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M5 8.5l7-6.5 7 6.5"/><path d="M5 15.5l7 6.5 7-6.5"/></svg>}>
      <Field label="Entry Price" value={f.entry} onChange={set('entry')} placeholder="1000"/>
      <Field label="Stop Loss" value={f.sl} onChange={set('sl')} placeholder="950"/>
      <Field label="Take Profit" value={f.tp} onChange={set('tp')} placeholder="1120"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Risk : Reward" value={`1 : ${fN(res.ratio)}`} color={rrColor} large/>
        <ResRow label="Risk" value={`${fN(res.risk)} (${fN(res.rPct, 2)}%)`} color={C.red} divider/>
        <ResRow label="Reward" value={`${fN(res.reward)} (${fN(res.rwPct, 2)}%)`} color={C.green}/>
      </div>}
    </CalcCard>
  );
}

// ── 6. Position Size ──────────────────────────────────────────────────────────
function PositionSizeCalc() {
  const [f, setF] = useState({ capital:'', riskPct:'1', entry:'', sl:'' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const cap=pN(f.capital), rp=pN(f.riskPct), entry=pN(f.entry), sl=pN(f.sl);
    if (!pos(cap)||!pos(rp)||!pos(entry)||!pos(sl)) return;
    const maxRisk=cap*(rp/100), riskPerShare=Math.abs(entry-sl);
    if (!pos(riskPerShare)) return;
    const shares=Math.floor(maxRisk/riskPerShare), capUsed=shares*entry;
    setRes({ maxRisk, riskPerShare, shares, capUsed, capPct:(capUsed/cap)*100 }); setK(k=>k+1);
  };
  const reset = () => { setF({ capital:'', riskPct:'1', entry:'', sl:'' }); setRes(null); };
  return (
    <CalcCard title="Position Size" accent={C.blue}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>}>
      <Field label="Total Modal" value={f.capital} onChange={set('capital')} placeholder="10000000"/>
      <Field label="Maksimal Risiko" value={f.riskPct} onChange={set('riskPct')} suffix="%" placeholder="1"/>
      <Field label="Entry Price" value={f.entry} onChange={set('entry')} placeholder="2000"/>
      <Field label="Stop Loss" value={f.sl} onChange={set('sl')} placeholder="1900"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Jumlah Saham" value={fN(res.shares, 0)} color={C.blue} large/>
        <ResRow label="Modal Digunakan" value={fN(res.capUsed, 0)} divider/>
        <ResRow label="% dari Modal" value={fN(res.capPct, 1) + '%'}/>
        <ResRow label="Maks. Uang Berisiko" value={fN(res.maxRisk, 0)} color={C.red}/>
      </div>}
    </CalcCard>
  );
}

// ── 7. Stop Loss ──────────────────────────────────────────────────────────────
function StopLossCalc() {
  const [f, setF] = useState({ buy:'', maxLoss:'' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const buy=pN(f.buy), ml=pN(f.maxLoss);
    if (!pos(buy)||!pos(ml)) return;
    const sl=buy*(1-ml/100);
    setRes({ sl, loss: buy-sl, pct: ml }); setK(k=>k+1);
  };
  const reset = () => { setF({ buy:'', maxLoss:'' }); setRes(null); };
  return (
    <CalcCard title="Stop Loss Calculator" accent={C.red}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill={C.red}/></svg>}>
      <Field label="Harga Beli" value={f.buy} onChange={set('buy')} placeholder="3000"/>
      <Field label="Maksimal Loss" value={f.maxLoss} onChange={set('maxLoss')} suffix="%" placeholder="5"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:'1px solid rgba(248,113,113,0.12)', borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Harga Stop Loss" value={fN(res.sl)} color={C.red} large/>
        <ResRow label="Loss per Saham" value={`-${fN(res.loss)}`} color={C.red} divider/>
        <ResRow label="Persentase Loss" value={`-${fN(res.pct, 2)}%`} color={C.red}/>
      </div>}
    </CalcCard>
  );
}

// ── 8. Take Profit ────────────────────────────────────────────────────────────
function TakeProfitCalc() {
  const [f, setF] = useState({ buy:'', target:'' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const buy=pN(f.buy), tp=pN(f.target);
    if (!pos(buy)||!pos(tp)) return;
    const tpPrice=buy*(1+tp/100);
    setRes({ tpPrice, profit: tpPrice-buy, pct: tp }); setK(k=>k+1);
  };
  const reset = () => { setF({ buy:'', target:'' }); setRes(null); };
  return (
    <CalcCard title="Take Profit Calculator" accent={C.green}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={C.green}/></svg>}>
      <Field label="Harga Beli" value={f.buy} onChange={set('buy')} placeholder="2000"/>
      <Field label="Target Profit" value={f.target} onChange={set('target')} suffix="%" placeholder="15"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:'1px solid rgba(74,222,128,0.12)', borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Harga Take Profit" value={fN(res.tpPrice)} color={C.green} large/>
        <ResRow label="Profit per Saham" value={`+${fN(res.profit)}`} color={C.green} divider/>
        <ResRow label="Target Return" value={`+${fN(res.pct, 2)}%`} color={C.green}/>
      </div>}
    </CalcCard>
  );
}

// ── 9. Right Issue (HMETD) ────────────────────────────────────────────────────
function RightIssueCalc() {
  const [f, setF] = useState({ priceBefore:'', ratio:'', execPrice:'' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const pb=pN(f.priceBefore), r=pN(f.ratio), ep=pN(f.execPrice);
    if (!pos(pb)||!pos(r)||!pos(ep)) return;
    // TERP = (harga_lama × 1 + harga_pelaksanaan × rasio) / (1 + rasio)
    const terp=(pb*1 + ep*r) / (1+r);
    const dilution=((terp-pb)/pb)*100;
    setRes({ terp, dilution }); setK(k=>k+1);
  };
  const reset = () => { setF({ priceBefore:'', ratio:'', execPrice:'' }); setRes(null); };
  return (
    <CalcCard title="Right Issue / HMETD" accent={C.cyan}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>}>
      <Field label="Harga Saham Sebelum" value={f.priceBefore} onChange={set('priceBefore')} placeholder="5000"/>
      <Field label="Rasio HMETD" value={f.ratio} onChange={set('ratio')} placeholder="1" hint="saham baru per 1 saham lama"/>
      <Field label="Harga Pelaksanaan" value={f.execPrice} onChange={set('execPrice')} placeholder="3000"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="TERP (Harga Teoritis)" value={fN(res.terp)} color={C.cyan} large/>
        <ResRow label="Dilusi Harga" value={fP(res.dilution)} color={res.dilution >= 0 ? C.green : C.red} divider/>
      </div>}
    </CalcCard>
  );
}

// ── 10. Stock Split ───────────────────────────────────────────────────────────
function StockSplitCalc() {
  const [f, setF] = useState({ price:'', shares:'', ratio:'' });
  const [res, setRes] = useState(null);
  const [k, setK] = useState(0);
  const set = key => val => setF(prev => ({ ...prev, [key]: val }));
  const calc = () => {
    const price=pN(f.price), shares=pN(f.shares), ratio=pN(f.ratio);
    if (!pos(price)||!pos(shares)||!pos(ratio)) return;
    setRes({ newPrice: price/ratio, newShares: shares*ratio, totalVal: price*shares }); setK(k=>k+1);
  };
  const reset = () => { setF({ price:'', shares:'', ratio:'' }); setRes(null); };
  return (
    <CalcCard title="Stock Split Calculator" accent={C.purple}
      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2.2" strokeLinecap="round"><path d="M16 3h5v5M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l5.1 5.1M4 4l5 5"/></svg>}>
      <Field label="Harga Saham" value={f.price} onChange={set('price')} placeholder="10000"/>
      <Field label="Jumlah Saham" value={f.shares} onChange={set('shares')} placeholder="1000"/>
      <Field label="Rasio Split  (1 : ___)" value={f.ratio} onChange={set('ratio')} placeholder="5"/>
      <Btns onCalc={calc} onReset={reset}/>
      {res && <div key={k} style={{ animation:'calc-in 0.28s cubic-bezier(.16,1,.3,1)', background:C.card2, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'13px 15px', marginTop:'12px' }}>
        <ResRow label="Harga Baru" value={fN(res.newPrice)} color={C.purple} large/>
        <ResRow label="Jumlah Saham Baru" value={fN(res.newShares, 0)} divider/>
        <ResRow label="Total Nilai (tidak berubah)" value={fN(res.totalVal, 0)} color={C.text2}/>
      </div>}
    </CalcCard>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Calculator() {
  const { width } = useWindowSize();
  const cols = width > 1080 ? 3 : width > 660 ? 2 : 1;

  return (
    <div style={{ padding: '18px 18px 48px 10px', maxWidth: '1600px' }}>
      <style>{`
        @keyframes calc-in { from { opacity:0; transform:translateY(7px) } to { opacity:1; transform:none } }
        input::placeholder { color: #3a3a3a !important; }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
        <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="2" width="16" height="20" rx="2"/>
            <line x1="8" y1="6" x2="16" y2="6"/>
            <line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/>
            <line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/>
            <line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="16" y2="18"/>
          </svg>
        </div>
        <div>
          <div style={{ color:C.text, fontSize:'20px', fontWeight:900, letterSpacing:'-0.04em', lineHeight:1 }}>Trading Calculator</div>
          <div style={{ color:C.text3, fontSize:'11.5px', marginTop:'3px' }}>Semua kalkulator yang dibutuhkan trader dan investor</div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:'14px' }}>
        <AverageDownCalc />
        <AverageUpCalc />
        <PnLCalc />
        <BreakEvenCalc />
        <RiskRewardCalc />
        <PositionSizeCalc />
        <StopLossCalc />
        <TakeProfitCalc />
        <RightIssueCalc />
        <StockSplitCalc />
      </div>
    </div>
  );
}
