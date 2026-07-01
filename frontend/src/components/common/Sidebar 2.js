import React from 'react';

const Icon = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-5 3 3 5-7" />
    </svg>
  ),
  marketOverview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  ),
  marketExplorer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  news: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2-2h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <path d="M3 9v9a2 2 0 0 0 2 2" />
      <path d="M11 9h5" /><path d="M11 13h5" /><path d="M11 17h3" />
    </svg>
  ),
  multiChart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="9" height="9" rx="1.5" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" />
    </svg>
  ),
  watchlist: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

export default function Sidebar({ activePage, setActivePage, onClose, isOpen, t }) {
  const NAV_ITEMS = [
    { key: 'portfolio',       label: t('dashboard'),        icon: Icon.dashboard      },
    { key: 'market-overview', label: t('market_overview'),  icon: Icon.marketOverview },
    { key: 'watchlist',       label: 'Top Movers',          icon: Icon.watchlist      },
    { key: 'market-explorer', label: t('market_explorer'),  icon: Icon.marketExplorer },
    { key: 'multi-chart',     label: 'Multi Chart',         icon: Icon.multiChart     },
    { key: 'networth-detail', label: 'Portfolio Analytics', icon: Icon.analytics      },
    { key: 'news',            label: t('market_news'),      icon: Icon.news           },
  ];

  return (
    <div className={`app-sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-logo-area">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-logo-icon" style={{ fontSize: '14px', letterSpacing: '-0.5px' }}>TF</div>
          <div>
            <div className="sidebar-logo-text">TOTAL<span>FUND</span></div>
            <div style={{ color: '#334155', fontSize: '10px', fontWeight: 500, marginTop: '1px' }}>Portfolio Tracker</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: '8px', color: '#475569', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <div key={key} className={`nav-item${activePage === key ? ' active' : ''}`} onClick={() => { setActivePage(key); onClose?.(); }}>
            <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>{label}
          </div>
        ))}
      </nav>

      <div className="upgrade-pro-card">
        <div className="pro-icon">💎</div>
        <div className="pro-title">Upgrade to Pro</div>
        <div className="pro-desc">Unlock advanced analytics, custom alerts, and real-time insights.</div>
        <button className="upgrade-pro-btn">Upgrade Now</button>
      </div>

      <div className="sidebar-footer">
        <div className="status-dot" />
        <span style={{ color: '#475569', fontSize: 12, fontWeight: 500 }}>{t('system_online')}</span>
      </div>
    </div>
  );
}
