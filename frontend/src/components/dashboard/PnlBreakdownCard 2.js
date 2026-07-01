import { formatUSD, formatIDR } from '../../utils/helpers';

const cardStyle = {
  backgroundColor: '#0F1929', border: '1px solid rgba(59,130,246,0.14)',
  borderRadius: '16px', padding: '16px 20px', display: 'flex',
  flexDirection: 'column', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
};

export default function PnlBreakdownCard({
  pnlCryptoUSD, pnlKomoditasUSD, pnlSahamIDX_IDR, pnlSahamUS_USD,
  kursIdr, cryptoLoaded, t,
}) {
  const items = [
    { label: t('crypto_usd'),      val: pnlCryptoUSD,    sub: formatIDR(pnlCryptoUSD * kursIdr),    fmt: formatUSD },
    { label: t('commodities_usd'), val: pnlKomoditasUSD, sub: formatIDR(pnlKomoditasUSD * kursIdr), fmt: formatUSD },
    { label: t('stock_idx_idr'),   val: pnlSahamIDX_IDR, sub: formatUSD(pnlSahamIDX_IDR / kursIdr), fmt: formatIDR },
    { label: t('stock_us_usd'),    val: pnlSahamUS_USD,  sub: formatIDR(pnlSahamUS_USD * kursIdr),  fmt: formatUSD },
  ];

  return (
    <div style={cardStyle}>
      <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', display: 'block', marginBottom: '14px' }}>
        {t('pnl_breakdown')}
      </span>
      {cryptoLoaded ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', flex: 1 }}>
          {items.map(({ label, val, sub, fmt }, idx) => (
            <div
              key={label}
              style={{
                padding: `${idx >= 2 ? '12px' : '0'} ${idx % 2 === 0 ? '12px' : '0'} ${idx < 2 ? '12px' : '0'} ${idx % 2 === 1 ? '12px' : '0'}`,
                borderRight: idx % 2 === 0 ? '1px solid rgba(59,130,246,0.08)' : 'none',
                borderBottom: idx < 2 ? '1px solid rgba(59,130,246,0.08)' : 'none',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}
            >
              <span style={{ color: '#64748B', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</span>
              <span style={{ color: val >= 0 ? '#10B981' : '#EF4444', fontSize: '16px', fontWeight: 800, margin: '4px 0 2px' }}>
                {val >= 0 ? '+' : ''}{fmt(val)}
              </span>
              <span style={{ color: '#475569', fontSize: '11px', fontWeight: 500 }}>{val >= 0 ? '+' : ''}{sub}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px', flex: 1 }}>
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ borderRadius: 8 }} />)}
        </div>
      )}
    </div>
  );
}
