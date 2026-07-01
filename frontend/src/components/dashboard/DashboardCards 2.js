import { useMemo } from 'react';
import MiniSparkline from '../common/MiniSparkline';

export function MacroPulseCard({ marketData }) {
  const score = (change, scale = 12) => Math.round(Math.max(5, Math.min(95, 50 + change * scale)));
  const sentiment = (s) =>
    s >= 62 ? { label: 'Bullish', color: '#10B981', bg: 'rgba(16,185,129,0.1)'  }
    : s >= 40 ? { label: 'Neutral', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }
    :            { label: 'Bearish', color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  };

  const sectors = [
    { icon: '₿',  label: 'Crypto',     s: score(((marketData.BTC?.change ?? 0) + (marketData.ETH?.change ?? 0)) / 2, 8) },
    { icon: '🇺🇸', label: 'US Stocks',  s: score(marketData.SPX500?.change ?? 0, 18) },
    { icon: '🇮🇩', label: 'IDX Stocks', s: score(marketData.IHSG?.change ?? 0, 18) },
    { icon: '🥇',  label: 'Commodity',  s: score(((marketData.GOLD?.change ?? 0) + (marketData.XAG?.change ?? 0)) / 2, 12) },
  ];

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ background: '#0F1929', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.2px' }}>Macro Pulse</div>
          <div style={{ color: '#334155', fontSize: '10px', marginTop: '2px' }}>Updated {now}</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4', boxShadow: '0 0 6px rgba(6,182,212,0.7)', marginTop: 4 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', flex: 1 }}>
        {sectors.map(({ icon, label, s }) => {
          const sent = sentiment(s);
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
              <span style={{ fontSize: '16px', width: '22px', textAlign: 'center', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500, flex: 1 }}>{label}</span>
              <span style={{ color: sent.color, fontSize: '9px', fontWeight: 700, background: sent.bg, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.3px', flexShrink: 0 }}>{sent.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <div style={{ width: '44px', height: '3px', background: 'rgba(59,130,246,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s}%`, background: `linear-gradient(90deg, ${sent.color}55, ${sent.color})`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                </div>
                <span style={{ color: '#E2E8F0', fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', minWidth: '20px', textAlign: 'right' }}>
                  {s}<span style={{ color: '#334155', fontSize: '9px', fontWeight: 400 }}>/100</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AssetClassPerformanceCard({ marketData }) {
  const classes = [
    { key: 'Crypto',     icon: '₿',  accentColor: '#06B6D4', change: ((marketData.BTC?.change ?? 0) + (marketData.ETH?.change ?? 0)) / 2 },
    { key: 'US Stocks',  icon: '🇺🇸', accentColor: '#8B5CF6', change: marketData.SPX500?.change ?? 0 },
    { key: 'IDX Stocks', icon: '🇮🇩', accentColor: '#10B981', change: marketData.IHSG?.change ?? 0 },
    { key: 'Commodity',  icon: '🥇',  accentColor: '#F59E0B', change: ((marketData.GOLD?.change ?? 0) + (marketData.XAG?.change ?? 0)) / 2 },
  ];

  const maxAbs = Math.max(...classes.map(c => Math.abs(c.change)), 0.01);

  return (
    <div style={{ background: '#0F1929', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '16px', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ color: '#64748B', fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '16px' }}>Asset Class Performance (24H)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {classes.map(({ key, icon, accentColor, change }) => {
          const isUp = change >= 0;
          const pnlColor = isUp ? '#10B981' : '#EF4444';
          const barPct = (Math.abs(change) / maxAbs) * 100;
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${accentColor}18`, border: `1px solid ${accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                {icon}
              </div>
              <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600, width: '74px', flexShrink: 0 }}>{key}</span>
              <div style={{ flex: 1, height: '4px', background: 'rgba(59,130,246,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barPct}%`, background: `linear-gradient(90deg, ${pnlColor}55, ${pnlColor})`, borderRadius: '99px', transition: 'width 0.6s cubic-bezier(0.23,1,0.32,1)' }} />
              </div>
              <span style={{ color: pnlColor, fontSize: '12px', fontWeight: 800, minWidth: '56px', textAlign: 'right', letterSpacing: '-0.2px', flexShrink: 0 }}>
                {isUp ? '+' : ''}{change.toFixed(2)}%
              </span>
              <MiniSparkline change={change} color={pnlColor} w={48} h={18} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PortfolioMoversCard({ assets, hargaMap, hargaSaham, marketData }) {
  const movers = useMemo(() => {
    return assets
      .filter(a => !['stable', 'cash_idr'].includes(a.type))
      .map(a => {
        let change = 0;
        const key = a.simbol || a.ticker;
        if (a.type === 'crypto')         change = hargaMap[key]?.change || hargaMap[a.ticker]?.change || 0;
        else if (a.type === 'komoditas') change = a.simbol === 'GC=F' ? (marketData.GOLD?.change || 0) : a.simbol === 'SI=F' ? (marketData.XAG?.change || 0) : 0;
        else if (a.type === 'saham_us')  change = marketData.SPX500?.change || 0;
        else if (a.type === 'saham')     change = marketData.IHSG?.change || 0;
        return { ticker: a.ticker, change };
      })
      .filter(m => m.change !== 0)
      .sort((a, b) => b.change - a.change);
  }, [assets, hargaMap, marketData]);

  const gainers = movers.filter(m => m.change >= 0).slice(0, 4);
  const losers  = movers.filter(m => m.change < 0).slice(0, 4);
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ background: '#0F1929', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.2px' }}>Portfolio Movers</div>
          <div style={{ color: '#334155', fontSize: '10px', marginTop: '2px' }}>Updated {now}</div>
        </div>
        <span style={{ color: '#475569', fontSize: '9px', fontWeight: 700, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.5px' }}>TODAY</span>
      </div>

      {movers.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: '22px' }}>📊</span>
          <span style={{ color: '#334155', fontSize: '12px', fontWeight: 500 }}>Add assets to see movers</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
              <span style={{ color: '#10B981', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gainers</span>
            </div>
            {gainers.length === 0
              ? <div style={{ color: '#334155', fontSize: '11px', padding: '6px 0' }}>—</div>
              : gainers.map(m => (
                <div key={m.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                  <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{m.ticker}</span>
                  <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '1px 7px', borderRadius: '4px' }}>+{m.change.toFixed(2)}%</span>
                </div>
              ))
            }
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
              <span style={{ color: '#EF4444', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Losers</span>
            </div>
            {losers.length === 0
              ? <div style={{ color: '#334155', fontSize: '11px', padding: '6px 0' }}>—</div>
              : losers.map(m => (
                <div key={m.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                  <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{m.ticker}</span>
                  <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '1px 7px', borderRadius: '4px' }}>{m.change.toFixed(2)}%</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
