import React, { useRef } from 'react';

export default function Sidebar({ activePage, setActivePage, onClose, isOpen, username, setUsername, profilePic, setProfilePic, t }) {
  const fileInputRef = useRef(null);
  
  const NAV_ITEMS = [
    { key: 'portfolio', label: t('portfolio'), icon: '◈' },
    { key: 'networth-detail', label: t('analytics'), icon: '❖' },
    { key: 'news', label: t('market_news'), icon: '▤' },
    { key: 'ai', label: t('ai_consultant'), icon: '✦' },
  ];

  const handleImageClick = () => fileInputRef.current?.click();
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 20px', borderBottom: '1px solid #1f1f1f' }}>
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
          <input 
            type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder={t('set_username')}
            style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '14px', fontWeight: 600, outline: 'none', width: '100%', padding: 0 }}
          />
          <div style={{ color: '#555', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>{t('investor_account')}</div>
        </div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>✕</button>}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <div key={key} className={`nav-item${activePage === key ? ' active' : ''}`} onClick={() => { setActivePage(key); onClose?.(); }}>
            <span className="nav-icon">{icon}</span>{label}
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