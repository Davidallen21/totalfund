import MiniSparkline from '../common/MiniSparkline';

const cardStyle = { backgroundColor: '#111C30', borderRadius: '11px', padding: '9px 12px', border: '1px solid rgba(79,124,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minHeight: '68px', minWidth: 0, overflow: 'hidden' };

export default function MarketMiniCard({ displayName, data, loaded }) {
  if (!data) return null;
  const hasData = data.price > 0;
  const color = data.isUp ? '#10B981' : '#EF4444';
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <span style={{ color: '#94A3B8', fontWeight: 700, fontSize: '11px', letterSpacing: '0.2px' }}>{displayName}</span>
        {loaded && hasData && <span style={{ color, fontSize: '9px', fontWeight: 700, background: data.isUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: '4px' }}>{data.isUp ? '+' : ''}{data.change.toFixed(2)}%</span>}
        {!loaded && <div className="skeleton" style={{ width: 34, height: 12 }} />}
      </div>
      {!loaded
        ? <div className="skeleton" style={{ width: '70%', height: 17, margin: '3px 0' }} />
        : hasData
          ? <div style={{ color: '#F8FAFC', fontWeight: 800, fontSize: '14px', letterSpacing: '-0.3px', margin: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.type === 'usd' ? '$' : ''}{data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          : <div style={{ color: '#4A5568', fontWeight: 800, fontSize: '14px', margin: '1px 0' }}>—</div>
      }
      {hasData && <MiniSparkline change={data.change} color={color} w={100} h={20} />}
      {!hasData && loaded && <div style={{ height: 20 }} />}
    </div>
  );
}
