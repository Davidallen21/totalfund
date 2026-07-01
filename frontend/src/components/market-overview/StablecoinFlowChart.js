// To replace with real Nansen / Glassnode / DeFiLlama API
const C = {
  border: 'rgba(255,255,255,0.06)',
  text:   '#e5e5e5',
  text3:  '#737373',
  text4:  '#3a3a3a',
  green:  '#4ade80',
  red:    '#f87171',
  card3:  '#1a1a1a',
};

const USDT_COLOR = '#26a17b';
const USDC_COLOR = '#2775ca';

// Net exchange inflow in $M per day (positive = stablecoins entering exchanges = buy pressure)
const FLOW_DATA = {
  labels: ['Jun 11','Jun 12','Jun 13','Jun 14','Jun 15','Jun 16','Jun 17','Jun 18','Jun 19','Jun 20','Jun 21','Jun 22','Jun 23','Jun 24'],
  usdt: [-58, +287, +134, -45, +223, +378, +212, +89, +445, +512, +334, +678, +489, +312],
  usdc: [+45, -27, +124, +76, +49, +134, -25, +98, +234, +178, +89, +312, +245, +167],
};

function buildPath(series, W, H, pad, yMin, yMax) {
  const range = yMax - yMin || 1;
  return series
    .map((v, i) => {
      const x = pad + (i / (series.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - yMin) / range) * (H - pad * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function StablecoinFlowChart() {
  const W = 320, H = 100, pad = 10;
  const all = [...FLOW_DATA.usdt, ...FLOW_DATA.usdc];
  const yMin = Math.min(...all) - 30;
  const yMax = Math.max(...all) + 30;

  const usdtPath = buildPath(FLOW_DATA.usdt, W, H, pad, yMin, yMax);
  const usdcPath = buildPath(FLOW_DATA.usdc, W, H, pad, yMin, yMax);

  // Zero line Y position
  const zeroY = H - pad - ((0 - yMin) / (yMax - yMin)) * (H - pad * 2);

  // Summary stats
  const net7dUSDT = FLOW_DATA.usdt.slice(-7).reduce((s, v) => s + v, 0);
  const net7dUSDC = FLOW_DATA.usdc.slice(-7).reduce((s, v) => s + v, 0);
  const net7d     = net7dUSDT + net7dUSDC;
  const todayNet  = FLOW_DATA.usdt.at(-1) + FLOW_DATA.usdc.at(-1);
  const isPos     = net7d >= 0;

  return (
    <div>
      {/* KPI chips */}
      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        {[
          { label:'Net 7D', val:`${net7d >= 0 ? '+' : ''}$${(net7d/1000).toFixed(1)}B`, color: net7d >= 0 ? C.green : C.red },
          { label:'Today',  val:`${todayNet >= 0 ? '+' : ''}$${todayNet.toFixed(0)}M`,   color: todayNet >= 0 ? C.green : C.red },
        ].map(chip => (
          <div key={chip.label} style={{ flex:1, background:C.card3, borderRadius:7, padding:'5px 8px', border:`1px solid ${C.border}` }}>
            <div style={{ color:C.text3, fontSize:9, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>{chip.label}</div>
            <div style={{ color:chip.color, fontSize:13, fontWeight:800, fontFamily:'monospace' }}>{chip.val}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block', overflow:'visible' }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={pad} y1={pad + f * (H - pad * 2)} x2={W - pad} y2={pad + f * (H - pad * 2)}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {/* Zero baseline */}
        <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY}
          stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4,3" />
        {/* USDT line */}
        <path d={usdtPath} stroke={USDT_COLOR} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {/* USDC line */}
        <path d={usdcPath} stroke={USDC_COLOR} strokeWidth={1.5} fill="none" strokeDasharray="5,2" strokeLinejoin="round" />
        {/* Zero label */}
        <text x={pad - 2} y={zeroY + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={7}>0</text>
      </svg>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, marginTop:6 }}>
        {[[USDT_COLOR,'USDT','—'], [USDC_COLOR,'USDC','- -']].map(([col, label, dash]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:16, height:2, background:col, borderRadius:1 }} />
            <span style={{ color:C.text3, fontSize:9, fontWeight:600 }}>{label} {dash}</span>
          </div>
        ))}
      </div>

      {/* Signal */}
      <div style={{ marginTop:8, padding:'5px 8px', background:C.card3, borderRadius:6, border:`1px solid ${C.border}` }}>
        <span style={{ fontSize:10, color: isPos ? '#86efac' : '#fca5a5', fontWeight:500 }}>
          {isPos ? '🟢 Net inflow' : '🔴 Net outflow'} — {isPos ? 'rising' : 'declining'} stablecoin buy power
        </span>
      </div>
    </div>
  );
}
