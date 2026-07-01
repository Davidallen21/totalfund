import React from 'react';

const Icon = {
  aiTrade: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 6v6l3 3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M5.6 5.6l1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M5.6 18.4l1.4-1.4" />
      <path d="M12 20v2" />
    </svg>
  ),
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
  calculator: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="11" x2="9.5" y2="11"/><line x1="12" y1="11" x2="13.5" y2="11"/><line x1="16" y1="11" x2="16" y2="15"/>
      <line x1="8" y1="15" x2="9.5" y2="15"/><line x1="12" y1="15" x2="13.5" y2="15"/>
      <line x1="8" y1="19" x2="9.5" y2="19"/><line x1="12" y1="19" x2="16" y2="19"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  content: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

export default function Sidebar({ activePage, setActivePage, onClose, isOpen, t }) {
  const NAV_ITEMS = [
    { key: 'portfolio',       label: t('dashboard'),        icon: Icon.dashboard      },
    { key: 'market-overview', label: t('market_overview'),  icon: Icon.marketOverview },
    { key: 'ai-trade',        label: 'AI Trade',            icon: Icon.aiTrade, badge: 'NEW' },
    { key: 'watchlist',       label: 'Top Movers',          icon: Icon.watchlist      },
    { key: 'market-explorer', label: t('market_explorer'),  icon: Icon.marketExplorer },
    { key: 'multi-chart',     label: 'Multi Chart',         icon: Icon.multiChart     },
    { key: 'calculator',      label: 'Calculator',          icon: Icon.calculator     },
    { key: 'networth-detail', label: 'Portfolio Analytics', icon: Icon.analytics      },
    { key: 'news',            label: t('market_news'),      icon: Icon.news           },
  ];

  const MOD_ITEMS = [
    { key: 'mod-users',    label: 'User Management',    icon: Icon.users   },
    { key: 'mod-content',  label: 'Content Moderation', icon: Icon.content },
    { key: 'mod-settings', label: 'System Settings',    icon: Icon.settings },
  ];

  const renderItem = ({ key, label, icon, badge }) => (
    <div key={key} className={`nav-item${activePage === key ? ' active' : ''}`} onClick={() => { setActivePage(key); onClose?.(); }}>
      <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      {label}
      {badge && (
        <span style={{ marginLeft: 'auto', fontSize: '8px', fontWeight: 800, letterSpacing: '0.05em', background: 'rgba(243,186,47,0.15)', color: '#F3BA2F', border: '1px solid rgba(243,186,47,0.25)', borderRadius: '4px', padding: '1px 5px' }}>
          {badge}
        </span>
      )}
    </div>
  );

  return (
    <div className={`app-sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-logo-area">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-logo-icon" style={{ fontSize: '14px', letterSpacing: '-0.5px' }}>TF</div>
          <div>
            <div className="sidebar-logo-text">TOTAL<span>FUND</span></div>
            <div style={{ color: '#4A5568', fontSize: '10px', fontWeight: 500, marginTop: '1px' }}>Portfolio Tracker</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'rgba(79,124,255,0.05)', border: '1px solid rgba(79,124,255,0.08)', borderRadius: '8px', color: '#94A3B8', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(renderItem)}

        {/* Moderator section */}
        <div style={{ margin: '10px 0 4px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ height: '1px', flex: 1, background: 'rgba(79,124,255,0.08)' }} />
          <span style={{ color: '#4A5568', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Moderator</span>
          <div style={{ height: '1px', flex: 1, background: 'rgba(79,124,255,0.08)' }} />
        </div>

        {MOD_ITEMS.map(renderItem)}
      </nav>

      <div className="sidebar-footer">
        <div className="status-dot" />
        <span style={{ color: '#94A3B8', fontSize: 12, fontWeight: 500 }}>{t('system_online')}</span>
      </div>
    </div>
  );
}
