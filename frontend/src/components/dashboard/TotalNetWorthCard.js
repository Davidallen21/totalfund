import { formatUSD, formatIDR } from '../../utils/helpers';

const cardStyle = {
  backgroundColor: '#111C30', border: '1px solid rgba(79,124,255,0.1)',
  borderRadius: '16px', padding: '16px 20px', display: 'flex',
  flexDirection: 'column', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
};

export default function TotalNetWorthCard({
  grandTotalUSD, grandTotalIDR, kursIdr,
  overallPnlUSD, overallPnlPersen,
  dailyPnlUSD, dailyPnlPersen,
  cryptoLoaded, isMobileViewport,
  hideBalance, setHideBalance,
  scrollToHoldings, t,
}) {
  const isOverallProfit = overallPnlUSD >= 0;
  const isDailyProfit   = dailyPnlUSD >= 0;
  const overallPnlIDR   = overallPnlUSD * kursIdr;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>{t('total_net_worth')}</span>
          <button
            onClick={() => setHideBalance(h => !h)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5568', padding: '2px', display: 'flex', alignItems: 'center', lineHeight: 1, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
            onMouseLeave={e => e.currentTarget.style.color = '#4A5568'}
          >
            {hideBalance ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
        {isMobileViewport ? (
          <button onClick={scrollToHoldings} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#06B6D4', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(6,182,212,0.1)', border: 'none', padding: '4px 9px', borderRadius: '6px', cursor: 'pointer' }}>
            {t('view_assets')} <span style={{ fontSize: '12px' }}>›</span>
          </button>
        ) : (
          <span style={{ color: '#06B6D4', fontSize: '11px', backgroundColor: 'rgba(79,124,255,0.07)', border: '1px solid rgba(79,124,255,0.12)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
            IDR: {kursIdr.toLocaleString('id-ID')}
          </span>
        )}
      </div>

      {cryptoLoaded ? (
        <>
          <div style={{ color: '#F8FAFC', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.1 }}>
            {hideBalance ? <span style={{ color: '#1A2C42', letterSpacing: '4px' }}>••••••</span> : formatUSD(grandTotalUSD)}
          </div>
          <div style={{ color: '#64748B', fontSize: '13px', fontWeight: 500, marginTop: '3px' }}>
            {hideBalance ? <span style={{ color: '#1A2C42', letterSpacing: '3px' }}>••••••</span> : formatIDR(grandTotalIDR)}
          </div>
          {isMobileViewport && (
            <div style={{ color: '#4A5568', fontSize: '10px', fontWeight: 600, marginTop: '4px' }}>IDR: {kursIdr.toLocaleString('id-ID')}</div>
          )}
          <div style={{ margin: '14px 0', height: '1px', background: 'rgba(79,124,255,0.08)' }} />
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#94A3B8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{t('overall_pnl')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: isOverallProfit ? '#10B981' : '#EF4444', fontSize: '16px', fontWeight: 800 }}>
                  {hideBalance ? <span style={{ letterSpacing: '3px', fontSize: '13px' }}>••••</span> : <>{isOverallProfit ? '+' : ''}{formatUSD(overallPnlUSD)}</>}
                </span>
                {!hideBalance && (
                  <span style={{ color: isOverallProfit ? '#10B981' : '#EF4444', fontSize: '11px', fontWeight: 700, backgroundColor: isOverallProfit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                    {isOverallProfit ? '+' : ''}{overallPnlPersen.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                {hideBalance ? '' : <>{isOverallProfit ? '+' : ''}{formatIDR(overallPnlIDR)}</>}
              </div>
            </div>
            <div style={{ width: '1px', background: 'rgba(79,124,255,0.08)' }} />
            <div style={{ flex: 1 }}>
              <span style={{ color: '#94A3B8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>{t('day_pnl')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: isDailyProfit ? '#10B981' : '#EF4444', fontSize: '16px', fontWeight: 800 }}>
                  {hideBalance ? <span style={{ letterSpacing: '3px', fontSize: '13px' }}>••••</span> : <>{isDailyProfit ? '+' : ''}{formatUSD(dailyPnlUSD)}</>}
                </span>
                {!hideBalance && (
                  <span style={{ color: isDailyProfit ? '#10B981' : '#EF4444', fontSize: '11px', fontWeight: 700, backgroundColor: isDailyProfit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                    {isDailyProfit ? '+' : ''}{dailyPnlPersen.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                {hideBalance ? '' : <>{isDailyProfit ? '+' : ''}{formatIDR(dailyPnlUSD * kursIdr)}</>}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="skeleton" style={{ width: '70%', height: 32, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '50%', height: 16 }} />
          <div style={{ margin: '14px 0', height: '1px', background: 'rgba(79,124,255,0.06)' }} />
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="skeleton" style={{ flex: 1, height: 32, borderRadius: 8 }} />
            <div className="skeleton" style={{ flex: 1, height: 32, borderRadius: 8 }} />
          </div>
        </>
      )}
    </div>
  );
}
