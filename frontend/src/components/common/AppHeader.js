import { useState } from 'react';

export default function AppHeader({ setSidebarOpen, setActivePage, lang, setLang, username, profilePic, setShowAccountSettings, t, onLogout }) {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>

        <div className="header-search" style={{ flex: 1, maxWidth: '420px' }}>
          <svg className="header-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input placeholder="Search coins, stocks, ETFs..." onFocus={() => setActivePage('market-explorer')} readOnly />
          <span style={{ color: '#1E3A5F', fontSize: '11px', fontWeight: 600, background: '#111C30', border: '1px solid rgba(79,124,255,0.12)', borderRadius: '5px', padding: '2px 5px' }}>/</span>
        </div>

        <div className="header-right" style={{ marginLeft: 'auto' }}>
          {/* Globe — language picker */}
          <div className="header-icon-btn" style={{ position: 'relative' }} onClick={() => { setShowLangPicker(p => !p); setShowNotifs(false); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>

          {/* Bell — notifications */}
          <div className="header-icon-btn" style={{ position: 'relative' }} onClick={() => { setShowNotifs(p => !p); setShowLangPicker(false); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>

          {/* Logout button */}
          {onLogout && (
            <div
              className="header-icon-btn"
              title="Keluar"
              onClick={onLogout}
              style={{ color: '#94A3B8' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
          )}

          {/* Profile chip */}
          <div className="header-profile" onClick={() => setShowAccountSettings(true)}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #06B6D4, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {profilePic ? <img src={profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#000', fontWeight: 800, fontSize: '11px' }}>{(username||'U')[0].toUpperCase()}</span>}
            </div>
            <div className="header-profile-text">
              <div className="header-profile-name">{username || 'User'}</div>
              <div className="header-profile-role">Investor</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {/* Language Picker Panel */}
      {showLangPicker && (
        <>
          <div onClick={() => setShowLangPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
          <div style={{ position: 'fixed', top: '68px', right: '96px', background: '#111C30', border: '1px solid rgba(79,124,255,0.15)', borderRadius: '14px', boxShadow: '0 16px 48px rgba(0,0,0,0.55)', zIndex: 200, overflow: 'hidden', minWidth: '160px' }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(79,124,255,0.06)' }}>
              <span style={{ color: '#94A3B8', fontSize: '10px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Language</span>
            </div>
            {[
              { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
              { code: 'en', label: 'English',   flag: '🇬🇧' },
              { code: 'zh', label: '中文',       flag: '🇨🇳' },
            ].map(l => (
              <div
                key={l.code}
                onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: lang.includes(l.code) ? 'rgba(79,124,255,0.06)' : 'transparent', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,124,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = lang.includes(l.code) ? 'rgba(79,124,255,0.06)' : 'transparent'}
              >
                <span style={{ fontSize: '17px' }}>{l.flag}</span>
                <span style={{ color: lang.includes(l.code) ? '#06B6D4' : '#CBD5E1', fontSize: '13px', fontWeight: 600, flex: 1 }}>{l.label}</span>
                {lang.includes(l.code) && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notification Panel */}
      {showNotifs && (
        <>
          <div onClick={() => setShowNotifs(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
          <div style={{ position: 'fixed', top: '68px', right: '56px', width: '300px', background: '#111C30', border: '1px solid rgba(79,124,255,0.15)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.55)', zIndex: 200, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(79,124,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '14px' }}>Notifications</span>
              <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', color: '#4A5568', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '36px 20px 32px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(79,124,255,0.06)', border: '1px solid rgba(79,124,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div style={{ color: '#CBD5E1', fontSize: '13px', fontWeight: 600 }}>No notifications yet</div>
              <div style={{ color: '#4A5568', fontSize: '11px', marginTop: '6px', lineHeight: 1.5 }}>Portfolio alerts and updates will appear here</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
