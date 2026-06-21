import React, { useRef } from 'react';

// ── Icon set — outline style, stroke-based, konsisten 20x20 viewBox ──
// Diganti dari unicode glyph (◈ ❖ ▣ ◱ ▤ ✦) ke SVG biar lebih proper & tajam di semua resolusi/device.
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
      <path d="M11 9h5" />
      <path d="M11 13h5" />
      <path d="M11 17h3" />
    </svg>
  ),
  ai: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  settings: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export default function Sidebar({ activePage, setActivePage, onClose, isOpen, username, setUsername, profilePic, setProfilePic, onOpenAccountSettings, t }) {
  const fileInputRef = useRef(null);

  const NAV_ITEMS = [
    { key: 'portfolio', label: t('dashboard'), icon: Icon.dashboard },
    { key: 'networth-detail', label: t('analytics'), icon: Icon.analytics },
    { key: 'market-overview', label: t('market_overview'), icon: Icon.marketOverview },
    { key: 'market-explorer', label: t('market_explorer'), icon: Icon.marketExplorer },
    { key: 'news', label: t('market_news'), icon: Icon.news },
    { key: 'ai', label: t('ai_consultant'), icon: Icon.ai },
  ];

  // Foto profil tetap bisa diklik langsung buat ganti gambar (perilaku lama dipertahankan).
  const handleImageClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfilePic(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`app-sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div
        onClick={onOpenAccountSettings}
        title={t('open_account_settings')}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 20px', borderBottom: '1px solid #1f1f1f', cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div 
          onClick={handleImageClick}
          style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: '2px solid #333', flexShrink: 0, position: 'relative' }}
          title={t('change_profile_pic')}
        >
          {profilePic ? (
            <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: '#737373', fontSize: '16px', fontWeight: 'bold' }}>{username ? username[0].toUpperCase() : 'U'}</span>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username || t('set_username')}
          </div>
          <div style={{ color: '#555', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>{t('investor_account')}</div>
        </div>
        <span style={{ color: '#454545', flexShrink: 0, display: 'flex' }}>{Icon.settings}</span>
        {onClose && <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>✕</button>}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <div key={key} className={`nav-item${activePage === key ? ' active' : ''}`} onClick={() => { setActivePage(key); onClose?.(); }}>
            <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>{label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="status-dot" />
        <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 500 }}>{t('system_online')}</span>
      </div>
    </div>
  );
}