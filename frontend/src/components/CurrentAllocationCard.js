import React, { useMemo, useState } from 'react';
import { COLORS } from '../utils/helpers';

// ── shared data hooks ──────────────────────────────────────────────────────

function usePieData(assets, getLivePrice, kursIdr, grandTotalUSD) {
  return useMemo(() => assets.map((a, i) => {
    let valUSD = 0;
    if (['crypto', 'komoditas', 'saham_us'].includes(a.type)) valUSD = getLivePrice(a) * a.jumlah;
    if (a.type === 'saham')    valUSD = (getLivePrice(a) * a.jumlah) / kursIdr;
    if (a.type === 'stable')   valUSD = a.avg * a.jumlah;
    if (a.type === 'cash_idr') valUSD = a.jumlah / kursIdr;

    const modalUSD = a.type === 'saham'    ? (a.avg * a.jumlah) / kursIdr
                   : a.type === 'cash_idr' ? a.jumlah / kursIdr
                   : a.avg * a.jumlah;

    return {
      ticker: a.ticker,
      val:    valUSD,
      pct:    grandTotalUSD > 0 ? (valUSD / grandTotalUSD) * 100 : 0,
      color:  COLORS[i % COLORS.length],
      pnl:    !['stable', 'cash_idr'].includes(a.type) ? valUSD - modalUSD : null,
    };
  }).filter(d => d.val > 0).sort((a, b) => b.val - a.val),
  [assets, getLivePrice, kursIdr, grandTotalUSD]);
}

function useClassData(pieData, assets, grandTotalUSD) {
  return useMemo(() => {
    const classes = {
      crypto:     { label: 'Crypto',       color: '#f59e0b', val: 0 },
      saham:      { label: 'IDX Stock',    color: '#3b82f6', val: 0 },
      saham_us:   { label: 'US Stock',     color: '#ec4899', val: 0 },
      komoditas:  { label: 'Commodity',    color: '#eab308', val: 0 },
      cashstable: { label: 'Cash & Stable',color: '#10b981', val: 0 },
    };
    const typeToClass = { stable: 'cashstable', cash_idr: 'cashstable' };
    pieData.forEach(d => {
      const asset = assets.find(a => a.ticker === d.ticker);
      if (!asset) return;
      const key = typeToClass[asset.type] ?? asset.type;
      if (classes[key]) classes[key].val += d.val;
    });
    return Object.values(classes)
      .map(c => ({ ...c, pct: grandTotalUSD > 0 ? (c.val / grandTotalUSD) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);
  }, [pieData, assets, grandTotalUSD]);
}

// ── DonutChart (used by PositionsCard) ────────────────────────────────────

function DonutChart({ data, hoveredPie, onHover }) {
  let cum = 0;
  const coords = (p) => [Math.cos(2 * Math.PI * p), Math.sin(2 * Math.PI * p)];
  const displayData = data.find(d => d.ticker === hoveredPie) ?? data[0] ?? null;

  return (
    <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
      <svg viewBox="-1 -1 2 2" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}>
        {data.map(slice => {
          if (slice.pct <= 0) return null;
          if (slice.pct >= 99.9) return (
            <circle key={slice.ticker} r="0.8" fill="transparent" stroke={slice.color} strokeWidth="0.4"
              onMouseEnter={() => onHover(slice.ticker)} onMouseLeave={() => onHover(null)}
              style={{ cursor: 'pointer' }} />
          );
          const [sx, sy] = coords(cum);
          cum += slice.pct / 100;
          const [ex, ey] = coords(cum);
          const large = slice.pct > 50 ? 1 : 0;
          const isHovered = hoveredPie === slice.ticker;
          return (
            <path key={slice.ticker}
              d={`M ${sx} ${sy} A 1 1 0 ${large} 1 ${ex} ${ey} L 0 0`}
              fill={slice.color}
              onMouseEnter={() => onHover(slice.ticker)}
              onMouseLeave={() => onHover(null)}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                opacity: hoveredPie && !isHovered ? 0.3 : 1,
                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                transformOrigin: '0 0',
              }}
            />
          );
        })}
        <circle r="0.65" cx="0" cy="0" fill="#0F1929" style={{ pointerEvents: 'none' }} />
      </svg>

      {/* Center: top asset by default, hovered on hover */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', textAlign: 'center', gap: '1px' }}>
        {displayData && (
          <>
            <span style={{ color: displayData.color, fontSize: '9px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.03em', lineHeight: 1.2 }}>{displayData.ticker}</span>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1.1, letterSpacing: '-0.5px' }}>{displayData.pct.toFixed(1)}%</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Card 1: Asset Class ────────────────────────────────────────────────────

export function AssetClassCard({ assets, getLivePrice, grandTotalUSD, kursIdr }) {
  const pieData   = usePieData(assets, getLivePrice, kursIdr, grandTotalUSD);
  const classData = useClassData(pieData, assets, grandTotalUSD);

  return (
    <div className="donut-card" style={{ background: '#0F1929', border: '1px solid rgba(59,130,246,0.12)', flex: '0.8', minWidth: '160px', flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: '16px 18px' }}>
      <span style={{ color: '#64748B', fontSize: '10px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
        Asset Allocation
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
        {classData.map((c, i) => {
          const isEmpty = c.pct === 0;
          return (
            <div key={i} style={{ opacity: isEmpty ? 0.35 : 1, transition: 'opacity 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '2px', backgroundColor: c.color, flexShrink: 0 }} />
                  <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>{c.label}</span>
                </div>
                <span style={{ color: isEmpty ? '#334155' : '#E2E8F0', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>
                  {isEmpty ? '—' : `${c.pct.toFixed(1)}%`}
                </span>
              </div>
              <div style={{ width: '100%', height: '3px', backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${c.pct}%`,
                  background: `linear-gradient(90deg, ${c.color}88, ${c.color})`,
                  borderRadius: '99px',
                  transition: 'width 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Card 2: Positions (Donut) ──────────────────────────────────────────────

export function PositionsCard({ assets, getLivePrice, grandTotalUSD, kursIdr }) {
  const pieData    = usePieData(assets, getLivePrice, kursIdr, grandTotalUSD);
  const [hovered, setHovered] = useState(null);

  return (
    <div className="donut-card" style={{ background: '#0F1929', border: '1px solid rgba(59,130,246,0.12)', flex: '0.8', minWidth: '200px', flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: '16px 18px' }}>
      <span style={{ color: '#64748B', fontSize: '10px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
        Positions
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minHeight: 0 }}>
        <DonutChart data={pieData} hoveredPie={hovered} onHover={setHovered} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto', paddingRight: '2px' }}>
          {pieData.map(d => (
            <div
              key={d.ticker}
              onMouseEnter={() => setHovered(d.ticker)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '3px 5px', borderRadius: '4px',
                background: hovered === d.ticker ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.03)',
                cursor: 'default', transition: 'background 0.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
                <span style={{ color: '#CBD5E1', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', maxWidth: '44px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.ticker}</span>
              </div>
              <span style={{ color: '#64748B', fontSize: '10px', fontWeight: 600, fontFamily: 'monospace' }}>{d.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Backward compat default export (no longer used by App.js after update)
export default AssetClassCard;
